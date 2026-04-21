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

  const prompt = `Convert this diagram into clean, styled HTML that EXACTLY preserves the original structure and relationships.

CRITICAL: Analyze the input carefully BEFORE generating HTML.
- Count every node, every connection, every label.
- Map out the EXACT hierarchy: which node is parent of which, how many children each node has.
- Your output MUST have the same number of nodes, same connections, same labels as the input.
- If the input shows A connecting to B, C, and D — your output must show A connecting to exactly B, C, and D (not "B / C / D" merged into one box).

The input may be: ASCII box-drawing tree, ASCII flowchart, Mermaid code, or any text-based diagram.

Structure rules:
- ASCII trees with box-drawing characters (│├└─) represent hierarchical parent-child relationships. Preserve EVERY level of nesting exactly.
- If a parent has 3 children, show 3 separate child nodes — never merge them.
- If children have sub-children, show those as a separate nested level.
- Mermaid flowcharts: follow the exact edge definitions. A-->B and A-->C means A splits to B AND C.
- Sequence diagrams: participants in a row, then vertical message rows.

Design rules:
- Dark theme ONLY — no blue, no gradients, no background images
- Root background: transparent
- Box/node background: #1c1c24
- Nested/secondary boxes: #222230
- Borders: 1px solid #2e2e3a — subtle, no glow, no shadow
- Accent color: #fb923c (ONLY for key highlights or important labels — use sparingly)
- Text colors: #ededf0 (primary labels), #b8b8c4 (body/descriptions), #888899 (annotations)
- Boxes: styled divs, border-radius:8px, padding:10px 14px
- Headers: font-size:14px, font-weight:600, color:#ededf0
- Body text: font-size:12px, color:#b8b8c4
- Vertical arrow: <div style="display:flex;flex-direction:column;align-items:center;color:#50505e"><div style="width:1.5px;height:20px;background:#3a3a48"></div><div style="font-size:10px;line-height:1">▼</div></div>
- Horizontal arrow: <div style="display:flex;align-items:center;color:#50505e"><div style="height:1.5px;width:24px;background:#3a3a48"></div><div style="font-size:10px;line-height:1">▶</div></div>
- Side-by-side nodes: flexbox row, gap:12px
- Vertical flow: flexbox column, align-items:center
- For tree structures: root at top, children below with arrows, grandchildren below children
- Use system-ui font
- Output ONLY the HTML — no explanation, no markdown, no code fences
- Do NOT include <html>, <head>, <body> tags
- Wrap everything in a single <div style="..."> root element
- Preserve ALL text content exactly as in the input — do not paraphrase, merge, or omit any labels

Diagram:
${ascii}`;

  try {
    // Use https module instead of fetch — Node.js undici has connect timeout issues
    const data = await new Promise<Record<string, unknown>>((resolve, reject) => {
      const body = JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
      });

      const options: https.RequestOptions = {
        hostname: "generativelanguage.googleapis.com",
        path: `/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${apiKey}`,
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
        family: 4, // Force IPv4 — IPv6 times out on some networks
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

    // Extract HTML from response (remove code fences if present)
    const htmlOutput = rawText
      .replace(/^```html\n?/gm, "")
      .replace(/^```\n?/gm, "")
      .replace(/Here is.*:\n?/gi, "")
      .trim();

    // Must contain at least one div tag
    if (!htmlOutput || !htmlOutput.includes("<div")) {
      console.error("Invalid HTML output:", htmlOutput?.substring(0, 200));
      return NextResponse.json({ error: "No valid HTML output" }, { status: 500 });
    }

    return NextResponse.json({ html: htmlOutput });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Gemini request failed:", msg);
    // Truncate ascii for logging
    console.error("Input length:", ascii.length, "chars");
    return NextResponse.json({ error: `AI request failed: ${msg}` }, { status: 500 });
  }
}
