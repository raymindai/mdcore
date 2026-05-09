"use client";

// In-editor view of a hub. Mirrors what /hub/<slug>/page.tsx renders
// publicly (profile, deploy-to-AI strip, docs + bundles list) but
// scoped to live inside an editor tab — clicking a doc/bundle opens
// it as a tab in the same editor instead of navigating away.
//
// The layout is intentionally workspace-flavoured: a hero header with
// the public hub URL front-and-center, a stats grid, top concepts as
// pills, four quick-action cards, then the doc + bundle lists. The
// goal is "here's your knowledge base at a glance" — not just a list
// view of recent docs.

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ScrollText, Layers, Copy, Check, ExternalLink, Plus, Sparkles,
  FileText, Globe, Hash, Clock,
} from "lucide-react";

interface HubData {
  hub: {
    slug: string;
    display_name: string | null;
    avatar_url: string | null;
    description: string | null;
    plan: string | null;
    url: string;
  };
  documents: Array<{ id: string; title: string; snippet: string; updated_at: string; source: string | null }>;
  bundles: Array<{ id: string; title: string; description: string | null; updated_at: string }>;
  topConcepts?: Array<{ id: number; label: string; occurrence: number; docCount: number }>;
  counts: { documents: number; bundles: number; concepts?: number; totalWords?: number };
  lastUpdated?: string | null;
}

