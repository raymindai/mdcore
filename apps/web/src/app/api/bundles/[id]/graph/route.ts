import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { verifyAuthToken } from "@/lib/verify-auth";

type RouteParams = { params: Promise<{ id: string }> };

const EXTRACTION_PROMPT = `You are a knowledge graph extractor and document analyst. Given a collection of documents, do two things:

1. **Extract a knowledge graph** of key concepts, entities, and relationships
2. **Analyze the bundle** to provide summary, themes, and insights

Return ONLY valid JSON in this exact format:
{
  "nodes": [
    { "id": "concept:unique-id", "label": "Display Name", "type": "concept|entity|tag", "weight": 1-10 }
  ],
  "edges": [
    { "source": "node-id", "target": "node-id", "label": "brief relationship description", "weight": 1-5, "type": "shares_concept|related|references|contains" }
  ],
  "clusters": [
    { "id": "cluster-0", "label": "Cluster Name", "nodeIds": ["node-id-1"], "color": "#hex" }
  ],
  "summary": "A 2-3 sentence summary of what this collection of documents covers as a whole.",
  "themes": ["theme1", "theme2", "theme3"],
  "insights": [
    "Key insight about how documents relate or complement each other",
    "Gap or contradiction found across documents",
    "Strategic observation from reading all documents together"
  ]
}

CRITICAL RULES:
- Include document nodes with type "document" and their original IDs prefixed with "doc:"
- Concept nodes: "concept:" prefix. Entity nodes: "concept:" prefix but type "entity". Tag nodes: "concept:" prefix but type "tag"
- Weight 1-10 for nodes (importance), 1-5 for edges (strength)
- Edge labels should be SHORT (2-4 words) describing the relationship
- Use these cluster colors: #fb923c, #60a5fa, #a78bfa, #4ade80, #f472b6, #2dd4bf
- Extract 8-15 concept/entity/tag nodes (quality over quantity)
- Only create edges for MEANINGFUL relationships (not obvious ones)
- **EVERY concept/entity/tag node MUST have at least one edge connecting it to a document node (doc:xxx).** This is the most important rule. A concept without a document connection is useless. The edge should show WHICH document(s) the concept comes from or relates to.
- Concept-to-concept edges are allowed IN ADDITION to document edges, but never as the only connection.
- If a concept appears in multiple documents, create edges from each relevant document to that concept.
- summary: what do these documents TOGETHER tell us?
- themes: 3-5 overarching themes across all documents
- insights: 2-4 non-obvious insights from cross-document analysis`;

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
  }

  // Check bundle exists and is accessible (public bundles can be analyzed by anyone)
  const { data: bundle } = await supabase
    .from("bundles")
    .select("user_id, anonymous_id, edit_token, is_draft")
    .eq("id", id)
    .single();

  if (!bundle) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Draft bundles require ownership to analyze
  if (bundle.is_draft) {
    let body: { editToken?: string; userId?: string; anonymousId?: string };
    try { body = await req.json(); } catch { body = {}; }
    const verified = await verifyAuthToken(req.headers.get("authorization"));
    if (verified) body.userId = verified.userId;
    const isOwner =
      !!(body.userId && bundle.user_id && body.userId === bundle.user_id) ||
      !!(body.anonymousId && bundle.anonymous_id && body.anonymousId === bundle.anonymous_id);
    const hasToken = !!(body.editToken && bundle.edit_token === body.editToken);
    if (!isOwner && !hasToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
  }

  // Fetch all documents in the bundle
  const { data: bundleDocs } = await supabase
    .from("bundle_documents")
    .select("document_id, sort_order")
    .eq("bundle_id", id)
    .order("sort_order", { ascending: true });

  if (!bundleDocs || bundleDocs.length === 0) {
    return NextResponse.json({ error: "Bundle has no documents" }, { status: 400 });
  }

  const docIds = bundleDocs.map(d => d.document_id);
  const { data: docs } = await supabase
    .from("documents")
    .select("id, title, markdown")
    .in("id", docIds)
    .is("deleted_at", null);

  if (!docs || docs.length === 0) {
    return NextResponse.json({ error: "No accessible documents" }, { status: 400 });
  }

  // Prepare document excerpts for AI (first 2000 chars each, max 10 docs)
  const excerpts = docs.slice(0, 10).map((doc, i) => {
    const excerpt = doc.markdown.slice(0, 2000);
    return `--- Document ${i + 1}: "${doc.title || "Untitled"}" (id: doc:${doc.id}) ---\n${excerpt}`;
  }).join("\n\n");

  // Try AI extraction
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI not configured" }, { status: 503 });
  }

  try {
    let graphData;

    if (process.env.ANTHROPIC_API_KEY) {
      graphData = await extractWithAnthropic(excerpts, docs, process.env.ANTHROPIC_API_KEY);
    } else if (process.env.OPENAI_API_KEY) {
      graphData = await extractWithOpenAI(excerpts, docs, process.env.OPENAI_API_KEY);
    } else if (process.env.GEMINI_API_KEY) {
      graphData = await extractWithGemini(excerpts, docs, process.env.GEMINI_API_KEY);
    }

    if (!graphData) {
      console.error("AI extraction returned null — parse failed or API error");
      return NextResponse.json({ error: "AI extraction failed" }, { status: 500 });
    }
    console.log("AI graph extracted:", graphData.nodes.length, "nodes,", graphData.edges.length, "edges");

    // Ensure document nodes exist
    for (const doc of docs) {
      const docNodeId = `doc:${doc.id}`;
      if (!graphData.nodes.find((n: { id: string }) => n.id === docNodeId)) {
        graphData.nodes.unshift({
          id: docNodeId,
          label: doc.title || "Untitled",
          type: "document",
          documentId: doc.id,
          weight: 5,
        });
      } else {
        // Ensure document nodes have documentId
        const node = graphData.nodes.find((n: { id: string }) => n.id === docNodeId);
        if (node) node.documentId = doc.id;
      }
    }

    graphData.version = 1;

    // Cache in database
    const now = new Date().toISOString();
    await supabase
      .from("bundles")
      .update({ graph_data: graphData, graph_generated_at: now, updated_at: now })
      .eq("id", id);

    return NextResponse.json({ graphData, generatedAt: now });
  } catch (err) {
    console.error("AI graph extraction error:", err);
    return NextResponse.json({ error: "AI extraction failed" }, { status: 500 });
  }
}

