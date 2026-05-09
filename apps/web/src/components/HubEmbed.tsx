"use client";

// In-editor view of the user's hub. Distinct from Home (private
// workspace landing) — Hub is the PUBLIC face. The view focuses on:
//
//   - the deploy-to-AI URL (the v6 thesis surface)
//   - "view as a visitor sees it"
//   - the user's full library grouped by access (Public / Shared /
//     Private), bundles above docs in each section so the workspace
//     primitive comes first
//
// Clicking a doc/bundle opens it as an editor tab in the same
// instance — no full-page navigation, no losing context.

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Layers, Copy, Check, ExternalLink, Globe, Eye, Lock, Users,
  ShieldAlert,
} from "lucide-react";
import DocStatusIcon from "@/components/DocStatusIcon";

interface DocCard {
  id: string;
  title: string;
  snippet: string;
  updated_at: string;
  isDraft: boolean;
  editMode: string | null;
  cloudId: string;
}
interface BundleCard {
  id: string;
  title: string;
  description: string | null;
  updated_at: string;
  isDraft: boolean;
}
interface HubData {
  hub: {
    slug: string;
    display_name: string | null;
    avatar_url: string | null;
    description: string | null;
    plan: string | null;
    url: string;
  };
  /** Public-only doc list — kept for the public-visitor fallback when
   *  the caller is not the hub owner. Owners use `ownerView` instead. */
  documents: Array<{ id: string; title: string; snippet: string; updated_at: string; source: string | null }>;
  /** Public-only bundle list — same purpose as `documents`. */
  bundles: Array<{ id: string; title: string; description: string | null; updated_at: string }>;
  topConcepts?: Array<{ id: number; label: string; occurrence: number; docCount: number }>;
  counts: { documents: number; bundles: number; concepts?: number; totalWords?: number };
  lastUpdated?: string | null;
  isOwner?: boolean;
  ownerView?: {
    bundles: { public: BundleCard[]; shared: BundleCard[]; private: BundleCard[] };
    documents: { public: DocCard[]; shared: DocCard[]; private: DocCard[] };
  } | null;
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

// Three access tiers — visual identity for each section header. Public
// (orange = on the hub), Shared (blue = with specific people),
// Private (faint = only you). Using explicit colours so the tier the
// user is looking at is always recognisable at a glance.
const TIERS = {
  public:  { label: "Public",  desc: "On your hub URL — anyone with the link can read", icon: Globe,        color: "var(--accent)", bg: "var(--accent-dim)" },
  shared:  { label: "Shared",  desc: "Restricted to specific people or password",         icon: Users,         color: "#60a5fa",       bg: "rgba(96,165,250,0.12)" },
  private: { label: "Private", desc: "Only you can read these — your working drafts and pinboard", icon: Lock, color: "var(--text-muted)", bg: "var(--toggle-bg)" },
} as const;

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
        const res = await fetch(`/api/hub/${slug}`, { credentials: "include" });
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

