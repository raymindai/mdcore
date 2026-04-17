import type { Metadata } from "next";
import Link from "next/link";
import MdfyLogo from "@/components/MdfyLogo";

export const metadata: Metadata = {
  title: "MCP Server — mdfy.cc",
  description:
    "MCP (Model Context Protocol) server for mdfy.cc. Let Claude, Cursor, and Windsurf manage documents directly.",
  openGraph: {
    title: "MCP Server — mdfy.cc",
    description: "Let AI tools publish and manage documents on mdfy.cc.",
    url: "https://mdfy.cc/docs/mcp",
  },
};

const mono =
  "var(--font-geist-mono), 'SF Mono', 'Fira Code', 'JetBrains Mono', monospace";

function CodeBlock({ children, lang }: { children: string; lang?: string }) {
  return (
    <div style={{ position: "relative" }}>
      {lang && (
        <span style={{ position: "absolute", top: 10, right: 12, fontSize: 10, fontWeight: 600, color: "var(--text-faint)", fontFamily: mono, textTransform: "uppercase", letterSpacing: 1 }}>{lang}</span>
      )}
      <pre style={{ background: "#18181b", borderRadius: 10, padding: "18px 20px", overflow: "auto", fontSize: 13, lineHeight: 1.7, fontFamily: mono, color: "var(--text-secondary)", margin: 0, border: "none" }}>
        <code>{children}</code>
      </pre>
    </div>
  );
}

function InlineCode({ children }: { children: string }) {
  return (
    <code style={{ background: "#18181b", padding: "2px 6px", borderRadius: 4, fontSize: 13, fontFamily: mono, color: "var(--accent)" }}>{children}</code>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border-dim)", borderRadius: 14, padding: "28px 24px", ...style }}>
      {children}
    </div>
  );
}

function SectionHeading({ id, children }: { id: string; children: string }) {
  return (
    <h2 id={id} style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", marginTop: 64, marginBottom: 16, letterSpacing: "-0.02em", scrollMarginTop: 80 }}>
      {children}
    </h2>
  );
}

function SubLabel({ children }: { children: string }) {
  return (
    <p style={{ fontSize: 10, fontWeight: 600, color: "var(--text-faint)", fontFamily: mono, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8, marginTop: 24 }}>{children}</p>
  );
}

function ParamRow({ name, type, required, children }: { name: string; type: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "160px 80px 1fr", gap: 12, alignItems: "baseline", padding: "10px 0", borderBottom: "1px solid var(--border-dim)" }}>
      <code style={{ fontSize: 13, fontFamily: mono, color: "var(--text-primary)", fontWeight: 600 }}>
        {name}
        {required && <span style={{ fontSize: 9, fontWeight: 700, color: "#ef4444", marginLeft: 6, verticalAlign: "super" }}>REQUIRED</span>}
      </code>
      <span style={{ fontSize: 12, fontFamily: mono, color: "var(--text-faint)" }}>{type}</span>
      <span style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>{children}</span>
    </div>
  );
}

const sidebarItems = [
  { id: "what-is-mcp", label: "What is MCP" },
  { id: "installation", label: "Installation" },
  { id: "claude-code", label: "Claude Code Setup" },
  { id: "claude-desktop", label: "Claude Desktop Setup" },
  { id: "tools", label: "Available Tools" },
  { id: "mdfy-create", label: "mdfy_create" },
  { id: "mdfy-read", label: "mdfy_read" },
  { id: "mdfy-update", label: "mdfy_update" },
  { id: "mdfy-list", label: "mdfy_list" },
  { id: "mdfy-publish", label: "mdfy_publish" },
  { id: "mdfy-delete", label: "mdfy_delete" },
  { id: "examples", label: "Usage Examples" },
];

