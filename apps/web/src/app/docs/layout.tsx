"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const sidebarItems = [
  { label: "Overview", href: "/docs" },
  { label: "REST API", href: "/docs/api" },
  { label: "CLI", href: "/docs/cli" },
  { label: "JavaScript SDK", href: "/docs/sdk" },
  { label: "MCP Server", href: "/docs/mcp" },
];

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--background)" }}>
      {/* Sidebar */}
      <aside
        className="hidden md:flex flex-col shrink-0"
        style={{
          width: 220,
          borderRight: "1px solid var(--border-dim)",
          position: "sticky",
          top: 0,
          height: "100vh",
          overflowY: "auto",
          background: "var(--background)",
          zIndex: 30,
        }}
      >
        {/* Logo */}
        <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid var(--border-dim)" }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-geist-mono), monospace" }}>mdfy.cc</span>
          </Link>
          <span style={{ display: "block", fontSize: 10, color: "var(--text-faint)", marginTop: 2, fontFamily: "var(--font-geist-mono), monospace" }}>Documentation</span>
        </div>

        {/* Nav items */}
        <nav style={{ padding: "12px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
          {sidebarItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  color: active ? "var(--accent)" : "var(--text-secondary)",
                  background: active ? "var(--accent-dim)" : "transparent",
                  textDecoration: "none",
                  transition: "background 0.1s, color 0.1s",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom links */}
        <div style={{ marginTop: "auto", padding: "12px 10px", borderTop: "1px solid var(--border-dim)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {[
              { label: "Plugins", href: "/plugins" },
              { label: "About", href: "/about" },
              { label: "Open Editor", href: "/" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  padding: "6px 12px",
                  fontSize: 12,
                  color: "var(--text-faint)",
                  textDecoration: "none",
                  borderRadius: 6,
                }}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, minWidth: 0 }}>
        {children}
      </main>
    </div>
  );
}
