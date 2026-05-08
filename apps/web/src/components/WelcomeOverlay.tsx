"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

const STORAGE_KEY = "mdfy-welcome-seen";

const slides = [
  {
    step: null,
    title: "Own your markdown.\nUse it anywhere.",
    desc: "Capture AI answers, edit in WYSIWYG, share with a permanent URL. No signup needed.",
    icon: null,
    demoLink: { href: "/hub/yc-demo", label: "See a real hub →" },
  },
  {
    step: "01",
    title: "Capture. Import. Paste.",
    desc: "From ChatGPT, Claude, Gemini — or drop any file. PDF, DOCX, code, plain text. 14+ formats.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
  },
  {
    step: "02",
    title: "Edit like a document.",
    desc: "Click and type in the rendered preview. Bold, headings, lists, code — no Markdown syntax needed.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
  },
  {
    step: "03",
    title: "Share with one click.",
    desc: "Get a permanent URL like mdfy.app/abc123. Anyone can view it — no app, no login needed.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
      </svg>
    ),
  },
  {
    step: "04",
    title: "Your hub becomes\ncontext for any AI.",
    desc: "Captures roll up into one URL. Paste your hub into Claude, ChatGPT, Cursor, or Codex — they read your whole knowledge layer as context.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
      </svg>
    ),
    hubLink: { href: "/install", label: "Install /mdfy in your AI tool →" },
  },
  {
    step: "05",
    title: "Works everywhere.",
    desc: null,
    icon: null,
    surfaces: [
      { name: "Chrome Extension", desc: "Capture AI conversations", color: "#4ade80" },
      { name: "VS Code", desc: "WYSIWYG preview + sync", color: "#60a5fa" },
      { name: "Mac App", desc: "Native desktop with sidebar", color: "#fb923c" },
      { name: "CLI", desc: "Pipe anything to a URL", color: "#4ade80" },
      { name: "MCP Server", desc: "AI agents read & write docs", color: "#60a5fa" },
      { name: "QuickLook", desc: "Space to preview in Finder", color: "#fbbf24" },
    ],
    pluginsLink: true,
  },
];

