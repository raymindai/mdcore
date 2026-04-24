import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AIAction = "polish" | "summary" | "tldr" | "translate" | "chat";

// ─── AI Model Config (cached from site_config table) ───
const DEFAULT_PRIMARY_MODEL = "gemini-3-flash-preview";
const DEFAULT_LITE_MODEL = "gemini-3.1-flash-lite-preview";

let cachedModels: { primary: string; lite: string } | null = null;
let cachedModelsAt = 0;
const MODEL_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getAIModels(): Promise<{ primary: string; lite: string }> {
  if (cachedModels && Date.now() - cachedModelsAt < MODEL_CACHE_TTL) {
    return cachedModels;
  }
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data } = await supabase
        .from("site_config")
        .select("key, value")
        .in("key", ["ai_model_primary", "ai_model_lite"]);
      const map: Record<string, string> = {};
      for (const row of data || []) map[row.key] = row.value;
      cachedModels = {
        primary: map["ai_model_primary"] || DEFAULT_PRIMARY_MODEL,
        lite: map["ai_model_lite"] || DEFAULT_LITE_MODEL,
      };
      cachedModelsAt = Date.now();
      return cachedModels;
    }
  } catch {
    // Fall through to defaults
  }
  cachedModels = { primary: DEFAULT_PRIMARY_MODEL, lite: DEFAULT_LITE_MODEL };
  cachedModelsAt = Date.now();
  return cachedModels;
}

const PROMPTS: Record<Exclude<AIAction, "chat" | "translate">, string> = {
  polish: `You are an expert editor. Polish the following Markdown document:
- Fix grammar, spelling, and punctuation errors
- Improve clarity and readability
- Ensure consistent tone and style
- Clean up Markdown formatting (proper headings, lists, emphasis)
- Do NOT change the meaning or remove any content
- Do NOT add new information
- Preserve the original language
- Output ONLY the polished Markdown — no explanations, no wrapping`,

  summary: `You are an expert at summarizing documents. Write a concise summary of the following Markdown document:
- 2-4 sentences that capture the key points
- Written in the same language as the original
- Output ONLY the summary text as a single paragraph — no headings, no wrapping, no explanations`,

  tldr: `You are an expert at creating TL;DR sections. Create a TL;DR for the following Markdown document:
- 2-5 bullet points covering the most important takeaways
- Each bullet should be one clear, actionable sentence
- Written in the same language as the original
- Format as a Markdown list with - prefix
- Output ONLY the bullet list — no headings, no "TL;DR:" prefix, no wrapping, no explanations
- Do NOT include any part of the original document in your output
- Do NOT include code blocks, diagrams, or any content from the source — only the bullet points`,
};

function buildTranslatePrompt(targetLang: string): string {
  return `You are an expert translator. Translate the following Markdown document into ${targetLang}:
- Translate ALL text content accurately
- Preserve all Markdown formatting (headings, lists, tables, code blocks, links, emphasis)
- Do NOT translate code inside code blocks
- Do NOT translate URLs
- Preserve the document structure exactly
- Output ONLY the translated Markdown — no explanations, no wrapping`;
}

function buildChatPrompt(instruction: string): string {
  // Sanitize instruction to prevent prompt injection
  const sanitized = instruction
    .replace(/["""]/g, "'")
    .replace(/\n/g, " ")
    .slice(0, 500);
  return `You are an expert document editor AI. You modify Markdown documents based on user instructions.

The user's instruction is between the <instruction> tags below.

<instruction>${sanitized}</instruction>

Determine the intent:
A) QUESTION — user is asking about the document content (e.g. "what does this say?", "explain this")
B) EDIT — user wants to modify the document (e.g. "add a section", "move this to the top", "rewrite the intro", "summarize and add at top")
C) CASUAL — greeting or unrelated (e.g. "ok", "thanks", "hi")

Rules:
- If A: Respond with "ANSWER:" followed by your concise answer. No markdown formatting.
- If B: Respond with "EDIT:" followed by the COMPLETE modified document in Markdown.
  CRITICAL for edits:
  - Output the ENTIRE document from start to finish, with the requested changes applied.
  - Preserve ALL existing content that was not asked to be changed.
  - Preserve all code blocks, math equations, diagrams, tables exactly as they are.
  - Only modify what the user explicitly asked to change.
  - If adding content, integrate it naturally into the document structure.
- If C: Respond with "ANSWER:" followed by a brief, friendly response.

ALWAYS start with exactly "ANSWER:" or "EDIT:" — no exceptions.`;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI API key not configured" }, { status: 503 });
  }

  let body: { action: AIAction; markdown: string; language?: string; instruction?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { action, markdown, language, instruction } = body;
  if (!action || !markdown || typeof markdown !== "string") {
    return NextResponse.json({ error: "action and markdown are required" }, { status: 400 });
  }

  const validActions: AIAction[] = ["polish", "summary", "tldr", "translate", "chat"];
  if (!validActions.includes(action)) {
    return NextResponse.json({ error: `Invalid action: ${action}` }, { status: 400 });
  }

  if (action === "translate" && !language) {
    return NextResponse.json({ error: "language is required for translate" }, { status: 400 });
  }

  if (action === "chat" && !instruction) {
    return NextResponse.json({ error: "instruction is required for chat" }, { status: 400 });
  }

  // Build prompt based on action
  let systemPrompt: string;
  if (action === "translate") {
    systemPrompt = buildTranslatePrompt(language!);
  } else if (action === "chat") {
    systemPrompt = buildChatPrompt(instruction!);
  } else {
    systemPrompt = PROMPTS[action];
  }

  const fullPrompt = `${systemPrompt}

Document:
---
${markdown.slice(0, 3 * 1024 * 1024)}
---

${action === "chat" ? "Modified document:" : action === "polish" || action === "translate" ? "Result:" : "Output:"}`;

  // Resolve model from site_config (cached 5 min)
  const models = await getAIModels();
  const modelName = (action === "chat" || action === "polish" || action === "translate") ? models.primary : models.lite;

  const callGemini = async (attempt: number): Promise<Response> => {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: {
            temperature: action === "polish" || action === "translate" ? 0.1 : 0.3,
            maxOutputTokens: action === "summary" || action === "tldr" ? 2048 : 65536,
          },
        }),
      }
    );
    if (res.ok || res.status < 500 || attempt >= 2) return res;
    await new Promise((r) => setTimeout(r, 500 + attempt * 1000));
    return callGemini(attempt + 1);
  };

  try {
    const res = await callGemini(0);

    if (!res.ok) {
      const errBody = await res.text();
      console.error(`AI ${action} error:`, res.status, errBody);
      let userMessage = "AI processing failed";
      if (res.status === 429) userMessage = "AI is rate-limited. Try again in a minute.";
      else if (res.status >= 500) userMessage = "AI service is temporarily unavailable.";
      return NextResponse.json({ error: userMessage }, { status: res.status === 429 ? 429 : 502 });
    }

    const data = await res.json();
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const finishReason = data.candidates?.[0]?.finishReason;

    if (!result.trim()) {
      return NextResponse.json(
        { error: finishReason === "SAFETY" ? "AI refused this content (safety filter)." : "AI returned empty result" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      result,
      ...(finishReason && finishReason !== "STOP" ? { finishReason } : {}),
    });
  } catch (err) {
    console.error(`AI ${action} error:`, err);
    return NextResponse.json({ error: "AI service unreachable." }, { status: 500 });
  }
}
