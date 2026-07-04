"use client";
import { useState, useEffect } from "react";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
const C = { indigo:"#4F46E5",indigoDark:"#3730A3",indigoLight:"#EEF2FF",slate:"#0F172A",mid:"#64748B",light:"#94A3B8",bg:"#F8FAFC",white:"#fff",border:"#E2E8F0",green:"#10B981",greenLight:"#ECFDF5",amber:"#F59E0B" };
const FEATURES = [
  { icon:"◈", title:"RAG Knowledge Base", desc:"Your projects live in ChromaDB as vectors. Every match retrieves your actual experience — not generic AI text." },
  { icon:"✦", title:"ATS Score Before & After", desc:"See your match score before applying. After tailoring, watch it jump. Average improvement: 23 points." },
  { icon:"⊞", title:"CV + Cover Letter in One Click", desc:"Generate LaTeX-quality documents in English, German, French, or any language. Paste into Overleaf and compile." },
  { icon:"◎", title:"Auto-extract JD Meta", desc:"Paste a job description — company, role, and location are auto-filled. No manual typing." },
  { icon:"❋", title:"Multilingual Output", desc:"German Bewerbung format, French lettre de motivation, US single-page — all supported natively." },
  { icon:"⟳", title:"Application Tracker", desc:"Track every application from draft to offer. ATS scores, status, and generated documents all in one place." },
];
const COMPARE = [
  { feature:"ATS scoring",             careeros:true,  jobscan:true,  rezi:false, teal:false },
  { feature:"Before/after ATS delta",  careeros:true,  jobscan:false, rezi:false, teal:false },
  { feature:"RAG over your projects",  careeros:true,  jobscan:false, rezi:false, teal:false },
  { feature:"CV generation",           careeros:true,  jobscan:false, rezi:true,  teal:false },
  { feature:"Cover letter generation", careeros:true,  jobscan:false, rezi:true,  teal:false },
  { feature:"German Bewerbung format", careeros:true,  jobscan:false, rezi:false, teal:false },
  { feature:"Multilingual output",     careeros:true,  jobscan:false, rezi:false, teal:false },
  { feature:"Application tracker",     careeros:true,  jobscan:false, rezi:false, teal:true  },
  { feature:"Free tier available",     careeros:true,  jobscan:true,  rezi:true,  teal:true  },
];
export default function Home() {
  const [isMobile, setIsMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check(); window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return (
    <div style={{ fontFamily:"'Inter', -apple-system, sans-serif", background:C.bg, color:C.slate }}>
      {/* NAV */}
      <nav style={{ position:"sticky", top:0, zIndex:50, background:"rgba(248,250,252,0.95)", backdropFilter:"blur(8px)", borderBottom:`1px solid ${C.border}`, padding:`0 ${isMobile?"16px":"40px"}`, height:"56px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
          <div style={{ width:"26px", height:"26px", background:C.indigo, borderRadius:"6px", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:"13px", fontWeight:"800" }}>K</div>
          <span style={{ fontSize:"14px", fontWeight:"700", color:C.slate }}>KarriereOS</span>
        </div>
        {isMobile ? (
          <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
            <a href="/try" style={{ padding:"7px 14px", background:C.indigo, color:"#fff", borderRadius:"7px", fontSize:"12px", fontWeight:"700", textDecoration:"none" }}>Try Free</a>
            <SignUpButton mode="modal"><button style={{ padding:"7px 14px", background:C.white, color:C.slate, border:`1px solid ${C.border}`, borderRadius:"7px", fontSize:"12px", fontWeight:"600", cursor:"pointer" }}>Sign Up</button></SignUpButton>
          </div>
        ) : (
          <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
            <a href="#features" style={{ fontSize:"13px", color:C.mid, textDecoration:"none", padding:"6px 12px" }}>Features</a>
            <a href="#pricing" style={{ fontSize:"13px", color:C.mid, textDecoration:"none", padding:"6px 12px" }}>Pricing</a>
            <a href="#compare" style={{ fontSize:"13px", color:C.mid, textDecoration:"none", padding:"6px 12px" }}>Compare</a>
            <SignInButton mode="modal"><button style={{ fontSize:"13px", color:C.mid, background:"none", border:`1px solid ${C.border}`, borderRadius:"7px", padding:"6px 14px", cursor:"pointer", fontWeight:"500" }}>Sign In</button></SignInButton>
            <SignUpButton mode="modal"><button style={{ fontSize:"13px", color:"#fff", background:C.indigo, border:"none", borderRadius:"7px", padding:"7px 16px", cursor:"pointer", fontWeight:"600" }}>Get Started →</button></SignUpButton>
          </div>
        )}
      </nav>
      {/* HERO */}
      <section style={{ maxWidth:"860px", margin:"0 auto", padding:isMobile?"48px 20px 40px":"80px 40px 60px", textAlign:"center" }}>
        <div style={{ display:"inline-block", background:C.indigoLight, color:C.indigo, fontSize:"11px", fontWeight:"700", padding:"5px 14px", borderRadius:"20px", letterSpacing:"0.08em", marginBottom:"20px" }}>
          RAG-POWERED JOB APPLICATION PLATFORM
        </div>
        <h1 style={{ fontSize:isMobile?"32px":"52px", fontWeight:"800", color:C.slate, margin:"0 0 16px", lineHeight:"1.15", letterSpacing:isMobile?"-0.5px":"-1px" }}>
          Your CV, tailored to every <span style={{ color:C.indigo }}>job description.</span>
        </h1>
        <p style={{ fontSize:isMobile?"15px":"17px", color:C.mid, margin:"0 0 28px", lineHeight:"1.7", maxWidth:"600px", marginLeft:"auto", marginRight:"auto" }}>
          Paste a JD. KarriereOS retrieves your most relevant projects using RAG, scores your ATS match, and generates a tailored CV and cover letter — in any language.
        </p>
        <div style={{ display:"flex", gap:"10px", justifyContent:"center", flexWrap:"wrap" }}>
          <a href="/try" style={{ padding:isMobile?"11px 22px":"13px 28px", background:C.indigo, color:"#fff", borderRadius:"9px", fontSize:isMobile?"13px":"14px", fontWeight:"700", textDecoration:"none", display:"inline-block" }}>Try Free — No Signup →</a>
          <SignUpButton mode="modal"><button style={{ padding:isMobile?"11px 22px":"13px 28px", background:C.white, color:C.slate, border:`1px solid ${C.border}`, borderRadius:"9px", fontSize:isMobile?"13px":"14px", fontWeight:"600", cursor:"pointer" }}>Create Account</button></SignUpButton>
        </div>
        <p style={{ fontSize:"12px", color:C.light, marginTop:"12px" }}>No credit card required · 1 free application without signup</p>
      </section>
      {/* STATS */}
      <section style={{ borderTop:`1px solid ${C.border}`, borderBottom:`1px solid ${C.border}`, background:C.white }}>
        <div style={{ maxWidth:"860px", margin:"0 auto", padding:`${isMobile?"20px":"32px"} ${isMobile?"20px":"40px"}`, display:"grid", gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)", gap:isMobile?"12px":0 }}>
          {[{value:"+23pts",label:"Average ATS improvement"},{value:"9 languages",label:"Output languages supported"},{value:"< 60s",label:"From JD to tailored CV"}].map(({value,label},i)=>(
            <div key={i} style={{ textAlign:"center", padding:"8px 20px", borderRight:!isMobile&&i<2?`1px solid ${C.border}`:"none" }}>
              <div style={{ fontSize:isMobile?"22px":"28px", fontWeight:"800", color:C.indigo }}>{value}</div>
              <div style={{ fontSize:"12px", color:C.mid, marginTop:"4px" }}>{label}</div>
            </div>
          ))}
        </div>
      </section>
      {/* FEATURES */}
      <section id="features" style={{ maxWidth:"860px", margin:"0 auto", padding:isMobile?"48px 20px":"72px 40px" }}>
        <div style={{ textAlign:"center", marginBottom:"40px" }}>
          <div style={{ fontSize:"11px", fontWeight:"700", color:C.indigo, letterSpacing:"0.1em", marginBottom:"10px" }}>FEATURES</div>
          <h2 style={{ fontSize:isMobile?"24px":"32px", fontWeight:"800", color:C.slate, margin:0, letterSpacing:"-0.5px" }}>Everything you need to apply smarter</h2>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)", gap:"14px" }}>
          {FEATURES.map(({icon,title,desc})=>(
            <div key={title} style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:"12px", padding:"20px" }}>
              <div style={{ fontSize:"20px", marginBottom:"10px", color:C.indigo }}>{icon}</div>
              <div style={{ fontSize:"13px", fontWeight:"700", color:C.slate, marginBottom:"6px" }}>{title}</div>
              <div style={{ fontSize:"12px", color:C.mid, lineHeight:"1.6" }}>{desc}</div>
            </div>
          ))}
        </div>
      </section>
      {/* HOW IT WORKS */}
      <section style={{ background:C.white, borderTop:`1px solid ${C.border}`, borderBottom:`1px solid ${C.border}` }}>
        <div style={{ maxWidth:"860px", margin:"0 auto", padding:isMobile?"48px 20px":"72px 40px" }}>
          <div style={{ textAlign:"center", marginBottom:"40px" }}>
            <div style={{ fontSize:"11px", fontWeight:"700", color:C.indigo, letterSpacing:"0.1em", marginBottom:"10px" }}>HOW IT WORKS</div>
            <h2 style={{ fontSize:isMobile?"24px":"32px", fontWeight:"800", color:C.slate, margin:0, letterSpacing:"-0.5px" }}>From JD to application in 4 steps</h2>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)", gap:"14px" }}>
            {[{step:"01",title:"Paste JD",desc:"Company, role, and location auto-extracted instantly."},{step:"02",title:"RAG Match",desc:"Your projects are ranked by semantic relevance to the JD."},{step:"03",title:"ATS Score",desc:"See your match before and after tailoring. Watch the delta."},{step:"04",title:"Generate",desc:"CV and cover letter in your chosen language. Ready to send."}].map(({step,title,desc})=>(
              <div key={step} style={{ textAlign:"center", padding:"8px" }}>
                <div style={{ width:"34px", height:"34px", background:C.indigoLight, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px", fontSize:"12px", fontWeight:"800", color:C.indigo }}>{step}</div>
                <div style={{ fontSize:"13px", fontWeight:"700", color:C.slate, marginBottom:"5px" }}>{title}</div>
                <div style={{ fontSize:"12px", color:C.mid, lineHeight:"1.6" }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* PRICING */}
      <section id="pricing" style={{ maxWidth:"860px", margin:"0 auto", padding:isMobile?"48px 20px":"72px 40px" }}>
        <div style={{ textAlign:"center", marginBottom:"40px" }}>
          <div style={{ fontSize:"11px", fontWeight:"700", color:C.indigo, letterSpacing:"0.1em", marginBottom:"10px" }}>PRICING</div>
          <h2 style={{ fontSize:isMobile?"24px":"32px", fontWeight:"800", color:C.slate, margin:"0 0 12px", letterSpacing:"-0.5px" }}>Simple, transparent pricing</h2>
          <p style={{ fontSize:"14px", color:C.mid, margin:0 }}>Start free. Upgrade when you're ready.</p>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)", gap:"14px" }}>
          {[
            { name:"Free", price:"€0", period:"forever", desc:"Try it once, no account needed", features:["1 free application (no signup)","JD matching","ATS score","CV generation","English output only"], cta:"Try Free →", href:"/try", style:{bg:C.white,color:C.slate,btn:C.indigoLight,btnColor:C.indigo} },
            { name:"Pro", price:"€9", period:"per month", desc:"For active job seekers", features:["Unlimited applications","Unlimited CV + cover letters","ATS before & after scoring","All output languages","Application tracker"], cta:"Get Started →", href:null, style:{bg:C.indigo,color:"#fff",btn:"#fff",btnColor:C.indigo}, popular:true },
            { name:"Premium", price:"€19", period:"per month", desc:"For power users", features:["Everything in Pro","CV PDF upload → auto onboarding","Interview prep mode","Priority support"], cta:"Coming Soon", href:null, soon:true, style:{bg:C.white,color:C.slate,btn:"#F1F5F9",btnColor:C.light} },
          ].map(({name,price,period,desc,features,cta,href,soon,style,popular}:any)=>(
            <div key={name} style={{ background:style.bg, border:`1px solid ${popular?C.indigo:C.border}`, borderRadius:"14px", padding:"24px 20px", position:"relative", boxShadow:popular?"0 8px 24px rgba(79,70,229,0.2)":"0 1px 3px rgba(0,0,0,0.04)" }}>
              {popular&&<div style={{ position:"absolute", top:"-12px", left:"50%", transform:"translateX(-50%)", background:C.amber, color:"#fff", fontSize:"10px", fontWeight:"800", padding:"4px 12px", borderRadius:"20px" }}>MOST POPULAR</div>}
              <div style={{ fontSize:"12px", fontWeight:"700", color:popular?"rgba(255,255,255,0.7)":C.mid, marginBottom:"6px" }}>{name}</div>
              <div style={{ fontSize:"32px", fontWeight:"800", color:style.color, marginBottom:"2px" }}>{price}</div>
              <div style={{ fontSize:"12px", color:popular?"rgba(255,255,255,0.6)":C.light, marginBottom:"6px" }}>{period}</div>
              <div style={{ fontSize:"12px", color:popular?"rgba(255,255,255,0.7)":C.mid, marginBottom:"16px" }}>{desc}</div>
              <div style={{ marginBottom:"20px" }}>
                {features.map((f:string)=>(
                  <div key={f} style={{ display:"flex", alignItems:"flex-start", gap:"8px", marginBottom:"6px" }}>
                    <span style={{ color:popular?"#a5f3c5":C.green, fontSize:"12px" }}>✓</span>
                    <span style={{ fontSize:"12px", color:popular?"rgba(255,255,255,0.85)":C.mid, lineHeight:"1.5" }}>{f}</span>
                  </div>
                ))}
              </div>
              {href?<a href={href} style={{ display:"block", textAlign:"center", padding:"9px", background:style.btn, color:style.btnColor, borderRadius:"8px", fontSize:"13px", fontWeight:"700", textDecoration:"none" }}>{cta}</a>
              :soon?<div style={{ textAlign:"center", padding:"9px", background:style.btn, color:style.btnColor, borderRadius:"8px", fontSize:"13px", fontWeight:"600" }}>{cta}</div>
              :<SignUpButton mode="modal"><button style={{ width:"100%", padding:"9px", background:style.btn, color:style.btnColor, border:"none", borderRadius:"8px", fontSize:"13px", fontWeight:"700", cursor:"pointer" }}>{cta}</button></SignUpButton>}
            </div>
          ))}
        </div>
      </section>
      {/* COMPARE */}
      <section id="compare" style={{ background:C.white, borderTop:`1px solid ${C.border}` }}>
        <div style={{ maxWidth:"860px", margin:"0 auto", padding:isMobile?"48px 20px":"72px 40px" }}>
          <div style={{ textAlign:"center", marginBottom:"36px" }}>
            <div style={{ fontSize:"11px", fontWeight:"700", color:C.indigo, letterSpacing:"0.1em", marginBottom:"10px" }}>COMPARE</div>
            <h2 style={{ fontSize:isMobile?"24px":"32px", fontWeight:"800", color:C.slate, margin:0, letterSpacing:"-0.5px" }}>How we stack up</h2>
          </div>
          <div style={{ border:`1px solid ${C.border}`, borderRadius:"12px", overflow:isMobile?"auto":"hidden" }}>
            <div style={{ display:"grid", gridTemplateColumns:isMobile?"2fr 1fr 1fr 1fr 1fr":"2fr 1fr 1fr 1fr 1fr", background:C.bg, padding:"10px 16px", borderBottom:`1px solid ${C.border}`, minWidth:isMobile?"500px":"auto" }}>
              {["Feature","KarriereOS","Jobscan","Rezi","Teal"].map((h,i)=>(
                <div key={h} style={{ fontSize:"10px", fontWeight:"700", color:i===1?C.indigo:C.light, textTransform:"uppercase", letterSpacing:"0.05em", textAlign:i>0?"center":"left" }}>{h}</div>
              ))}
            </div>
            <div style={{ minWidth:isMobile?"500px":"auto" }}>
              {COMPARE.map(({feature,careeros,jobscan,rezi,teal},i)=>(
                <div key={feature} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr", padding:"11px 16px", borderBottom:i<COMPARE.length-1?`1px solid ${C.border}`:"none", background:i%2===0?C.white:C.bg }}>
                  <div style={{ fontSize:"12px", color:C.mid }}>{feature}</div>
                  {[careeros,jobscan,rezi,teal].map((val,j)=>(
                    <div key={j} style={{ textAlign:"center", fontSize:"13px" }}>{val?<span style={{ color:j===0?C.green:C.light }}>✓</span>:<span style={{ color:"#E2E8F0" }}>—</span>}</div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      {/* CTA */}
      <section style={{ maxWidth:"860px", margin:"0 auto", padding:isMobile?"48px 20px":"72px 40px", textAlign:"center" }}>
        <h2 style={{ fontSize:isMobile?"24px":"36px", fontWeight:"800", color:C.slate, margin:"0 0 24px", letterSpacing:"-0.5px" }}>Ready to apply smarter?</h2>
        <div style={{ display:"flex", gap:"10px", justifyContent:"center", flexWrap:"wrap" }}>
          <a href="/try" style={{ padding:isMobile?"11px 24px":"13px 32px", background:C.indigo, color:"#fff", borderRadius:"9px", fontSize:isMobile?"13px":"14px", fontWeight:"700", textDecoration:"none" }}>Try Free Now →</a>
          <SignUpButton mode="modal"><button style={{ padding:isMobile?"11px 24px":"13px 32px", background:C.white, color:C.slate, border:`1px solid ${C.border}`, borderRadius:"9px", fontSize:isMobile?"13px":"14px", fontWeight:"600", cursor:"pointer" }}>Create Account</button></SignUpButton>
        </div>
      </section>
      {/* FOOTER */}
      <footer style={{ borderTop:`1px solid ${C.border}`, padding:`20px ${isMobile?"16px":"40px"}`, display:"flex", flexDirection:isMobile?"column":"row", justifyContent:"space-between", alignItems:"center", gap:"8px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
          <div style={{ width:"20px", height:"20px", background:C.indigo, borderRadius:"5px", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:"10px", fontWeight:"800" }}>K</div>
          <span style={{ fontSize:"13px", fontWeight:"600", color:C.slate }}>KarriereOS</span>
        </div>
        <div style={{ fontSize:"12px", color:C.light }}>© 2026 KarriereOS. All rights reserved.</div>
      </footer>
    </div>
  );
}