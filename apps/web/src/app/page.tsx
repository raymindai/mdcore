"use client";

import dynamic from "next/dynamic";
import MdfyLogo from "@/components/MdfyLogo";
import WelcomeOverlay from "@/components/WelcomeOverlay";

const MdEditor = dynamic(() => import("@/components/MdEditor"), {
  ssr: false,
  loading: () => (
    <div
      className="flex flex-col items-center justify-center h-screen gap-6"
      style={{ background: "var(--background)" }}
    >
      {/* Logo */}
      <MdfyLogo size={30} />

      {/* SEO-friendly tagline */}
      <h1 className="text-xs tracking-wide" style={{ color: "var(--text-faint)", fontWeight: 400 }}>
        mdfy.app — Your Markdown, Beautifully Published.
      </h1>

      {/* Animated bar */}
      <div
        className="w-32 h-0.5 rounded-full overflow-hidden"
        style={{ background: "var(--border-dim)" }}
      >
        <div
          className="h-full rounded-full"
          style={{
            background: "var(--accent)",
            animation: "loadbar 1.2s ease-in-out infinite",
          }}
        />
      </div>

      {/* CSS animation */}
      <style>{`
        @keyframes loadbar {
          0% { width: 0%; margin-left: 0%; }
          50% { width: 60%; margin-left: 20%; }
          100% { width: 0%; margin-left: 100%; }
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
