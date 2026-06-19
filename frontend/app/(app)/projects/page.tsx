"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { useOnboarding } from "../../../components/useOnboarding";

const C = {
  indigo: "#4F46E5", indigoLight: "#EEF2FF",
  slate: "#0F172A", mid: "#64748B", light: "#94A3B8",
  bg: "#F8FAFC", white: "#fff", border: "#E2E8F0",
  green: "#10B981", greenLight: "#ECFDF5",
  red: "#EF4444", redLight: "#FEF2F2",
};

const inp = {
  width: "100%", padding: "9px 12px", border: `1px solid ${C.border}`,
  borderRadius: "8px", fontSize: "13px", color: C.slate, background: C.white,
  outline: "none", boxSizing: "border-box" as const, fontFamily: "inherit",
};

const btn = (primary = false, danger = false) => ({
  padding: primary ? "9px 18px" : "7px 14px",
  background: danger ? C.redLight : primary ? C.indigo : C.white,
  color: danger ? C.red : primary ? "#fff" : C.mid,
  border: `1px solid ${danger ? "#FCA5A5" : primary ? C.indigo : C.border}`,
  borderRadius: "8px", fontSize: "13px", fontWeight: "600",
  cursor: "pointer", transition: "all 0.15s", fontFamily: "inherit",
});

type Tab = "profile" | "projects" | "education" | "skills" | "certifications";

