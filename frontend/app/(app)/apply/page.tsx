"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";

const C = {
  indigo: "#4F46E5", indigoLight: "#EEF2FF",
  slate: "#0F172A", mid: "#64748B", light: "#94A3B8",
  bg: "#F8FAFC", white: "#fff", border: "#E2E8F0",
  green: "#10B981", greenLight: "#ECFDF5",
  amber: "#F59E0B", amberLight: "#FFFBEB",
  red: "#EF4444", redLight: "#FEF2F2",
};

const LANGUAGES = ["English", "German", "French", "Spanish", "Italian", "Dutch", "Polish", "Portuguese", "Chinese", "Arabic", "Hindi"];

const inp = {
  width: "100%", padding: "9px 12px",
  border: `1px solid ${C.border}`, borderRadius: "8px",
  fontSize: "13px", color: C.slate, background: C.white,
  outline: "none", boxSizing: "border-box" as const,
  fontFamily: "inherit",
};

type Stage = "input" | "ats_before" | "matched" | "generated" | "ats_after";

function loadSession() {
  try { const s = sessionStorage.getItem("apply_state"); return s ? JSON.parse(s) : null; }
  catch { return null; }
}
function saveSession(state: any) {
  try { sessionStorage.setItem("apply_state", JSON.stringify(state)); } catch {}
}

