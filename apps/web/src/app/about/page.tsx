import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About — mdfy.cc",
  description:
    "mdfy.cc is the universal Markdown renderer for the AI era. Built with a Rust engine compiled to WASM. Supports every flavor.",
  openGraph: {
    title: "About — mdfy.cc",
    description:
      "The Markdown engine for the AI era. Rust → WASM. Every flavor supported.",
    url: "https://mdfy.cc/about",
  },
};

const features = [
  {
    label: "GFM",
    desc: "Tables, task lists, strikethrough, autolinks — full GitHub Flavored Markdown.",
    color: "#fb923c",
  },
  {
    label: "KaTeX",
    desc: "Inline and display math rendered beautifully. From simple equations to complex notation.",
    color: "#c4b5fd",
  },
  {
    label: "Mermaid",
    desc: "Flowcharts, sequence diagrams, gantt charts — rendered from code blocks.",
    color: "#f472b6",
  },
  {
    label: "190+ Languages",
    desc: "Syntax highlighting via highlight.js. Every language you write in.",
    color: "#4ade80",
  },
  {
    label: "Dark / Light",
    desc: "Two carefully crafted themes. Your preference is saved locally.",
    color: "#60a5fa",
  },
  {
    label: "Share",
    desc: "One click generates a short URL. Anyone can view your beautifully rendered document.",
    color: "#fbbf24",
  },
];

const timeline = [
  { marker: "Engine", text: "Rust parses your Markdown via comrak" },
  { marker: "WASM", text: "Compiled to WebAssembly, runs in-browser" },
  { marker: "Post", text: "highlight.js, KaTeX, Mermaid enrich the output" },
  { marker: "Render", text: "Beautiful document in ~2ms, zero server round-trip" },
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
        {/* Background glow */}
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
          The Markdown engine
          <br />
          <span style={{ color: "var(--accent)" }}>for the AI era.</span>
        </h1>

        <p
          style={{
            fontSize: 18,
            lineHeight: 1.7,
            color: "var(--text-tertiary)",
            maxWidth: 560,
            marginTop: 28,
          }}
        >
          Every AI speaks Markdown. mdfy.cc renders it beautifully — instantly,
          in your browser, powered by a Rust engine compiled to WebAssembly.
          No login. No server round-trip. Just paste and see.
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
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
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
                padding: "32px 28px",
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
                  fontSize: 14,
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
          What it supports
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
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
                padding: "28px 24px",
                transition: "border-color 0.2s",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: "var(--font-geist-mono), monospace",
                  color: f.color,
                  background: `${f.color}15`,
                  padding: "4px 10px",
                  borderRadius: 6,
                  marginBottom: 14,
                }}
              >
                {f.label}
              </span>
              <p
                style={{
                  color: "var(--text-tertiary)",
                  fontSize: 14,
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
            { name: "comrak", role: "Markdown parser", note: "Rust · GFM complete" },
            { name: "wasm-bindgen", role: "Rust → WASM bridge", note: "Zero-copy bindings" },
            { name: "highlight.js", role: "Syntax highlighting", note: "190+ languages" },
            { name: "KaTeX", role: "Math rendering", note: "LaTeX-quality" },
            { name: "Mermaid", role: "Diagrams", note: "Flowcharts, sequences, gantt" },
            { name: "Next.js 15", role: "Frontend framework", note: "App Router · React 19" },
            { name: "Supabase", role: "Document storage", note: "PostgreSQL" },
            { name: "Vercel", role: "Hosting & Edge", note: "Global CDN" },
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
          {/* The Problem */}
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
              Markdown has tools. It does not have infrastructure.
            </h3>
            <p
              style={{
                color: "var(--text-tertiary)",
                fontSize: 15,
                lineHeight: 1.8,
                maxWidth: 680,
              }}
            >
              Every application re-implements the Markdown pipeline. A startup building
              a docs site wires together remark + rehype + shiki + katex + mermaid — five
              dependencies, each with its own quirks. VS Code renders Markdown differently
              than GitHub, which renders it differently than Obsidian.
              This fragmentation was tolerable when Markdown was a developer tool.
              It is not tolerable when Markdown is becoming the primary content format
              for AI-human interaction at massive scale.
            </p>
          </div>

          {/* Principles */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            {[
              {
                title: "Engine over Editor",
                body: "We are V8, not Chrome. WebKit, not Safari. SQLite, not a database GUI. Editors rise and fall with design trends. The engine underneath persists across generations of products.",
              },
              {
                title: "Every flavor in, correct output out",
                body: "GFM, Obsidian wikilinks, MDX, Pandoc citations, KaTeX, Mermaid. An infrastructure layer does not get to have opinions about which dialect is \"right.\" It renders all of them.",
              },
              {
                title: "Bidirectional by default",
                body: "MD\u2192HTML is the obvious direction. But the AI era demands the reverse: HTML\u2192MD, PDF\u2192MD, DOCX\u2192MD. AI agents need Markdown in, humans need polished documents out.",
              },
              {
                title: "Open engine, commercial infrastructure",
                body: "The engine is open source. MIT licensed. Always. An open engine gets embedded everywhere. The platform and services on top are the business.",
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

          {/* The Bet */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border-dim)",
              borderRadius: 16,
              padding: "36px 32px",
            }}
          >
            <h3
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "var(--text-primary)",
                marginBottom: 16,
                marginTop: 0,
              }}
            >
              The bet we are making
            </h3>
            <p
              style={{
                color: "var(--text-tertiary)",
                fontSize: 15,
                lineHeight: 1.8,
                maxWidth: 680,
                margin: 0,
              }}
            >
              Markdown is the only format that is simultaneously human-readable in raw
              form and machine-parseable. HTML is machine-parseable but unreadable raw.
              Plain text is human-readable but has no structure. JSON is structured but
              not meant for human eyes. Markdown sits at the exact intersection — and
              that intersection becomes more important as AI writes more and humans need
              to read, verify, and edit the raw output.
            </p>
          </div>

          {/* What we are not */}
          <div>
            <h3
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "var(--text-primary)",
                marginBottom: 12,
              }}
            >
              What we are not
            </h3>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              {[
                "Not an editor company",
                "Not competing with Obsidian or Notion",
                "Not a conversion tool",
                "Not a standard body",
              ].map((item) => (
                <span
                  key={item}
                  style={{
                    fontSize: 13,
                    color: "var(--text-muted)",
                    padding: "6px 14px",
                    borderRadius: 8,
                    border: "1px solid var(--border-dim)",
                    background: "var(--surface)",
                  }}
                >
                  {item}
                </span>
              ))}
            </div>
            <p
              style={{
                color: "var(--text-tertiary)",
                fontSize: 14,
                lineHeight: 1.7,
                marginTop: 16,
                maxWidth: 640,
              }}
            >
              We are the engine layer beneath all of these. The one dependency that
              makes every Markdown tool better, faster, and more consistent.
            </p>
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
            One Rust codebase. Every surface. Every Markdown flavor.
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
          No login. No paywall. Just paste Markdown and see it beautiful.
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
          mdcore v0.1.0 · Rust → WASM · powered by{" "}
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
