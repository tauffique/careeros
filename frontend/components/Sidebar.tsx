"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

const NAV = [
  { href: "/dashboard", label: "Dashboard",    icon: "⊞" },
  { href: "/apply",     label: "Apply",         icon: "✦" },
  { href: "/projects",  label: "Knowledge Base",icon: "◈" },
  { href: "/tracker",   label: "Tracker",       icon: "◎" },
];

export default function Sidebar() {
  const path = usePathname();

  return (
    <aside style={{
      width: "240px", minHeight: "100vh", background: "#fff",
      borderRight: "1px solid #E2E8F0", display: "flex",
      flexDirection: "column", padding: "0", flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid #F1F5F9" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "32px", height: "32px", background: "#4F46E5",
            borderRadius: "8px", display: "flex", alignItems: "center",
            justifyContent: "center", color: "#fff", fontSize: "16px", fontWeight: "bold",
          }}>C</div>
          <div>
            <div style={{ fontSize: "15px", fontWeight: "700", color: "#0F172A", letterSpacing: "-0.3px" }}>CareerOS</div>
            <div style={{ fontSize: "10px", color: "#94A3B8", letterSpacing: "0.05em" }}>AI JOB PLATFORM</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: "12px 12px", flex: 1 }}>
        <div style={{ fontSize: "10px", color: "#94A3B8", letterSpacing: "0.1em", padding: "8px 8px 4px", fontWeight: "600" }}>MENU</div>
        {NAV.map(({ href, label, icon }) => {
          const active = path === href || path.startsWith(href + "/");
          return (
            <Link key={href} href={href} style={{ textDecoration: "none" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "9px 10px", borderRadius: "8px", marginBottom: "2px",
                background: active ? "#EEF2FF" : "transparent",
                color: active ? "#4F46E5" : "#64748B",
                fontSize: "13.5px", fontWeight: active ? "600" : "500",
                transition: "all 0.15s", cursor: "pointer",
              }}>
                <span style={{ fontSize: "15px", opacity: active ? 1 : 0.6 }}>{icon}</span>
                {label}
                {active && <div style={{ marginLeft: "auto", width: "5px", height: "5px", borderRadius: "50%", background: "#4F46E5" }} />}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div style={{ padding: "16px 20px", borderTop: "1px solid #F1F5F9", display: "flex", alignItems: "center", gap: "10px" }}>
        <UserButton afterSignOutUrl="/" />
        <div style={{ fontSize: "12px", color: "#64748B" }}>Account</div>
      </div>
    </aside>
  );
}