const tools = [
  {
    id: "mdfy-create",
    name: "mdfy_create",
    desc: "Create a new document from Markdown content. Returns the document URL, ID, and edit token.",
    params: [
      { name: "markdown", type: "string", required: true, desc: "The Markdown content." },
      { name: "title", type: "string", required: false, desc: "Document title." },
      { name: "isDraft", type: "boolean", required: false, desc: "Create as draft. Default: false." },
    ],
    example: `// In Claude Code:
"Publish this analysis as a document on mdfy.cc"

// Claude calls mdfy_create:
{
  "markdown": "# Performance Analysis\\n...",
  "title": "Performance Analysis",
  "isDraft": false
}

// Returns:
{
  "url": "https://mdfy.cc/d/abc123",
  "id": "abc123",
  "editToken": "tok_..."
}`,
  },
  {
    id: "mdfy-read",
    name: "mdfy_read",
    desc: "Fetch a document's content and metadata by ID.",
    params: [
      { name: "id", type: "string", required: true, desc: "Document ID." },
    ],
    example: `// "Read the document at mdfy.cc/d/abc123"

// Claude calls mdfy_read:
{ "id": "abc123" }

// Returns full markdown content and metadata`,
  },
  {
    id: "mdfy-update",
    name: "mdfy_update",
    desc: "Update an existing document's content or title.",
    params: [
      { name: "id", type: "string", required: true, desc: "Document ID." },
      { name: "markdown", type: "string", required: false, desc: "New Markdown content." },
      { name: "title", type: "string", required: false, desc: "New title." },
      { name: "changeSummary", type: "string", required: false, desc: "Description of changes." },
    ],
    example: `// "Update the document with the revised version"

// Claude calls mdfy_update:
{
  "id": "abc123",
  "markdown": "# Revised Analysis\\n...",
  "changeSummary": "Added benchmarks section"
}`,
  },
  {
    id: "mdfy-list",
    name: "mdfy_list",
    desc: "List all documents owned by the authenticated user.",
    params: [],
    example: `// "Show me my published documents"

// Claude calls mdfy_list (no parameters)
// Returns array of documents with id, title, status`,
  },
  {
    id: "mdfy-publish",
    name: "mdfy_publish",
    desc: "Toggle a document between draft (private) and published (shared) state.",
    params: [
      { name: "id", type: "string", required: true, desc: "Document ID." },
      { name: "isDraft", type: "boolean", required: true, desc: "Set to true for draft, false for published." },
    ],
    example: `// "Make document abc123 public"

// Claude calls mdfy_publish:
{ "id": "abc123", "isDraft": false }`,
  },
  {
    id: "mdfy-delete",
    name: "mdfy_delete",
    desc: "Soft-delete a document. Can be restored by owner.",
    params: [
      { name: "id", type: "string", required: true, desc: "Document ID." },
    ],
    example: `// "Delete the old draft"

// Claude calls mdfy_delete:
{ "id": "abc123" }`,
  },
];

