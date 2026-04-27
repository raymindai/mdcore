"use client";
import Link from "next/link";
import MdfyLogo from "@/components/MdfyLogo";

const mono =
  "var(--font-geist-mono), 'SF Mono', 'Fira Code', 'JetBrains Mono', monospace";

export { mono };

/* ─── CodeBlock ─── */
export function CodeBlock({
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
          background: "var(--surface)",
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

/* ─── InlineCode ─── */
export function InlineCode({ children }: { children: string }) {
  return (
    <code
      style={{
        background: "var(--surface)",
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

/* ─── Card ─── */
export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
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

/* ─── SectionHeading ─── */
export function SectionHeading({
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
        marginBottom: 16,
        letterSpacing: "-0.02em",
        scrollMarginTop: 80,
      }}
    >
      {children}
    </h2>
  );
}

/* ─── SubLabel ─── */
export function SubLabel({ children }: { children: string }) {
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

/* ─── DocsNav ─── */
export function DocsNav({ active = "docs", lang = "en" }: { active?: "about" | "plugins" | "docs"; lang?: "en" | "ko" } = {}) {
  const prefix = lang === "ko" ? "/ko" : "";
  const navItems = [
    { label: "About", href: `${prefix}/about`, key: "about" },
    { label: "Plugins", href: `${prefix}/plugins`, key: "plugins" },
    { label: "Docs", href: `${prefix}/docs`, key: "docs" },
  ];

  /* Derive the current path's counterpart in the other language */
  const langSwitchPaths: Record<string, { en: string; ko: string }> = {
    about: { en: "/about", ko: "/ko/about" },
    plugins: { en: "/plugins", ko: "/ko/plugins" },
    docs: { en: "/docs", ko: "/ko/docs" },
  };
  const currentPaths = langSwitchPaths[active] || langSwitchPaths.about;
  return (
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
        <Link href="/" style={{ textDecoration: "none", flexShrink: 0 }}>
          <MdfyLogo size={22} />
        </Link>
        <div className="site-nav-links" style={{ flex: 1, justifyContent: "center" }}>
          {navItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="site-nav-link"
              data-active={active === item.key}
            >
              {item.label}
            </Link>
          ))}
          <a
            href="https://github.com/raymindai/mdcore"
            target="_blank"
            rel="noopener noreferrer"
            className="site-nav-link"
          >
            GitHub
          </a>
        </div>
        <div className="site-nav-right">
          <details className="lang-dropdown">
            <summary className="lang-dropdown-toggle">
              {lang === "en" ? "EN" : "KO"}
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="2 4 5 7 8 4" /></svg>
            </summary>
            <div className="lang-dropdown-menu">
              <a href={currentPaths.en} className={lang === "en" ? "active" : ""} onClick={() => { document.cookie = "mdfy-lang=en;path=/;max-age=31536000"; }}>English</a>
              <a href={currentPaths.ko} className={lang === "ko" ? "active" : ""} onClick={() => { document.cookie = "mdfy-lang=;path=/;max-age=0"; }}>한국어</a>
            </div>
          </details>
          <Link href="/" className="site-nav-cta">
            Open Editor
          </Link>
        </div>
        <details className="site-nav-hamburger-wrapper">
          <summary className="site-nav-hamburger" aria-label="Toggle menu">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="2" y1="4" x2="14" y2="4" />
              <line x1="2" y1="8" x2="14" y2="8" />
              <line x1="2" y1="12" x2="14" y2="12" />
            </svg>
          </summary>
          <div className="site-nav-mobile-menu">
            {navItems.map((item) => (
              <Link key={item.key} href={item.href} data-active={active === item.key}>
                {item.label}
              </Link>
            ))}
            <details className="lang-dropdown">
              <summary className="lang-dropdown-toggle">
                {lang === "en" ? "EN" : "KO"}
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="2 4 5 7 8 4" /></svg>
              </summary>
              <div className="lang-dropdown-menu">
                <a href={currentPaths.en} className={lang === "en" ? "active" : ""} onClick={() => { document.cookie = "mdfy-lang=en;path=/;max-age=31536000"; }}>English</a>
                <a href={currentPaths.ko} className={lang === "ko" ? "active" : ""} onClick={() => { document.cookie = "mdfy-lang=;path=/;max-age=0"; }}>한국어</a>
              </div>
            </details>
            <a href="https://github.com/raymindai/mdcore" target="_blank" rel="noopener noreferrer">GitHub</a>
            <Link href="/">Open Editor</Link>
          </div>
        </details>
      </div>
    </nav>
  );
}

/* ─── DocsFooter ─── */
export function DocsFooter({
  breadcrumb,
}: {
  breadcrumb?: string;
}) {
  return (
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
        <p
          style={{
            fontSize: 12,
            color: "var(--text-faint)",
            fontFamily: mono,
            margin: 0,
          }}
        >
          {breadcrumb ? (
            <>
              <Link
                href="/docs"
                style={{
                  color: "var(--text-muted)",
                  textDecoration: "none",
                }}
              >
                Documentation
              </Link>
              {" / "}
              {breadcrumb}
            </>
          ) : (
            <Link
              href="/docs"
              style={{
                color: "var(--text-muted)",
                textDecoration: "none",
              }}
            >
              Documentation
            </Link>
          )}
        </p>
        <p
          style={{
            fontSize: 11,
            color: "var(--text-faint)",
            fontFamily: mono,
            margin: 0,
          }}
        >
          &copy; 2026 mdfy.cc
        </p>
      </div>
    </footer>
  );
}

/* ─── SiteFooter ─── */
export function SiteFooter() {
  return (
    <footer style={{ borderTop: "1px solid var(--border-dim)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 24px 32px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 160px), 1fr))",
            gap: "32px 48px",
            marginBottom: 40,
          }}
        >
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
              Developers
            </p>
            {[
              { label: "REST API", href: "/docs/api" },
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
                  padding: "3px 0",
                }}
              >
                {l.label}
              </Link>
            ))}
          </div>
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
              { label: "GitHub", href: "https://github.com/raymindai/mdcore" },
              { label: "Contact", href: "mailto:hi@raymind.ai" },
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
  );
}

/* ─── DocsSidebar ─── */

const docsNav = [
  { label: "Overview", href: "/docs" },
  { label: "REST API", href: "/docs/api" },
  { label: "CLI", href: "/docs/cli" },
  { label: "JavaScript SDK", href: "/docs/sdk" },
  { label: "MCP Server", href: "/docs/mcp" },
];

export function DocsSidebar({
  items,
  currentPath,
}: {
  items: { id: string; label: string }[];
  currentPath?: string;
}) {
  return (
    <aside
      className="docs-sidebar"
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
      {/* Section navigation */}
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
        Documentation
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 1, marginBottom: 20 }}>
        {docsNav.map((item) => {
          const active = currentPath === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                color: active ? "var(--accent)" : "var(--text-muted)",
                background: active ? "var(--accent-dim)" : "transparent",
                textDecoration: "none",
                padding: "6px 12px",
                borderRadius: 6,
                display: "block",
                transition: "background 0.1s",
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* On this page */}
      {items.length > 0 && (
        <>
          <div style={{ borderTop: "1px solid var(--border-dim)", marginBottom: 16, paddingTop: 16 }}>
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
              On This Page
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {items.map((item) => (
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
        </>
      )}
    </aside>
  );
}
