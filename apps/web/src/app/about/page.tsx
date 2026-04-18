import type { Metadata } from "next";
import Link from "next/link";
import MdfyLogo from "@/components/MdfyLogo";

export const metadata: Metadata = {
  title: "About — mdfy.cc",
  description:
    "mdfy.cc — Your Markdown, Beautifully Published. Import anything, render beautifully, share instantly. Powered by Rust + WASM.",
  openGraph: {
    title: "About — mdfy.cc",
    description:
      "Import anything. Render beautifully. Share instantly. Powered by Rust + WASM.",
    url: "https://mdfy.cc/about",
  },
};

const features = [
  {
    label: "WYSIWYG Editing",
    desc: "Edit directly in the rendered preview. Bold, italic, headings, lists — click and type like a word processor.",
    color: "#fb923c",
  },
  {
    label: "Multi-Format Import",
    desc: "PDF, Word, PowerPoint, Excel, HTML, CSV, LaTeX, RST, RTF — drop any file and get Markdown.",
    color: "#4ade80",
  },
  {
    label: "AI mdfy",
    desc: "AI-powered structuring turns raw text into clean Markdown with headings, tables, lists, and code blocks.",
    color: "#c4b5fd",
  },
  {
    label: "Full Export",
    desc: "Download as MD, HTML, TXT. Print to PDF. Copy as rich text for Google Docs, Email, or Slack.",
    color: "#60a5fa",
  },
  {
    label: "GFM + KaTeX + Mermaid",
    desc: "Tables, task lists, math equations, diagrams — every Markdown flavor rendered beautifully.",
    color: "#f472b6",
  },
  {
    label: "Flavor Conversion",
    desc: "Convert between GFM, CommonMark, and Obsidian flavors with one click.",
    color: "#fbbf24",
  },
  {
    label: "190+ Languages",
    desc: "Syntax highlighting via highlight.js. Every programming language you write in.",
    color: "#34d399",
  },
  {
    label: "Share Instantly",
    desc: "One click generates a short URL. Anyone can view your beautifully rendered document.",
    color: "#f87171",
  },
  {
    label: "Folders + Trash",
    desc: "Organize documents in folders. Drag and drop to move. Soft delete with restore from trash.",
    color: "#a78bfa",
  },
  {
    label: "Cloud Sync",
    desc: "Sign in to save documents to the cloud. Access from any device, anywhere.",
    color: "#38bdf8",
  },
  {
    label: "CLI Output Support",
    desc: "Paste output from Claude Code or any terminal. Unicode tables and checkmarks auto-convert to Markdown.",
    color: "#fb7185",
  },
  {
    label: "Dark / Light",
    desc: "Two carefully crafted themes. Your preference is saved locally.",
    color: "#94a3b8",
  },
  {
    label: "Document Sharing",
    desc: "Share publicly via URL or restrict to specific people. Toggle between Private and Shared states anytime.",
    color: "#22c55e",
  },
  {
    label: "Multi-Select",
    desc: "Cmd+Click to toggle, Shift+Click for range. Batch move to folders or trash.",
    color: "#a78bfa",
  },
  {
    label: "MCP Server",
    desc: "Let Claude Code, ChatGPT, and other AI tools create and manage documents via mdfy-mcp.",
    color: "#38bdf8",
  },
  {
    label: "VS Code Extension",
    desc: "WYSIWYG preview, sidebar with local/synced/cloud bridge, one-click publish, bidirectional sync.",
    color: "#f472b6",
  },
  {
    label: "Chrome Extension",
    desc: "Capture AI outputs from ChatGPT, Claude, and Gemini with one click. Auto-format and publish.",
    color: "#34d399",
  },
];

const timeline = [
  { marker: "Import", text: "Drop any file — PDF, DOCX, PPTX, or paste from anywhere" },
  { marker: "Engine", text: "Rust parses your Markdown via comrak in ~2ms" },
  { marker: "Render", text: "highlight.js, KaTeX, Mermaid enrich the output" },
  { marker: "Edit", text: "WYSIWYG editing directly in the rendered preview" },
  { marker: "Share", text: "One click generates a short URL with mdfy.cc badge" },
];

