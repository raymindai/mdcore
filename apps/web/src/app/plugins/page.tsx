import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Plugins — mdfy.cc",
  description:
    "Chrome extension, macOS QuickLook, and more. Bring mdfy.cc rendering everywhere.",
  openGraph: {
    title: "Plugins — mdfy.cc",
    description: "Chrome extension for AI chat capture. macOS QuickLook for Markdown preview.",
    url: "https://mdfy.cc/plugins",
  },
};

const navLinks = [
  { href: "/about", label: "About" },
  { href: "/plugins", label: "Plugins", active: true },
];

export default function PluginsPage() {
  return (
    <div
      style={{
        background: "var(--background)",
        color: "var(--foreground)",
        minHeight: "100vh",
        overflowX: "hidden",
      }}
    >
      {/* ───────── NAV ───────── */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          borderBottom: "1px solid var(--border-dim)",
          background: "var(--header-bg)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div
          style={{
            maxWidth: 1080,
            margin: "0 auto",
            padding: "14px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <Link href="/" style={{ textDecoration: "none" }}>
              <span style={{ color: "var(--accent)", fontSize: 22, fontWeight: 800 }}>md</span>
              <span style={{ color: "var(--text-primary)", fontSize: 22, fontWeight: 800 }}>fy</span>
              <span style={{ color: "var(--text-muted)", fontSize: 22, fontWeight: 800 }}>.cc</span>
            </Link>
            <div style={{ display: "flex", gap: 16 }}>
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{
                    color: link.active ? "var(--accent)" : "var(--text-muted)",
                    fontSize: 13,
                    fontWeight: link.active ? 600 : 400,
                    textDecoration: "none",
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <a
              href="https://github.com/raymindai/mdcore"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--text-muted)", fontSize: 13, textDecoration: "none" }}
            >
              GitHub
            </a>
            <Link
              href="/"
              style={{
                background: "var(--accent-dim)",
                color: "var(--accent)",
                padding: "6px 16px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Open Editor
            </Link>
          </div>
        </div>
      </nav>

      {/* ───────── HERO ───────── */}
      <section
        style={{
          position: "relative",
          maxWidth: 1080,
          margin: "0 auto",
          padding: "80px 24px 60px",
        }}
      >
        <p
          style={{
            color: "var(--accent)",
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: 2,
            textTransform: "uppercase",
            marginBottom: 20,
            fontFamily: "var(--font-geist-mono), monospace",
          }}
        >
          Plugins & Extensions
        </p>

        <h1
          style={{
            fontSize: "clamp(32px, 4vw, 48px)",
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            color: "var(--text-primary)",
            maxWidth: 640,
            margin: 0,
          }}
        >
          Bring <span style={{ color: "var(--accent)" }}>mdfy</span> everywhere.
        </h1>

        <p
          style={{
            fontSize: 17,
            lineHeight: 1.7,
            color: "var(--text-tertiary)",
            maxWidth: 560,
            marginTop: 24,
          }}
        >
          Capture AI conversations, preview Markdown files, and publish documents — without leaving your workflow.
        </p>
      </section>

      {/* ───────── CHROME EXTENSION ───────── */}
      <section
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          padding: "0 24px 60px",
        }}
      >
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border-dim)",
            borderRadius: 16,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "36px 32px 28px",
              borderBottom: "1px solid var(--border-dim)",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 24,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: "#18181b",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid #27272a",
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="var(--accent)" strokeWidth="1.5"/>
                    <circle cx="12" cy="12" r="4" fill="var(--accent)"/>
                  </svg>
                </div>
                <div>
                  <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                    Chrome Extension
                  </h2>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
                    mdfy.cc — Publish AI Output
                  </p>
                </div>
              </div>
              <p style={{ fontSize: 15, color: "var(--text-tertiary)", maxWidth: 480, lineHeight: 1.7, margin: 0 }}>
                One-click capture from ChatGPT, Claude, and Gemini. Turn any AI conversation into a beautiful, shareable document on mdfy.cc.
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <span
                style={{
                  padding: "6px 14px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  background: "var(--accent-dim)",
                  color: "var(--accent)",
                }}
              >
                Free
              </span>
              <span
                style={{
                  padding: "6px 14px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  background: "var(--toggle-bg)",
                  color: "var(--text-faint)",
                }}
              >
                Manifest V3
              </span>
            </div>
          </div>

          {/* Features grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 1,
              background: "var(--border-dim)",
            }}
          >
            {[
              {
                title: "AI Platform Support",
                items: ["ChatGPT (chat.openai.com)", "Claude (claude.ai)", "Gemini (gemini.google.com)"],
              },
              {
                title: "Capture Methods",
                items: ["Floating button — full conversation", "Hover button — single response", "Right-click — any selected text", "Popup — capture or selection"],
              },
              {
                title: "Smart Conversion",
                items: ["HTML → clean Markdown", "Code blocks preserved", "Tables, lists, headings", "User/Assistant formatting"],
              },
              {
                title: "Seamless Transfer",
                items: ["Small content → URL hash (instant)", "Large content → clipboard + toast", "Gzip compression (same as mdfy.cc)", "Opens in mdfy.cc editor"],
              },
            ].map((section) => (
              <div key={section.title} style={{ background: "var(--surface)", padding: "24px 28px" }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12, marginTop: 0 }}>
                  {section.title}
                </h3>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {section.items.map((item) => (
                    <li
                      key={item}
                      style={{
                        fontSize: 13,
                        color: "var(--text-muted)",
                        padding: "4px 0",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                      }}
                    >
                      <span style={{ color: "var(--accent)", flexShrink: 0 }}>+</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* How to install */}
          <div style={{ padding: "28px 32px", borderTop: "1px solid var(--border-dim)" }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16, marginTop: 0 }}>
              Install (Developer Mode)
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { step: "1", text: "Clone the repo or download the extension folder" },
                { step: "2", text: "Open chrome://extensions and enable Developer Mode" },
                { step: "3", text: "Click \"Load unpacked\" and select the apps/chrome-extension/ folder" },
                { step: "4", text: "Visit ChatGPT, Claude, or Gemini — the mdfy button appears" },
              ].map((s) => (
                <div key={s.step} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      background: "var(--accent-dim)",
                      color: "var(--accent)",
                      fontSize: 11,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {s.step}
                  </span>
                  <span style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>{s.text}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 16, marginBottom: 0 }}>
              Chrome Web Store submission coming soon.
            </p>
          </div>
        </div>
      </section>

      {/* ───────── MACOS QUICKLOOK ───────── */}
      <section
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          padding: "0 24px 60px",
        }}
      >
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border-dim)",
            borderRadius: 16,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "36px 32px",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 24,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: "#18181b",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid #27272a",
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round">
                    <rect x="3" y="3" width="18" height="18" rx="3"/>
                    <path d="M8 8h3M8 12h8M8 16h5"/>
                  </svg>
                </div>
                <div>
                  <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                    macOS QuickLook
                  </h2>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
                    Preview .md files in Finder
                  </p>
                </div>
              </div>
              <p style={{ fontSize: 15, color: "var(--text-tertiary)", maxWidth: 480, lineHeight: 1.7, margin: 0 }}>
                Press Space on any .md file in Finder to see it beautifully rendered — GFM tables, syntax highlighting, math, and Mermaid diagrams. Powered by the mdcore engine.
              </p>
            </div>
            <span
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                background: "var(--toggle-bg)",
                color: "var(--text-faint)",
                flexShrink: 0,
              }}
            >
              COMING SOON
            </span>
          </div>

          {/* Planned features */}
          <div style={{ padding: "0 32px 32px" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 12,
              }}
            >
              {[
                { title: "Full Rendering", desc: "GFM, KaTeX math, Mermaid diagrams, 190+ language highlighting" },
                { title: "Dark + Light", desc: "Matches your macOS appearance automatically" },
                { title: "Fast", desc: "Native WASM engine — renders in milliseconds" },
                { title: "Zero Config", desc: "Install once, works for all .md files system-wide" },
              ].map((f) => (
                <div
                  key={f.title}
                  style={{
                    padding: "16px",
                    borderRadius: 10,
                    border: "1px solid var(--border-dim)",
                    background: "var(--background)",
                  }}
                >
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginTop: 0, marginBottom: 6 }}>
                    {f.title}
                  </h4>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5, margin: 0 }}>
                    {f.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ───────── MORE COMING ───────── */}
      <section
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          padding: "0 24px 60px",
        }}
      >
        <h2
          style={{
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "var(--text-muted)",
            marginBottom: 24,
            fontFamily: "var(--font-geist-mono), monospace",
          }}
        >
          On the Roadmap
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 12,
          }}
        >
          {[
            { name: "VS Code Extension", desc: "Preview and publish .md files directly from your editor", status: "Planned" },
            { name: "Obsidian Plugin", desc: "Publish Obsidian notes to mdfy.cc with one command", status: "Planned" },
            { name: "Raycast Extension", desc: "Quick capture and publish from Raycast", status: "Planned" },
            { name: "CLI Tool", desc: "mdfy render file.md — terminal Markdown rendering", status: "Planned" },
            { name: "Alfred Workflow", desc: "Capture clipboard and publish instantly", status: "Planned" },
            { name: "iOS / Android", desc: "Share sheet integration for mobile publishing", status: "Planned" },
          ].map((p) => (
            <div
              key={p.name}
              style={{
                padding: "20px",
                borderRadius: 12,
                border: "1px solid var(--border-dim)",
                background: "var(--surface)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                  {p.name}
                </h3>
                <span style={{ fontSize: 9, fontWeight: 600, color: "var(--text-faint)", background: "var(--toggle-bg)", padding: "2px 8px", borderRadius: 10 }}>
                  {p.status.toUpperCase()}
                </span>
              </div>
              <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5, margin: 0 }}>
                {p.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────── CTA ───────── */}
      <section
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          padding: "20px 24px 80px",
          textAlign: "center",
        }}
      >
        <p style={{ color: "var(--text-muted)", fontSize: 15, marginBottom: 24 }}>
          Want to build a plugin? The engine is open source.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
          <a
            href="https://github.com/raymindai/mdcore"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block",
              padding: "12px 28px",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              background: "var(--surface)",
            }}
          >
            View on GitHub
          </a>
          <Link
            href="/"
            style={{
              display: "inline-block",
              background: "var(--accent)",
              color: "#000",
              padding: "12px 28px",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Open Editor
          </Link>
        </div>
      </section>

      {/* ───────── FOOTER ───────── */}
      <footer
        style={{
          borderTop: "1px solid var(--border-dim)",
          padding: "20px 24px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            color: "var(--text-faint)",
            fontSize: 12,
            fontFamily: "var(--font-geist-mono), monospace",
            margin: 0,
          }}
        >
          mdcore v0.1.0 · Rust + WASM · powered by{" "}
          <a
            href="https://mdcore.ai"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--text-muted)", textDecoration: "none" }}
          >
            mdcore.ai
          </a>
        </p>
      </footer>
    </div>
  );
}
