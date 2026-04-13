import type { Metadata } from "next";
import Link from "next/link";
import MdfyLogo from "@/components/MdfyLogo";

export const metadata: Metadata = {
  title: "API & Developer Tools — mdfy.cc",
  description:
    "Create, manage, and publish documents programmatically. Integrate mdfy.cc with any AI tool via MCP server or REST API.",
  openGraph: {
    title: "API & Developer Tools — mdfy.cc",
    description:
      "Create, manage, and publish documents programmatically. MCP server + REST API.",
    url: "https://mdfy.cc/docs",
  },
};

const mcpTools = [
  { name: "mdfy_create", desc: "Create a new document, get a shareable URL" },
  { name: "mdfy_read", desc: "Fetch document content by ID" },
  { name: "mdfy_update", desc: "Update existing document content" },
  { name: "mdfy_list", desc: "List all your documents" },
  { name: "mdfy_publish", desc: "Toggle between Private and Shared" },
  { name: "mdfy_delete", desc: "Delete a document" },
];

const endpoints = [
  {
    method: "POST",
    path: "/api/docs",
    desc: "Create document",
    request: `{
  "content": "# Hello World\\nYour markdown here.",
  "title": "My Document"
}`,
    response: `{
  "id": "abc123",
  "url": "https://mdfy.cc/d/abc123",
  "editToken": "tok_..."
}`,
  },
  {
    method: "GET",
    path: "/api/docs/{id}",
    desc: "Read document",
    request: null,
    response: `{
  "id": "abc123",
  "title": "My Document",
  "content": "# Hello World\\nYour markdown here.",
  "created_at": "2026-04-12T00:00:00Z",
  "updated_at": "2026-04-12T00:00:00Z"
}`,
  },
  {
    method: "PATCH",
    path: "/api/docs/{id}",
    desc: "Update document",
    request: `{
  "content": "# Updated content",
  "editToken": "tok_..."
}`,
    response: `{
  "id": "abc123",
  "url": "https://mdfy.cc/d/abc123",
  "updated_at": "2026-04-12T01:00:00Z"
}`,
  },
  {
    method: "DELETE",
    path: "/api/docs/{id}",
    desc: "Delete document",
    request: `{
  "editToken": "tok_..."
}`,
    response: `{
  "success": true
}`,
  },
  {
    method: "GET",
    path: "/api/user/documents",
    desc: "List user's documents",
    request: null,
    response: `{
  "documents": [
    {
      "id": "abc123",
      "title": "My Document",
      "created_at": "2026-04-12T00:00:00Z"
    }
  ]
}`,
  },
];

