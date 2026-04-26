import type { Metadata } from "next";
import Link from "next/link";
import { CodeBlock, InlineCode, DocsNav, SiteFooter, mono } from "@/components/docs";

export const metadata: Metadata = {
  title: "Documentation — mdfy.cc",
  description:
    "Complete developer documentation for mdfy.cc. REST API, CLI, JavaScript SDK, MCP server, and npm packages.",
  openGraph: {
    title: "Documentation — mdfy.cc",
    description:
      "Complete developer documentation. REST API, CLI, SDK, MCP server.",
    url: "https://mdfy.cc/docs",
  },
};

/* ────────────────────────────────────────────────────────────
   Data
   ──────────────────────────────────────────────────────────── */

const quickStartCards = [
  {
    tag: "curl",
    title: "REST API",
    desc: "Create, read, update, and delete documents with HTTP requests.",
    href: "/docs/api",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
  },
  {
    tag: "terminal",
    title: "CLI",
    desc: "Publish from the command line. Pipe stdin, capture tmux panes.",
    href: "/docs/cli",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 17 10 11 4 5" />
        <line x1="12" y1="19" x2="20" y2="19" />
      </svg>
    ),
  },
  {
    tag: "JS",
    title: "JavaScript SDK",
    desc: "TypeScript-first client. MdfyClient class and standalone functions.",
    href: "/docs/sdk",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    tag: "MCP",
    title: "MCP Server",
    desc: "Hosted HTTP endpoint for Claude Web + npm package for Claude Desktop, Cursor, Windsurf.",
    href: "/docs/mcp",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
];

const exploreCards = [
  {
    title: "Publish from AI",
    desc: "Claude (MCP), ChatGPT (Custom GPT), Chrome Extension. Say \"publish this\" in any AI.",
    href: "https://chatgpt.com/g/g-69e2832dd74081919c09a9f8d03adc59-mdfy-publish-documents",
  },
  {
    title: "Integrations",
    desc: "VS Code, Mac Desktop, Chrome Extension, CLI, MCP Server, QuickLook, tmux — 8 channels.",
    href: "/plugins",
  },
  {
    title: "Authentication",
    desc: "Edit tokens, user identity headers, OAuth bearer tokens.",
    href: "/docs/api#authentication",
  },
  {
    title: "npm Packages",
    desc: "@mdcore/api, engine, styles, ai. Independent packages.",
    href: "/docs/sdk#packages",
  },
];

/* ────────────────────────────────────────────────────────────
   Page
   ──────────────────────────────────────────────────────────── */

export default function DocsPage() {
  return (
    <div
      style={{
        background: "var(--background)",
        color: "var(--foreground)",
        minHeight: "100vh",
        overflowX: "hidden",
      }}
    >
      <DocsNav />

      {/* ───────── HERO ───────── */}
      <section
        style={{
          position: "relative",
          maxWidth: 1200,
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
            fontFamily: mono,
          }}
        >
          Developer Docs
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
          Documentation
        </h1>

        <p
          style={{
            fontSize: 18,
            lineHeight: 1.7,
            color: "var(--text-tertiary)",
            maxWidth: 640,
            marginTop: 28,
          }}
        >
          The publishing API for developers. Create, manage, and share
          Markdown documents programmatically.
        </p>

        <p
          style={{
            fontSize: 14,
            color: "var(--text-muted)",
            marginTop: 16,
            fontFamily: mono,
          }}
        >
          Base URL: <InlineCode>{"https://mdfy.cc"}</InlineCode>
        </p>
      </section>

      {/* ───────── DOCS HERO IMAGE ───────── */}
      <section style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px 60px" }}>
        <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid var(--border-dim)" }}>
          <img src="/images/docs-api.png" alt="mdfy.cc API — curl request creating a document and getting a shareable URL" style={{ width: "100%", display: "block" }} />
        </div>
      </section>

      {/* ───────── QUICK START ───────── */}
      <section
        style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 80px" }}
      >
        <h2
          style={{
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "var(--text-muted)",
            marginBottom: 32,
            fontFamily: mono,
          }}
        >
          Quick Start
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
            gap: 16,
          }}
        >
          {quickStartCards.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              style={{ textDecoration: "none" }}
            >
              <div
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border-dim)",
                  borderRadius: 14,
                  padding: "28px 24px",
                  height: "100%",
                  transition: "border-color 0.15s",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 14,
                  }}
                >
                  <span
                    style={{
                      color: "var(--accent)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: "var(--accent-dim)",
                    }}
                  >
                    {card.icon}
                  </span>
                  <div>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        fontFamily: mono,
                        color: "var(--text-faint)",
                        textTransform: "uppercase",
                        letterSpacing: 1,
                      }}
                    >
                      {card.tag}
                    </span>
                    <p
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: "var(--text-primary)",
                        margin: 0,
                      }}
                    >
                      {card.title}
                    </p>
                  </div>
                </div>
                <p
                  style={{
                    fontSize: 14,
                    color: "var(--text-muted)",
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {card.desc}
                </p>
                <span
                  style={{
                    display: "inline-block",
                    marginTop: 16,
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--accent)",
                    fontFamily: mono,
                  }}
                >
                  View docs &rarr;
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ───────── TRY IT ───────── */}
      <section
        style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 80px" }}
      >
        <h2
          style={{
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "var(--text-muted)",
            marginBottom: 32,
            fontFamily: mono,
          }}
        >
          Try It
        </h2>

        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border-dim)",
            borderRadius: 14,
            padding: "28px 24px",
          }}
        >
          <p
            style={{
              fontSize: 14,
              color: "var(--text-muted)",
              marginTop: 0,
              marginBottom: 16,
              lineHeight: 1.7,
            }}
          >
            Publish your first document in under 30 seconds. No authentication
            required.
          </p>
          <CodeBlock lang="bash">{`curl -X POST https://mdfy.cc/api/docs \\
  -H "Content-Type: application/json" \\
  -d '{"markdown": "# Hello World\\nPublished via API.", "isDraft": false}'

# Response:
# { "id": "abc123", "editToken": "tok_...", "created_at": "..." }
# View at: https://mdfy.cc/d/abc123`}</CodeBlock>
        </div>
      </section>

      {/* ───────── EXPLORE ───────── */}
      <section
        style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 80px" }}
      >
        <h2
          style={{
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "var(--text-muted)",
            marginBottom: 32,
            fontFamily: mono,
          }}
        >
          Explore
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
            gap: 16,
          }}
        >
          {exploreCards.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              style={{ textDecoration: "none" }}
            >
              <div
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border-dim)",
                  borderRadius: 14,
                  padding: "24px",
                  height: "100%",
                }}
              >
                <h3
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    marginTop: 0,
                    marginBottom: 8,
                  }}
                >
                  {card.title}
                </h3>
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--text-muted)",
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {card.desc}
                </p>
              </div>
            </Link>
          ))}
        </div>

        <p
          style={{
            fontSize: 13,
            color: "var(--text-faint)",
            marginTop: 24,
            fontFamily: mono,
          }}
        >
          For AI consumption, see{" "}
          <Link
            href="/docs/llms.txt"
            style={{ color: "var(--accent)", textDecoration: "none" }}
          >
            /docs/llms.txt
          </Link>
        </p>
      </section>

      {/* ───────── FOOTER ───────── */}
      <SiteFooter />
    </div>
  );
}
