import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import MdfyLogo from "@/components/MdfyLogo";

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
  if (days <= 6) return `${days} days ago`;
  return new Date(iso).toISOString().slice(0, 10);
}

export default async function HubPage({ params }: Props) {
  const { slug } = await params;
  const hub = await getHub(slug);
  if (!hub) notFound();

  const author = hub.profile.display_name || slug;
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = hub.docs.filter(d => d.updated_at && new Date(d.updated_at).getTime() >= sevenDaysAgo);

  return (
    <div className="min-h-screen" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
      <header className="px-6 py-4 flex items-center gap-4" style={{ borderBottom: "1px solid var(--border-dim)" }}>
        <Link href="/" className="shrink-0"><MdfyLogo size={18} /></Link>
        <span className="text-caption" style={{ color: "var(--text-faint)" }}>/hub/{slug}</span>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="flex items-center gap-4 mb-2">
          {hub.profile.avatar_url && (
            <img
              src={hub.profile.avatar_url}
              alt=""
              className="w-12 h-12 rounded-full"
              style={{ border: "1px solid var(--border-dim)" }}
            />
          )}
          <div>
            <h1 className="text-display font-bold" style={{ color: "var(--text-primary)" }}>
              {author}&apos;s knowledge hub
            </h1>
            <p className="text-caption mt-0.5" style={{ color: "var(--text-faint)" }}>
              {hub.docs.length} {hub.docs.length === 1 ? "document" : "documents"}
              {hub.bundles.length > 0 && ` · ${hub.bundles.length} ${hub.bundles.length === 1 ? "bundle" : "bundles"}`}
            </p>
          </div>
        </div>
        {hub.profile.hub_description && (
          <p className="text-body leading-relaxed mt-4" style={{ color: "var(--text-secondary)" }}>
            {hub.profile.hub_description}
          </p>
        )}

        <div className="mt-6 px-3 py-2 rounded-md text-caption flex items-center gap-2" style={{ background: "var(--accent-dim)", border: "1px solid var(--accent)" }}>
          <span style={{ color: "var(--accent)" }}>✨</span>
          <span style={{ color: "var(--text-secondary)" }}>
            Paste this URL into Claude, ChatGPT, or Cursor to deploy this entire hub as AI context.
          </span>
        </div>

        {recent.length > 0 && (
          <section className="mt-12">
            <h2 className="text-heading mb-3" style={{ color: "var(--accent)" }}>Recent</h2>
            <ul className="space-y-1">
              {recent.slice(0, 10).map(d => (
                <li key={d.id}>
                  <Link
                    href={`/${d.id}`}
                    className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-[var(--toggle-bg)]"
                  >
                    <span className="flex-1 truncate text-body" style={{ color: "var(--text-primary)" }}>
                      {d.title || "Untitled"}
                    </span>
                    <span className="text-caption shrink-0" style={{ color: "var(--text-faint)" }}>
                      {fmtRelative(d.updated_at)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {hub.bundles.length > 0 && (
          <section className="mt-12">
            <h2 className="text-heading mb-3" style={{ color: "var(--accent)" }}>Bundles</h2>
            <ul className="space-y-1">
              {hub.bundles.map(b => (
                <li key={b.id}>
                  <Link
                    href={`/b/${b.id}`}
                    className="flex flex-col gap-0.5 px-3 py-2 rounded-md transition-colors hover:bg-[var(--toggle-bg)]"
                  >
                    <span className="text-body" style={{ color: "var(--text-primary)" }}>
                      {b.title || "Untitled Bundle"}
                    </span>
                    {b.description && (
                      <span className="text-caption truncate" style={{ color: "var(--text-muted)" }}>
                        {b.description}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {hub.docs.length > recent.length && (
          <section className="mt-12">
            <h2 className="text-heading mb-3" style={{ color: "var(--accent)" }}>All documents</h2>
            <ul className="space-y-1">
              {hub.docs.map(d => (
                <li key={d.id}>
                  <Link
                    href={`/${d.id}`}
                    className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-[var(--toggle-bg)]"
                  >
                    <span className="flex-1 truncate text-body" style={{ color: "var(--text-primary)" }}>
                      {d.title || "Untitled"}
                    </span>
                    <span className="text-caption shrink-0" style={{ color: "var(--text-faint)" }}>
                      {new Date(d.updated_at).toISOString().slice(0, 10)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="mt-16 pt-6 text-caption" style={{ color: "var(--text-faint)", borderTop: "1px solid var(--border-dim)" }}>
          <p>
            Hosted on <Link href="/" style={{ color: "var(--accent)" }}>mdfy.app</Link> — your personal knowledge hub for the AI era.
          </p>
        </footer>
      </main>
    </div>
  );
}
