import { NextRequest, NextResponse } from "next/server";
import https from "https";

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

  // Detect flow direction from the ASCII art
  const hasVerticalArrows = /[▼↓]/.test(ascii);
  const hasHorizontalArrows = /[→▶←◀]/.test(ascii) && !hasVerticalArrows;
  const direction = hasHorizontalArrows ? "LR" : "TD";

  const prompt = `Convert this ASCII box diagram to Mermaid flowchart ${direction}.

Rules:
- Use flowchart ${direction}
- subgraph for nested/grouped boxes
- ["quoted label"] for ALL nodes (never use parentheses)
- --> for arrow connections
- Preserve the original layout direction (${direction === "TD" ? "top-to-bottom" : "left-to-right"})
- Preserve ALL text exactly
- Side-by-side boxes should appear in the same row
- Output ONLY Mermaid code, nothing else

${ascii}`;

  try {
    // Use https module instead of fetch — Node.js undici has connect timeout issues
    const data = await new Promise<Record<string, unknown>>((resolve, reject) => {
      const body = JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
      });

      const options = {
        hostname: "generativelanguage.googleapis.com",
        path: `/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${apiKey}`,
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
      };

      const req = https.request(options, (res) => {
        let responseBody = "";
        res.on("data", (d: Buffer) => responseBody += d.toString());
        res.on("end", () => {
          try {
            if (res.statusCode !== 200) {
              console.error("Gemini API error:", res.statusCode, responseBody.substring(0, 200));
              reject(new Error(`Gemini API ${res.statusCode}`));
              return;
            }
            resolve(JSON.parse(responseBody));
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on("error", reject);
      req.setTimeout(30000, () => { req.destroy(); reject(new Error("Timeout")); });
      req.write(body);
      req.end();
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawText = (data as any).candidates?.[0]?.content?.parts?.[0]?.text || "";

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
