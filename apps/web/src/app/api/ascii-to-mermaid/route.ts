import { NextRequest, NextResponse } from "next/server";
import https from "https";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Gemini API key not configured" }, { status: 503 });
  }

  let body: { ascii: string; image?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { ascii, image } = body;
  if (!ascii || typeof ascii !== "string") {
    return NextResponse.json({ error: "ascii text required" }, { status: 400 });
  }

  const prompt = `Convert this diagram into clean, styled HTML that EXACTLY preserves the original structure and relationships.

STEP 1 — PARSE THE STRUCTURE FIRST:
Before generating ANY HTML, write out the hierarchy as a nested list in your head.

How to parse ASCII box-drawing trees:
- Vertical lines (│) connect a parent above to children below.
- Horizontal branches (┌──┼──┐ or ├──┤ or └──┘) show which nodes share the same parent.
- Text labels DIRECTLY BELOW a branch belong to that branch.
- Text on subsequent lines at the SAME COLUMN POSITION as a label are sub-labels of that label (not separate nodes).
- Example: if "Browser" is at column 6, and "mdfy.cc" is also at column 6 on the next line, then "mdfy.cc" is a sub-label under "Browser".

STEP 2 — VERIFY:
- Count total nodes. Your HTML must have the EXACT same count.
- Each node must connect to its correct parent.
- Sub-labels below a node are part of that node (show them as smaller text underneath).

The input may be: ASCII box-drawing tree, ASCII flowchart, Mermaid code, or any text-based diagram.

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parts: any[] = [];
    const modelName = "gemini-3.1-flash-lite-preview";

    if (image) {
      // Upload image to Gemini File API first, then reference by URI
      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
      const imgBuffer = Buffer.from(base64Data, "base64");

      const fileUri = await new Promise<string>((resolve, reject) => {
        // Step 1: Start resumable upload
        const startBody = JSON.stringify({ file: { displayName: "ascii-diagram.png" } });
        const startReq = https.request({
          hostname: "generativelanguage.googleapis.com",
          path: `/upload/v1beta/files?key=${apiKey}`,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Upload-Protocol": "resumable",
            "X-Goog-Upload-Command": "start",
            "X-Goog-Upload-Header-Content-Length": String(imgBuffer.length),
            "X-Goog-Upload-Header-Content-Type": "image/png",
          },
          family: 4,
        }, (res) => {
          const uploadUrl = res.headers["x-goog-upload-url"] as string;
          if (!uploadUrl) { reject(new Error("No upload URL")); return; }
          res.resume();
          res.on("end", () => {
            // Step 2: Upload the bytes
            const parsed = new URL(uploadUrl);
            const uploadReq = https.request({
              hostname: parsed.hostname,
              path: parsed.pathname + parsed.search,
              method: "PUT",
              headers: {
                "Content-Length": String(imgBuffer.length),
                "X-Goog-Upload-Offset": "0",
                "X-Goog-Upload-Command": "upload, finalize",
              },
              family: 4,
            }, (uploadRes) => {
              let body = "";
              uploadRes.on("data", (d: Buffer) => body += d.toString());
              uploadRes.on("end", () => {
                try {
                  const result = JSON.parse(body);
                  resolve(result.file?.uri || "");
                } catch { reject(new Error("Upload parse failed")); }
              });
            });
            uploadReq.on("error", reject);
            uploadReq.setTimeout(15000, () => { uploadReq.destroy(); reject(new Error("Upload timeout")); });
            uploadReq.write(imgBuffer);
            uploadReq.end();
          });
        });
        startReq.on("error", reject);
        startReq.setTimeout(10000, () => { startReq.destroy(); reject(new Error("Start timeout")); });
        startReq.write(startBody);
        startReq.end();
      });

      if (fileUri) {
        parts.push({ fileData: { mimeType: "image/png", fileUri } });
        parts.push({ text: prompt + "\n\nIMPORTANT: The image above shows the EXACT visual layout of the diagram. Use the IMAGE to understand the spatial relationships (which nodes are connected, parent-child hierarchy, column alignment). The text below is the raw source — use it for exact label text.\n\nRaw text:\n" + ascii });
      } else {
        // File upload failed — fall back to inline
        const base64Clean = image.replace(/^data:image\/\w+;base64,/, "");
        parts.push({ inlineData: { mimeType: "image/png", data: base64Clean } });
        parts.push({ text: prompt + "\n\nRaw text:\n" + ascii });
      }
    } else {
      parts.push({ text: prompt });
    }

    // Generate content
    const data = await new Promise<Record<string, unknown>>((resolve, reject) => {
      const reqBody = JSON.stringify({
        contents: [{ parts }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
      });

      const options: https.RequestOptions = {
        hostname: "generativelanguage.googleapis.com",
        path: `/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(reqBody) },
        family: 4,
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
      req.write(reqBody);
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
