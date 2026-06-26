"use client";

import { useState } from "react";
import { SignInButton, SignUpButton } from "@clerk/nextjs";

const C = {
  indigo: "#4F46E5", indigoDark: "#3730A3", indigoLight: "#EEF2FF",
  slate: "#0F172A", mid: "#64748B", light: "#94A3B8",
  bg: "#F8FAFC", white: "#fff", border: "#E2E8F0",
  green: "#10B981", greenLight: "#ECFDF5",
  amber: "#F59E0B",
};

const FEATURES = [
  { icon: "◈", title: "RAG Knowledge Base", desc: "Your projects live in ChromaDB as vectors. Every match retrieves your actual experience — not generic AI text." },
  { icon: "✦", title: "ATS Score Before & After", desc: "See your match score before applying. After tailoring, watch it jump. Average improvement: 23 points." },
  { icon: "⊞", title: "CV + Cover Letter in One Click", desc: "Generate LaTeX-quality documents in English, German, French, or any language. Paste into Overleaf and compile." },
  { icon: "◎", title: "Auto-extract JD Meta", desc: "Paste a job description — company, role, and location are auto-filled. No manual typing." },
  { icon: "❋", title: "Multilingual Output", desc: "German Bewerbung format, French lettre de motivation, US single-page — all supported natively." },
  { icon: "⟳", title: "Application Tracker", desc: "Track every application from draft to offer. ATS scores, status, and generated documents all in one place." },
];

const PRICING = [
  {
    name: "Free",
    price: "€0",
    period: "forever",
    desc: "Try it once, no account needed",
    features: ["1 free application (no signup)", "JD matching", "ATS score", "CV generation", "English output only"],
    cta: "Try Free →",
    free: true,
    highlight: false,
  },
  {
    name: "Pro",
    price: "€9",
    period: "per month",
    desc: "For active job seekers",
    features: ["Unlimited applications", "Unlimited CV + cover letters", "ATS before & after scoring", "All output languages", "Application tracker", "PDF export (coming soon)"],
    cta: "Get Started →",
    free: false,
    highlight: true,
  },
  {
    name: "Premium",
    price: "€19",
    period: "per month",
    desc: "For power users",
    features: ["Everything in Pro", "CV PDF upload → auto onboarding", "Bullet regeneration with keywords", "Interview prep mode", "Priority support"],
    cta: "Coming Soon",
    free: false,
    highlight: false,
    soon: true,
  },
];

const COMPARE = [
  { feature: "ATS scoring",               careeros: true,  jobscan: true,  rezi: false, teal: false },
  { feature: "Before/after ATS delta",    careeros: true,  jobscan: false, rezi: false, teal: false },
  { feature: "RAG over your projects",    careeros: true,  jobscan: false, rezi: false, teal: false },
  { feature: "CV generation",             careeros: true,  jobscan: false, rezi: true,  teal: false },
  { feature: "Cover letter generation",   careeros: true,  jobscan: false, rezi: true,  teal: false },
  { feature: "German Bewerbung format",   careeros: true,  jobscan: false, rezi: false, teal: false },
  { feature: "Multilingual output",       careeros: true,  jobscan: false, rezi: false, teal: false },
  { feature: "Application tracker",       careeros: true,  jobscan: false, rezi: false, teal: true  },
  { feature: "Free tier available",       careeros: true,  jobscan: true,  rezi: true,  teal: true  },
];

