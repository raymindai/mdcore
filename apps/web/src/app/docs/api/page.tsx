import type { Metadata } from "next";
import Link from "next/link";
import MdfyLogo from "@/components/MdfyLogo";

export const metadata: Metadata = {
  title: "REST API Reference — mdfy.cc",
  description:
    "Complete REST API reference for mdfy.cc. Create, read, update, and delete Markdown documents via HTTP.",
  openGraph: {
    title: "REST API Reference — mdfy.cc",
    description: "Full REST API reference. Endpoints, parameters, examples.",
    url: "https://mdfy.cc/docs/api",
  },
};

const mono =
  "var(--font-geist-mono), 'SF Mono', 'Fira Code', 'JetBrains Mono', monospace";

/* ─── Shared Components ─── */

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
    POST: { fg: "#3b82f6", bg: "#3b82f615" },
    GET: { fg: "#22c55e", bg: "#22c55e15" },
    PATCH: { fg: "#f59e0b", bg: "#f59e0b15" },
    DELETE: { fg: "#ef4444", bg: "#ef444415" },
    HEAD: { fg: "#a78bfa", bg: "#a78bfa15" },
  };
  const c = colors[method] || {
    fg: "var(--text-secondary)",
    bg: "var(--surface)",
  };
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
        letterSpacing: 0.5,
      }}
    >
      {method}
    </span>
  );
}

function ParamRow({
  name,
  type,
  required,
  children,
}: {
  name: string;
  type: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "160px 80px 1fr",
        gap: 12,
        alignItems: "baseline",
        padding: "10px 0",
        borderBottom: "1px solid var(--border-dim)",
      }}
    >
      <code
        style={{
          fontSize: 13,
          fontFamily: mono,
          color: "var(--text-primary)",
          fontWeight: 600,
        }}
      >
        {name}
        {required && (
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: "#ef4444",
              marginLeft: 6,
              verticalAlign: "super",
            }}
          >
            REQUIRED
          </span>
        )}
      </code>
      <span
        style={{
          fontSize: 12,
          fontFamily: mono,
          color: "var(--text-faint)",
        }}
      >
        {type}
      </span>
      <span
        style={{
          fontSize: 13,
          color: "var(--text-muted)",
          lineHeight: 1.6,
        }}
      >
        {children}
      </span>
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
        fontSize: 22,
        fontWeight: 800,
        color: "var(--text-primary)",
        marginTop: 64,
        marginBottom: 12,
        letterSpacing: "-0.02em",
        scrollMarginTop: 80,
      }}
    >
      {children}
    </h2>
  );
}

function EndpointBlock({
  id,
  method,
  path,
  description,
  children,
}: {
  id: string;
  method: string;
  path: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div
      id={id}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border-dim)",
        borderRadius: 14,
        padding: "28px 24px",
        marginBottom: 20,
        scrollMarginTop: 80,
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
        <MethodBadge method={method} />
        <code
          style={{
            fontSize: 15,
            fontFamily: mono,
            color: "var(--text-primary)",
            fontWeight: 600,
          }}
        >
          {path}
        </code>
      </div>
      <p
        style={{
          fontSize: 14,
          color: "var(--text-muted)",
          margin: "0 0 24px",
          lineHeight: 1.7,
          maxWidth: 640,
        }}
      >
        {description}
      </p>
      {children}
    </div>
  );
}

function SubLabel({ children }: { children: string }) {
  return (
    <p
      style={{
        fontSize: 10,
        fontWeight: 600,
        color: "var(--text-faint)",
        fontFamily: mono,
        letterSpacing: 1,
        textTransform: "uppercase",
        marginBottom: 8,
        marginTop: 24,
      }}
    >
      {children}
    </p>
  );
}

/* ─── Sidebar Items ─── */
const sidebarItems = [
  { id: "overview", label: "Overview" },
  { id: "post-docs", label: "POST /api/docs" },
  { id: "get-docs-id", label: "GET /api/docs/{id}" },
  { id: "patch-docs-id", label: "PATCH /api/docs/{id}" },
  { id: "head-docs-id", label: "HEAD /api/docs/{id}" },
  { id: "get-user-documents", label: "GET /api/user/documents" },
  { id: "post-upload", label: "POST /api/upload" },
  { id: "authentication", label: "Authentication" },
  { id: "rate-limits", label: "Rate Limits" },
  { id: "errors", label: "Errors" },
];

