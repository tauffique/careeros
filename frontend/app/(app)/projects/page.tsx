"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";

const C = { indigo: "#4F46E5", slate: "#0F172A", mid: "#64748B", light: "#94A3B8", bg: "#F8FAFC", white: "#fff", border: "#E2E8F0", green: "#10B981", red: "#EF4444" };

const btn = (primary = false) => ({
  padding: primary ? "9px 18px" : "7px 14px",
  background: primary ? C.indigo : C.white,
  color: primary ? "#fff" : C.mid,
  border: `1px solid ${primary ? C.indigo : C.border}`,
  borderRadius: "8px", fontSize: "13px", fontWeight: "600",
  cursor: "pointer", transition: "all 0.15s",
});

const inp = { width: "100%", padding: "9px 12px", border: `1px solid ${C.border}`, borderRadius: "8px", fontSize: "13px", color: C.slate, background: C.white, outline: "none", boxSizing: "border-box" as const };

export default function Projects() {
  const { getToken } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ title: "", category: "", stack: "", description: "", date_range: "" });
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function api(path: string, method = "GET", body?: any) {
    const token = await getToken();
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}${path}`, {
      method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.json();
  }

  async function load() {
    const data = await api("/projects/");
    setProjects(data);
  }

  useEffect(() => { load(); }, []);

  function openEdit(p: any) {
    setEditing(p);
    setForm({ title: p.title, category: p.category || "", stack: (p.stack || []).join(", "), description: p.description, date_range: p.date_range || "" });
    setShowForm(true);
  }

  function openNew() {
    setEditing(null);
    setForm({ title: "", category: "", stack: "", description: "", date_range: "" });
    setShowForm(true);
  }

  async function save() {
    setLoading(true);
    const payload = { ...form, stack: form.stack.split(",").map(s => s.trim()).filter(Boolean) };
    if (editing) await api(`/projects/${editing.id}`, "PUT", payload);
    else await api("/projects/", "POST", payload);
    await load();
    setShowForm(false);
    setLoading(false);
  }

  async function remove(id: string) {
    if (!confirm("Delete this project from your knowledge base?")) return;
    await api(`/projects/${id}`, "DELETE");
    await load();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: "700", color: C.slate, margin: 0 }}>Knowledge Base</h1>
          <p style={{ color: C.mid, fontSize: "13px", margin: "4px 0 0" }}>Your projects — stored in ChromaDB, used for RAG matching</p>
        </div>
        <button onClick={openNew} style={btn(true)}>+ Add Project</button>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "24px", marginBottom: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <h3 style={{ margin: "0 0 20px", fontSize: "14px", fontWeight: "700", color: C.slate }}>{editing ? "Edit Project" : "New Project"}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div><label style={{ fontSize: "11px", color: C.mid, fontWeight: "600", display: "block", marginBottom: "5px" }}>TITLE *</label>
              <input style={inp} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. RAG Pipeline" /></div>
            <div><label style={{ fontSize: "11px", color: C.mid, fontWeight: "600", display: "block", marginBottom: "5px" }}>CATEGORY</label>
              <input style={inp} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. AI Engineering" /></div>
            <div><label style={{ fontSize: "11px", color: C.mid, fontWeight: "600", display: "block", marginBottom: "5px" }}>STACK (comma separated)</label>
              <input style={inp} value={form.stack} onChange={e => setForm(f => ({ ...f, stack: e.target.value }))} placeholder="Next.js, FastAPI, PostgreSQL" /></div>
            <div><label style={{ fontSize: "11px", color: C.mid, fontWeight: "600", display: "block", marginBottom: "5px" }}>DATE RANGE</label>
              <input style={inp} value={form.date_range} onChange={e => setForm(f => ({ ...f, date_range: e.target.value }))} placeholder="e.g. 2024–present" /></div>
          </div>
          <div style={{ marginTop: "14px" }}>
            <label style={{ fontSize: "11px", color: C.mid, fontWeight: "600", display: "block", marginBottom: "5px" }}>DESCRIPTION * (this gets embedded into ChromaDB — be detailed)</label>
            <textarea style={{ ...inp, height: "140px", resize: "vertical" } as any} value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Describe what you built, the tech stack, key results, and why it matters..." />
          </div>
          <div style={{ display: "flex", gap: "10px", marginTop: "16px", justifyContent: "flex-end" }}>
            <button onClick={() => setShowForm(false)} style={btn()}>Cancel</button>
            <button onClick={save} disabled={loading || !form.title || !form.description} style={btn(true)}>
              {loading ? "Saving..." : editing ? "Update Project" : "Save & Embed →"}
            </button>
          </div>
        </div>
      )}

      {/* Projects list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {projects.length === 0 && !showForm && (
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "48px", textAlign: "center" }}>
            <div style={{ fontSize: "32px", marginBottom: "8px" }}>◈</div>
            <div style={{ fontSize: "13px", color: C.mid }}>No projects yet. Add your first project to start matching.</div>
          </div>
        )}
        {projects.map(p => (
          <div key={p.id} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "16px 20px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
            <div style={{ flex: 1, marginRight: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                <span style={{ fontSize: "13px", fontWeight: "700", color: C.slate }}>{p.title}</span>
                {p.chroma_synced && <span style={{ fontSize: "10px", background: "#ECFDF5", color: C.green, padding: "2px 7px", borderRadius: "20px", fontWeight: "600" }}>● synced</span>}
                {p.category && <span style={{ fontSize: "11px", color: C.mid, background: "#F1F5F9", padding: "2px 7px", borderRadius: "20px" }}>{p.category}</span>}
              </div>
              {p.stack?.length > 0 && <div style={{ fontSize: "11px", color: C.light, marginBottom: "6px" }}>{p.stack.join(" · ")}</div>}
              <div style={{ fontSize: "12px", color: C.mid, lineHeight: "1.5", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.description}</div>
            </div>
            <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
              <button onClick={() => openEdit(p)} style={{ ...btn(), fontSize: "12px", padding: "5px 12px" }}>Edit</button>
              <button onClick={() => remove(p.id)} style={{ ...btn(), fontSize: "12px", padding: "5px 12px", color: C.red, borderColor: "#FEE2E2" }}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
