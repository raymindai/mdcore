import Link from "next/link";

const apis = [
  {
    name: "Render",
    method: "POST",
    path: "/v1/render",
    desc: "Markdown to beautiful HTML, PNG, or PDF. The same engine that powers mdfy.cc.",
    color: "#fb923c",
    code: `curl -X POST https://api.mdcore.ai/v1/render \\
  -H "Authorization: Bearer mc_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "markdown": "# Hello\\n\\nThis is **bold**.",
    "theme": "minimal-light",
    "output": "html"
  }'`,
  },
  {
    name: "Convert",
    method: "POST",
    path: "/v1/convert",
    desc: "HTML, PDF, DOCX, or any URL to clean Markdown. Feed your AI pipeline.",
    color: "#4ade80",
    code: `curl -X POST https://api.mdcore.ai/v1/convert \\
  -H "Authorization: Bearer mc_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "source": "https://example.com/article",
    "format": "url",
    "output": "markdown"
  }'`,
  },
  {
    name: "Normalize",
    method: "POST",
    path: "/v1/normalize",
    desc: "Any Markdown flavor in, consistent output out. GFM, Obsidian, MDX, Pandoc — auto-detected.",
    color: "#c4b5fd",
    code: `curl -X POST https://api.mdcore.ai/v1/normalize \\
  -H "Authorization: Bearer mc_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "markdown": "[[wikilink]] and ~~strike~~",
    "source_flavor": "auto",
    "target": "gfm"
  }'`,
  },
];

const useCases = [
  {
    title: "AI Agent Developers",
    desc: "Render AI output as polished documents. Convert web pages to Markdown for RAG ingestion.",
    color: "#fb923c",
  },
  {
    title: "SaaS Products",
    desc: "Embed Markdown rendering in your app. No need to wire together remark + rehype + shiki + katex.",
    color: "#4ade80",
  },
  {
    title: "RAG Pipelines",
    desc: "PDF, DOCX, HTML to clean Markdown. One API call replaces your brittle conversion scripts.",
    color: "#c4b5fd",
  },
  {
    title: "Documentation Tools",
    desc: "Normalize any Markdown flavor to a consistent spec. Auto-detect and convert on the fly.",
    color: "#60a5fa",
  },
];

const pricing = [
  {
    name: "Free",
    price: "$0",
    period: "",
    calls: "1,000 calls / month",
    features: ["HTML output", "Watermark", "Community support"],
    cta: "Get Free Key",
    highlight: false,
  },
  {
    name: "Starter",
    price: "$19",
    period: "/mo",
    calls: "10,000 calls / month",
    features: [
      "HTML + PNG + PDF",
      "No watermark",
      "Custom themes",
      "Email support",
    ],
    cta: "Get Started",
    highlight: false,
  },
  {
    name: "Growth",
    price: "$49",
    period: "/mo",
    calls: "100,000 calls / month",
    features: [
      "All outputs",
      "Custom themes",
      "Priority support",
      "Usage analytics",
    ],
    cta: "Get Started",
    highlight: true,
  },
  {
    name: "Scale",
    price: "$199",
    period: "/mo",
    calls: "1,000,000 calls / month",
    features: ["Everything in Growth", "SLA 99.9%", "Dedicated support", "Self-hosted option"],
    cta: "Contact Us",
    highlight: false,
  },
];

const sectionHeader: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: 2,
  textTransform: "uppercase",
  color: "var(--text-muted)",
  marginBottom: 32,
  fontFamily: "var(--font-geist-mono), monospace",
};

