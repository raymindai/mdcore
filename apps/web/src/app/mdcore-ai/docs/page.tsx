import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Docs — mdcore.ai",
  description: "API documentation for mdcore.ai — the Markdown API for developers.",
};

/* ─── sidebar structure ─── */
const sidebar = [
  {
    category: "Getting Started",
    items: [
      { label: "Introduction", href: "/mdcore-ai/docs", active: true },
      { label: "Authentication", href: "#auth" },
      { label: "Quick Start", href: "#quickstart" },
      { label: "Rate Limits", href: "#rate-limits" },
      { label: "Error Handling", href: "#errors" },
    ],
  },
  {
    category: "API Reference",
    items: [
      { label: "POST /v1/render", href: "#render" },
      { label: "POST /v1/convert", href: "#convert" },
      { label: "POST /v1/normalize", href: "#normalize" },
    ],
  },
  {
    category: "SDKs",
    items: [
      { label: "JavaScript / TypeScript", href: "#sdk-js" },
      { label: "Python", href: "#sdk-python" },
    ],
  },
  {
    category: "Guides",
    items: [
      { label: "Render AI output", href: "#guide-ai" },
      { label: "Convert URL to Markdown", href: "#guide-convert" },
      { label: "Normalize MD flavors", href: "#guide-normalize" },
      { label: "Self-hosted deployment", href: "#guide-selfhost" },
    ],
  },
  {
    category: "Resources",
    items: [
      { label: "Changelog", href: "#changelog" },
      { label: "Status", href: "#status" },
      { label: "OpenAPI Spec", href: "#openapi" },
    ],
  },
];

/* ─── quickstart cards ─── */
const quickstarts = [
  { label: "Node.js", color: "#4ade80", href: "#sdk-js" },
  { label: "Next.js", color: "#fafafa", href: "#sdk-js" },
  { label: "Python", color: "#60a5fa", href: "#sdk-python" },
  { label: "cURL", color: "#fb923c", href: "#quickstart" },
  { label: "Go", color: "#4ade80", href: "#" },
  { label: "Rust", color: "#fb923c", href: "#" },
];

const mono = { fontFamily: "var(--font-geist-mono), monospace" };

