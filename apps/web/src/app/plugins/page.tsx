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
      <nav style={{ position: "sticky", top: 0, zIndex: 40, borderBottom: "1px solid var(--border-dim)", background: "var(--header-bg)", backdropFilter: "blur(12px)" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <Link href="/" style={{ textDecoration: "none" }}>
              <span style={{ color: "var(--accent)", fontSize: 22, fontWeight: 800 }}>md</span>
              <span style={{ color: "var(--text-primary)", fontSize: 22, fontWeight: 800 }}>fy</span>
              <span style={{ color: "var(--text-muted)", fontSize: 22, fontWeight: 800 }}>.cc</span>
            </Link>
            <div style={{ display: "flex", gap: 16 }}>
              <Link href="/about" style={{ color: "var(--text-muted)", fontSize: 13, textDecoration: "none" }}>About</Link>
              <Link href="/plugins" style={{ color: "var(--accent)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Plugins</Link>
            </div>
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <a href="https://github.com/raymindai/mdcore" target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-muted)", fontSize: 13, textDecoration: "none" }}>GitHub</a>
            <Link href="/" style={{ background: "var(--accent-dim)", color: "var(--accent)", padding: "6px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Open Editor</Link>
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
          Capture from any AI, preview in Finder, publish from your editor.
          Every document gets a permanent URL — editable, versioned, and readable by humans and AIs across every platform.
        </p>
      </section>

      {/* ───────── USE CASES ───────── */}
      <section style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px 60px" }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 24, fontFamily: "var(--font-geist-mono), monospace" }}>
          What you can do
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {[
            {
              scenario: "Research across AIs",
              steps: "ChatGPT researches → Extension captures → mdfy.cc/abc123 → Paste URL in Claude → Claude refines",
              why: "Move knowledge between AIs without copy-paste formatting nightmares. The document is the bridge.",
              color: "#fb923c",
            },
            {
              scenario: "Capture → Publish → Share in 3 seconds",
              steps: "See a great AI response → Click mdfy button → Beautiful URL auto-generated → Send to anyone",
              why: "Recipient sees a polished document, not a raw chat screenshot. No app needed to view it.",
              color: "#4ade80",
            },
            {
              scenario: "AI-readable document references",
              steps: "Publish to mdfy.cc/abc123 → Tell any AI \"read mdfy.cc/abc123\" → AI fetches and understands",
              why: "mdfy.cc URLs work as context for any AI. Your documents become reusable knowledge across conversations.",
              color: "#c4b5fd",
            },
            {
              scenario: "Preview any .md file in Finder",
              steps: "Select file → Press Space → Full rendering with code, math, diagrams → Click \"Open in mdfy.cc\" to edit",
              why: "macOS QuickLook shows raw Markdown by default. mdfy QuickLook shows it beautifully rendered.",
              color: "#60a5fa",
            },
            {
              scenario: "Publish from your editor",
              steps: "Write in VS Code → Cmd+Shift+M preview → One command to publish → Share URL with team",
              why: "Never leave your editor. Write, preview, publish. The URL updates when you push changes.",
              color: "#fbbf24",
            },
            {
              scenario: "Build reports from multiple AI sessions",
              steps: "Capture ChatGPT analysis → Capture Claude code review → Capture Gemini summary → Combine in mdfy.cc → Single URL",
              why: "Each AI has strengths. Combine outputs from multiple AIs into one professional document.",
              color: "#f472b6",
            },
          ].map((uc) => (
            <div key={uc.scenario} style={{ background: "var(--surface)", border: "1px solid var(--border-dim)", borderRadius: 14, padding: "24px" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 8px" }}>{uc.scenario}</h3>
              <p style={{ fontSize: 11, color: uc.color, margin: "0 0 10px", fontFamily: "var(--font-geist-mono), monospace", lineHeight: 1.5 }}>{uc.steps}</p>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, lineHeight: 1.6 }}>{uc.why}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────── SHORT URL AS AI REFERENCE ───────── */}
      <section style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px 60px" }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border-dim)", borderRadius: 16, padding: "32px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 12px" }}>
              Short URLs that AIs can read
            </h2>
            <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 16px", lineHeight: 1.7 }}>
              Every mdfy.cc document has a short URL. Share it with humans or paste it into any AI conversation.
              Claude, ChatGPT, and Gemini can all fetch and understand the content — your documents become
              reusable context across AI sessions and platforms.
            </p>
            <p style={{ fontSize: 13, color: "var(--text-faint)", margin: 0, lineHeight: 1.6 }}>
              No login wall. No paywall. The URL works everywhere — browsers, AI chats, Slack, email, embeds.
            </p>
          </div>
          <div style={{ background: "var(--background)", borderRadius: 12, padding: "20px", border: "1px solid var(--border-dim)" }}>
            <p style={{ fontSize: 11, fontFamily: "var(--font-geist-mono), monospace", color: "var(--text-faint)", margin: "0 0 12px" }}>Example</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border-dim)", fontSize: 13, fontFamily: "var(--font-geist-mono), monospace" }}>
                <span style={{ color: "var(--text-faint)" }}>You:</span>{" "}
                <span style={{ color: "var(--text-secondary)" }}>Read mdfy.cc/abc123 and summarize the key points</span>
              </div>
              <div style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border-dim)", fontSize: 13, fontFamily: "var(--font-geist-mono), monospace" }}>
                <span style={{ color: "var(--accent)" }}>AI:</span>{" "}
                <span style={{ color: "var(--text-muted)" }}>Based on the document at mdfy.cc/abc123, here are the key points...</span>
              </div>
              <div style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border-dim)", fontSize: 13, fontFamily: "var(--font-geist-mono), monospace" }}>
                <span style={{ color: "var(--text-faint)" }}>You:</span>{" "}
                <span style={{ color: "var(--text-secondary)" }}>Now compare with mdfy.cc/def456</span>
              </div>
            </div>
          </div>
        </div>
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
                One-click capture from ChatGPT, Claude, and Gemini. Turn any AI conversation into a beautiful, shareable document.
                The captured URL works as context in other AI conversations — move knowledge between AIs effortlessly.
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

      {/* ───────── VS CODE EXTENSION ───────── */}
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
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#007ACC" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M4 4l8 4v8l-8 4V4z"/><path d="M12 8l8-4v16l-8-4"/>
                  </svg>
                </div>
                <div>
                  <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                    VS Code Extension
                  </h2>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
                    mdfy.cc — Markdown Publisher
                  </p>
                </div>
              </div>
              <p style={{ fontSize: 15, color: "var(--text-tertiary)", maxWidth: 480, lineHeight: 1.7, margin: 0 }}>
                WYSIWYG preview with mdfy.cc rendering quality, cloud sync, and real-time collaboration. Edit directly in the rendered view, auto-push on save, and resolve conflicts with the built-in diff editor.
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <span style={{ padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "var(--accent-dim)", color: "var(--accent)" }}>Free</span>
              <span style={{ padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "var(--toggle-bg)", color: "var(--text-faint)" }}>TypeScript</span>
            </div>
          </div>

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
                title: "WYSIWYG Preview",
                items: ["Cmd+Shift+M opens editable preview", "Click and type directly in rendered view", "Toolbar: bold, italic, headings, lists", "Dark/Light theme auto-detection"],
              },
              {
                title: "Cloud Sync",
                items: ["Auto-push on file save (2s debounce)", "Auto-pull when server changes detected", "Configurable polling interval (10-300s)", "Offline queue for failed pushes"],
              },
              {
                title: "Collaboration",
                items: ["Share URL \u2192 anyone can view/edit", "Server changes pull to local file", "Conflict detection \u2192 VS Code diff editor", "Three merge options: pull/push/diff"],
              },
              {
                title: "Editor Integration",
                items: ["Status bar: \u2713 synced / \u2191 pushing / \u2193 pulling", "OAuth login via browser redirect", ".mdfy.json sidecar for sync metadata", "Publish from command palette"],
              },
            ].map((section) => (
              <div key={section.title} style={{ background: "var(--surface)", padding: "24px 28px" }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12, marginTop: 0 }}>{section.title}</h3>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {section.items.map((item) => (
                    <li key={item} style={{ fontSize: 13, color: "var(--text-muted)", padding: "4px 0", display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <span style={{ color: "var(--accent)", flexShrink: 0 }}>+</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div style={{ padding: "28px 32px", borderTop: "1px solid var(--border-dim)" }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16, marginTop: 0 }}>
              Install (Development)
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { step: "1", text: "cd apps/vscode-extension && npm install" },
                { step: "2", text: "npm run compile" },
                { step: "3", text: "Press F5 in VS Code to launch Extension Development Host" },
                { step: "4", text: "Open any .md file \u2192 Cmd+Shift+M to preview" },
                { step: "5", text: "Run \"mdfy: Login\" to connect your account" },
              ].map((s) => (
                <div key={s.step} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <span style={{ width: 22, height: 22, borderRadius: 6, background: "var(--accent-dim)", color: "var(--accent)", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{s.step}</span>
                  <code style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, fontFamily: "var(--font-geist-mono), monospace" }}>{s.text}</code>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 16, marginBottom: 0 }}>
              VS Code Marketplace submission coming soon.
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
      <footer style={{ borderTop: "1px solid var(--border-dim)" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "48px 24px 32px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 48, marginBottom: 40 }}>
            <div>
              <div style={{ marginBottom: 12 }}>
                <span style={{ color: "var(--accent)", fontSize: 18, fontWeight: 800 }}>md</span>
                <span style={{ color: "var(--text-primary)", fontSize: 18, fontWeight: 800 }}>fy</span>
                <span style={{ color: "var(--text-faint)", fontSize: 18, fontWeight: 800 }}>.cc</span>
              </div>
              <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, margin: 0, maxWidth: 260 }}>
                The fastest way from thought to shared document.
                Permanent URL. Always editable. Cross-AI.
              </p>
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 14, marginTop: 0, fontFamily: "var(--font-geist-mono), monospace", letterSpacing: 1, textTransform: "uppercase" }}>Product</p>
              {[
                { label: "Editor", href: "/" },
                { label: "About", href: "/about" },
                { label: "Plugins", href: "/plugins" },
                { label: "Pricing", href: "/about#pricing" },
              ].map((l) => (
                <Link key={l.label} href={l.href} style={{ display: "block", fontSize: 13, color: "var(--text-faint)", textDecoration: "none", padding: "3px 0" }}>{l.label}</Link>
              ))}
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 14, marginTop: 0, fontFamily: "var(--font-geist-mono), monospace", letterSpacing: 1, textTransform: "uppercase" }}>Resources</p>
              {[
                { label: "GitHub", href: "https://github.com/raymindai/mdcore" },
                { label: "Chrome Extension", href: "/plugins" },
                { label: "VS Code Extension", href: "/plugins" },
              ].map((l) => (
                <a key={l.label} href={l.href} style={{ display: "block", fontSize: 13, color: "var(--text-faint)", textDecoration: "none", padding: "3px 0" }}>{l.label}</a>
              ))}
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 14, marginTop: 0, fontFamily: "var(--font-geist-mono), monospace", letterSpacing: 1, textTransform: "uppercase" }}>Company</p>
              {[
                { label: "Contact", href: "mailto:hi@raymind.ai" },
                { label: "Twitter / X", href: "#" },
                { label: "Terms of Service", href: "#" },
                { label: "Privacy Policy", href: "#" },
              ].map((l) => (
                <a key={l.label} href={l.href} style={{ display: "block", fontSize: 13, color: "var(--text-faint)", textDecoration: "none", padding: "3px 0" }}>{l.label}</a>
              ))}
            </div>
          </div>
          <div style={{ borderTop: "1px solid var(--border-dim)", paddingTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <p style={{ fontSize: 12, color: "var(--text-faint)", fontFamily: "var(--font-geist-mono), monospace", margin: 0 }}>
              A product of{" "}
              <a href="https://raymind.ai" target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-muted)", textDecoration: "none" }}>Raymind.AI</a>
            </p>
            <p style={{ fontSize: 11, color: "var(--text-faint)", fontFamily: "var(--font-geist-mono), monospace", margin: 0 }}>
              &copy; 2026 mdfy.cc. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
