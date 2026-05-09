"use client";

// In-editor view of a hub. Distinct from Home (which is your private
// workspace landing) — Hub is the PUBLIC face of your knowledge base.
// The view focuses on things only Hub gives you:
//
//   - the deploy-to-AI URL (the v6 thesis surface)
//   - "view as a visitor sees it"
//   - public counts vs drafts hidden (honest accounting)
//   - the published docs + bundles others can actually reach
//
// Clicking a doc/bundle opens it as an editor tab in the same
// instance — no full-page navigation, no losing context.

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ScrollText, Layers, Copy, Check, ExternalLink, Globe, Eye,
  Lock, BookOpen,
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
  counts: {
    documents: number;
    bundles: number;
    concepts?: number;
    totalWords?: number;
    drafts?: number;
    bundleDrafts?: number;
  };
  lastUpdated?: string | null;
}

interface HubEmbedProps {
  slug: string;
  onOpenDoc?: (docId: string) => void;
  onOpenBundle?: (bundleId: string) => void;
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

export default function HubEmbed({ slug, onOpenDoc, onOpenBundle }: HubEmbedProps) {
  const [data, setData] = useState<HubData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

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

  const draftsCount = data.counts.drafts ?? 0;
  const bundleDraftsCount = data.counts.bundleDrafts ?? 0;

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* ── Eyebrow + title ─────────────────────────────────────── */}
        <div className="text-caption font-mono uppercase tracking-wider mb-2" style={{ color: "var(--accent)" }}>
          Public knowledge hub
        </div>

