import Link from "next/link";
import MdfyLogo from "@/components/MdfyLogo";
import MermaidWrapper from "./MermaidWrapper";

/* ─── data ─── */

const apis = [
  {
    name: "Render",
    method: "POST",
    path: "/v1/render",
    desc: "Markdown to beautiful HTML, PNG, or PDF. The same Rust engine behind mdfy.cc — now as an API.",
    color: "#fb923c",
    code: `curl -X POST https://api.mdcore.ai/v1/render \\
  -H "Authorization: Bearer mc_..." \\
  -H "Content-Type: application/json" \\
  -d '{"markdown": "# Hello\\n**Bold**.", "output": "html"}'`,
  },
  {
    name: "Convert",
    method: "POST",
    path: "/v1/convert",
    desc: "HTML, PDF, DOCX, or any URL to clean Markdown. One call to feed your AI pipeline.",
    color: "#4ade80",
    code: `curl -X POST https://api.mdcore.ai/v1/convert \\
  -H "Authorization: Bearer mc_..." \\
  -H "Content-Type: application/json" \\
  -d '{"source": "https://example.com", "output": "markdown"}'`,
  },
  {
    name: "Normalize",
    method: "POST",
    path: "/v1/normalize",
    desc: "Any MD flavor in, consistent output out. GFM, Obsidian, MDX, Pandoc — auto-detected and unified.",
    color: "#c4b5fd",
    code: `curl -X POST https://api.mdcore.ai/v1/normalize \\
  -H "Authorization: Bearer mc_..." \\
  -H "Content-Type: application/json" \\
  -d '{"markdown": "[[wikilink]]", "target": "gfm"}'`,
  },
];

const useCases = [
  {
    title: "Your AI chatbot looks like raw text",
    problem: "You built a chatbot with Claude or GPT. It returns Markdown with tables, code, math. Your frontend shows broken formatting or plain text. Users think your product is broken.",
    solution: "One API call renders the LLM output as production-quality HTML — syntax-highlighted code, rendered LaTeX, live Mermaid diagrams. Ship it as-is to your frontend.",
    color: "#fb923c",
    tag: "AI Products",
    code: `// Your chatbot response handler\nconst stream = await anthropic.messages.stream({ ... })\nconst markdown = await stream.finalText()\n\n// Before: dangerouslySetInnerHTML with broken formatting\n// After: one call\nconst html = await md.render(markdown)\nres.json({ html }) // production-ready HTML`,
  },
  {
    title: "RAG retrieval quality is terrible",
    problem: "You're chunking PDFs and web pages for your RAG pipeline. Raw HTML has noise — navbars, footers, ads, scripts. Your embeddings are polluted. Retrieval precision drops.",
    solution: "Convert any URL or PDF to clean, structured Markdown first. Headings become natural chunk boundaries. Tables stay intact. Code blocks preserve formatting. Your embeddings get signal, not noise.",
    color: "#4ade80",
    tag: "RAG / LLM Infra",
    code: `// Before: messy HTML chunks with nav, footer, ads\n// After: clean Markdown with semantic structure\nconst markdown = await md.convert(url)\n\n// Split by headings — natural semantic boundaries\nconst chunks = markdown.split(/^## /gm)\nfor (const chunk of chunks) {\n  await pinecone.upsert(embed(chunk))\n}`,
  },
  {
    title: "5 dependencies to render a README",
    problem: "Your docs site needs remark + rehype + shiki + katex + mermaid. Five packages, five version cycles, five configs. Shiki alone is 2MB. A KaTeX update breaks your math. Mermaid conflicts with SSR.",
    solution: "Replace all five with one API call. Same output quality, zero config, no version conflicts. Your CI build drops from 45s to 12s because you're not bundling five parsers.",
    color: "#c4b5fd",
    tag: "Developer Tools",
    code: `// Before: 5 packages, 200 lines of pipeline config\n// import remarkGfm from 'remark-gfm'\n// import rehypeShiki from 'rehype-shiki'\n// import rehypeKatex from 'rehype-katex'\n// ... 15 more imports and plugins\n\n// After: one line\nconst html = await md.render(content)`,
  },
  {
    title: "Customer sends a PDF, agent can't read it",
    problem: "Your support agent receives PDFs, DOCX files, and URLs from customers. The LLM needs Markdown to reason about them. You're stitching together pdf-parse, mammoth, and cheerio. Each breaks differently.",
    solution: "One endpoint handles all formats. PDF, DOCX, HTML, URL — auto-detected, converted to clean Markdown. Your agent gets structured text it can actually reason about.",
    color: "#60a5fa",
    tag: "AI Agents",
    code: `// Customer uploads a contract PDF\nconst markdown = await md.convert(file, {\n  format: "auto" // detects PDF, DOCX, HTML\n})\n\n// Feed to your agent with full structure preserved\nconst analysis = await agent.run(\n  \`Analyze this contract:\\n\\n\${markdown}\`\n)`,
  },
  {
    title: "Obsidian users break your Markdown input",
    problem: "Your app accepts Markdown input. Users paste from Obsidian (wikilinks), Notion (custom blocks), MDX (JSX components), and GitHub (task lists). Half the syntax doesn't render. Users file bugs.",
    solution: "Auto-detect the source flavor and normalize to standard GFM. Wikilinks become regular links. MDX components get stripped or rendered. Every flavor works, zero user friction.",
    color: "#fbbf24",
    tag: "SaaS Products",
    code: `// User pastes Obsidian-flavored Markdown\nconst input = "See [[Project Plan]] and ~~old text~~"\n\n// Auto-detect flavor, normalize to GFM\nconst clean = await md.normalize(input, {\n  source_flavor: "auto",\n  target: "gfm"\n})\n// => "See [Project Plan](project-plan) and ~~old text~~"`,
  },
  {
    title: "Weekly reports take 2 hours to format",
    problem: "Your team writes weekly reports in Markdown. Converting to PDF for stakeholders means fighting with Pandoc, tweaking LaTeX templates, fixing page breaks. Every week, 2 hours lost.",
    solution: "Markdown in, branded PDF out. Code blocks are highlighted, tables are formatted, charts render from Mermaid. Automate it in your CI — push to main, PDF appears in Slack.",
    color: "#ef4444",
    tag: "Automation",
    code: `// GitHub Action: auto-generate PDF on push\nconst report = fs.readFileSync("reports/week-12.md")\nconst pdf = await md.render(report, {\n  output: "pdf",\n  theme: "corporate"\n})\nawait slack.upload(pdf, "#team-reports")`,
  },
  {
    title: "Notion export is a mess of HTML",
    problem: "You're migrating 500 pages from Notion to your new docs platform. Notion's export gives you mangled HTML with inline styles, empty divs, and broken links. Manual cleanup would take weeks.",
    solution: "Batch convert Notion HTML exports to clean Markdown. Structure preserved, links fixed, formatting intact. 500 pages in minutes, not weeks.",
    color: "#f472b6",
    tag: "Content Migration",
    code: `// Batch convert Notion export\nconst files = glob("notion-export/**/*.html")\n\nfor (const file of files) {\n  const html = fs.readFileSync(file)\n  const markdown = await md.convert(html, {\n    format: "html"\n  })\n  fs.writeFileSync(file.replace(".html", ".md"), markdown)\n}\n// 500 pages → clean Markdown in 3 minutes`,
  },
  {
    title: "LLM output renders differently everywhere",
    problem: "The same Markdown from Claude renders differently in your web app, mobile app, email, and Slack bot. Four surfaces, four rendering stacks, four sets of bugs. Users see inconsistencies.",
    solution: "One engine, consistent output everywhere. Render once through mdcore, get identical HTML for web, mobile WebView, email, and Slack. Same AST, same styles, same result.",
    color: "#a78bfa",
    tag: "Multi-platform",
    code: `// Same engine, every surface\nconst markdown = agent.response\n\n// Web app\nconst webHtml = await md.render(markdown)\n// Email\nconst emailHtml = await md.render(markdown, { theme: "email" })\n// Slack\nconst slackMrkdwn = await md.render(markdown, { output: "slack" })\n\n// Identical rendering logic. Zero drift.`,
  },
];

