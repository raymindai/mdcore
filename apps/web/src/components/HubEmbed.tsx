"use client";

// In-editor view of a hub. Mirrors what /hub/<slug>/page.tsx renders
// publicly (profile, deploy-to-AI strip, docs + bundles list) but
// scoped to live inside an editor tab — clicking a doc/bundle opens
// it as a tab in the same editor instead of navigating away.

import { useEffect, useState } from "react";
import Link from "next/link";
import { ScrollText, Layers, Copy, Check, ExternalLink } from "lucide-react";

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
  counts: { documents: number; bundles: number };
}

interface HubEmbedProps {
  slug: string;
  onOpenDoc?: (docId: string) => void;
  onOpenBundle?: (bundleId: string) => void;
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

  const recentDocs = data.documents.slice(0, 7);
  const remainingDocs = data.documents.slice(7);

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Profile header */}
        <header className="flex items-start gap-4 mb-8">
          <img
            src={data.hub.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${slug}`}
            alt=""
            className="w-14 h-14 rounded-full shrink-0"
            style={{ border: "1px solid var(--border-dim)" }}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                {data.hub.display_name || slug}
              </h1>
              <span
                className="text-caption font-mono px-1.5 py-0.5 rounded"
                style={{ background: "var(--toggle-bg)", color: "var(--text-muted)" }}
              >
                /hub/{slug}
              </span>
            </div>
            {data.hub.description && (
              <p className="text-caption mt-1.5 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {data.hub.description}
              </p>
            )}
            <div className="mt-2 flex items-center gap-3 text-caption" style={{ color: "var(--text-faint)" }}>
              <span>{data.counts.documents} doc{data.counts.documents === 1 ? "" : "s"}</span>
              <span>·</span>
              <span>{data.counts.bundles} bundle{data.counts.bundles === 1 ? "" : "s"}</span>
            </div>
          </div>
        </header>

        {/* Deploy to AI strip — same purpose as the public /hub/<slug>
            page: a copy-to-clipboard URL + raw .md fallback. */}
        <section
          className="mb-8 px-4 py-4 rounded-lg"
          style={{ background: "var(--surface)", border: "1px solid var(--border-dim)" }}
        >
          <h2 className="text-caption font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--accent)" }}>
            Deploy to AI
          </h2>
          <p className="text-caption leading-relaxed mb-3" style={{ color: "var(--text-secondary)" }}>
            Paste the URL into <strong>Claude</strong>, <strong>ChatGPT</strong>, or <strong>Cursor</strong>. The AI fetches a structured index and follows inline links to read individual docs and bundles as needed.
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <code
              className="text-caption px-2 py-1 rounded font-mono"
              style={{ background: "var(--background)", color: "var(--text-primary)", border: "1px solid var(--border-dim)" }}
            >
              {data.hub.url}
            </code>
            <button
              onClick={copyUrl}
              className="flex items-center gap-1 text-caption px-2 py-1 rounded transition-colors hover:bg-[var(--toggle-bg)]"
              style={{ color: copied ? "#22c55e" : "var(--text-muted)", border: "1px solid var(--border-dim)" }}
            >
              {copied ? <Check width={11} height={11} /> : <Copy width={11} height={11} />}
              {copied ? "Copied" : "Copy"}
            </button>
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
        </section>

        {/* Bundles */}
        {data.bundles.length > 0 && (
          <section className="mb-8">
            <h2 className="text-caption font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--accent)" }}>
              Bundles
            </h2>
            <div className="space-y-1">
              {data.bundles.map((b) => (
                <button
                  key={b.id}
                  onClick={() => onOpenBundle?.(b.id)}
                  className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-[var(--toggle-bg)]"
                >
                  <Layers width={14} height={14} style={{ color: "var(--accent)" }} className="shrink-0" />
                  <span className="flex-1 truncate text-body" style={{ color: "var(--text-primary)" }}>
                    {b.title}
                  </span>
                  {b.description && (
                    <span className="text-caption truncate hidden sm:inline" style={{ color: "var(--text-faint)", maxWidth: 240 }}>
                      {b.description}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Recent docs */}
        {recentDocs.length > 0 && (
          <section className="mb-8">
            <h2 className="text-caption font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--accent)" }}>
              Recent
            </h2>
            <div className="space-y-1">
              {recentDocs.map((d) => (
                <button
                  key={d.id}
                  onClick={() => onOpenDoc?.(d.id)}
                  className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-[var(--toggle-bg)]"
                >
                  <ScrollText width={14} height={14} style={{ color: "var(--text-muted)" }} className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-body" style={{ color: "var(--text-primary)" }}>{d.title}</div>
                    {d.snippet && (
                      <div className="truncate text-caption" style={{ color: "var(--text-faint)" }}>
                        {d.snippet.replace(/[#*_`>]/g, "").trim().slice(0, 120)}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* All docs (remainder) */}
        {remainingDocs.length > 0 && (
          <section className="mb-8">
            <h2 className="text-caption font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--accent)" }}>
              All documents <span style={{ color: "var(--text-faint)", fontWeight: 400 }}>({remainingDocs.length})</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              {remainingDocs.map((d) => (
                <button
                  key={d.id}
                  onClick={() => onOpenDoc?.(d.id)}
                  className="text-left flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors hover:bg-[var(--toggle-bg)] min-w-0"
                >
                  <ScrollText width={12} height={12} style={{ color: "var(--text-muted)" }} className="shrink-0" />
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
      </div>
    </div>
  );
}
