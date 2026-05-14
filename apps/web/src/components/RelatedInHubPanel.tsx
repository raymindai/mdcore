"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Network } from "lucide-react";

interface RelatedRow {
  id: string;
  title: string;
  sharedConcepts: string[];
  overlap: number;
  updated_at: string | null;
  isDraft: boolean;
  isRestricted: boolean;
  sharedWithCount: number;
}

interface Props {
  docId: string;
  /** Caller mode: "public" renders for anonymous visitors (the
   *  endpoint already gates by hub_public + doc visibility). "owner"
   *  is for the in-editor variant if we ever re-mount this. */
  mode?: "public" | "owner";
}

/**
 * The AI-era replacement for traditional [[wikilink]] backlinks.
 * Reads the per-doc concept overlap from /api/docs/[id]/related and
 * renders a "Related in your hub" panel under the doc body. The
 * concepts that wire docs together come from the LLM analysis of
 * the prose — nobody had to type `[[Other Doc]]` for these
 * connections to surface.
 *
 * Hidden when:
 *   - The endpoint returns 403 (this doc isn't in a public hub)
 *   - The endpoint returns 0 related docs
 *   - The endpoint errors (silent fallback — never blocks the
 *     reading flow)
 */
export default function RelatedInHubPanel({ docId, mode = "public" }: Props) {
  const [related, setRelated] = useState<RelatedRow[] | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/docs/${docId}/related?limit=5`, { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) { setRelated([]); setLoaded(true); }
          return;
        }
        const json = await res.json();
        if (cancelled) return;
        setRelated((json.related || []) as RelatedRow[]);
        setLoaded(true);
      } catch {
        if (!cancelled) { setRelated([]); setLoaded(true); }
      }
    })();
    return () => { cancelled = true; };
  }, [docId]);

  if (!loaded) return null;
  if (!related || related.length === 0) return null;

  return (
    <section
      className="max-w-3xl mx-auto px-4 sm:px-6 py-8"
      style={{ borderTop: "1px solid var(--border-dim)" }}
    >
      <div className="flex items-center gap-2 mb-3" style={{ color: "var(--text-faint)" }}>
        <Network size={12} />
        <span className="text-xs uppercase tracking-wider">Related in this hub</span>
      </div>
      <p className="text-xs mb-4" style={{ color: "var(--text-faint)" }}>
        {mode === "public"
          ? "Other docs that share concepts with this one. The connections come from concept overlap — no manual links."
          : "Other docs in your hub that share the most concepts with this one."}
      </p>
      <ul className="space-y-2">
        {related.map((r) => (
          <li key={r.id}>
            <Link
              href={`/${r.id}`}
              className="block p-3 rounded-lg transition-colors hover:bg-[var(--toggle-bg)]"
              style={{ background: "var(--surface)", border: "1px solid var(--border-dim)" }}
            >
              <div className="flex items-baseline justify-between gap-3 mb-1">
                <h3 className="text-sm font-semibold leading-snug truncate" style={{ color: "var(--text-primary)" }}>
                  {r.title || "Untitled"}
                </h3>
                <span className="text-xs font-mono shrink-0" style={{ color: "var(--text-faint)" }}>
                  {r.overlap} shared
                </span>
              </div>
              {r.sharedConcepts.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {r.sharedConcepts.slice(0, 4).map((c) => (
                    <span
                      key={c}
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: "var(--accent-dim)", color: "var(--accent)" }}
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
