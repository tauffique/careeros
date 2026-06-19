import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata = { title: "KarriereOS", description: "AI-powered job application platform" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body style={{ margin: 0, fontFamily: "'Inter', -apple-system, sans-serif", background: "#F8FAFC" }}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}