interface HubEmbedProps {
  slug: string;
  onOpenDoc?: (docId: string) => void;
  onOpenBundle?: (bundleId: string) => void;
  onNewDoc?: () => void;
  onNewBundle?: () => void;
  onOpenChat?: () => void;
}

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  if (ms < 7 * 86_400_000) return `${Math.floor(ms / 86_400_000)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function compactNumber(n: number | undefined | null): string {
  if (n == null) return "—";
  if (n < 1000) return String(n);
  if (n < 10_000) return `${(n / 1000).toFixed(1)}k`;
  return `${Math.round(n / 1000)}k`;
}

export default function HubEmbed({ slug, onOpenDoc, onOpenBundle, onNewDoc, onNewBundle, onOpenChat }: HubEmbedProps) {
  const [data, setData] = useState<HubData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetch(`/api/hub/${slug}`);
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          if (!cancelled) {
            setError(e.error || `Failed (${res.status})`);
            setLoading(false);
          }
          return;
        }
        const json = (await res.json()) as HubData;
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed");
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const copyUrl = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.hub.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-caption" style={{ color: "var(--text-muted)" }}>
        Loading hub…
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-full text-caption px-6 text-center" style={{ color: "#ef4444" }}>
        {error === "Hub not found"
          ? "This hub isn't public yet. Enable hub_public in your profile to view it here."
          : (error || "Could not load hub.")}
      </div>
    );
  }

  const filterLower = filter.trim().toLowerCase();
  const filteredDocs = filterLower
    ? data.documents.filter((d) =>
        d.title.toLowerCase().includes(filterLower) ||
        (d.snippet || "").toLowerCase().includes(filterLower)
      )
    : data.documents;
  const filteredBundles = filterLower
    ? data.bundles.filter((b) => b.title.toLowerCase().includes(filterLower) || (b.description || "").toLowerCase().includes(filterLower))
    : data.bundles;
  const recentDocs = filteredDocs.slice(0, 6);
  const remainingDocs = filteredDocs.slice(6);
  const stats = [
    { label: "Documents", value: data.counts.documents, icon: <FileText width={14} height={14} /> },
    { label: "Bundles",   value: data.counts.bundles,   icon: <Layers width={14} height={14} /> },
    { label: "Concepts",  value: data.counts.concepts ?? 0, icon: <Hash width={14} height={14} /> },
    { label: "Words",     value: data.counts.totalWords ?? 0, icon: <ScrollText width={14} height={14} /> },
  ];
  const topConcepts = data.topConcepts || [];

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* ── Hero — avatar + name + slug + URL block ─────────────── */}
        <header className="mb-6">
          <div
            className="relative rounded-2xl overflow-hidden"
            style={{
              background: "linear-gradient(135deg, var(--accent-dim) 0%, var(--surface) 80%)",
              border: "1px solid var(--border-dim)",
            }}
          >
            <div className="px-6 pt-6 pb-5 flex items-start gap-4">
              <img
                src={data.hub.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${slug}`}
                alt=""
                className="w-16 h-16 rounded-full shrink-0"
                style={{ border: "2px solid var(--background)", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                    {data.hub.display_name || slug}
                  </h1>
                  <span
                    className="text-caption font-mono px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                    style={{ background: "var(--background)", color: "var(--accent)", border: "1px solid var(--accent-dim)" }}
                  >
                    <Globe width={10} height={10} />
                    /hub/{slug}
                  </span>
                </div>
                {data.hub.description && (
                  <p className="text-caption mt-1.5 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {data.hub.description}
                  </p>
                )}
                {data.lastUpdated && (
                  <div className="mt-2 inline-flex items-center gap-1 text-caption" style={{ color: "var(--text-faint)" }}>
                    <Clock width={10} height={10} />
                    Last update {relativeTime(data.lastUpdated)}
                  </div>
                )}
              </div>
            </div>
            {/* Deploy URL band — the primary affordance: copy this URL */}
            <div className="px-6 pb-5">
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: "var(--background)", border: "1px solid var(--border-dim)" }}
              >
                <Globe width={12} height={12} style={{ color: "var(--text-faint)" }} className="shrink-0" />
                <code
                  className="text-caption font-mono truncate flex-1"
                  style={{ color: "var(--text-primary)" }}
                >
                  {data.hub.url}
                </code>
                <button
                  onClick={copyUrl}
                  className="shrink-0 flex items-center gap-1 text-caption px-2.5 py-1 rounded-lg transition-colors"
                  style={{
                    background: copied ? "rgba(34,197,94,0.15)" : "var(--accent-dim)",
                    color: copied ? "#22c55e" : "var(--accent)",
                    border: `1px solid ${copied ? "rgba(34,197,94,0.4)" : "var(--accent-dim)"}`,
                  }}
                >
                  {copied ? <Check width={11} height={11} /> : <Copy width={11} height={11} />}
                  {copied ? "Copied" : "Copy"}
                </button>
                <Link
                  href={`/hub/${slug}.md`}
                  target="_blank"
                  className="shrink-0 flex items-center gap-1 text-caption px-2.5 py-1 rounded-lg transition-colors hover:bg-[var(--toggle-bg)]"
                  style={{ color: "var(--text-muted)", border: "1px solid var(--border-dim)" }}
                  title="Raw markdown index of the whole hub"
                >
                  <ExternalLink width={11} height={11} />
                  Raw
                </Link>
              </div>
              <p className="mt-2 text-caption leading-relaxed" style={{ color: "var(--text-faint)" }}>
                Paste this URL into Claude, ChatGPT, Cursor, or Codex — they fetch a structured index and follow inline links to read individual docs.
              </p>
            </div>
          </div>
        </header>

        {/* ── Stats grid ─────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          {stats.map((s) => (
            <div
              key={s.label}
              className="px-3 py-3 rounded-xl"
              style={{ background: "var(--surface)", border: "1px solid var(--border-dim)" }}
            >
              <div className="flex items-center gap-1.5 mb-1" style={{ color: "var(--text-faint)" }}>
                {s.icon}
                <span className="text-caption uppercase tracking-wider">{s.label}</span>
              </div>
              <div className="text-xl font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
                {compactNumber(s.value)}
              </div>
            </div>
          ))}
        </div>

        {/* ── Quick actions ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
          {([
            { label: "New doc",     icon: <Plus width={14} height={14} />,      onClick: onNewDoc,     accent: "var(--accent)"     },
            { label: "New bundle",  icon: <Layers width={14} height={14} />,    onClick: onNewBundle,  accent: "#38bdf8"           },
            { label: "Open chat",   icon: <Sparkles width={14} height={14} />,  onClick: onOpenChat,   accent: "#a78bfa"           },
            { label: "Browse hubs", icon: <Globe width={14} height={14} />,     onClick: undefined,    accent: "#22c55e", href: "/hubs" as const },
          ] as const).map((action) => {
            const inner = (
              <>
                <span
                  className="flex items-center justify-center shrink-0"
                  style={{ width: 30, height: 30, borderRadius: 8, background: "var(--accent-dim)", color: action.accent }}
                >
                  {action.icon}
                </span>
                <span className="text-body font-medium" style={{ color: "var(--text-primary)" }}>
                  {action.label}
                </span>
              </>
            );
            const className = "flex items-center gap-2 px-3 py-2.5 rounded-xl transition-colors hover:bg-[var(--toggle-bg)]";
            const style = { background: "var(--surface)", border: "1px solid var(--border-dim)", textAlign: "left" as const };
            if ("href" in action && action.href) {
              return (
                <Link key={action.label} href={action.href} target="_blank" className={className} style={style}>
                  {inner}
                </Link>
              );
            }
            return (
              <button
                key={action.label}
                onClick={action.onClick}
                disabled={!action.onClick}
                className={className}
                style={{ ...style, opacity: action.onClick ? 1 : 0.5, cursor: action.onClick ? "pointer" : "not-allowed" }}
              >
                {inner}
              </button>
            );
          })}
        </div>

        {/* ── Top concepts ───────────────────────────────────────── */}
        {topConcepts.length > 0 && (
          <section className="mb-6">
            <h2 className="text-caption font-semibold uppercase tracking-wider mb-2.5" style={{ color: "var(--accent)" }}>
              Top concepts
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {topConcepts.map((c) => (
                <span
                  key={c.id}
                  className="inline-flex items-center gap-1 text-caption px-2 py-1 rounded-full"
                  style={{
                    background: "var(--surface)",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--border-dim)",
                  }}
                  title={`${c.occurrence} mentions across ${c.docCount} doc${c.docCount === 1 ? "" : "s"}`}
                >
                  <Hash width={9} height={9} style={{ color: "var(--accent)" }} />
                  {c.label}
                  <span className="font-mono tabular-nums" style={{ color: "var(--text-faint)", fontSize: 10 }}>
                    {c.occurrence}
                  </span>
                </span>
              ))}
            </div>
          </section>
        )}

        {/* ── Search filter ──────────────────────────────────────── */}
        {(data.documents.length > 0 || data.bundles.length > 0) && (
          <div className="mb-4">
            <input
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter docs and bundles…"
              className="w-full px-3 py-2 rounded-lg text-caption transition-colors"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border-dim)",
                color: "var(--text-primary)",
                outline: "none",
              }}
            />
          </div>
        )}

        {/* ── Bundles ────────────────────────────────────────────── */}
        {filteredBundles.length > 0 && (
          <section className="mb-6">
            <h2 className="text-caption font-semibold uppercase tracking-wider mb-2.5 flex items-center justify-between" style={{ color: "var(--accent)" }}>
              <span>Bundles</span>
              <span className="font-mono font-normal" style={{ color: "var(--text-faint)" }}>{filteredBundles.length}</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredBundles.map((b) => (
                <button
                  key={b.id}
                  onClick={() => onOpenBundle?.(b.id)}
                  className="text-left flex flex-col gap-1 p-3 rounded-xl transition-colors hover:bg-[var(--toggle-bg)]"
                  style={{ background: "var(--surface)", border: "1px solid var(--border-dim)" }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Layers width={13} height={13} style={{ color: "var(--accent)" }} className="shrink-0" />
                    <span className="text-body font-medium truncate" style={{ color: "var(--text-primary)" }}>{b.title}</span>
                  </div>
                  {b.description ? (
                    <p className="text-caption line-clamp-2 leading-relaxed" style={{ color: "var(--text-faint)" }}>
                      {b.description}
                    </p>
                  ) : (
                    <span className="text-caption" style={{ color: "var(--text-faint)" }}>{relativeTime(b.updated_at)}</span>
                  )}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── Recent docs (cards with snippets) ──────────────────── */}
        {recentDocs.length > 0 && (
          <section className="mb-6">
            <h2 className="text-caption font-semibold uppercase tracking-wider mb-2.5 flex items-center justify-between" style={{ color: "var(--accent)" }}>
              <span>Recent</span>
              <span className="font-mono font-normal" style={{ color: "var(--text-faint)" }}>{filteredDocs.length}</span>
            </h2>
            <div className="grid grid-cols-1 gap-1.5">
              {recentDocs.map((d) => (
                <button
                  key={d.id}
                  onClick={() => onOpenDoc?.(d.id)}
                  className="w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-[var(--toggle-bg)] group/doc"
                  style={{ background: "var(--surface)", border: "1px solid var(--border-dim)" }}
                >
                  <ScrollText width={14} height={14} style={{ color: "var(--text-muted)" }} className="shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-body" style={{ color: "var(--text-primary)" }}>{d.title}</span>
                      <span className="shrink-0 text-caption font-mono" style={{ color: "var(--text-faint)" }}>{relativeTime(d.updated_at)}</span>
                    </div>
                    {d.snippet && (
                      <div className="line-clamp-2 text-caption leading-relaxed mt-0.5" style={{ color: "var(--text-faint)" }}>
                        {d.snippet.replace(/[#*_`>]/g, "").trim().slice(0, 200)}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── All docs (compact remainder grid) ──────────────────── */}
        {remainingDocs.length > 0 && (
          <section className="mb-8">
            <h2 className="text-caption font-semibold uppercase tracking-wider mb-2.5" style={{ color: "var(--accent)" }}>
              All documents <span className="font-mono font-normal" style={{ color: "var(--text-faint)" }}>({remainingDocs.length})</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              {remainingDocs.map((d) => (
                <button
                  key={d.id}
                  onClick={() => onOpenDoc?.(d.id)}
                  className="text-left flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors hover:bg-[var(--toggle-bg)] min-w-0"
                >
                  <ScrollText width={11} height={11} style={{ color: "var(--text-muted)" }} className="shrink-0" />
                  <span className="truncate text-caption" style={{ color: "var(--text-secondary)" }}>{d.title}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {data.documents.length === 0 && data.bundles.length === 0 && (
          <div className="py-12 text-center text-caption" style={{ color: "var(--text-faint)" }}>
            This hub is empty so far. Publish a doc or a bundle to fill it.
          </div>
        )}

        {filterLower && filteredDocs.length === 0 && filteredBundles.length === 0 && (
          <div className="py-8 text-center text-caption" style={{ color: "var(--text-faint)" }}>
            No matches for &ldquo;{filter}&rdquo;.
          </div>
        )}
      </div>
    </div>
  );
}
