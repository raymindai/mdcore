import type { Metadata } from "next";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase";
import MdfyLogo from "@/components/MdfyLogo";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Public hubs — mdfy.app",
  description: "Personal knowledge hubs published with mdfy. Each one is a single URL deployable to any AI.",
  alternates: { canonical: "https://mdfy.app/hubs" },
  openGraph: {
    title: "Public hubs — mdfy.app",
    description: "Personal knowledge hubs published with mdfy. One URL, deployable anywhere.",
    url: "https://mdfy.app/hubs",
    siteName: "mdfy.app",
    type: "website",
  },
};

interface HubRow {
  id: string;
  hub_slug: string;
  display_name: string | null;
  avatar_url: string | null;
  hub_description: string | null;
  doc_count: number;
  bundle_count: number;
}

async function getHubs(): Promise<HubRow[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, hub_slug, display_name, avatar_url, hub_description")
    .eq("hub_public", true)
    .not("hub_slug", "is", null)
    .limit(100);
  if (!profiles || profiles.length === 0) return [];

  const userIds = profiles.map(p => p.id);

  // Per-user public doc counts. Single query per user would explode; use
  // a single rpc-like query and aggregate in memory.
  const { data: docs } = await supabase
    .from("documents")
    .select("user_id")
    .in("user_id", userIds)
    .eq("is_draft", false)
    .is("deleted_at", null)
    .is("password_hash", null);
  const docCount = new Map<string, number>();
  for (const d of docs || []) {
    docCount.set(d.user_id, (docCount.get(d.user_id) || 0) + 1);
  }

  const { data: bundles } = await supabase
    .from("bundles")
    .select("user_id, password_hash, allowed_emails")
    .in("user_id", userIds)
    .eq("is_draft", false);
  const bundleCount = new Map<string, number>();
  for (const b of bundles || []) {
    if (b.password_hash) continue;
    if (Array.isArray(b.allowed_emails) && b.allowed_emails.length > 0) continue;
    bundleCount.set(b.user_id, (bundleCount.get(b.user_id) || 0) + 1);
  }

  return profiles
    .filter(p => p.hub_slug)
    .map(p => ({
      id: p.id,
      hub_slug: p.hub_slug as string,
      display_name: p.display_name,
      avatar_url: p.avatar_url,
      hub_description: p.hub_description,
      doc_count: docCount.get(p.id) || 0,
      bundle_count: bundleCount.get(p.id) || 0,
    }))
    // Sort by activity — most docs first, then alphabetically by slug
    .sort((a, b) => (b.doc_count + b.bundle_count) - (a.doc_count + a.bundle_count) || a.hub_slug.localeCompare(b.hub_slug));
}

export default async function HubsPage() {
  const hubs = await getHubs();

  return (
    <div className="min-h-screen" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
      <header className="px-6 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border-dim)" }}>
        <Link href="/" className="shrink-0"><MdfyLogo size={18} /></Link>
        <nav className="flex items-center gap-3 text-caption" style={{ color: "var(--text-muted)" }}>
          <Link href="/about" className="transition-colors hover:text-[var(--text-primary)]">About</Link>
          <Link href="/manifesto" className="transition-colors hover:text-[var(--text-primary)]">Manifesto</Link>
        </nav>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 sm:py-16">
        <div className="mb-10">
          <h1 className="text-display font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            Public hubs
          </h1>
          <p className="text-body mt-3 leading-relaxed max-w-2xl" style={{ color: "var(--text-secondary)" }}>
            Personal knowledge hubs published with mdfy. Each one is a single URL — paste it into Claude, ChatGPT, or Cursor, and the AI deploys the entire hub as context.
          </p>
        </div>

        {hubs.length === 0 ? (
          <div className="py-16 text-center" style={{ color: "var(--text-faint)" }}>
            <p className="text-body mb-2">No public hubs yet.</p>
            <p className="text-caption">
              <Link href="/settings" className="underline" style={{ color: "var(--accent)" }}>
                Be the first → enable yours from Settings
              </Link>
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {hubs.map(h => (
              <Link
                key={h.id}
                href={`/hub/${h.hub_slug}`}
                className="flex gap-3 p-4 rounded-lg transition-colors hover:bg-[var(--toggle-bg)]"
                style={{ background: "var(--surface)", border: "1px solid var(--border-dim)" }}
              >
                {h.avatar_url ? (
                  <img
                    src={h.avatar_url}
                    alt=""
                    className="w-12 h-12 rounded-full shrink-0"
                    style={{ border: "1px solid var(--border-dim)" }}
                  />
                ) : (
                  <div
                    className="w-12 h-12 rounded-full shrink-0 flex items-center justify-center font-semibold"
                    style={{ background: "var(--accent-dim)", color: "var(--accent)", border: "1px solid var(--border-dim)" }}
                  >
                    {(h.display_name || h.hub_slug)[0]?.toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-body font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                    {h.display_name || h.hub_slug}
                  </div>
                  <div className="text-caption font-mono mb-1.5" style={{ color: "var(--text-faint)" }}>
                    /hub/{h.hub_slug}
                  </div>
                  {h.hub_description && (
                    <p className="text-caption leading-relaxed line-clamp-2" style={{ color: "var(--text-muted)" }}>
                      {h.hub_description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-caption tabular-nums" style={{ color: "var(--text-faint)" }}>
                    <span>{h.doc_count} {h.doc_count === 1 ? "doc" : "docs"}</span>
                    {h.bundle_count > 0 && <span>·</span>}
                    {h.bundle_count > 0 && <span>{h.bundle_count} {h.bundle_count === 1 ? "bundle" : "bundles"}</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <footer className="mt-16 pt-6 text-caption flex items-center justify-between" style={{ color: "var(--text-faint)", borderTop: "1px solid var(--border-dim)" }}>
          <span>
            Want yours listed? <Link href="/settings" style={{ color: "var(--accent)" }}>Enable from Settings →</Link>
          </span>
          <span>mdfy.app</span>
        </footer>
      </main>
    </div>
  );
}
