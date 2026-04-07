import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI API key not configured" }, { status: 503 });
  }

  let body: { text: string; filename?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { text, filename } = body;
  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  // Hard cap: 3 MB of text. Gemini 3.1 has a 1M-token context window which
  // comfortably handles this (3MB ≈ 750k tokens at 4 chars/token).
  const MAX_INPUT_BYTES = 3 * 1024 * 1024;
  const truncated = text.length > MAX_INPUT_BYTES;
  const trimmed = truncated ? text.slice(0, MAX_INPUT_BYTES) : text;

  const buildPrompt = (input: string) => `You are an expert at converting raw text into well-structured Markdown.

The following text was extracted from a file${filename ? ` named "${filename}"` : ""}. The extraction process lost all formatting — headings, bold, lists, tables, code blocks, etc. are all flattened into plain text.

Your job is to reconstruct the original document structure as clean Markdown:

Rules:
- Detect headings from context (titles, section names) and use # ## ### appropriately
- Detect lists (bullet points, numbered steps) and format as - or 1. 2. 3.
- Detect tables and format as Markdown tables
- Detect code snippets and wrap in \`\`\` code blocks with language hints
- Detect emphasis (key terms, important phrases) and use **bold** or *italic*
- Detect blockquotes and use >
- Preserve all original content — do NOT summarize, skip, or rephrase
- Output ONLY the Markdown — no explanations, no wrapping, no \`\`\`markdown fences
- If the text is already well-structured, just clean it up minimally
- For non-English text, preserve the original language

Raw text:
---
${input}
---

Structured Markdown:`;

  // Call Gemini with retry on transient errors (5xx, network).
  const callGemini = async (attempt: number): Promise<Response> => {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildPrompt(trimmed) }] }],
          generationConfig: {
            temperature: 0.1,
            // Bumped from 8192 to support large inputs. Gemini 3.1 supports
            // up to 65536 output tokens.
            maxOutputTokens: 65536,
          },
        }),
      }
    );
    if (res.ok || res.status < 500 || attempt >= 2) return res;
    // Backoff: 500ms, 1500ms
    await new Promise((r) => setTimeout(r, 500 + attempt * 1000));
    return callGemini(attempt + 1);
  };

  try {
    const res = await callGemini(0);

    if (!res.ok) {
      const errBody = await res.text();
      console.error("Gemini API error:", res.status, errBody);
      // Surface a specific error so the client can show useful UX.
      let userMessage = "AI processing failed";
      if (res.status === 429) userMessage = "AI is rate-limited right now. Try again in a minute.";
      else if (res.status === 413 || /too large|exceeds/i.test(errBody))
        userMessage = "Document is too large for AI processing.";
      else if (res.status === 400 && /API key/i.test(errBody))
        userMessage = "AI service misconfigured.";
      else if (res.status >= 500) userMessage = "AI service is temporarily unavailable.";
      return NextResponse.json({ error: userMessage }, { status: res.status === 429 ? 429 : 502 });
    }

    const data = await res.json();
    const markdown = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const finishReason = data.candidates?.[0]?.finishReason;

    if (!markdown.trim()) {
      return NextResponse.json(
        { error: finishReason === "SAFETY" ? "AI refused this content (safety filter)." : "AI returned empty result" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      markdown,
      truncated,
      ...(finishReason && finishReason !== "STOP" ? { finishReason } : {}),
    });
  } catch (err) {
    console.error("mdfy API error:", err);
    return NextResponse.json({ error: "AI service unreachable. Check your connection." }, { status: 500 });
  }
}