        {/* ── Identity row ────────────────────────────────────────── */}
        <header className="flex items-start gap-4 mb-8">
          <img
            src={data.hub.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${slug}`}
            alt=""
            className="w-16 h-16 rounded-full shrink-0"
            style={{ border: "1px solid var(--border-dim)" }}
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold leading-tight" style={{ color: "var(--text-primary)" }}>
              {data.hub.display_name || slug}
            </h1>
            <div className="text-caption font-mono mt-1" style={{ color: "var(--text-faint)" }}>
              /hub/{slug}
            </div>
            {data.hub.description && (
              <p className="text-body mt-3 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {data.hub.description}
              </p>
            )}
          </div>
        </header>

        {/* ── Deploy-to-AI — the hero affordance, the WHY of Hub ─── */}
        <section
          className="mb-8 px-5 py-4 rounded-xl"
          style={{ background: "var(--accent-dim)", border: "1px solid var(--accent)" }}
        >
          <div className="flex items-start gap-3">
            <Globe width={18} height={18} className="shrink-0 mt-0.5" style={{ color: "var(--accent)" }} />
            <div className="min-w-0 flex-1">
              <p className="text-body font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                Deploy this hub to any AI
              </p>
              <p className="text-caption leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                Paste the URL into <strong>Claude</strong>, <strong>ChatGPT</strong>, or <strong>Cursor</strong>. The AI fetches a structured index and follows inline links to read individual docs and bundles as needed.
              </p>
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <code
                  className="text-caption px-2 py-1 rounded font-mono"
                  style={{ background: "var(--background)", color: "var(--text-primary)", border: "1px solid var(--border-dim)" }}
                >
                  {data.hub.url}
                </code>
                <button
                  onClick={copyUrl}
                  className="flex items-center gap-1 text-caption px-2 py-1 rounded transition-colors"
                  style={{
                    background: copied ? "rgba(34,197,94,0.15)" : "var(--background)",
                    color: copied ? "#22c55e" : "var(--text-primary)",
                    border: `1px solid ${copied ? "rgba(34,197,94,0.4)" : "var(--border-dim)"}`,
                  }}
                >
                  {copied ? <Check width={11} height={11} /> : <Copy width={11} height={11} />}
                  {copied ? "Copied" : "Copy URL"}
                </button>
                <Link
                  href={`/hub/${slug}`}
                  target="_blank"
                  className="flex items-center gap-1 text-caption px-2 py-1 rounded transition-colors hover:bg-[var(--toggle-bg)]"
                  style={{ color: "var(--text-muted)", border: "1px solid var(--border-dim)" }}
                  title="Open the public page in a new tab — see your hub as a visitor sees it"
                >
                  <Eye width={11} height={11} />
                  View as visitor
                </Link>
                <Link
                  href={`/hub/${slug}.md`}
                  target="_blank"
                  className="flex items-center gap-1 text-caption px-2 py-1 rounded transition-colors hover:bg-[var(--toggle-bg)]"
                  style={{ color: "var(--text-muted)", border: "1px solid var(--border-dim)" }}
                >
                  <ExternalLink width={11} height={11} />
                  Raw .md
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Stat strip — public counts, with drafts hidden tally ─ */}
        <section className="flex items-center gap-6 mb-3 pb-6" style={{ borderBottom: "1px solid var(--border-dim)" }}>
          <div className="flex flex-col">
            <span className="text-display font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>{data.counts.documents}</span>
            <span className="text-caption uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>Public {data.counts.documents === 1 ? "doc" : "docs"}</span>
          </div>
          <div className="w-px h-10" style={{ background: "var(--border-dim)" }} />
          <div className="flex flex-col">
            <span className="text-display font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>{data.counts.bundles}</span>
            <span className="text-caption uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>Public {data.counts.bundles === 1 ? "bundle" : "bundles"}</span>
          </div>
          {(draftsCount > 0 || bundleDraftsCount > 0) && (
            <>
              <div className="w-px h-10" style={{ background: "var(--border-dim)" }} />
              <div className="flex flex-col">
                <span className="text-display font-bold tabular-nums flex items-center gap-1.5" style={{ color: "var(--text-faint)" }}>
                  <Lock width={14} height={14} />
                  {draftsCount + bundleDraftsCount}
                </span>
                <span className="text-caption uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>
                  Hidden ({draftsCount} draft{draftsCount === 1 ? "" : "s"}{bundleDraftsCount > 0 ? `, ${bundleDraftsCount} bundle${bundleDraftsCount === 1 ? "" : "s"}` : ""})
                </span>
              </div>
            </>
          )}
        </section>
        {(draftsCount > 0 || bundleDraftsCount > 0) && (
          <p className="text-caption mb-8" style={{ color: "var(--text-faint)" }}>
            Your library has more — the hub only shows <strong>published</strong> docs and bundles. Drafts and password-protected items stay private.
          </p>
        )}
        {!(draftsCount > 0 || bundleDraftsCount > 0) && <div className="mb-8" />}

        {/* ── What you can do here — only-on-Hub actions ─────────── */}
        <section className="mb-10 px-5 py-4 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border-dim)" }}>
          <h2 className="text-caption font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--accent)" }}>
            What you can do here
          </h2>
          <ul className="space-y-2 text-caption leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            <li className="flex items-start gap-2">
              <Globe width={12} height={12} className="shrink-0 mt-0.5" style={{ color: "var(--accent)" }} />
              <span>
                <strong style={{ color: "var(--text-primary)" }}>Drop your hub URL into any AI.</strong> Claude, ChatGPT, Cursor, Codex — they fetch your full personal context as a structured index.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Eye width={12} height={12} className="shrink-0 mt-0.5" style={{ color: "var(--accent)" }} />
              <span>
                <strong style={{ color: "var(--text-primary)" }}>See your hub as a visitor sees it.</strong> The "View as visitor" link above opens the public-facing page — the exact thing that lands when someone opens your URL.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <BookOpen width={12} height={12} className="shrink-0 mt-0.5" style={{ color: "var(--accent)" }} />
              <span>
                <strong style={{ color: "var(--text-primary)" }}>Browse other people&apos;s hubs.</strong> See how other founders, researchers, and writers structure theirs at <Link href="/hubs" target="_blank" className="underline" style={{ color: "var(--accent)" }}>/hubs</Link>.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Lock width={12} height={12} className="shrink-0 mt-0.5" style={{ color: "var(--accent)" }} />
              <span>
                <strong style={{ color: "var(--text-primary)" }}>Control what&apos;s public.</strong> Drafts and password-protected docs never appear here. Publish from each doc&apos;s Share menu, or unpublish to take something off the hub.
              </span>
            </li>
          </ul>
        </section>

        {/* ── Recent / Public docs ────────────────────────────────── */}
        {data.documents.length > 0 && (
          <section className="mb-10">
            <header className="flex items-baseline justify-between mb-3">
              <h2 className="text-heading" style={{ color: "var(--accent)" }}>Public docs</h2>
              <span className="text-caption" style={{ color: "var(--text-faint)" }}>
                {data.documents.length} total{data.lastUpdated ? ` · last update ${relativeTime(data.lastUpdated)}` : ""}
              </span>
            </header>
            <ul className="space-y-1">
              {data.documents.slice(0, 12).map((d) => (
                <li key={d.id}>
                  <button
                    onClick={() => onOpenDoc?.(d.id)}
                    className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-[var(--toggle-bg)]"
                  >
                    <ScrollText width={12} height={12} className="shrink-0" style={{ color: "var(--accent)" }} />
                    <span className="flex-1 truncate text-body" style={{ color: "var(--text-primary)" }}>{d.title}</span>
                    <span className="text-caption shrink-0 font-mono" style={{ color: "var(--text-faint)" }}>{relativeTime(d.updated_at)}</span>
                  </button>
                </li>
              ))}
            </ul>
            {data.documents.length > 12 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-2">
                {data.documents.slice(12).map((d) => (
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
            )}
          </section>
        )}

        {/* ── Bundles ────────────────────────────────────────────── */}
        {data.bundles.length > 0 && (
          <section className="mb-12">
            <header className="mb-3">
              <h2 className="text-heading" style={{ color: "var(--accent)" }}>Public bundles</h2>
            </header>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {data.bundles.map((b) => (
                <button
                  key={b.id}
                  onClick={() => onOpenBundle?.(b.id)}
                  className="text-left flex flex-col gap-1 p-3 rounded-lg transition-colors hover:bg-[var(--toggle-bg)]"
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

        {data.documents.length === 0 && data.bundles.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-body mb-2" style={{ color: "var(--text-secondary)" }}>
              Your hub is empty.
            </p>
            <p className="text-caption" style={{ color: "var(--text-faint)" }}>
              Publish a doc or bundle from the editor to see it appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
