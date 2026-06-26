"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

const C = { indigo: "#4F46E5", slate: "#0F172A", mid: "#64748B", light: "#94A3B8", bg: "#F8FAFC", white: "#fff", border: "#E2E8F0", green: "#10B981", amber: "#F59E0B", red: "#EF4444" };

export default function Dashboard() {
  const { getToken } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({ total: 0, applied: 0, interview: 0, offer: 0 });
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const token = await getToken();
      const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

      // Check if user has any projects — if not, redirect to onboarding
      const projectsRes = await fetch(`${BACKEND}/projects/`, { headers: { Authorization: `Bearer ${token}` } });
      if (projectsRes.ok) {
        const projects = await projectsRes.json();
        if (Array.isArray(projects) && projects.length === 0) {
          // Check if they've seen onboarding before
          const seen = sessionStorage.getItem("onboarding_seen");
          if (!seen) {
            sessionStorage.setItem("onboarding_seen", "true");
            router.push("/onboarding");
            return;
          }
        }
      }

      const res = await fetch(`${BACKEND}/applications/`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const apps = await res.json();
        setRecent(apps.slice(0, 5));
        setStats({
          total: apps.length,
          applied: apps.filter((a: any) => a.status === "applied").length,
          interview: apps.filter((a: any) => a.status === "interview").length,
          offer: apps.filter((a: any) => a.status === "offer").length,
        });
      }
    }
    load();
  }, []);

  const STATUS_COLOR: Record<string, string> = { draft: C.light, applied: C.indigo, interview: C.amber, offer: C.green, rejected: C.red };

  return (
    <div>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: "700", color: C.slate, margin: 0 }}>Dashboard</h1>
        <p style={{ color: C.mid, fontSize: "13px", margin: "4px 0 0" }}>Your job search at a glance</p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "28px" }}>
        {[
          { label: "Total Applications", value: stats.total, color: C.indigo },
          { label: "Applied", value: stats.applied, color: C.indigo },
          { label: "Interviews", value: stats.interview, color: C.amber },
          { label: "Offers", value: stats.offer, color: C.green },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize: "28px", fontWeight: "700", color }}>{value}</div>
            <div style={{ fontSize: "12px", color: C.mid, marginTop: "4px" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Recent applications */}
      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "12px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "13px", fontWeight: "600", color: C.slate }}>Recent Applications</span>
          <a href="/tracker" style={{ fontSize: "12px", color: C.indigo, textDecoration: "none" }}>View all →</a>
        </div>
        {recent.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: C.light }}>
            <div style={{ fontSize: "32px", marginBottom: "8px" }}>✦</div>
            <div style={{ fontSize: "13px" }}>No applications yet</div>
            <a href="/apply" style={{ fontSize: "12px", color: C.indigo, textDecoration: "none", display: "block", marginTop: "8px" }}>Start your first application →</a>
          </div>
        ) : recent.map((app) => (
          <div key={app.id} style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: "13px", fontWeight: "600", color: C.slate }}>{app.role || "—"}</div>
              <div style={{ fontSize: "12px", color: C.mid, marginTop: "2px" }}>{app.company || "—"}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {app.ats_score_before && <span style={{ fontSize: "11px", color: C.mid }}>{app.ats_score_before}% → {app.ats_score_after || "?"}%</span>}
              <span style={{ fontSize: "11px", fontWeight: "600", padding: "3px 10px", borderRadius: "20px", background: (STATUS_COLOR[app.status] || C.light) + "18", color: STATUS_COLOR[app.status] || C.light }}>
                {app.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}