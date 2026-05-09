// Hub-scoped chat — ontology-grounded RAG.
//
// Differs from /api/bundles/[id]/chat in two ways:
//   1. Scope spans the user's ENTIRE hub, not one bundle.
//   2. Retrieval is concept-bridged. Vector recall over chunks finds
//      paragraphs that look textually similar; a concept-aware step
//      additionally pulls in concepts that the query mentions, then
//      walks 1 hop of concept_relations to surface NEIGHBOR concepts +
//      their evidence chunks. So a query about "memory" returns docs
//      that mention "memory" AND docs that mention concepts the
//      ontology says are related to memory.
//
// Streams the LLM response with [doc:<id>] citations the client UI can
// resolve to clickable chunks.

import { NextRequest } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { embedText, vectorToSql } from "@/lib/embeddings";

type RouteParams = { params: Promise<{ slug: string }> };

const SYSTEM_PROMPT = `You are an AI assistant that answers questions grounded in the user's personal knowledge hub — a collection of their docs, organized into bundles.

Rules:
1. Ground every claim in the provided ontology + chunks. Don't invent facts.
2. Cite using the format [doc:<id>] where <id> is the document ID shown in the context.
3. Use markdown (lists, bold, code blocks) where appropriate.
4. Be concise but thorough — lead with the answer, then evidence.
5. If the hub doesn't have enough info, say so honestly.
6. When the user asks about a concept, prefer naming the concept's neighbors from the ontology when relevant.`;

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { slug } = await params;

  const supabase = getSupabaseClient();
  if (!supabase) return new Response(JSON.stringify({ error: "Storage not configured" }), { status: 503 });

  let body: { message?: string; history?: Array<{ role: "user" | "assistant"; content: string }> };
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 }); }
  const { message, history = [] } = body;
  if (!message || typeof message !== "string") {
    return new Response(JSON.stringify({ error: "message required" }), { status: 400 });
  }

  // Resolve hub slug → user_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("hub_slug", slug)
    .single();
  if (!profile) return new Response(JSON.stringify({ error: "Hub not found" }), { status: 404 });

  // ─── Retrieval ──────────────────────────────────────────────────
  // 1. Embed the query for vector recall over chunks + concepts.
  let queryVec: number[];
  try {
    queryVec = await embedText(message.slice(0, 4000));
  } catch {
    return new Response(JSON.stringify({ error: "Embedding failed" }), { status: 503 });
  }
  const queryVecSql = vectorToSql(queryVec);

  // 2. Vector recall over public chunks belonging to this hub.
  //    Returns chunks ranked by cosine distance.
  const { data: hitChunks } = await supabase.rpc("match_public_hub_chunks", {
    query_embedding: queryVecSql,
    p_hub_user_id: profile.id,
    match_count: 10,
  });

  // 3. Concept lookup: vector recall against concept_index for THIS user.
  const { data: hitConcepts } = await supabase
    .from("concept_index")
    .select("id, label, description, doc_ids, weight, occurrence_count")
    .eq("user_id", profile.id)
    .order("weight", { ascending: false })
    .limit(40);
  // Cheap textual match against query — augments the vector hits below.
  const queryLower = message.toLowerCase();
  const conceptHits = (hitConcepts || [])
    .filter((c) => queryLower.includes(c.label.toLowerCase()))
    .slice(0, 6);

  // 4. Walk 1-hop neighbors for the matched concepts.
  let neighborConcepts: Array<{ label: string; description?: string | null }> = [];
  if (conceptHits.length > 0) {
    const conceptIds = conceptHits.map((c) => c.id);
    const { data: rels } = await supabase
      .from("concept_relations")
      .select("source_concept_id, target_concept_id, relation_label, evidence_doc_ids")
      .eq("user_id", profile.id)
      .or(`source_concept_id.in.(${conceptIds.join(",")}),target_concept_id.in.(${conceptIds.join(",")})`)
      .limit(40);
    const neighborIds = new Set<number>();
    for (const r of rels || []) {
      if (conceptIds.includes(r.source_concept_id)) neighborIds.add(r.target_concept_id);
      if (conceptIds.includes(r.target_concept_id)) neighborIds.add(r.source_concept_id);
    }
    if (neighborIds.size > 0) {
      const { data: nbrs } = await supabase
        .from("concept_index")
        .select("label, description")
        .in("id", [...neighborIds])
        .limit(15);
      neighborConcepts = nbrs || [];
    }
  }

  // 5. Assemble context.
  type ChunkHit = {
    chunk_id: number; doc_id: string; heading?: string | null;
    heading_path?: string | null; markdown: string; doc_title?: string | null;
  };
  const chunks: ChunkHit[] = (hitChunks || []) as ChunkHit[];
  const ontologyBlock = conceptHits.length > 0
    ? `Relevant concepts in the hub:\n` +
      conceptHits.map((c) => `- ${c.label}${c.description ? ` — ${c.description}` : ""} (mentions: ${c.occurrence_count})`).join("\n") +
      (neighborConcepts.length > 0
        ? `\n\nRelated concepts (1 hop):\n` + neighborConcepts.map((n) => `- ${n.label}${n.description ? ` — ${n.description}` : ""}`).join("\n")
        : "")
    : "";
  const chunksBlock = chunks.length > 0
    ? `Relevant chunks:\n` + chunks.map((c, i) => {
        const head = c.heading_path || c.heading || "(no heading)";
        return `[doc:${c.doc_id}] (${head})\n${c.markdown.slice(0, 1200)}`;
      }).join("\n\n")
    : "";

  const apiKey = process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) return new Response(JSON.stringify({ error: "AI not configured" }), { status: 503 });

  const fullPrompt = `${SYSTEM_PROMPT}\n\nHub: ${profile.display_name || slug}\n\n${ontologyBlock || "(No matching concepts indexed yet.)"}\n\n${chunksBlock || "(No matching chunks.)"}\n\n${
    history.map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n\n")
  }\n\nUser: ${message}\n\nAssistant:`;

  // ─── Streaming response (Anthropic preferred for grounding quality) ─
  if (process.env.ANTHROPIC_API_KEY) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": process.env.ANTHROPIC_API_KEY!,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model: "claude-sonnet-4-20250514",
              max_tokens: 2048,
              stream: true,
              messages: [{ role: "user", content: fullPrompt }],
            }),
          });
          if (!res.ok || !res.body) {
            controller.enqueue(encoder.encode(`Error: AI request failed (${res.status})`));
            controller.close();
            return;
          }
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const data = line.slice(6);
              try {
                const evt = JSON.parse(data);
                if (evt.type === "content_block_delta" && evt.delta?.text) {
                  controller.enqueue(encoder.encode(evt.delta.text));
                }
              } catch { /* ignore parse error */ }
            }
          }
          controller.close();
        } catch (err) {
          controller.enqueue(encoder.encode(`Error: ${err instanceof Error ? err.message : "stream failed"}`));
          controller.close();
        }
      },
    });
    return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }

  // Fallback: return a single non-streamed response (Gemini / OpenAI)
  return new Response(JSON.stringify({ error: "Streaming requires ANTHROPIC_API_KEY" }), { status: 503 });
}