  const ov = data.ownerView;
  const totalCounts = ov
    ? {
        public:  ov.bundles.public.length  + ov.documents.public.length,
        shared:  ov.bundles.shared.length  + ov.documents.shared.length,
        private: ov.bundles.private.length + ov.documents.private.length,
      }
    : null;

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* ── Eyebrow + identity ──────────────────────────────────── */}
        <div className="text-caption font-mono uppercase tracking-wider mb-2" style={{ color: "var(--accent)" }}>
          Public knowledge hub
        </div>
        <header className="flex items-start gap-4 mb-8">
          <img
            src={data.hub.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(slug)}`}
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

        {/* ── Deploy-to-AI — the WHY of Hub ───────────────────────── */}
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
                Paste the URL into <strong>Claude</strong>, <strong>ChatGPT</strong>, or <strong>Cursor</strong>. The AI fetches a structured index and follows inline links.
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

        {/* ── Stat strip — counts by access tier ──────────────────── */}
        {totalCounts && (
          <section className="grid grid-cols-3 gap-2 mb-8">
            {(["public", "shared", "private"] as const).map((tier) => {
              const t = TIERS[tier];
              const Icon = t.icon;
              return (
                <div
                  key={tier}
                  className="px-4 py-3 rounded-xl"
                  style={{ background: "var(--surface)", border: "1px solid var(--border-dim)" }}
                >
                  <div className="flex items-center gap-1.5 mb-1" style={{ color: t.color }}>
                    <Icon width={12} height={12} />
                    <span className="text-caption uppercase tracking-wider font-semibold">{t.label}</span>
                  </div>
                  <div className="text-xl font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
                    {totalCounts[tier]}
                  </div>
                  <div className="text-caption mt-0.5" style={{ color: "var(--text-faint)" }}>
                    {ov ? `${ov.bundles[tier].length} bundle${ov.bundles[tier].length === 1 ? "" : "s"} · ${ov.documents[tier].length} doc${ov.documents[tier].length === 1 ? "" : "s"}` : ""}
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {/* ── Owner view — three sections by access tier, bundles
              above docs in each section. Non-owner falls through to
              the simpler public-only fallback below. ─────────────── */}
        {ov && (["public", "shared", "private"] as const).map((tier) => {
          const t = TIERS[tier];
          const bundles = ov.bundles[tier];
          const docs = ov.documents[tier];
          if (bundles.length === 0 && docs.length === 0) return null;
          const Icon = t.icon;
          return (
            <section key={tier} className="mb-10">
              <div className="flex items-baseline gap-2 mb-3 pb-2" style={{ borderBottom: `1px solid ${t.color === "var(--accent)" ? "var(--accent-dim)" : t.bg}` }}>
                <span
                  className="flex items-center justify-center shrink-0"
                  style={{ width: 22, height: 22, borderRadius: 6, background: t.bg, color: t.color }}
                >
                  <Icon width={12} height={12} />
                </span>
                <h2 className="text-heading" style={{ color: t.color }}>{t.label}</h2>
                <span className="text-caption font-mono tabular-nums" style={{ color: "var(--text-faint)" }}>
                  {bundles.length + docs.length}
                </span>
                <span className="text-caption ml-auto" style={{ color: "var(--text-faint)" }}>{t.desc}</span>
              </div>

              {/* Bundles first — workspace primitive comes above docs */}
              {bundles.length > 0 && (
                <div className="mb-4">
                  <div className="text-caption uppercase tracking-wider mb-2" style={{ color: "var(--text-faint)", fontSize: 10 }}>
                    Bundles · {bundles.length}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {bundles.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => onOpenBundle?.(b.id)}
                        className="text-left flex flex-col gap-1 p-3 rounded-lg transition-colors hover:bg-[var(--toggle-bg)]"
                        style={{ background: "var(--surface)", border: "1px solid var(--border-dim)" }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Layers width={13} height={13} style={{ color: t.color }} className="shrink-0" />
                          <span className="text-body font-medium truncate" style={{ color: "var(--text-primary)" }}>{b.title}</span>
                          <span className="ml-auto text-caption font-mono shrink-0" style={{ color: "var(--text-faint)" }}>{relativeTime(b.updated_at)}</span>
                        </div>
                        {b.description && (
                          <p className="text-caption line-clamp-2 leading-relaxed" style={{ color: "var(--text-faint)" }}>
                            {b.description}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Docs — same row layout the sidebar uses, with the
                  same DocStatusIcon so a doc reads identically here
                  and in MDs. */}
              {docs.length > 0 && (
                <div>
                  <div className="text-caption uppercase tracking-wider mb-2" style={{ color: "var(--text-faint)", fontSize: 10 }}>
                    Docs · {docs.length}
                  </div>
                  <ul className="space-y-0.5">
                    {docs.slice(0, 30).map((d) => (
                      <li key={d.id}>
                        <button
                          onClick={() => onOpenDoc?.(d.id)}
                          className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors hover:bg-[var(--toggle-bg)]"
                        >
                          <DocStatusIcon
                            tab={{
                              isDraft: d.isDraft,
                              editMode: d.editMode || undefined,
                              cloudId: d.cloudId,
                              permission: "mine",
                            }}
                            isActive={false}
                          />
                          <span className="flex-1 truncate text-body" style={{ color: "var(--text-primary)" }}>{d.title}</span>
                          <span className="text-caption font-mono shrink-0" style={{ color: "var(--text-faint)" }}>{relativeTime(d.updated_at)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {docs.length > 30 && (
                    <p className="text-caption mt-2" style={{ color: "var(--text-faint)" }}>
                      +{docs.length - 30} more — open the sidebar to browse all.
                    </p>
                  )}
                </div>
              )}
            </section>
          );
        })}

        {/* ── Non-owner fallback — when API didn't return ownerView,
              this is a public visitor. Show only what's public. ── */}
        {!ov && data.documents.length > 0 && (
          <section className="mb-10">
            <header className="flex items-baseline justify-between mb-3">
              <h2 className="text-heading" style={{ color: "var(--accent)" }}>Public</h2>
              <span className="text-caption" style={{ color: "var(--text-faint)" }}>
                {data.counts.bundles} bundle{data.counts.bundles === 1 ? "" : "s"} · {data.counts.documents} doc{data.counts.documents === 1 ? "" : "s"}
              </span>
            </header>
            <ul className="space-y-1">
              {data.documents.map((d) => (
                <li key={d.id}>
                  <button
                    onClick={() => onOpenDoc?.(d.id)}
                    className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-[var(--toggle-bg)]"
                  >
                    <DocStatusIcon tab={{ isDraft: false, cloudId: d.id, permission: "readonly" }} isActive={false} />
                    <span className="flex-1 truncate text-body" style={{ color: "var(--text-primary)" }}>{d.title}</span>
                    <span className="text-caption shrink-0 font-mono" style={{ color: "var(--text-faint)" }}>{relativeTime(d.updated_at)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Empty hub state */}
        {ov && totalCounts &&
          totalCounts.public === 0 && totalCounts.shared === 0 && totalCounts.private === 0 && (
          <div className="py-12 text-center">
            <ShieldAlert width={24} height={24} className="mx-auto mb-3" style={{ color: "var(--text-faint)", opacity: 0.5 }} />
            <p className="text-body mb-1" style={{ color: "var(--text-secondary)" }}>
              No content yet.
            </p>
            <p className="text-caption" style={{ color: "var(--text-faint)" }}>
              Create a doc or a bundle to fill your hub.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
