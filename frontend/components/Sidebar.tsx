"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { useState, useEffect } from "react";

const NAV = [
  { href: "/dashboard", label: "Dashboard",     icon: "⊞" },
  { href: "/apply",     label: "Apply",          icon: "✦" },
  { href: "/projects",  label: "Knowledge Base", icon: "◈" },
  { href: "/tracker",   label: "Tracker",        icon: "◎" },
];

const C = { indigo:"#4F46E5", indigoLight:"#EEF2FF", slate:"#0F172A", mid:"#64748B", light:"#94A3B8", border:"#E2E8F0", white:"#fff", bg:"#F8FAFC" };

export default function Sidebar() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Close menu on route change
  useEffect(() => { setOpen(false); }, [path]);

  // ── MOBILE ────────────────────────────────────────────────────────────────
  if (isMobile) return (
    <>
      {/* Mobile top bar */}
      <div style={{ position:"fixed", top:0, left:0, right:0, height:"56px", background:C.white, borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 16px", zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
          <div style={{ width:"28px", height:"28px", background:C.indigo, borderRadius:"7px", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:"14px", fontWeight:"bold" }}>K</div>
          <div style={{ fontSize:"14px", fontWeight:"700", color:C.slate }}>KarriereOS</div>
        </div>
        <button onClick={() => setOpen(!open)} style={{ background:"none", border:"none", cursor:"pointer", padding:"8px", fontSize:"20px", color:C.mid }}>
          {open ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile drawer overlay */}
      {open && (
        <div onClick={() => setOpen(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.3)", zIndex:101 }}>
          <div onClick={e => e.stopPropagation()} style={{ position:"absolute", top:0, left:0, width:"260px", height:"100%", background:C.white, display:"flex", flexDirection:"column", paddingTop:"16px" }}>
            <div style={{ padding:"16px 20px 20px", borderBottom:`1px solid ${C.border}` }}>
              <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                <div style={{ width:"32px", height:"32px", background:C.indigo, borderRadius:"8px", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:"16px", fontWeight:"bold" }}>K</div>
                <div>
                  <div style={{ fontSize:"15px", fontWeight:"700", color:C.slate }}>KarriereOS</div>
                  <div style={{ fontSize:"10px", color:C.light, letterSpacing:"0.05em" }}>AI CAREER PLATFORM</div>
                </div>
              </div>
            </div>
            <nav style={{ padding:"12px", flex:1 }}>
              <div style={{ fontSize:"10px", color:C.light, letterSpacing:"0.1em", padding:"8px 8px 4px", fontWeight:"600" }}>MENU</div>
              {NAV.map(({ href, label, icon }) => {
                const active = path === href || path.startsWith(href + "/");
                return (
                  <Link key={href} href={href} style={{ textDecoration:"none" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:"10px", padding:"12px 10px", borderRadius:"8px", marginBottom:"2px", background:active?C.indigoLight:"transparent", color:active?C.indigo:C.mid, fontSize:"14px", fontWeight:active?"600":"500" }}>
                      <span style={{ fontSize:"16px" }}>{icon}</span>
                      {label}
                      {active && <div style={{ marginLeft:"auto", width:"5px", height:"5px", borderRadius:"50%", background:C.indigo }} />}
                    </div>
                  </Link>
                );
              })}
            </nav>
            <div style={{ padding:"16px 20px", borderTop:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:"10px" }}>
              <UserButton afterSignOutUrl="/" />
              <div style={{ fontSize:"12px", color:C.mid }}>Account</div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom navigation bar */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, height:"60px", background:C.white, borderTop:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"space-around", zIndex:100, paddingBottom:"env(safe-area-inset-bottom)" }}>
        {NAV.map(({ href, label, icon }) => {
          const active = path === href || path.startsWith(href + "/");
          return (
            <Link key={href} href={href} style={{ textDecoration:"none", display:"flex", flexDirection:"column", alignItems:"center", gap:"2px", padding:"8px 12px", borderRadius:"8px", background:active?C.indigoLight:"transparent" }}>
              <span style={{ fontSize:"18px", opacity:active?1:0.5 }}>{icon}</span>
              <span style={{ fontSize:"9px", color:active?C.indigo:C.mid, fontWeight:active?"700":"500" }}>{label}</span>
            </Link>
          );
        })}
      </div>
    </>
  );

  // ── DESKTOP ───────────────────────────────────────────────────────────────
  return (
    <aside style={{ width:"240px", minHeight:"100vh", background:C.white, borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column", flexShrink:0 }}>
      <div style={{ padding:"24px 20px 20px", borderBottom:`1px solid #F1F5F9` }}>
        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          <div style={{ width:"32px", height:"32px", background:C.indigo, borderRadius:"8px", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:"16px", fontWeight:"bold" }}>K</div>
          <div>
            <div style={{ fontSize:"15px", fontWeight:"700", color:C.slate, letterSpacing:"-0.3px" }}>KarriereOS</div>
            <div style={{ fontSize:"10px", color:C.light, letterSpacing:"0.05em" }}>AI CAREER PLATFORM</div>
          </div>
        </div>
      </div>
      <nav style={{ padding:"12px", flex:1 }}>
        <div style={{ fontSize:"10px", color:C.light, letterSpacing:"0.1em", padding:"8px 8px 4px", fontWeight:"600" }}>MENU</div>
        {NAV.map(({ href, label, icon }) => {
          const active = path === href || path.startsWith(href + "/");
          return (
            <Link key={href} href={href} style={{ textDecoration:"none" }}>
              <div style={{ display:"flex", alignItems:"center", gap:"10px", padding:"9px 10px", borderRadius:"8px", marginBottom:"2px", background:active?C.indigoLight:"transparent", color:active?C.indigo:C.mid, fontSize:"13.5px", fontWeight:active?"600":"500", transition:"all 0.15s", cursor:"pointer" }}>
                <span style={{ fontSize:"15px", opacity:active?1:0.6 }}>{icon}</span>
                {label}
                {active && <div style={{ marginLeft:"auto", width:"5px", height:"5px", borderRadius:"50%", background:C.indigo }} />}
              </div>
            </Link>
          );
        })}
      </nav>
      <div style={{ padding:"16px 20px", borderTop:`1px solid #F1F5F9`, display:"flex", alignItems:"center", gap:"10px" }}>
        <UserButton afterSignOutUrl="/" />
        <div style={{ fontSize:"12px", color:C.mid }}>Account</div>
      </div>
    </aside>
  );
}