const pricing = [
  { name: "Free", price: "$0", period: "", calls: "1,000 calls/mo", features: ["HTML output", "Watermark", "Community support"], cta: "Get Free Key", highlight: false },
  { name: "Starter", price: "$19", period: "/mo", calls: "10,000 calls/mo", features: ["HTML + PNG + PDF", "No watermark", "Custom themes", "Email support"], cta: "Get Started", highlight: false },
  { name: "Growth", price: "$49", period: "/mo", calls: "100K calls/mo", features: ["All outputs", "Custom themes", "Priority support", "Analytics"], cta: "Get Started", highlight: true },
  { name: "Scale", price: "$199", period: "/mo", calls: "1M calls/mo", features: ["Everything in Growth", "SLA 99.9%", "Dedicated support", "Self-hosted"], cta: "Contact Us", highlight: false },
];

const pipeline = [
  { n: "01", title: "Send a request", desc: "Pass Markdown text, a file, or a URL to any endpoint. JSON in, JSON out." },
  { n: "02", title: "Engine parses", desc: "Rust-based comrak engine detects the flavor and builds the AST in microseconds." },
  { n: "03", title: "Post-processing", desc: "Syntax highlighting, KaTeX math, Mermaid diagrams — applied server-side." },
  { n: "04", title: "Result delivered", desc: "HTML, PNG, PDF, or clean Markdown. Edge-cached, sub-2ms repeat latency." },
];

/* ─── shared styles ─── */
const mono = { fontFamily: "var(--font-geist-mono), monospace" };
const label: React.CSSProperties = { fontSize: 12, fontWeight: 600, letterSpacing: 3, textTransform: "uppercase", color: "var(--text-faint)", marginBottom: 16, ...mono };
const heading: React.CSSProperties = { fontSize: "clamp(24px, 3.5vw, 36px)", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text-primary)", margin: "0 0 48px", lineHeight: 1.2 };

