import type { Metadata } from "next";
import Link from "next/link";
import MdfyLogo from "@/components/MdfyLogo";

export const metadata: Metadata = {
  title: "Documentation — mdfy.cc",
  description:
    "Complete API reference for mdfy.cc. REST API, CLI, JavaScript SDK, MCP server, and npm packages. Publish Markdown documents programmatically.",
  openGraph: {
    title: "Documentation — mdfy.cc",
    description:
      "Complete API reference. REST, CLI, SDK, MCP server. Publish Markdown instantly.",
    url: "https://mdfy.cc/docs",
  },
};

/* ────────────────────────────────────────────────────────────
   Shared styles
   ──────────────────────────────────────────────────────────── */

const mono =
  "var(--font-geist-mono), 'SF Mono', 'Fira Code', 'JetBrains Mono', monospace";

function CodeBlock({
  children,
  lang,
}: {
  children: string;
  lang?: string;
}) {
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
            fontFamily: mono,
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
          fontFamily: mono,
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

function SectionHeading({
  id,
  children,
}: {
  id: string;
  children: string;
}) {
  return (
    <h2
      id={id}
      style={{
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: 2,
        textTransform: "uppercase",
        color: "var(--text-muted)",
        marginBottom: 32,
        fontFamily: mono,
        scrollMarginTop: 80,
      }}
    >
      {children}
    </h2>
  );
}

function InlineCode({ children }: { children: string }) {
  return (
    <code
      style={{
        background: "#18181b",
        padding: "2px 6px",
        borderRadius: 4,
        fontSize: 13,
        fontFamily: mono,
        color: "var(--accent)",
      }}
    >
      {children}
    </code>
  );
}

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, { fg: string; bg: string }> = {
    POST: { fg: "#4ade80", bg: "#4ade8015" },
    GET: { fg: "#60a5fa", bg: "#60a5fa15" },
    PATCH: { fg: "#fbbf24", bg: "#fbbf2415" },
    DELETE: { fg: "#f87171", bg: "#f8717115" },
    HEAD: { fg: "#a78bfa", bg: "#a78bfa15" },
  };
  const c = colors[method] || { fg: "var(--text-secondary)", bg: "var(--surface)" };
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        fontFamily: mono,
        color: c.fg,
        background: c.bg,
        padding: "3px 10px",
        borderRadius: 6,
      }}
    >
      {method}
    </span>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border-dim)",
        borderRadius: 14,
        padding: "28px 24px",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Data
   ──────────────────────────────────────────────────────────── */

