import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import MdfyLogo from "@/components/MdfyLogo";
import HubCopyUrlButton from "./HubCopyUrlButton";

type Props = { params: Promise<{ slug: string }> };

interface HubData {
  profile: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    hub_slug: string;
    hub_description: string | null;
  };
  docs: Array<{ id: string; title: string | null; markdown: string; updated_at: string }>;
  bundles: Array<{ id: string; title: string | null; description: string | null; updated_at: string }>;
}

async function getHub(slug: string): Promise<HubData | null> {
  if (!/^[a-z0-9_-]{3,32}$/.test(slug)) return null;
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, hub_slug, hub_public, hub_description")
    .eq("hub_slug", slug)
    .single();
  if (!profile || !profile.hub_public) return null;

  const { data: docs } = await supabase
    .from("documents")
    .select("id, title, markdown, updated_at")
    .eq("user_id", profile.id)
    .eq("is_draft", false)
    .is("deleted_at", null)
    .is("password_hash", null)
    .order("updated_at", { ascending: false })
    .limit(200);

  const { data: bundles } = await supabase
    .from("bundles")
    .select("id, title, description, updated_at, password_hash, allowed_emails")
    .eq("user_id", profile.id)
    .eq("is_draft", false)
    .order("updated_at", { ascending: false })
    .limit(50);

  const publicBundles = (bundles || [])
    .filter(b => !b.password_hash && !(Array.isArray(b.allowed_emails) && b.allowed_emails.length > 0))
    .map(b => ({ id: b.id, title: b.title, description: b.description, updated_at: b.updated_at }));

  return {
    profile: {
      id: profile.id,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      hub_slug: profile.hub_slug,
      hub_description: profile.hub_description,
    },
    docs: docs || [],
    bundles: publicBundles,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const hub = await getHub(slug);
  if (!hub) return { robots: { index: false, follow: false } };

  const author = hub.profile.display_name || slug;
  const title = `${author}'s knowledge hub — mdfy.app`;
  const description = hub.profile.hub_description ||
    `${hub.docs.length} documents, ${hub.bundles.length} bundles. Personal knowledge hub for the AI era.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://mdfy.app/hub/${slug}`,
      siteName: "mdfy.app",
      type: "profile",
    },
    twitter: { card: "summary_large_image", title, description },
    alternates: {
      canonical: `https://mdfy.app/hub/${slug}`,
      types: { "text/markdown": `https://mdfy.app/hub/${slug}.md` },
    },
  };
}

function fmtRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days <= 6) return `${days}d ago`;
  if (days <= 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(iso).toISOString().slice(0, 10);
}

