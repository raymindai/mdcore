"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { renderMarkdown } from "@/lib/engine";
import { postProcessHtml } from "@/lib/postprocess";

type Theme = "dark" | "light";

export default function DocumentViewer({
  id,
  markdown: initialMarkdown,
  title: initialTitle,
  isProtected = false,
  isExpired = false,
}: {
  id: string;
  markdown: string;
  title: string | null;
  isProtected?: boolean;
  isExpired?: boolean;
}) {
  const [html, setHtml] = useState("");
  const [markdown, setMarkdown] = useState(initialMarkdown);
  const [title, setTitle] = useState(initialTitle);
  const [isLoading, setIsLoading] = useState(!isExpired && !isProtected);
  const [theme, setThemeState] = useState<Theme>("dark");
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [unlocked, setUnlocked] = useState(!isProtected);
  const [copied, setCopied] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // Theme
  useEffect(() => {
    const saved = localStorage.getItem("mdfy-theme") as Theme | null;
    const initial = saved || "dark";
    setThemeState(initial);
    document.documentElement.setAttribute("data-theme", initial);
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mermaid = (window as any).mermaid;
    if (!mermaid) return;

    (async () => {
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

  const btnClass = "px-2 sm:px-2.5 h-6 rounded-md font-mono transition-colors text-[11px] sm:text-xs flex items-center gap-1";

  return (
    <div
      className="flex flex-col h-screen"
      style={{ background: "var(--background)", color: "var(--foreground)" }}
    >
      {/* Header */}
      <header
        className="flex items-center justify-between px-3 sm:px-5 py-2 sm:py-2.5 backdrop-blur-sm"
        style={{
          borderBottom: "1px solid var(--border)",
          background: "var(--header-bg)",
        }}
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link
            href="/"
            className="text-base sm:text-lg font-bold tracking-tight shrink-0"
          >
            <span style={{ color: "var(--accent)" }}>md</span>
            <span style={{ color: "var(--text-primary)" }}>fy</span>
            <span style={{ color: "var(--text-muted)" }}>.cc</span>
          </Link>
          {title && (
            <span
              className="text-xs sm:text-sm pl-2 sm:pl-3 hidden sm:inline truncate max-w-[300px]"
              style={{
                color: "var(--text-muted)",
                borderLeft: "1px solid var(--border)",
              }}
            >
              {title}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Copy link */}
          <button
            onClick={copyLink}
            className={btnClass}
            style={{ background: "var(--toggle-bg)", color: copied ? "#4ade80" : "var(--text-muted)" }}
          >
            {copied ? (
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 8 7 11 12 5"/></svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 2H6a2 2 0 00-2 2v1M10 2h2a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2v-1M10 2v3"/></svg>
            )}
            {copied ? "Copied" : "Link"}
          </button>
          {/* Theme */}
          <button
            onClick={toggleTheme}
            className="h-6 px-2 rounded-md transition-colors flex items-center"
            style={{ background: "var(--toggle-bg)", color: "var(--text-muted)" }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              {theme === "dark"
                ? <><circle cx="8" cy="8" r="3.5"/><path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M3.4 12.6l1-1M11.6 3.4l1-1"/></>
                : <path d="M13.5 8.5a5.5 5.5 0 01-6-6 5.5 5.5 0 106 6z"/>
              }
            </svg>
          </button>
          {/* PDF */}
          <button
            onClick={() => window.print()}
            className={btnClass}
            style={{ background: "var(--toggle-bg)", color: "var(--text-muted)" }}
          >
            PDF
          </button>
          {/* Edit */}
          <Link
            href={`/?from=${id}`}
            className={btnClass}
            style={{ background: "var(--accent-dim)", color: "var(--accent)" }}
          >
            Edit
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto" ref={previewRef}>
        {isExpired ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.3 }}>
              <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
            </svg>
            <p className="text-lg" style={{ color: "var(--text-muted)" }}>This document has expired</p>
            <Link
              href="/"
              className="mt-2 px-4 py-2 rounded-md text-sm font-mono"
              style={{ background: "var(--accent-dim)", color: "var(--accent)" }}
            >
              Create a new document
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
            className="mdcore-rendered max-w-none p-4 sm:p-8 mx-auto max-w-3xl"
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

      {/* Footer */}
      <footer
        className="flex items-center justify-between px-3 sm:px-5 py-1.5 text-[10px] font-mono"
        style={{
          borderTop: "1px solid var(--border-dim)",
          color: "var(--text-muted)",
        }}
      >
        <span>{markdown.length.toLocaleString()} chars</span>
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <Link href="/about" className="transition-colors" style={{ color: "var(--text-muted)" }}>About</Link>
          <a
            href="https://github.com/raymindai/mdcore"
            className="transition-colors"
            style={{ color: "var(--text-muted)" }}
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