export default function McpDocsPage() {
  return (
    <div style={{ background: "var(--background)", color: "var(--foreground)", minHeight: "100vh" }}>
      {/* NAV */}
      <nav style={{ position: "sticky", top: 0, zIndex: 40, borderBottom: "1px solid var(--border-dim)", background: "var(--header-bg)", backdropFilter: "blur(12px)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <Link href="/" style={{ textDecoration: "none" }}><MdfyLogo size={22} /></Link>
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

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "grid", gridTemplateColumns: "200px 1fr", gap: 48 }}>
        {/* SIDEBAR */}
        <aside style={{ position: "sticky", top: 72, height: "fit-content", maxHeight: "calc(100vh - 72px)", overflowY: "auto", paddingTop: 40, paddingBottom: 40 }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: "var(--text-faint)", fontFamily: mono, letterSpacing: 1, textTransform: "uppercase", marginBottom: 16, marginTop: 0 }}>On This Page</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {sidebarItems.map((item) => (
              <a key={item.id} href={`#${item.id}`} style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "none", padding: "5px 12px", borderRadius: 6, display: "block" }}>{item.label}</a>
            ))}
          </div>
          <div style={{ borderTop: "1px solid var(--border-dim)", marginTop: 24, paddingTop: 16 }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: "var(--text-faint)", fontFamily: mono, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12, marginTop: 0 }}>Also See</p>
            {[
              { label: "REST API", href: "/docs/api" },
              { label: "CLI", href: "/docs/cli" },
              { label: "SDK", href: "/docs/sdk" },
            ].map((l) => (
              <Link key={l.label} href={l.href} style={{ display: "block", fontSize: 13, color: "var(--text-faint)", textDecoration: "none", padding: "4px 12px" }}>{l.label}</Link>
            ))}
          </div>
        </aside>

        {/* MAIN */}
        <main style={{ paddingTop: 40, paddingBottom: 80, minWidth: 0 }}>
          <p style={{ color: "var(--accent)", fontSize: 13, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12, fontFamily: mono }}>MCP</p>
          <h1 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text-primary)", margin: "0 0 16px" }}>
            MCP Server
          </h1>
          <p style={{ fontSize: 16, color: "var(--text-muted)", lineHeight: 1.7, marginBottom: 32, maxWidth: 640 }}>
            Let Claude, Cursor, Windsurf, and other AI tools create and manage documents on mdfy.cc directly.
          </p>

          {/* What is MCP */}
          <SectionHeading id="what-is-mcp">What is MCP</SectionHeading>
          <Card>
            <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.8, margin: 0 }}>
              The <strong style={{ color: "var(--text-primary)" }}>Model Context Protocol (MCP)</strong> is an open standard
              that lets AI assistants interact with external tools and services. The mdfy MCP server exposes
              6 tools that any MCP-compatible AI client can use to publish, read, update, list, and delete
              documents on mdfy.cc.
            </p>
          </Card>

          {/* Installation */}
          <SectionHeading id="installation">Installation</SectionHeading>
          <Card>
            <CodeBlock lang="bash">{`npx mdfy-mcp`}</CodeBlock>
            <p style={{ fontSize: 13, color: "var(--text-faint)", marginTop: 12, marginBottom: 0, lineHeight: 1.7 }}>
              No global install needed. The server runs via <InlineCode>{"npx"}</InlineCode> and communicates over stdio.
              Set <InlineCode>{"MDFY_EMAIL"}</InlineCode> for user identification.
            </p>
          </Card>

          {/* Claude Code */}
          <SectionHeading id="claude-code">Claude Code Setup</SectionHeading>
          <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.7, marginBottom: 16 }}>
            Add to <InlineCode>{".mcp.json"}</InlineCode> in your project root:
          </p>
          <Card>
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

          {/* Claude Desktop */}
          <SectionHeading id="claude-desktop">Claude Desktop Setup</SectionHeading>
          <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.7, marginBottom: 16 }}>
            Add to <InlineCode>{"claude_desktop_config.json"}</InlineCode>:
          </p>
          <Card>
            <SubLabel>macOS</SubLabel>
            <p style={{ fontSize: 12, fontFamily: mono, color: "var(--text-faint)", margin: "0 0 12px" }}>
              ~/Library/Application Support/Claude/claude_desktop_config.json
            </p>
            <SubLabel>Windows</SubLabel>
            <p style={{ fontSize: 12, fontFamily: mono, color: "var(--text-faint)", margin: "0 0 12px" }}>
              %APPDATA%\Claude\claude_desktop_config.json
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

          {/* Tools */}
          <SectionHeading id="tools">Available Tools</SectionHeading>
          <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.7, marginBottom: 24 }}>
            The MCP server exposes 6 tools. Edit tokens are managed automatically by the server.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))",
              gap: 12,
              marginBottom: 32,
            }}
          >
            {tools.map((tool) => (
              <a
                key={tool.name}
                href={`#${tool.id}`}
                style={{ textDecoration: "none" }}
              >
                <div
                  style={{
                    background: "#18181b",
                    borderRadius: 10,
                    padding: "16px 18px",
                    height: "100%",
                  }}
                >
                  <code style={{ fontSize: 14, fontWeight: 700, fontFamily: mono, color: "var(--accent)" }}>{tool.name}</code>
                  <p style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.6, margin: "6px 0 0" }}>{tool.desc}</p>
                </div>
              </a>
            ))}
          </div>

          {/* Individual Tools */}
          {tools.map((tool) => (
            <div key={tool.id} id={tool.id} style={{ scrollMarginTop: 80, marginBottom: 32 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
                <code style={{ fontFamily: mono, color: "var(--accent)" }}>{tool.name}</code>
              </h3>
              <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.7, marginBottom: 16 }}>{tool.desc}</p>
              <Card>
                {tool.params.length > 0 && (
                  <>
                    <SubLabel>Parameters</SubLabel>
                    <div style={{ marginBottom: 16 }}>
                      {tool.params.map((p) => (
                        <ParamRow key={p.name} name={p.name} type={p.type} required={p.required}>
                          {p.desc}
                        </ParamRow>
                      ))}
                    </div>
                  </>
                )}
                <SubLabel>Example</SubLabel>
                <CodeBlock>{tool.example}</CodeBlock>
              </Card>
            </div>
          ))}

          {/* Usage Examples */}
          <SectionHeading id="examples">Usage Examples</SectionHeading>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Card>
              <SubLabel>Publish a document</SubLabel>
              <CodeBlock>{`You: "Write a blog post about WebAssembly and publish it on mdfy.cc"

Claude: I'll write the blog post and publish it for you.

[Claude writes the content, then calls mdfy_create]

Done! Your blog post is live at https://mdfy.cc/d/abc123`}</CodeBlock>
            </Card>

            <Card>
              <SubLabel>Update with revisions</SubLabel>
              <CodeBlock>{`You: "Update the document at mdfy.cc/d/abc123 - add a section about benchmarks"

Claude: I'll read the current document and add the benchmarks section.

[Claude calls mdfy_read, then mdfy_update with new content]

Updated! The document now includes the benchmarks section.`}</CodeBlock>
            </Card>

            <Card>
              <SubLabel>Manage documents</SubLabel>
              <CodeBlock>{`You: "Show me my recent documents and delete the old drafts"

Claude: Let me list your documents.

[Claude calls mdfy_list]

You have 5 documents:
1. "API Guide" (published) - updated 2h ago
2. "Draft notes" (draft) - updated 3d ago
3. "Old meeting notes" (draft) - updated 2w ago

Should I delete the old drafts (#2 and #3)?

You: "Yes"

[Claude calls mdfy_delete for each]

Done! Deleted 2 documents.`}</CodeBlock>
            </Card>
          </div>
        </main>
      </div>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid var(--border-dim)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <p style={{ fontSize: 12, color: "var(--text-faint)", fontFamily: mono, margin: 0 }}>
            <Link href="/docs" style={{ color: "var(--text-muted)", textDecoration: "none" }}>Documentation</Link>{" / "}MCP Server
          </p>
          <p style={{ fontSize: 11, color: "var(--text-faint)", fontFamily: mono, margin: 0 }}>&copy; 2026 mdfy.cc</p>
        </div>
      </footer>
    </div>
  );
}