export default function MdcoreAiPage() {
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
            <Link href="/mdcore-ai" style={{ textDecoration: "none" }}>
              <span
                style={{
                  color: "var(--accent)",
                  fontSize: 22,
                  fontWeight: 800,
                }}
              >
                md
              </span>
              <span
                style={{
                  color: "var(--text-primary)",
                  fontSize: 22,
                  fontWeight: 800,
                }}
              >
                core
              </span>
              <span
                style={{
                  color: "var(--text-muted)",
                  fontSize: 22,
                  fontWeight: 800,
                }}
              >
                .ai
              </span>
            </Link>
            <div style={{ display: "flex", gap: 20 }}>
              {[
                { label: "Docs", href: "#docs" },
                { label: "Pricing", href: "#pricing" },
                { label: "Playground", href: "#playground" },
              ].map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  style={{
                    color: "var(--text-muted)",
                    fontSize: 13,
                    textDecoration: "none",
                    fontWeight: 500,
                  }}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <a
              href="https://mdfy.cc"
              style={{
                color: "var(--text-muted)",
                fontSize: 13,
                textDecoration: "none",
              }}
            >
              mdfy.cc
            </a>
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
            <a
              href="#pricing"
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
              Get API Key
            </a>
          </div>
        </div>
      </nav>

      {/* ───────── HERO ───────── */}
      <section
        style={{
          position: "relative",
          maxWidth: 1080,
          margin: "0 auto",
          padding: "100px 24px 40px",
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: "absolute",
            top: -120,
            left: "50%",
            transform: "translateX(-50%)",
            width: 800,
            height: 600,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(251,146,60,0.05) 0%, transparent 60%)",
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
            textAlign: "center",
          }}
        >
          Markdown Infrastructure
        </p>

        <h1
          style={{
            fontSize: "clamp(36px, 5vw, 60px)",
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            color: "var(--text-primary)",
            textAlign: "center",
            margin: "0 auto",
            maxWidth: 800,
          }}
        >
          The Markdown API
          <br />
          <span style={{ color: "var(--accent)" }}>for the AI era.</span>
        </h1>

        <p
          style={{
            fontSize: 18,
            lineHeight: 1.7,
            color: "var(--text-tertiary)",
            textAlign: "center",
            maxWidth: 600,
            margin: "28px auto 0",
          }}
        >
          Render, convert, and normalize Markdown with one API.
          <br />
          Powered by a Rust engine compiled to WASM. Every flavor, every format.
        </p>

        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            marginTop: 40,
          }}
        >
          <a
            href="#pricing"
            style={{
              display: "inline-block",
              background: "var(--accent)",
              color: "#000",
              padding: "12px 28px",
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 700,
              textDecoration: "none",
              letterSpacing: "-0.01em",
            }}
          >
            Get API Key — Free
          </a>
          <a
            href="#playground"
            style={{
              display: "inline-block",
              background: "var(--surface)",
              color: "var(--text-secondary)",
              padding: "12px 28px",
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 600,
              textDecoration: "none",
              border: "1px solid var(--border-dim)",
            }}
          >
            Try Playground
          </a>
        </div>
      </section>

      {/* ───────── HERO CODE ───────── */}
      <section
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "40px 24px 80px",
        }}
      >
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border-dim)",
            borderRadius: 16,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "10px 16px",
              borderBottom: "1px solid var(--border-dim)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "var(--border)",
              }}
            />
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "var(--border)",
              }}
            />
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "var(--border)",
              }}
            />
            <span
              style={{
                marginLeft: 8,
                fontSize: 12,
                color: "var(--text-faint)",
                fontFamily: "var(--font-geist-mono), monospace",
              }}
            >
              terminal
            </span>
          </div>
          <pre
            style={{
              margin: 0,
              padding: "20px 24px",
              fontSize: 13,
              lineHeight: 1.7,
              color: "var(--text-secondary)",
              fontFamily: "var(--font-geist-mono), monospace",
              overflowX: "auto",
              whiteSpace: "pre",
            }}
          >
            <span style={{ color: "var(--text-muted)" }}>$</span>{" "}
            <span style={{ color: "var(--accent)" }}>curl</span> -X POST
            https://api.mdcore.ai/v1/render \{"\n"}
            {"  "}-H{" "}
            <span style={{ color: "#4ade80" }}>
              &quot;Content-Type: application/json&quot;
            </span>{" "}
            \{"\n"}
            {"  "}-d{" "}
            <span style={{ color: "#4ade80" }}>
              {
                "'{\"markdown\": \"# Hello\\n**Rust + WASM** = fast.\", \"output\": \"html\"}'"
              }
            </span>
            {"\n"}
            {"\n"}
            <span style={{ color: "var(--text-muted)" }}>
              {"// => <h1>Hello</h1><p><strong>Rust + WASM</strong> = fast.</p>"}
            </span>
            {"\n"}
            <span style={{ color: "var(--text-muted)" }}>
              {"// ~2ms response time"}
            </span>
          </pre>
        </div>
      </section>

      {/* ───────── STATS ───────── */}
      <section
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          padding: "0 24px 80px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 1,
            background: "var(--border-dim)",
            borderRadius: 16,
            overflow: "hidden",
            border: "1px solid var(--border-dim)",
          }}
        >
          {[
            { value: "~2ms", label: "Avg response time" },
            { value: "190+", label: "Languages highlighted" },
            { value: "Every", label: "MD flavor supported" },
            { value: "Rust", label: "Engine core" },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                background: "var(--surface)",
                padding: "28px 24px",
                textAlign: "center",
              }}
            >
              <p
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: "var(--text-primary)",
                  margin: "0 0 4px",
                  letterSpacing: "-0.02em",
                }}
              >
                {stat.value}
              </p>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-muted)",
                  margin: 0,
                  fontFamily: "var(--font-geist-mono), monospace",
                }}
              >
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────── APIs ───────── */}
      <section
        id="docs"
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          padding: "0 24px 80px",
        }}
      >
        <h2 style={sectionHeader}>Three APIs, one engine</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {apis.map((api) => (
            <div
              key={api.name}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border-dim)",
                borderRadius: 16,
                overflow: "hidden",
              }}
            >
              <div style={{ padding: "28px 28px 20px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: "var(--font-geist-mono), monospace",
                      color: api.color,
                      background: `${api.color}15`,
                      padding: "3px 8px",
                      borderRadius: 4,
                    }}
                  >
                    {api.method}
                  </span>
                  <span
                    style={{
                      fontSize: 14,
                      fontFamily: "var(--font-geist-mono), monospace",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {api.path}
                  </span>
                </div>
                <h3
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    margin: "8px 0 6px",
                  }}
                >
                  {api.name}
                </h3>
                <p
                  style={{
                    fontSize: 14,
                    color: "var(--text-muted)",
                    margin: 0,
                    lineHeight: 1.6,
                  }}
                >
                  {api.desc}
                </p>
              </div>
              <div
                style={{
                  borderTop: "1px solid var(--border-dim)",
                  padding: "16px 24px",
                  background: "rgba(0,0,0,0.15)",
                }}
              >
                <pre
                  style={{
                    margin: 0,
                    fontSize: 12,
                    lineHeight: 1.65,
                    color: "var(--text-tertiary)",
                    fontFamily: "var(--font-geist-mono), monospace",
                    overflowX: "auto",
                    whiteSpace: "pre",
                  }}
                >
                  {api.code}
                </pre>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ───────── PIPELINE ───────── */}
      <section
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          padding: "0 24px 80px",
        }}
      >
        <h2 style={sectionHeader}>How it works</h2>

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
          {[
            {
              step: "01",
              title: "You call the API",
              desc: "Send Markdown, a URL, or a file. Specify your desired output format.",
            },
            {
              step: "02",
              title: "Rust engine parses",
              desc: "comrak parses your input. Flavor auto-detected. AST constructed in microseconds.",
            },
            {
              step: "03",
              title: "Post-processing",
              desc: "Code highlighting, KaTeX math, Mermaid diagrams — all applied server-side.",
            },
            {
              step: "04",
              title: "Result returned",
              desc: "HTML, PNG, PDF, or clean Markdown. Cached at the edge. ~2ms typical latency.",
            },
          ].map((item) => (
            <div
              key={item.step}
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
                  {item.step}
                </span>
                <span
                  style={{
                    color: "var(--text-primary)",
                    fontSize: 15,
                    fontWeight: 700,
                  }}
                >
                  {item.title}
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
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────── USE CASES ───────── */}
      <section
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          padding: "0 24px 80px",
        }}
      >
        <h2 style={sectionHeader}>Built for</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 16,
          }}
        >
          {useCases.map((uc) => (
            <div
              key={uc.title}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border-dim)",
                borderRadius: 14,
                padding: "28px 24px",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: "var(--font-geist-mono), monospace",
                  color: uc.color,
                  background: `${uc.color}15`,
                  padding: "4px 10px",
                  borderRadius: 6,
                  marginBottom: 14,
                }}
              >
                {uc.title}
              </span>
              <p
                style={{
                  color: "var(--text-tertiary)",
                  fontSize: 14,
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {uc.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────── PLAYGROUND ───────── */}
      <section
        id="playground"
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          padding: "0 24px 80px",
        }}
      >
        <h2 style={sectionHeader}>Playground</h2>

        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border-dim)",
            borderRadius: 16,
            padding: "48px 32px",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "var(--text-primary)",
              marginBottom: 12,
              marginTop: 0,
            }}
          >
            Interactive API Playground
          </p>
          <p
            style={{
              fontSize: 14,
              color: "var(--text-muted)",
              marginBottom: 28,
              maxWidth: 400,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            Try the API in your browser. No key required.
            Powered by the same WASM engine running client-side.
          </p>
          <a
            href="https://mdfy.cc"
            style={{
              display: "inline-block",
              background: "var(--accent-dim)",
              color: "var(--accent)",
              padding: "10px 24px",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Try on mdfy.cc
          </a>
        </div>
      </section>

      {/* ───────── PRICING ───────── */}
      <section
        id="pricing"
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          padding: "0 24px 80px",
        }}
      >
        <h2 style={sectionHeader}>Pricing</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
            gap: 16,
          }}
        >
          {pricing.map((tier) => (
            <div
              key={tier.name}
              style={{
                background: "var(--surface)",
                border: tier.highlight
                  ? "1px solid var(--accent)"
                  : "1px solid var(--border-dim)",
                borderRadius: 16,
                padding: "28px 24px",
                display: "flex",
                flexDirection: "column",
                position: "relative",
              }}
            >
              {tier.highlight && (
                <span
                  style={{
                    position: "absolute",
                    top: -10,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "var(--accent)",
                    color: "#000",
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "2px 12px",
                    borderRadius: 10,
                    fontFamily: "var(--font-geist-mono), monospace",
                  }}
                >
                  POPULAR
                </span>
              )}
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  margin: "0 0 4px",
                }}
              >
                {tier.name}
              </p>
              <div style={{ marginBottom: 12 }}>
                <span
                  style={{
                    fontSize: 32,
                    fontWeight: 800,
                    color: "var(--text-primary)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {tier.price}
                </span>
                {tier.period && (
                  <span
                    style={{
                      fontSize: 14,
                      color: "var(--text-muted)",
                    }}
                  >
                    {tier.period}
                  </span>
                )}
              </div>
              <p
                style={{
                  fontSize: 12,
                  fontFamily: "var(--font-geist-mono), monospace",
                  color: "var(--accent)",
                  margin: "0 0 16px",
                }}
              >
                {tier.calls}
              </p>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: "0 0 24px",
                  flex: 1,
                }}
              >
                {tier.features.map((f) => (
                  <li
                    key={f}
                    style={{
                      fontSize: 13,
                      color: "var(--text-muted)",
                      padding: "4px 0",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        color: "var(--accent)",
                        fontSize: 14,
                        lineHeight: 1,
                      }}
                    >
                      +
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href="#"
                style={{
                  display: "block",
                  textAlign: "center",
                  background: tier.highlight
                    ? "var(--accent)"
                    : "var(--accent-dim)",
                  color: tier.highlight ? "#000" : "var(--accent)",
                  padding: "10px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                {tier.cta}
              </a>
            </div>
          ))}
        </div>

        <p
          style={{
            textAlign: "center",
            fontSize: 13,
            color: "var(--text-faint)",
            marginTop: 20,
            fontFamily: "var(--font-geist-mono), monospace",
          }}
        >
          All paid tiers: $0.001 per additional call beyond quota
        </p>
      </section>

      {/* ───────── SDKS ───────── */}
      <section
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          padding: "0 24px 80px",
        }}
      >
        <h2 style={sectionHeader}>SDKs & Integration</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 16,
          }}
        >
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border-dim)",
              borderRadius: 16,
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "20px 24px 12px" }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: "var(--font-geist-mono), monospace",
                  color: "#fbbf24",
                  background: "rgba(251,191,36,0.15)",
                  padding: "3px 8px",
                  borderRadius: 4,
                }}
              >
                JavaScript / TypeScript
              </span>
            </div>
            <pre
              style={{
                margin: 0,
                padding: "12px 24px 20px",
                fontSize: 12,
                lineHeight: 1.65,
                color: "var(--text-tertiary)",
                fontFamily: "var(--font-geist-mono), monospace",
                overflowX: "auto",
                whiteSpace: "pre",
              }}
            >
              {`import { MdCore } from "@mdcore/sdk"

const md = new MdCore("mc_...")
const html = await md.render("# Hello")
const markdown = await md.convert(url)`}
            </pre>
          </div>
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border-dim)",
              borderRadius: 16,
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "20px 24px 12px" }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: "var(--font-geist-mono), monospace",
                  color: "#60a5fa",
                  background: "rgba(96,165,250,0.15)",
                  padding: "3px 8px",
                  borderRadius: 4,
                }}
              >
                Python
              </span>
            </div>
            <pre
              style={{
                margin: 0,
                padding: "12px 24px 20px",
                fontSize: 12,
                lineHeight: 1.65,
                color: "var(--text-tertiary)",
                fontFamily: "var(--font-geist-mono), monospace",
                overflowX: "auto",
                whiteSpace: "pre",
              }}
            >
              {`import mdcore

client = mdcore.Client("mc_...")
html = client.render("# Hello")
markdown = client.convert(url)`}
            </pre>
          </div>
        </div>
      </section>

      {/* ───────── ENGINE ───────── */}
      <section
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          padding: "0 24px 80px",
        }}
      >
        <h2 style={sectionHeader}>Under the hood</h2>

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
            {
              name: "comrak",
              role: "Markdown parser",
              note: "Rust · GFM complete",
            },
            {
              name: "wasm-bindgen",
              role: "Rust to WASM bridge",
              note: "Zero-copy bindings",
            },
            {
              name: "highlight.js",
              role: "Syntax highlighting",
              note: "190+ languages",
            },
            {
              name: "KaTeX",
              role: "Math rendering",
              note: "LaTeX-quality",
            },
            {
              name: "Mermaid",
              role: "Diagrams",
              note: "Flowcharts, sequences",
            },
            {
              name: "Edge Network",
              role: "Global distribution",
              note: "Cached at edge",
            },
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

      {/* ───────── CTA ───────── */}
      <section
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          padding: "0 24px 100px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            borderLeft: "3px solid var(--accent)",
            paddingLeft: 24,
            textAlign: "left",
            marginBottom: 48,
            maxWidth: 640,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          <p
            style={{
              fontSize: 18,
              fontWeight: 600,
              lineHeight: 1.6,
              color: "var(--text-secondary)",
              margin: 0,
            }}
          >
            Stop wiring together remark + rehype + shiki + katex + mermaid.
            One API call. Every format. Every flavor.
          </p>
        </div>

        <a
          href="#pricing"
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
          Get Your API Key
        </a>
        <p
          style={{
            color: "var(--text-faint)",
            fontSize: 13,
            marginTop: 12,
          }}
        >
          Free tier. No credit card required.
        </p>
      </section>

      {/* ───────── FOOTER ───────── */}
      <footer
        style={{
          borderTop: "1px solid var(--border-dim)",
          padding: "24px",
        }}
      >
        <div
          style={{
            maxWidth: 1080,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
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
            mdcore.ai · Rust + WASM · powered by{" "}
            <a
              href="https://mdfy.cc"
              style={{
                color: "var(--text-muted)",
                textDecoration: "none",
              }}
            >
              mdfy.cc
            </a>
          </p>
          <div style={{ display: "flex", gap: 20 }}>
            {[
              { label: "GitHub", href: "https://github.com/raymindai/mdcore" },
              { label: "mdfy.cc", href: "https://mdfy.cc" },
              { label: "hi@raymind.ai", href: "mailto:hi@raymind.ai" },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                style={{
                  color: "var(--text-faint)",
                  fontSize: 12,
                  textDecoration: "none",
                  fontFamily: "var(--font-geist-mono), monospace",
                }}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
