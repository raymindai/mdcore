import Link from "next/link";

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
  { title: "AI Agent Developers", desc: "Render LLM output as polished documents. Convert any web page to clean Markdown for RAG ingestion.", color: "#fb923c", icon: ">_" },
  { title: "SaaS Products", desc: "Embed production-grade Markdown rendering into your app. One dependency replaces five.", color: "#4ade80", icon: "{}" },
  { title: "RAG Pipelines", desc: "PDF, DOCX, HTML to structured Markdown. One API call replaces your brittle conversion scripts.", color: "#c4b5fd", icon: "//" },
  { title: "Documentation Tools", desc: "Normalize any Markdown flavor to a consistent spec. Auto-detect, convert, and render on the fly.", color: "#60a5fa", icon: "##" },
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
              <span style={{ color: "var(--accent)", fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em" }}>md</span>
              <span style={{ color: "var(--text-primary)", fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em" }}>core</span>
              <span style={{ color: "var(--text-faint)", fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em" }}>.ai</span>
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
            <a href="#pricing" style={{ background: "var(--accent)", color: "#000", padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700, textDecoration: "none", ...mono }}>
              Get API Key
            </a>
          </div>
        </div>
      </nav>

      {/* ══════════ HERO ══════════ */}
      <section className="mdcore-dot-grid" style={{ position: "relative", maxWidth: 1120, margin: "0 auto", padding: "120px 24px 60px", textAlign: "center" }}>
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
          A Rust-native engine compiled to WASM. Sub-2ms response.
          Zero JavaScript parsers. One API to render, convert, and normalize
          every Markdown flavor.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 40 }}>
          <a href="#pricing" style={{ background: "var(--accent)", color: "#000", padding: "12px 28px", borderRadius: 8, fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
            Get API Key — Free
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
            <span style={{ color: "#4ade80" }}>&quot;Content-Type: application/json&quot;</span>{" \\"}{"\n"}
            {"  "}<span style={{ color: "var(--text-muted)" }}>-d</span>{" "}
            <span style={{ color: "#4ade80" }}>&apos;{`{"markdown": "# Hello\\n**Fast.**", "output": "html"}`}&apos;</span>{"\n"}
            {"\n"}
            <span style={{ color: "var(--text-faint)" }}>{"// => <h1>Hello</h1><p><strong>Fast.</strong></p>"}</span>{"\n"}
            <span style={{ color: "var(--text-faint)" }}>{"//    1.8ms · edge-cached"}</span>
          </pre>
        </div>
      </section>

      <div className="mdcore-divider" style={{ maxWidth: 1120, margin: "0 auto" }} />

      {/* ══════════ STATS ══════════ */}
      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "64px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0, textAlign: "center" }}>
          {[
            { value: "<2ms", label: "p95 latency" },
            { value: "25x", label: "faster than JS" },
            { value: "190+", label: "languages" },
            { value: "0", label: "JS dependencies" },
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
              { name: "mdcore (Rust/WASM)", ms: "1.8ms", pct: 100, accent: true },
              { name: "remark + rehype", ms: "12ms", pct: 15, accent: false },
              { name: "markdown-it", ms: "8ms", pct: 22, accent: false },
              { name: "marked", ms: "6ms", pct: 30, accent: false },
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
            { title: "Zero JS parsers in the hot path", desc: "The entire parse → AST → render pipeline runs in compiled WASM. No garbage collection pauses, no event loop blocking, no V8 overhead." },
            { title: "Edge-first deployment", desc: "WASM binary runs on Cloudflare Workers, Vercel Edge, Deno Deploy. Your Markdown renders at the edge closest to your users, not in a central Node.js server." },
            { title: "Drop-in replacement", desc: "Same output as remark + rehype + shiki + katex + mermaid combined — but 25x faster, zero config, and one dependency instead of five with conflicting versions." },
          ].map((item, i) => (
            <div key={item.title} className="mdcore-card-hover" style={{ background: "var(--surface)", border: "1px solid var(--border-dim)", borderRadius: 14, padding: "24px 20px" }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 8px" }}>{item.title}</h3>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, lineHeight: 1.6 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════ USE CASES ══════════ */}
      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px 80px" }}>
        <p style={label}>Built for</p>
        <h2 style={heading}>From AI agents to production apps.</h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 12 }}>
          {useCases.map((uc) => (
            <div key={uc.title} className="mdcore-accent-left mdcore-card-hover" style={{ background: "var(--surface)", border: "1px solid var(--border-dim)", borderRadius: 12, padding: "24px 20px", display: "flex", gap: 16, alignItems: "flex-start" }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${uc.color}10`, border: `1px solid ${uc.color}25`, display: "flex", alignItems: "center", justifyContent: "center", ...mono, fontSize: 14, fontWeight: 800, color: uc.color, flexShrink: 0 }}>{uc.icon}</div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 4px" }}>{uc.title}</p>
                <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>{uc.desc}</p>
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
            { lang: "JavaScript / TypeScript", color: "#fbbf24", code: `import { MdCore } from "@mdcore/sdk"\n\nconst md = new MdCore("mc_...")\nconst html = await md.render("# Hello")\nconst markdown = await md.convert(url)` },
            { lang: "Python", color: "#60a5fa", code: `import mdcore\n\nclient = mdcore.Client("mc_...")\nhtml = client.render("# Hello")\nmarkdown = client.convert(url)` },
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
        <p style={label}>Pricing</p>
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
              <a href="#" style={{ display: "block", textAlign: "center", background: tier.highlight ? "var(--accent)" : "transparent", color: tier.highlight ? "#000" : "var(--text-muted)", padding: "10px", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none", border: tier.highlight ? "none" : "1px solid var(--border-dim)" }}>
                {tier.cta}
              </a>
            </div>
          ))}
        </div>
        <p style={{ textAlign: "center", fontSize: 12, color: "var(--text-faint)", marginTop: 24, ...mono }}>
          $0.001 per additional call beyond quota on all paid tiers
        </p>
      </section>

      {/* ══════════ PLAYGROUND ══════════ */}
      <section id="playground" style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px 80px" }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "64px 32px", textAlign: "center" }}>
          <p style={{ fontSize: 13, fontWeight: 700, ...mono, color: "var(--accent)", marginBottom: 12, marginTop: 0 }}>PLAYGROUND</p>
          <h3 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", margin: "0 0 12px", letterSpacing: "-0.02em" }}>Try the engine in your browser.</h3>
          <p style={{ fontSize: 14, color: "var(--text-faint)", marginBottom: 28, maxWidth: 400, marginLeft: "auto", marginRight: "auto" }}>
            The same Rust + WASM engine, running client-side. No API key needed.
          </p>
          <a href="https://mdfy.cc" style={{ display: "inline-block", background: "var(--accent)", color: "#000", padding: "10px 24px", borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>Open mdfy.cc</a>
        </div>
      </section>

      {/* ══════════ CTA ══════════ */}
      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px 120px", textAlign: "center" }}>
        <p style={{ fontSize: 14, color: "var(--text-faint)", margin: "0 0 24px", ...mono }}>
          Resend built the email API. Stripe built the payments API.
        </p>
        <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 12px", color: "var(--accent)" }}>
          We&apos;re building the Markdown API.
        </h2>
        <p style={{ fontSize: 16, color: "var(--text-muted)", margin: "0 0 32px" }}>Rust-native. Sub-2ms. Zero config. Ship today.</p>
        <a href="#pricing" style={{ display: "inline-block", background: "var(--accent)", color: "#000", padding: "14px 36px", borderRadius: 10, fontSize: 15, fontWeight: 700, textDecoration: "none" }}>Get Your API Key</a>
        <p style={{ color: "var(--text-faint)", fontSize: 12, marginTop: 12, ...mono }}>Free tier &middot; No credit card</p>
      </section>

      {/* ══════════ FOOTER ══════════ */}
      <footer style={{ borderTop: "1px solid var(--border-dim)" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "48px 24px 32px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 48, marginBottom: 48 }}>
            {/* Brand */}
            <div>
              <div style={{ marginBottom: 16 }}>
                <span style={{ color: "var(--accent)", fontSize: 18, fontWeight: 800 }}>md</span>
                <span style={{ color: "var(--text-primary)", fontSize: 18, fontWeight: 800 }}>core</span>
                <span style={{ color: "var(--text-faint)", fontSize: 18, fontWeight: 800 }}>.ai</span>
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
