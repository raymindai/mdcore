// Per-concept token-economical brief.
//
// Lets an LLM ask "what does <author> say about <concept>" by fetching
// a single URL — much denser than reading every doc that mentions the
// concept. The response is a concept summary + the doc list with
// per-doc one-liners pulled from the concept's evidence chain.
//
// URL: /raw/hub/<slug>/c/<concept-slug>
// concept-slug is the normalized_label with spaces → "-".

import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { compactMarkdown, isCompactRequested, tokenEconomyHeaders } from "@/lib/markdown-compact";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; concept: string }> }
) {
  const { slug, concept } = await params;
  if (!/^[a-z0-9_-]{3,32}$/.test(slug)) {
    return new NextResponse("Invalid slug", { status: 400 });
  }
  if (!concept || concept.length > 96) {
    return new NextResponse("Invalid concept", { status: 400 });
  }

  const supabase = getSupabaseClient();
  if (!supabase) return new NextResponse("Service unavailable", { status: 503 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, hub_slug, hub_public, hub_description")
    .eq("hub_slug", slug)
    .single();
  if (!profile || !profile.hub_public) {
    return new NextResponse("Hub not found", { status: 404 });
  }

  // Concept slug → normalized_label (replace dashes with spaces). The
  // ILIKE catches near-matches that hyphenate differently.
  const normalized = concept.toLowerCase().replace(/-+/g, " ").trim();
  const { data: rows } = await supabase
    .from("concept_index")
    .select("id, label, concept_type, description, weight, occurrence_count, doc_ids")
    .eq("user_id", profile.id)
    .eq("normalized_label", normalized)
    .limit(1);

  const conceptRow = (rows && rows[0]) || null;
  if (!conceptRow) {
    return new NextResponse(
      `Concept "${concept}" not found in this hub. See https://mdfy.app/raw/hub/${slug}?digest=1 for the available concepts.\n`,
      { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

  // Pull the public docs that reference this concept.
  const docIds = (conceptRow.doc_ids || []) as string[];
  let docs: Array<{ id: string; title: string | null; markdown: string | null; updated_at: string | null }> = [];
  if (docIds.length > 0) {
    const { data: docRows } = await supabase
      .from("documents")
      .select("id, title, markdown, updated_at, is_draft, deleted_at, password_hash, allowed_emails")
      .in("id", docIds);
    docs = (docRows || [])
      .filter((d) => !d.is_draft && !d.deleted_at && !d.password_hash &&
        !(Array.isArray(d.allowed_emails) && d.allowed_emails.length > 0))
      .map((d) => ({ id: d.id, title: d.title, markdown: d.markdown, updated_at: d.updated_at }));
  }

  // Pull related concepts (1 hop) so the LLM can follow the network
  // without a separate query.
  type RelRow = { source_concept_id: number; target_concept_id: number; relation_label: string; weight: number };
  const { data: relRows } = await supabase
    .from("concept_relations")
    .select("source_concept_id, target_concept_id, relation_label, weight")
    .eq("user_id", profile.id)
    .or(`source_concept_id.eq.${conceptRow.id},target_concept_id.eq.${conceptRow.id}`)
    .limit(40);
  const neighborIds = new Set<number>();
  for (const r of (relRows || []) as RelRow[]) {
    const otherId = r.source_concept_id === conceptRow.id ? r.target_concept_id : r.source_concept_id;
    neighborIds.add(otherId);
  }
  let neighbors: Array<{ id: number; label: string }> = [];
  if (neighborIds.size > 0) {
    const { data: nRows } = await supabase
      .from("concept_index")
      .select("id, label, normalized_label")
      .in("id", Array.from(neighborIds))
      .limit(20);
    neighbors = (nRows || []).map((n) => ({ id: n.id, label: n.label }));
  }

  const compact = isCompactRequested(request.url);
  const author = (profile.display_name || slug).replace(/"/g, '\\"');

  const frontmatter = [
    "---",
    "mdfy_bundle: 1",
    "type: hub_concept",
    `slug: ${slug}`,
    `concept: "${conceptRow.label.replace(/"/g, '\\"')}"`,
    `concept_type: ${conceptRow.concept_type || "concept"}`,
    `author: "${author}"`,
    `url: https://mdfy.app/hub/${slug}/c/${concept}`,
    `document_count: ${docs.length}`,
    `weight: ${Math.round(conceptRow.weight || 0)}`,
    'source: "mdfy.app"',
    "---",
    "",
  ].join("\n");

  const sections: string[] = [];
  sections.push(`# ${conceptRow.label}`);
  sections.push(`*from ${author}'s knowledge hub — ${docs.length} document${docs.length === 1 ? "" : "s"}*`);
  if (conceptRow.description) sections.push(`> ${conceptRow.description}`);

  if (docs.length === 0) {
    sections.push("_No publicly accessible documents reference this concept._");
  } else {
    sections.push("## Source documents");
    for (const d of docs) {
      const snippet = oneLineSnippet(d.markdown || "", conceptRow.label);
      sections.push(`### [${d.title || "Untitled"}](https://mdfy.app/${d.id})`);
      if (snippet) sections.push(`> ${snippet}`);
      sections.push(`*Fetch full markdown: \`https://mdfy.app/raw/${d.id}?compact=1\`*`);
    }
  }

  if (neighbors.length > 0) {
    sections.push("## Related concepts");
    sections.push(neighbors
      .map((n) => `- [${n.label}](https://mdfy.app/raw/hub/${slug}/c/${labelToSlug(n.label)})`)
      .join("\n"));
  }

  sections.push(
    `---\n\n_Need the broader context? [Hub digest](https://mdfy.app/raw/hub/${slug}?digest=1&compact=1) — every concept in this hub at one glance._`,
  );

  const body = (compact ? compactMarkdown : (s: string) => s)(`${frontmatter}\n${sections.join("\n\n")}\n`);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=120, s-maxage=120, stale-while-revalidate=600",
      "Link": `<https://mdfy.app/hub/${slug}/c/${concept}>; rel="canonical"`,
      "X-Hub-Slug": slug,
      "X-Concept": conceptRow.label,
      ...tokenEconomyHeaders(body, { compact }),
    },
  });
}

function labelToSlug(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// Pull the first sentence that mentions the concept label, capped at
// 220 chars. Falls back to the doc's opening line. The intent is "give
// the AI the line that justifies this doc being on the concept page,"
// not a full summary.
function oneLineSnippet(markdown: string, conceptLabel: string): string {
  if (!markdown) return "";
  const stripped = markdown
    .replace(/^---[\s\S]*?---\n?/, "") // drop frontmatter if any
    .replace(/^#+\s+.+$/gm, "")        // drop heading lines
    .replace(/^\s*[-*+]\s+/gm, "")     // simplify bullets
    .replace(/\s+/g, " ")
    .trim();
  if (!stripped) return "";
  const needle = conceptLabel.toLowerCase();
  const sentences = stripped.split(/(?<=[.!?])\s+/);
  const hit = sentences.find((s) => s.toLowerCase().includes(needle));
  const chosen = hit || sentences[0] || stripped;
  return chosen.slice(0, 220) + (chosen.length > 220 ? "…" : "");
}