function CodeBlock({ children, lang }: { children: string; lang?: string }) {
  return (
    <div style={{ position: "relative" }}>
      {lang && (
        <span
          style={{
            position: "absolute",
            top: 10,
            right: 12,
            fontSize: 10,
            fontWeight: 600,
            color: "var(--text-faint)",
            fontFamily: "'SF Mono', 'Fira Code', 'JetBrains Mono', monospace",
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          {lang}
        </span>
      )}
      <pre
        style={{
          background: "#18181b",
          borderRadius: 10,
          padding: "18px 20px",
          overflow: "auto",
          fontSize: 13,
          lineHeight: 1.7,
          fontFamily: "'SF Mono', 'Fira Code', 'JetBrains Mono', monospace",
          color: "var(--text-secondary)",
          margin: 0,
          border: "none",
        }}
      >
        <code>{children}</code>
      </pre>
    </div>
  );
}

function SectionHeading({ children }: { children: string }) {
  return (
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
      {children}
    </h2>
  );
}

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
              <MdfyLogo size={22} />
            </Link>
            <div style={{ display: "flex", gap: 16 }}>
              <Link
                href="/about"
                style={{
                  color: "var(--text-muted)",
                  fontSize: 13,
                  textDecoration: "none",
                }}
              >
                About
              </Link>
              <Link
                href="/plugins"
                style={{
                  color: "var(--text-muted)",
                  fontSize: 13,
                  textDecoration: "none",
                }}
              >
                Plugins
              </Link>
              <Link
                href="/docs"
                style={{
                  color: "var(--accent)",
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                API
              </Link>
            </div>
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <a
              href="https://github.com/raymindai/mdcore"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "var(--text-muted)",
                fontSize: 13,
                textDecoration: "none",
              }}
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
          API &amp; Developer Tools
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
          Create, manage, and publish documents programmatically.
          Integrate mdfy.cc with any AI tool.
        </p>
      </section>

      {/* ───────── QUICK START ───────── */}
      <section
        style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px 80px" }}
      >
        <SectionHeading>Quick Start</SectionHeading>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          {/* Step 1 */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border-dim)",
              borderRadius: 14,
              padding: "28px 24px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 16,
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
                01
              </span>
              <span
                style={{
                  color: "var(--text-primary)",
                  fontSize: 15,
                  fontWeight: 700,
                }}
              >
                Install MCP Server
              </span>
            </div>
            <CodeBlock lang="bash">npx mdfy-mcp</CodeBlock>
          </div>

          {/* Step 2 */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border-dim)",
              borderRadius: 14,
              padding: "28px 24px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 16,
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
                02
              </span>
              <span
                style={{
                  color: "var(--text-primary)",
                  fontSize: 15,
                  fontWeight: 700,
                }}
              >
                Configure Claude Code
              </span>
            </div>
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
                  background: "#18181b",
                  padding: "2px 6px",
                  borderRadius: 4,
                  fontSize: 13,
                  fontFamily:
                    "'SF Mono', 'Fira Code', 'JetBrains Mono', monospace",
                  color: "var(--accent)",
                }}
              >
                .mcp.json
              </code>{" "}
              in your project:
            </p>
            <CodeBlock lang="json">{`{
  "mcpServers": {
    "mdfy": {
      "command": "npx",
      "args": ["mdfy-mcp"],
      "env": {
        "MDFY_EMAIL": "your@email.com"
      }
    }
  }
}`}</CodeBlock>
          </div>

          {/* Step 3 */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border-dim)",
              borderRadius: 14,
              padding: "28px 24px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 16,
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
                03
              </span>
              <span
                style={{
                  color: "var(--text-primary)",
                  fontSize: 15,
                  fontWeight: 700,
                }}
              >
                Use it
              </span>
            </div>
            <CodeBlock>{`"Create a technical blog post about WebAssembly on mdfy.cc"

→ Document created: https://mdfy.cc/d/abc123`}</CodeBlock>
          </div>
        </div>
      </section>

      {/* ───────── MCP TOOLS ───────── */}
      <section
        style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px 80px" }}
      >
        <SectionHeading>MCP Tools</SectionHeading>

        <p
          style={{
            fontSize: 14,
            color: "var(--text-muted)",
            marginBottom: 24,
            lineHeight: 1.7,
            maxWidth: 600,
          }}
        >
          The MCP server exposes 6 tools that any MCP-compatible AI client can
          call directly.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))",
            gap: 12,
          }}
        >
          {mcpTools.map((tool) => (
            <div
              key={tool.name}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border-dim)",
                borderRadius: 12,
                padding: "20px 22px",
              }}
            >
              <code
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily:
                    "'SF Mono', 'Fira Code', 'JetBrains Mono', monospace",
                  color: "var(--accent)",
                }}
              >
                {tool.name}
              </code>
              <p
                style={{
                  color: "var(--text-muted)",
                  fontSize: 13,
                  lineHeight: 1.6,
                  margin: "8px 0 0",
                }}
              >
                {tool.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────── REST API ───────── */}
      <section
        style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px 80px" }}
      >
        <SectionHeading>REST API Reference</SectionHeading>

        <p
          style={{
            fontSize: 14,
            color: "var(--text-muted)",
            marginBottom: 32,
            lineHeight: 1.7,
            maxWidth: 600,
          }}
        >
          All endpoints accept and return JSON. Base URL:{" "}
          <code
            style={{
              background: "#18181b",
              padding: "2px 6px",
              borderRadius: 4,
              fontSize: 13,
              fontFamily:
                "'SF Mono', 'Fira Code', 'JetBrains Mono', monospace",
              color: "var(--accent)",
            }}
          >
            https://mdfy.cc
          </code>
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {endpoints.map((ep) => (
            <div
              key={`${ep.method} ${ep.path}`}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border-dim)",
                borderRadius: 14,
                padding: "24px 24px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily:
                      "'SF Mono', 'Fira Code', 'JetBrains Mono', monospace",
                    color:
                      ep.method === "POST"
                        ? "#4ade80"
                        : ep.method === "GET"
                          ? "#60a5fa"
                          : ep.method === "PATCH"
                            ? "#fbbf24"
                            : "#f87171",
                    background:
                      ep.method === "POST"
                        ? "#4ade8015"
                        : ep.method === "GET"
                          ? "#60a5fa15"
                          : ep.method === "PATCH"
                            ? "#fbbf2415"
                            : "#f8717115",
                    padding: "3px 10px",
                    borderRadius: 6,
                  }}
                >
                  {ep.method}
                </span>
                <code
                  style={{
                    fontSize: 14,
                    fontFamily:
                      "'SF Mono', 'Fira Code', 'JetBrains Mono', monospace",
                    color: "var(--text-primary)",
                  }}
                >
                  {ep.path}
                </code>
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-muted)",
                  margin: "0 0 16px",
                }}
              >
                {ep.desc}
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: ep.request
                    ? "1fr 1fr"
                    : "1fr",
                  gap: 12,
                }}
              >
                {ep.request && (
                  <div>
                    <p
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: "var(--text-faint)",
                        fontFamily:
                          "'SF Mono', 'Fira Code', 'JetBrains Mono', monospace",
                        letterSpacing: 1,
                        textTransform: "uppercase",
                        marginBottom: 8,
                        marginTop: 0,
                      }}
                    >
                      Request Body
                    </p>
                    <CodeBlock lang="json">{ep.request}</CodeBlock>
                  </div>
                )}
                <div>
                  <p
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: "var(--text-faint)",
                      fontFamily:
                        "'SF Mono', 'Fira Code', 'JetBrains Mono', monospace",
                      letterSpacing: 1,
                      textTransform: "uppercase",
                      marginBottom: 8,
                      marginTop: 0,
                    }}
                  >
                    Response
                  </p>
                  <CodeBlock lang="json">{ep.response}</CodeBlock>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ───────── AUTHENTICATION ───────── */}
      <section
        style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px 80px" }}
      >
        <SectionHeading>Authentication</SectionHeading>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
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
            <h3
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "var(--text-primary)",
                marginTop: 0,
                marginBottom: 12,
              }}
            >
              No auth needed
            </h3>
            <p
              style={{
                fontSize: 14,
                color: "var(--text-muted)",
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              Creating and reading documents requires no authentication.
              Anyone can create a document and get a shareable URL.
              Reading public documents is always open.
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
            <h3
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "var(--text-primary)",
                marginTop: 0,
                marginBottom: 12,
              }}
            >
              Email-based auth
            </h3>
            <p
              style={{
                fontSize: 14,
                color: "var(--text-muted)",
                lineHeight: 1.7,
                margin: "0 0 12px",
              }}
            >
              Listing, publishing, and deleting documents require email
              identification. Set via{" "}
              <code
                style={{
                  background: "#18181b",
                  padding: "2px 6px",
                  borderRadius: 4,
                  fontSize: 13,
                  fontFamily:
                    "'SF Mono', 'Fira Code', 'JetBrains Mono', monospace",
                  color: "var(--accent)",
                }}
              >
                MDFY_EMAIL
              </code>{" "}
              env var or{" "}
              <code
                style={{
                  background: "#18181b",
                  padding: "2px 6px",
                  borderRadius: 4,
                  fontSize: 13,
                  fontFamily:
                    "'SF Mono', 'Fira Code', 'JetBrains Mono', monospace",
                  color: "var(--accent)",
                }}
              >
                x-user-email
              </code>{" "}
              header.
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
            <h3
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "var(--text-primary)",
                marginTop: 0,
                marginBottom: 12,
              }}
            >
              Edit tokens
            </h3>
            <p
              style={{
                fontSize: 14,
                color: "var(--text-muted)",
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              Updating documents requires the{" "}
              <code
                style={{
                  background: "#18181b",
                  padding: "2px 6px",
                  borderRadius: 4,
                  fontSize: 13,
                  fontFamily:
                    "'SF Mono', 'Fira Code', 'JetBrains Mono', monospace",
                  color: "var(--accent)",
                }}
              >
                editToken
              </code>{" "}
              returned at creation time. The MCP server manages these
              automatically.
            </p>
          </div>
        </div>
      </section>

      {/* ───────── NPM PACKAGE ───────── */}
      <section
        style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px 80px" }}
      >
        <SectionHeading>npm Package</SectionHeading>

        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border-dim)",
            borderRadius: 14,
            padding: "28px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div>
            <code
              style={{
                fontSize: 16,
                fontWeight: 700,
                fontFamily:
                  "'SF Mono', 'Fira Code', 'JetBrains Mono', monospace",
                color: "var(--accent)",
              }}
            >
              mdfy-mcp
            </code>
            <p
              style={{
                fontSize: 14,
                color: "var(--text-muted)",
                lineHeight: 1.7,
                margin: "8px 0 0",
              }}
            >
              MCP server for mdfy.cc. Works with Claude Code, Claude Desktop,
              and any MCP-compatible client. Zero config — just{" "}
              <code
                style={{
                  background: "#18181b",
                  padding: "2px 6px",
                  borderRadius: 4,
                  fontSize: 13,
                  fontFamily:
                    "'SF Mono', 'Fira Code', 'JetBrains Mono', monospace",
                  color: "var(--text-secondary)",
                }}
              >
                npx mdfy-mcp
              </code>{" "}
              and start publishing.
            </p>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <a
              href="https://www.npmjs.com/package/mdfy-mcp"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block",
                background: "var(--accent)",
                color: "#000",
                padding: "10px 24px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              View on npm
            </a>
            <a
              href="https://github.com/raymindai/mdcore"
              target="_blank"
              rel="noopener noreferrer"
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
              GitHub
            </a>
          </div>
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
          Start building.
        </h2>
        <p
          style={{
            color: "var(--text-muted)",
            fontSize: 16,
            marginBottom: 32,
          }}
        >
          Create your first document programmatically in under 30 seconds.
        </p>
        <CodeBlock lang="bash">npx mdfy-mcp</CodeBlock>
      </section>

      {/* ───────── FOOTER ───────── */}
      <footer style={{ borderTop: "1px solid var(--border-dim)" }}>
        <div
          style={{
            maxWidth: 1080,
            margin: "0 auto",
            padding: "48px 24px 32px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(100%, 160px), 1fr))",
              gap: "32px 48px",
              marginBottom: 40,
            }}
          >
            {/* Brand */}
            <div>
              <div style={{ marginBottom: 12 }}>
                <MdfyLogo size={18} />
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-muted)",
                  lineHeight: 1.6,
                  margin: 0,
                  maxWidth: 260,
                }}
              >
                Your Markdown, Beautifully Published.
              </p>
            </div>
            {/* Product */}
            <div>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  marginBottom: 14,
                  marginTop: 0,
                  fontFamily: "var(--font-geist-mono), monospace",
                  letterSpacing: 1,
                  textTransform: "uppercase",
                }}
              >
                Product
              </p>
              {[
                { label: "Editor", href: "/" },
                { label: "About", href: "/about" },
                { label: "Plugins", href: "/plugins" },
                { label: "API", href: "/docs" },
                { label: "Pricing", href: "/about#pricing" },
              ].map((l) => (
                <Link
                  key={l.label}
                  href={l.href}
                  style={{
                    display: "block",
                    fontSize: 13,
                    color: "var(--text-faint)",
                    textDecoration: "none",
                    padding: "3px 0",
                  }}
                >
                  {l.label}
                </Link>
              ))}
            </div>
            {/* Resources */}
            <div>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  marginBottom: 14,
                  marginTop: 0,
                  fontFamily: "var(--font-geist-mono), monospace",
                  letterSpacing: 1,
                  textTransform: "uppercase",
                }}
              >
                Resources
              </p>
              {[
                {
                  label: "GitHub",
                  href: "https://github.com/raymindai/mdcore",
                },
                { label: "Chrome Extension", href: "/plugins" },
                { label: "VS Code Extension", href: "/plugins" },
              ].map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  style={{
                    display: "block",
                    fontSize: 13,
                    color: "var(--text-faint)",
                    textDecoration: "none",
                    padding: "3px 0",
                  }}
                >
                  {l.label}
                </a>
              ))}
            </div>
            {/* Legal */}
            <div>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  marginBottom: 14,
                  marginTop: 0,
                  fontFamily: "var(--font-geist-mono), monospace",
                  letterSpacing: 1,
                  textTransform: "uppercase",
                }}
              >
                Company
              </p>
              {[
                { label: "Contact", href: "mailto:hi@raymind.ai" },
                { label: "Twitter / X", href: "#" },
                { label: "Terms of Service", href: "#" },
                { label: "Privacy Policy", href: "/privacy" },
              ].map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  style={{
                    display: "block",
                    fontSize: 13,
                    color: "var(--text-faint)",
                    textDecoration: "none",
                    padding: "3px 0",
                  }}
                >
                  {l.label}
                </a>
              ))}
            </div>
          </div>
          {/* Bottom bar */}
          <div
            style={{
              borderTop: "1px solid var(--border-dim)",
              paddingTop: 20,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <p
              style={{
                fontSize: 12,
                color: "var(--text-faint)",
                fontFamily: "var(--font-geist-mono), monospace",
                margin: 0,
              }}
            >
              A product of{" "}
              <a
                href="https://raymind.ai"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "var(--text-muted)",
                  textDecoration: "none",
                }}
              >
                Raymind.AI
              </a>
            </p>
            <p
              style={{
                fontSize: 11,
                color: "var(--text-faint)",
                fontFamily: "var(--font-geist-mono), monospace",
                margin: 0,
              }}
            >
              &copy; 2026 mdfy.cc. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
