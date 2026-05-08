import type { Metadata } from "next";
import { getSupabaseClient } from "@/lib/supabase";
import { notFound } from "next/navigation";
import HubGraphCanvas from "./HubGraphCanvas";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `${slug} hub graph | mdfy`,
    description: "Force-directed view of every doc and bundle in this mdfy hub.",
  };
}

/**
 * /hub/<slug>/graph
 *
 * Hub-level graph visualization. Bundle-level graphs already live on
 * /b/<id>; this is the user's whole hub at once.
 *
 * Public access mirrors the hub page itself: hub_public must be true.
 * The actual data fetch happens client-side via /api/user/hub/graph
 * (owner-only) so non-owners see the page shell but the canvas
 * shows an "ownership required" notice. Public-facing graph data is a
 * follow-up surface (`/raw/hub/<slug>/graph.json`).
 */
export default async function HubGraphPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = getSupabaseClient();
  if (!supabase) return notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, hub_slug, hub_public")
    .eq("hub_slug", slug)
    .single();
  if (!profile || !profile.hub_public) return notFound();

  return (
    <HubGraphCanvas apiPath="/api/user/hub/graph" hubUrl={`/hub/${slug}`} />
  );
}
