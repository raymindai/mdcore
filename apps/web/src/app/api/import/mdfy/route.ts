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

  // Limit input to ~30k chars to avoid token limits
  const trimmed = text.slice(0, 30000);

  const prompt = `You are an expert at converting raw text into well-structured Markdown.

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
${trimmed}
---

Structured Markdown:`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 8192,
          },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("Gemini API error:", err);
      return NextResponse.json({ error: "AI processing failed" }, { status: 502 });
    }

    const data = await res.json();
    const markdown = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!markdown.trim()) {
      return NextResponse.json({ error: "AI returned empty result" }, { status: 500 });
    }

    return NextResponse.json({ markdown });
  } catch (err) {
    console.error("mdfy API error:", err);
    return NextResponse.json({ error: "AI processing failed" }, { status: 500 });
  }
}
