import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { verifyAuthToken } from "@/lib/verify-auth";

/**
 * Cross-document concept index — the spine of "knowledge compounds".
 *
 *   GET /api/user/concepts
 *
 * Aggregates concept-type chunks (and definition / entity types) from every
 * decomposed doc the requester owns into a single map keyed by normalized
 * concept name. Each concept exposes its occurrences across docs so the UI
 * can render a "wiki page" view + auto cross-link callouts.
 *
 * Response shape:
 *   {
 *     concepts: [
 *       {
 *         id:    "ai_memory_ownership",
 *         label: "AI Memory Ownership",            // most common spelling
 *         types: ["concept","definition"],          // chunk types it appeared as
 *         occurrenceCount: 7,                       // total citations
 *         docCount: 4,                              // distinct source docs
 *         occurrences: [
 *           { docId, docTitle, chunkId, chunkType, snippet },
 *           ...
 *         ]
 *       },
 *       ...
 *     ],
 *     stats: {
 *       totalDocs: 64,
 *       decomposedDocs: 12,
 *       totalConcepts: 47,
 *       crossLinkedConcepts: 23   // concepts in 2+ docs
 *     }
 *   }
 *
 * Only includes the user's own docs (not shared/restricted) — concepts are
 * a personal knowledge graph, not a community wiki.
 */

interface ConceptOccurrence {
  docId: string;
  docTitle: string;
  chunkId: string;
  chunkType: string;
  snippet: string;
}
interface ConceptEntry {
  id: string;
  label: string;
  types: string[];
  occurrenceCount: number;
  docCount: number;
  occurrences: ConceptOccurrence[];
}

const CONCEPT_TYPES = new Set(["concept", "definition", "entity"]);

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/['"`]/g, "")
    .replace(/[^\w가-힣\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function GET(req: NextRequest) {
  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Storage not configured" }, { status: 503 });

  const verified = await verifyAuthToken(req.headers.get("authorization"));
  const userId = verified?.userId || req.headers.get("x-user-id");
  const anonymousId = req.headers.get("x-anonymous-id");
  if (!userId && !anonymousId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let query = supabase
    .from("documents")
    .select("id, title, semantic_chunks")
    .is("deleted_at", null);
  if (userId) query = query.eq("user_id", userId);
  else if (anonymousId) query = query.eq("anonymous_id", anonymousId);

  const { data: docs, error } = await query;
  if (error) return NextResponse.json({ error: "Failed to load docs" }, { status: 500 });

  const allDocs = docs || [];
  const decomposed = allDocs.filter(d => d.semantic_chunks);

  // Aggregate concept-like chunks
  const groups = new Map<string, {
    labelCounts: Map<string, number>;
    types: Set<string>;
    occurrences: ConceptOccurrence[];
    docs: Set<string>;
  }>();

  for (const doc of decomposed) {
    const sc = doc.semantic_chunks as { chunks?: Array<{ id?: string; type?: string; label?: string; content?: string }> } | null;
    const chunks = sc?.chunks || [];
    for (const c of chunks) {
      if (!c.label || !c.type) continue;
      if (!CONCEPT_TYPES.has(c.type)) continue;
      const key = normalize(c.label);
      if (!key || key.length < 2) continue;
      let g = groups.get(key);
      if (!g) {
        g = { labelCounts: new Map(), types: new Set(), occurrences: [], docs: new Set() };
        groups.set(key, g);
      }
      g.types.add(c.type);
      g.labelCounts.set(c.label, (g.labelCounts.get(c.label) || 0) + 1);
      g.docs.add(doc.id);
      g.occurrences.push({
        docId: doc.id,
        docTitle: doc.title || "Untitled",
        chunkId: c.id || `${doc.id}-${g.occurrences.length}`,
        chunkType: c.type,
        snippet: (c.content || "").slice(0, 280),
      });
    }
  }

  // Convert to array, pick best label form (most common spelling)
  const concepts: ConceptEntry[] = Array.from(groups.entries()).map(([key, g]) => {
    let bestLabel = "";
    let bestCount = 0;
    for (const [label, count] of g.labelCounts) {
      if (count > bestCount) { bestLabel = label; bestCount = count; }
    }
    return {
      id: key,
      label: bestLabel || key,
      types: Array.from(g.types).sort(),
      occurrenceCount: g.occurrences.length,
      docCount: g.docs.size,
      occurrences: g.occurrences,
    };
  });

  // Sort: cross-linked concepts (in 2+ docs) first, then by occurrence count
  concepts.sort((a, b) => {
    const aMulti = a.docCount >= 2 ? 1 : 0;
    const bMulti = b.docCount >= 2 ? 1 : 0;
    if (aMulti !== bMulti) return bMulti - aMulti;
    return b.occurrenceCount - a.occurrenceCount;
  });

  return NextResponse.json({
    concepts,
    stats: {
      totalDocs: allDocs.length,
      decomposedDocs: decomposed.length,
      totalConcepts: concepts.length,
      crossLinkedConcepts: concepts.filter(c => c.docCount >= 2).length,
    },
  });
}
