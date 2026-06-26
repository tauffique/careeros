"use client";
import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
const C = { indigo:"#4F46E5",indigoLight:"#EEF2FF",slate:"#0F172A",mid:"#64748B",light:"#94A3B8",bg:"#F8FAFC",white:"#fff",border:"#E2E8F0",green:"#10B981",greenLight:"#ECFDF5",amber:"#F59E0B",red:"#EF4444" };
export default function Dashboard() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [stats, setStats] = useState({ total:0, applied:0, interview:0, offer:0, projects:0, avgAts:0 });
  const [recent, setRecent] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const STATUS_COLOR: Record<string,string> = { draft:C.light, applied:C.indigo, interview:C.amber, offer:C.green, rejected:C.red };
  useEffect(() => {
    async function load() {
      const token = await getToken();
      const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      const [projectsRes, appsRes] = await Promise.all([
        fetch(`${BACKEND}/projects/`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${BACKEND}/applications/`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const projects = projectsRes.ok ? await projectsRes.json() : [];
      const projectCount = Array.isArray(projects) ? projects.length : 0;
      if (projectCount === 0 && !sessionStorage.getItem("onboarding_seen")) {
        sessionStorage.setItem("onboarding_seen", "true");
        router.push("/onboarding");
        return;
      }
      if (appsRes.ok) {
        const apps = await appsRes.json();
        const scored = apps.filter((a: any) => a.ats_score_before > 0);
        const avgAts = scored.length ? Math.round(scored.reduce((s:number, a:any) => s + a.ats_score_before, 0) / scored.length) : 0;
        setRecent(apps.slice(0, 5));
        setStats({ total:apps.length, applied:apps.filter((a:any)=>a.status==="applied").length, interview:apps.filter((a:any)=>a.status==="interview").length, offer:apps.filter((a:any)=>a.status==="offer").length, projects:projectCount, avgAts });
      }
      setLoaded(true);
    }
    load();
  }, []);
  const firstName = user?.firstName || user?.fullName?.split(" ")[0] || "";
  return (
    <div>
      <div style={{ marginBottom:"28px" }}>
        <h1 style={{ fontSize:"22px", fontWeight:"700", color:C.slate, margin:0 }}>{firstName ? `Welcome back, ${firstName} 👋` : "Dashboard"}</h1>
        <p style={{ color:C.mid, fontSize:"13px", margin:"4px 0 0" }}>Your job search at a glance</p>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:"16px", marginBottom:"28px" }}>
        {[
          { label:"Applications", value:stats.total, color:C.indigo, icon:"✦", sub:`${stats.applied} applied · ${stats.interview} interviews` },
          { label:"Projects in KB", value:stats.projects, color:"#7C3AED", icon:"◈", sub:"Embedded in ChromaDB" },
          { label:"Avg ATS Score", value:stats.avgAts?`${stats.avgAts}%`:"—", color:stats.avgAts>=70?C.green:stats.avgAts>=50?C.amber:C.mid, icon:"◎", sub:stats.avgAts?"Across all applications":"Apply to see your score" },
        ].map(({ label, value, color, icon, sub }) => (
          <div key={label} style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:"12px", padding:"20px", boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"8px" }}>
              <div style={{ fontSize:"28px", fontWeight:"800", color }}>{value}</div>
              <div style={{ fontSize:"20px", color:C.border }}>{icon}</div>
            </div>
            <div style={{ fontSize:"13px", fontWeight:"600", color:C.slate }}>{label}</div>
            <div style={{ fontSize:"11px", color:C.light, marginTop:"3px" }}>{sub}</div>
          </div>
        ))}
      </div>
      {loaded && stats.total === 0 && (
        <div style={{ background:C.indigoLight, border:"1px solid #C7D2FE", borderRadius:"12px", padding:"20px 24px", marginBottom:"24px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:"14px", fontWeight:"700", color:C.indigo, marginBottom:"4px" }}>Ready to apply?</div>
            <div style={{ fontSize:"12px", color:C.mid }}>Paste a job description and KarriereOS will tailor your CV in seconds.</div>
          </div>
          <a href="/apply" style={{ background:C.indigo, color:"#fff", padding:"9px 18px", borderRadius:"8px", fontSize:"13px", fontWeight:"700", textDecoration:"none", whiteSpace:"nowrap" }}>Start Applying →</a>
        </div>
      )}
      <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:"12px", overflow:"hidden", boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}>
        <div style={{ padding:"16px 20px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:"13px", fontWeight:"600", color:C.slate }}>Recent Applications</span>
          <a href="/tracker" style={{ fontSize:"12px", color:C.indigo, textDecoration:"none" }}>View all →</a>
        </div>
        {recent.length === 0 ? (
          <div style={{ padding:"40px", textAlign:"center", color:C.light }}>
            <div style={{ fontSize:"32px", marginBottom:"8px" }}>✦</div>
            <div style={{ fontSize:"13px" }}>No applications yet</div>
            <a href="/apply" style={{ fontSize:"12px", color:C.indigo, textDecoration:"none", display:"block", marginTop:"8px" }}>Start your first application →</a>
          </div>
        ) : recent.map((app) => (
          <div key={app.id} style={{ padding:"14px 20px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div>
              <div style={{ fontSize:"13px", fontWeight:"600", color:C.slate }}>{app.role || "—"}</div>
              <div style={{ fontSize:"12px", color:C.mid, marginTop:"2px" }}>{app.company || "—"}</div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
              {app.ats_score_before > 0 && <span style={{ fontSize:"11px", color:C.mid }}>{app.ats_score_before}% → {app.ats_score_after || "?"}%</span>}
              <span style={{ fontSize:"11px", fontWeight:"600", padding:"3px 10px", borderRadius:"20px", background:(STATUS_COLOR[app.status]||C.light)+"18", color:STATUS_COLOR[app.status]||C.light }}>
                {app.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
