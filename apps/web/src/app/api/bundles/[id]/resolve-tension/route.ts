import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { verifyAuthToken } from "@/lib/verify-auth";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * Reconcile two contradicting chunks identified in the Discoveries panel.
 *
 *   POST /api/bundles/[id]/resolve-tension
 *   Body: {
 *     source: { docTitle, chunkLabel, chunkContent, chunkType },
 *     target: { docTitle, chunkLabel, chunkContent, chunkType },
 *     intent?: string,   // optional bundle intent
 *     editToken?, userId?, anonymousId?
 *   }
 *
 * Returns { resolution: string } — a 2-3 paragraph reconciliation suggesting
 * how to think about the apparent contradiction (often it's not a real
 * conflict, but different scopes / time horizons / definitions).
 */

const RESOLVE_PROMPT = `You are an analyst helping a user reconcile two apparently contradicting statements pulled from different documents.

Given two chunks (A and B) that the bundle's AI flagged as in tension, do this:

1. **Identify the nature of the disagreement.** Is it really a contradiction, or do they apply to different scopes / time horizons / audiences / definitions?
2. **Propose a reconciliation.** When can both be true? Or which one is more reliable, and why?
3. **Suggest a resolving move.** What would the user need to know or do to settle this?

Output STRICT markdown:

**Diagnosis.** <One paragraph describing what's actually at stake — is this a real conflict, a context mismatch, or a definitional gap?>

**Reconciliation.** <One paragraph: when can both hold? Or how does one supersede the other?>

**Next move.** <One sentence: a concrete action or question that would resolve this for the user.>

CRITICAL RULES:
- Maximum 200 words.
- Be specific — refer to the chunk content, not in generalities.
- Never just restate the contradiction. Always propose a synthesis or clarifying question.
- If the chunks aren't actually in tension on inspection, say that explicitly.`;

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Storage not configured" }, { status: 503 });

  let body: {
    source?: { docTitle?: string; chunkLabel?: string; chunkContent?: string; chunkType?: string };
    target?: { docTitle?: string; chunkLabel?: string; chunkContent?: string; chunkType?: string };
    intent?: string;
    editToken?: string;
    userId?: string;
    anonymousId?: string;
  };
  try { body = await req.json(); } catch { body = {}; }
  if (!body.source?.chunkContent || !body.target?.chunkContent) {
    return NextResponse.json({ error: "source + target chunk content required" }, { status: 400 });
  }

  const { data: bundle } = await supabase
    .from("bundles")
    .select("user_id, anonymous_id, edit_token, is_draft, intent")
    .eq("id", id)
    .single();
  if (!bundle) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (bundle.is_draft) {
    const verified = await verifyAuthToken(req.headers.get("authorization"));
    const userId = body.userId || verified?.userId || req.headers.get("x-user-id") || undefined;
    const anonymousId = body.anonymousId || req.headers.get("x-anonymous-id") || undefined;
    const isOwner =
      !!(userId && bundle.user_id && userId === bundle.user_id) ||
      !!(anonymousId && bundle.anonymous_id && anonymousId === bundle.anonymous_id);
    const hasToken = !!(body.editToken && bundle.edit_token === body.editToken);
    if (!isOwner && !hasToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
  }

  const intentLine = bundle.intent
    ? `\nUser's intent: "${bundle.intent}". Frame the reconciliation around this question.`
    : "";

  const prompt = `${RESOLVE_PROMPT}${intentLine}

---

## Chunk A (from "${body.source.docTitle || "untitled"}", type: ${body.source.chunkType || "unknown"})
**Label:** ${body.source.chunkLabel || ""}
**Content:**
${body.source.chunkContent}

---

## Chunk B (from "${body.target.docTitle || "untitled"}", type: ${body.target.chunkType || "unknown"})
**Label:** ${body.target.chunkLabel || ""}
**Content:**
${body.target.chunkContent}`;

  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "AI not configured" }, { status: 503 });

  try {
    let resolution: string | null = null;
    if (process.env.ANTHROPIC_API_KEY) resolution = await runAnthropic(prompt, process.env.ANTHROPIC_API_KEY);
    else if (process.env.OPENAI_API_KEY) resolution = await runOpenAI(prompt, process.env.OPENAI_API_KEY);
    else if (process.env.GEMINI_API_KEY) resolution = await runGemini(prompt, process.env.GEMINI_API_KEY);
    if (!resolution) return NextResponse.json({ error: "AI resolution failed" }, { status: 500 });
    return NextResponse.json({ resolution });
  } catch (err) {
    console.error("Resolve tension AI error:", err);
    return NextResponse.json({ error: "AI resolution failed" }, { status: 500 });
  }
}

async function runAnthropic(prompt: string, apiKey: string): Promise<string | null> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 768,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.content?.[0]?.text || null;
}

async function runOpenAI(prompt: string, apiKey: string): Promise<string | null> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 768,
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.choices?.[0]?.message?.content || null;
}

async function runGemini(prompt: string, apiKey: string): Promise<string | null> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 768 },
      }),
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
}
