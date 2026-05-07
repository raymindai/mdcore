import { getSupabaseClient } from "@/lib/supabase";

/**
 * Default per-hub schema seeded for users who haven't customized it yet.
 *
 * Inspired by Andrej Karpathy's `llm-wiki.md` pattern (Apr 2026), the
 * schema sits between the user (who curates sources and asks questions)
 * and the LLM (which maintains the wiki). Customizing it is optional —
 * sane defaults exist so synthesis works on day one.
 *
 * The schema is itself plain markdown so the user can hand-edit it in
 * their hub settings and so the LLM can read it directly without us
 * serializing some other format.
 */
export const DEFAULT_HUB_SCHEMA_MD = `# Hub schema

You are an AI assistant maintaining the owner's personal knowledge hub.
The owner curates the raw documents (captured AI conversations, notes,
imports). You maintain everything else.

## What this hub tracks

The owner has not set explicit topics. Treat each new document on its
merits: surface its subject in 1-2 sentences and tag it with the broad
domains it touches (work, research, personal, code, writing, etc.).

## Tone for summaries and synthesis

Plain, neutral, factual. Match the owner's voice when they've written
substantial prose. Avoid em-dashes, marketing language, and superlatives.

## Cross-references

When you ingest a new document, look for:
- Other documents that cover the same concept
- Documents that contradict or update something already in the hub
- Documents that the new one cites or builds on

Surface these as cross-references on the new document AND on the
related ones.

## Lint signals to surface

- Orphan documents (referenced by nothing, referencing nothing)
- Contradictions between two documents on the same claim
- Documents whose claims are now stale (newer document supersedes them)
- Topics with > 5 documents but no synthesis page yet

## Synthesis rules

When the owner creates a bundle on a topic, generate a synthesis page
alongside it that:
- Opens with a 3-sentence executive summary
- Lists the key claims across the bundled documents
- Flags any tensions or open questions
- Cites the source documents inline

Keep synthesis pages under 800 words unless the bundle is unusually
large.
`;

export interface HubSchema {
  markdown: string;
  updatedAt: string | null;
  isDefault: boolean;
}

export async function readHubSchema(userId: string): Promise<HubSchema> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { markdown: DEFAULT_HUB_SCHEMA_MD, updatedAt: null, isDefault: true };
  }
  const { data } = await supabase
    .from("profiles")
    .select("hub_schema_md, hub_schema_updated_at")
    .eq("id", userId)
    .single();
  const customized = (data?.hub_schema_md || "").trim();
  if (customized) {
    return {
      markdown: customized,
      updatedAt: data?.hub_schema_updated_at ?? null,
      isDefault: false,
    };
  }
  return { markdown: DEFAULT_HUB_SCHEMA_MD, updatedAt: null, isDefault: true };
}

const MAX_SCHEMA_BYTES = 32 * 1024; // 32KB cap — synthesis prompts get expensive otherwise

export async function writeHubSchema(
  userId: string,
  markdown: string
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  if (typeof markdown !== "string") {
    return { ok: false, error: "markdown must be a string", status: 400 };
  }
  const trimmed = markdown.trim();
  if (Buffer.byteLength(trimmed, "utf8") > MAX_SCHEMA_BYTES) {
    return { ok: false, error: "Schema too large (32KB max)", status: 413 };
  }
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { ok: false, error: "Storage not configured", status: 503 };
  }
  // Empty string resets to default. Store as null so reads pick up the
  // current default rather than freezing yesterday's seed.
  const value = trimmed.length === 0 ? null : trimmed;
  const { error } = await supabase
    .from("profiles")
    .update({
      hub_schema_md: value,
      hub_schema_updated_at: value ? new Date().toISOString() : null,
    })
    .eq("id", userId);
  if (error) {
    console.error("Hub schema write error:", error);
    return { ok: false, error: "Failed to save", status: 500 };
  }
  return { ok: true };
}
