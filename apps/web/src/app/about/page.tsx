import type { Metadata } from "next";
import Link from "next/link";
import { DocsNav, SiteFooter } from "@/components/docs";

export const metadata: Metadata = {
  title: "About — mdfy.cc",
  description:
    "mdfy.cc — The Markdown Hub. Collect from anywhere, edit with AI, publish with a permanent URL. Powered by Rust + WASM.",
  openGraph: {
    title: "About — mdfy.cc",
    description:
      "Collect from anywhere. Edit with AI. Publish with a permanent URL. Powered by Rust + WASM.",
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
    label: "Instant Share",
    desc: "One click generates a short URL. Anyone can view your beautifully rendered document — no app needed.",
    color: "#4ade80",
  },
  {
    label: "KaTeX Math",
    desc: "Inline and display math equations rendered with LaTeX-quality precision. Write formulas that look publication-ready.",
    color: "#fbbf24",
  },
  {
    label: "Mermaid Diagrams",
    desc: "Flowcharts, sequence diagrams, Gantt charts — write them in Markdown, see them as interactive visuals.",
    color: "#60a5fa",
  },
  {
    label: "Code Highlighting",
    desc: "190+ languages with syntax highlighting via highlight.js. Every programming language you write in.",
    color: "#38bdf8",
  },
  {
    label: "Dark / Light Mode",
    desc: "Two carefully crafted themes. Your preference is saved locally. Shared docs respect the viewer's choice.",
    color: "#fb923c",
  },
  {
    label: "Import Anything",
    desc: "PDF, Word, PowerPoint, Excel, HTML, CSV, LaTeX, RST, RTF — drop any file and get Markdown. AI-powered mdfy restructures raw text.",
    color: "#4ade80",
  },
  {
    label: "Version History",
    desc: "Every change is tracked. Revert to any previous version. The URL stays the same — recipients always see the latest.",
    color: "#fbbf24",
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
      <DocsNav active="about" />

      {/* ───────── 1. HERO ───────── */}
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
          The Markdown Hub
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
          Collect. Edit. Publish.
          <br />
          <span style={{ color: "var(--accent)" }}>All your Markdown in one place.</span>
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
          Markdown lives everywhere — AI chats, GitHub repos, terminals, editors.
          mdfy.cc brings it all together. Capture from any source, edit with AI-powered tools,
          and publish with a permanent URL. No install to view. No login to start.
        </p>
      </section>

      {/* ───────── HERO EDITOR SCREENSHOT ───────── */}
      <section style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px 60px" }}>
        <div style={{ borderRadius: 12, overflow: "hidden" }}>
          <img
            src="/images/hero-editor.webp"
            alt="mdfy.cc editor — write Markdown, see it beautifully rendered"
            className="lightbox-img"
            style={{ width: "100%", display: "block", borderRadius: 12 }}
          />
        </div>
      </section>

      {/* ───────── 2. WRITE ANYWHERE. READ EVERYWHERE. ───────── */}
      <section style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px 80px" }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border-dim)", borderRadius: 20, padding: "48px 40px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -100, left: -100, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(251,146,60,0.08) 0%, transparent 60%)", pointerEvents: "none" }} />
          <h2 style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary)", margin: "0 0 32px", textAlign: "center" }}>
            Collect anywhere. Publish everywhere.
          </h2>
          <div className="about-grid-3">
            {[
              { icon: "COLLECT", color: "#fb923c", title: "Capture from every source", items: ["AI chats — ChatGPT, Claude, Gemini (Chrome extension)", "GitHub — any .md file in any repo", "Files — PDF, Word, PowerPoint, Excel, and 10+ formats", "Editors — VS Code, Mac Desktop, CLI, MCP Server", "Terminal — CLI pipe, tmux capture, QuickLook preview"] },
              { icon: "EDIT", color: "#4ade80", title: "Edit with AI-powered tools", items: ["WYSIWYG — click and type directly in the rendered view", "AI Tools — Polish, Summary, TL;DR, Translate, Chat (side panel)", "Document Outline — heading hierarchy for navigation", "Image Gallery — upload, manage, and insert images", "Version history — revert to any saved version"] },
              { icon: "PUBLISH", color: "#60a5fa", title: "Share with a permanent URL", items: ["One URL — anyone can view, no login", "Embed in websites (iframe)", "Paste URL in AI chats as context", "Password protect or restrict by email", "QR code for mobile sharing"] },
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

      {/* ───────── 3. BEFORE / WITH MDFY ───────── */}
      <section style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px 80px" }}>
        {/* Before/After visual — raw md vs rendered */}
        <div style={{ margin: "0 auto 32px", maxWidth: 960, borderRadius: 12, overflow: "hidden" }}>
          <img src="/images/before-after.webp" alt="Raw Markdown on the left, beautifully rendered mdfy output on the right" className="lightbox-img" style={{ width: "100%", display: "block" }} />
        </div>
        <div className="about-grid-2" style={{ gap: 16 }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border-dim)", borderRadius: 14, padding: "28px 24px" }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-faint)", marginTop: 0, marginBottom: 16, textDecoration: "line-through" }}>Before mdfy</h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10, fontSize: 14, color: "var(--text-faint)" }}>
              <li>- .md files are raw text nobody wants to read</li>
              <li>- Copy to Google Docs — formatting breaks</li>
              <li>- Share via Slack — looks like code</li>
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

      {/* ───────── 4. HOW IT WORKS ───────── */}
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

      {/* ───────── 5. FEATURES ───────── */}
      <section
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          padding: "0 24px 80px",
        }}
      >
        {/* Feature showcase images */}
        <div className="about-grid-2" style={{ margin: "0 auto 48px", maxWidth: 960 }}>
          <div style={{ borderRadius: 12, overflow: "hidden" }}>
            <img src="/images/feature-showcase-1.webp" alt="mdfy.cc rendering — beautifully rendered Markdown document" className="lightbox-img" style={{ width: "100%", display: "block" }} />
          </div>
          <div style={{ borderRadius: 12, overflow: "hidden" }}>
            <img src="/images/feature-showcase-2.webp" alt="mdfy.cc rendering — KaTeX math, Mermaid diagrams, and code" className="lightbox-img" style={{ width: "100%", display: "block" }} />
          </div>
        </div>
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

      {/* ───────── FEATURE DETAIL IMAGES ───────── */}
      <section style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px 80px" }}>
        <div className="about-grid-3">
          <div style={{ borderRadius: 12, overflow: "hidden" }}>
            <img src="/images/feature-math.webp" alt="KaTeX math rendering — inline and display equations" className="lightbox-img" style={{ width: "100%", display: "block" }} />
            <div style={{ padding: "12px 16px", background: "var(--surface)", borderTop: "1px solid var(--border-dim)" }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>KaTeX Math</p>
              <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--text-faint)" }}>Publication-quality equations</p>
            </div>
          </div>
          <div style={{ borderRadius: 12, overflow: "hidden" }}>
            <img src="/images/feature-mermaid.webp" alt="Mermaid diagram — flowchart rendered from Markdown" className="lightbox-img" style={{ width: "100%", display: "block" }} />
            <div style={{ padding: "12px 16px", background: "var(--surface)", borderTop: "1px solid var(--border-dim)" }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Mermaid Diagrams</p>
              <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--text-faint)" }}>Flowcharts, sequences, Gantt</p>
            </div>
          </div>
          <div style={{ borderRadius: 12, overflow: "hidden" }}>
            <img src="/images/feature-code.webp" alt="Syntax-highlighted code block with copy button" className="lightbox-img" style={{ width: "100%", display: "block" }} />
            <div style={{ padding: "12px 16px", background: "var(--surface)", borderTop: "1px solid var(--border-dim)" }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Code Highlighting</p>
              <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--text-faint)" }}>190+ languages, copy button</p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── 6. COMPARISON TABLES ───────── */}
      <section style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px 80px" }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 12, fontFamily: "var(--font-geist-mono), monospace" }}>
          mdfy vs Markdown publishing tools
        </h2>
        <p style={{ fontSize: 14, color: "var(--text-faint)", marginBottom: 32, lineHeight: 1.6 }}>
          Publish Markdown to the web. How does mdfy stack up against the alternatives?
        </p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: "var(--font-geist-mono), monospace" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["", "mdfy.cc", "HackMD", "StackEdit", "Obsidian Publish", "GitHub Gist"].map((h) => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: h === "mdfy.cc" ? 800 : 600, color: h === "mdfy.cc" ? "var(--accent)" : "var(--text-muted)", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { feature: "No signup to publish", vals: [true, false, false, false, false] },
                { feature: "Instant shareable URL", vals: [true, true, false, true, true] },
                { feature: "WYSIWYG editing", vals: [true, false, false, true, false] },
                { feature: "Source .md stays on your machine", vals: [true, false, false, true, false] },
                { feature: "KaTeX math", vals: [true, true, false, true, false] },
                { feature: "Mermaid diagrams", vals: [true, true, false, true, false] },
                { feature: "Publish from CLI / pipe", vals: [true, false, false, false, true] },
                { feature: "AI integration (MCP)", vals: [true, false, false, false, false] },
                { feature: "VS Code extension", vals: [true, false, false, false, true] },
                { feature: "Mac desktop app", vals: [true, false, false, true, false] },
                { feature: "Chrome extension", vals: [true, false, false, false, false] },
                { feature: "Bidirectional sync", vals: [true, true, true, true, false] },
                { feature: "Custom rendering engine", vals: [true, true, false, true, false] },
                { feature: "Free to start", vals: [true, true, true, false, true] },
              ].map((row) => (
                <tr key={row.feature} style={{ borderBottom: "1px solid var(--border-dim)" }}>
                  <td style={{ padding: "10px 16px", color: "var(--text-secondary)", fontSize: 12 }}>{row.feature}</td>
                  {row.vals.map((v, i) => (
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

      <section style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px 80px" }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 12, fontFamily: "var(--font-geist-mono), monospace" }}>
          mdfy vs VS Code Markdown extensions
        </h2>
        <p style={{ fontSize: 14, color: "var(--text-faint)", marginBottom: 32, lineHeight: 1.6 }}>
          VS Code has great Markdown extensions. None of them publish.
        </p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: "var(--font-geist-mono), monospace" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["", "mdfy", "MD All in One", "MD Preview Enhanced", "Markdown Editor", "Built-in Preview"].map((h) => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: h === "mdfy" ? 800 : 600, color: h === "mdfy" ? "var(--accent)" : "var(--text-muted)", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { feature: "WYSIWYG editing", vals: [true, false, false, true, false] },
                { feature: "One-click publish to URL", vals: [true, false, false, false, false] },
                { feature: "Cloud sync (push/pull)", vals: [true, false, false, false, false] },
                { feature: "KaTeX math", vals: [true, true, true, false, false] },
                { feature: "Mermaid diagrams", vals: [true, false, true, false, false] },
                { feature: "Syntax highlighting", vals: [true, false, true, false, true] },
                { feature: "Toolbar (bold, italic, etc.)", vals: [true, true, false, true, false] },
                { feature: "Table of contents", vals: [true, true, true, false, false] },
                { feature: "Export to HTML / PDF", vals: [true, false, true, false, false] },
                { feature: "Document sidebar", vals: [true, false, false, false, false] },
                { feature: "Conflict resolution", vals: [true, false, false, false, false] },
                { feature: "Offline queue", vals: [true, false, false, false, false] },
                { feature: "Custom rendering engine", vals: [true, false, true, false, false] },
              ].map((row) => (
                <tr key={row.feature} style={{ borderBottom: "1px solid var(--border-dim)" }}>
                  <td style={{ padding: "10px 16px", color: "var(--text-secondary)", fontSize: 12 }}>{row.feature}</td>
                  {row.vals.map((v, i) => (
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

      {/* ───────── 7. PRICING ───────── */}
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
          {/* Beta */}
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
          {/* Pro */}
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

      {/* ───────── 8. VISION + MANIFESTO ───────── */}
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
            Markdown is everywhere — AI outputs, GitHub repos, dev tools, notes.
            But it&apos;s scattered across dozens of apps and formats.
            mdfy.cc is the hub that collects it all, makes it beautiful, and gives it a permanent URL.
          </p>
          <p
            style={{
              color: "var(--text-muted)",
              fontSize: 14,
              marginTop: 16,
              marginBottom: 0,
            }}
          >
            Collect from anywhere. Edit with AI. Publish with one click.
          </p>
        </div>
      </section>

      {/* ───────── 9. CTA ───────── */}
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

      {/* ───────── 10. FOOTER ───────── */}
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
