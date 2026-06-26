"use client";

import { useState, useRef, useCallback } from "react";

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
  outline: "none", boxSizing: "border-box" as const, fontFamily: "inherit",
};

type Stage = "upload" | "review" | "jd" | "matched" | "generated";

function ATSBar({ score, label }: { score: number; label: string }) {
  const color = score >= 70 ? C.green : score >= 50 ? C.amber : C.red;
  return (
    <div style={{ marginBottom: "12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
        <span style={{ fontSize: "12px", color: C.mid, fontWeight: "600" }}>{label}</span>
        <span style={{ fontSize: "16px", fontWeight: "800", color }}>{score}%</span>
      </div>
      <div style={{ height: "6px", background: C.border, borderRadius: "3px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${score}%`, background: color, borderRadius: "3px", transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

export default function TryPage() {
  const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  // Stage
  const [stage, setStage] = useState<Stage>("upload");

  // CV data from extraction
  const [cvData, setCvData] = useState<any>(null);
  const [cvText, setCvText] = useState(""); // raw text for ATS scoring

  // JD
  const [jd, setJd] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [language, setLanguage] = useState("English");

  // Results
  const [matchResult, setMatchResult] = useState<any>(null);
  const [atsBefore, setAtsBefore] = useState<any>(null);
  const [atsAfter, setAtsAfter] = useState<any>(null);
  const [cvLatex, setCvLatex] = useState("");
  const [clLatex, setClLatex] = useState("");
  const [activeTab, setActiveTab] = useState<"cv"|"cl">("cv");
  const [copied, setCopied] = useState("");

  // Loading
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [genLoading, setGenLoading] = useState<"cv"|"cl"|null>(null);
  const [error, setError] = useState("");

  // ── File handling ─────────────────────────────────────────────────────────

  async function handleFile(file: File) {
    if (!file || file.type !== "application/pdf") {
      setError("Please upload a PDF file."); return;
    }
    setError(""); setLoading(true); setLoadingMsg("Reading your CV...");
    try {
      const base64 = await toBase64(file);
      setLoadingMsg("Extracting your details...");
      const res = await fetch(`${BACKEND}/try/extract-cv`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdf_base64: base64 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Extraction failed");
      setCvData(data);
      // Build CV text for ATS scoring
      const text = [
        data.full_name, data.email,
        ...(data.skills || []),
        ...(data.projects || []).map((p: any) => `${p.title} ${(p.stack||[]).join(" ")} ${p.description}`),
        ...(data.certifications || []).map((c: any) => c.name),
      ].join(" ");
      setCvText(text);
      setStage("review");
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); setLoadingMsg(""); }
  }

  function toBase64(file: File): Promise<string> {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res((r.result as string).split(",")[1]);
      r.onerror = () => rej(new Error("Read failed"));
      r.readAsDataURL(file);
    });
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }, []);

  // ── JD analysis ───────────────────────────────────────────────────────────

  async function extractMeta() {
    if (!jd.trim() || (company && role)) return;
    try {
      const res = await fetch(`${BACKEND}/try/extract-meta`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_description: jd }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.company_name && !company) setCompany(data.company_name);
        if (data.role_title && !role) setRole(data.role_title);
      }
    } catch {}
  }

  async function runMatch() {
    if (!jd.trim()) return;
    setLoading(true); setLoadingMsg("Scoring ATS before..."); setError("");
    try {
      // ATS before
      const atsRes = await fetch(`${BACKEND}/try/ats-score`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_description: jd, cv_text: cvText, stage: "before" }),
      });
      if (atsRes.ok) setAtsBefore(await atsRes.json());

      setLoadingMsg("Matching your projects...");
      // RAG match with user's actual projects
      const matchRes = await fetch(`${BACKEND}/try/match`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_description: jd, company, role,
          projects: cvData?.projects || [],
        }),
      });
      const matchData = await matchRes.json();
      if (!matchRes.ok) throw new Error(matchData.detail || "Match failed");
      setMatchResult(matchData);
      setStage("matched");
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); setLoadingMsg(""); }
  }

  async function generate(type: "cv" | "cl") {
    setGenLoading(type); setError("");
    try {
      const res = await fetch(`${BACKEND}/try/generate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_description: jd, company, role, language,
          tailored_output: matchResult.tailored_output, doc_type: type,
          candidate: cvData,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Generation failed");
      if (type === "cv") {
        setCvLatex(data.latex); setActiveTab("cv");
        // ATS after using generated LaTeX
        const atsRes = await fetch(`${BACKEND}/try/ats-score`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ job_description: jd, cv_text: data.latex, stage: "after" }),
        });
        if (atsRes.ok) setAtsAfter(await atsRes.json());
      } else {
        setClLatex(data.latex); setActiveTab("cl");
      }
      setStage("generated");
    } catch (e: any) { setError(e.message); }
    finally { setGenLoading(null); }
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key); setTimeout(() => setCopied(""), 2000);
  }

  const scoreDelta = atsBefore && atsAfter ? atsAfter.score - atsBefore.score : null;

  // ── Steps indicator ───────────────────────────────────────────────────────
  const STEPS = ["Upload CV", "Review", "Paste JD", "Match", "Generate"];
  const stageIdx: Record<Stage, number> = { upload: 0, review: 1, jd: 2, matched: 3, generated: 4 };
  const currentIdx = stageIdx[stage];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Inter', sans-serif" }}>
      {/* Nav */}
      <nav style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: "0 32px", height: "56px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
          <div style={{ width: "26px", height: "26px", background: C.indigo, borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "13px", fontWeight: "800" }}>C</div>
          <span style={{ fontSize: "14px", fontWeight: "700", color: C.slate }}>KarriereOS</span>
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "12px", color: C.light }}>Free trial · 1 application</span>
          <a href="/sign-up" style={{ padding: "7px 16px", background: C.indigo, color: "#fff", borderRadius: "7px", fontSize: "12px", fontWeight: "600", textDecoration: "none" }}>Create Account →</a>
        </div>
      </nav>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "36px 24px" }}>
        {/* Header */}
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ fontSize: "22px", fontWeight: "700", color: C.slate, margin: "0 0 4px" }}>Try KarriereOS Free</h1>
          <p style={{ fontSize: "13px", color: C.mid, margin: 0 }}>Upload your CV — we extract everything. No account needed.</p>
        </div>

        {/* Progress */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: "28px" }}>
          {STEPS.map((step, i) => (
            <div key={step} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ width: "22px", height: "22px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: "700", flexShrink: 0, background: i < currentIdx ? C.green : i === currentIdx ? C.indigo : C.border, color: i <= currentIdx ? "#fff" : C.light }}>
                  {i < currentIdx ? "✓" : i + 1}
                </div>
                <span style={{ fontSize: "11px", fontWeight: i === currentIdx ? "700" : "500", color: i === currentIdx ? C.slate : i < currentIdx ? C.green : C.light, whiteSpace: "nowrap" }}>{step}</span>
              </div>
              {i < STEPS.length - 1 && <div style={{ flex: 1, height: "1px", background: i < currentIdx ? C.green : C.border, margin: "0 8px" }} />}
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: stage === "upload" || stage === "review" ? "1fr" : "1fr 300px", gap: "20px", alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

            {/* ── STEP 1: Upload ── */}
            {stage === "upload" && (
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                style={{ background: dragging ? C.indigoLight : C.white, border: `2px dashed ${dragging ? C.indigo : C.border}`, borderRadius: "16px", padding: "60px 40px", textAlign: "center", cursor: "pointer", transition: "all 0.15s" }}
              >
                <input ref={fileRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
                <div style={{ fontSize: "40px", marginBottom: "16px" }}>📄</div>
                <div style={{ fontSize: "16px", fontWeight: "700", color: C.slate, marginBottom: "8px" }}>
                  {loading ? loadingMsg : "Drop your CV here"}
                </div>
                <div style={{ fontSize: "13px", color: C.mid, marginBottom: "16px" }}>
                  {loading ? "This takes about 10 seconds..." : "PDF format · We extract everything automatically"}
                </div>
                {!loading && (
                  <div style={{ display: "inline-block", padding: "9px 20px", background: C.indigo, color: "#fff", borderRadius: "8px", fontSize: "13px", fontWeight: "600" }}>
                    Browse Files →
                  </div>
                )}
                {loading && (
                  <div style={{ display: "inline-block", width: "24px", height: "24px", border: `2px solid ${C.indigo}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                )}
              </div>
            )}

            {/* ── STEP 2: Review extracted data ── */}
            {(stage === "review" || stage === "jd" || stage === "matched" || stage === "generated") && cvData && (
              <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                  <div>
                    <div style={{ fontSize: "15px", fontWeight: "700", color: C.slate }}>Your Profile</div>
                    <div style={{ fontSize: "12px", color: C.mid, marginTop: "2px" }}>Extracted from your CV — edit if needed</div>
                  </div>
                  {stage !== "review" && <span style={{ fontSize: "11px", color: C.green, fontWeight: "600" }}>✓ Confirmed</span>}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                  {[
                    { label: "Full Name", key: "full_name" },
                    { label: "Email", key: "email" },
                    { label: "Phone", key: "phone" },
                    { label: "LinkedIn", key: "linkedin_url" },
                  ].map(({ label, key }) => (
                    <div key={key}>
                      <label style={{ fontSize: "10px", fontWeight: "700", color: C.mid, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "4px" }}>{label}</label>
                      <input style={inp} value={cvData[key] || ""} onChange={e => setCvData((d: any) => ({ ...d, [key]: e.target.value }))} disabled={stage !== "review"} />
                    </div>
                  ))}
                </div>

                {/* Projects */}
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ fontSize: "11px", fontWeight: "700", color: C.mid, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>
                    Projects ({cvData.projects?.length || 0} extracted)
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {(cvData.projects || []).map((p: any, i: number) => (
                      <div key={i} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                          <div style={{ fontSize: "13px", fontWeight: "700", color: C.slate }}>{p.title}</div>
                          <div style={{ fontSize: "11px", color: C.light }}>{p.date_range}</div>
                        </div>
                        {p.stack?.length > 0 && <div style={{ fontSize: "11px", color: C.indigo, marginBottom: "6px" }}>{p.stack.join(" · ")}</div>}
                        {stage === "review" ? (
                          <textarea
                            value={p.description}
                            onChange={e => {
                              const updated = [...cvData.projects];
                              updated[i] = { ...updated[i], description: e.target.value };
                              setCvData((d: any) => ({ ...d, projects: updated }));
                            }}
                            style={{ ...inp, height: "80px", resize: "vertical", fontSize: "12px" } as any}
                          />
                        ) : (
                          <div style={{ fontSize: "12px", color: C.mid, lineHeight: "1.5", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any, overflow: "hidden" }}>{p.description}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {stage === "review" && (
                  <div style={{ textAlign: "right" }}>
                    <button onClick={() => setStage("jd")}
                      style={{ padding: "10px 24px", background: C.indigo, color: "#fff", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: "700", cursor: "pointer" }}>
                      Looks Good → Paste JD
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 3: JD Input ── */}
            {(stage === "jd" || stage === "matched" || stage === "generated") && (
              <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "24px" }}>
                <div style={{ fontSize: "15px", fontWeight: "700", color: C.slate, marginBottom: "4px" }}>Job Description</div>
                <div style={{ fontSize: "12px", color: C.mid, marginBottom: "14px" }}>Company and role auto-detected on blur</div>
                <textarea value={jd} onChange={e => setJd(e.target.value)} onBlur={extractMeta}
                  disabled={stage !== "jd"}
                  placeholder="Paste the full job description here..."
                  style={{ ...inp, height: stage === "jd" ? "180px" : "100px", resize: "vertical", opacity: stage !== "jd" ? 0.6 : 1 } as any} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginTop: "12px" }}>
                  {[
                    { label: "COMPANY", val: company, set: setCompany },
                    { label: "ROLE", val: role, set: setRole },
                  ].map(({ label, val, set }) => (
                    <div key={label}>
                      <label style={{ fontSize: "10px", fontWeight: "700", color: C.mid, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "4px" }}>{label}</label>
                      <input style={{ ...inp, opacity: stage !== "jd" ? 0.6 : 1 }} value={val} onChange={e => set(e.target.value)} placeholder="Auto-detected" disabled={stage !== "jd"} />
                    </div>
                  ))}
                  <div>
                    <label style={{ fontSize: "10px", fontWeight: "700", color: C.mid, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "4px" }}>LANGUAGE</label>
                    <select style={{ ...inp, opacity: stage !== "jd" ? 0.6 : 1 }} value={language} onChange={e => setLanguage(e.target.value)} disabled={stage !== "jd"}>
                      {LANGUAGES.map(l => <option key={l}>{l}</option>)}
                    </select>
                  </div>
                </div>
                {error && (
                  <div style={{ marginTop: "12px", padding: "12px 16px", background: error.includes("limit") ? C.indigoLight : C.redLight, border: `1px solid ${error.includes("limit") ? "#C7D2FE" : "#FCA5A5"}`, borderRadius: "8px" }}>
                    <div style={{ fontSize: "13px", fontWeight: "700", color: error.includes("limit") ? C.indigo : C.red, marginBottom: error.includes("limit") ? "6px" : 0 }}>
                      {error.includes("limit") ? "Free trial limit reached" : error}
                    </div>
                    {error.includes("limit") && (
                      <>
                        <div style={{ fontSize: "12px", color: C.mid, marginBottom: "10px" }}>{error}</div>
                        <a href="/sign-up" style={{ display: "inline-block", padding: "7px 16px", background: C.indigo, color: "#fff", borderRadius: "7px", fontSize: "12px", fontWeight: "700", textDecoration: "none" }}>Create Free Account →</a>
                      </>
                    )}
                  </div>
                )}
                {stage === "jd" && (
                  <div style={{ marginTop: "16px", textAlign: "right" }}>
                    <button onClick={runMatch} disabled={loading || !jd.trim()}
                      style={{ padding: "10px 24px", background: loading || !jd.trim() ? C.border : C.indigo, color: loading || !jd.trim() ? C.light : "#fff", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: "700", cursor: loading || !jd.trim() ? "not-allowed" : "pointer" }}>
                      {loading ? loadingMsg || "Matching..." : "Match My CV →"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 4: Match results ── */}
            {matchResult && (
              <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "24px" }}>
                <div style={{ fontSize: "15px", fontWeight: "700", color: C.slate, marginBottom: "4px" }}>RAG Match Results</div>
                <div style={{ fontSize: "12px", color: C.mid, marginBottom: "14px" }}>Top {matchResult.retrieved_projects?.length} projects from your knowledge base</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "20px" }}>
                  {matchResult.retrieved_projects?.map((p: any, i: number) => (
                    <div key={p.id} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: "11px", fontWeight: "700", color: C.indigo }}>#{i+1}</span>
                        <span style={{ fontSize: "11px", fontWeight: "700", color: C.green, background: C.greenLight, padding: "1px 7px", borderRadius: "20px" }}>{(p.relevance_score * 100).toFixed(0)}%</span>
                      </div>
                      <div style={{ fontSize: "12px", fontWeight: "600", color: C.slate, marginTop: "6px", lineHeight: "1.3" }}>{p.title}</div>
                      <div style={{ fontSize: "11px", color: C.light, marginTop: "3px" }}>{p.category}</div>
                      {p.debug && (
                        <div style={{ display: "flex", gap: "4px", marginTop: "6px" }}>
                          <span style={{ fontSize: "10px", background: C.indigoLight, color: C.indigo, padding: "1px 6px", borderRadius: "4px" }}>bm25 {p.debug.bm25?.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <pre style={{ fontSize: "12px", color: C.mid, whiteSpace: "pre-wrap", lineHeight: "1.6", fontFamily: "monospace", margin: "0 0 20px", background: C.bg, padding: "16px", borderRadius: "8px", border: `1px solid ${C.border}`, maxHeight: "280px", overflowY: "auto" }}>
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

            {/* ── STEP 5: LaTeX output ── */}
            {(cvLatex || clLatex) && (
              <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                  {cvLatex && <button onClick={() => setActiveTab("cv")} style={{ padding: "6px 14px", borderRadius: "6px", border: `1px solid ${activeTab === "cv" ? C.indigo : C.border}`, background: activeTab === "cv" ? C.indigoLight : C.white, color: activeTab === "cv" ? C.indigo : C.mid, fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>📄 CV</button>}
                  {clLatex && <button onClick={() => setActiveTab("cl")} style={{ padding: "6px 14px", borderRadius: "6px", border: `1px solid ${activeTab === "cl" ? C.indigo : C.border}`, background: activeTab === "cl" ? C.indigoLight : C.white, color: activeTab === "cl" ? C.indigo : C.mid, fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>✉️ Cover Letter</button>}
                  <div style={{ flex: 1 }} />
                  <button onClick={() => copy(activeTab === "cv" ? cvLatex : clLatex, activeTab)} style={{ fontSize: "12px", color: copied === activeTab ? C.green : C.mid, background: "none", border: "none", cursor: "pointer", fontWeight: "600" }}>
                    {copied === activeTab ? "Copied ✓" : "Copy LaTeX →"}
                  </button>
                  <a href="https://www.overleaf.com/project" target="_blank" rel="noopener noreferrer" style={{ fontSize: "12px", color: C.mid, textDecoration: "none" }}>Open Overleaf ↗</a>
                </div>
                <pre style={{ fontSize: "11px", color: C.mid, whiteSpace: "pre-wrap", lineHeight: "1.5", fontFamily: "monospace", margin: 0, background: C.bg, padding: "16px", borderRadius: "8px", border: `1px solid ${C.border}`, maxHeight: "340px", overflowY: "auto" }}>
                  {activeTab === "cv" ? cvLatex : clLatex}
                </pre>
                <p style={{ fontSize: "11px", color: C.light, marginTop: "10px", marginBottom: 0 }}>Copy → Overleaf → New Project → Blank → paste into main.tex → Compile</p>
              </div>
            )}

            {/* Upsell */}
            {stage === "generated" && (
              <div style={{ background: C.indigoLight, border: "1px solid #C7D2FE", borderRadius: "12px", padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: "700", color: C.slate }}>Want unlimited applications?</div>
                  <div style={{ fontSize: "12px", color: C.mid, marginTop: "3px" }}>Your CV data is ready — create an account in seconds and we'll import everything.</div>
                </div>
                <a href="/sign-up" style={{ padding: "9px 20px", background: C.indigo, color: "#fff", borderRadius: "8px", fontSize: "13px", fontWeight: "700", textDecoration: "none", whiteSpace: "nowrap", marginLeft: "20px" }}>Create Account →</a>
              </div>
            )}
          </div>

          {/* ── RIGHT: ATS Panel ── */}
          {(atsBefore || atsAfter) && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {atsBefore && (
                <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "20px" }}>
                  <div style={{ fontSize: "11px", fontWeight: "700", color: C.mid, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "14px" }}>ATS Score — Before</div>
                  <ATSBar score={atsBefore.score} label="Current match" />
                  {atsBefore.matched_keywords?.length > 0 && (
                    <div style={{ marginBottom: "10px" }}>
                      <div style={{ fontSize: "11px", fontWeight: "600", color: C.green, marginBottom: "5px" }}>✓ Matched</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                        {atsBefore.matched_keywords.slice(0, 8).map((kw: string) => (
                          <span key={kw} style={{ fontSize: "10px", background: C.greenLight, color: C.green, padding: "2px 7px", borderRadius: "20px" }}>{kw}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {atsBefore.missing_keywords?.length > 0 && (
                    <div>
                      <div style={{ fontSize: "11px", fontWeight: "600", color: C.red, marginBottom: "5px" }}>✗ Missing</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                        {atsBefore.missing_keywords.slice(0, 8).map((kw: string) => (
                          <span key={kw} style={{ fontSize: "10px", background: C.redLight, color: C.red, padding: "2px 7px", borderRadius: "20px" }}>{kw}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {atsAfter && (
                <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "20px" }}>
                  <div style={{ fontSize: "11px", fontWeight: "700", color: C.mid, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "14px" }}>ATS Score — After</div>
                  <ATSBar score={atsAfter.score} label="After tailoring" />
                  {scoreDelta !== null && (
                    <div style={{ background: scoreDelta > 0 ? C.greenLight : C.redLight, border: `1px solid ${scoreDelta > 0 ? "#86EFAC" : "#FCA5A5"}`, borderRadius: "8px", padding: "10px 14px", marginBottom: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "12px", color: scoreDelta > 0 ? C.green : C.red, fontWeight: "700" }}>
                        {scoreDelta > 0 ? "↑" : "↓"} {Math.abs(scoreDelta)} pts
                      </span>
                      <span style={{ fontSize: "14px", fontWeight: "800", color: scoreDelta > 0 ? C.green : C.red }}>
                        {atsBefore.score}% → {atsAfter.score}%
                      </span>
                    </div>
                  )}
                  {atsAfter.missing_keywords?.length > 0 && (
                    <div>
                      <div style={{ fontSize: "11px", fontWeight: "600", color: C.amber, marginBottom: "5px" }}>Still missing</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                        {atsAfter.missing_keywords.slice(0, 6).map((kw: string) => (
                          <span key={kw} style={{ fontSize: "10px", background: C.amberLight, color: C.amber, padding: "2px 7px", borderRadius: "20px" }}>{kw}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}