"use client";

import dynamic from "next/dynamic";
import MdfyLogo from "@/components/MdfyLogo";
import WelcomeOverlay from "@/components/WelcomeOverlay";

const MdEditor = dynamic(() => import("@/components/MdEditor"), {
  ssr: false,
  loading: () => (
    <div
      className="flex flex-col items-center justify-center h-screen"
      style={{ background: "var(--background)", gap: 18 }}
    >
      {/* One-shot fade-in: opacity 0 → 1 with a small scale-up. The
          logo settles and the slide bar below carries the loading
          signal — no infinite pulse on the mark itself. */}
      <div style={{ animation: "mdfyBootEnter 520ms ease-out both" }}>
        <MdfyLogo size={34} />
      </div>

      {/* v6 tagline. The old "Your Markdown, Beautifully Published"
          was the v5 messaging; v6 thesis is the personal knowledge hub. */}
      <h1
        className="text-center"
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: "var(--text-secondary)",
          letterSpacing: 0.2,
          maxWidth: 420,
          padding: "0 24px",
          lineHeight: 1.5,
        }}
      >
        Personal knowledge hub for the AI era.
      </h1>

      {/* Indeterminate sliding-bar — fixed width track, the accent strip
          travels left → right. Replaces the old expand/contract bar. */}
      <div
        style={{
          width: 120,
          height: 2,
          background: "var(--border-dim)",
          borderRadius: 1,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            height: "100%",
            width: "40%",
            background: "var(--accent)",
            borderRadius: 1,
            animation: "mdfyBootBar 1.1s ease-in-out infinite",
          }}
        />
      </div>

      <span
        className="font-mono uppercase"
        style={{ fontSize: 9, letterSpacing: 1.2, color: "var(--text-faint)" }}
      >
        Loading editor
      </span>

      <style>{`
        @keyframes mdfyBootBar {
          0%   { left: -40%; }
          100% { left: 100%; }
        }
        @keyframes mdfyBootEnter {
          from { opacity: 0; transform: scale(0.92); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  ),
});

export default function Home() {
  return (
    <>
      <noscript>
        <div style={{ padding: "60px 24px", maxWidth: 800, margin: "0 auto", fontFamily: "system-ui, sans-serif", color: "#fafafa", background: "#09090b" }}>
          <h1>mdfy.app — Your Markdown, Beautifully Published</h1>
          <p>Create, edit, and share beautiful documents instantly. WYSIWYG Markdown editor with AI conversation capture, cross-platform sync, and a developer-friendly API. No login required — paste or type, get a permanent URL in seconds.</p>
          <h2>Features</h2>
          <ul>
            <li>WYSIWYG Markdown editor powered by a Rust/WASM engine</li>
            <li>AI conversation capture from ChatGPT, Claude, and Gemini</li>
            <li>Code syntax highlighting, KaTeX math, and Mermaid diagrams</li>
            <li>Permanent shareable URLs with OG previews and QR codes</li>
            <li>Cross-platform: VS Code extension, Chrome extension, CLI, MCP server, Mac desktop app</li>
            <li>Dark and light themes with beautiful typography</li>
            <li>Password protection and expiring links</li>
            <li>Export to PDF, copy as rich text for Google Docs and email</li>
          </ul>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- noscript context, Link component won't work */}
          <p><a href="/about">About mdfy.app</a> | <a href="/plugins">Plugins and Extensions</a> | <a href="/docs">Developer Documentation</a> | <a href="/manifesto">Manifesto</a></p>
        </div>
      </noscript>
      <WelcomeOverlay />
      <MdEditor />
    </>
  );
}
