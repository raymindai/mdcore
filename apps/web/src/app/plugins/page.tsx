import type { Metadata } from "next";
import Link from "next/link";
import { DocsNav, SiteFooter } from "@/components/docs";

export const metadata: Metadata = {
  title: "Plugins — mdfy.cc",
  description:
    "CLI tool, Mac app, Chrome extension, VS Code extension, QuickLook. Bring mdfy.cc everywhere.",
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
      <DocsNav active="plugins" />

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
              steps: "ChatGPT researches \u2192 Extension captures \u2192 mdfy.cc/abc123 \u2192 Paste URL in Claude \u2192 Claude refines",
              why: "Move knowledge between AIs without copy-paste formatting nightmares. The document is the bridge.",
              color: "var(--accent)",
            },
            {
              scenario: "Capture \u2192 Publish \u2192 Share in 3 seconds",
              steps: "See a great AI response \u2192 Click mdfy button \u2192 Beautiful URL auto-generated \u2192 Send to anyone",
              why: "Recipient sees a polished document, not a raw chat screenshot. No app needed to view it.",
              color: "var(--text-success, #4ade80)",
            },
            {
              scenario: "AI-readable document references",
              steps: "Publish to mdfy.cc/abc123 \u2192 Tell any AI \"read mdfy.cc/abc123\" \u2192 AI fetches and understands",
              why: "mdfy.cc URLs work as context for any AI. Your documents become reusable knowledge across conversations.",
              color: "var(--text-muted)",
            },
            {
              scenario: "Preview any .md file in Finder",
              steps: "Select file \u2192 Press Space \u2192 Full rendering with code, math, diagrams \u2192 Click \"Open in mdfy.cc\" to edit",
              why: "macOS QuickLook shows raw Markdown by default. mdfy QuickLook shows it beautifully rendered.",
              color: "var(--text-secondary)",
            },
            {
              scenario: "Publish from your editor",
              steps: "Write in VS Code \u2192 Cmd+Shift+M preview \u2192 One command to publish \u2192 Share URL with team",
              why: "Never leave your editor. Write, preview, publish. The URL updates when you push changes.",
              color: "var(--accent)",
            },
            {
              scenario: "Build reports from multiple AI sessions",
              steps: "Capture ChatGPT analysis \u2192 Capture Claude code review \u2192 Capture Gemini summary \u2192 Combine in mdfy.cc \u2192 Single URL",
              why: "Each AI has strengths. Combine outputs from multiple AIs into one professional document.",
              color: "var(--text-muted)",
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
        <div className="about-grid-2" style={{ background: "var(--surface)", border: "1px solid var(--border-dim)", borderRadius: 16, padding: "32px", gap: 32 }}>
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
                    background: "var(--surface)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid var(--border-dim)",
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
                One-click capture from ChatGPT, Claude, and Gemini. Open any GitHub .md file in mdfy.cc for beautiful rendering.
                Turn AI conversations into shareable documents. The captured URL works as context in other AI conversations.
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

          {/* Screenshots */}
          <div style={{ padding: "0 32px 24px" }}>
            <div className="about-grid-2" style={{ gap: 12 }}>
              {[1, 2, 3, 4].map((n) => (
                <div key={n} style={{ borderRadius: 12, overflow: "hidden", border: "1px solid var(--border-dim)" }}>
                  <img
                    src={`/images/plugin-chrome-${n}.webp`}
                    alt={`mdfy Chrome extension screenshot ${n}`}
                    className="lightbox-img"
                    style={{ width: "100%", display: "block" }}
                  />
                </div>
              ))}
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
                title: "Platform Support",
                items: ["ChatGPT (chat.openai.com)", "Claude (claude.ai)", "Gemini (gemini.google.com)", "GitHub \u2014 any .md file"],
              },
              {
                title: "Capture Methods",
                items: ["Hover button \u2014 single AI response", "Popup \u2014 full conversation or selection", "GitHub \u2014 Open in mdfy.cc button", "Right-click \u2014 any selected text"],
              },
              {
                title: "Smart Conversion",
                items: ["HTML \u2192 clean Markdown", "Code blocks preserved", "Tables, lists, headings", "User/Assistant formatting"],
              },
              {
                title: "Seamless Transfer",
                items: ["Small content \u2192 URL hash (instant)", "Large content \u2192 clipboard + toast", "Gzip compression (same as mdfy.cc)", "Opens in mdfy.cc editor"],
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
              Install
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { step: "1", text: "Download the extension package below" },
                { step: "2", text: "Unzip the downloaded file" },
                { step: "3", text: "Open chrome://extensions and enable Developer Mode (top right toggle)" },
                { step: "4", text: "Click \"Load unpacked\" and select the unzipped folder" },
                { step: "5", text: "Visit ChatGPT, Claude, or Gemini \u2014 the mdfy button appears" },
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
            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <a
                href="/downloads/mdfy-chrome-extension-v2.0.0.zip"
                download
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "var(--accent)",
                  color: "var(--background)",
                  padding: "10px 24px",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download v2.0.0
              </a>
              <span style={{ fontSize: 12, color: "var(--text-faint)", alignSelf: "center" }}>42 KB</span>
            </div>
            <p style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 12, marginBottom: 0 }}>
              Chrome Web Store listing coming soon.
            </p>
          </div>
        </div>
      </section>

      {/* ───────── MCP SERVER ───────── */}
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
                    background: "var(--surface)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid var(--border-dim)",
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                    <path d="M2 17l10 5 10-5"/>
                    <path d="M2 12l10 5 10-5"/>
                  </svg>
                </div>
                <div>
                  <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                    MCP Server
                  </h2>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
                    mdfy-mcp on npm
                  </p>
                </div>
              </div>
              <p style={{ fontSize: 15, color: "var(--text-tertiary)", maxWidth: 480, lineHeight: 1.7, margin: 0 }}>
                Connect any AI tool to mdfy.cc. Create, read, update, and manage documents programmatically.
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
                Available on npm
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
                TypeScript
              </span>
            </div>
          </div>

          {/* MCP screenshot */}
          <div style={{ padding: "0 32px 24px" }}>
            <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid var(--border-dim)" }}>
              <img src="/images/plugin-mcp.png" alt="mdfy MCP server — Claude creating a document via mdfy_create" style={{ width: "100%", display: "block" }} />
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
                title: "25 MCP Tools",
                items: ["6 core CRUD -- create, read, update, delete, list, search", "Append/prepend -- grow logs and journals", "Sections -- outline, extract, replace by heading", "Sharing -- password, expiry, email allowlist", "Versions -- history, restore, diff", "Folders, stats, recent, duplicate, import URL"],
              },
              {
                title: "Compatibility",
                items: ["Claude Web (claude.ai) -- hosted HTTP MCP", "Claude Desktop / Claude Code -- stdio", "Cursor / Windsurf / Zed -- HTTP or stdio", "ChatGPT, Gemini, and any MCP client"],
              },
              {
                title: "Developer Experience",
                items: ["Auto-managed edit tokens", "Zero config -- just npx mdfy-mcp", "JSON in, JSON out", "Full REST API fallback"],
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

          {/* Install */}
          <div style={{ padding: "28px 32px", borderTop: "1px solid var(--border-dim)" }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16, marginTop: 0 }}>
              Install
            </h3>

            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginTop: 0, marginBottom: 8 }}>
              Option A — Claude Web / Cursor (hosted, no install)
            </p>
            <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 12, marginTop: 0 }}>
              Add this URL in your client&apos;s MCP / Connectors settings:
            </p>
            <pre
              style={{
                background: "var(--background)",
                borderRadius: 10,
                padding: "14px 18px",
                fontSize: 13,
                fontFamily: "'SF Mono', 'Fira Code', 'JetBrains Mono', monospace",
                color: "var(--text-secondary)",
                margin: "0 0 24px",
                border: "1px solid var(--border-dim)",
              }}
            >
              <code>https://mdfy.cc/api/mcp</code>
            </pre>

            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginTop: 0, marginBottom: 8 }}>
              Option B — Claude Desktop / Claude Code (local stdio)
            </p>
            <p
              style={{
                fontSize: 14,
                color: "var(--text-muted)",
                marginBottom: 12,
                marginTop: 0,
              }}
            >
              Create{" "}
              <code
                style={{
                  background: "var(--surface)",
                  padding: "2px 6px",
                  borderRadius: 4,
                  fontSize: 13,
                  fontFamily: "'SF Mono', 'Fira Code', 'JetBrains Mono', monospace",
                  color: "var(--accent)",
                }}
              >
                .mcp.json
              </code>{" "}
              in your project:
            </p>
            <pre
              style={{
                background: "var(--background)",
                borderRadius: 10,
                padding: "18px 20px",
                overflow: "auto",
                fontSize: 13,
                lineHeight: 1.7,
                fontFamily: "'SF Mono', 'Fira Code', 'JetBrains Mono', monospace",
                color: "var(--text-secondary)",
                margin: 0,
                border: "1px solid var(--border-dim)",
              }}
            >
              <code>{`{
  "mcpServers": {
    "mdfy": {
      "command": "npx",
      "args": ["mdfy-mcp"]
    }
  }
}`}</code>
            </pre>
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <a
                href="https://www.npmjs.com/package/mdfy-mcp"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-block",
                  background: "var(--accent)",
                  color: "var(--background)",
                  padding: "10px 24px",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                View on npm
              </a>
              <Link
                href="/docs"
                style={{
                  display: "inline-block",
                  background: "var(--accent-dim)",
                  color: "var(--accent)",
                  padding: "10px 24px",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                Full API Reference
              </Link>
            </div>
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
                    background: "var(--surface)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid var(--border-dim)",
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round">
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

          {/* Screenshot */}
          <div style={{ padding: "0 32px 24px" }}>
            <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid var(--border-dim)" }}>
              <img
                src="/images/plugin-vscode.png"
                alt="mdfy VS Code extension — WYSIWYG preview with cloud sync"
                style={{ width: "100%", display: "block", borderRadius: 12 }}
              />
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
                items: ["Status bar: \u2713 synced / \u2191 pushing / \u2193 pulling", "OAuth login via browser redirect", ".mdfy.json sidecar for sync metadata", "Publish from command palette", "Sidebar with local/synced/cloud document bridge", "CodeMirror source view with GFM syntax highlighting", "View mode switcher (Live/Source)"],
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
              Install
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { step: "1", text: "Download the .vsix file below" },
                { step: "2", text: "Open VS Code, go to Extensions (Cmd+Shift+X)" },
                { step: "3", text: "Click \u2022\u2022\u2022 menu > Install from VSIX... > select the downloaded file" },
                { step: "4", text: "Open any .md file > Cmd+Shift+M to preview" },
              ].map((s) => (
                <div key={s.step} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <span style={{ width: 22, height: 22, borderRadius: 6, background: "var(--accent-dim)", color: "var(--accent)", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{s.step}</span>
                  <span style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>{s.text}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <a
                href="/downloads/mdfy-vscode-1.0.1.vsix"
                download
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "var(--accent)",
                  color: "var(--background)",
                  padding: "10px 24px",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download v1.0.1
              </a>
              <span style={{ fontSize: 12, color: "var(--text-faint)", alignSelf: "center" }}>298 KB (.vsix)</span>
            </div>
            <p style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 12, marginBottom: 0 }}>
              VS Code Marketplace listing coming soon.
            </p>
          </div>
        </div>
      </section>

      {/* ───────── DESKTOP APP ───────── */}
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
                    background: "var(--surface)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid var(--border-dim)",
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2"/>
                    <path d="M8 21h8M12 17v4"/>
                  </svg>
                </div>
                <div>
                  <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                    mdfy for Mac
                  </h2>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
                    Desktop app — Electron
                  </p>
                </div>
              </div>
              <p style={{ fontSize: 15, color: "var(--text-tertiary)", maxWidth: 480, lineHeight: 1.7, margin: 0 }}>
                Native macOS desktop app with full mdfy.cc editing, local file support, and drag-and-drop import for PDF, Word, PowerPoint, Excel, and 10+ formats. Double-click any .md file to open it in mdfy.
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <span style={{ padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "var(--accent-dim)", color: "var(--accent)" }}>Free</span>
              <span style={{ padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "var(--toggle-bg)", color: "var(--text-faint)" }}>Electron</span>
            </div>
          </div>

          {/* Screenshot */}
          <div style={{ padding: "0 32px 24px" }}>
            <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid var(--border-dim)" }}>
              <img
                src="/images/plugin-desktop.png"
                alt="mdfy for Mac — native desktop app with sidebar"
                style={{ width: "100%", display: "block", borderRadius: 12 }}
              />
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
                title: "Native File Integration",
                items: ["Double-click .md to open in mdfy", "Drag & drop any supported format", "Save back to local file (Cmd+Shift+S)", "Recent files dashboard"],
              },
              {
                title: "Multi-Format Import",
                items: ["Markdown, PDF, Word (.docx)", "PowerPoint (.pptx), Excel (.xlsx)", "HTML, CSV, JSON, XML, LaTeX", "RTF, reStructuredText, plain text"],
              },
              {
                title: "Full mdfy.cc Editor",
                items: ["WYSIWYG + Source editing modes", "Cloud sync and sharing", "All rendering: code, math, diagrams", "Dark/Light theme"],
              },
              {
                title: "Desktop Experience",
                items: ["Native macOS title bar", "Single-instance with file handoff", "Keyboard shortcuts (Cmd+N/O/S)", "Offline fallback when disconnected"],
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
              Install
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { step: "1", text: "Download the DMG file below" },
                { step: "2", text: "Open the DMG and drag mdfy to Applications" },
                { step: "3", text: "Launch mdfy from Applications" },
              ].map((s) => (
                <div key={s.step} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <span style={{ width: 22, height: 22, borderRadius: 6, background: "var(--accent-dim)", color: "var(--accent)", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{s.step}</span>
                  <span style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>{s.text}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <a
                href="https://github.com/raymindai/mdcore/releases/download/v2.0.0/mdfy-2.0.0-universal.dmg"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "var(--accent)",
                  color: "var(--background)",
                  padding: "10px 24px",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download v2.0.0 for Mac
              </a>
              <span style={{ fontSize: 12, color: "var(--text-faint)", alignSelf: "center" }}>174 MB (Universal — Intel + Apple Silicon)</span>
            </div>
            <p style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 12, marginBottom: 0 }}>
              macOS 13 (Ventura) or later required.
            </p>
          </div>
        </div>
      </section>

      {/* ───────── CLI TOOL ───────── */}
      <section style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px 60px" }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border-dim)", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "36px 32px 28px", borderBottom: "1px solid var(--border-dim)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border-dim)" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"><path d="M4 17l6-6-6-6"/><path d="M12 19h8"/></svg>
                </div>
                <div>
                  <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>CLI Tool</h2>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>mdfy — npm package</p>
                </div>
              </div>
              <p style={{ fontSize: 15, color: "var(--text-tertiary)", maxWidth: 480, lineHeight: 1.7, margin: 0 }}>
                Publish Markdown from your terminal. Pipe from any command — tmux, AI assistants, git log, clipboard. Every output becomes a shareable URL.
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <span style={{ background: "var(--accent-dim)", color: "var(--accent)", padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>npm install -g mdfy</span>
            </div>
          </div>
          {/* Screenshot */}
          <div style={{ padding: "0 32px 24px" }}>
            <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid var(--border-dim)" }}>
              <img
                src="/images/plugin-cli.png"
                alt="mdfy CLI — publish Markdown from the terminal"
                style={{ width: "100%", display: "block", borderRadius: 12 }}
              />
            </div>
          </div>

          <div style={{ padding: "24px 32px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              {[
                { cmd: "mdfy publish README.md", desc: "Publish a file and get a URL" },
                { cmd: 'echo "# Hello" | mdfy publish', desc: "Publish from stdin (pipe)" },
                { cmd: "tmux capture-pane -p | mdfy publish", desc: "Capture tmux pane" },
                { cmd: "pbpaste | mdfy publish", desc: "Publish clipboard contents" },
                { cmd: "mdfy pull abc123 -o doc.md", desc: "Download a document" },
                { cmd: "mdfy list", desc: "List your published documents" },
              ].map((ex) => (
                <div key={ex.cmd} style={{ padding: "12px 16px", borderRadius: 8, border: "1px solid var(--border-dim)", background: "var(--background)" }}>
                  <code style={{ fontSize: 12, color: "var(--accent)", fontFamily: "var(--font-geist-mono), monospace", display: "block", marginBottom: 4 }}>{ex.cmd}</code>
                  <p style={{ fontSize: 11, color: "var(--text-faint)", margin: 0 }}>{ex.desc}</p>
                </div>
              ))}
            </div>
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
                    background: "var(--surface)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid var(--border-dim)",
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
                Press Space on any .md file in Finder to see it beautifully rendered — GFM tables, syntax highlighting, math, and Mermaid diagrams. Click &ldquo;Open in mdfy&rdquo; to edit in the desktop app or web editor.
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <span style={{ padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "var(--accent-dim)", color: "var(--accent)" }}>Free</span>
              <span style={{ padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "var(--toggle-bg)", color: "var(--text-faint)" }}>Swift</span>
            </div>
          </div>

          {/* Screenshot */}
          <div style={{ padding: "0 32px 24px" }}>
            <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid var(--border-dim)" }}>
              <img
                src="/images/plugin-quicklook.png"
                alt="mdfy QuickLook — press Space in Finder to preview Markdown"
                style={{ width: "100%", display: "block", borderRadius: 12 }}
              />
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
                title: "Full Rendering",
                items: ["GFM tables, task lists, footnotes", "190+ language syntax highlighting", "KaTeX math (inline + display)", "Mermaid diagrams"],
              },
              {
                title: "Offline Ready",
                items: ["Built-in Markdown renderer (no CDN needed)", "CDN enhancement when online", "Graceful fallback for all features", "Works in airplane mode"],
              },
              {
                title: "Native Integration",
                items: ["Matches macOS dark/light appearance", "\"Open in mdfy\" button (desktop app or web)", "Code copy buttons", "Theme toggle in preview"],
              },
              {
                title: "Zero Config",
                items: ["Install once, works system-wide", "All .md / .markdown files supported", "No background processes", "Lightweight QuickLook extension"],
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
              Install
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { step: "1", text: "Open apps/quicklook/MdfyQuickLook in Xcode" },
                { step: "2", text: "Build and run the QuickLookExtension target" },
                { step: "3", text: "Enable \"mdfy QuickLook\" in System Settings > Extensions > Quick Look" },
                { step: "4", text: "Select any .md file in Finder and press Space" },
              ].map((s) => (
                <div key={s.step} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <span style={{ width: 22, height: 22, borderRadius: 6, background: "var(--accent-dim)", color: "var(--accent)", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{s.step}</span>
                  <code style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, fontFamily: "var(--font-geist-mono), monospace" }}>{s.text}</code>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 16, marginBottom: 0 }}>
              Distributable .appex package coming soon.
            </p>
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
            { name: "Slack Bot", desc: "Share documents directly in Slack channels", status: "Planned" },
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
              color: "var(--background)",
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
      <SiteFooter />

      {/* ───────── LIGHTBOX ───────── */}
      <div id="lightbox-overlay" className="lightbox-overlay" />
      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.addEventListener('click', function(e) {
              if (e.target.classList.contains('lightbox-img')) {
                var overlay = document.getElementById('lightbox-overlay');
                overlay.innerHTML = '<img src="' + e.target.src + '" alt="' + (e.target.alt || '') + '" />';
                overlay.classList.add('active');
              }
            });
            document.addEventListener('click', function(e) {
              var overlay = document.getElementById('lightbox-overlay');
              if (e.target === overlay || e.target.parentElement === overlay) {
                overlay.classList.remove('active');
                overlay.innerHTML = '';
              }
            });
            document.addEventListener('keydown', function(e) {
              if (e.key === 'Escape') {
                var overlay = document.getElementById('lightbox-overlay');
                overlay.classList.remove('active');
                overlay.innerHTML = '';
              }
            });
          `,
        }}
      />
    </div>
  );
}
