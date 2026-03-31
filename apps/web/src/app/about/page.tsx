import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About — mdfy.cc",
  description:
    "mdfy.cc — the fastest way from thought to shared document. Import anything, render beautifully, share instantly. Powered by Rust + WASM.",
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
          <Link href="/" style={{ textDecoration: "none" }}>
            <span style={{ color: "var(--accent)", fontSize: 22, fontWeight: 800 }}>
              md
            </span>
            <span style={{ color: "var(--text-primary)", fontSize: 22, fontWeight: 800 }}>
              fy
            </span>
            <span style={{ color: "var(--text-muted)", fontSize: 22, fontWeight: 800 }}>
              .cc
            </span>
          </Link>

          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <Link href="/plugins" style={{ color: "var(--text-muted)", fontSize: 13, textDecoration: "none" }}>
              Plugins
            </Link>
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
          The fastest way from
          <br />
          <span style={{ color: "var(--accent)" }}>thought to shared document.</span>
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
          Import anything — PDF, Word, PowerPoint, or just paste.
          mdfy.cc renders it beautifully, lets you edit inline, and shares with a single click.
          Powered by a Rust engine compiled to WebAssembly. No wait. No friction.
        </p>
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
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
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
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
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
            gridTemplateColumns: "1fr 1fr",
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
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
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
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
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
          {/* Free */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border-dim)", borderRadius: 14, padding: "28px 24px" }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginTop: 0, marginBottom: 4 }}>Free</h3>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>Sign up for free</p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8, fontSize: 13, color: "var(--text-muted)" }}>
              <li><span style={{ color: "var(--accent)" }}>+</span> Unlimited documents</li>
              <li><span style={{ color: "var(--accent)" }}>+</span> Cloud sync across devices</li>
              <li><span style={{ color: "var(--accent)" }}>+</span> Short URL sharing</li>
              <li><span style={{ color: "var(--accent)" }}>+</span> AI mdfy structuring</li>
              <li style={{ color: "var(--text-faint)" }}>- 7-day document expiry</li>
              <li style={{ color: "var(--text-faint)" }}>- mdfy.cc badge on shared docs</li>
            </ul>
          </div>
          {/* Pro */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--accent)", borderRadius: 14, padding: "28px 24px", position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--accent)", margin: 0 }}>Pro</h3>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", background: "var(--accent-dim)", padding: "2px 8px", borderRadius: 12 }}>$8/mo</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-faint)", background: "var(--toggle-bg)", padding: "2px 8px", borderRadius: 12 }}>COMING SOON</span>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>For power users</p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8, fontSize: 13, color: "var(--text-muted)" }}>
              <li><span style={{ color: "var(--accent)" }}>+</span> Everything in Free</li>
              <li><span style={{ color: "var(--accent)" }}>+</span> No document expiry</li>
              <li><span style={{ color: "var(--accent)" }}>+</span> No badge on shared docs</li>
              <li><span style={{ color: "var(--accent)" }}>+</span> Custom domain</li>
              <li><span style={{ color: "var(--accent)" }}>+</span> View analytics</li>
              <li><span style={{ color: "var(--accent)" }}>+</span> Password protection</li>
              <li><span style={{ color: "var(--accent)" }}>+</span> Priority AI mdfy</li>
            </ul>
          </div>
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
              The fastest way from thought to shared document.
            </h3>
            <p
              style={{
                color: "var(--text-tertiary)",
                fontSize: 15,
                lineHeight: 1.8,
                maxWidth: 680,
              }}
            >
              AI generates Markdown. But sharing AI output still means copying into Google Docs,
              fighting with formatting, or sending raw text that nobody wants to read.
              mdfy.cc closes that gap — paste anything, get a beautiful document, share with one click.
              Cross-AI. Cross-platform. Zero friction.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            {[
              {
                title: "Markdown is the engine, not the interface",
                body: "Users should never need to learn Markdown syntax. They paste, they edit inline, they share. The Markdown underneath is invisible — like HTML in a web browser.",
              },
              {
                title: "Every format in, beautiful document out",
                body: "PDF, Word, PowerPoint, CLI output, raw text — it all becomes structured Markdown. AI handles the heavy lifting. The result is always clean and shareable.",
              },
              {
                title: "Cross-AI layer",
                body: "ChatGPT, Claude, Gemini, Copilot — every AI outputs Markdown differently. mdfy.cc is the universal rendering layer that works with all of them. No AI company can replicate this position.",
              },
              {
                title: "Viral by design",
                body: "Every shared document carries a badge. Every badge brings new users. The product markets itself through the content it helps create.",
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
            Markdown is the interface layer between AI and humans.
            We&apos;re building the infrastructure to make that layer beautiful,
            universal, and reliable.
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
