"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import ViewerFooter from "@/components/ViewerFooter";
import ViewerPromoStrip from "@/components/ViewerPromoStrip";
import ViewerHeader from "@/components/ViewerHeader";
import { renderMarkdown } from "@/lib/engine";
import { postProcessHtml } from "@/lib/postprocess";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type Theme = "dark" | "light";

export default function DocumentViewer({
  id,
  markdown: initialMarkdown,
  title: initialTitle,
  isProtected = false,
  isExpired = false,
  isRestricted = false,
  showBadge = true,
  editMode = "token",
}: {
  id: string;
  markdown: string;
  title: string | null;
  isProtected?: boolean;
  isExpired?: boolean;
  isRestricted?: boolean;
  showBadge?: boolean;
  editMode?: string;
}) {
  const [html, setHtml] = useState("");
  const [markdown, setMarkdown] = useState(initialMarkdown);
  const [title, setTitle] = useState(initialTitle);
  const [isLoading, setIsLoading] = useState(!isExpired && !isProtected);
  const [theme, setThemeState] = useState<Theme>("dark");
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [copiedMd, setCopiedMd] = useState(false);
  const [unlocked, setUnlocked] = useState(!isProtected && !isRestricted);
  // Defer the access gate UNTIL client-side auth check finishes — otherwise
  // owners see "You need access" flash for ~500ms before the redirect to /
  const [authChecked, setAuthChecked] = useState(!isRestricted);
  const [copied, setCopied] = useState(false);
  const [accessRevoked, setAccessRevoked] = useState(false);
  const [updateToast, setUpdateToast] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const markdownRef = useRef(initialMarkdown);
  markdownRef.current = markdown;

  // Check ownership: if logged-in user owns this doc, redirect to editor
  // Also handles restricted docs: try client-side fetch with user credentials
  useEffect(() => {
    (async () => {
      try {
        const { getSupabaseBrowserClient } = await import("@/lib/supabase-browser");
        const supabase = getSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const res = await fetch(`/api/docs/${id}`, {
          headers: { "x-user-id": user.id, "x-user-email": user.email || "" },
        });
        if (!res.ok) return;

        const doc = await res.json();

        // Owner → open in editor instead of viewer (don't flip authChecked,
        // we're navigating away)
        if (doc.isOwner) {
          window.location.replace(`/?from=${id}`);
          return;
        }

        // Not owner but has access to restricted doc → show content
        if (isRestricted && !unlocked && doc.markdown) {
          setMarkdown(doc.markdown);
          if (doc.title) setTitle(doc.title);
          setUnlocked(true);
          setIsLoading(true);
        }
      } catch { /* no session or not authorized */ }
      finally { setAuthChecked(true); }
    })();
  }, [id, isRestricted, unlocked]);


  // Theme
  useEffect(() => {
    const saved = localStorage.getItem("mdfy-theme") as Theme | null;
    const initial = saved || "dark";
    setThemeState(initial);
    document.documentElement.setAttribute("data-theme", initial);
    // Restore accent and scheme
    const accent = localStorage.getItem("mdfy-accent");
    if (accent && accent !== "orange") {
      document.documentElement.setAttribute("data-accent", accent);
    }
    const scheme = localStorage.getItem("mdfy-scheme");
    if (scheme && scheme !== "default") {
      document.documentElement.setAttribute("data-scheme", scheme);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    const next = theme === "dark" ? "light" : "dark";
    setThemeState(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("mdfy-theme", next);
  }, [theme]);

  // Copy link
  const copyLink = useCallback(async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  // Unlock with password
  const handleUnlock = useCallback(async () => {
    try {
      const res = await fetch(`/api/docs/${id}`, {
        headers: { "x-document-password": passwordInput },
      });
      if (res.ok) {
        const doc = await res.json();
        setMarkdown(doc.markdown);
        setTitle(doc.title);
        setUnlocked(true);
        setIsLoading(true);
        setPasswordError(false);
      } else {
        setPasswordError(true);
      }
    } catch {
      setPasswordError(true);
    }
  }, [id, passwordInput]);

  // Render markdown via WASM
  useEffect(() => {
    if (!markdown || !unlocked) return;
    (async () => {
      try {
        const result = await renderMarkdown(markdown);
        const processed = postProcessHtml(result.html);
        setHtml(processed);
        setIsLoading(false);
      } catch (e) {
        console.error("Render error:", e);
        setIsLoading(false);
      }
    })();
  }, [markdown, unlocked]);

  // Mermaid rendering
  useEffect(() => {
    if (!previewRef.current || isLoading) return;
    const mermaidPres = previewRef.current.querySelectorAll('pre[lang="mermaid"]');
    if (mermaidPres.length === 0) return;
    const isDark = theme === "dark";

    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let mermaid = (window as any).mermaid;
      if (!mermaid) {
        // Wait for CDN to load (up to 5s)
        await new Promise<void>((resolve) => {
          let tries = 0;
          const check = setInterval(() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if ((window as any).mermaid || tries++ > 50) { clearInterval(check); resolve(); }
          }, 100);
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mermaid = (window as any).mermaid;
        if (!mermaid) return;
      }
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "loose",
        theme: isDark ? "dark" : "default",
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontSize: 14,
        themeVariables: isDark ? {
          background: "transparent",
          primaryColor: "#222230",
          primaryTextColor: "#ededf0",
          primaryBorderColor: "#3a3a48",
          lineColor: "#50505e",
          secondaryColor: "#1a1a24",
          tertiaryColor: "#1a1a24",
        } : {
          background: "transparent",
          primaryColor: "#ffffff",
          primaryTextColor: "#1a1a2e",
          primaryBorderColor: "#e0e0e8",
          lineColor: "#b0b0c0",
          secondaryColor: "#f7f7fa",
          tertiaryColor: "#f7f7fa",
        },
      });

      for (let idx = 0; idx < mermaidPres.length; idx++) {
        const pre = mermaidPres[idx];
        const codeEl = pre.querySelector("code");
        const code = (codeEl?.textContent || pre.textContent || "").trim();
        if (!code) continue;

        try {
          const mermaidId = `mermaid-view-${Date.now()}-${idx}`;
          const { svg: rawSvg } = await mermaid.render(mermaidId, code);
          const { styleMermaidSvg } = await import("@/lib/mermaid-style");
          const svg = styleMermaidSvg(rawSvg, isDark);

          const wrapper = document.createElement("div");
          wrapper.className = "mermaid-container";
          const sourcepos = pre.getAttribute("data-sourcepos");
          if (sourcepos) wrapper.setAttribute("data-sourcepos", sourcepos);

          const rendered = document.createElement("div");
          rendered.className = "mermaid-rendered";
          rendered.innerHTML = svg;
          wrapper.appendChild(rendered);

          pre.replaceWith(wrapper);
        } catch {
          // Leave as-is
        }
      }
    })();
  }, [html, isLoading, theme]);

  // Supabase Realtime: subscribe to document changes
  useEffect(() => {
    if (!unlocked || isProtected || isExpired) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return; // fallback polling handles it below

    const channel = supabase
      .channel(`doc-${id}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'documents', filter: `id=eq.${id}` },
        async () => {
          // Document was updated — fetch fresh content and check permissions
          // Use x-no-view-count to prevent view_count increment → Realtime loop
          try {
            const res = await fetch(`/api/docs/${id}`, {
              headers: { "x-no-view-count": "1" },
            });
            if (res.status === 403 || res.status === 404) {
              // Access revoked or document made private/draft
              setAccessRevoked(true);
              return;
            }
            if (res.ok) {
              const doc = await res.json();
              // Check if document was made draft (no longer available)
              if (doc.is_draft) {
                setAccessRevoked(true);
                return;
              }
              if (doc.markdown !== markdownRef.current) {
                setMarkdown(doc.markdown);
                if (doc.title) setTitle(doc.title);
                setUpdateToast(true);
                setTimeout(() => setUpdateToast(false), 3000);
              }
            }
          } catch { /* offline */ }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, unlocked, isProtected, isExpired]);

  // Fallback polling if Supabase Realtime is not available
  const lastUpdatedRef = useRef<string>("");
  useEffect(() => {
    if (!unlocked || isProtected || isExpired) return;
    const supabase = getSupabaseBrowserClient();
    if (supabase) return; // Realtime handles it

    const poll = async () => {
      try {
        const res = await fetch(`/api/docs/${id}`, { method: "HEAD" });
        const updatedAt = res.headers.get("x-updated-at") || "";
        if (lastUpdatedRef.current && updatedAt && updatedAt !== lastUpdatedRef.current) {
          const full = await fetch(`/api/docs/${id}`);
          if (full.ok) {
            const doc = await full.json();
            if (doc.markdown !== markdownRef.current) {
              setMarkdown(doc.markdown);
              if (doc.title) setTitle(doc.title);
              setUpdateToast(true);
              setTimeout(() => setUpdateToast(false), 3000);
            }
          }
        }
        lastUpdatedRef.current = updatedAt;
      } catch { /* offline, ignore */ }
    };
    poll();
    const interval = setInterval(poll, 60000);
    return () => clearInterval(interval);
  }, [id, unlocked, isProtected, isExpired]);

  // Compact pill style every action button shares.
  const actionBtn = "h-7 px-2.5 rounded-md text-caption font-medium flex items-center gap-1.5 transition-colors";

  // Copy markdown — paste-into-AI flow. Strips no formatting; the
  // markdown body itself is what every LLM already knows how to read.
  const copyMarkdown = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(markdownRef.current || "");
      setCopiedMd(true);
      setTimeout(() => setCopiedMd(false), 2000);
    } catch { /* clipboard denied */ }
  }, []);

  return (
    <div
      className="flex flex-col h-screen"
      style={{ background: "var(--background)", color: "var(--foreground)" }}
    >
      <ViewerHeader
        title={title || "Untitled"}
        breadcrumb={<>mdfy.app/<span style={{ color: "var(--accent)" }}>{id}</span></>}
        actions={
          <>
            <button
              onClick={copyLink}
              className={actionBtn}
              style={{ background: "var(--toggle-bg)", color: copied ? "#4ade80" : "var(--text-muted)" }}
              title="Copy link"
              aria-label="Copy link"
            >
              {copied ? (
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="4 8 7 11 12 5"/></svg>
              ) : (
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 8.5a3 3 0 004.24 0l2-2a3 3 0 00-4.24-4.24l-1 1"/><path d="M9 7.5a3 3 0 00-4.24 0l-2 2a3 3 0 004.24 4.24l1-1"/></svg>
              )}
              <span className="hidden sm:inline">{copied ? "Copied" : "Link"}</span>
            </button>
            <button
              onClick={copyMarkdown}
              className={actionBtn}
              style={{ background: "var(--toggle-bg)", color: copiedMd ? "#4ade80" : "var(--text-muted)" }}
              title="Copy markdown — paste into any AI as context"
              aria-label="Copy markdown"
            >
              {copiedMd ? (
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="4 8 7 11 12 5"/></svg>
              ) : (
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h10v10H3z"/><path d="M5 6h6M5 9h6M5 12h3"/></svg>
              )}
              <span className="hidden sm:inline">{copiedMd ? "Copied" : "MD"}</span>
            </button>
            <button
              onClick={toggleTheme}
              className={actionBtn}
              style={{ background: "var(--toggle-bg)", color: "var(--text-muted)" }}
              title="Toggle theme"
              aria-label="Toggle theme"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                {theme === "dark"
                  ? <><circle cx="8" cy="8" r="3.5"/><path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M3.4 12.6l1-1M11.6 3.4l1-1"/></>
                  : <path d="M13.5 8.5a5.5 5.5 0 01-6-6 5.5 5.5 0 106 6z"/>
                }
              </svg>
            </button>
          </>
        }
      />

      {/* Content */}
      <div className="flex-1 overflow-auto" ref={previewRef}>
        {accessRevoked ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 px-6">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.3 }}>
              <rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 118 0v4"/>
            </svg>
            <p className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>This document is no longer available</p>
            <p className="text-sm text-center" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
              The owner has changed the permissions or made this document private.
            </p>
            <Link
              href="/"
              className="mt-2 px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-1.5"
              style={{ background: "var(--accent)", color: "#000" }}
            >
              Create your own
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3l5 5-5 5"/></svg>
            </Link>
          </div>
        ) : isRestricted && !unlocked && !authChecked ? (
          // Auth check still in flight — show neutral loading state instead of
          // flashing the "You need access" gate to owners about to be redirected.
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <svg width="24" height="24" viewBox="0 0 16 16" fill="none" stroke="var(--accent)" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
              <circle cx="8" cy="8" r="6" strokeDasharray="28" strokeDashoffset="8" strokeLinecap="round"/>
            </svg>
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>
              Loading...
            </span>
          </div>
        ) : isRestricted && !unlocked ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 px-6" style={{ maxWidth: 440, margin: "0 auto" }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.3 }}>
              <rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 118 0v4"/>
            </svg>
            <p className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>You need access</p>
            <p className="text-sm text-center" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
              This document is shared with specific people.
              Sign in with an authorized email, or ask the owner for access.
            </p>
            <div className="flex gap-3 mt-2">
              <button
                onClick={async () => {
                  try {
                    const { getSupabaseBrowserClient } = await import("@/lib/supabase-browser");
                    const supabase = getSupabaseBrowserClient();
                    await supabase.auth.signInWithOAuth({
                      provider: "google",
                      options: { redirectTo: window.location.href },
                    });
                  } catch { window.location.href = "/"; }
                }}
                className="px-5 py-2 rounded-lg text-sm font-medium"
                style={{ background: "var(--accent)", color: "#000" }}
              >
                Sign in with Google
              </button>
              <button
                onClick={async () => {
                  // Request access from owner
                  try {
                    await fetch("/api/notifications", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        recipientEmail: "__owner__",
                        type: "access_request",
                        documentId: id,
                        message: "requested access to this document",
                      }),
                    });
                    const btn = document.activeElement as HTMLButtonElement;
                    if (btn) { btn.textContent = "Request sent"; btn.style.color = "#4ade80"; }
                  } catch { /* ignore */ }
                }}
                className="px-5 py-2 rounded-lg text-sm font-medium"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
              >
                Request access
              </button>
            </div>
            <Link href="/" className="mt-2 text-xs underline" style={{ color: "var(--text-muted)" }}>
              Or create your own document →
            </Link>
          </div>
        ) : isExpired ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 px-6">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.3 }}>
              <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
            </svg>
            <p className="text-lg" style={{ color: "var(--text-muted)" }}>This document has expired</p>
            <p className="text-xs text-center max-w-xs" style={{ color: "var(--text-muted)", opacity: 0.7 }}>
              But you can publish your own beautiful document in seconds.
            </p>
            <Link
              href="/"
              className="mt-2 px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-1.5"
              style={{ background: "var(--accent)", color: "#000" }}
            >
              Create your own
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3l5 5-5 5"/></svg>
            </Link>
          </div>
        ) : !unlocked ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.3 }}>
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>This document is password protected</p>
            <div className="flex gap-2">
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(false); }}
                onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
                placeholder="Enter password"
                className="px-3 py-2 rounded-md text-sm outline-none"
                style={{
                  background: "var(--surface)",
                  border: `1px solid ${passwordError ? "#ef4444" : "var(--border)"}`,
                  color: "var(--text-primary)",
                }}
                autoFocus
              />
              <button
                onClick={handleUnlock}
                className="px-4 py-2 rounded-md text-sm font-mono"
                style={{ background: "var(--accent-dim)", color: "var(--accent)" }}
              >
                Unlock
              </button>
            </div>
            {passwordError && (
              <p className="text-xs" style={{ color: "#ef4444" }}>Wrong password</p>
            )}
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <svg width="24" height="24" viewBox="0 0 16 16" fill="none" stroke="var(--accent)" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
              <circle cx="8" cy="8" r="6" strokeDasharray="28" strokeDashoffset="8" strokeLinecap="round"/>
            </svg>
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>
              Loading...
            </span>
          </div>
        ) : html ? (
          <article
            className="mdcore-rendered p-4 sm:p-8 mx-auto max-w-3xl"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <div
            className="flex items-center justify-center h-full"
            style={{ color: "var(--text-muted)" }}
          >
            Empty document
          </div>
        )}
      </div>

      {/* Viewer-wide promote strip — only when the visitor isn't the
          owner. Owners about to be redirected via the auth-check effect
          briefly land here too; the same effect sets authChecked true
          but doesn't flip a separate isOwner flag, so we hide the strip
          for password / restricted / expired states (those audiences
          aren't candidates for the funnel right now). */}
      {showBadge && unlocked && !isExpired && !accessRevoked && (
        <ViewerPromoStrip />
      )}

      {/* Footer — single shared chrome across /d, /b, /hub. Stats slot
          carries the lightweight word/char count; engine badges, VS
          Code / Chrome / Privacy links are gone — the footer's job is
          minimal nav + the Make-your-own CTA, nothing more. */}
      <ViewerFooter
        stats={
          <>
            <span className="hidden sm:inline">{markdown.split(/\s+/).filter(Boolean).length.toLocaleString()} words</span>
            <span>{markdown.length.toLocaleString()} chars</span>
          </>
        }
      />

      {/* Update toast */}
      {updateToast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-body font-medium animate-[fade-in-up_0.2s_ease]"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--accent)",
            color: "var(--text-primary)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2L6 10l-4-4"/>
          </svg>
          Document updated
        </div>
      )}
    </div>
  );
}
