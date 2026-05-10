import { NextRequest, NextResponse, after } from "next/server";
import { nanoid } from "nanoid";
import { getSupabaseClient } from "@/lib/supabase";
import { verifyAuthToken } from "@/lib/verify-auth";
import { synthesizeBundle } from "@/lib/synthesize";
import { appendHubLog } from "@/lib/hub-log";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/user/hub/suggestions/[id]/accept
 *
 * Materialize the suggestion as a real bundle. Owner-only.
 * Mirrors /api/bundles POST: creates bundle row, links the doc_ids
 * via bundle_documents, schedules auto-synthesis via after().
 *
 * On success the suggestion is marked status='accepted' with the new
 * bundleId stored in accepted_bundle_id.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id: suggestionId } = await params;
  const verified = await verifyAuthToken(req.headers.get("authorization"));
  const userId = verified?.userId || req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Storage not configured" }, { status: 503 });

  const { data: suggestion } = await supabase
    .from("hub_suggestions")
    .select("id, user_id, title, doc_ids, status")
    .eq("id", suggestionId)
    .single();
  if (!suggestion || suggestion.user_id !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (suggestion.status !== "open") {
    return NextResponse.json({ error: "Suggestion is not open" }, { status: 409 });
  }
  const docIds = (suggestion.doc_ids as string[] | null) ?? [];
  if (docIds.length === 0) {
    return NextResponse.json({ error: "Suggestion has no documents" }, { status: 400 });
  }

  // Atomic claim: only one accept request can flip status `open → accepting`.
  // Without this, two concurrent clicks both pass the `status !== "open"`
  // check above, both create a bundle, and the second's bundle becomes a
  // duplicate. The conditional UPDATE guarantees at-most-once acceptance
  // across racing requests.
  const { data: claimed } = await supabase
    .from("hub_suggestions")
    .update({ status: "accepting", updated_at: new Date().toISOString() })
    .eq("id", suggestionId)
    .eq("user_id", userId)
    .eq("status", "open")
    .select("id")
    .single();
  if (!claimed) {
    return NextResponse.json({ error: "Suggestion is no longer open" }, { status: 409 });
  }

  // Create the bundle.
  const editToken = nanoid(32);
  let bundleId = "";
  let insertError: { code?: string } | null = null;
  for (let i = 0; i < 3; i++) {
    bundleId = nanoid(8);
    const { error } = await supabase.from("bundles").insert({
      id: bundleId,
      title: suggestion.title || "Suggested bundle",
      edit_token: editToken,
      user_id: userId,
      is_draft: false,
    });
    if (!error) { insertError = null; break; }
    if (error.code === "23505") { insertError = error; continue; }
    insertError = error; break;
  }
  if (insertError) {
    // Revert the claim so the user can retry — otherwise the suggestion
    // stays in "accepting" forever and looks accepted but has no bundle.
    await supabase
      .from("hub_suggestions")
      .update({ status: "open", updated_at: new Date().toISOString() })
      .eq("id", suggestionId)
      .eq("user_id", userId);
    return NextResponse.json({ error: "Failed to create bundle" }, { status: 500 });
  }

  const bundleDocs = docIds.map((docId, sortOrder) => ({
    bundle_id: bundleId,
    document_id: docId,
    sort_order: sortOrder,
  }));
  const { error: linkErr } = await supabase.from("bundle_documents").insert(bundleDocs);
  if (linkErr) {
    await supabase.from("bundles").delete().eq("id", bundleId);
    await supabase
      .from("hub_suggestions")
      .update({ status: "open", updated_at: new Date().toISOString() })
      .eq("id", suggestionId)
      .eq("user_id", userId);
    return NextResponse.json({ error: "Failed to link documents" }, { status: 500 });
  }

  // Mark suggestion accepted.
  await supabase
    .from("hub_suggestions")
    .update({
      status: "accepted",
      accepted_bundle_id: bundleId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", suggestionId)
    .eq("user_id", userId);

  // Log + auto-synthesis (mirrors /api/bundles POST).
  void appendHubLog({
    userId,
    event: "bundle.created",
    targetType: "bundle",
    targetId: bundleId,
    summary: suggestion.title || "Suggested bundle",
    metadata: { documentCount: docIds.length, fromSuggestion: suggestionId },
  });
  after(async () => {
    try {
      const result = await synthesizeBundle(supabase, bundleId, "wiki");
      if (!result) return;
      const synthId = nanoid(8);
      const synthEditToken = nanoid(32);
      const now = new Date().toISOString();
      // Title invariant — title is always the markdown's H1.
      const { enforceTitleInvariant } = await import("@/lib/extract-title");
      const enforced = enforceTitleInvariant(result.markdown, "Synthesis");
      await supabase.from("documents").insert({
        id: synthId,
        markdown: enforced.markdown,
        title: enforced.title,
        edit_token: synthEditToken,
        user_id: userId,
        edit_mode: "account",
        is_draft: false,
        source: "auto-synthesis",
        compile_kind: "wiki",
        compile_from: { bundleId, docIds: result.sourceDocIds, intent: result.intent },
        compiled_at: now,
      });
    } catch (err) {
      console.warn("Suggestion auto-synthesis failed:", err);
    }
  });

  return NextResponse.json({ bundleId, editToken });
}
