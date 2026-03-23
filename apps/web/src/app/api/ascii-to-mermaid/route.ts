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

Rules:
- Use "flowchart TD" for top-down flow
- Use subgraph for nested/grouped boxes
- Use --> for arrows between sections
- Preserve all text labels exactly
- Use appropriate node shapes: [] for rectangles, () for rounded
- For side-by-side boxes, put them in the same row
- Output ONLY the Mermaid code, no explanation, no code fences

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

    return NextResponse.json({ mermaid: mermaidCode });
  } catch (err: unknown) {
    console.error("Gemini request failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "AI request failed" }, { status: 500 });
  }
}
