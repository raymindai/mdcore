import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Gemini API key not configured" }, { status: 503 });
  }

  let body: { ascii: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { ascii } = body;
  if (!ascii || typeof ascii !== "string") {
    return NextResponse.json({ error: "ascii text required" }, { status: 400 });
  }

  const prompt = `Convert this ASCII box-drawing diagram to Mermaid flowchart code.

CRITICAL RULES:
1. ALWAYS use "flowchart TD" (top-down) — the original diagram flows vertically
2. Use subgraph for nested/grouped boxes with proper labels
3. Use --> for arrows (▼ means top-to-bottom connection)
4. ALL node labels MUST use square brackets with quotes: A["label text"]
5. NEVER use parentheses () for node shapes — they break Mermaid parsing
6. For side-by-side boxes, put them in the same row within a subgraph
7. Preserve ALL text content from the original
8. Use proper Mermaid subgraph nesting for outer container boxes
9. Output ONLY raw Mermaid code — no code fences, no markdown, no explanations

ASCII diagram:
${ascii}`;

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
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("Gemini API error:", err);
      return NextResponse.json({ error: "AI conversion failed" }, { status: 502 });
    }

    const data = await res.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Extract Mermaid code: look for ```mermaid block first
    let mermaidCode = "";
    const codeBlockMatch = rawText.match(/```mermaid\n([\s\S]*?)```/);
    if (codeBlockMatch) {
      mermaidCode = codeBlockMatch[1].trim();
    } else {
      // Try plain code block
      const plainBlock = rawText.match(/```\n([\s\S]*?)```/);
      if (plainBlock) {
        mermaidCode = plainBlock[1].trim();
      } else {
        // Assume the whole response is mermaid code, clean it up
        mermaidCode = rawText
          .replace(/^```mermaid\n?/gm, "")
          .replace(/^```\n?/gm, "")
          .replace(/### .*/g, "")
          .replace(/\*.*\*/g, "")
          .replace(/Here is.*:\n?/gi, "")
          .trim();
      }
    }

    if (!mermaidCode || !mermaidCode.includes("graph") && !mermaidCode.includes("flowchart")) {
      return NextResponse.json({ error: "No valid Mermaid output" }, { status: 500 });
    }

    // Post-process: fix common Mermaid syntax issues
    // Replace unescaped parentheses in node labels: A(text) → A["text"]
    mermaidCode = mermaidCode.replace(
      /(\w+)\(([^)]*(?:\([^)]*\))?[^)]*)\)/g,
      (match, id, label) => {
        // Don't replace subgraph or known Mermaid keywords
        if (["subgraph", "end", "direction", "click", "style", "classDef", "class"].includes(id)) return match;
        return `${id}["${label}"]`;
      }
    );

    // Ensure labels with special chars are quoted: A[text (with parens)] → A["text (with parens)"]
    mermaidCode = mermaidCode.replace(
      /\[([^\]"]*[()\/][^\]"]*)\]/g,
      '["$1"]'
    );

    return NextResponse.json({ mermaid: mermaidCode });
  } catch (err: unknown) {
    console.error("Gemini request failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "AI request failed" }, { status: 500 });
  }
}
