import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  const prompt = `Convert this ASCII diagram to Mermaid code. Use flowchart TD. Use ["label"] for all nodes. No () shapes. No code fences. No explanations. Only raw Mermaid code.

${ascii}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2048,
          },
        }),
      }
    );
    clearTimeout(timeout);

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

    // Ensure flowchart declaration exists
    if (mermaidCode && !mermaidCode.startsWith("flowchart") && !mermaidCode.startsWith("graph")) {
      mermaidCode = "flowchart TD\n" + mermaidCode;
    }

    if (!mermaidCode || (!mermaidCode.includes("graph") && !mermaidCode.includes("flowchart"))) {
      console.error("Invalid Mermaid output:", mermaidCode?.substring(0, 200));
      return NextResponse.json({ error: "No valid Mermaid output", raw: mermaidCode?.substring(0, 200) }, { status: 500 });
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
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Gemini request failed:", msg);
    // Truncate ascii for logging
    console.error("Input length:", ascii.length, "chars");
    return NextResponse.json({ error: `AI request failed: ${msg}` }, { status: 500 });
  }
}
