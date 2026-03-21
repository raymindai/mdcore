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

    const mermaidContainers =
      previewRef.current.querySelectorAll(".mermaid-container");
    if (mermaidContainers.length === 0) return;

    const isDark = theme === "dark";

    import("mermaid").then((mermaidModule) => {
      const mermaid = mermaidModule.default;
      mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? "dark" : "default",
        themeVariables: isDark
          ? {
              primaryColor: "#fb923c",
              primaryTextColor: "#fafafa",
              primaryBorderColor: "#ea580c",
              lineColor: "#71717a",
              secondaryColor: "#27272a",
              tertiaryColor: "#18181b",
              background: "#09090b",
              mainBkg: "#27272a",
              nodeBorder: "#3f3f46",
              clusterBkg: "#18181b",
              titleColor: "#fafafa",
              edgeLabelBackground: "#18181b",
            }
          : {
              primaryColor: "#fed7aa",
              primaryTextColor: "#18181b",
              primaryBorderColor: "#ea580c",
              lineColor: "#a1a1aa",
              secondaryColor: "#f4f4f5",
              tertiaryColor: "#fafafa",
              background: "#ffffff",
              mainBkg: "#fff7ed",
              nodeBorder: "#e4e4e7",
              clusterBkg: "#fafafa",
              titleColor: "#18181b",
              edgeLabelBackground: "#ffffff",
            },
        fontFamily: "ui-monospace, monospace",
        fontSize: 13,
      });

      mermaidContainers.forEach(async (container) => {
        const pre = container.querySelector("pre.mermaid");
        if (!pre) return;
        const code = pre.textContent || "";
        const mermaidId =
          container.getAttribute("data-mermaid-id") || "mermaid-0";

        try {
          const { svg } = await mermaid.render(mermaidId, code);
          container.innerHTML = `<div class="mermaid-rendered">${svg}</div>`;
        } catch {
          // Leave as-is
        }
      });
    });
  }, [html, isLoading, theme]);

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
          <span
            className="text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0"
            style={{
              background: "var(--accent-dim)",
              color: "var(--accent)",
            }}
          >
            SHARED
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 text-xs">
          <button
            onClick={toggleTheme}
            className="px-2 py-1 rounded-md transition-colors text-[11px]"
            style={{
              background: "var(--toggle-bg)",
              color: "var(--text-muted)",
            }}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          <button
            onClick={() => window.print()}
            className="px-2 sm:px-2.5 py-1 rounded-md font-mono transition-colors text-[11px] sm:text-xs"
            style={{
              background: "var(--toggle-bg)",
              color: "var(--text-muted)",
            }}
          >
            PDF
          </button>
          <Link
            href={`/?from=${id}`}
            className="px-2 sm:px-2.5 py-1 rounded-md font-mono transition-colors text-[11px] sm:text-xs"
            style={{
              background: "var(--accent-dim)",
              color: "var(--accent)",
            }}
          >
            Edit
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto" ref={previewRef}>
        {isExpired ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="text-5xl opacity-40">⏰</div>
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
            <div className="text-5xl opacity-40">🔒</div>
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
            <div
              className="w-6 h-6 border-2 rounded-full animate-spin"
              style={{
                borderColor: "var(--accent-dim)",
                borderTopColor: "var(--accent)",
              }}
            />
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>
              Loading WASM engine...
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
        <span className="truncate">mdcore v0.1.0 · Rust → WASM</span>
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <a
            href="https://github.com/raymindai/mdcore"
            className="transition-colors"
            style={{ color: "var(--text-muted)" }}
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          <a
            href="https://mdcore.ai"
            className="transition-colors"
            style={{ color: "var(--text-muted)" }}
            target="_blank"
            rel="noopener noreferrer"
          >
            mdcore.ai
          </a>
        </div>
      </footer>
    </div>
  );
}
