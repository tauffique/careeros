"use client";
import { useState, useRef, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

const C = { indigo:"#4F46E5",indigoLight:"#EEF2FF",slate:"#0F172A",mid:"#64748B",light:"#94A3B8",bg:"#F8FAFC",white:"#fff",border:"#E2E8F0",green:"#10B981",greenLight:"#ECFDF5",red:"#EF4444",redLight:"#FEF2F2" };

export default function OnboardingPage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleCVUpload(file: File) {
    if (!file || file.type !== "application/pdf") { setError("Please upload a PDF"); return; }
    setUploading(true); setUploadMsg("Reading your CV..."); setError("");
    try {
      const base64 = await toBase64(file);
      setUploadMsg("Extracting with AI... (15-20 seconds)");
      const res = await fetch(`${BACKEND}/try/extract-cv`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdf_base64: base64 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Extraction failed");
      setUploadMsg("Saving your profile...");
      const token = await getToken();

      // Import profile + education + certs
      await fetch(`${BACKEND}/users/me/import-cv`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      // Save projects in parallel
      const existingRes = await fetch(`${BACKEND}/projects/`, { headers: { Authorization: `Bearer ${token}` } });
      const existing = existingRes.ok ? await existingRes.json() : [];
      await Promise.all((Array.isArray(existing) ? existing : []).map((p: any) =>
        fetch(`${BACKEND}/projects/${p.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
      ));
      await Promise.all((data.projects || []).map((p: any) =>
        fetch(`${BACKEND}/projects/`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(p) })
      ));

      setDone(true);
      setUploadMsg("");
      setTimeout(() => router.push("/apply"), 2000);
    } catch (e: any) { setError(e.message); }
    finally { setUploading(false); }
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
  }, []);

  if (done) return (
    <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
      <div style={{ fontSize: "48px", marginBottom: "16px" }}>✅</div>
      <h2 style={{ fontSize: "22px", fontWeight: "700", color: C.slate, margin: "0 0 8px" }}>You're all set!</h2>
      <p style={{ color: C.mid, fontSize: "14px" }}>Taking you to Apply...</p>
    </div>
  );

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "40px 20px" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <div style={{ fontSize: "40px", marginBottom: "16px" }}>👋</div>
        <h1 style={{ fontSize: "26px", fontWeight: "800", color: C.slate, margin: "0 0 10px" }}>Welcome to KarriereOS</h1>
        <p style={{ color: C.mid, fontSize: "15px", lineHeight: "1.6", margin: 0 }}>
          Let's set up your Knowledge Base so KarriereOS can tailor your CV to every job description.
        </p>
      </div>

      {/* Option A — CV Upload */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !uploading && fileRef.current?.click()}
        style={{ background: dragging ? C.indigoLight : C.white, border: `2px dashed ${dragging ? C.indigo : C.border}`, borderRadius: "16px", padding: "40px", textAlign: "center", cursor: uploading ? "default" : "pointer", marginBottom: "16px", transition: "all 0.2s" }}
      >
        <input ref={fileRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={e => e.target.files?.[0] && handleCVUpload(e.target.files[0])} />
        {uploading ? (
          <div>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>⏳</div>
            <div style={{ fontSize: "15px", fontWeight: "600", color: C.indigo }}>{uploadMsg}</div>
            <div style={{ fontSize: "12px", color: C.mid, marginTop: "8px" }}>Please wait, this takes 15-20 seconds</div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>📄</div>
            <div style={{ fontSize: "16px", fontWeight: "700", color: C.slate, marginBottom: "6px" }}>Drop your CV PDF here</div>
            <div style={{ fontSize: "13px", color: C.mid, marginBottom: "16px" }}>AI extracts your projects, education, skills and certifications automatically</div>
            <div style={{ display: "inline-block", background: C.indigo, color: "#fff", padding: "10px 24px", borderRadius: "8px", fontSize: "13px", fontWeight: "700" }}>
              Choose PDF →
            </div>
          </div>
        )}
      </div>

      {error && <div style={{ background: C.redLight, border: "1px solid #FCA5A5", borderRadius: "8px", padding: "10px 14px", fontSize: "12px", color: C.red, marginBottom: "16px" }}>{error}</div>}

      {/* What gets extracted */}
      {!uploading && (
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "16px 20px", marginBottom: "24px" }}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: C.mid, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>What gets extracted</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            {["◈ Projects → ChromaDB", "👤 Profile & contact info", "🎓 Education history", "🏆 Certifications", "⚡ Skills", "📍 Location & links"].map(item => (
              <div key={item} style={{ fontSize: "12px", color: C.mid }}>✓ {item}</div>
            ))}
          </div>
        </div>
      )}

      {/* Option B — Manual */}
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: "13px", color: C.light, marginBottom: "12px" }}>Prefer to add manually?</p>
        <button onClick={() => router.push("/projects")}
          style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: "8px", padding: "9px 20px", fontSize: "13px", color: C.mid, cursor: "pointer", fontWeight: "500" }}>
          Add projects manually →
        </button>
      </div>
    </div>
  );
}