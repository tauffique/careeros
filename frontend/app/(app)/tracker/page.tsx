"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";

const C = { indigo: "#4F46E5", slate: "#0F172A", mid: "#64748B", light: "#94A3B8", bg: "#F8FAFC", white: "#fff", border: "#E2E8F0", green: "#10B981", amber: "#F59E0B", red: "#EF4444" };

const STATUSES = ["draft","applied","interview","offer","rejected"];
const STATUS_COLOR: Record<string,string> = { draft: C.light, applied: C.indigo, interview: C.amber, offer: C.green, rejected: C.red };

export default function Tracker() {
  const { getToken } = useAuth();
  const [apps, setApps] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");

  async function load() {
    const token = await getToken();
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/applications/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setApps(await res.json());
  }

  useEffect(() => { load(); }, []);

  async function updateStatus(id: string, status: string) {
    const token = await getToken();
    await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/applications/${id}/status`, {
      method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setApps(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  }

  async function deleteApp(id: string) {
    if (!confirm("Delete this application?")) return;
    const token = await getToken();
    await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/applications/${id}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token}` },
    });
    setApps(prev => prev.filter(a => a.id !== id));
  }
  const filtered = filter === "all" ? apps : apps.filter(a => a.status === filter);
  const counts = STATUSES.reduce((acc, s) => ({ ...acc, [s]: apps.filter(a => a.status === s).length }), {} as Record<string,number>);

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: "700", color: C.slate, margin: 0 }}>Application Tracker</h1>
        <p style={{ color: C.mid, fontSize: "13px", margin: "4px 0 0" }}>{apps.length} total applications</p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
        {["all", ...STATUSES].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding: "6px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: "600", cursor: "pointer", border: "none",
            background: filter === s ? C.indigo : "#F1F5F9",
            color: filter === s ? "#fff" : C.mid,
          }}>
            {s.charAt(0).toUpperCase() + s.slice(1)} {s === "all" ? `(${apps.length})` : `(${counts[s] || 0})`}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "12px", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 80px 80px 120px 130px 60px", padding: "10px 20px", borderBottom: `1px solid ${C.border}`, background: C.bg }}>
          {["Role", "Company", "Before", "After", "Language", "Status", ""].map(h => (
            <span key={h} style={{ fontSize: "10px", fontWeight: "700", color: C.light, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</span>
          ))}
        </div>
        {filtered.length === 0 && (
          <div style={{ padding: "48px", textAlign: "center", color: C.light, fontSize: "13px" }}>No applications found.</div>
        )}
        {filtered.map(app => (
          <div key={app.id} style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 80px 80px 120px 130px 60px", padding: "14px 20px", borderBottom: `1px solid ${C.border}`, alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "13px", fontWeight: "600", color: C.slate }}>{app.role || "—"}</div>
              <div style={{ fontSize: "11px", color: C.mid, marginTop: "2px" }}>{app.location || ""}</div>
            </div>
            <div style={{ fontSize: "13px", color: C.mid }}>{app.company || "—"}</div>
            <div style={{ fontSize: "13px", fontWeight: "700", color: app.ats_score_before > 70 ? C.green : app.ats_score_before > 50 ? C.amber : C.red }}>
              {app.ats_score_before != null ? `${app.ats_score_before}%` : "—"}
            </div>
            <div style={{ fontSize: "13px", fontWeight: "700", color: app.ats_score_after > 70 ? C.green : app.ats_score_after > 50 ? C.amber : C.red }}>
              {app.ats_score_after != null ? `${app.ats_score_after}%` : "—"}
            </div>
            <div style={{ fontSize: "11px", color: C.mid }}>{app.output_language || "English"}</div>
            <select value={app.status} onChange={e => updateStatus(app.id, e.target.value)}
              style={{ padding: "5px 8px", border: `1px solid ${(STATUS_COLOR[app.status] || C.light)}44`, borderRadius: "6px", fontSize: "11px", fontWeight: "600", color: STATUS_COLOR[app.status] || C.light, background: (STATUS_COLOR[app.status] || C.light) + "12", cursor: "pointer", outline: "none" }}>
              {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
            <button onClick={() => deleteApp(app.id)} style={{ fontSize: "11px", color: C.red, background: "none", border: "none", cursor: "pointer", padding: "4px" }}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}