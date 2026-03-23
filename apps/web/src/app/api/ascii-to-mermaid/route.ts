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

  const prompt = `You are converting an ASCII art diagram to Mermaid code.

First, classify the diagram type:
- FLOWCHART: boxes connected by arrows (▼ → ←), process flow
- HIERARCHY: nested boxes, organizational structure
- SCORECARD: single box with stats/metrics/progress bars
- TABLE: rows and columns with data

Then convert using these rules:

For FLOWCHART/HIERARCHY:
- Use "flowchart TD" (top-down vertical flow)
- Use subgraph for groups/containers with ["label"] syntax
- Use --> for connections
- ALL labels MUST use ["quoted text"] format
- NEVER use () for nodes — it breaks Mermaid
- Preserve ALL text content

For SCORECARD:
- Use "flowchart TD" with a single node containing all info
- Use <br/> for line breaks within the node
- Include all metrics and text

For TABLE:
- Use "flowchart LR" with nodes for each cell
- Or use subgraph rows

CRITICAL: Output ONLY the raw Mermaid code. No markdown fences, no explanations, no comments.

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
    console.error("Gemini request failed:", err instanceof Error ? err.stack : err);
    return NextResponse.json({ error: "AI request failed: " + (err instanceof Error ? err.message : String(err)) }, { status: 500 });
  }
}