export default function DocsPage() {
  return (
    <div style={{ background: "var(--background)", color: "var(--foreground)", minHeight: "100vh" }}>
      {/* ── NAV ── */}
      <nav style={{ position: "sticky", top: 0, zIndex: 40, borderBottom: "1px solid var(--border-dim)", background: "var(--header-bg)", backdropFilter: "blur(16px)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <Link href="/mdcore-ai" style={{ textDecoration: "none", display: "flex", alignItems: "baseline" }}>
              <span style={{ color: "var(--accent)", fontSize: 18, fontWeight: 800 }}>md</span>
              <span style={{ color: "var(--text-primary)", fontSize: 18, fontWeight: 800 }}>core</span>
              <span style={{ color: "var(--text-faint)", fontSize: 18, fontWeight: 800 }}>.ai</span>
            </Link>
            <span style={{ color: "var(--border)", fontSize: 16 }}>/</span>
            <span style={{ color: "var(--text-muted)", fontSize: 14, fontWeight: 600 }}>Docs</span>
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <a href="https://github.com/raymindai/mdcore" target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-faint)", fontSize: 12, textDecoration: "none", ...mono }}>GitHub</a>
            <a href="#" style={{ background: "var(--accent)", color: "#000", padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700, textDecoration: "none", ...mono }}>Get API Key</a>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", minHeight: "calc(100vh - 49px)" }}>
        {/* ── SIDEBAR ── */}
        <aside style={{ width: 240, flexShrink: 0, borderRight: "1px solid var(--border-dim)", padding: "32px 20px", overflowY: "auto", position: "sticky", top: 49, height: "calc(100vh - 49px)" }}>
          {sidebar.map((group) => (
            <div key={group.category} style={{ marginBottom: 28 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-faint)", ...mono, letterSpacing: 1.5, textTransform: "uppercase", margin: "0 0 10px" }}>
                {group.category}
              </p>
              {group.items.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  style={{
                    display: "block",
                    fontSize: 13,
                    color: item.active ? "var(--accent)" : "var(--text-muted)",
                    fontWeight: item.active ? 600 : 400,
                    textDecoration: "none",
                    padding: "5px 0 5px 12px",
                    borderLeft: item.active ? "2px solid var(--accent)" : "2px solid transparent",
                    transition: "color 0.15s",
                  }}
                >
                  {item.label}
                </a>
              ))}
            </div>
          ))}
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main style={{ flex: 1, padding: "48px 56px", maxWidth: 860 }}>
          {/* Intro */}
          <h1 style={{ fontSize: 32, fontWeight: 800, color: "var(--text-primary)", margin: "0 0 12px", letterSpacing: "-0.03em" }}>
            mdcore.ai Documentation
          </h1>
          <p style={{ fontSize: 16, color: "var(--text-muted)", margin: "0 0 48px", lineHeight: 1.7 }}>
            mdcore.ai is the Markdown API for developers. Render, convert, and normalize
            Markdown with a single API — powered by a Rust engine compiled to WASM.
          </p>

          {/* Quickstart cards */}
          <h2 id="quickstart" style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 20px" }}>Quickstart</h2>
          <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 24px", lineHeight: 1.6 }}>
            Get started with mdcore.ai in your language of choice.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 56 }}>
            {quickstarts.map((qs) => (
              <a
                key={qs.label}
                href={qs.href}
                className="mdcore-card-hover"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border-dim)",
                  borderRadius: 12,
                  padding: "20px 16px",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: qs.color, flexShrink: 0 }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{qs.label}</span>
              </a>
            ))}
          </div>

          {/* Auth */}
          <h2 id="auth" style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 16px", paddingTop: 32, borderTop: "1px solid var(--border-dim)" }}>Authentication</h2>
          <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 16px", lineHeight: 1.7 }}>
            All API requests require an API key passed in the <code style={{ fontSize: 13, background: "var(--surface)", padding: "2px 6px", borderRadius: 4, color: "var(--accent)", ...mono }}>Authorization</code> header.
          </p>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border-dim)", borderRadius: 12, overflow: "hidden", marginBottom: 56 }}>
            <div style={{ padding: "8px 16px", borderBottom: "1px solid var(--border-dim)", display: "flex", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "var(--text-faint)", ...mono }}>HTTP Header</span>
            </div>
            <pre style={{ margin: 0, padding: "16px 20px", fontSize: 13, lineHeight: 1.6, color: "var(--text-tertiary)", ...mono }}>
              Authorization: Bearer mc_your_api_key
            </pre>
          </div>

          {/* Render API */}
          <h2 id="render" style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 16px", paddingTop: 32, borderTop: "1px solid var(--border-dim)" }}>
            <span style={{ ...mono, fontSize: 12, fontWeight: 600, color: "#fb923c", background: "rgba(251,146,60,0.1)", padding: "3px 8px", borderRadius: 4, marginRight: 10 }}>POST</span>
            /v1/render
          </h2>
          <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 16px", lineHeight: 1.7 }}>
            Render Markdown into HTML, PNG, or PDF. Supports all flavors including GFM, KaTeX math, Mermaid diagrams, and 190+ languages for syntax highlighting.
          </p>

          {/* Request */}
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 12px" }}>Request body</h3>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border-dim)", borderRadius: 12, padding: "16px 20px", marginBottom: 20, fontSize: 13, lineHeight: 1.8, color: "var(--text-muted)" }}>
            <div style={{ display: "flex", gap: 12, padding: "4px 0", borderBottom: "1px solid var(--border-dim)" }}>
              <code style={{ color: "var(--text-primary)", ...mono, width: 120 }}>markdown</code>
              <span style={{ color: "var(--text-faint)", ...mono, fontSize: 11 }}>string · required</span>
              <span>The Markdown content to render.</span>
            </div>
            <div style={{ display: "flex", gap: 12, padding: "4px 0", borderBottom: "1px solid var(--border-dim)" }}>
              <code style={{ color: "var(--text-primary)", ...mono, width: 120 }}>output</code>
              <span style={{ color: "var(--text-faint)", ...mono, fontSize: 11 }}>string · optional</span>
              <span><code style={{ ...mono, fontSize: 12, color: "var(--accent)" }}>html</code> | <code style={{ ...mono, fontSize: 12 }}>png</code> | <code style={{ ...mono, fontSize: 12 }}>pdf</code>. Default: html</span>
            </div>
            <div style={{ display: "flex", gap: 12, padding: "4px 0" }}>
              <code style={{ color: "var(--text-primary)", ...mono, width: 120 }}>theme</code>
              <span style={{ color: "var(--text-faint)", ...mono, fontSize: 11 }}>string · optional</span>
              <span>Rendering theme. Default: minimal-dark</span>
            </div>
          </div>

          {/* Example */}
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 12px" }}>Example</h3>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border-dim)", borderRadius: 12, overflow: "hidden", marginBottom: 56 }}>
            <div style={{ padding: "8px 16px", borderBottom: "1px solid var(--border-dim)" }}>
              <span style={{ fontSize: 11, color: "var(--text-faint)", ...mono }}>cURL</span>
            </div>
            <pre style={{ margin: 0, padding: "16px 20px", fontSize: 12, lineHeight: 1.7, color: "var(--text-tertiary)", ...mono, overflowX: "auto", whiteSpace: "pre" }}>
{`curl -X POST https://api.mdcore.ai/v1/render \\
  -H "Authorization: Bearer mc_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "markdown": "# Hello World\\n\\nThis is **bold** and this is *italic*.",
    "output": "html",
    "theme": "minimal-dark"
  }'`}
            </pre>
          </div>

          {/* Convert API */}
          <h2 id="convert" style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 16px", paddingTop: 32, borderTop: "1px solid var(--border-dim)" }}>
            <span style={{ ...mono, fontSize: 12, fontWeight: 600, color: "#4ade80", background: "rgba(74,222,128,0.1)", padding: "3px 8px", borderRadius: 4, marginRight: 10 }}>POST</span>
            /v1/convert
          </h2>
          <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 16px", lineHeight: 1.7 }}>
            Convert HTML, PDF, DOCX, or any URL to clean Markdown. Perfect for feeding AI pipelines, RAG systems, or content migration.
          </p>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 12px" }}>Request body</h3>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border-dim)", borderRadius: 12, padding: "16px 20px", marginBottom: 20, fontSize: 13, lineHeight: 1.8, color: "var(--text-muted)" }}>
            <div style={{ display: "flex", gap: 12, padding: "4px 0", borderBottom: "1px solid var(--border-dim)" }}>
              <code style={{ color: "var(--text-primary)", ...mono, width: 120 }}>source</code>
              <span style={{ color: "var(--text-faint)", ...mono, fontSize: 11 }}>string · required</span>
              <span>URL or base64-encoded file content.</span>
            </div>
            <div style={{ display: "flex", gap: 12, padding: "4px 0", borderBottom: "1px solid var(--border-dim)" }}>
              <code style={{ color: "var(--text-primary)", ...mono, width: 120 }}>format</code>
              <span style={{ color: "var(--text-faint)", ...mono, fontSize: 11 }}>string · optional</span>
              <span><code style={{ ...mono, fontSize: 12 }}>url</code> | <code style={{ ...mono, fontSize: 12 }}>html</code> | <code style={{ ...mono, fontSize: 12 }}>pdf</code> | <code style={{ ...mono, fontSize: 12 }}>docx</code>. Auto-detected if omitted.</span>
            </div>
            <div style={{ display: "flex", gap: 12, padding: "4px 0" }}>
              <code style={{ color: "var(--text-primary)", ...mono, width: 120 }}>output</code>
              <span style={{ color: "var(--text-faint)", ...mono, fontSize: 11 }}>string · optional</span>
              <span>Always <code style={{ ...mono, fontSize: 12, color: "var(--accent)" }}>markdown</code>.</span>
            </div>
          </div>
          <div style={{ marginBottom: 56 }} />

          {/* Normalize API */}
          <h2 id="normalize" style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 16px", paddingTop: 32, borderTop: "1px solid var(--border-dim)" }}>
            <span style={{ ...mono, fontSize: 12, fontWeight: 600, color: "#c4b5fd", background: "rgba(196,181,253,0.1)", padding: "3px 8px", borderRadius: 4, marginRight: 10 }}>POST</span>
            /v1/normalize
          </h2>
          <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 16px", lineHeight: 1.7 }}>
            Normalize Markdown from any flavor to a target spec. Auto-detects the source flavor (GFM, Obsidian, MDX, Pandoc) and converts to your target format.
          </p>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 12px" }}>Request body</h3>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border-dim)", borderRadius: 12, padding: "16px 20px", marginBottom: 20, fontSize: 13, lineHeight: 1.8, color: "var(--text-muted)" }}>
            <div style={{ display: "flex", gap: 12, padding: "4px 0", borderBottom: "1px solid var(--border-dim)" }}>
              <code style={{ color: "var(--text-primary)", ...mono, width: 120 }}>markdown</code>
              <span style={{ color: "var(--text-faint)", ...mono, fontSize: 11 }}>string · required</span>
              <span>The Markdown content to normalize.</span>
            </div>
            <div style={{ display: "flex", gap: 12, padding: "4px 0", borderBottom: "1px solid var(--border-dim)" }}>
              <code style={{ color: "var(--text-primary)", ...mono, width: 120 }}>source_flavor</code>
              <span style={{ color: "var(--text-faint)", ...mono, fontSize: 11 }}>string · optional</span>
              <span>Source flavor. Default: <code style={{ ...mono, fontSize: 12, color: "var(--accent)" }}>auto</code></span>
            </div>
            <div style={{ display: "flex", gap: 12, padding: "4px 0" }}>
              <code style={{ color: "var(--text-primary)", ...mono, width: 120 }}>target</code>
              <span style={{ color: "var(--text-faint)", ...mono, fontSize: 11 }}>string · optional</span>
              <span><code style={{ ...mono, fontSize: 12 }}>commonmark</code> | <code style={{ ...mono, fontSize: 12, color: "var(--accent)" }}>gfm</code> | <code style={{ ...mono, fontSize: 12 }}>mdcore</code>. Default: gfm</span>
            </div>
          </div>

          {/* SDKs */}
          <h2 id="sdk-js" style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: "56px 0 16px 0", paddingTop: 32, borderTop: "1px solid var(--border-dim)" }}>JavaScript / TypeScript SDK</h2>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border-dim)", borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
            <div style={{ padding: "8px 16px", borderBottom: "1px solid var(--border-dim)" }}>
              <span style={{ fontSize: 11, color: "var(--text-faint)", ...mono }}>Install</span>
            </div>
            <pre style={{ margin: 0, padding: "16px 20px", fontSize: 13, lineHeight: 1.6, color: "var(--text-tertiary)", ...mono }}>npm install @mdcore/sdk</pre>
          </div>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border-dim)", borderRadius: 12, overflow: "hidden", marginBottom: 56 }}>
            <div style={{ padding: "8px 16px", borderBottom: "1px solid var(--border-dim)" }}>
              <span style={{ fontSize: 11, color: "var(--text-faint)", ...mono }}>Usage</span>
            </div>
            <pre style={{ margin: 0, padding: "16px 20px", fontSize: 13, lineHeight: 1.7, color: "var(--text-tertiary)", ...mono, overflowX: "auto", whiteSpace: "pre" }}>
{`import { MdCore } from "@mdcore/sdk"

const md = new MdCore("mc_your_api_key")

// Render Markdown to HTML
const html = await md.render("# Hello World")

// Convert URL to Markdown
const markdown = await md.convert("https://example.com")

// Normalize Markdown flavor
const normalized = await md.normalize("[[wikilink]]", { target: "gfm" })`}
            </pre>
          </div>

          <h2 id="sdk-python" style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 16px", paddingTop: 32, borderTop: "1px solid var(--border-dim)" }}>Python SDK</h2>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border-dim)", borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
            <div style={{ padding: "8px 16px", borderBottom: "1px solid var(--border-dim)" }}>
              <span style={{ fontSize: 11, color: "var(--text-faint)", ...mono }}>Install</span>
            </div>
            <pre style={{ margin: 0, padding: "16px 20px", fontSize: 13, lineHeight: 1.6, color: "var(--text-tertiary)", ...mono }}>pip install mdcore</pre>
          </div>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border-dim)", borderRadius: 12, overflow: "hidden", marginBottom: 56 }}>
            <div style={{ padding: "8px 16px", borderBottom: "1px solid var(--border-dim)" }}>
              <span style={{ fontSize: 11, color: "var(--text-faint)", ...mono }}>Usage</span>
            </div>
            <pre style={{ margin: 0, padding: "16px 20px", fontSize: 13, lineHeight: 1.7, color: "var(--text-tertiary)", ...mono, overflowX: "auto", whiteSpace: "pre" }}>
{`import mdcore

client = mdcore.Client("mc_your_api_key")

# Render Markdown to HTML
html = client.render("# Hello World")

# Convert URL to Markdown
markdown = client.convert("https://example.com")

# Normalize Markdown flavor
normalized = client.normalize("[[wikilink]]", target="gfm")`}
            </pre>
          </div>

          {/* Rate limits */}
          <h2 id="rate-limits" style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 16px", paddingTop: 32, borderTop: "1px solid var(--border-dim)" }}>Rate Limits</h2>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border-dim)", borderRadius: 12, overflow: "hidden", marginBottom: 56 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "12px 16px", borderBottom: "1px solid var(--border-dim)", color: "var(--text-muted)", fontWeight: 600, ...mono, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>Tier</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", borderBottom: "1px solid var(--border-dim)", color: "var(--text-muted)", fontWeight: 600, ...mono, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>Calls / Month</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", borderBottom: "1px solid var(--border-dim)", color: "var(--text-muted)", fontWeight: 600, ...mono, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>Rate</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { tier: "Free", calls: "1,000", rate: "10/min" },
                  { tier: "Starter", calls: "10,000", rate: "60/min" },
                  { tier: "Growth", calls: "100,000", rate: "300/min" },
                  { tier: "Scale", calls: "1,000,000", rate: "1,000/min" },
                ].map((r) => (
                  <tr key={r.tier}>
                    <td style={{ padding: "10px 16px", borderBottom: "1px solid var(--border-dim)", color: "var(--text-primary)", fontWeight: 500 }}>{r.tier}</td>
                    <td style={{ padding: "10px 16px", borderBottom: "1px solid var(--border-dim)", color: "var(--text-muted)", ...mono }}>{r.calls}</td>
                    <td style={{ padding: "10px 16px", borderBottom: "1px solid var(--border-dim)", color: "var(--text-muted)", ...mono }}>{r.rate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Errors */}
          <h2 id="errors" style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 16px", paddingTop: 32, borderTop: "1px solid var(--border-dim)" }}>Error Handling</h2>
          <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 16px", lineHeight: 1.7 }}>
            mdcore.ai uses standard HTTP status codes. All error responses include a JSON body with <code style={{ ...mono, fontSize: 12, color: "var(--accent)" }}>error</code> and <code style={{ ...mono, fontSize: 12, color: "var(--accent)" }}>message</code> fields.
          </p>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border-dim)", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "8px 16px", borderBottom: "1px solid var(--border-dim)" }}>
              <span style={{ fontSize: 11, color: "var(--text-faint)", ...mono }}>Error response</span>
            </div>
            <pre style={{ margin: 0, padding: "16px 20px", fontSize: 13, lineHeight: 1.7, color: "var(--text-tertiary)", ...mono }}>
{`{
  "error": "invalid_api_key",
  "message": "The API key provided is invalid or expired."
}`}
            </pre>
          </div>
        </main>
      </div>
    </div>
  );
}
