import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { verifyAuthToken } from "@/lib/verify-auth";

type RouteParams = { params: Promise<{ id: string }> };

const EXTRACTION_PROMPT = `You are an expert document analyst and knowledge graph builder. Analyze a collection of documents deeply and produce a comprehensive analysis.

Return ONLY valid JSON with this structure:
{
  "nodes": [
    { "id": "concept:unique-id", "label": "Display Name", "type": "concept|entity|tag", "weight": 1-10, "description": "One-sentence explanation of why this concept matters in context" }
  ],
  "edges": [
    { "source": "node-id", "target": "node-id", "label": "brief relationship (2-4 words)", "weight": 1-5, "type": "shares_concept|related|references|contains" }
  ],
  "clusters": [
    { "id": "cluster-0", "label": "Cluster Name", "nodeIds": ["node-id-1"], "color": "#hex" }
  ],
  "summary": "3-4 sentence executive summary of what these documents collectively represent.",
  "themes": ["theme1", "theme2", "theme3", "theme4"],
  "insights": [
    "Non-obvious insight from cross-document analysis",
    "Strategic implication or pattern discovered",
    "Gap, contradiction, or tension between documents",
    "Actionable recommendation based on the analysis"
  ],
  "readingOrder": ["doc:id1", "doc:id2", "doc:id3"],
  "readingOrderReason": "Why this order makes sense for understanding the full picture.",
  "keyTakeaways": [
    "The single most important point across all documents",
    "Second most important takeaway",
    "Third takeaway"
  ],
  "documentSummaries": {
    "doc:id1": "One-sentence summary of this specific document's role in the bundle.",
    "doc:id2": "One-sentence summary..."
  },
  "gaps": [
    "Topic or question that these documents don't address but should",
    "Missing perspective or data point"
  ],
  "connections": [
    { "doc1": "doc:id1", "doc2": "doc:id2", "relationship": "How these two documents relate to each other specifically" }
  ]
}

CRITICAL RULES:
- Document nodes: type "document", IDs prefixed with "doc:" (use the exact IDs provided)
- Concept/Entity/Tag nodes: IDs prefixed with "concept:"
- **EVERY concept node MUST connect to at least one document node via an edge.** No orphan concepts.
- Concept-to-concept edges are allowed IN ADDITION to document edges
- If a concept appears in multiple documents, create edges from EACH relevant document
- Weight 1-10 for nodes (importance in context), 1-5 for edges (relationship strength)
- Edge labels: SHORT (2-4 words), describing the specific relationship
- Cluster colors: #fb923c, #60a5fa, #a78bfa, #4ade80, #f472b6, #2dd4bf
- Extract ALL meaningful concepts, entities, and tags — no arbitrary limit. Include everything that helps understand the documents. Use a good mix of all three types:
  - "concept": abstract ideas, strategies, methodologies, principles
  - "entity": specific technologies, products, companies, people, tools
  - "tag": broad categories, topics, domains
  Each must be meaningful and distinct — no near-duplicates
- Insights should be NON-OBVIOUS — things a reader wouldn't notice without reading all documents together
- readingOrder: suggest optimal reading sequence for someone new to this bundle
- documentSummaries: one sentence per document explaining its role/contribution to the bundle
- gaps: what's MISSING from this collection? What would make it more complete?
- connections: direct document-to-document relationships with specific explanations`;

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
      readingOrder: parsed.readingOrder || [],
      readingOrderReason: parsed.readingOrderReason || null,
      keyTakeaways: parsed.keyTakeaways || [],
      documentSummaries: parsed.documentSummaries || {},
      gaps: parsed.gaps || [],
      connections: parsed.connections || [],
      version: 2,
    };
  } catch {
    return null;
  }
}
