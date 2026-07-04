import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Sidebar from "../../components/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F8FAFC" }}>
      <Sidebar />
      <main style={{
        flex: 1,
        padding: "32px",
        overflowY: "auto",
        paddingTop: "clamp(80px, 10vw, 32px)",
        paddingBottom: "clamp(76px, 10vw, 32px)",
      }}>
        {children}
      </main>
    </div>
  );
}
