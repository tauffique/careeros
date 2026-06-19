"use client";

import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";

export function useOnboarding() {
  const { getToken, isSignedIn } = useAuth();
  const { user } = useUser();
  const [ready, setReady] = useState(false);
  const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

  useEffect(() => {
    if (!isSignedIn || !user) return;

    async function ensureUser() {
      try {
        const token = await getToken();

        // Check if user exists
        const check = await fetch(`${BACKEND}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (check.status === 404) {
          // Create user in DB
          await fetch(
            `${BACKEND}/users/me?email=${encodeURIComponent(user.primaryEmailAddress?.emailAddress || "")}`,
            {
              method: "POST",
              headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                full_name: user.fullName || "",
                ui_language: "en",
                output_language: "English",
              }),
            }
          );
        }
        setReady(true);
      } catch {
        setReady(true); // don't block UI on error
      }
    }

    ensureUser();
  }, [isSignedIn, user]);

  return ready;
}