export default function MdcoreAiPage() {
  return (
    <div style={{ background: "var(--background)", color: "var(--foreground)", minHeight: "100vh", overflowX: "hidden" }}>

      {/* ══════════ NAV ══════════ */}
      <nav style={{ position: "sticky", top: 0, zIndex: 40, borderBottom: "1px solid var(--border-dim)", background: "var(--header-bg)", backdropFilter: "blur(16px)" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
            <Link href="/mdcore-ai" style={{ textDecoration: "none", display: "flex", alignItems: "baseline" }}>
              <MdfyLogo size={20} variant="mdcore.ai" />
            </Link>
            <div style={{ display: "flex", gap: 24 }}>
              {[
                { label: "Docs", href: "/mdcore-ai/docs" },
                { label: "Pricing", href: "#pricing" },
                { label: "Playground", href: "#playground" },
              ].map((l) => (
                <a key={l.label} href={l.href} style={{ color: "var(--text-muted)", fontSize: 13, textDecoration: "none", fontWeight: 500 }}>{l.label}</a>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <a href="https://mdfy.cc" style={{ color: "var(--text-faint)", fontSize: 12, textDecoration: "none", ...mono }}>mdfy.cc</a>
            <a href="https://github.com/raymindai/mdcore" target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-faint)", fontSize: 12, textDecoration: "none", ...mono }}>GitHub</a>
            <a href="#waitlist" style={{ background: "var(--accent)", color: "#000", padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700, textDecoration: "none", ...mono }}>
              Join Waitlist
            </a>
          </div>
        </div>
      </nav>

      {/* ══════════ HERO ══════════ */}
      <section style={{ position: "relative", maxWidth: 1120, margin: "0 auto", padding: "120px 24px 60px", textAlign: "center" }}>
        <div style={{ marginBottom: 24 }}>
          <span className="mdcore-tag" style={{ color: "var(--accent)", background: "var(--accent-dim)", border: "1px solid rgba(251,146,60,0.2)" }}>
            Built for performance. Designed for developers.
          </span>
        </div>

        <h1 style={{ fontSize: "clamp(40px, 6vw, 72px)", fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.04em", margin: "0 auto", maxWidth: 800, color: "var(--text-primary)" }}>
          Markdown rendering
          <br />
          <span style={{ color: "var(--accent)" }}>at engine speed.</span>
        </h1>

        <p style={{ fontSize: "clamp(16px, 2vw, 18px)", lineHeight: 1.7, color: "var(--text-muted)", maxWidth: 560, margin: "28px auto 0" }}>
          A Rust-native parser compiled to WASM. Sub-2ms parse time.
          One API to render, convert, and normalize
          every Markdown flavor. Coming soon.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 40 }}>
          <a href="#waitlist" style={{ background: "var(--accent)", color: "#000", padding: "12px 28px", borderRadius: 8, fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
            Join the Waitlist
          </a>
          <Link href="/mdcore-ai/docs" style={{ background: "transparent", color: "var(--text-muted)", padding: "12px 28px", borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: "none", border: "1px solid var(--border-dim)" }}>
            Read the Docs
          </Link>
        </div>
      </section>

      {/* ══════════ HERO CODE ══════════ */}
      <section style={{ maxWidth: 680, margin: "0 auto", padding: "20px 24px 48px" }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border-dim)", display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", opacity: 0.7 }} />
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#eab308", opacity: 0.7 }} />
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", opacity: 0.7 }} />
            <span style={{ marginLeft: 10, fontSize: 11, color: "var(--text-faint)", ...mono }}>~/api</span>
          </div>
          <pre style={{ margin: 0, padding: "20px 24px", fontSize: 13, lineHeight: 1.75, color: "var(--text-tertiary)", ...mono, overflowX: "auto", whiteSpace: "pre" }}>
            <span style={{ color: "var(--text-faint)" }}>$</span>{" "}
            <span style={{ color: "var(--accent)" }}>curl</span>{" "}
            <span style={{ color: "var(--text-muted)" }}>-X POST</span>{" "}
            <span style={{ color: "var(--text-secondary)" }}>https://api.mdcore.ai/v1/render</span>{" \\"}{"\n"}
            {"  "}<span style={{ color: "var(--text-muted)" }}>-H</span>{" "}
            <span style={{ color: "#4ade80" }}>&quot;Authorization: Bearer mc_...&quot;</span>{" \\"}{"\n"}
            {"  "}<span style={{ color: "var(--text-muted)" }}>-d</span>{" "}
            <span style={{ color: "#4ade80" }}>&apos;{`{"markdown": "# Hello\\n**Fast.**", "output": "html"}`}&apos;</span>{"\n"}
            {"\n"}
            <span style={{ color: "var(--text-faint)" }}>{"// => <h1>Hello</h1><p><strong>Fast.</strong></p>"}</span>{"\n"}
            <span style={{ color: "var(--text-faint)" }}>{"//    1.8ms · edge-cached"}</span>
          </pre>
        </div>
      </section>

      {/* ══════════ OUTPUT SHOWCASE ══════════ */}
      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px 80px" }}>
        <p style={label}>See the output</p>
        <h2 style={heading}>Raw Markdown in. <span style={{ color: "var(--accent)" }}>This comes out.</span></h2>

        {/* Example 1: Mixed content */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border-dim)", borderRadius: 16, overflow: "hidden", marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
            {/* Raw input */}
            <div style={{ borderRight: "1px solid var(--border-dim)" }}>
              <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border-dim)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, color: "var(--text-faint)", ...mono }}>input.md</span>
                <span style={{ fontSize: 10, color: "var(--text-faint)", ...mono, background: "var(--border-dim)", padding: "2px 6px", borderRadius: 4 }}>RAW</span>
              </div>
              <pre style={{ margin: 0, padding: "20px", fontSize: 12, lineHeight: 1.7, color: "var(--text-muted)", ...mono, overflowX: "auto", whiteSpace: "pre" }}>
{`# Quarterly Report

Revenue grew **34%** YoY, driven by
API adoption in the enterprise segment.

| Metric     | Q1     | Q2     |
|------------|--------|--------|
| Revenue    | $1.2M  | $1.6M  |
| API Calls  | 12M    | 31M    |
| Latency    | 4.2ms  | 1.8ms  |

## Code Performance

\`\`\`rust
pub fn render(input: &str) -> String {
    let arena = Arena::new();
    let root = parse_document(
        &arena, input, &Options::default()
    );
    format_html(root, &Options::default())
}
\`\`\`

Inline math: $E = mc^2$

> **Note:** All benchmarks measured at p95
> on Cloudflare Workers edge network.`}</pre>
            </div>

            {/* Rendered output */}
            <div>
              <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border-dim)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, color: "var(--text-faint)", ...mono }}>output.html</span>
                <span style={{ fontSize: 10, color: "var(--accent)", ...mono, background: "var(--accent-dim)", padding: "2px 6px", borderRadius: 4 }}>RENDERED</span>
              </div>
              <div style={{ padding: "24px", fontSize: 14, lineHeight: 1.8, color: "var(--text-secondary)" }}>
                {/* Rendered H1 */}
                <h3 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 8px", paddingBottom: 8, borderBottom: "1px solid var(--border-dim)", letterSpacing: "-0.02em" }}>Quarterly Report</h3>
                <p style={{ margin: "12px 0", fontSize: 14, lineHeight: 1.7 }}>
                  Revenue grew <strong style={{ color: "var(--text-primary)" }}>34%</strong> YoY, driven by API adoption in the enterprise segment.
                </p>
                {/* Rendered table */}
                <table style={{ width: "100%", borderCollapse: "collapse", margin: "12px 0", fontSize: 13, border: "1px solid var(--border-dim)", borderRadius: 8, overflow: "hidden" }}>
                  <thead>
                    <tr>
                      {["Metric", "Q1", "Q2"].map((h) => (
                        <th key={h} style={{ textAlign: "left", padding: "8px 12px", background: "rgba(0,0,0,0.2)", borderBottom: "2px solid var(--border-dim)", fontSize: 11, fontWeight: 600, color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[["Revenue", "$1.2M", "$1.6M"], ["API Calls", "12M", "31M"], ["Latency", "4.2ms", "1.8ms"]].map((row) => (
                      <tr key={row[0]}>
                        {row.map((cell, j) => (
                          <td key={j} style={{ padding: "6px 12px", borderBottom: "1px solid var(--border-dim)", color: "var(--text-muted)", ...mono, fontSize: 12 }}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Rendered H2 */}
                <h4 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", margin: "20px 0 8px", paddingBottom: 6, borderBottom: "1px solid var(--border-dim)" }}>Code Performance</h4>
                {/* Rendered code block */}
                <div style={{ background: "rgba(0,0,0,0.25)", borderRadius: 8, padding: "14px 16px", margin: "8px 0", border: "1px solid var(--border-dim)", fontSize: 12, lineHeight: 1.65, ...mono }}>
                  <span style={{ color: "#c586c0" }}>pub fn</span>{" "}
                  <span style={{ color: "#dcdcaa" }}>render</span>
                  <span style={{ color: "var(--text-muted)" }}>(</span>
                  <span style={{ color: "#9cdcfe" }}>input</span>
                  <span style={{ color: "var(--text-muted)" }}>: &</span>
                  <span style={{ color: "#4ec9b0" }}>str</span>
                  <span style={{ color: "var(--text-muted)" }}>)</span>
                  <span style={{ color: "var(--text-muted)" }}> -&gt; </span>
                  <span style={{ color: "#4ec9b0" }}>String</span>
                  <span style={{ color: "var(--text-muted)" }}>{" {"}</span>
                  {"\n"}
                  {"    "}<span style={{ color: "#c586c0" }}>let</span>{" "}
                  <span style={{ color: "#9cdcfe" }}>arena</span>
                  <span style={{ color: "var(--text-muted)" }}> = </span>
                  <span style={{ color: "#4ec9b0" }}>Arena</span>
                  <span style={{ color: "var(--text-muted)" }}>::</span>
                  <span style={{ color: "#dcdcaa" }}>new</span>
                  <span style={{ color: "var(--text-muted)" }}>();</span>
                  {"\n"}
                  {"    "}<span style={{ color: "#c586c0" }}>let</span>{" "}
                  <span style={{ color: "#9cdcfe" }}>root</span>
                  <span style={{ color: "var(--text-muted)" }}> = </span>
                  <span style={{ color: "#dcdcaa" }}>parse_document</span>
                  <span style={{ color: "var(--text-muted)" }}>(</span>
                  {"\n"}
                  {"        "}<span style={{ color: "var(--text-muted)" }}>&amp;</span>
                  <span style={{ color: "#9cdcfe" }}>arena</span>
                  <span style={{ color: "var(--text-muted)" }}>, </span>
                  <span style={{ color: "#9cdcfe" }}>input</span>
                  <span style={{ color: "var(--text-muted)" }}>, &amp;</span>
                  <span style={{ color: "#4ec9b0" }}>Options</span>
                  <span style={{ color: "var(--text-muted)" }}>::</span>
                  <span style={{ color: "#dcdcaa" }}>default</span>
                  <span style={{ color: "var(--text-muted)" }}>()</span>
                  {"\n"}
                  {"    "}<span style={{ color: "var(--text-muted)" }}>);</span>
                  {"\n"}
                  {"    "}<span style={{ color: "#dcdcaa" }}>format_html</span>
                  <span style={{ color: "var(--text-muted)" }}>(</span>
                  <span style={{ color: "#9cdcfe" }}>root</span>
                  <span style={{ color: "var(--text-muted)" }}>, &amp;</span>
                  <span style={{ color: "#4ec9b0" }}>Options</span>
                  <span style={{ color: "var(--text-muted)" }}>::</span>
                  <span style={{ color: "#dcdcaa" }}>default</span>
                  <span style={{ color: "var(--text-muted)" }}>())</span>
                  {"\n"}
                  <span style={{ color: "var(--text-muted)" }}>{"}"}</span>
                </div>
                {/* Rendered math */}
                <p style={{ margin: "12px 0", fontSize: 14 }}>
                  Inline math:{" "}
                  <span style={{ color: "var(--math-color)", fontStyle: "italic", fontSize: 15 }}>E = mc<sup>2</sup></span>
                </p>
                {/* Rendered blockquote */}
                <div style={{ borderLeft: "3px solid var(--accent)", padding: "8px 14px", background: "rgba(0,0,0,0.1)", borderRadius: "0 8px 8px 0", margin: "12px 0", fontSize: 13 }}>
                  <p style={{ margin: 0 }}><strong style={{ color: "var(--accent)" }}>Note:</strong>{" "}
                  <span style={{ color: "var(--text-muted)" }}>All benchmarks measured at p95 on Cloudflare Workers edge network.</span></p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Example 2: Mermaid diagram */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border-dim)", borderRadius: 16, overflow: "hidden", marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", alignItems: "stretch" }}>
            {/* Raw mermaid code */}
            <div style={{ borderRight: "1px solid var(--border-dim)", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border-dim)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "var(--text-faint)", ...mono }}>```mermaid</span>
                <span style={{ fontSize: 10, color: "var(--text-faint)", ...mono, background: "var(--border-dim)", padding: "2px 6px", borderRadius: 4 }}>RAW</span>
              </div>
              <pre style={{ margin: 0, padding: "20px", fontSize: 12, lineHeight: 1.7, color: "var(--text-muted)", ...mono, whiteSpace: "pre", flex: 1, display: "flex", alignItems: "center" }}>
{`graph LR
  A[API Request] --> B{Cached?}
  B -->|Yes| C([Edge CDN])
  B -->|No| D[Rust Engine]
  D --> E[Parse AST]
  E --> F[Render HTML]
  F --> C`}
              </pre>
            </div>
            {/* Actual Mermaid rendered */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border-dim)", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, color: "var(--text-faint)", ...mono }}>rendered</span>
                <span style={{ fontSize: 10, color: "var(--accent)", ...mono, background: "var(--accent-dim)", padding: "2px 6px", borderRadius: 4 }}>SVG</span>
              </div>
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <MermaidWrapper />
              </div>
            </div>
          </div>
        </div>

        {/* Example 3: Math + feature list */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Math: raw → rendered */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border-dim)", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", alignItems: "stretch" }}>
              <div style={{ borderRight: "1px solid var(--border-dim)", display: "flex", flexDirection: "column" }}>
                <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border-dim)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "var(--text-faint)", ...mono }}>KaTeX</span>
                  <span style={{ fontSize: 10, color: "var(--text-faint)", ...mono, background: "var(--border-dim)", padding: "2px 6px", borderRadius: 4 }}>RAW</span>
                </div>
                <pre style={{ margin: 0, padding: "16px 20px", fontSize: 11, lineHeight: 2, color: "var(--text-muted)", ...mono, whiteSpace: "pre", flex: 1, display: "flex", alignItems: "center" }}>
{`$E = mc^2$

$$
\\int_0^\\infty e^{-x^2} dx
= \\frac{\\sqrt{\\pi}}{2}
$$`}
                </pre>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border-dim)", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, color: "var(--text-faint)", ...mono }}>rendered</span>
                  <span style={{ fontSize: 10, color: "var(--accent)", ...mono, background: "var(--accent-dim)", padding: "2px 6px", borderRadius: 4 }}>HTML</span>
                </div>
                <div style={{ padding: "16px 20px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: "0 0 16px" }}>
                    <span style={{ color: "var(--math-color)", fontStyle: "italic", fontSize: 15 }}>E = mc<sup>2</sup></span>
                  </p>
                  <div style={{ background: "rgba(0,0,0,0.15)", borderRadius: 8, padding: "14px", textAlign: "center", border: "1px solid var(--border-dim)" }}>
                    <span style={{ color: "var(--math-display-color)", fontSize: 20, fontStyle: "italic" }}>
                      <span style={{ fontSize: 28, verticalAlign: "middle" }}>&#8747;</span>
                      <span style={{ fontSize: 10, verticalAlign: "sub" }}>0</span>
                      <span style={{ fontSize: 10, verticalAlign: "super" }}>&infin;</span>
                      {" "}e<sup style={{ fontSize: 12 }}>-x&sup2;</sup> dx
                      {" "}={" "}
                      <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", verticalAlign: "middle", lineHeight: 1.2 }}>
                        <span style={{ borderBottom: "1px solid var(--math-display-color)", paddingBottom: 2, fontSize: 16 }}>&radic;&pi;</span>
                        <span style={{ fontSize: 16, paddingTop: 2 }}>2</span>
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feature highlights */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border-dim)", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border-dim)" }}>
              <span style={{ fontSize: 11, color: "var(--text-faint)", ...mono }}>Everything that renders</span>
            </div>
            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { feature: "Syntax highlighting", detail: "190+ languages" },
                { feature: "Math equations", detail: "KaTeX, inline & display" },
                { feature: "Tables", detail: "GFM, alignment, striping" },
                { feature: "Mermaid diagrams", detail: "Flowchart, sequence, gantt" },
                { feature: "Task lists", detail: "Interactive checkboxes" },
                { feature: "Blockquotes", detail: "Nested, callout styling" },
                { feature: "Footnotes", detail: "Auto-linked references" },
                { feature: "Auto-links", detail: "URLs, emails, @mentions" },
              ].map((f) => (
                <div key={f.feature} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{f.feature}</span>
                  <span style={{ fontSize: 12, color: "var(--text-faint)" }}>{f.detail}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p style={{ textAlign: "center", marginTop: 24 }}>
          <a href="https://mdfy.cc" style={{ fontSize: 13, color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>
            Try it live on mdfy.cc &rarr;
          </a>
        </p>
      </section>

      <div className="mdcore-divider" style={{ maxWidth: 1120, margin: "0 auto" }} />

      {/* ══════════ STATS ══════════ */}
      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "64px 24px" }}>
        <div className="mdcore-stats-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0, textAlign: "center" }}>
          {[
            { value: "<2ms", label: "engine parse" },
            { value: "6.7x", label: "vs remark+rehype" },
            { value: "190+", label: "languages" },
            { value: "Rust", label: "native parser" },
          ].map((s, i) => (
            <div key={s.label} style={{ padding: "0 24px", borderRight: i < 3 ? "1px solid var(--border-dim)" : "none" }}>
              <p style={{ fontSize: 32, fontWeight: 800, color: "var(--text-primary)", margin: "0 0 4px", letterSpacing: "-0.03em", ...mono }}>{s.value}</p>
              <p style={{ fontSize: 12, color: "var(--text-faint)", margin: 0, ...mono, letterSpacing: 1, textTransform: "uppercase" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mdcore-divider" style={{ maxWidth: 1120, margin: "0 auto" }} />

      {/* ══════════ APIs (BENTO) ══════════ */}
      <section id="docs" style={{ maxWidth: 1120, margin: "0 auto", padding: "80px 24px" }}>
        <p style={label}>API</p>
        <h2 style={heading}>
          Three endpoints. <span style={{ color: "var(--accent)" }}>One engine.</span>
        </h2>

        <div className="mdcore-bento">
          {apis.map((api, i) => (
            <div key={api.name} className="mdcore-card-hover" style={{ background: "var(--surface)", border: "1px solid var(--border-dim)", borderRadius: 16, overflow: "hidden" }}>
              <div style={{ padding: i === 0 ? "32px 32px 24px" : "24px 24px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <span className="mdcore-tag" style={{ color: api.color, background: `${api.color}15` }}>{api.method}</span>
                  <span style={{ fontSize: 13, ...mono, color: "var(--text-muted)" }}>{api.path}</span>
                </div>
                <h3 style={{ fontSize: i === 0 ? 24 : 18, fontWeight: 700, color: "var(--text-primary)", margin: "8px 0 6px", letterSpacing: "-0.02em" }}>{api.name}</h3>
                <p style={{ fontSize: 14, color: "var(--text-muted)", margin: 0, lineHeight: 1.6 }}>{api.desc}</p>
              </div>
              <div style={{ borderTop: "1px solid var(--border-dim)", padding: i === 0 ? "16px 28px" : "12px 20px", background: "rgba(0,0,0,0.15)" }}>
                <pre style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: "var(--text-faint)", ...mono, overflowX: "auto", whiteSpace: "pre" }}>{api.code}</pre>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════ HOW IT WORKS ══════════ */}
      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px 80px" }}>
        <p style={label}>How it works</p>
        <h2 style={heading}>From request to response in <span style={{ color: "var(--accent)" }}>&lt;2ms</span></h2>

        <div className="mdcore-pipeline">
          {pipeline.map((step) => (
            <div key={step.n} className="mdcore-pipeline-step">
              <div style={{ width: 54, height: 54, borderRadius: 14, background: "var(--surface)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", ...mono, fontSize: 14, fontWeight: 800, color: "var(--accent)", marginBottom: 16 }}>
                {step.n}
              </div>
              <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 8px" }}>{step.title}</p>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, lineHeight: 1.6 }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mdcore-divider" style={{ maxWidth: 1120, margin: "0 auto" }} />

      {/* ══════════ PERFORMANCE ══════════ */}
      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "80px 24px" }}>
        <p style={label}>Performance</p>
        <h2 style={heading}>Rust-native. Not another JS wrapper.</h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
          {/* Benchmark comparison */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border-dim)", borderRadius: 14, padding: "28px 24px" }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-muted)", margin: "0 0 20px", ...mono, letterSpacing: 1, textTransform: "uppercase" }}>Parse + Render benchmark</h3>
            {[
              { name: "mdcore (Rust/WASM)", ms: "1.8ms", pct: 15, accent: true },
              { name: "marked", ms: "6ms", pct: 50, accent: false },
              { name: "markdown-it", ms: "8ms", pct: 67, accent: false },
              { name: "remark + rehype", ms: "12ms", pct: 100, accent: false },
            ].map((b) => (
              <div key={b.name} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: b.accent ? "var(--accent)" : "var(--text-muted)", fontWeight: b.accent ? 700 : 400 }}>{b.name}</span>
                  <span style={{ fontSize: 12, color: b.accent ? "var(--accent)" : "var(--text-faint)", ...mono }}>{b.ms}</span>
                </div>
                <div style={{ height: 4, background: "var(--border-dim)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${b.pct}%`, background: b.accent ? "var(--accent)" : "var(--border)", borderRadius: 2, transition: "width 0.3s" }} />
                </div>
              </div>
            ))}
            <p style={{ fontSize: 11, color: "var(--text-faint)", margin: "16px 0 0", ...mono }}>10KB document · GFM + math + code blocks</p>
          </div>

          {/* Architecture */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border-dim)", borderRadius: 14, padding: "28px 24px" }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-muted)", margin: "0 0 20px", ...mono, letterSpacing: 1, textTransform: "uppercase" }}>Architecture</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { label: "Parser", value: "comrak (Rust)", detail: "Same parser used by GitLab, Reddit, crates.io" },
                { label: "Compile target", value: "wasm32 + native", detail: "One codebase → browser, server, CLI, edge" },
                { label: "Highlight", value: "highlight.js", detail: "190+ languages, server-side applied" },
                { label: "Math", value: "KaTeX", detail: "LaTeX-quality rendering, no MathJax overhead" },
                { label: "Diagrams", value: "Mermaid", detail: "Flowcharts, sequences, gantt — SVG output" },
              ].map((a) => (
                <div key={a.label}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 12, color: "var(--text-faint)", ...mono, width: 100, flexShrink: 0 }}>{a.label}</span>
                    <span style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 600 }}>{a.value}</span>
                  </div>
                  <p style={{ fontSize: 12, color: "var(--text-faint)", margin: "0 0 0 108px" }}>{a.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Why not X */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {[
            { title: "Rust parser, JS post-processing", desc: "The core parse → AST → HTML pipeline runs in compiled WASM via comrak. Post-processing (highlight.js, KaTeX, Mermaid) runs in JS — the best tool for each job." },
            { title: "Edge-first deployment", desc: "WASM binary runs on Cloudflare Workers, Vercel Edge, Deno Deploy. Your Markdown renders at the edge closest to your users, not in a central Node.js server." },
            { title: "Drop-in replacement", desc: "Same output as remark + rehype + shiki + katex + mermaid combined — Rust parser with JS post-processing, zero config, one API instead of five packages with conflicting versions." },
          ].map((item) => (
            <div key={item.title} className="mdcore-card-hover" style={{ background: "var(--surface)", border: "1px solid var(--border-dim)", borderRadius: 14, padding: "24px 20px" }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 8px" }}>{item.title}</h3>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, lineHeight: 1.6 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════ USE CASES ══════════ */}
      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px 80px" }}>
        <p style={label}>Use Cases</p>
        <h2 style={heading}>Real problems. One API call to fix each.</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {useCases.map((uc, i) => (
            <div key={uc.title} style={{ background: "var(--surface)", border: "1px solid var(--border-dim)", borderRadius: 16, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: 0 }}>
                {/* Left: problem + solution */}
                <div style={{ padding: "28px 28px 24px", borderRight: "1px solid var(--border-dim)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                    <span className="mdcore-tag" style={{ color: uc.color, background: `${uc.color}12` }}>{uc.tag}</span>
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 12px", letterSpacing: "-0.01em", lineHeight: 1.3 }}>
                    {uc.title}
                  </h3>
                  <p style={{ fontSize: 13, color: "var(--text-faint)", margin: "0 0 16px", lineHeight: 1.6 }}>
                    {uc.problem}
                  </p>
                  <div style={{ borderTop: "1px solid var(--border-dim)", paddingTop: 12 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", margin: "0 0 6px", ...mono, letterSpacing: 0.5, textTransform: "uppercase" }}>Solution</p>
                    <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, lineHeight: 1.6 }}>
                      {uc.solution}
                    </p>
                  </div>
                </div>
                {/* Right: code */}
                <div style={{ background: "rgba(0,0,0,0.12)", display: "flex", flexDirection: "column" }}>
                  <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border-dim)", display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: uc.color, opacity: 0.6 }} />
                    <span style={{ fontSize: 11, color: "var(--text-faint)", ...mono }}>implementation</span>
                  </div>
                  <pre style={{ margin: 0, padding: "16px 20px", fontSize: 11.5, lineHeight: 1.65, color: "var(--text-muted)", ...mono, overflowX: "auto", whiteSpace: "pre", flex: 1 }}>{uc.code}</pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════ SDKs ══════════ */}
      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px 80px" }}>
        <p style={label}>SDKs</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {[
            { lang: "JavaScript / TypeScript", color: "#fbbf24", code: `import { MdCore } from "@mdcore/sdk"

const md = new MdCore("mc_...")
const html = await md.render("# Hello")
const markdown = await md.convert(url)` },
            { lang: "Python", color: "#60a5fa", code: `import mdcore

client = mdcore.Client("mc_...")
html = client.render("# Hello")
markdown = client.convert(url)` },
          ].map((sdk) => (
            <div key={sdk.lang} className="mdcore-card-hover" style={{ background: "var(--surface)", border: "1px solid var(--border-dim)", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px 10px", display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: sdk.color }} />
                <span style={{ fontSize: 12, fontWeight: 700, ...mono, color: sdk.color }}>{sdk.lang}</span>
              </div>
              <pre style={{ margin: 0, padding: "8px 20px 18px", fontSize: 12, lineHeight: 1.65, color: "var(--text-muted)", ...mono, overflowX: "auto", whiteSpace: "pre" }}>{sdk.code}</pre>
            </div>
          ))}
        </div>
      </section>

      <div className="mdcore-divider" style={{ maxWidth: 1120, margin: "0 auto" }} />

      {/* ══════════ PRICING ══════════ */}
      <section id="pricing" style={{ maxWidth: 1120, margin: "0 auto", padding: "80px 24px" }}>
        <p style={label}>Planned Pricing</p>
        <h2 style={heading}>Start free. <span style={{ color: "var(--text-muted)" }}>Scale when you&apos;re ready.</span></h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
          {pricing.map((tier) => (
            <div key={tier.name} className="mdcore-card-hover" style={{ background: "var(--surface)", border: tier.highlight ? "1px solid var(--accent)" : "1px solid var(--border-dim)", borderRadius: 16, padding: "28px 24px", display: "flex", flexDirection: "column", position: "relative" }}>
              {tier.highlight && (
                <span style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: "var(--accent)", color: "#000", fontSize: 10, fontWeight: 700, padding: "2px 14px", borderRadius: 10, ...mono, letterSpacing: 1 }}>POPULAR</span>
              )}
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", margin: "0 0 8px", ...mono }}>{tier.name}</p>
              <div style={{ marginBottom: 4 }}>
                <span style={{ fontSize: 36, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.03em" }}>{tier.price}</span>
                {tier.period && <span style={{ fontSize: 14, color: "var(--text-faint)" }}>{tier.period}</span>}
              </div>
              <p style={{ fontSize: 11, ...mono, color: "var(--accent)", margin: "0 0 20px" }}>{tier.calls}</p>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", flex: 1 }}>
                {tier.features.map((f) => (
                  <li key={f} style={{ fontSize: 13, color: "var(--text-muted)", padding: "3px 0", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: "var(--text-faint)", fontSize: 10, ...mono }}>+</span>{f}
                  </li>
                ))}
              </ul>
              <a href="#waitlist" style={{ display: "block", textAlign: "center", background: tier.highlight ? "var(--accent)" : "transparent", color: tier.highlight ? "#000" : "var(--text-muted)", padding: "10px", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none", border: tier.highlight ? "none" : "1px solid var(--border-dim)" }}>
                Join Waitlist
              </a>
            </div>
          ))}
        </div>
        <p style={{ textAlign: "center", fontSize: 12, color: "var(--text-faint)", marginTop: 24, ...mono }}>
          Pricing is subject to change. $0.001 per additional call beyond quota on all paid tiers.
        </p>
      </section>

      {/* ══════════ WAITLIST ══════════ */}
      <section id="waitlist" style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px 80px" }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "64px 32px", textAlign: "center" }}>
          <p style={{ fontSize: 13, fontWeight: 700, ...mono, color: "var(--accent)", marginBottom: 12, marginTop: 0 }}>EARLY ACCESS</p>
          <h3 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", margin: "0 0 12px", letterSpacing: "-0.02em" }}>
            The engine is live. The API is coming.
          </h3>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 8, maxWidth: 480, marginLeft: "auto", marginRight: "auto", lineHeight: 1.6 }}>
            mdcore already powers <a href="https://mdfy.cc" style={{ color: "var(--accent)", textDecoration: "none" }}>mdfy.cc</a> in production — rendering Markdown with Rust + WASM in the browser.
            The hosted API is next. Join the waitlist for early access.
          </p>
          <p style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 28, ...mono }}>
            hi@raymind.ai
          </p>
          <a href="mailto:hi@raymind.ai?subject=mdcore.ai%20API%20waitlist&body=I%27m%20interested%20in%20early%20access%20to%20the%20mdcore.ai%20API." style={{ display: "inline-block", background: "var(--accent)", color: "#000", padding: "12px 28px", borderRadius: 8, fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
            Join the Waitlist
          </a>
        </div>
      </section>

      {/* ══════════ PLAYGROUND ══════════ */}
      <section id="playground" style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px 80px" }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "64px 32px", textAlign: "center" }}>
          <p style={{ fontSize: 13, fontWeight: 700, ...mono, color: "var(--accent)", marginBottom: 12, marginTop: 0 }}>PLAYGROUND</p>
          <h3 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", margin: "0 0 12px", letterSpacing: "-0.02em" }}>Try the engine now — it&apos;s already live.</h3>
          <p style={{ fontSize: 14, color: "var(--text-faint)", marginBottom: 28, maxWidth: 440, marginLeft: "auto", marginRight: "auto", lineHeight: 1.6 }}>
            The same Rust + WASM engine that will power the API is running client-side on mdfy.cc right now. Paste any Markdown and see the output.
          </p>
          <a href="https://mdfy.cc" style={{ display: "inline-block", background: "var(--accent)", color: "#000", padding: "10px 24px", borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>Open mdfy.cc</a>
        </div>
      </section>

      {/* ══════════ CTA ══════════ */}
      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px 120px", textAlign: "center" }}>
        <p style={{ fontSize: 14, color: "var(--text-faint)", margin: "0 0 24px", ...mono }}>
          The engine is already live on mdfy.cc. The API is next.
        </p>
        <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 12px", color: "var(--accent)" }}>
          Be first to ship with mdcore.
        </h2>
        <p style={{ fontSize: 16, color: "var(--text-muted)", margin: "0 0 32px" }}>Join the waitlist for early API access and developer preview.</p>
        <a href="#waitlist" style={{ display: "inline-block", background: "var(--accent)", color: "#000", padding: "14px 36px", borderRadius: 10, fontSize: 15, fontWeight: 700, textDecoration: "none" }}>Join the Waitlist</a>
        <p style={{ color: "var(--text-faint)", fontSize: 12, marginTop: 12, ...mono }}>
          <a href="https://mdfy.cc" style={{ color: "var(--text-muted)", textDecoration: "none" }}>Try the engine live on mdfy.cc &rarr;</a>
        </p>
      </section>

      {/* ══════════ FOOTER ══════════ */}
      <footer style={{ borderTop: "1px solid var(--border-dim)" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "48px 24px 32px" }}>
          <div className="mdcore-footer-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 48, marginBottom: 48 }}>
            {/* Brand */}
            <div>
              <div style={{ marginBottom: 16 }}>
                <MdfyLogo size={18} variant="mdcore.ai" />
              </div>
              <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, margin: "0 0 16px", maxWidth: 280 }}>
                The Markdown infrastructure for the AI era. One engine that renders, converts, and normalizes every flavor.
              </p>
              <p style={{ fontSize: 12, color: "var(--text-faint)", ...mono, margin: 0 }}>Rust + WASM &middot; Open Source</p>
            </div>

            {/* Product */}
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 16, marginTop: 0, ...mono, letterSpacing: 1, textTransform: "uppercase" }}>Product</p>
              {[
                { label: "API Docs", href: "/mdcore-ai/docs" },
                { label: "Playground", href: "#playground" },
                { label: "Pricing", href: "#pricing" },
                { label: "mdfy.cc", href: "https://mdfy.cc" },
                { label: "Chrome Extension", href: "#" },
                { label: "@mdcore/terminal", href: "#" },
              ].map((link) => (
                <a key={link.label} href={link.href} style={{ display: "block", fontSize: 13, color: "var(--text-faint)", textDecoration: "none", padding: "4px 0" }}>{link.label}</a>
              ))}
            </div>

            {/* Resources */}
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 16, marginTop: 0, ...mono, letterSpacing: 1, textTransform: "uppercase" }}>Resources</p>
              {[
                { label: "Documentation", href: "/mdcore-ai/docs" },
                { label: "Blog", href: "#" },
                { label: "Changelog", href: "#" },
                { label: "Status", href: "#" },
                { label: "GitHub", href: "https://github.com/raymindai/mdcore" },
              ].map((link) => (
                <a key={link.label} href={link.href} style={{ display: "block", fontSize: 13, color: "var(--text-faint)", textDecoration: "none", padding: "4px 0" }}>{link.label}</a>
              ))}
            </div>

            {/* Company */}
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 16, marginTop: 0, ...mono, letterSpacing: 1, textTransform: "uppercase" }}>Company</p>
              {[
                { label: "About", href: "https://mdfy.cc/about" },
                { label: "Manifesto", href: "https://mdfy.cc/about" },
                { label: "Contact", href: "mailto:hi@raymind.ai" },
                { label: "Twitter / X", href: "#" },
              ].map((link) => (
                <a key={link.label} href={link.href} style={{ display: "block", fontSize: 13, color: "var(--text-faint)", textDecoration: "none", padding: "4px 0" }}>{link.label}</a>
              ))}
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--border-dim)", paddingTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <p style={{ fontSize: 12, color: "var(--text-faint)", ...mono, margin: 0 }}>
              A product of{" "}
              <a href="https://raymind.ai" target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-muted)", textDecoration: "none" }}>raymind.ai</a>
            </p>
            <p style={{ fontSize: 11, color: "var(--text-faint)", ...mono, margin: 0 }}>&copy; 2026 mdcore. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