export default async function HubPage({ params }: Props) {
  const { slug } = await params;
  const hub = await getHub(slug);
  if (!hub) notFound();

  const author = hub.profile.display_name || slug;
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = hub.docs.filter(d => d.updated_at && new Date(d.updated_at).getTime() >= sevenDaysAgo);
  const olderDocs = hub.docs.filter(d => !recent.find(r => r.id === d.id));
  const hubUrl = `https://mdfy.app/hub/${slug}`;

  return (
    <div className="min-h-screen" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
      {/* Top bar */}
      <header className="sticky top-0 z-10 px-6 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border-dim)", background: "color-mix(in srgb, var(--background) 85%, transparent)", backdropFilter: "blur(8px)" }}>
        <Link href="/" className="flex items-center gap-2 shrink-0 transition-opacity hover:opacity-80">
          <MdfyLogo size={18} />
        </Link>
        <span className="text-caption font-mono" style={{ color: "var(--text-faint)" }}>
          mdfy.app/hub/<span style={{ color: "var(--accent)" }}>{slug}</span>
        </span>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 sm:py-16">
        {/* Hero — avatar + name + description */}
        <section className="flex flex-col sm:flex-row gap-6 sm:items-center mb-10">
          {hub.profile.avatar_url && (
            <img
              src={hub.profile.avatar_url}
              alt=""
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full shrink-0"
              style={{ border: "2px solid var(--border-dim)" }}
            />
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
              {author}&apos;s hub
            </h1>
            {hub.profile.hub_description && (
              <p className="mt-3 text-body leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {hub.profile.hub_description}
              </p>
            )}
          </div>
        </section>

        {/* Stat strip */}
        <section className="flex items-center gap-6 mb-8 pb-8" style={{ borderBottom: "1px solid var(--border-dim)" }}>
          <div className="flex flex-col">
            <span className="text-display font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>{hub.docs.length}</span>
            <span className="text-caption uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>{hub.docs.length === 1 ? "Document" : "Documents"}</span>
          </div>
          <div className="w-px h-10" style={{ background: "var(--border-dim)" }} />
          <div className="flex flex-col">
            <span className="text-display font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>{hub.bundles.length}</span>
            <span className="text-caption uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>{hub.bundles.length === 1 ? "Bundle" : "Bundles"}</span>
          </div>
          <div className="w-px h-10" style={{ background: "var(--border-dim)" }} />
          <div className="flex flex-col">
            <span className="text-display font-bold tabular-nums" style={{ color: "var(--accent)" }}>{recent.length}</span>
            <span className="text-caption uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>This week</span>
          </div>
        </section>

        {/* Deploy-to-AI panel */}
        <section className="mb-12 px-5 py-4 rounded-xl" style={{ background: "var(--accent-dim)", border: "1px solid var(--accent)" }}>
          <div className="flex items-start gap-3">
            <span className="text-xl shrink-0" style={{ color: "var(--accent)" }}>✨</span>
            <div className="min-w-0 flex-1">
              <p className="text-body font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                Deploy this hub to any AI
              </p>
              <p className="text-caption leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                Paste the URL into <strong>Claude</strong>, <strong>ChatGPT</strong>, or <strong>Cursor</strong>. The AI fetches a structured index and follows the inline links to read individual docs and bundles as needed.
              </p>
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <code className="text-caption px-2 py-1 rounded font-mono" style={{ background: "var(--background)", color: "var(--text-primary)", border: "1px solid var(--border-dim)" }}>
                  {hubUrl}
                </code>
                <HubCopyUrlButton url={hubUrl} />
                <Link
                  href={`/hub/${slug}.md`}
                  target="_blank"
                  className="text-caption px-2 py-1 rounded transition-colors hover:bg-[var(--toggle-bg)]"
                  style={{ color: "var(--text-muted)", border: "1px solid var(--border-dim)" }}
                >
                  View raw .md
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Recent */}
        {recent.length > 0 && (
          <section className="mb-12">
            <header className="flex items-baseline justify-between mb-4">
              <h2 className="text-heading" style={{ color: "var(--accent)" }}>Recent</h2>
              <span className="text-caption" style={{ color: "var(--text-faint)" }}>last 7 days</span>
            </header>
            <ul className="space-y-1">
              {recent.slice(0, 10).map(d => (
                <li key={d.id}>
                  <Link
                    href={`/d/${d.id}`}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors group hover:bg-[var(--toggle-bg)]"
                  >
                    <span className="text-caption font-mono w-2 h-2 rounded-full shrink-0" style={{ background: "var(--accent)" }} />
                    <span className="flex-1 truncate text-body" style={{ color: "var(--text-primary)" }}>
                      {d.title || "Untitled"}
                    </span>
                    <span className="text-caption shrink-0 transition-colors" style={{ color: "var(--text-faint)" }}>
                      {fmtRelative(d.updated_at)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Bundles */}
        {hub.bundles.length > 0 && (
          <section className="mb-12">
            <header className="mb-4">
              <h2 className="text-heading" style={{ color: "var(--accent)" }}>Bundles</h2>
            </header>
            <div className="grid sm:grid-cols-2 gap-3">
              {hub.bundles.map(b => (
                <Link
                  key={b.id}
                  href={`/b/${b.id}`}
                  className="flex flex-col gap-1.5 p-4 rounded-lg transition-colors hover:bg-[var(--toggle-bg)]"
                  style={{ background: "var(--surface)", border: "1px solid var(--border-dim)" }}
                >
                  <span className="text-body font-semibold leading-snug" style={{ color: "var(--text-primary)" }}>
                    {b.title || "Untitled Bundle"}
                  </span>
                  {b.description ? (
                    <span className="text-caption leading-relaxed line-clamp-2" style={{ color: "var(--text-muted)" }}>
                      {b.description}
                    </span>
                  ) : (
                    <span className="text-caption" style={{ color: "var(--text-faint)" }}>
                      No description
                    </span>
                  )}
                  <span className="text-caption mt-1" style={{ color: "var(--text-faint)" }}>
                    Updated {fmtRelative(b.updated_at)}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* All documents */}
        {olderDocs.length > 0 && (
          <section className="mb-12">
            <header className="flex items-baseline justify-between mb-4">
              <h2 className="text-heading" style={{ color: "var(--accent)" }}>
                {recent.length > 0 ? "Older documents" : "Documents"}
              </h2>
              <span className="text-caption" style={{ color: "var(--text-faint)" }}>
                {olderDocs.length} {olderDocs.length === 1 ? "doc" : "docs"}
              </span>
            </header>
            <ul className="space-y-0.5">
              {olderDocs.map(d => (
                <li key={d.id}>
                  <Link
                    href={`/d/${d.id}`}
                    className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-[var(--toggle-bg)]"
                  >
                    <span className="flex-1 truncate text-body" style={{ color: "var(--text-secondary)" }}>
                      {d.title || "Untitled"}
                    </span>
                    <span className="text-caption shrink-0 tabular-nums" style={{ color: "var(--text-faint)" }}>
                      {new Date(d.updated_at).toISOString().slice(0, 10)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {hub.docs.length === 0 && hub.bundles.length === 0 && (
          <div className="py-16 text-center" style={{ color: "var(--text-faint)" }}>
            <p>This hub doesn&apos;t have any public documents yet.</p>
          </div>
        )}

        <footer className="mt-20 pt-6 text-caption flex items-center justify-between" style={{ color: "var(--text-faint)", borderTop: "1px solid var(--border-dim)" }}>
          <span>
            Hosted on <Link href="/" style={{ color: "var(--accent)" }}>mdfy.app</Link>
          </span>
          <span>Personal knowledge hub for the AI era.</span>
        </footer>
      </main>
    </div>
  );
}