export default function WelcomeOverlay() {
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState(0);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      setTimeout(() => setVisible(true), 600);
    }
  }, []);

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => {
      setVisible(false);
      localStorage.setItem(STORAGE_KEY, "1");
    }, 300);
  }, []);

  const next = useCallback(() => {
    if (current < slides.length - 1) {
      setCurrent((c) => c + 1);
    } else {
      dismiss();
    }
  }, [current, dismiss]);

  const skip = useCallback(() => {
    dismiss();
  }, [dismiss]);

  if (!visible) return null;

  const slide = slides[current];
  const isFirst = current === 0;
  const isLast = current === slides.length - 1;

  return (
    <div
      className={`welcome-overlay ${exiting ? "exiting" : ""}`}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(8px)",
        opacity: exiting ? 0 : 1,
        transition: "opacity 0.3s",
      }}
      onClick={() => {}}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 20,
          width: "100%",
          maxWidth: 480,
          margin: "0 24px",
          overflow: "hidden",
          animation: "welcome-in 0.4s ease-out",
        }}
      >
        {/* Content */}
        <div style={{ padding: slide.icon ? "48px 40px 32px" : "32px 40px 24px", textAlign: "center" }}>
          {/* Icon */}
          {slide.icon && (
            <div style={{ marginBottom: 20, display: "flex", justifyContent: "center" }}>{slide.icon}</div>
          )}

          {/* Step badge */}
          {slide.step && (
            <span
              style={{
                display: "inline-block",
                fontSize: 10,
                fontWeight: 700,
                color: "var(--accent)",
                background: "var(--accent-dim)",
                padding: "3px 10px",
                borderRadius: 8,
                fontFamily: "var(--font-geist-mono), monospace",
                letterSpacing: 1,
                marginBottom: 16,
              }}
            >
              STEP {slide.step}
            </span>
          )}

          {/* Logo on first slide */}
          {isFirst && (
            <div style={{ marginBottom: 20 }}>
              <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1 }}>
                <span style={{ color: "var(--accent)" }}>md</span>
                <span style={{ color: "var(--text-primary)" }}>fy</span>
                <span style={{ color: "var(--text-faint)" }}>.app</span>
              </span>
            </div>
          )}

          {/* Title */}
          <h2
            style={{
              fontSize: isFirst ? 28 : 22,
              fontWeight: 800,
              color: "var(--text-primary)",
              lineHeight: 1.3,
              letterSpacing: "-0.02em",
              margin: "0 0 12px",
              whiteSpace: "pre-line",
            }}
          >
            {slide.title}
          </h2>

          {/* Description */}
          {slide.desc && (
            <p
              style={{
                fontSize: 14,
                color: "var(--text-muted)",
                lineHeight: 1.6,
                margin: 0,
                maxWidth: 360,
                marginLeft: "auto",
                marginRight: "auto",
              }}
            >
              {slide.desc}
            </p>
          )}

          {/* Demo hub link (signed-out visitors land here first) */}
          {"demoLink" in slide && slide.demoLink && (
            <Link
              href={(slide.demoLink as { href: string; label: string }).href}
              onClick={dismiss}
              style={{
                display: "inline-block",
                marginTop: 14,
                fontSize: 13,
                color: "var(--accent)",
                textDecoration: "none",
              }}
            >
              {(slide.demoLink as { href: string; label: string }).label}
            </Link>
          )}

          {/* Hub-for-AI link (slide 04) */}
          {"hubLink" in slide && slide.hubLink && (
            <Link
              href={(slide.hubLink as { href: string; label: string }).href}
              onClick={dismiss}
              style={{
                display: "inline-block",
                marginTop: 14,
                fontSize: 13,
                color: "var(--accent)",
                textDecoration: "none",
              }}
            >
              {(slide.hubLink as { href: string; label: string }).label}
            </Link>
          )}

          {/* Surfaces list (slide 04) */}
          {"surfaces" in slide && slide.surfaces && (
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 6, maxWidth: 320, marginLeft: "auto", marginRight: "auto" }}>
              {(slide.surfaces as { name: string; desc: string; color: string }[]).map((s) => (
                <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 12px", borderRadius: 8, background: "var(--background)", textAlign: "left" }}>
                  <span style={{ width: 6, height: 6, borderRadius: 3, background: s.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", minWidth: 110 }}>{s.name}</span>
                  <span style={{ fontSize: 11, color: "var(--text-faint)" }}>{s.desc}</span>
                </div>
              ))}
              {"pluginsLink" in slide && slide.pluginsLink && (
                <Link
                  href="/plugins"
                  onClick={dismiss}
                  style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none", marginTop: 4 }}
                >
                  See all integrations &rarr;
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: 6, padding: "0 0 24px" }}>
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              style={{
                width: current === i ? 20 : 6,
                height: 6,
                borderRadius: 3,
                border: "none",
                background: current === i ? "var(--accent)" : "var(--border)",
                cursor: "pointer",
                padding: 0,
                transition: "width 0.2s, background 0.2s",
              }}
            />
          ))}
        </div>

        {/* Actions */}
        <div style={{ padding: "16px 40px 32px" }}>
          {/* Button row */}
          <div style={{ display: "flex", gap: 10 }}>
            {!isFirst && (
              <button
                onClick={() => setCurrent((c) => c - 1)}
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  background: "none",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "12px 20px",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                Back
              </button>
            )}
            <button
              onClick={next}
              style={{
                flex: 1,
                background: isLast ? "var(--accent)" : "var(--surface)",
                color: isLast ? "#000" : "var(--text-primary)",
                border: isLast ? "none" : "1px solid var(--border)",
                padding: "12px 28px",
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {isLast ? "Get started" : "Next"}
            </button>
          </div>
          {/* Learn more — below on last slide */}
          {isLast && (
            <div style={{ textAlign: "center", marginTop: 14 }}>
              <Link
                href="/about"
                onClick={dismiss}
                style={{
                  fontSize: 13,
                  color: "var(--text-faint)",
                  textDecoration: "none",
                }}
              >
                Learn more about mdfy
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
