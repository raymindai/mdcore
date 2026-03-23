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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
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
    let mermaidCode = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Clean up: remove code fences if AI added them
    mermaidCode = mermaidCode
      .replace(/^```mermaid\n?/gm, "")
      .replace(/^```\n?/gm, "")
      .trim();

    if (!mermaidCode) {
      return NextResponse.json({ error: "No output from AI" }, { status: 500 });
    }

    return NextResponse.json({ mermaid: mermaidCode });
  } catch (err) {
    console.error("Gemini request failed:", err);
    return NextResponse.json({ error: "AI request failed" }, { status: 500 });
  }
}
