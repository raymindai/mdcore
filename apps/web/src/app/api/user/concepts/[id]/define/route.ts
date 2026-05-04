import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { verifyAuthToken } from "@/lib/verify-auth";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/user/concepts/[id]/define
 *
 * Body: { label, occurrences: [{docTitle, snippet, chunkType}, ...] }
 *
 * The client passes the concept's label + every occurrence snippet it has,
 * and we ask the AI to synthesize a single-paragraph "canonical definition"
 * — what does THIS concept mean *in this user's library*, given how it's
 * used across the docs that mention it. Caller-supplied input keeps this
 * endpoint stateless (no per-user concept table needed); the client caches
 * results in localStorage.
 *
 * The route is auth-gated (any signed-in or anonymous-id user) but doesn't
 * need to look up docs server-side, since the client already has the
 * occurrences from /api/user/concepts.
 */

const PROMPT = `You are writing a one-paragraph canonical definition of a concept based on how it appears in a single user's knowledge library.

You will be given:
- The concept's name
- A list of excerpts from documents in their library where this concept appears (each with its source doc title and chunk type)

Synthesize what THIS concept means *in this user's specific context* — not a generic dictionary entry. Capture:
- The user's working definition (how they use the term)
- The frame they're operating in (technical / strategic / personal / etc.)
- Any tensions or evolution visible across occurrences

Output ONLY the paragraph as plain markdown. No headings, no lists, no preamble. 60-120 words. Conversational but precise. Do not cite docs by name in the output (the UI shows citations separately).`;

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Storage not configured" }, { status: 503 });

  const verified = await verifyAuthToken(req.headers.get("authorization"));
  const userId = verified?.userId || req.headers.get("x-user-id");
  const anonymousId = req.headers.get("x-anonymous-id");
  if (!userId && !anonymousId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { label?: string; occurrences?: Array<{ docTitle?: string; snippet?: string; chunkType?: string }> };
  try { body = await req.json(); } catch { body = {}; }
  const label = body.label?.trim();
  const occurrences = Array.isArray(body.occurrences) ? body.occurrences : [];
  if (!label || occurrences.length === 0) {
    return NextResponse.json({ error: "label + occurrences required" }, { status: 400 });
  }

  // Light input cap — most concepts have <30 occurrences and we want the AI
  // call to stay fast. Take top 12 (longest snippets first to maximize signal).
  const ranked = [...occurrences]
    .filter(o => o.snippet && o.snippet.trim())
    .sort((a, b) => (b.snippet?.length || 0) - (a.snippet?.length || 0))
    .slice(0, 12);

  void id; // concept id is supplied for telemetry / future caching, not needed for the call

  const prompt = `${PROMPT}\n\nConcept name: "${label}"\n\nOccurrences:\n${
    ranked.map((o, i) =>
      `${i + 1}. [${o.chunkType || "concept"}] from "${o.docTitle || "Untitled"}":\n   ${(o.snippet || "").slice(0, 360)}`
    ).join("\n\n")
  }`;

  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "AI not configured" }, { status: 503 });

  try {
    let definition: string | null = null;
    if (process.env.ANTHROPIC_API_KEY) definition = await runAnthropic(prompt, process.env.ANTHROPIC_API_KEY);
    else if (process.env.OPENAI_API_KEY) definition = await runOpenAI(prompt, process.env.OPENAI_API_KEY);
    else if (process.env.GEMINI_API_KEY) definition = await runGemini(prompt, process.env.GEMINI_API_KEY);
    if (!definition) return NextResponse.json({ error: "AI define failed" }, { status: 500 });
    return NextResponse.json({ definition: definition.trim() });
  } catch (err) {
    console.error("Concept define AI error:", err);
    return NextResponse.json({ error: "AI define failed" }, { status: 500 });
  }
}

async function runAnthropic(prompt: string, apiKey: string): Promise<string | null> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 512,
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
      max_tokens: 512,
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
        generationConfig: { maxOutputTokens: 512 },
      }),
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
}
