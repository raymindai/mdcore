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

  const prompt = `Convert this ASCII box-drawing diagram into clean, styled HTML.

Rules:
- Use a dark theme: background #1a1a2e, text #e0e0e0, borders #2d2d44, accent #fb923c
- Represent boxes as styled divs with border, border-radius:8px, padding
- Nested boxes = nested divs with slightly different background
- Arrows between boxes = centered arrow text (↓ or →) with accent color
- Side-by-side boxes = flexbox row
- Preserve ALL text content exactly
- Use system-ui font, font-size 13px
- Progress bars (████░░) = colored div bars
- Make it look professional and clean
- Output ONLY the HTML — no explanation, no markdown, no code fences
- Do NOT include <html>, <head>, <body> tags — just the inner content div
- Wrap everything in a single <div style="..."> root element

ASCII diagram:
${ascii}`;

  try {
    // Use https module instead of fetch — Node.js undici has connect timeout issues
    const data = await new Promise<Record<string, unknown>>((resolve, reject) => {
      const body = JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
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