export default function Home() {
  const [annual, setAnnual] = useState(false);

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", background: C.bg, color: C.slate }}>

      {/* ── NAV ── */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(248,250,252,0.9)", backdropFilter: "blur(8px)", borderBottom: `1px solid ${C.border}`, padding: "0 40px", height: "60px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "28px", height: "28px", background: C.indigo, borderRadius: "7px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "14px", fontWeight: "800" }}>C</div>
          <span style={{ fontSize: "15px", fontWeight: "700", color: C.slate }}>KarriereOS</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <a href="#features" style={{ fontSize: "13px", color: C.mid, textDecoration: "none", padding: "6px 12px" }}>Features</a>
          <a href="#pricing" style={{ fontSize: "13px", color: C.mid, textDecoration: "none", padding: "6px 12px" }}>Pricing</a>
          <a href="#compare" style={{ fontSize: "13px", color: C.mid, textDecoration: "none", padding: "6px 12px" }}>Compare</a>
          <SignInButton mode="modal">
            <button style={{ fontSize: "13px", color: C.mid, background: "none", border: `1px solid ${C.border}`, borderRadius: "7px", padding: "6px 14px", cursor: "pointer", fontWeight: "500" }}>Sign In</button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button style={{ fontSize: "13px", color: "#fff", background: C.indigo, border: "none", borderRadius: "7px", padding: "7px 16px", cursor: "pointer", fontWeight: "600" }}>Get Started →</button>
          </SignUpButton>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ maxWidth: "860px", margin: "0 auto", padding: "80px 40px 60px", textAlign: "center" }}>
        <div style={{ display: "inline-block", background: C.indigoLight, color: C.indigo, fontSize: "11px", fontWeight: "700", padding: "5px 14px", borderRadius: "20px", letterSpacing: "0.08em", marginBottom: "24px" }}>
          RAG-POWERED JOB APPLICATION PLATFORM
        </div>
        <h1 style={{ fontSize: "52px", fontWeight: "800", color: C.slate, margin: "0 0 20px", lineHeight: "1.15", letterSpacing: "-1px" }}>
          Your CV, tailored to every<br />
          <span style={{ color: C.indigo }}>job description.</span>
        </h1>
        <p style={{ fontSize: "17px", color: C.mid, margin: "0 0 36px", lineHeight: "1.7", maxWidth: "600px", marginLeft: "auto", marginRight: "auto" }}>
          Paste a JD. KarriereOS retrieves your most relevant projects using RAG, scores your ATS match, and generates a tailored CV and cover letter — in any language.
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <a href="/try" style={{ padding: "13px 28px", background: C.indigo, color: "#fff", borderRadius: "9px", fontSize: "14px", fontWeight: "700", textDecoration: "none", display: "inline-block" }}>
            Try Free — No Signup →
          </a>
          <SignUpButton mode="modal">
            <button style={{ padding: "13px 28px", background: C.white, color: C.slate, border: `1px solid ${C.border}`, borderRadius: "9px", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>
              Create Account
            </button>
          </SignUpButton>
        </div>
        <p style={{ fontSize: "12px", color: C.light, marginTop: "16px" }}> </p>
      </section>

      {/* ── STATS ── */}
      <section style={{ borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, background: C.white }}>
        <div style={{ maxWidth: "860px", margin: "0 auto", padding: "32px 40px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0" }}>
          {[
            { value: "+23pts", label: "Average ATS improvement" },
            { value: "9 languages", label: "Output languages supported" },
            { value: "< 60s", label: "From JD to tailored CV" },
          ].map(({ value, label }, i) => (
            <div key={i} style={{ textAlign: "center", padding: "8px 20px", borderRight: i < 2 ? `1px solid ${C.border}` : "none" }}>
              <div style={{ fontSize: "28px", fontWeight: "800", color: C.indigo }}>{value}</div>
              <div style={{ fontSize: "12px", color: C.mid, marginTop: "4px" }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{ maxWidth: "860px", margin: "0 auto", padding: "72px 40px" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: C.indigo, letterSpacing: "0.1em", marginBottom: "12px" }}>FEATURES</div>
          <h2 style={{ fontSize: "32px", fontWeight: "800", color: C.slate, margin: 0, letterSpacing: "-0.5px" }}>Everything you need to apply smarter</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
          {FEATURES.map(({ icon, title, desc }) => (
            <div key={title} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div style={{ fontSize: "22px", marginBottom: "12px", color: C.indigo }}>{icon}</div>
              <div style={{ fontSize: "13px", fontWeight: "700", color: C.slate, marginBottom: "8px" }}>{title}</div>
              <div style={{ fontSize: "12px", color: C.mid, lineHeight: "1.6" }}>{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ background: C.white, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: "860px", margin: "0 auto", padding: "72px 40px" }}>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <div style={{ fontSize: "11px", fontWeight: "700", color: C.indigo, letterSpacing: "0.1em", marginBottom: "12px" }}>HOW IT WORKS</div>
            <h2 style={{ fontSize: "32px", fontWeight: "800", color: C.slate, margin: 0, letterSpacing: "-0.5px" }}>From JD to application in 4 steps</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
            {[
              { step: "01", title: "Paste JD", desc: "Company, role, and location auto-extracted instantly." },
              { step: "02", title: "RAG Match", desc: "Your projects are ranked by semantic relevance to the JD." },
              { step: "03", title: "ATS Score", desc: "See your match before and after tailoring. Watch the delta." },
              { step: "04", title: "Generate", desc: "CV and cover letter in your chosen language. Ready to send." },
            ].map(({ step, title, desc }) => (
              <div key={step} style={{ textAlign: "center", padding: "8px" }}>
                <div style={{ width: "36px", height: "36px", background: C.indigoLight, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", fontSize: "12px", fontWeight: "800", color: C.indigo }}>{step}</div>
                <div style={{ fontSize: "13px", fontWeight: "700", color: C.slate, marginBottom: "6px" }}>{title}</div>
                <div style={{ fontSize: "12px", color: C.mid, lineHeight: "1.6" }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── 
      <section id="pricing" style={{ maxWidth: "860px", margin: "0 auto", padding: "72px 40px" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: C.indigo, letterSpacing: "0.1em", marginBottom: "12px" }}>PRICING</div>
          <h2 style={{ fontSize: "32px", fontWeight: "800", color: C.slate, margin: "0 0 16px", letterSpacing: "-0.5px" }}>Simple, transparent pricing</h2>
          <p style={{ fontSize: "14px", color: C.mid, margin: 0 }}>Start free. Upgrade when you're ready.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
          {PRICING.map(({ name, price, period, desc, features, cta, free, highlight, soon }) => (
            <div key={name} style={{ background: highlight ? C.indigo : C.white, border: `1px solid ${highlight ? C.indigo : C.border}`, borderRadius: "14px", padding: "28px 24px", boxShadow: highlight ? "0 8px 24px rgba(79,70,229,0.2)" : "0 1px 3px rgba(0,0,0,0.04)", position: "relative" }}>
              {highlight && <div style={{ position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)", background: C.amber, color: "#fff", fontSize: "10px", fontWeight: "800", padding: "4px 12px", borderRadius: "20px", letterSpacing: "0.05em" }}>MOST POPULAR</div>}
              <div style={{ fontSize: "13px", fontWeight: "700", color: highlight ? "rgba(255,255,255,0.7)" : C.mid, marginBottom: "8px" }}>{name}</div>
              <div style={{ fontSize: "36px", fontWeight: "800", color: highlight ? "#fff" : C.slate, marginBottom: "2px" }}>{price}</div>
              <div style={{ fontSize: "12px", color: highlight ? "rgba(255,255,255,0.6)" : C.light, marginBottom: "8px" }}>{period}</div>
              <div style={{ fontSize: "12px", color: highlight ? "rgba(255,255,255,0.7)" : C.mid, marginBottom: "20px" }}>{desc}</div>
              <div style={{ marginBottom: "24px" }}>
                {features.map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "8px" }}>
                    <span style={{ color: highlight ? "#a5f3c5" : C.green, fontSize: "12px", marginTop: "1px" }}>✓</span>
                    <span style={{ fontSize: "12px", color: highlight ? "rgba(255,255,255,0.85)" : C.mid, lineHeight: "1.5" }}>{f}</span>
                  </div>
                ))}
              </div>
              {free ? (
                <a href="/try" style={{ display: "block", textAlign: "center", padding: "10px", background: C.indigoLight, color: C.indigo, borderRadius: "8px", fontSize: "13px", fontWeight: "700", textDecoration: "none" }}>{cta}</a>
              ) : soon ? (
                <div style={{ textAlign: "center", padding: "10px", background: "rgba(0,0,0,0.06)", color: C.light, borderRadius: "8px", fontSize: "13px", fontWeight: "600" }}>{cta}</div>
              ) : (
                <SignUpButton mode="modal">
                  <button style={{ width: "100%", padding: "10px", background: "#fff", color: C.indigo, border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: "700", cursor: "pointer" }}>{cta}</button>
                </SignUpButton>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── COMPARE ── */}
      <section id="compare" style={{ background: C.white, borderTop: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: "860px", margin: "0 auto", padding: "72px 40px" }}>
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <div style={{ fontSize: "11px", fontWeight: "700", color: C.indigo, letterSpacing: "0.1em", marginBottom: "12px" }}>COMPARE</div>
            <h2 style={{ fontSize: "32px", fontWeight: "800", color: C.slate, margin: 0, letterSpacing: "-0.5px" }}>How we stack up</h2>
          </div>
          <div style={{ border: `1px solid ${C.border}`, borderRadius: "12px", overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", background: C.bg, padding: "12px 20px", borderBottom: `1px solid ${C.border}` }}>
              {["Feature", "KarriereOS", "Jobscan", "Rezi", "Teal"].map((h, i) => (
                <div key={h} style={{ fontSize: "11px", fontWeight: "700", color: i === 1 ? C.indigo : C.light, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: i > 0 ? "center" : "left" }}>{h}</div>
              ))}
            </div>
            {COMPARE.map(({ feature, careeros, jobscan, rezi, teal }, i) => (
              <div key={feature} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", padding: "12px 20px", borderBottom: i < COMPARE.length - 1 ? `1px solid ${C.border}` : "none", background: i % 2 === 0 ? C.white : C.bg }}>
                <div style={{ fontSize: "13px", color: C.mid }}>{feature}</div>
                {[careeros, jobscan, rezi, teal].map((val, j) => (
                  <div key={j} style={{ textAlign: "center", fontSize: "14px" }}>{val ? <span style={{ color: j === 0 ? C.green : C.light }}>✓</span> : <span style={{ color: "#E2E8F0" }}>—</span>}</div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ maxWidth: "860px", margin: "0 auto", padding: "72px 40px", textAlign: "center" }}>
        <h2 style={{ fontSize: "36px", fontWeight: "800", color: C.slate, margin: "0 0 16px", letterSpacing: "-0.5px" }}>Ready to apply smarter?</h2>
        <p style={{ fontSize: "15px", color: C.mid, margin: "0 0 32px" }}>Try one application free — no account, no credit card.</p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <a href="/try" style={{ padding: "13px 32px", background: C.indigo, color: "#fff", borderRadius: "9px", fontSize: "14px", fontWeight: "700", textDecoration: "none" }}>Try Free Now →</a>
          <SignUpButton mode="modal">
            <button style={{ padding: "13px 32px", background: C.white, color: C.slate, border: `1px solid ${C.border}`, borderRadius: "9px", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>Create Account</button>
          </SignUpButton>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: `1px solid ${C.border}`, padding: "24px 40px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "22px", height: "22px", background: C.indigo, borderRadius: "5px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "11px", fontWeight: "800" }}>C</div>
          <span style={{ fontSize: "13px", fontWeight: "600", color: C.slate }}>KarriereOS</span>
        </div>
        <div style={{ fontSize: "12px", color: C.light }}>© 2026 KarriereOS. All Right Reserved.</div>
      </footer>
    </div>
  );
}