// ─── Provider implementations ───

interface DocInfo { id: string; title: string | null }

async function extractWithAnthropic(excerpts: string, docs: DocInfo[], apiKey: string) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [{
        role: "user",
        content: `${EXTRACTION_PROMPT}\n\nDocuments:\n${excerpts}`,
      }],
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const text = data.content?.[0]?.text || "";
  return parseGraphJson(text);
}

async function extractWithOpenAI(excerpts: string, docs: DocInfo[], apiKey: string) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: EXTRACTION_PROMPT },
        { role: "user", content: `Documents:\n${excerpts}` },
      ],
      max_tokens: 4096,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "";
  return parseGraphJson(text);
}

async function extractWithGemini(excerpts: string, docs: DocInfo[], apiKey: string) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${EXTRACTION_PROMPT}\n\nDocuments:\n${excerpts}` }] }],
      generationConfig: { maxOutputTokens: 4096, responseMimeType: "application/json" },
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("Gemini API error:", res.status, errText);
    return null;
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  console.log("Gemini response length:", text.length);
  return parseGraphJson(text);
}

function parseGraphJson(text: string) {
  // Extract JSON from possible markdown code block
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
  const jsonStr = (jsonMatch[1] || text).trim();
  try {
    const parsed = JSON.parse(jsonStr);
    if (!parsed.nodes || !parsed.edges) return null;
    return {
      nodes: parsed.nodes || [],
      edges: parsed.edges || [],
      clusters: parsed.clusters || [],
      summary: parsed.summary || null,
      themes: parsed.themes || [],
      insights: parsed.insights || [],
      version: 1,
    };
  } catch {
    return null;
  }
}
