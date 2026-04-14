"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import MdfyLogo from "@/components/MdfyLogo";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function VSCodeAuthPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    (async () => {
      if (!supabase) {
        setStatus("error");
        return;
      }

      // Get current session
      const { data: { session } } = await supabase.auth.getSession() as { data: { session: { access_token: string } | null } };

      if (!session?.access_token) {
        // Not logged in — redirect to login first, then come back
        const redirectUrl = `${window.location.origin}/auth/vscode`;
        await supabase.auth.signInWithOAuth({
          provider: "github",
          options: { redirectTo: redirectUrl },
        });
        return;
      }

      // We have a token — redirect to VS Code URI handler
      const token = session.access_token;
      const refreshToken = (session as { refresh_token?: string }).refresh_token;
      let vscodeUri = `vscode://raymindai.mdfy-vscode/auth?token=${encodeURIComponent(token)}`;
      if (refreshToken) {
        vscodeUri += `&refresh_token=${encodeURIComponent(refreshToken)}`;
      }

      // Try to open VS Code
      window.location.href = vscodeUri;
      setStatus("success");

      // Also try the insiders variant after a delay
      setTimeout(() => {
        let insidersUri = `vscode-insiders://raymindai.mdfy-vscode/auth?token=${encodeURIComponent(token)}`;
        if (refreshToken) {
          insidersUri += `&refresh_token=${encodeURIComponent(refreshToken)}`;
        }
        // Create hidden iframe to try insiders without navigating away
        const iframe = document.createElement("iframe");
        iframe.style.display = "none";
        iframe.src = insidersUri;
        document.body.appendChild(iframe);
        setTimeout(() => iframe.remove(), 1000);
      }, 500);
    })();
  }, [supabase]);

  return (
    <div
      style={{
        background: "var(--background)",
        color: "var(--foreground)",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <MdfyLogo size={32} />

      {status === "loading" && (
        <>
          <div
            style={{
              width: 128,
              height: 2,
              borderRadius: 2,
              overflow: "hidden",
              background: "var(--border-dim)",
            }}
          >
            <div style={{ height: "100%", borderRadius: 2, background: "var(--accent)", animation: "loadbar 1.2s ease-in-out infinite" }} />
          </div>
          <p style={{ fontSize: 14, color: "var(--text-muted)" }}>Connecting to VS Code...</p>
        </>
      )}

      {status === "success" && (
        <>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M8 12l3 3 5-5" />
          </svg>
          <p style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>Connected to VS Code</p>
          <p style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", maxWidth: 400 }}>
            Your mdfy.cc account is now linked. You can close this tab and return to VS Code.
          </p>
          <p style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 8 }}>
            Didn&apos;t work? Make sure the mdfy extension is installed in VS Code.
          </p>
        </>
      )}

      {status === "error" && (
        <>
          <p style={{ fontSize: 16, fontWeight: 600, color: "#ef4444" }}>Connection Failed</p>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Please sign in to mdfy.cc first, then try again from VS Code.
          </p>
          <Link
            href="/"
            style={{
              padding: "10px 24px",
              borderRadius: 8,
              background: "var(--accent-dim)",
              color: "var(--accent)",
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Go to mdfy.cc
          </Link>
        </>
      )}
    </div>
  );
}
