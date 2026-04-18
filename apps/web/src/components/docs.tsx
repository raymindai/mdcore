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
export function DocsNav({ active = "api" }: { active?: "about" | "plugins" | "api" } = {}) {
  const navItems = [
    { label: "About", href: "/about", key: "about" },
    { label: "Plugins", href: "/plugins", key: "plugins" },
    { label: "API", href: "/docs", key: "api" },
  ];
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
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <MdfyLogo size={22} />
          </Link>
          <div style={{ display: "flex", gap: 16 }}>
            {navItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                style={{
                  color: active === item.key ? "var(--accent)" : "var(--text-muted)",
                  fontSize: 13,
                  fontWeight: active === item.key ? 600 : 400,
                  textDecoration: "none",
                }}
              >
                {item.label}
              </Link>
            ))}
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

/* ─── DocsSidebar ─── */
export function DocsSidebar({
  items,
  alsoSee,
}: {
  items: { id: string; label: string }[];
  alsoSee: { label: string; href: string }[];
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
        {alsoSee.map((l) => (
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
  );
}