export default function AboutPage() {
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
              <MdfyLogo size={22} />
            </Link>
            <div style={{ display: "flex", gap: 16 }}>
              <Link href="/about" style={{ color: "var(--accent)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>About</Link>
              <Link href="/plugins" style={{ color: "var(--text-muted)", fontSize: 13, textDecoration: "none" }}>Plugins</Link>
              <Link href="/docs" style={{ color: "var(--text-muted)", fontSize: 13, textDecoration: "none" }}>API</Link>
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
          padding: "100px 24px 80px",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -120,
            right: -200,
            width: 600,
            height: 600,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(251,146,60,0.06) 0%, transparent 60%)",
            pointerEvents: "none",
          }}
        />

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
          About mdfy.cc
        </p>

        <h1
          style={{
            fontSize: "clamp(36px, 5vw, 56px)",
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            color: "var(--text-primary)",
            maxWidth: 720,
            margin: 0,
          }}
        >
          Your Markdown, Beautifully Published.
          <br />
          <span style={{ color: "var(--accent)" }}>View. Edit. Share. Instantly.</span>
        </h1>

        <p
          style={{
            fontSize: 18,
            lineHeight: 1.7,
            color: "var(--text-tertiary)",
            maxWidth: 600,
            marginTop: 28,
          }}
        >
          Figma changed design by making it shareable via URL. mdfy does the same for documents.
          Drop any file — PDF, Word, PowerPoint — or just paste. Get a beautiful, editable document
          with a permanent URL. No install needed to view. Edit from anywhere — browser, VS Code, Mac, or mobile.
        </p>
      </section>

      {/* ───────── WHAT IS MDFY ───────── */}
      <section style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px 80px" }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border-dim)", borderRadius: 20, padding: "48px 40px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -100, left: -100, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(251,146,60,0.08) 0%, transparent 60%)", pointerEvents: "none" }} />
          <h2 style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary)", margin: "0 0 32px", textAlign: "center" }}>
            Write anywhere. Read everywhere.
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            {[
              { icon: "WRITE", color: "#fb923c", title: "Create from anywhere", items: ["Browser editor at mdfy.cc", "VS Code extension", "Mac desktop app", "CLI: mdfy publish", "Paste, drag & drop, import"] },
              { icon: "SHARE", color: "#4ade80", title: "One URL, works everywhere", items: ["Send to anyone — no app needed", "Paste URL in Slack, email, docs", "Embed in websites (iframe)", "QR code for mobile", "Password protect or set expiry"] },
              { icon: "READ", color: "#60a5fa", title: "Consume in any context", items: ["Browser — full rendered view", "AI — paste URL as context", "Terminal: mdfy read <id>", "Finder — Space to preview", "API — programmatic access"] },
            ].map((col) => (
              <div key={col.title}>
                <div style={{ fontSize: 11, fontWeight: 700, color: col.color, letterSpacing: 2, marginBottom: 12, fontFamily: "var(--font-geist-mono), monospace" }}>{col.icon}</div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 16px" }}>{col.title}</h3>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {col.items.map((item) => (
                    <li key={item} style={{ fontSize: 14, color: "var(--text-muted)", padding: "5px 0", borderBottom: "1px solid var(--border-dim)", lineHeight: 1.5 }}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── REAL USE CASES ───────── */}
      <section style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px 80px" }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 32, fontFamily: "var(--font-geist-mono), monospace" }}>
          How people use mdfy
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {[
            {
              title: "AI output → shareable doc in 3 seconds",
              desc: "Claude writes a technical spec. You type \"publish this to mdfy\" → URL generated → paste in Slack. Recipient sees a polished document, not a chat screenshot.",
              code: 'claude "write API spec" → mdfy_create → mdfy.cc/d/abc123',
              color: "#fb923c",
            },
            {
              title: "Terminal → document",
              desc: "Capture any terminal output — git log, test results, AI conversations — and instantly publish. Share debugging sessions with your team.",
              code: "git log --oneline -20 | mdfy publish\ntmux capture-pane -p | mdfy capture",
              color: "#4ade80",
            },
            {
              title: "Document → AI context",
              desc: "Published a research doc? Paste the URL in any AI conversation. Claude, ChatGPT, Gemini can all read it. Your documents become reusable knowledge.",
              code: '"Read mdfy.cc/d/abc123 and summarize"\n→ AI fetches and understands the full document',
              color: "#60a5fa",
            },
            {
              title: "Document → terminal",
              desc: "Read any mdfy document right in your terminal. Rendered with colors, headings, code blocks. Pipe to less, grep, or other tools.",
              code: "mdfy read abc123\nmdfy read abc123 | grep \"API\"\ncurl mdfy.cc/d/abc123.md",
              color: "#c4b5fd",
            },
            {
              title: "Cross-AI workflow",
              desc: "ChatGPT researches a topic → capture with Chrome extension → URL created → paste in Claude → Claude refines → update same URL. One document, multiple AIs.",
              code: "ChatGPT → Chrome ext → mdfy.cc/d/xyz\n→ Claude reads → refines → mdfy update",
              color: "#fbbf24",
            },
            {
              title: "Write in editor, share instantly",
              desc: "Write in VS Code or mdfy Mac app. One command to publish. The URL auto-updates when you save. Your team always sees the latest version.",
              code: "VS Code: Cmd+Alt+P → Published!\nMac app: Publish button → URL copied",
              color: "#f472b6",
            },
          ].map((uc) => (
            <div key={uc.title} style={{ background: "var(--surface)", border: "1px solid var(--border-dim)", borderRadius: 14, padding: "24px", display: "flex", flexDirection: "column", gap: 12 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>{uc.title}</h3>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, lineHeight: 1.6 }}>{uc.desc}</p>
              <pre style={{ margin: 0, padding: "10px 14px", borderRadius: 8, background: "var(--background)", border: "1px solid var(--border-dim)", fontSize: 11, fontFamily: "var(--font-geist-mono), monospace", color: uc.color, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{uc.code}</pre>
            </div>
          ))}
        </div>
      </section>

      {/* ───────── AI INTEGRATION ───────── */}
      <section style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px 80px" }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 24, fontFamily: "var(--font-geist-mono), monospace" }}>
          Publish from any AI
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {[
            {
              ai: "Claude",
              method: "MCP Server",
              how: "Connect mdfy MCP server to Claude Code or Claude Desktop. Say \"publish this to mdfy\" and Claude creates a shareable URL directly.",
              setup: "npx @mdcore/mcp",
              example: "\"Publish this analysis to mdfy\"\n\u2192 mdfy_create tool \u2192 mdfy.cc/d/abc123",
              color: "#fb923c",
            },
            {
              ai: "ChatGPT",
              method: "Custom GPT",
              how: "Use the mdfy GPT in ChatGPT. Ask it to publish any response, read existing documents, or create formatted reports from conversations.",
              setup: "chatgpt.com/g/g-69e2832dd74081919c09a9f8d03adc59",
              example: "\"Turn this into a shareable doc\"\n\u2192 API call \u2192 mdfy.cc/d/xyz789",
              color: "#4ade80",
            },
            {
              ai: "Any AI",
              method: "Chrome Extension",
              how: "One-click capture from ChatGPT, Claude, or Gemini web interface. The extension detects AI conversations and formats them automatically.",
              setup: "Chrome Web Store",
              example: "Click mdfy icon \u2192 Captured!\n\u2192 mdfy.cc/d/def456 (URL copied)",
              color: "#60a5fa",
            },
          ].map((item) => (
            <div key={item.ai} style={{ background: "var(--surface)", border: "1px solid var(--border-dim)", borderRadius: 14, padding: "24px", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: item.color }}>{item.ai}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-faint)", background: "var(--background)", padding: "2px 8px", borderRadius: 4, fontFamily: "var(--font-geist-mono), monospace" }}>{item.method}</span>
              </div>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, lineHeight: 1.6, flex: 1 }}>{item.how}</p>
              <div style={{ fontSize: 11, color: "var(--text-faint)", fontFamily: "var(--font-geist-mono), monospace" }}>{item.setup}</div>
              <pre style={{ margin: 0, padding: "10px 14px", borderRadius: 8, background: "var(--background)", border: "1px solid var(--border-dim)", fontSize: 11, fontFamily: "var(--font-geist-mono), monospace", color: item.color, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{item.example}</pre>
            </div>
          ))}
        </div>
      </section>

      {/* ───────── ECOSYSTEM ───────── */}
      <section style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px 80px" }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 24, fontFamily: "var(--font-geist-mono), monospace" }}>
          Available everywhere
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {[
            { name: "Web Editor", desc: "mdfy.cc", icon: "BROWSER" },
            { name: "VS Code", desc: "Extension", icon: "VSCODE" },
            { name: "Mac App", desc: "Desktop", icon: "MAC" },
            { name: "CLI", desc: "npm install -g mdfy-cli", icon: "CLI" },
            { name: "Chrome", desc: "AI capture", icon: "CHROME" },
            { name: "QuickLook", desc: "Finder preview", icon: "FINDER" },
            { name: "MCP Server", desc: "AI tool use", icon: "AI" },
            { name: "REST API", desc: "Programmatic", icon: "API" },
          ].map((p) => (
            <div key={p.name} style={{ background: "var(--surface)", border: "1px solid var(--border-dim)", borderRadius: 10, padding: "16px", textAlign: "center" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", letterSpacing: 1, marginBottom: 8, fontFamily: "var(--font-geist-mono), monospace" }}>{p.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{p.name}</div>
              <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>{p.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ───────── FIGMA COMPARISON ───────── */}
      <section style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px 80px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border-dim)", borderRadius: 14, padding: "28px 24px" }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-faint)", marginTop: 0, marginBottom: 16, textDecoration: "line-through" }}>Before mdfy</h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10, fontSize: 14, color: "var(--text-faint)" }}>
              <li>- .md files are raw text nobody wants to read</li>
              <li>- Copy to Google Docs → formatting breaks</li>
              <li>- Share via Slack → looks like code</li>
              <li>- Different AIs, different formats</li>
              <li>- Edit requires VS Code or terminal</li>
              <li>- Version control? Manual backups</li>
            </ul>
          </div>
          <div style={{ background: "var(--surface)", border: "1px solid var(--accent)", borderRadius: 14, padding: "28px 24px" }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--accent)", marginTop: 0, marginBottom: 16 }}>With mdfy</h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10, fontSize: 14, color: "var(--text-secondary)" }}>
              <li><span style={{ color: "var(--accent)" }}>+</span> Every .md gets a beautiful, shareable URL</li>
              <li><span style={{ color: "var(--accent)" }}>+</span> Edit in browser — no install, no login to view</li>
              <li><span style={{ color: "var(--accent)" }}>+</span> Works with every AI — ChatGPT, Claude, Gemini</li>
              <li><span style={{ color: "var(--accent)" }}>+</span> Edit from Mac, VS Code, Chrome, or mobile</li>
              <li><span style={{ color: "var(--accent)" }}>+</span> Version history, sharing permissions, access control</li>
              <li><span style={{ color: "var(--accent)" }}>+</span> Import anything — PDF, DOCX, PPTX, paste</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ───────── COMPARISON ───────── */}
      <section style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px 80px" }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 12, fontFamily: "var(--font-geist-mono), monospace" }}>
          How mdfy compares
        </h2>
        <p style={{ fontSize: 14, color: "var(--text-faint)", marginBottom: 32, lineHeight: 1.6 }}>
          mdfy is the only tool that combines WYSIWYG editing, instant publishing, cross-platform sync, and AI integration in one workflow.
        </p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: "var(--font-geist-mono), monospace" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["", "mdfy.cc", "Notion", "HackMD", "GitHub Gist", "Google Docs"].map((h) => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: h === "mdfy.cc" ? 800 : 600, color: h === "mdfy.cc" ? "var(--accent)" : "var(--text-muted)", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { feature: "No signup to publish", mdfy: true, notion: false, hackmd: false, gist: false, gdocs: false },
                { feature: "WYSIWYG editing", mdfy: true, notion: true, hackmd: false, gist: false, gdocs: true },
                { feature: "Markdown source stays local", mdfy: true, notion: false, hackmd: false, gist: false, gdocs: false },
                { feature: "KaTeX math rendering", mdfy: true, notion: true, hackmd: true, gist: false, gdocs: false },
                { feature: "Mermaid diagrams", mdfy: true, notion: false, hackmd: true, gist: false, gdocs: false },
                { feature: "VS Code extension", mdfy: true, notion: false, hackmd: false, gist: true, gdocs: false },
                { feature: "Mac desktop app", mdfy: true, notion: true, hackmd: false, gist: false, gdocs: true },
                { feature: "CLI publish from terminal", mdfy: true, notion: false, hackmd: false, gist: true, gdocs: false },
                { feature: "AI integration (MCP)", mdfy: true, notion: false, hackmd: false, gist: false, gdocs: false },
                { feature: "Chrome extension", mdfy: true, notion: true, hackmd: false, gist: false, gdocs: false },
                { feature: "QuickLook preview", mdfy: true, notion: false, hackmd: false, gist: false, gdocs: false },
                { feature: "Pipe from stdin", mdfy: true, notion: false, hackmd: false, gist: true, gdocs: false },
                { feature: "Custom rendering engine", mdfy: true, notion: true, hackmd: true, gist: false, gdocs: true },
                { feature: "Free forever (core)", mdfy: true, notion: true, hackmd: true, gist: true, gdocs: true },
              ].map((row) => (
                <tr key={row.feature} style={{ borderBottom: "1px solid var(--border-dim)" }}>
                  <td style={{ padding: "10px 16px", color: "var(--text-secondary)", fontSize: 12 }}>{row.feature}</td>
                  {[row.mdfy, row.notion, row.hackmd, row.gist, row.gdocs].map((v, i) => (
                    <td key={i} style={{ padding: "10px 16px", textAlign: "center", fontSize: 14 }}>
                      {v
                        ? <span style={{ color: i === 0 ? "var(--accent)" : "#4ade80" }}>{"\u2713"}</span>
                        : <span style={{ color: "var(--text-faint)", opacity: 0.3 }}>{"\u2014"}</span>
                      }
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ───────── PIPELINE ───────── */}
      <section
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          padding: "0 24px 80px",
        }}
      >
        <h2
          style={{
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "var(--text-muted)",
            marginBottom: 32,
            fontFamily: "var(--font-geist-mono), monospace",
          }}
        >
          How it works
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
            gap: 1,
            background: "var(--border-dim)",
            borderRadius: 16,
            overflow: "hidden",
            border: "1px solid var(--border-dim)",
          }}
        >
          {timeline.map((step, i) => (
            <div
              key={step.marker}
              style={{
                background: "var(--surface)",
                padding: "28px 24px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <span
                  style={{
                    color: "var(--accent)",
                    fontFamily: "var(--font-geist-mono), monospace",
                    fontSize: 12,
                    fontWeight: 700,
                    background: "var(--accent-dim)",
                    padding: "3px 8px",
                    borderRadius: 6,
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  style={{
                    color: "var(--text-primary)",
                    fontSize: 15,
                    fontWeight: 700,
                  }}
                >
                  {step.marker}
                </span>
              </div>
              <p
                style={{
                  color: "var(--text-muted)",
                  fontSize: 13,
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {step.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────── CORE VALUE ───────── */}
      <section style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px 80px" }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 32, fontFamily: "var(--font-geist-mono), monospace" }}>
          Why mdfy.cc
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: 16 }}>
          {/* Permanent Address */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border-dim)", borderRadius: 14, padding: "28px 24px", borderTop: "2px solid var(--accent)" }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 12px" }}>
              Permanent address for every document
            </h3>
            <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 16px", lineHeight: 1.7 }}>
              Every document gets a short, permanent URL — <span style={{ color: "var(--accent)", fontFamily: "var(--font-geist-mono), monospace" }}>mdfy.cc/abc123</span>.
              Bookmark it, embed it, reference it in AI conversations. The URL never changes, even when you edit the content.
            </p>
            <p style={{ fontSize: 13, color: "var(--text-faint)", margin: 0, lineHeight: 1.6 }}>
              Like GitHub gives code a permanent address, mdfy.cc gives documents a permanent address.
            </p>
          </div>

          {/* Editing + Version Tracking */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border-dim)", borderRadius: 14, padding: "28px 24px", borderTop: "2px solid #4ade80" }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 12px" }}>
              Edit anytime, track every version
            </h3>
            <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 16px", lineHeight: 1.7 }}>
              Documents are living. Edit inline with WYSIWYG or switch to source mode.
              Every change is tracked. Revert to any previous version. Share with view or edit access.
            </p>
            <p style={{ fontSize: 13, color: "var(--text-faint)", margin: 0, lineHeight: 1.6 }}>
              Same URL, always up to date. Recipients always see the latest version.
            </p>
          </div>

          {/* Cross-AI / Cross-Platform */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border-dim)", borderRadius: 14, padding: "28px 24px", borderTop: "2px solid #c4b5fd" }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 12px" }}>
              Shared across every AI and platform
            </h3>
            <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 16px", lineHeight: 1.7 }}>
              One URL works everywhere — paste it in ChatGPT, Claude, Gemini, Slack, email, or any browser.
              Humans see a beautiful document. AIs read structured Markdown. Same URL, different views.
            </p>
            <p style={{ fontSize: 13, color: "var(--text-faint)", margin: 0, lineHeight: 1.6 }}>
              No AI company will build a cross-AI publishing layer. That structural gap is our position.
            </p>
          </div>
        </div>
      </section>

      {/* ───────── FEATURES ───────── */}
      <section
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          padding: "0 24px 80px",
        }}
      >
        <h2
          style={{
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "var(--text-muted)",
            marginBottom: 32,
            fontFamily: "var(--font-geist-mono), monospace",
          }}
        >
          What it does
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))",
            gap: 16,
          }}
        >
          {features.map((f) => (
            <div
              key={f.label}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border-dim)",
                borderRadius: 14,
                padding: "24px 22px",
                transition: "border-color 0.2s",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: "var(--font-geist-mono), monospace",
                  color: f.color,
                  background: `${f.color}15`,
                  padding: "3px 10px",
                  borderRadius: 6,
                  marginBottom: 12,
                }}
              >
                {f.label}
              </span>
              <p
                style={{
                  color: "var(--text-tertiary)",
                  fontSize: 13,
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────── IMPORT FORMATS ───────── */}
      <section
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          padding: "0 24px 80px",
        }}
      >
        <h2
          style={{
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "var(--text-muted)",
            marginBottom: 32,
            fontFamily: "var(--font-geist-mono), monospace",
          }}
        >
          Import anything, export everywhere
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
            gap: 16,
          }}
        >
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border-dim)",
              borderRadius: 14,
              padding: "28px 24px",
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginTop: 0, marginBottom: 16 }}>
              Import
            </h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {["MD", "PDF", "DOCX", "PPTX", "XLSX", "HTML", "CSV", "LaTeX", "RST", "RTF", "JSON", "XML", "TXT"].map(f => (
                <span key={f} style={{
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: "var(--font-geist-mono), monospace",
                  color: "var(--accent)",
                  background: "var(--accent-dim)",
                  padding: "4px 10px",
                  borderRadius: 6,
                }}>{f}</span>
              ))}
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.6, marginTop: 16, marginBottom: 0 }}>
              Drag & drop or click Import. AI-powered mdfy option restructures raw text into clean Markdown.
            </p>
          </div>
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border-dim)",
              borderRadius: 14,
              padding: "28px 24px",
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginTop: 0, marginBottom: 16 }}>
              Export
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { cat: "Download", items: "Markdown, HTML, Plain Text" },
                { cat: "Print", items: "PDF via browser print" },
                { cat: "Clipboard", items: "Raw HTML, Rich Text (Docs/Email), Slack, Plain" },
                { cat: "Share", items: "Short URL, QR Code, Embed code" },
              ].map(e => (
                <div key={e.cat}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{e.cat}</span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 8 }}>{e.items}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ───────── TECH ───────── */}
      <section
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          padding: "0 24px 80px",
        }}
      >
        <h2
          style={{
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "var(--text-muted)",
            marginBottom: 32,
            fontFamily: "var(--font-geist-mono), monospace",
          }}
        >
          Under the hood
        </h2>

        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border-dim)",
            borderRadius: 16,
            padding: "36px 32px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))",
            gap: 32,
          }}
        >
          {[
            { name: "comrak", role: "Markdown parser", note: "Rust, GFM complete" },
            { name: "wasm-bindgen", role: "Rust to WASM bridge", note: "Zero-copy bindings" },
            { name: "highlight.js", role: "Syntax highlighting", note: "190+ languages" },
            { name: "KaTeX", role: "Math rendering", note: "LaTeX-quality" },
            { name: "Mermaid", role: "Diagrams", note: "Flowcharts, sequences, gantt" },
            { name: "CodeMirror 6", role: "Source editor", note: "Markdown-aware" },
            { name: "Turndown", role: "HTML to Markdown", note: "Bidirectional conversion" },
            { name: "mammoth", role: "DOCX import", note: "Word to Markdown" },
            { name: "Gemini AI", role: "mdfy structuring", note: "Raw text to Markdown" },
            { name: "Next.js 15", role: "Frontend framework", note: "App Router, React 19" },
            { name: "Supabase", role: "Auth + Storage", note: "PostgreSQL + OAuth" },
            { name: "Vercel", role: "Hosting", note: "Global CDN" },
          ].map((t) => (
            <div key={t.name}>
              <p
                style={{
                  color: "var(--text-primary)",
                  fontSize: 15,
                  fontWeight: 700,
                  margin: "0 0 4px",
                }}
              >
                {t.name}
              </p>
              <p
                style={{
                  color: "var(--text-muted)",
                  fontSize: 13,
                  margin: "0 0 2px",
                }}
              >
                {t.role}
              </p>
              <p
                style={{
                  color: "var(--text-faint)",
                  fontSize: 12,
                  margin: 0,
                  fontFamily: "var(--font-geist-mono), monospace",
                }}
              >
                {t.note}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────── PRICING ───────── */}
      <section
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          padding: "0 24px 80px",
        }}
      >
        <h2
          style={{
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "var(--text-muted)",
            marginBottom: 32,
            fontFamily: "var(--font-geist-mono), monospace",
          }}
        >
          Pricing
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
            gap: 16,
          }}
        >
          {/* No Account */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border-dim)", borderRadius: 14, padding: "28px 24px", opacity: 0.7 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-faint)", marginTop: 0, marginBottom: 4 }}>No Account</h3>
            <p style={{ fontSize: 13, color: "var(--text-faint)", marginBottom: 16 }}>Use immediately, no sign-up</p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8, fontSize: 13, color: "var(--text-faint)" }}>
              <li>+ Instant rendering</li>
              <li>+ Import / Export all formats</li>
              <li>+ Share via hash URL</li>
              <li style={{ opacity: 0.5 }}>- Local only, no cloud</li>
              <li style={{ opacity: 0.5 }}>- No short URLs</li>
            </ul>
          </div>
          {/* Beta — what everyone gets right now */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--accent-dim)", borderRadius: 14, padding: "28px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Beta</h3>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", background: "var(--accent-dim)", padding: "2px 8px", borderRadius: 12 }}>FREE NOW</span>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>Everything unlocked while we&apos;re testing</p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8, fontSize: 13, color: "var(--text-muted)" }}>
              <li><span style={{ color: "var(--accent)" }}>+</span> Unlimited documents</li>
              <li><span style={{ color: "var(--accent)" }}>+</span> Documents never expire</li>
              <li><span style={{ color: "var(--accent)" }}>+</span> Cloud sync across devices</li>
              <li><span style={{ color: "var(--accent)" }}>+</span> Short URL sharing</li>
              <li><span style={{ color: "var(--accent)" }}>+</span> AI mdfy structuring</li>
              <li><span style={{ color: "var(--accent)" }}>+</span> All formats supported</li>
              <li style={{ color: "var(--text-faint)" }}>- mdfy.cc badge on shared docs</li>
            </ul>
          </div>
          {/* Pro — kicks in after beta */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--accent)", borderRadius: 14, padding: "28px 24px", position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--accent)", margin: 0 }}>Pro</h3>
              <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-faint)", background: "var(--toggle-bg)", padding: "2px 8px", borderRadius: 12 }}>AFTER BETA</span>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>Pricing announced when beta ends</p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8, fontSize: 13, color: "var(--text-muted)" }}>
              <li><span style={{ color: "var(--accent)" }}>+</span> Everything in Beta</li>
              <li><span style={{ color: "var(--accent)" }}>+</span> No badge on shared docs</li>
              <li><span style={{ color: "var(--accent)" }}>+</span> Custom domain</li>
              <li><span style={{ color: "var(--accent)" }}>+</span> View analytics</li>
              <li><span style={{ color: "var(--accent)" }}>+</span> Password protection</li>
              <li><span style={{ color: "var(--accent)" }}>+</span> Priority AI mdfy</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ───────── CROSS-AI WORKFLOWS ───────── */}
      <section style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px 80px" }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 32, fontFamily: "var(--font-geist-mono), monospace" }}>
          Cross-AI Workflows
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[
            {
              title: "Research with ChatGPT, refine with Claude",
              flow: "ChatGPT → Chrome Extension → mdfy.cc/abc123 → share URL with Claude → Claude reads and refines → new mdfy.cc/def456",
              desc: "Ask ChatGPT to research a topic. Capture the output with the Chrome extension. Share the mdfy.cc URL with Claude for deeper analysis. The document is the bridge between AIs.",
              color: "#4ade80",
            },
            {
              title: "Team knowledge base from any AI",
              flow: "Any AI → mdfy.cc → shareable URL → team reads without any app installed",
              desc: "Different team members use different AIs — ChatGPT, Claude, Gemini, Copilot. All outputs land on mdfy.cc as beautiful, consistent documents. One URL, anyone can read it.",
              color: "#fb923c",
            },
            {
              title: "AI-to-AI document handoff",
              flow: "Agent A writes report → mdfy.cc/abc123 → Agent B reads via URL → continues work",
              desc: "Your AI agent generates a report and publishes to mdfy.cc. Another agent fetches the URL to continue the work. mdfy.cc becomes the shared memory between AI systems.",
              color: "#c4b5fd",
            },
            {
              title: "Meeting notes → action items → tracking",
              flow: "Paste meeting transcript → AI mdfy structures it → share URL → reference in follow-up prompts",
              desc: "Paste a raw meeting transcript. AI mdfy turns it into structured notes with headings, action items, and decisions. Share the URL. Reference it in follow-up AI conversations for context.",
              color: "#60a5fa",
            },
          ].map((uc) => (
            <div key={uc.title} style={{ background: "var(--surface)", border: "1px solid var(--border-dim)", borderRadius: 14, padding: "24px 28px" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 8px" }}>{uc.title}</h3>
              <p style={{ fontSize: 12, color: uc.color, margin: "0 0 12px", fontFamily: "var(--font-geist-mono), monospace", lineHeight: 1.6 }}>{uc.flow}</p>
              <p style={{ fontSize: 14, color: "var(--text-muted)", margin: 0, lineHeight: 1.7 }}>{uc.desc}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 24, padding: "20px 24px", background: "var(--surface)", border: "1px solid var(--border-dim)", borderRadius: 14 }}>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: 0, lineHeight: 1.7 }}>
            <strong style={{ color: "var(--accent)" }}>Why no AI company will build this:</strong>{" "}
            OpenAI won&apos;t build a tool that helps you use Claude output. Anthropic won&apos;t build a tool for ChatGPT output.
            mdfy.cc is the neutral, cross-AI publishing layer that sits between all of them. This position is structurally unreplicable.
          </p>
        </div>
      </section>

      {/* ───────── MANIFESTO ───────── */}
      <section
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          padding: "0 24px 80px",
        }}
      >
        <h2
          style={{
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "var(--text-muted)",
            marginBottom: 32,
            fontFamily: "var(--font-geist-mono), monospace",
          }}
        >
          Why we exist
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>
          <div>
            <h3
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: "var(--text-primary)",
                marginBottom: 16,
                letterSpacing: "-0.02em",
              }}
            >
              Your Markdown, Beautifully Published.
            </h3>
            <p
              style={{
                color: "var(--text-tertiary)",
                fontSize: 15,
                lineHeight: 1.8,
                maxWidth: 680,
              }}
            >
              Before Figma, sharing design meant exporting PNGs and losing editability.
              Before mdfy, sharing a document meant copying into Google Docs and fighting with formatting.
              mdfy gives every document a permanent URL — viewable, editable, and shareable by anyone.
              No install. No login to view. Just a URL that works everywhere — browsers, AI chats, Slack, email.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
              gap: 16,
            }}
          >
            {[
              {
                title: "Documents are URLs, not files",
                body: "A document should be a permanent address — accessible from any browser, any AI, any device. No app to install, no login to view. Just a URL that always works.",
              },
              {
                title: "Markdown is the engine, not the interface",
                body: "Users should never need to learn Markdown syntax. They paste, they edit inline, they share. The Markdown underneath is invisible — like HTML in a web browser.",
              },
              {
                title: "Cross-AI, cross-platform by default",
                body: "One document shared across ChatGPT, Claude, Gemini, Slack, email, and embeds. Humans see a beautiful page. AIs read structured Markdown. Same URL, different consumption modes.",
              },
              {
                title: "Living documents with history",
                body: "Edit anytime, track every version. The URL stays the same. Recipients always see the latest. Revert to any point in time. Documents evolve with your thinking.",
              },
            ].map((p) => (
              <div
                key={p.title}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border-dim)",
                  borderRadius: 14,
                  padding: "28px 24px",
                }}
              >
                <h4
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    marginBottom: 10,
                    marginTop: 0,
                  }}
                >
                  {p.title}
                </h4>
                <p
                  style={{
                    color: "var(--text-muted)",
                    fontSize: 14,
                    lineHeight: 1.7,
                    margin: 0,
                  }}
                >
                  {p.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── VISION ───────── */}
      <section
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          padding: "0 24px 80px",
        }}
      >
        <div
          style={{
            borderLeft: "3px solid var(--accent)",
            paddingLeft: 24,
          }}
        >
          <p
            style={{
              fontSize: 22,
              fontWeight: 600,
              lineHeight: 1.5,
              color: "var(--text-secondary)",
              maxWidth: 640,
              margin: 0,
            }}
          >
            A document should be a permanent URL — editable, versioned,
            readable by humans and AIs alike, shared across every platform.
            That&apos;s what we&apos;re building.
          </p>
          <p
            style={{
              color: "var(--text-muted)",
              fontSize: 14,
              marginTop: 16,
            }}
          >
            One Rust codebase. Every surface. Every format.
          </p>
        </div>
      </section>

      {/* ───────── CTA ───────── */}
      <section
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          padding: "0 24px 100px",
          textAlign: "center",
        }}
      >
        <h2
          style={{
            fontSize: "clamp(28px, 4vw, 40px)",
            fontWeight: 800,
            color: "var(--text-primary)",
            letterSpacing: "-0.02em",
            marginBottom: 16,
          }}
        >
          Try it now.
        </h2>
        <p
          style={{
            color: "var(--text-muted)",
            fontSize: 16,
            marginBottom: 32,
          }}
        >
          No login required. Drop a file, paste anything, and see it beautiful.
        </p>
        <Link
          href="/"
          style={{
            display: "inline-block",
            background: "var(--accent)",
            color: "#000",
            padding: "14px 36px",
            borderRadius: 10,
            fontSize: 16,
            fontWeight: 700,
            textDecoration: "none",
            letterSpacing: "-0.01em",
          }}
        >
          Open Editor
        </Link>
      </section>

      {/* ───────── FOOTER ───────── */}
      <footer style={{ borderTop: "1px solid var(--border-dim)" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "48px 24px 32px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 160px), 1fr))", gap: "32px 48px", marginBottom: 40 }}>
            {/* Brand */}
            <div>
              <div style={{ marginBottom: 12 }}>
                <MdfyLogo size={18} />
              </div>
              <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, margin: 0, maxWidth: 260 }}>
                Your Markdown, Beautifully Published.
                Permanent URL. Always editable. Cross-AI.
              </p>
            </div>
            {/* Product */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 14, marginTop: 0, fontFamily: "var(--font-geist-mono), monospace", letterSpacing: 1, textTransform: "uppercase" }}>Product</p>
              {[
                { label: "Editor", href: "/" },
                { label: "About", href: "/about" },
                { label: "Plugins", href: "/plugins" },
                { label: "API", href: "/docs" },
                { label: "Pricing", href: "/about#pricing" },
              ].map((l) => (
                <Link key={l.label} href={l.href} style={{ display: "block", fontSize: 13, color: "var(--text-faint)", textDecoration: "none", padding: "3px 0" }}>{l.label}</Link>
              ))}
            </div>
            {/* Resources */}
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
            {/* Legal */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 14, marginTop: 0, fontFamily: "var(--font-geist-mono), monospace", letterSpacing: 1, textTransform: "uppercase" }}>Company</p>
              {[
                { label: "Contact", href: "mailto:hi@raymind.ai" },
                { label: "Twitter / X", href: "#" },
                { label: "Terms of Service", href: "#" },
                { label: "Privacy Policy", href: "/privacy" },
              ].map((l) => (
                <a key={l.label} href={l.href} style={{ display: "block", fontSize: 13, color: "var(--text-faint)", textDecoration: "none", padding: "3px 0" }}>{l.label}</a>
              ))}
            </div>
          </div>
          {/* Bottom bar */}
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
