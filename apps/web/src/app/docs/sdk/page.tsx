import type { Metadata } from "next";
import Link from "next/link";
import MdfyLogo from "@/components/MdfyLogo";

export const metadata: Metadata = {
  title: "JavaScript SDK — mdfy.cc",
  description:
    "JavaScript/TypeScript SDK for mdfy.cc. MdfyClient class, standalone functions, npm packages.",
  openGraph: {
    title: "JavaScript SDK — mdfy.cc",
    description: "TypeScript-first SDK. Publish, read, update documents.",
    url: "https://mdfy.cc/docs/sdk",
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

function MethodRow({ name, returns, desc }: { name: string; returns: string; desc: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px 120px 1fr", gap: 12, alignItems: "baseline", padding: "10px 0", borderBottom: "1px solid var(--border-dim)" }}>
      <code style={{ fontSize: 13, fontFamily: mono, color: "var(--accent)", fontWeight: 600 }}>{name}</code>
      <span style={{ fontSize: 12, fontFamily: mono, color: "var(--text-faint)" }}>{returns}</span>
      <span style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>{desc}</span>
    </div>
  );
}

const sidebarItems = [
  { id: "installation", label: "Installation" },
  { id: "quick-start", label: "Quick Start" },
  { id: "client", label: "MdfyClient" },
  { id: "client-publish", label: "client.publish()" },
  { id: "client-pull", label: "client.pull()" },
  { id: "client-update", label: "client.update()" },
  { id: "client-delete", label: "client.delete()" },
  { id: "client-list", label: "client.list()" },
  { id: "client-versions", label: "client.versions()" },
  { id: "client-upload", label: "client.upload()" },
  { id: "standalone", label: "Standalone Functions" },
  { id: "packages", label: "npm Packages" },
];

export default function SdkDocsPage() {
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
              { label: "MCP Server", href: "/docs/mcp" },
            ].map((l) => (
              <Link key={l.label} href={l.href} style={{ display: "block", fontSize: 13, color: "var(--text-faint)", textDecoration: "none", padding: "4px 12px" }}>{l.label}</Link>
            ))}
          </div>
        </aside>

        {/* MAIN */}
        <main style={{ paddingTop: 40, paddingBottom: 80, minWidth: 0 }}>
          <p style={{ color: "var(--accent)", fontSize: 13, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12, fontFamily: mono }}>SDK</p>
          <h1 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text-primary)", margin: "0 0 16px" }}>
            JavaScript SDK
          </h1>
          <p style={{ fontSize: 16, color: "var(--text-muted)", lineHeight: 1.7, marginBottom: 32, maxWidth: 640 }}>
            TypeScript-first client for mdfy.cc. Works in Node.js, Deno, Bun, and browsers. Zero dependencies.
          </p>

          {/* Installation */}
          <SectionHeading id="installation">Installation</SectionHeading>
          <Card>
            <CodeBlock lang="bash">{`npm install @mdcore/api`}</CodeBlock>
            <p style={{ fontSize: 13, color: "var(--text-faint)", marginTop: 12, marginBottom: 0, lineHeight: 1.7 }}>
              Also available: <InlineCode>{"yarn add @mdcore/api"}</InlineCode> or <InlineCode>{"pnpm add @mdcore/api"}</InlineCode>
            </p>
          </Card>

          {/* Quick Start */}
          <SectionHeading id="quick-start">Quick Start</SectionHeading>
          <Card>
            <CodeBlock lang="typescript">{`import { publish } from "@mdcore/api";

const result = await publish("# Hello World");
console.log(result.url);  // https://mdfy.cc/d/abc123`}</CodeBlock>
          </Card>

          {/* MdfyClient */}
          <SectionHeading id="client">MdfyClient</SectionHeading>
          <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.7, marginBottom: 16, maxWidth: 640 }}>
            The <InlineCode>{"MdfyClient"}</InlineCode> class provides a stateful client with user identity and base URL configuration.
          </p>
          <Card>
            <CodeBlock lang="typescript">{`import { MdfyClient } from "@mdcore/api";

const client = new MdfyClient({
  baseUrl: "https://mdfy.cc",  // default
  userId: "user-uuid",          // optional
  email: "user@example.com",    // optional
});`}</CodeBlock>
            <SubLabel>Constructor Options</SubLabel>
            <MethodRow name="baseUrl" returns="string" desc="API base URL. Default: https://mdfy.cc" />
            <MethodRow name="userId" returns="string" desc="User UUID for ownership-based operations." />
            <MethodRow name="email" returns="string" desc="User email for identification." />

            <SubLabel>Methods</SubLabel>
            <MethodRow name="publish(markdown, options?)" returns="PublishResult" desc="Create a new document." />
            <MethodRow name="pull(id, options?)" returns="Document" desc="Read a document by ID." />
            <MethodRow name="update(id, markdown, options)" returns="void" desc="Update document content." />
            <MethodRow name="delete(id, editToken)" returns="void" desc="Soft-delete a document." />
            <MethodRow name="list()" returns="Document[]" desc="List user's documents." />
            <MethodRow name="versions(id)" returns="Version[]" desc="Get version history." />
            <MethodRow name="upload(file)" returns="string" desc="Upload an image, returns URL." />
            <MethodRow name="setPublished(id, editToken)" returns="void" desc="Set document to published." />
            <MethodRow name="setDraft(id, editToken)" returns="void" desc="Set document to draft." />
          </Card>

          {/* client.publish() */}
          <SectionHeading id="client-publish">client.publish()</SectionHeading>
          <Card>
            <CodeBlock lang="typescript">{`const result = await client.publish("# Hello World", {
  title: "My Document",
  isDraft: false,
  password: "optional-secret",
  expiresIn: "7d",
  editMode: "token",
  folderId: "folder-uuid",
});

console.log(result.id);        // "abc123"
console.log(result.editToken); // "tok_aBcDeFgH..."
console.log(result.url);       // "https://mdfy.cc/d/abc123"`}</CodeBlock>
          </Card>

          {/* client.pull() */}
          <SectionHeading id="client-pull">client.pull()</SectionHeading>
          <Card>
            <CodeBlock lang="typescript">{`const doc = await client.pull("abc123");

console.log(doc.markdown);    // "# Hello World"
console.log(doc.title);       // "My Document"
console.log(doc.view_count);  // 42
console.log(doc.is_draft);    // false

// With password
const doc2 = await client.pull("abc123", {
  password: "secret",
});`}</CodeBlock>
          </Card>

          {/* client.update() */}
          <SectionHeading id="client-update">client.update()</SectionHeading>
          <Card>
            <CodeBlock lang="typescript">{`await client.update("abc123", "# Updated Content", {
  editToken: "tok_aBcDeFgH",
  title: "New Title",
  changeSummary: "Fixed typos in section 2",
});`}</CodeBlock>
          </Card>

          {/* client.delete() */}
          <SectionHeading id="client-delete">client.delete()</SectionHeading>
          <Card>
            <CodeBlock lang="typescript">{`await client.delete("abc123", "tok_aBcDeFgH");
// Document is soft-deleted (can be restored by owner)`}</CodeBlock>
          </Card>

          {/* client.list() */}
          <SectionHeading id="client-list">client.list()</SectionHeading>
          <Card>
            <CodeBlock lang="typescript">{`const docs = await client.list();

docs.forEach(doc => {
  console.log(\`\${doc.id}: \${doc.title} (\${doc.is_draft ? "draft" : "published"})\`);
});`}</CodeBlock>
          </Card>

          {/* client.versions() */}
          <SectionHeading id="client-versions">client.versions()</SectionHeading>
          <Card>
            <CodeBlock lang="typescript">{`const versions = await client.versions("abc123");

versions.forEach(v => {
  console.log(\`\${v.version}: \${v.changeSummary} (\${v.created_at})\`);
});`}</CodeBlock>
          </Card>

          {/* client.upload() */}
          <SectionHeading id="client-upload">client.upload()</SectionHeading>
          <Card>
            <CodeBlock lang="typescript">{`// Browser
const input = document.querySelector("input[type=file]");
const file = input.files[0];
const imageUrl = await client.upload(file);

// Node.js
import { readFileSync } from "fs";
const buffer = readFileSync("screenshot.png");
const blob = new Blob([buffer], { type: "image/png" });
const imageUrl = await client.upload(blob);`}</CodeBlock>
          </Card>

          {/* Standalone Functions */}
          <SectionHeading id="standalone">Standalone Functions</SectionHeading>
          <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.7, marginBottom: 16, maxWidth: 640 }}>
            For quick one-off operations without creating a client instance.
          </p>
          <Card>
            <CodeBlock lang="typescript">{`import {
  publish,
  pull,
  update,
  deleteDocument,
  upload,
} from "@mdcore/api";

// Publish
const { id, editToken, url } = await publish("# Hello World");

// Read
const doc = await pull(id);

// Update
await update(id, "# Updated content", editToken);

// Delete
await deleteDocument(id, editToken);

// Upload image
const imageUrl = await upload(file);`}</CodeBlock>
          </Card>

          {/* npm Packages */}
          <SectionHeading id="packages">npm Packages</SectionHeading>
          <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.7, marginBottom: 24, maxWidth: 640 }}>
            Independent packages. Each can be installed and used separately. No cross-dependencies.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {[
              { pkg: "@mdcore/api", desc: "HTTP client for mdfy.cc. Publish, read, update, delete documents. Zero dependencies (native fetch).", install: "npm install @mdcore/api" },
              { pkg: "@mdcore/engine", desc: "WASM Markdown renderer (Rust/comrak). GFM, KaTeX math, Mermaid diagrams, syntax highlighting.", install: "npm install @mdcore/engine" },
              { pkg: "@mdcore/styles", desc: "CSS-only package. Dark/light themes, rendered document styles, print/PDF styles. No JavaScript.", install: "npm install @mdcore/styles" },
              { pkg: "@mdcore/ai", desc: "AI provider integrations. Gemini, OpenAI, Anthropic. Text-to-Markdown, ASCII rendering.", install: "npm install @mdcore/ai" },
              { pkg: "mdfy-mcp", desc: "MCP server for AI tools. Claude Code, Cursor, Windsurf. 6 tools for document management.", install: "npx mdfy-mcp" },
            ].map((p, i) => (
              <div
                key={p.pkg}
                style={{
                  display: "grid",
                  gridTemplateColumns: "180px 1fr 240px",
                  gap: 16,
                  alignItems: "center",
                  padding: "18px 20px",
                  background: i % 2 === 0 ? "var(--surface)" : "transparent",
                  borderRadius: 10,
                }}
              >
                <code style={{ fontSize: 14, fontWeight: 700, fontFamily: mono, color: "var(--accent)" }}>{p.pkg}</code>
                <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5, margin: 0 }}>{p.desc}</p>
                <code style={{ fontSize: 12, fontFamily: mono, color: "var(--text-faint)" }}>{p.install}</code>
              </div>
            ))}
          </div>

          <SubLabel>@mdcore/engine Example</SubLabel>
          <Card style={{ marginTop: 8 }}>
            <CodeBlock lang="typescript">{`import { mdcore } from "@mdcore/engine";
import { postProcessHtml } from "@mdcore/engine";

await mdcore.init();

const { html, flavor } = mdcore.render("# Hello **World**");
const finalHtml = await postProcessHtml(html);`}</CodeBlock>
          </Card>

          <SubLabel>@mdcore/styles Example</SubLabel>
          <Card style={{ marginTop: 8 }}>
            <CodeBlock lang="css">{`/* Import all styles */
@import "@mdcore/styles";

/* Or import individual modules */
@import "@mdcore/styles/theme-dark.css";
@import "@mdcore/styles/rendered.css";
@import "@mdcore/styles/code.css";
@import "@mdcore/styles/print.css";`}</CodeBlock>
          </Card>

          <SubLabel>@mdcore/ai Example</SubLabel>
          <Card style={{ marginTop: 8 }}>
            <CodeBlock lang="typescript">{`import { mdfyText, callAI, isAiConversation } from "@mdcore/ai";

// Convert raw text to structured Markdown
const markdown = await mdfyText("some rough text here...");

// Detect AI conversation format
if (isAiConversation(text)) {
  const { turns } = parseConversation(text);
  const formatted = formatConversation(turns);
}`}</CodeBlock>
          </Card>
        </main>
      </div>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid var(--border-dim)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <p style={{ fontSize: 12, color: "var(--text-faint)", fontFamily: mono, margin: 0 }}>
            <Link href="/docs" style={{ color: "var(--text-muted)", textDecoration: "none" }}>Documentation</Link>{" / "}JavaScript SDK
          </p>
          <p style={{ fontSize: 11, color: "var(--text-faint)", fontFamily: mono, margin: 0 }}>&copy; 2026 mdfy.cc</p>
        </div>
      </footer>
    </div>
  );
}