function ATSBar({ score, label }: { score: number; label: string }) {
  const color = score >= 70 ? C.green : score >= 50 ? C.amber : C.red;
  return (
    <div style={{ marginBottom: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
        <span style={{ fontSize: "12px", color: C.mid, fontWeight: "600" }}>{label}</span>
        <span style={{ fontSize: "18px", fontWeight: "800", color }}>{score}%</span>
      </div>
      <div style={{ height: "8px", background: C.border, borderRadius: "4px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${score}%`, background: color, borderRadius: "4px", transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <h2 style={{ fontSize: "15px", fontWeight: "700", color: C.slate, margin: 0 }}>{title}</h2>
      {subtitle && <p style={{ fontSize: "12px", color: C.mid, margin: "4px 0 0" }}>{subtitle}</p>}
    </div>
  );
}

export default function ApplyPage() {
  const { getToken } = useAuth();
  const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
  const saved = typeof window !== "undefined" ? loadSession() : null;

  const [jd, setJd] = useState(saved?.jd || "");
  const [language, setLanguage] = useState(saved?.language || "English");
  const [stage, setStage] = useState<Stage>((saved?.stage as Stage) || "input");
  const [loading, setLoading] = useState(false);
  const [genLoading, setGenLoading] = useState<"cv" | "cl" | null>(null);
  const [error, setError] = useState("");
  const [applicationId, setApplicationId] = useState(saved?.applicationId || "");
  const [atsBefore, setAtsBefore] = useState<any>(saved?.atsBefore || null);
  const [matchResult, setMatchResult] = useState<any>(saved?.matchResult || null);
  const [cvLatex, setCvLatex] = useState(saved?.cvLatex || "");
  const [clLatex, setClLatex] = useState(saved?.clLatex || "");
  const [atsAfter, setAtsAfter] = useState<any>(saved?.atsAfter || null);
  const [activeTab, setActiveTab] = useState<"cv" | "cl">("cv");
  const [copied, setCopied] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    saveSession({ jd, language, stage, applicationId, atsBefore, matchResult, cvLatex, clLatex, atsAfter });
  }, [jd, language, stage, applicationId, atsBefore, matchResult, cvLatex, clLatex, atsAfter]);

  async function authFetch(path: string, body: any) {
    const token = await getToken();
    const res = await fetch(`${BACKEND}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Request failed");
    return data;
  }

  async function runAtsBefore() {
    if (!jd.trim()) return;
    setLoading(true); setError("");
    try {
      const matchData = await authFetch("/applications/match", { job_description: jd, company: "", role: "", n_results: 3 });
      setApplicationId(matchData.application_id);
      setMatchResult(matchData);
      const atsData = await authFetch("/applications/ats-score", { application_id: matchData.application_id, stage: "before" });
      setAtsBefore(atsData);
      setStage("ats_before");
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function generate(type: "cv" | "cl") {
    setGenLoading(type); setError("");
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND}/applications/generate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ application_id: applicationId, doc_type: type, language }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Generation failed");
      if (type === "cv") { setCvLatex(data.latex); setActiveTab("cv"); }
      else { setClLatex(data.latex); setActiveTab("cl"); }
      setStage("generated");
    } catch (e: any) { setError(e.message); }
    finally { setGenLoading(null); }
  }

  async function runAtsAfter() {
    setLoading(true); setError("");
    try {
      const data = await authFetch("/applications/ats-score", { application_id: applicationId, stage: "after" });
      setAtsAfter(data);
      setStage("ats_after");
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key); setTimeout(() => setCopied(""), 2000);
  }

  const [pdfLoading, setPdfLoading] = useState(false);

  async function downloadPDF(latex: string, filename: string) {
    setPdfLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND}/export/pdf`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ latex, filename }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "PDF compilation failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${filename}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      // Fallback: download .tex
      const blob = new Blob([latex], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${filename}.tex`; a.click();
      URL.revokeObjectURL(url);
      setError("PDF not available on server — downloaded .tex instead. Open in Overleaf to compile.");
    } finally { setPdfLoading(false); }
  }

  function downloadTex(latex: string, filename: string) {
    const blob = new Blob([latex], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${filename}.tex`; a.click();
    URL.revokeObjectURL(url);
  }

  function reset() {
    setJd(""); setLanguage("English"); setStage("input");
    setApplicationId(""); setAtsBefore(null); setMatchResult(null);
    setCvLatex(""); setClLatex(""); setAtsAfter(null); setError("");
    try { sessionStorage.removeItem("apply_state"); } catch {}
  }

  const scoreDelta = atsBefore && atsAfter ? atsAfter.score - atsBefore.score : null;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: "700", color: C.slate, margin: 0 }}>Apply</h1>
          <p style={{ color: C.mid, fontSize: "13px", margin: "4px 0 0" }}>Paste a JD — KarriereOS retrieves your best projects and generates tailored documents</p>
        </div>
        {stage !== "input" && (
          <button onClick={reset} style={{ fontSize: "12px", color: C.mid, background: C.white, border: `1px solid ${C.border}`, borderRadius: "7px", padding: "7px 14px", cursor: "pointer" }}>
            ↩ New Application
          </button>
        )}
      </div>

      {/* Progress */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: "28px" }}>
        {[{ key: "input", label: "JD Input" }, { key: "ats_before", label: "ATS Before" }, { key: "matched", label: "RAG Match" }, { key: "generated", label: "Generate" }, { key: "ats_after", label: "ATS After" }]
          .map(({ key, label }, i) => {
            const stages: Stage[] = ["input", "ats_before", "matched", "generated", "ats_after"];
            const current = stages.indexOf(stage);
            const idx = stages.indexOf(key as Stage);
            const done = current > idx;
            const active = current === idx;
            return (
              <div key={key} style={{ display: "flex", alignItems: "center", flex: i < 4 ? 1 : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ width: "24px", height: "24px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "700", background: done ? C.green : active ? C.indigo : C.border, color: done || active ? "#fff" : C.light, flexShrink: 0 }}>
                    {done ? "✓" : i + 1}
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: active ? "700" : "500", color: active ? C.slate : done ? C.green : C.light, whiteSpace: "nowrap" }}>{label}</span>
                </div>
                {i < 4 && <div style={{ flex: 1, height: "1px", background: done ? C.green : C.border, margin: "0 8px" }} />}
              </div>
            );
          })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: stage === "input" ? "1fr" : "1fr 340px", gap: "20px", alignItems: "start" }}>

        {/* LEFT COLUMN */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* JD Input card */}
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <SectionHeader title="Job Description" subtitle="Paste the full JD below" />
            <textarea value={jd} onChange={e => setJd(e.target.value)} disabled={stage !== "input"}
              placeholder="Paste the full job description here..."
              style={{ ...inp, height: stage === "input" ? "200px" : "120px", resize: "vertical", opacity: stage !== "input" ? 0.6 : 1 } as any} />
            <div style={{ marginTop: "12px" }}>
              <label style={{ fontSize: "10px", fontWeight: "700", color: C.mid, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "5px" }}>Output Language</label>
              <select style={{ ...inp, maxWidth: "200px", opacity: stage !== "input" ? 0.6 : 1 }} value={language} onChange={e => setLanguage(e.target.value)} disabled={stage !== "input"}>
                {LANGUAGES.map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
            {error && <div style={{ marginTop: "12px", padding: "10px 14px", background: C.redLight, border: `1px solid #FCA5A5`, borderRadius: "8px", fontSize: "12px", color: C.red }}>{error}</div>}
            {stage === "input" && (
              <div style={{ marginTop: "16px", textAlign: "right" }}>
                <button onClick={runAtsBefore} disabled={loading || !jd.trim()}
                  style={{ padding: "10px 24px", background: loading || !jd.trim() ? C.border : C.indigo, color: loading || !jd.trim() ? C.light : "#fff", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: "700", cursor: loading || !jd.trim() ? "not-allowed" : "pointer" }}>
                  {loading ? "Analysing..." : "Analyse JD →"}
                </button>
              </div>
            )}
          </div>

          {/* RAG Match results */}
          {matchResult && (
            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <SectionHeader title="RAG Match Results" subtitle={`Top ${matchResult.retrieved_projects?.length} projects retrieved`} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "20px" }}>
                {matchResult.retrieved_projects?.map((p: any, i: number) => (
                  <div key={p.id} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "11px", fontWeight: "700", color: C.indigo }}>#{i + 1}</span>
                      <span style={{ fontSize: "11px", fontWeight: "700", color: C.green, background: C.greenLight, padding: "1px 7px", borderRadius: "20px" }}>{(p.relevance_score * 100).toFixed(0)}%</span>
                    </div>
                    <div style={{ fontSize: "12px", fontWeight: "600", color: C.slate, marginTop: "6px", lineHeight: "1.3" }}>{p.title}</div>
                    <div style={{ fontSize: "11px", color: C.light, marginTop: "3px" }}>{p.category}</div>
                    {p.debug && (
                      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "8px" }}>
                        <span style={{ fontSize: "10px", background: C.indigoLight, color: C.indigo, padding: "1px 6px", borderRadius: "4px" }}>sem {(p.debug.semantic * 100).toFixed(0)}%</span>
                        <span style={{ fontSize: "10px", background: C.greenLight, color: C.green, padding: "1px 6px", borderRadius: "4px" }}>bm25 {p.debug.bm25?.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: "10px", fontWeight: "700", color: C.mid, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>Tailored Output</div>
              <pre style={{ fontSize: "12px", color: C.mid, whiteSpace: "pre-wrap", lineHeight: "1.6", fontFamily: "monospace", margin: "0 0 20px", background: C.bg, padding: "16px", borderRadius: "8px", border: `1px solid ${C.border}`, maxHeight: "300px", overflowY: "auto" }}>
                {matchResult.tailored_output}
              </pre>
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button onClick={() => generate("cv")} disabled={genLoading !== null}
                  style={{ padding: "9px 20px", background: genLoading === "cv" ? C.border : C.indigo, color: genLoading === "cv" ? C.light : "#fff", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: "700", cursor: genLoading !== null ? "not-allowed" : "pointer" }}>
                  {genLoading === "cv" ? "Generating..." : "📄 Generate CV"}
                </button>
                <button onClick={() => generate("cl")} disabled={genLoading !== null}
                  style={{ padding: "9px 20px", background: genLoading === "cl" ? C.border : "#065F46", color: genLoading === "cl" ? C.light : "#fff", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: "700", cursor: genLoading !== null ? "not-allowed" : "pointer" }}>
                  {genLoading === "cl" ? "Generating..." : "✉️ Generate Cover Letter"}
                </button>
              </div>
            </div>
          )}

          {/* LaTeX output */}
          {(cvLatex || clLatex) && (
            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                {cvLatex && <button onClick={() => setActiveTab("cv")} style={{ padding: "6px 14px", borderRadius: "6px", border: `1px solid ${activeTab === "cv" ? C.indigo : C.border}`, background: activeTab === "cv" ? C.indigoLight : C.white, color: activeTab === "cv" ? C.indigo : C.mid, fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>📄 CV</button>}
                {clLatex && <button onClick={() => setActiveTab("cl")} style={{ padding: "6px 14px", borderRadius: "6px", border: `1px solid ${activeTab === "cl" ? C.indigo : C.border}`, background: activeTab === "cl" ? C.indigoLight : C.white, color: activeTab === "cl" ? C.indigo : C.mid, fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>✉️ Cover Letter</button>}
                <div style={{ flex: 1 }} />
                <button onClick={() => copy(activeTab === "cv" ? cvLatex : clLatex, activeTab)} style={{ fontSize: "12px", color: copied === activeTab ? C.green : C.mid, background: "none", border: "none", cursor: "pointer", fontWeight: "600" }}>
                  {copied === activeTab ? "Copied ✓" : "Copy LaTeX →"}
                </button>
                <button onClick={() => downloadPDF(activeTab === "cv" ? cvLatex : clLatex, activeTab === "cv" ? "CV_karriereos" : "CoverLetter_karriereos")}
                  disabled={pdfLoading}
                  style={{ fontSize: "12px", padding: "5px 12px", background: pdfLoading ? C.border : C.indigo, color: pdfLoading ? C.light : "#fff", border: "none", borderRadius: "6px", cursor: pdfLoading ? "not-allowed" : "pointer", fontWeight: "600" }}>
                  {pdfLoading ? "Compiling..." : "⬇ Download PDF"}
                </button>
                <a href="https://www.overleaf.com/project" target="_blank" rel="noopener noreferrer" style={{ fontSize: "12px", color: C.mid, textDecoration: "none" }}>Open Overleaf ↗</a>
              </div>
              <pre style={{ fontSize: "11px", color: C.mid, whiteSpace: "pre-wrap", lineHeight: "1.5", fontFamily: "monospace", margin: 0, background: C.bg, padding: "16px", borderRadius: "8px", border: `1px solid ${C.border}`, maxHeight: "360px", overflowY: "auto" }}>
                {activeTab === "cv" ? cvLatex : clLatex}
              </pre>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px" }}>
                <p style={{ fontSize: "11px", color: C.light, margin: 0 }}>Copy → Overleaf → New Project → Blank → paste → Compile</p>
                {!atsAfter && (
                  <button onClick={runAtsAfter} disabled={loading} style={{ padding: "7px 16px", background: C.indigo, color: "#fff", border: "none", borderRadius: "7px", fontSize: "12px", fontWeight: "700", cursor: loading ? "not-allowed" : "pointer" }}>
                    {loading ? "Scoring..." : "Score ATS After →"}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN — ATS Panel */}
        {stage !== "input" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {atsBefore && (
              <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize: "11px", fontWeight: "700", color: C.mid, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "14px" }}>ATS Score — Before</div>
                <ATSBar score={atsBefore.score} label="Current match" />
                {atsBefore.matched_keywords?.length > 0 && (
                  <div style={{ marginBottom: "12px" }}>
                    <div style={{ fontSize: "11px", fontWeight: "600", color: C.green, marginBottom: "6px" }}>✓ Matched</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                      {atsBefore.matched_keywords.slice(0, 8).map((kw: string) => (
                        <span key={kw} style={{ fontSize: "10px", background: C.greenLight, color: C.green, padding: "2px 8px", borderRadius: "20px" }}>{kw}</span>
                      ))}
                    </div>
                  </div>
                )}
                {atsBefore.missing_keywords?.length > 0 && (
                  <div>
                    <div style={{ fontSize: "11px", fontWeight: "600", color: C.red, marginBottom: "6px" }}>✗ Missing</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                      {atsBefore.missing_keywords.slice(0, 8).map((kw: string) => (
                        <span key={kw} style={{ fontSize: "10px", background: C.redLight, color: C.red, padding: "2px 8px", borderRadius: "20px" }}>{kw}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {atsAfter && (
              <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize: "11px", fontWeight: "700", color: C.mid, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "14px" }}>ATS Score — After</div>
                <ATSBar score={atsAfter.score} label="After tailoring" />
                {scoreDelta !== null && (
                  <div style={{ background: scoreDelta > 0 ? C.greenLight : C.redLight, border: `1px solid ${scoreDelta > 0 ? "#86EFAC" : "#FCA5A5"}`, borderRadius: "8px", padding: "10px 14px", marginBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "12px", color: scoreDelta > 0 ? C.green : C.red, fontWeight: "600" }}>{scoreDelta > 0 ? "↑" : "↓"} {Math.abs(scoreDelta)} pts</span>
                    <span style={{ fontSize: "18px", fontWeight: "800", color: scoreDelta > 0 ? C.green : C.red }}>{atsBefore.score}% → {atsAfter.score}%</span>
                  </div>
                )}
                {atsAfter.missing_keywords?.length > 0 && (
                  <div>
                    <div style={{ fontSize: "11px", fontWeight: "600", color: C.amber, marginBottom: "6px" }}>Still missing</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                      {atsAfter.missing_keywords.slice(0, 6).map((kw: string) => (
                        <span key={kw} style={{ fontSize: "10px", background: C.amberLight, color: C.amber, padding: "2px 8px", borderRadius: "20px" }}>{kw}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {applicationId && (
              <div style={{ background: C.indigoLight, border: `1px solid #C7D2FE`, borderRadius: "10px", padding: "14px 16px" }}>
                <div style={{ fontSize: "12px", fontWeight: "700", color: C.indigo, marginBottom: "4px" }}>✦ Saved to tracker</div>
                <div style={{ fontSize: "11px", color: C.mid }}>This application is saved. Update its status in the Tracker.</div>
                <a href="/tracker" style={{ fontSize: "11px", color: C.indigo, textDecoration: "none", fontWeight: "600", display: "block", marginTop: "8px" }}>Go to Tracker →</a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}