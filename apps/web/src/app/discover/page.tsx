"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import MdfyLogo from "@/components/MdfyLogo";

interface TrendingRepo {
  name: string;
  fullName: string;
  description: string;
  stars: number;
  language: string;
  url: string;
  readmeUrl: string;
}

const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6", JavaScript: "#f1e05a", Python: "#3572A5", Rust: "#dea584",
  Go: "#00ADD8", Java: "#b07219", "C++": "#f34b7d", C: "#555555", Swift: "#F05138",
  Kotlin: "#A97BFF", Ruby: "#701516", PHP: "#4F5D95", Shell: "#89e051", Dart: "#00B4AB",
  Zig: "#ec915c", Lua: "#000080", Elixir: "#6e4a7e", Haskell: "#5e5086",
};

function formatStars(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

export default function DiscoverPage() {
  const [repos, setRepos] = useState<TrendingRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"daily" | "weekly">("daily");
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = localStorage.getItem("mdfy-theme") as "dark" | "light" | null;
    const t = saved || "dark";
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/discover?period=${period}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.repos) setRepos(data.repos);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [period]);

  const openInMdfy = useCallback(async (repo: TrendingRepo) => {
    setOpeningId(repo.fullName);
    try {
      const res = await fetch(repo.readmeUrl);
      if (!res.ok) throw new Error("Failed to fetch README");
      const markdown = await res.text();

      // Compress and open via hash URL
      const encoder = new TextEncoder();
      const input = encoder.encode(markdown);
      const cs = new CompressionStream("gzip");
      const writer = cs.writable.getWriter();
      writer.write(input);
      writer.close();
      const reader = cs.readable.getReader();
      const chunks: Uint8Array[] = [];
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      const totalLen = chunks.reduce((s, c) => s + c.length, 0);
      const merged = new Uint8Array(totalLen);
      let offset = 0;
      for (const c of chunks) { merged.set(c, offset); offset += c.length; }
      let binary = "";
      for (let i = 0; i < merged.length; i++) binary += String.fromCharCode(merged[i]);
      const compressed = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

      const url = `/#md=${compressed}`;
      if (url.length <= 8000) {
        window.open(url, "_blank");
      } else {
        // Too large — open raw URL directly
        window.open(`/?url=${encodeURIComponent(repo.readmeUrl)}`, "_blank");
      }
    } catch {
      // Fallback: open GitHub directly
      window.open(repo.url, "_blank");
    }
    setTimeout(() => setOpeningId(null), 2000);
  }, []);

  return (
    <div style={{ background: "var(--background)", color: "var(--foreground)", minHeight: "100vh" }}>
      {/* Nav */}
      <nav style={{ position: "sticky", top: 0, zIndex: 40, borderBottom: "1px solid var(--border-dim)", background: "var(--header-bg)", backdropFilter: "blur(12px)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <Link href="/" style={{ textDecoration: "none" }}><MdfyLogo size={22} /></Link>
            <div style={{ display: "flex", gap: 16 }}>
              <Link href="/about" style={{ color: "var(--text-muted)", fontSize: 13, textDecoration: "none" }}>About</Link>
              <Link href="/plugins" style={{ color: "var(--text-muted)", fontSize: 13, textDecoration: "none" }}>Plugins</Link>
              <Link href="/discover" style={{ color: "var(--accent)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Discover</Link>
            </div>
          </div>
          <Link href="/" style={{ background: "var(--accent-dim)", color: "var(--accent)", padding: "6px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Open Editor</Link>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "60px 24px 40px" }}>
        <p style={{ color: "var(--accent)", fontSize: 12, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", marginBottom: 16, fontFamily: "var(--font-geist-mono), monospace" }}>
          Discover
        </p>
        <h1 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.03em", color: "var(--text-primary)", maxWidth: 600, margin: "0 0 16px" }}>
          Trending on GitHub,<br />
          <span style={{ color: "var(--accent)" }}>beautiful on mdfy.cc</span>
        </h1>
        <p style={{ fontSize: 15, color: "var(--text-tertiary)", maxWidth: 500, lineHeight: 1.7 }}>
          The hottest repos on GitHub — README files rendered beautifully. Click any to open in mdfy.cc.
        </p>
      </div>

      {/* Period tabs */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px 24px" }}>
        <div style={{ display: "flex", gap: 4, background: "var(--toggle-bg)", borderRadius: 8, padding: 3, width: "fit-content" }}>
          {(["daily", "weekly"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: "6px 16px", borderRadius: 6, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer",
                background: period === p ? "var(--accent-dim)" : "transparent",
                color: period === p ? "var(--accent)" : "var(--text-muted)",
                fontFamily: "var(--font-geist-mono), monospace",
              }}
            >
              {p === "daily" ? "Today" : "This Week"}
            </button>
          ))}
        </div>
      </div>

      {/* Repo list */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px 80px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ width: 24, height: 24, border: "2px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%", margin: "0 auto 16px", animation: "spin 1s linear infinite" }} />
            <p style={{ fontSize: 13, color: "var(--text-faint)" }}>Fetching trending repos...</p>
          </div>
        ) : repos.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <p style={{ fontSize: 15, color: "var(--text-faint)" }}>No trending repos found. Try again later.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 1, background: "var(--border-dim)", borderRadius: 12, overflow: "hidden", border: "1px solid var(--border-dim)" }}>
            {repos.map((repo, i) => (
              <div
                key={repo.fullName}
                style={{ background: "var(--surface)", padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, cursor: "pointer", transition: "background 0.1s" }}
                onClick={() => openInMdfy(repo)}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--menu-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "var(--surface)")}
              >
                {/* Rank */}
                <span style={{ fontSize: 14, fontWeight: 700, color: i < 3 ? "var(--accent)" : "var(--text-faint)", fontFamily: "var(--font-geist-mono), monospace", width: 28, textAlign: "right", flexShrink: 0 }}>
                  {i + 1}
                </span>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{repo.name}</span>
                    <span style={{ fontSize: 11, color: "var(--text-faint)" }}>{repo.fullName.split("/")[0]}</span>
                  </div>
                  {repo.description && (
                    <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0, lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {repo.description}
                    </p>
                  )}
                </div>

                {/* Meta */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                  {/* Language */}
                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-faint)" }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: LANG_COLORS[repo.language] || "#666", flexShrink: 0 }} />
                    <span className="hidden sm:inline">{repo.language}</span>
                  </span>
                  {/* Stars */}
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", fontFamily: "var(--font-geist-mono), monospace" }}>
                    ★ {formatStars(repo.stars)}
                  </span>
                  {/* Open button */}
                  <span
                    style={{
                      padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700,
                      background: openingId === repo.fullName ? "rgba(74,222,128,0.15)" : "var(--accent-dim)",
                      color: openingId === repo.fullName ? "#4ade80" : "var(--accent)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {openingId === repo.fullName ? "Opening..." : "mdfy"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer note */}
        <p style={{ fontSize: 11, color: "var(--text-faint)", textAlign: "center", marginTop: 24, lineHeight: 1.6 }}>
          Data from GitHub API. Click any repo to view its README in mdfy.cc with beautiful rendering.
          <br />
          <a href="https://github.com/trending" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "none" }}>See full GitHub Trending →</a>
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