/* ─── Page ─── */
export default function ApiDocsPage() {
  return (
    <div
      style={{
        background: "var(--background)",
        color: "var(--foreground)",
        minHeight: "100vh",
      }}
    >
      {/* NAV */}
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
            maxWidth: 1200,
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
              <Link href="/about" style={{ color: "var(--text-muted)", fontSize: 13, textDecoration: "none" }}>About</Link>
              <Link href="/plugins" style={{ color: "var(--text-muted)", fontSize: 13, textDecoration: "none" }}>Plugins</Link>
              <Link href="/docs" style={{ color: "var(--accent)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>API</Link>
            </div>
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <a href="https://github.com/raymindai/mdcore" target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-muted)", fontSize: 13, textDecoration: "none" }}>GitHub</a>
            <Link href="/" style={{ background: "var(--accent-dim)", color: "var(--accent)", padding: "6px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Open Editor</Link>
          </div>
        </div>
      </nav>

      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 24px",
          display: "grid",
          gridTemplateColumns: "200px 1fr",
          gap: 48,
        }}
      >
        {/* SIDEBAR */}
        <aside
          style={{
            position: "sticky",
            top: 72,
            height: "fit-content",
            maxHeight: "calc(100vh - 72px)",
            overflowY: "auto",
            paddingTop: 40,
            paddingBottom: 40,
          }}
        >
          <p
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "var(--text-faint)",
              fontFamily: mono,
              letterSpacing: 1,
              textTransform: "uppercase",
              marginBottom: 16,
              marginTop: 0,
            }}
          >
            On This Page
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {sidebarItems.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                style={{
                  fontSize: 13,
                  color: "var(--text-muted)",
                  textDecoration: "none",
                  padding: "5px 12px",
                  borderRadius: 6,
                  display: "block",
                }}
              >
                {item.label}
              </a>
            ))}
          </div>

          <div
            style={{
              borderTop: "1px solid var(--border-dim)",
              marginTop: 24,
              paddingTop: 16,
            }}
          >
            <p
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "var(--text-faint)",
                fontFamily: mono,
                letterSpacing: 1,
                textTransform: "uppercase",
                marginBottom: 12,
                marginTop: 0,
              }}
            >
              Also See
            </p>
            {[
              { label: "CLI", href: "/docs/cli" },
              { label: "SDK", href: "/docs/sdk" },
              { label: "MCP Server", href: "/docs/mcp" },
            ].map((l) => (
              <Link
                key={l.label}
                href={l.href}
                style={{
                  display: "block",
                  fontSize: 13,
                  color: "var(--text-faint)",
                  textDecoration: "none",
                  padding: "4px 12px",
                }}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main style={{ paddingTop: 40, paddingBottom: 80, minWidth: 0 }}>
          {/* Overview */}
          <div id="overview" style={{ scrollMarginTop: 80 }}>
            <p
              style={{
                color: "var(--accent)",
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: 2,
                textTransform: "uppercase",
                marginBottom: 12,
                fontFamily: mono,
              }}
            >
              REST API
            </p>
            <h1
              style={{
                fontSize: "clamp(28px, 4vw, 40px)",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: "var(--text-primary)",
                margin: "0 0 16px",
              }}
            >
              API Reference
            </h1>
            <p
              style={{
                fontSize: 16,
                color: "var(--text-muted)",
                lineHeight: 1.7,
                marginBottom: 8,
                maxWidth: 640,
              }}
            >
              All endpoints accept and return JSON. Base URL:{" "}
              <InlineCode>{"https://mdfy.cc"}</InlineCode>
            </p>
            <p
              style={{
                fontSize: 14,
                color: "var(--text-faint)",
                lineHeight: 1.7,
                marginBottom: 32,
              }}
            >
              Rate limit: 10 requests/min per IP. Max document size: 500KB.
            </p>
          </div>

          {/* ─── POST /api/docs ─── */}
          <EndpointBlock
            id="post-docs"
            method="POST"
            path="/api/docs"
            description="Create a new document. Returns document ID, edit token, and creation timestamp."
          >
            <SubLabel>Parameters</SubLabel>
            <div style={{ marginBottom: 24 }}>
              <ParamRow name="markdown" type="string" required>
                The Markdown content of the document.
              </ParamRow>
              <ParamRow name="title" type="string">
                Document title. If not provided, extracted from the first heading.
              </ParamRow>
              <ParamRow name="isDraft" type="boolean">
                Draft status. Default: <InlineCode>{"false"}</InlineCode>. Draft documents are only visible to the owner.
              </ParamRow>
              <ParamRow name="source" type="string">
                Source identifier: <InlineCode>{"api"}</InlineCode>, <InlineCode>{"web"}</InlineCode>, <InlineCode>{"vscode"}</InlineCode>, <InlineCode>{"mcp"}</InlineCode>, <InlineCode>{"cli"}</InlineCode>.
              </ParamRow>
              <ParamRow name="password" type="string">
                Password-protect the document. Readers must provide this to view.
              </ParamRow>
              <ParamRow name="expiresIn" type="string">
                Time until document expires: <InlineCode>{"1h"}</InlineCode>, <InlineCode>{"1d"}</InlineCode>, <InlineCode>{"7d"}</InlineCode>, <InlineCode>{"30d"}</InlineCode>. Omit for permanent.
              </ParamRow>
              <ParamRow name="editMode" type="string">
                Who can edit: <InlineCode>{"token"}</InlineCode> (default, requires editToken), <InlineCode>{"anyone"}</InlineCode>, <InlineCode>{"authenticated"}</InlineCode>.
              </ParamRow>
              <ParamRow name="folderId" type="string">
                Place the document in a specific folder.
              </ParamRow>
            </div>

            <SubLabel>Request - curl</SubLabel>
            <CodeBlock lang="bash">{`curl -X POST https://mdfy.cc/api/docs \\
  -H "Content-Type: application/json" \\
  -d '{
    "markdown": "# Hello World\\nThis is my document.",
    "title": "My Document",
    "isDraft": false
  }'`}</CodeBlock>

            <SubLabel>Request - JavaScript</SubLabel>
            <CodeBlock lang="javascript">{`const res = await fetch("https://mdfy.cc/api/docs", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    markdown: "# Hello World\\nThis is my document.",
    title: "My Document",
    isDraft: false,
  }),
});
const data = await res.json();`}</CodeBlock>

            <SubLabel>Request - Python</SubLabel>
            <CodeBlock lang="python">{`import requests

res = requests.post("https://mdfy.cc/api/docs", json={
    "markdown": "# Hello World\\nThis is my document.",
    "title": "My Document",
    "isDraft": False,
})
data = res.json()`}</CodeBlock>

            <SubLabel>Response 200</SubLabel>
            <CodeBlock lang="json">{`{
  "id": "abc123",
  "editToken": "tok_aBcDeFgHiJkLmNoP",
  "created_at": "2026-04-15T00:00:00Z"
}`}</CodeBlock>
          </EndpointBlock>

          {/* ─── GET /api/docs/{id} ─── */}
          <EndpointBlock
            id="get-docs-id"
            method="GET"
            path="/api/docs/{id}"
            description="Read a document by ID. Draft documents require owner authentication. Password-protected documents require the x-document-password header."
          >
            <SubLabel>Headers (optional)</SubLabel>
            <div style={{ marginBottom: 24 }}>
              <ParamRow name="x-user-id" type="string">
                User UUID for ownership verification.
              </ParamRow>
              <ParamRow name="x-document-password" type="string">
                Password for protected documents.
              </ParamRow>
              <ParamRow name="x-user-email" type="string">
                User email for identification.
              </ParamRow>
              <ParamRow name="Authorization" type="string">
                Bearer token for OAuth-authenticated requests.
              </ParamRow>
            </div>

            <SubLabel>Request - curl</SubLabel>
            <CodeBlock lang="bash">{`curl https://mdfy.cc/api/docs/abc123

# With password:
curl https://mdfy.cc/api/docs/abc123 \\
  -H "x-document-password: mysecret"`}</CodeBlock>

            <SubLabel>Request - JavaScript</SubLabel>
            <CodeBlock lang="javascript">{`const res = await fetch("https://mdfy.cc/api/docs/abc123");
const doc = await res.json();`}</CodeBlock>

            <SubLabel>Request - Python</SubLabel>
            <CodeBlock lang="python">{`import requests

res = requests.get("https://mdfy.cc/api/docs/abc123")
doc = res.json()`}</CodeBlock>

            <SubLabel>Response 200</SubLabel>
            <CodeBlock lang="json">{`{
  "id": "abc123",
  "title": "My Document",
  "markdown": "# Hello World\\nThis is my document.",
  "created_at": "2026-04-15T00:00:00Z",
  "updated_at": "2026-04-15T01:00:00Z",
  "view_count": 42,
  "is_draft": false,
  "editMode": "token",
  "isOwner": true,
  "editToken": "tok_...",
  "hasPassword": false
}`}</CodeBlock>
          </EndpointBlock>

          {/* ─── PATCH /api/docs/{id} ─── */}
          <EndpointBlock
            id="patch-docs-id"
            method="PATCH"
            path="/api/docs/{id}"
            description="Update a document. Requires edit token or owner authentication. Supports multiple actions: update content, soft-delete, rotate-token, change-edit-mode."
          >
            <SubLabel>Parameters</SubLabel>
            <div style={{ marginBottom: 24 }}>
              <ParamRow name="editToken" type="string" required>
                The edit token returned at creation (required for token mode).
              </ParamRow>
              <ParamRow name="markdown" type="string">
                New Markdown content.
              </ParamRow>
              <ParamRow name="title" type="string">
                New document title.
              </ParamRow>
              <ParamRow name="isDraft" type="boolean">
                Toggle between draft and published state.
              </ParamRow>
              <ParamRow name="action" type="string">
                Special action: <InlineCode>{"soft-delete"}</InlineCode>, <InlineCode>{"rotate-token"}</InlineCode>.
              </ParamRow>
              <ParamRow name="changeSummary" type="string">
                Version note describing the change.
              </ParamRow>
              <ParamRow name="editMode" type="string">
                Change edit mode: <InlineCode>{"token"}</InlineCode>, <InlineCode>{"anyone"}</InlineCode>, <InlineCode>{"authenticated"}</InlineCode>.
              </ParamRow>
            </div>

            <SubLabel>Request - curl (update content)</SubLabel>
            <CodeBlock lang="bash">{`curl -X PATCH https://mdfy.cc/api/docs/abc123 \\
  -H "Content-Type: application/json" \\
  -d '{
    "editToken": "tok_aBcDeFgH",
    "markdown": "# Updated Content",
    "changeSummary": "Fixed typos"
  }'`}</CodeBlock>

            <SubLabel>Request - curl (soft delete)</SubLabel>
            <CodeBlock lang="bash">{`curl -X PATCH https://mdfy.cc/api/docs/abc123 \\
  -H "Content-Type: application/json" \\
  -d '{
    "editToken": "tok_aBcDeFgH",
    "action": "soft-delete"
  }'`}</CodeBlock>

            <SubLabel>Request - JavaScript</SubLabel>
            <CodeBlock lang="javascript">{`const res = await fetch("https://mdfy.cc/api/docs/abc123", {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    editToken: "tok_aBcDeFgH",
    markdown: "# Updated Content",
  }),
});`}</CodeBlock>

            <SubLabel>Request - Python</SubLabel>
            <CodeBlock lang="python">{`import requests

res = requests.patch("https://mdfy.cc/api/docs/abc123", json={
    "editToken": "tok_aBcDeFgH",
    "markdown": "# Updated Content",
})`}</CodeBlock>

            <SubLabel>Response 200</SubLabel>
            <CodeBlock lang="json">{`{
  "success": true,
  "id": "abc123",
  "updated_at": "2026-04-15T02:00:00Z"
}`}</CodeBlock>
          </EndpointBlock>

          {/* ─── HEAD /api/docs/{id} ─── */}
          <EndpointBlock
            id="head-docs-id"
            method="HEAD"
            path="/api/docs/{id}"
            description="Check when a document was last updated. Returns x-updated-at response header. Useful for sync polling without downloading full content."
          >
            <SubLabel>Request - curl</SubLabel>
            <CodeBlock lang="bash">{`curl -I https://mdfy.cc/api/docs/abc123

# Response headers:
# x-updated-at: 2026-04-15T01:00:00Z
# x-content-length: 1234`}</CodeBlock>

            <SubLabel>Request - JavaScript</SubLabel>
            <CodeBlock lang="javascript">{`const res = await fetch("https://mdfy.cc/api/docs/abc123", {
  method: "HEAD",
});
const updatedAt = res.headers.get("x-updated-at");`}</CodeBlock>

            <SubLabel>Request - Python</SubLabel>
            <CodeBlock lang="python">{`import requests

res = requests.head("https://mdfy.cc/api/docs/abc123")
updated_at = res.headers["x-updated-at"]`}</CodeBlock>
          </EndpointBlock>

          {/* ─── GET /api/user/documents ─── */}
          <EndpointBlock
            id="get-user-documents"
            method="GET"
            path="/api/user/documents"
            description="List all documents owned by a user. Requires user identification via header."
          >
            <SubLabel>Headers</SubLabel>
            <div style={{ marginBottom: 24 }}>
              <ParamRow name="x-user-id" type="string" required>
                User UUID. Alternatively use <InlineCode>{"x-user-email"}</InlineCode> or <InlineCode>{"Authorization: Bearer"}</InlineCode>.
              </ParamRow>
            </div>

            <SubLabel>Request - curl</SubLabel>
            <CodeBlock lang="bash">{`curl https://mdfy.cc/api/user/documents \\
  -H "x-user-id: user-uuid-here"`}</CodeBlock>

            <SubLabel>Request - JavaScript</SubLabel>
            <CodeBlock lang="javascript">{`const res = await fetch("https://mdfy.cc/api/user/documents", {
  headers: { "x-user-id": "user-uuid-here" },
});
const { documents } = await res.json();`}</CodeBlock>

            <SubLabel>Request - Python</SubLabel>
            <CodeBlock lang="python">{`import requests

res = requests.get("https://mdfy.cc/api/user/documents",
    headers={"x-user-id": "user-uuid-here"})
documents = res.json()["documents"]`}</CodeBlock>

            <SubLabel>Response 200</SubLabel>
            <CodeBlock lang="json">{`{
  "documents": [
    {
      "id": "abc123",
      "title": "My Document",
      "created_at": "2026-04-15T00:00:00Z",
      "updated_at": "2026-04-15T01:00:00Z",
      "is_draft": false,
      "view_count": 42
    }
  ]
}`}</CodeBlock>
          </EndpointBlock>

          {/* ─── POST /api/upload ─── */}
          <EndpointBlock
            id="post-upload"
            method="POST"
            path="/api/upload"
            description="Upload an image file. Returns a public URL. Accepts multipart form-data with a file field."
          >
            <SubLabel>Request - curl</SubLabel>
            <CodeBlock lang="bash">{`curl -X POST https://mdfy.cc/api/upload \\
  -F "file=@screenshot.png"`}</CodeBlock>

            <SubLabel>Request - JavaScript</SubLabel>
            <CodeBlock lang="javascript">{`const form = new FormData();
form.append("file", fileBlob, "screenshot.png");

const res = await fetch("https://mdfy.cc/api/upload", {
  method: "POST",
  body: form,
});
const { url } = await res.json();`}</CodeBlock>

            <SubLabel>Request - Python</SubLabel>
            <CodeBlock lang="python">{`import requests

with open("screenshot.png", "rb") as f:
    res = requests.post("https://mdfy.cc/api/upload",
        files={"file": f})
url = res.json()["url"]`}</CodeBlock>

            <SubLabel>Response 200</SubLabel>
            <CodeBlock lang="json">{`{
  "url": "https://storage.mdfy.cc/uploads/screenshot.png"
}`}</CodeBlock>
          </EndpointBlock>

          {/* ─── Authentication ─── */}
          <SectionHeading id="authentication">Authentication</SectionHeading>
          <p
            style={{
              fontSize: 14,
              color: "var(--text-muted)",
              lineHeight: 1.7,
              marginBottom: 24,
              maxWidth: 640,
            }}
          >
            mdfy.cc uses progressive authentication. Basic operations require no auth.
            Advanced features use edit tokens or user identity.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
              gap: 16,
              marginBottom: 24,
            }}
          >
            {[
              {
                title: "No auth required",
                desc: "POST /api/docs and GET /api/docs/{id} work without authentication. The returned editToken is your proof of ownership.",
              },
              {
                title: "Edit tokens",
                desc: "Every document gets an editToken at creation. Include it in PATCH requests to update or delete. MCP server and CLI manage tokens automatically.",
              },
              {
                title: "User identity",
                desc: "For user-scoped actions (list, ownership), provide x-user-id header, x-user-email header, or Authorization: Bearer JWT token.",
              },
              {
                title: "MCP / CLI auth",
                desc: "Both MCP server and CLI use JWT from mdfy login. Run: npm install -g mdfy-cli && mdfy login",
              },
            ].map((item) => (
              <div
                key={item.title}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border-dim)",
                  borderRadius: 14,
                  padding: "24px",
                }}
              >
                <h3
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    marginTop: 0,
                    marginBottom: 10,
                  }}
                >
                  {item.title}
                </h3>
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--text-muted)",
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          {/* ─── Rate Limits ─── */}
          <SectionHeading id="rate-limits">Rate Limits</SectionHeading>
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border-dim)",
              borderRadius: 14,
              padding: "24px",
              marginBottom: 24,
            }}
          >
            <p
              style={{
                fontSize: 14,
                color: "var(--text-muted)",
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              All endpoints are rate-limited to <strong>10 requests per minute per IP</strong>.
              Exceeding the limit returns <InlineCode>{"429 Too Many Requests"}</InlineCode>.
              The response includes <InlineCode>{"Retry-After"}</InlineCode> header indicating seconds to wait.
              Maximum document size is <strong>500KB</strong>.
            </p>
          </div>

          {/* ─── Errors ─── */}
          <SectionHeading id="errors">Errors</SectionHeading>
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border-dim)",
              borderRadius: 14,
              padding: "24px",
              marginBottom: 24,
            }}
          >
            <div style={{ marginBottom: 16 }}>
              <ParamRow name="400" type="error">Bad Request. Missing required fields or invalid parameters.</ParamRow>
              <ParamRow name="401" type="error">Unauthorized. Invalid or missing edit token / credentials.</ParamRow>
              <ParamRow name="403" type="error">Forbidden. Password required or wrong password.</ParamRow>
              <ParamRow name="404" type="error">Not Found. Document does not exist or has been deleted.</ParamRow>
              <ParamRow name="410" type="error">Gone. Document has expired.</ParamRow>
              <ParamRow name="429" type="error">Too Many Requests. Rate limit exceeded.</ParamRow>
              <ParamRow name="500" type="error">Internal Server Error. Please retry or contact support.</ParamRow>
            </div>
            <SubLabel>Error Response Format</SubLabel>
            <CodeBlock lang="json">{`{
  "error": "Document not found",
  "status": 404
}`}</CodeBlock>
          </div>
        </main>
      </div>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid var(--border-dim)" }}>
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "32px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <p style={{ fontSize: 12, color: "var(--text-faint)", fontFamily: mono, margin: 0 }}>
            <Link href="/docs" style={{ color: "var(--text-muted)", textDecoration: "none" }}>Documentation</Link>
            {" / "}REST API
          </p>
          <p style={{ fontSize: 11, color: "var(--text-faint)", fontFamily: mono, margin: 0 }}>
            &copy; 2026 mdfy.cc
          </p>
        </div>
      </footer>
    </div>
  );
}