const tocItems = [
  { id: "quick-start", label: "Quick Start" },
  { id: "rest-api", label: "REST API" },
  { id: "cli", label: "CLI" },
  { id: "sdk", label: "JavaScript SDK" },
  { id: "mcp", label: "MCP Server" },
  { id: "auth", label: "Authentication" },
  { id: "integrations", label: "Integrations" },
  { id: "packages", label: "npm Packages" },
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
          padding: "100px 24px 60px",
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
          Publish Markdown documents programmatically. REST API, CLI, JavaScript
          SDK, MCP server for AI tools, and npm packages.
        </p>

        <p
          style={{
            fontSize: 14,
            color: "var(--text-muted)",
            marginTop: 16,
            fontFamily: mono,
          }}
        >
          Base URL:{" "}
          <InlineCode>https://mdfy.cc</InlineCode>
        </p>

        {/* TOC */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginTop: 32,
          }}
        >
          {tocItems.map((t) => (
            <a
              key={t.id}
              href={`#${t.id}`}
              style={{
                fontSize: 12,
                fontFamily: mono,
                color: "var(--text-muted)",
                textDecoration: "none",
                padding: "5px 12px",
                borderRadius: 6,
                border: "1px solid var(--border-dim)",
                background: "var(--surface)",
              }}
            >
              {t.label}
            </a>
          ))}
        </div>
      </section>

      {/* ───────── QUICK START ───────── */}
      <section
        style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px 80px" }}
      >
        <SectionHeading id="quick-start">Quick Start</SectionHeading>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
            gap: 16,
          }}
        >
          {/* curl */}
          <Card>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span
                style={{
                  color: "var(--accent)",
                  fontFamily: mono,
                  fontSize: 12,
                  fontWeight: 700,
                  background: "var(--accent-dim)",
                  padding: "3px 8px",
                  borderRadius: 6,
                }}
              >
                curl
              </span>
              <span style={{ color: "var(--text-primary)", fontSize: 15, fontWeight: 700 }}>
                REST API
              </span>
            </div>
            <CodeBlock lang="bash">{`curl -X POST https://mdfy.cc/api/docs \\
  -H "Content-Type: application/json" \\
  -d '{"markdown": "# Hello World"}'

# Response:
# {"id":"abc123","editToken":"tok_..."}
# View at: https://mdfy.cc/d/abc123`}</CodeBlock>
          </Card>

          {/* CLI */}
          <Card>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span
                style={{
                  color: "var(--accent)",
                  fontFamily: mono,
                  fontSize: 12,
                  fontWeight: 700,
                  background: "var(--accent-dim)",
                  padding: "3px 8px",
                  borderRadius: 6,
                }}
              >
                CLI
              </span>
              <span style={{ color: "var(--text-primary)", fontSize: 15, fontWeight: 700 }}>
                Command Line
              </span>
            </div>
            <CodeBlock lang="bash">{`npm install -g mdfy

echo "# Hello World" | mdfy publish
# Published: https://mdfy.cc/d/abc123

mdfy publish README.md
mdfy update abc123 README.md`}</CodeBlock>
          </Card>

          {/* SDK */}
          <Card>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span
                style={{
                  color: "var(--accent)",
                  fontFamily: mono,
                  fontSize: 12,
                  fontWeight: 700,
                  background: "var(--accent-dim)",
                  padding: "3px 8px",
                  borderRadius: 6,
                }}
              >
                JS
              </span>
              <span style={{ color: "var(--text-primary)", fontSize: 15, fontWeight: 700 }}>
                JavaScript SDK
              </span>
            </div>
            <CodeBlock lang="typescript">{`import { publish } from "@mdcore/api";

const result = await publish("# Hello");
console.log(result.url);
// https://mdfy.cc/d/abc123`}</CodeBlock>
          </Card>
        </div>
      </section>

      {/* ───────── REST API REFERENCE ───────── */}
      <section
        style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px 80px" }}
      >
        <SectionHeading id="rest-api">REST API Reference</SectionHeading>

        <p
          style={{
            fontSize: 14,
            color: "var(--text-muted)",
            marginBottom: 32,
            lineHeight: 1.7,
            maxWidth: 640,
          }}
        >
          All endpoints accept and return JSON. Base URL:{" "}
          <InlineCode>https://mdfy.cc</InlineCode>.
          Rate limit: 10 requests per minute per IP. Max document size: 500KB.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

          {/* POST /api/docs */}
          <Card>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <MethodBadge method="POST" />
              <code style={{ fontSize: 14, fontFamily: mono, color: "var(--text-primary)" }}>
                /api/docs
              </code>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px" }}>
              Create a new document. Returns document ID, edit token, and creation timestamp.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 600, color: "var(--text-faint)", fontFamily: mono, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8, marginTop: 0 }}>
                  Request Body
                </p>
                <CodeBlock lang="json">{`{
  "markdown": "# Hello World",
  "title": "My Document",
  "isDraft": false,
  "source": "api",
  "password": "optional-password",
  "expiresIn": 168,
  "editMode": "token",
  "userId": "user-uuid",
  "folderId": "folder-id"
}`}</CodeBlock>
                <div style={{ marginTop: 12 }}>
                  <p style={{ fontSize: 11, color: "var(--text-faint)", fontFamily: mono, margin: 0, lineHeight: 1.8 }}>
                    markdown: string (required)<br />
                    title: string (optional)<br />
                    isDraft: boolean (default: true)<br />
                    source: &quot;api&quot; | &quot;web&quot; | &quot;vscode&quot; | &quot;mcp&quot;<br />
                    password: string (optional, protects reading)<br />
                    expiresIn: number (hours until expiry)<br />
                    editMode: &quot;token&quot; | &quot;account&quot;
                  </p>
                </div>
              </div>
              <div>
                <p style={{ fontSize: 10, fontWeight: 600, color: "var(--text-faint)", fontFamily: mono, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8, marginTop: 0 }}>
                  Response 200
                </p>
                <CodeBlock lang="json">{`{
  "id": "abc123",
  "editToken": "tok_aBcDeFgH...",
  "created_at": "2026-04-15T00:00:00Z"
}`}</CodeBlock>
                <div style={{ marginTop: 16 }}>
                  <p style={{ fontSize: 10, fontWeight: 600, color: "var(--text-faint)", fontFamily: mono, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8, marginTop: 0 }}>
                    curl Example
                  </p>
                  <CodeBlock lang="bash">{`curl -X POST https://mdfy.cc/api/docs \\
  -H "Content-Type: application/json" \\
  -d '{"markdown":"# Hello","isDraft":false}'`}</CodeBlock>
                </div>
              </div>
            </div>
          </Card>

          {/* GET /api/docs/{id} */}
          <Card>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <MethodBadge method="GET" />
              <code style={{ fontSize: 14, fontFamily: mono, color: "var(--text-primary)" }}>
                /api/docs/{"{id}"}
              </code>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px" }}>
              Read a document by ID. Draft documents are only accessible by their owner.
              Password-protected documents require <InlineCode>x-document-password</InlineCode> header.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 600, color: "var(--text-faint)", fontFamily: mono, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8, marginTop: 0 }}>
                  Headers (optional)
                </p>
                <CodeBlock>{`x-user-id: user-uuid
x-anonymous-id: anon-uuid
x-document-password: secret
x-user-email: user@example.com
Authorization: Bearer <token>`}</CodeBlock>
              </div>
              <div>
                <p style={{ fontSize: 10, fontWeight: 600, color: "var(--text-faint)", fontFamily: mono, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8, marginTop: 0 }}>
                  Response 200
                </p>
                <CodeBlock lang="json">{`{
  "id": "abc123",
  "title": "My Document",
  "markdown": "# Hello World",
  "created_at": "2026-04-15T00:00:00Z",
  "updated_at": "2026-04-15T01:00:00Z",
  "view_count": 42,
  "is_draft": false,
  "editMode": "token",
  "isOwner": true,
  "editToken": "tok_...",
  "hasPassword": false
}`}</CodeBlock>
              </div>
            </div>
          </Card>

          {/* PATCH /api/docs/{id} */}
          <Card>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <MethodBadge method="PATCH" />
              <code style={{ fontSize: 14, fontFamily: mono, color: "var(--text-primary)" }}>
                /api/docs/{"{id}"}
              </code>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px" }}>
              Update a document. Requires edit token or owner authentication.
              Also supports actions: <InlineCode>soft-delete</InlineCode>, <InlineCode>rotate-token</InlineCode>.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 600, color: "var(--text-faint)", fontFamily: mono, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8, marginTop: 0 }}>
                  Request Body
                </p>
                <CodeBlock lang="json">{`{
  "editToken": "tok_...",
  "markdown": "# Updated content",
  "title": "New Title",
  "isDraft": false,
  "changeSummary": "Fixed typo"
}`}</CodeBlock>
                <div style={{ marginTop: 12 }}>
                  <p style={{ fontSize: 11, color: "var(--text-faint)", fontFamily: mono, margin: 0, lineHeight: 1.8 }}>
                    editToken: string (required for token mode)<br />
                    markdown: string (new content)<br />
                    title: string (new title)<br />
                    isDraft: boolean (publish/unpublish)<br />
                    action: &quot;soft-delete&quot; | &quot;rotate-token&quot;<br />
                    changeSummary: string (version note)
                  </p>
                </div>
              </div>
              <div>
                <p style={{ fontSize: 10, fontWeight: 600, color: "var(--text-faint)", fontFamily: mono, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8, marginTop: 0 }}>
                  curl Example
                </p>
                <CodeBlock lang="bash">{`# Update content
curl -X PATCH https://mdfy.cc/api/docs/abc123 \\
  -H "Content-Type: application/json" \\
  -d '{"editToken":"tok_...","markdown":"# New"}'

# Soft delete
curl -X PATCH https://mdfy.cc/api/docs/abc123 \\
  -H "Content-Type: application/json" \\
  -d '{"editToken":"tok_...","action":"soft-delete"}'`}</CodeBlock>
              </div>
            </div>
          </Card>

          {/* HEAD /api/docs/{id} */}
          <Card>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <MethodBadge method="HEAD" />
              <code style={{ fontSize: 14, fontFamily: mono, color: "var(--text-primary)" }}>
                /api/docs/{"{id}"}
              </code>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px" }}>
              Check when a document was last updated. Returns <InlineCode>x-updated-at</InlineCode> header.
              Useful for sync polling without downloading full content.
            </p>
            <CodeBlock lang="bash">{`curl -I https://mdfy.cc/api/docs/abc123
# x-updated-at: 2026-04-15T01:00:00Z`}</CodeBlock>
          </Card>

          {/* GET /api/user/documents */}
          <Card>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <MethodBadge method="GET" />
              <code style={{ fontSize: 14, fontFamily: mono, color: "var(--text-primary)" }}>
                /api/user/documents
              </code>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px" }}>
              List all documents owned by a user. Requires <InlineCode>x-user-id</InlineCode> header
              or <InlineCode>Authorization</InlineCode> bearer token.
            </p>
            <CodeBlock lang="bash">{`curl https://mdfy.cc/api/user/documents \\
  -H "x-user-id: user-uuid"

# Response: { "documents": [ { "id", "title", "created_at", ... } ] }`}</CodeBlock>
          </Card>

          {/* POST /api/upload */}
          <Card>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <MethodBadge method="POST" />
              <code style={{ fontSize: 14, fontFamily: mono, color: "var(--text-primary)" }}>
                /api/upload
              </code>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px" }}>
              Upload an image. Returns a public URL. Accepts multipart form-data with a <InlineCode>file</InlineCode> field.
            </p>
            <CodeBlock lang="bash">{`curl -X POST https://mdfy.cc/api/upload \\
  -F "file=@screenshot.png"

# Response: { "url": "https://...storage.../screenshot.png" }`}</CodeBlock>
          </Card>

        </div>
      </section>

      {/* ───────── CLI REFERENCE ───────── */}
      <section
        style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px 80px" }}
      >
        <SectionHeading id="cli">CLI Reference</SectionHeading>

        <p
          style={{
            fontSize: 14,
            color: "var(--text-muted)",
            marginBottom: 24,
            lineHeight: 1.7,
            maxWidth: 640,
          }}
        >
          Install the CLI globally with <InlineCode>npm install -g mdfy</InlineCode>.
          Publish files or pipe stdin directly to mdfy.cc.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card>
            <p style={{ fontSize: 10, fontWeight: 600, color: "var(--text-faint)", fontFamily: mono, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12, marginTop: 0 }}>
              Core Commands
            </p>
            <CodeBlock lang="bash">{`# Publish a file
mdfy publish README.md

# Publish from stdin
echo "# Hello World" | mdfy publish

# Update an existing document
mdfy update abc123 README.md

# Download a document
mdfy pull abc123
mdfy pull abc123 -o output.md

# Delete a document
mdfy delete abc123

# List your documents
mdfy list

# Open in browser
mdfy open abc123`}</CodeBlock>
          </Card>

          <Card>
            <p style={{ fontSize: 10, fontWeight: 600, color: "var(--text-faint)", fontFamily: mono, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12, marginTop: 0 }}>
              Auth Commands
            </p>
            <CodeBlock lang="bash">{`mdfy login          # Authenticate with mdfy.cc
mdfy logout         # Clear credentials
mdfy whoami         # Show current user`}</CodeBlock>
          </Card>

          <Card>
            <p style={{ fontSize: 10, fontWeight: 600, color: "var(--text-faint)", fontFamily: mono, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12, marginTop: 0 }}>
              Pipe Examples
            </p>
            <CodeBlock lang="bash">{`# Clipboard to mdfy
pbpaste | mdfy publish

# Command output
ls -la | mdfy publish

# tmux pane capture
tmux capture-pane -p | mdfy publish

# Cat a file
cat report.md | mdfy publish

# Generate with AI, publish directly
claude "Write a guide to Rust" | mdfy publish`}</CodeBlock>
          </Card>
        </div>
      </section>

      {/* ───────── JAVASCRIPT SDK ───────── */}
      <section
        style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px 80px" }}
      >
        <SectionHeading id="sdk">JavaScript SDK</SectionHeading>

        <p
          style={{
            fontSize: 14,
            color: "var(--text-muted)",
            marginBottom: 24,
            lineHeight: 1.7,
            maxWidth: 640,
          }}
        >
          Install: <InlineCode>npm install @mdcore/api</InlineCode>.
          Works in Node.js, Deno, Bun, and browsers. Zero dependencies (uses native fetch).
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card>
            <p style={{ fontSize: 10, fontWeight: 600, color: "var(--text-faint)", fontFamily: mono, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12, marginTop: 0 }}>
              MdfyClient Class
            </p>
            <CodeBlock lang="typescript">{`import { MdfyClient } from "@mdcore/api";

const client = new MdfyClient({
  baseUrl: "https://mdfy.cc",  // default
  userId: "user-uuid",          // optional
  email: "user@example.com",    // optional
});

// Publish a document
const result = await client.publish("# Hello World", {
  title: "My Document",
  isDraft: false,
});
console.log(result.id);        // "abc123"
console.log(result.editToken); // "tok_..."
console.log(result.url);       // "https://mdfy.cc/d/abc123"

// Read a document
const doc = await client.pull("abc123");
console.log(doc.markdown);

// Update a document
await client.update("abc123", "# Updated", {
  editToken: result.editToken,
  title: "Updated Title",
});

// Delete a document (soft delete)
await client.delete("abc123", result.editToken);

// List user's documents
const docs = await client.list();

// Get version history
const versions = await client.versions("abc123");

// Upload an image
const imageUrl = await client.upload(file);

// Toggle draft/published
await client.setPublished("abc123", result.editToken);
await client.setDraft("abc123", result.editToken);`}</CodeBlock>
          </Card>

          <Card>
            <p style={{ fontSize: 10, fontWeight: 600, color: "var(--text-faint)", fontFamily: mono, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12, marginTop: 0 }}>
              Standalone Functions
            </p>
            <CodeBlock lang="typescript">{`import { publish, pull, update, deleteDocument, upload } from "@mdcore/api";

// Quick publish (no client setup needed)
const { id, editToken } = await publish("# Hello");

// Read
const doc = await pull(id);

// Update
await update(id, "# New content", editToken);

// Delete
await deleteDocument(id, editToken);`}</CodeBlock>
          </Card>
        </div>
      </section>

      {/* ───────── MCP SERVER ───────── */}
      <section
        style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px 80px" }}
      >
        <SectionHeading id="mcp">MCP Server</SectionHeading>

        <p
          style={{
            fontSize: 14,
            color: "var(--text-muted)",
            marginBottom: 24,
            lineHeight: 1.7,
            maxWidth: 640,
          }}
        >
          The MCP (Model Context Protocol) server lets AI tools like Claude, Cursor, and Windsurf
          create and manage documents on mdfy.cc directly.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card>
            <p style={{ fontSize: 10, fontWeight: 600, color: "var(--text-faint)", fontFamily: mono, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12, marginTop: 0 }}>
              Installation
            </p>
            <CodeBlock lang="bash">npx mdfy-mcp</CodeBlock>
          </Card>

          <Card>
            <p style={{ fontSize: 10, fontWeight: 600, color: "var(--text-faint)", fontFamily: mono, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12, marginTop: 0 }}>
              Claude Code (.mcp.json in project root)
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
          </Card>

          <Card>
            <p style={{ fontSize: 10, fontWeight: 600, color: "var(--text-faint)", fontFamily: mono, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12, marginTop: 0 }}>
              Claude Desktop (claude_desktop_config.json)
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
          </Card>

          <Card>
            <p style={{ fontSize: 10, fontWeight: 600, color: "var(--text-faint)", fontFamily: mono, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12, marginTop: 0 }}>
              Available MCP Tools
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))",
                gap: 12,
              }}
            >
              {[
                { name: "mdfy_create", desc: "Create a new document from Markdown. Returns URL, ID, and edit token.", args: "markdown, title, isDraft" },
                { name: "mdfy_read", desc: "Fetch a document's content and metadata by ID.", args: "id" },
                { name: "mdfy_update", desc: "Update an existing document's content or title.", args: "id, markdown, title, changeSummary" },
                { name: "mdfy_list", desc: "List all documents owned by the authenticated user.", args: "none" },
                { name: "mdfy_publish", desc: "Toggle a document between draft (private) and published (shared).", args: "id, isDraft" },
                { name: "mdfy_delete", desc: "Soft-delete a document. Can be restored by owner.", args: "id" },
              ].map((tool) => (
                <div
                  key={tool.name}
                  style={{
                    background: "#18181b",
                    borderRadius: 10,
                    padding: "16px 18px",
                  }}
                >
                  <code
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      fontFamily: mono,
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
                      margin: "6px 0 4px",
                    }}
                  >
                    {tool.desc}
                  </p>
                  <p
                    style={{
                      color: "var(--text-faint)",
                      fontSize: 11,
                      fontFamily: mono,
                      margin: 0,
                    }}
                  >
                    args: {tool.args}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <p style={{ fontSize: 10, fontWeight: 600, color: "var(--text-faint)", fontFamily: mono, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12, marginTop: 0 }}>
              Usage Example (in Claude)
            </p>
            <CodeBlock>{`You: "Create a technical blog post about WebAssembly
      performance and publish it on mdfy.cc"

Claude: [calls mdfy_create with markdown content]
        Document created: https://mdfy.cc/d/abc123`}</CodeBlock>
          </Card>
        </div>
      </section>

      {/* ───────── AUTHENTICATION ───────── */}
      <section
        style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px 80px" }}
      >
        <SectionHeading id="auth">Authentication</SectionHeading>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
            gap: 16,
          }}
        >
          <Card>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginTop: 0, marginBottom: 12 }}>
              No auth required
            </h3>
            <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.7, margin: 0 }}>
              Creating and reading public documents requires no authentication.
              POST to <InlineCode>/api/docs</InlineCode> and get a URL instantly.
              The returned <InlineCode>editToken</InlineCode> is your proof of ownership.
            </p>
          </Card>

          <Card>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginTop: 0, marginBottom: 12 }}>
              Edit tokens
            </h3>
            <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.7, margin: 0 }}>
              Every document gets an <InlineCode>editToken</InlineCode> at creation.
              Include it in PATCH requests to update or delete.
              The MCP server and CLI manage tokens automatically.
            </p>
          </Card>

          <Card>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginTop: 0, marginBottom: 12 }}>
              User identity
            </h3>
            <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.7, margin: 0 }}>
              For user-scoped actions (list documents, ownership), provide identity via:<br />
              <InlineCode>x-user-id</InlineCode> header, or<br />
              <InlineCode>x-user-email</InlineCode> header, or<br />
              <InlineCode>Authorization: Bearer</InlineCode> JWT token (OAuth apps).
            </p>
          </Card>

          <Card>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginTop: 0, marginBottom: 12 }}>
              MCP / CLI auth
            </h3>
            <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.7, margin: 0 }}>
              Set <InlineCode>MDFY_EMAIL</InlineCode> environment variable.
              The MCP server uses this for user identification.
              CLI uses <InlineCode>mdfy login</InlineCode> for OAuth-based auth.
            </p>
          </Card>
        </div>
      </section>

      {/* ───────── INTEGRATIONS ───────── */}
      <section
        style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px 80px" }}
      >
        <SectionHeading id="integrations">Integrations</SectionHeading>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
            gap: 16,
          }}
        >
          {[
            {
              name: "VS Code Extension",
              desc: "Edit, preview, and sync documents directly in VS Code. WYSIWYG mode, cloud sync, sidebar panel.",
              link: "/plugins",
            },
            {
              name: "mdfy for Mac",
              desc: "Native macOS app. Menu bar access, drag-and-drop publishing, offline editing.",
              link: "/plugins",
            },
            {
              name: "Chrome Extension",
              desc: "Capture AI conversations from ChatGPT, Claude, and Gemini. One-click publish to mdfy.cc.",
              link: "/plugins",
            },
            {
              name: "QuickLook",
              desc: "Preview .md files in Finder with mdfy rendering quality. macOS QuickLook plugin.",
              link: "/plugins",
            },
          ].map((item) => (
            <Link
              key={item.name}
              href={item.link}
              style={{
                textDecoration: "none",
              }}
            >
              <Card style={{ height: "100%" }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginTop: 0, marginBottom: 8 }}>
                  {item.name}
                </h3>
                <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>
                  {item.desc}
                </p>
              </Card>
            </Link>
          ))}
        </div>

        <p style={{ fontSize: 13, color: "var(--text-faint)", marginTop: 16 }}>
          See all integrations at{" "}
          <Link href="/plugins" style={{ color: "var(--accent)", textDecoration: "none" }}>
            mdfy.cc/plugins
          </Link>
        </p>
      </section>

      {/* ───────── NPM PACKAGES ───────── */}
      <section
        style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px 80px" }}
      >
        <SectionHeading id="packages">npm Packages</SectionHeading>

        <p
          style={{
            fontSize: 14,
            color: "var(--text-muted)",
            marginBottom: 24,
            lineHeight: 1.7,
            maxWidth: 640,
          }}
        >
          Independent packages. Each can be installed and used separately. No cross-dependencies.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {[
            {
              pkg: "@mdcore/api",
              desc: "HTTP client for mdfy.cc. Publish, read, update, delete documents. Zero dependencies (native fetch).",
              install: "npm install @mdcore/api",
            },
            {
              pkg: "@mdcore/engine",
              desc: "WASM Markdown renderer (Rust/comrak). GFM, KaTeX math, Mermaid diagrams, syntax highlighting, code copy buttons.",
              install: "npm install @mdcore/engine",
            },
            {
              pkg: "@mdcore/styles",
              desc: "CSS-only package. Dark/light themes, rendered document styles, print/PDF styles. No JavaScript.",
              install: "npm install @mdcore/styles",
            },
            {
              pkg: "@mdcore/ai",
              desc: "AI provider integrations. Gemini, OpenAI, Anthropic. Text-to-Markdown, ASCII rendering, conversation parsing.",
              install: "npm install @mdcore/ai",
            },
            {
              pkg: "mdfy-mcp",
              desc: "MCP server for AI tools. Claude Code, Claude Desktop, Cursor, Windsurf. 6 tools for document management.",
              install: "npx mdfy-mcp",
            },
          ].map((p, i) => (
            <div
              key={p.pkg}
              style={{
                display: "grid",
                gridTemplateColumns: "200px 1fr 260px",
                gap: 16,
                alignItems: "center",
                padding: "18px 20px",
                background: i % 2 === 0 ? "var(--surface)" : "transparent",
                borderRadius: 10,
              }}
            >
              <code
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: mono,
                  color: "var(--accent)",
                }}
              >
                {p.pkg}
              </code>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-muted)",
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                {p.desc}
              </p>
              <code
                style={{
                  fontSize: 12,
                  fontFamily: mono,
                  color: "var(--text-faint)",
                }}
              >
                {p.install}
              </code>
            </div>
          ))}
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
          Publish your first document in under 30 seconds.
        </p>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <CodeBlock lang="bash">{`curl -X POST https://mdfy.cc/api/docs \\
  -H "Content-Type: application/json" \\
  -d '{"markdown": "# Hello from the API", "isDraft": false}'`}</CodeBlock>
        </div>
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
                  fontFamily: mono,
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
                  fontFamily: mono,
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
                  fontFamily: mono,
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
                fontFamily: mono,
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
                fontFamily: mono,
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