export default function KnowledgeBase() {
  const { getToken } = useAuth();
  const ready = useOnboarding();
  const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const [activeTab, setActiveTab] = useState<Tab>("projects");
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Profile
  const [profile, setProfile] = useState({
    full_name: "", email: "", phone: "", address: "",
    linkedin_url: "", github_url: "", portfolio_url: "",
    output_language: "English",
  });

  // Projects
  const [projects, setProjects] = useState<any[]>([]);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [projectForm, setProjectForm] = useState({ title: "", category: "", stack: "", description: "", date_range: "" });

  // Education
  const [education, setEducation] = useState<any[]>([]);
  const [eduForm, setEduForm] = useState({ institution: "", degree: "", field: "", location: "", start_date: "", end_date: "" });
  const [showEduForm, setShowEduForm] = useState(false);

  // Certifications
  const [certs, setCerts] = useState<any[]>([]);
  const [certForm, setCertForm] = useState({ name: "", issuer: "", date_obtained: "" });
  const [showCertForm, setShowCertForm] = useState(false);

  // Skills
  const [skills, setSkills] = useState("");

  async function api(path: string, method = "GET", body?: any) {
    const token = await getToken();
    const res = await fetch(`${BACKEND}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Request failed");
    return data;
  }

  async function loadAll() {
    if (!ready) return;
    try {
      const [profileData, projectsData] = await Promise.all([
        api("/users/me").catch(() => null),
        api("/projects/").catch(() => []),
      ]);
      if (profileData) {
        setProfile(p => ({ ...p, ...profileData.user }));
        setEducation(profileData.education || []);
        setCerts(profileData.certifications || []);
      }
      setProjects(Array.isArray(projectsData) ? projectsData : []);
    } catch {}
  }

  useEffect(() => { if (ready) loadAll(); }, [ready]);

  // ── CV Upload ──────────────────────────────────────────────────────────────
  async function handleCVUpload(file: File) {
    if (!file || file.type !== "application/pdf") { setError("Please upload a PDF"); return; }
    setUploading(true); setUploadMsg("Extracting your CV..."); setError("");
    try {
      const base64 = await toBase64(file);
      const res = await fetch(`${BACKEND}/try/extract-cv`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdf_base64: base64 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Extraction failed");

      setUploadMsg("Saving to your knowledge base...");

      // Save profile
      const token = await getToken();
      await fetch(`${BACKEND}/users/me?email=${encodeURIComponent(data.email || profile.email)}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: data.full_name || "",
          phone: data.phone || "",
          address: data.address || "",
          linkedin_url: data.linkedin_url || "",
          github_url: data.github_url || "",
          portfolio_url: data.portfolio_url || "",
        }),
      });

      // Save education
      for (const e of (data.education || [])) {
        await fetch(`${BACKEND}/users/me/education`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(e),
        });
      }

      // Save certifications
      for (const c of (data.certifications || [])) {
        await fetch(`${BACKEND}/users/me/certifications`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(c),
        });
      }

      // Save projects
      for (const p of (data.projects || [])) {
        await fetch(`${BACKEND}/projects/`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(p),
        });
      }

      // Save skills
      if (data.skills?.length) setSkills(data.skills.join(", "));

      setSuccess("CV imported successfully! Review your data below.");
      await loadAll();
    } catch (e: any) { setError(e.message); }
    finally { setUploading(false); setUploadMsg(""); }
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
    handleCVUpload(e.dataTransfer.files[0]);
  }, [ready]);

  // ── Profile save ──────────────────────────────────────────────────────────
  async function saveProfile() {
    setSaving(true); setError(""); setSuccess("");
    try {
      await api(`/users/me?email=${encodeURIComponent(profile.email)}`, "POST", profile);
      setSuccess("Profile saved!");
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  // ── Project CRUD ─────────────────────────────────────────────────────────
  async function saveProject() {
    setSaving(true); setError("");
    try {
      const payload = { ...projectForm, stack: projectForm.stack.split(",").map(s => s.trim()).filter(Boolean) };
      if (editingProject) await api(`/projects/${editingProject.id}`, "PUT", payload);
      else await api("/projects/", "POST", payload);
      setShowProjectForm(false); setEditingProject(null);
      setProjectForm({ title: "", category: "", stack: "", description: "", date_range: "" });
      setSuccess("Project saved and embedded!");
      await loadAll();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function deleteProject(id: string) {
    if (!confirm("Delete this project?")) return;
    try { await api(`/projects/${id}`, "DELETE"); await loadAll(); } catch (e: any) { setError(e.message); }
  }

  function editProject(p: any) {
    setEditingProject(p);
    setProjectForm({ title: p.title, category: p.category || "", stack: (p.stack || []).join(", "), description: p.description, date_range: p.date_range || "" });
    setShowProjectForm(true);
  }

  // ── Education CRUD ────────────────────────────────────────────────────────
  async function saveEducation() {
    setSaving(true); setError("");
    try {
      await api("/users/me/education", "POST", eduForm);
      setShowEduForm(false);
      setEduForm({ institution: "", degree: "", field: "", location: "", start_date: "", end_date: "" });
      setSuccess("Education saved!");
      await loadAll();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  // ── Cert CRUD ─────────────────────────────────────────────────────────────
  async function saveCert() {
    setSaving(true); setError("");
    try {
      await api("/users/me/certifications", "POST", certForm);
      setShowCertForm(false);
      setCertForm({ name: "", issuer: "", date_obtained: "" });
      setSuccess("Certification saved!");
      await loadAll();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: "projects", label: "Projects", icon: "◈" },
    { key: "profile", label: "Profile", icon: "👤" },
    { key: "education", label: "Education", icon: "🎓" },
    { key: "skills", label: "Skills", icon: "⚡" },
    { key: "certifications", label: "Certifications", icon: "🏆" },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: "700", color: C.slate, margin: 0 }}>Knowledge Base</h1>
          <p style={{ color: C.mid, fontSize: "13px", margin: "4px 0 0" }}>Your complete profile — used for RAG matching and document generation</p>
        </div>
        {/* CV Upload */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          style={{ background: dragging ? C.indigoLight : C.white, border: `2px dashed ${dragging ? C.indigo : C.border}`, borderRadius: "10px", padding: "12px 20px", cursor: "pointer", textAlign: "center", minWidth: "200px" }}
        >
          <input ref={fileRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={e => e.target.files?.[0] && handleCVUpload(e.target.files[0])} />
          {uploading ? (
            <div style={{ fontSize: "12px", color: C.indigo }}>{uploadMsg}</div>
          ) : (
            <>
              <div style={{ fontSize: "20px", marginBottom: "4px" }}>📄</div>
              <div style={{ fontSize: "12px", fontWeight: "600", color: C.slate }}>Drop CV PDF here</div>
              <div style={{ fontSize: "11px", color: C.mid }}>Auto-fills everything</div>
            </>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && <div style={{ background: C.redLight, border: `1px solid #FCA5A5`, borderRadius: "8px", padding: "10px 14px", fontSize: "12px", color: C.red, marginBottom: "16px" }}>{error}</div>}
      {success && <div style={{ background: C.greenLight, border: `1px solid #86EFAC`, borderRadius: "8px", padding: "10px 14px", fontSize: "12px", color: C.green, marginBottom: "16px" }}>{success}</div>}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "20px", borderBottom: `1px solid ${C.border}`, paddingBottom: "0" }}>
        {TABS.map(({ key, label, icon }) => (
          <button key={key} onClick={() => setActiveTab(key)} style={{
            padding: "8px 16px", background: "none", border: "none",
            borderBottom: `2px solid ${activeTab === key ? C.indigo : "transparent"}`,
            color: activeTab === key ? C.indigo : C.mid,
            fontSize: "13px", fontWeight: activeTab === key ? "700" : "500",
            cursor: "pointer", marginBottom: "-1px",
          }}>
            {icon} {label}
          </button>
        ))}
      </div>

      {/* ── PROJECTS TAB ── */}
      {activeTab === "projects" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
            <button onClick={() => { setShowProjectForm(true); setEditingProject(null); setProjectForm({ title: "", category: "", stack: "", description: "", date_range: "" }); }} style={btn(true)}>+ Add Project</button>
          </div>

          {showProjectForm && (
            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "24px", marginBottom: "16px" }}>
              <div style={{ fontSize: "14px", fontWeight: "700", color: C.slate, marginBottom: "16px" }}>{editingProject ? "Edit Project" : "New Project"}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                <div><label style={{ fontSize: "10px", fontWeight: "700", color: C.mid, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "4px" }}>TITLE *</label>
                  <input style={inp} value={projectForm.title} onChange={e => setProjectForm(f => ({ ...f, title: e.target.value }))} /></div>
                <div><label style={{ fontSize: "10px", fontWeight: "700", color: C.mid, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "4px" }}>CATEGORY</label>
                  <input style={inp} value={projectForm.category} onChange={e => setProjectForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. AI Engineering" /></div>
                <div><label style={{ fontSize: "10px", fontWeight: "700", color: C.mid, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "4px" }}>STACK (comma separated)</label>
                  <input style={inp} value={projectForm.stack} onChange={e => setProjectForm(f => ({ ...f, stack: e.target.value }))} placeholder="Next.js, FastAPI, PostgreSQL" /></div>
                <div><label style={{ fontSize: "10px", fontWeight: "700", color: C.mid, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "4px" }}>DATE RANGE</label>
                  <input style={inp} value={projectForm.date_range} onChange={e => setProjectForm(f => ({ ...f, date_range: e.target.value }))} placeholder="2024–present" /></div>
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "10px", fontWeight: "700", color: C.mid, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "4px" }}>DESCRIPTION * (detailed — this gets embedded into ChromaDB)</label>
                <textarea style={{ ...inp, height: "120px", resize: "vertical" } as any} value={projectForm.description} onChange={e => setProjectForm(f => ({ ...f, description: e.target.value }))} placeholder="What you built, tech used, key results, impact..." />
              </div>
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button onClick={() => setShowProjectForm(false)} style={btn()}>Cancel</button>
                <button onClick={saveProject} disabled={saving || !projectForm.title || !projectForm.description} style={btn(true)}>{saving ? "Saving..." : editingProject ? "Update" : "Save & Embed →"}</button>
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {projects.length === 0 && !showProjectForm && (
              <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "48px", textAlign: "center" }}>
                <div style={{ fontSize: "32px", marginBottom: "8px" }}>◈</div>
                <div style={{ fontSize: "13px", color: C.mid, marginBottom: "12px" }}>No projects yet. Add manually or drop your CV PDF above.</div>
              </div>
            )}
            {projects.map(p => (
              <div key={p.id} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "16px 20px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div style={{ flex: 1, marginRight: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <span style={{ fontSize: "13px", fontWeight: "700", color: C.slate }}>{p.title}</span>
                    {p.chroma_synced && <span style={{ fontSize: "10px", background: C.greenLight, color: C.green, padding: "1px 7px", borderRadius: "20px", fontWeight: "600" }}>● synced</span>}
                    {p.category && <span style={{ fontSize: "11px", color: C.mid, background: "#F1F5F9", padding: "1px 7px", borderRadius: "20px" }}>{p.category}</span>}
                    {p.date_range && <span style={{ fontSize: "11px", color: C.light }}>{p.date_range}</span>}
                  </div>
                  {p.stack?.length > 0 && <div style={{ fontSize: "11px", color: C.indigo, marginBottom: "6px" }}>{p.stack.join(" · ")}</div>}
                  <div style={{ fontSize: "12px", color: C.mid, lineHeight: "1.5", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any, overflow: "hidden" }}>{p.description}</div>
                </div>
                <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                  <button onClick={() => editProject(p)} style={{ ...btn(), fontSize: "12px", padding: "5px 10px" }}>Edit</button>
                  <button onClick={() => deleteProject(p.id)} style={{ ...btn(false, true), fontSize: "12px", padding: "5px 10px" }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PROFILE TAB ── */}
      {activeTab === "profile" && (
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
            {[
              { label: "FULL NAME", key: "full_name" },
              { label: "EMAIL", key: "email" },
              { label: "PHONE", key: "phone" },
              { label: "ADDRESS", key: "address" },
              { label: "LINKEDIN URL", key: "linkedin_url" },
              { label: "GITHUB URL", key: "github_url" },
              { label: "PORTFOLIO URL", key: "portfolio_url" },
            ].map(({ label, key }) => (
              <div key={key}>
                <label style={{ fontSize: "10px", fontWeight: "700", color: C.mid, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "4px" }}>{label}</label>
                <input style={inp} value={(profile as any)[key] || ""} onChange={e => setProfile(p => ({ ...p, [key]: e.target.value }))} />
              </div>
            ))}
            <div>
              <label style={{ fontSize: "10px", fontWeight: "700", color: C.mid, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "4px" }}>DEFAULT OUTPUT LANGUAGE</label>
              <select style={inp} value={profile.output_language} onChange={e => setProfile(p => ({ ...p, output_language: e.target.value }))}>
                {["English","German","French","Spanish","Italian","Dutch","Polish","Portuguese","Chinese","Arabic","Hindi"].map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <button onClick={saveProfile} disabled={saving} style={btn(true)}>{saving ? "Saving..." : "Save Profile"}</button>
          </div>
        </div>
      )}

      {/* ── EDUCATION TAB ── */}
      {activeTab === "education" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
            <button onClick={() => setShowEduForm(true)} style={btn(true)}>+ Add Education</button>
          </div>
          {showEduForm && (
            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "24px", marginBottom: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                {[
                  { label: "INSTITUTION *", key: "institution" },
                  { label: "DEGREE", key: "degree" },
                  { label: "FIELD", key: "field" },
                  { label: "LOCATION", key: "location" },
                  { label: "START DATE", key: "start_date" },
                  { label: "END DATE", key: "end_date" },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <label style={{ fontSize: "10px", fontWeight: "700", color: C.mid, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "4px" }}>{label}</label>
                    <input style={inp} value={(eduForm as any)[key]} onChange={e => setEduForm(f => ({ ...f, [key]: e.target.value }))} />
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button onClick={() => setShowEduForm(false)} style={btn()}>Cancel</button>
                <button onClick={saveEducation} disabled={saving || !eduForm.institution} style={btn(true)}>{saving ? "Saving..." : "Save"}</button>
              </div>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {education.length === 0 && !showEduForm && (
              <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "32px", textAlign: "center", color: C.mid, fontSize: "13px" }}>No education added yet.</div>
            )}
            {education.map((e, i) => (
              <div key={e.id || i} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "16px 20px" }}>
                <div style={{ fontSize: "13px", fontWeight: "700", color: C.slate }}>{e.institution}</div>
                <div style={{ fontSize: "12px", color: C.mid, marginTop: "4px" }}>{e.degree} {e.field} · {e.location}</div>
                <div style={{ fontSize: "11px", color: C.light, marginTop: "2px" }}>{e.start_date} – {e.end_date}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SKILLS TAB ── */}
      {activeTab === "skills" && (
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "24px" }}>
          <label style={{ fontSize: "10px", fontWeight: "700", color: C.mid, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "8px" }}>YOUR SKILLS (comma separated)</label>
          <textarea
            style={{ ...inp, height: "160px", resize: "vertical" } as any}
            value={skills}
            onChange={e => setSkills(e.target.value)}
            placeholder="Python, FastAPI, Next.js, LangChain, ChromaDB, RAG pipelines, Claude API, XGBoost..."
          />
          <div style={{ fontSize: "12px", color: C.mid, marginTop: "8px", marginBottom: "16px" }}>These are included in your CV generation and ATS scoring.</div>
          <div style={{ textAlign: "right" }}>
            <button onClick={async () => {
              setSaving(true);
              try {
                await api(`/users/me?email=${encodeURIComponent(profile.email)}`, "POST", { ...profile, skills_text: skills });
                setSuccess("Skills saved!");
              } catch (e: any) { setError(e.message); }
              finally { setSaving(false); }
            }} disabled={saving} style={btn(true)}>{saving ? "Saving..." : "Save Skills"}</button>
          </div>
        </div>
      )}

      {/* ── CERTIFICATIONS TAB ── */}
      {activeTab === "certifications" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
            <button onClick={() => setShowCertForm(true)} style={btn(true)}>+ Add Certification</button>
          </div>
          {showCertForm && (
            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "24px", marginBottom: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                {[
                  { label: "CERTIFICATION NAME *", key: "name" },
                  { label: "ISSUER", key: "issuer" },
                  { label: "DATE", key: "date_obtained" },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <label style={{ fontSize: "10px", fontWeight: "700", color: C.mid, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "4px" }}>{label}</label>
                    <input style={inp} value={(certForm as any)[key]} onChange={e => setCertForm(f => ({ ...f, [key]: e.target.value }))} />
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button onClick={() => setShowCertForm(false)} style={btn()}>Cancel</button>
                <button onClick={saveCert} disabled={saving || !certForm.name} style={btn(true)}>{saving ? "Saving..." : "Save"}</button>
              </div>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {certs.length === 0 && !showCertForm && (
              <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "32px", textAlign: "center", color: C.mid, fontSize: "13px" }}>No certifications added yet.</div>
            )}
            {certs.map((c, i) => (
              <div key={c.id || i} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "16px 20px" }}>
                <div style={{ fontSize: "13px", fontWeight: "700", color: C.slate }}>{c.name}</div>
                <div style={{ fontSize: "12px", color: C.mid, marginTop: "4px" }}>{c.issuer} · {c.date_obtained}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}