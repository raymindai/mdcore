import { NextRequest, NextResponse } from "next/server";
import https from "https";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── Deterministic ASCII Tree Parser ───

interface TreeNode {
  label: string;
  subLabels: string[];
  children: TreeNode[];
}

function tryParseAsciiTree(text: string): TreeNode | null {
  const lines = text.split("\n");
  if (lines.length < 3) return null;

  // Must have box-drawing characters
  const boxChars = /[┌┐└┘│─├┤┬┴┼╌]/;
  const boxLineCount = lines.filter(l => boxChars.test(l)).length;
  if (boxLineCount < 2) return null;

  // Find all text labels and their column positions
  // A "label" is a word or phrase NOT made of box-drawing chars
  type Label = { text: string; col: number; line: number; midCol: number };
  const labels: Label[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Find text segments (non-box-drawing, non-whitespace)
    const regex = /[^\s┌┐└┘│─├┤┬┴┼╌]+(\s+[^\s┌┐└┘│─├┤┬┴┼╌]+)*/g;
    let match;
    while ((match = regex.exec(line)) !== null) {
      const txt = match[0].trim();
      if (!txt) continue;
      // Skip if it's just box chars
      if (/^[┌┐└┘│─├┤┬┴┼╌\s]+$/.test(txt)) continue;
      const col = match.index;
      labels.push({ text: txt, col, line: i, midCol: col + Math.floor(txt.length / 2) });
    }
  }

  if (labels.length === 0) return null;

  // Find vertical connector positions (columns where │ appears)
  function hasVerticalConnector(col: number, fromLine: number, toLine: number): boolean {
    for (let i = fromLine; i <= toLine; i++) {
      if (i >= lines.length) return false;
      const ch = lines[i]?.[col];
      if (ch === "│" || ch === "┼" || ch === "┬" || ch === "┴" || ch === "├" || ch === "┤") return true;
    }
    return false;
  }

  // Find horizontal branch lines and their connected columns
  function findBranchChildren(parentMidCol: number, parentLine: number): number[] {
    // Look for a horizontal branch line below the parent
    for (let i = parentLine + 1; i < Math.min(parentLine + 4, lines.length); i++) {
      const line = lines[i];
      if (!line) continue;
      if (/[┌┐┬┼├┤─┴└┘]/.test(line)) {
        // This is a branch line — find all vertical connector positions
        const connectorCols: number[] = [];
        for (let c = 0; c < line.length; c++) {
          const ch = line[c];
          if (ch === "│" || ch === "┼" || ch === "┬" || ch === "├" || ch === "┤" || ch === "┌" || ch === "└") {
            // Check if there's a vertical line below this position
            if (i + 1 < lines.length) {
              const below = lines[i + 1]?.[c];
              if (below === "│" || below === " " || !below) {
                // Check if text is near this column on lines below
                connectorCols.push(c);
              }
            }
            connectorCols.push(c);
          }
        }
        if (connectorCols.length > 0) return [...new Set(connectorCols)];
      }
    }
    return [];
  }

  // Group labels by line
  const labelsByLine = new Map<number, Label[]>();
  for (const l of labels) {
    if (!labelsByLine.has(l.line)) labelsByLine.set(l.line, []);
    labelsByLine.get(l.line)!.push(l);
  }

  // Find label groups at the same hierarchy level (same line, or connected by branch)
  // Strategy: find the first label (root), then find its children via vertical/branch connections

  function findChildrenLabels(parentLabel: Label): Label[] {
    // Look for labels on lines below that are connected via vertical lines and branches
    const children: Label[] = [];

    // Find the next set of labels that are at the same hierarchy level
    // Look for labels that are connected to the parent via │ and branch lines
    for (let i = parentLabel.line + 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      // Skip pure branch lines
      if (/^[\s┌┐└┘│─├┤┬┴┼╌]+$/.test(line)) continue;

      // Found a line with text — these are the children
      const lineLabels = labelsByLine.get(i);
      if (lineLabels && lineLabels.length > 0) {
        return lineLabels;
      }
    }
    return children;
  }

  // Build tree by finding connected labels at each level
  function buildLevel(levelLabels: Label[]): TreeNode[] {
    const nodes: TreeNode[] = [];

    for (const label of levelLabels) {
      const node: TreeNode = { label: label.text, subLabels: [], children: [] };

      // Find sub-labels: text on lines below at same column position (within 3 chars)
      // that are NOT connected to a branch line
      for (let i = label.line + 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;

        // If this line has box-drawing chars, it might be a branch — check if it connects to children
        if (/[┌┐└┘├┤┬┴┼]/.test(line)) {
          // Find children below this branch
          const childLabels: Label[] = [];
          for (let j = i + 1; j < lines.length; j++) {
            const jLine = lines[j];
            if (!jLine) continue;
            if (/^[\s┌┐└┘│─├┤┬┴┼╌]+$/.test(jLine)) continue;
            const jLabels = labelsByLine.get(j);
            if (jLabels) {
              // Filter to labels that are within the column range of this parent
              const parentRange = { left: label.col - 5, right: label.col + label.text.length + 5 };
              // Find labels connected via the branch
              for (const jl of jLabels) {
                // Check if this label is connected to the parent's branch
                if (jl.midCol >= parentRange.left && jl.midCol <= parentRange.right) {
                  childLabels.push(jl);
                } else {
                  // Check if there's a horizontal branch connecting them
                  for (let c = Math.min(label.midCol, jl.midCol); c <= Math.max(label.midCol, jl.midCol); c++) {
                    if (line[c] === "─" || line[c] === "┴" || line[c] === "┬" || line[c] === "┼") {
                      childLabels.push(jl);
                      break;
                    }
                  }
                }
              }
              if (childLabels.length > 0) {
                node.children = buildLevel(childLabels);
                break;
              }
            }
          }
          break;
        }

        // Check for sub-labels at same column position
        const lineLabels = labelsByLine.get(i);
        if (lineLabels) {
          for (const ll of lineLabels) {
            // Sub-label if it's roughly aligned with parent column (within 4 chars)
            if (Math.abs(ll.midCol - label.midCol) <= 4) {
              node.subLabels.push(ll.text);
            }
          }
          // If we found sub-labels, also check if there are more labels that aren't sub-labels
          if (node.subLabels.length > 0) continue;
        }

        break; // No more sub-labels
      }

      nodes.push(node);
    }
    return nodes;
  }

  // Start with root: first label
  const root = labels[0];
  const rootNode: TreeNode = { label: root.text, subLabels: [], children: [] };

  // Find first level children
  const firstChildren = findChildrenLabels(root);
  rootNode.children = buildLevel(firstChildren);

  return rootNode.children.length > 0 ? rootNode : null;
}

function treeToHtml(node: TreeNode, isRoot = true): string {
  const bg = isRoot ? "#1c1c24" : "#222230";
  const subLabelsHtml = node.subLabels.map(s =>
    `<div style="font-size:11px;color:#888899;margin-top:2px">${s}</div>`
  ).join("");

  const nodeHtml = `<div style="display:flex;flex-direction:column;align-items:center">
    <div style="background:${bg};border:1px solid #2e2e3a;border-radius:8px;padding:10px 18px;text-align:center">
      <div style="font-size:14px;font-weight:600;color:#ededf0">${node.label}</div>
    </div>
    ${subLabelsHtml ? `<div style="text-align:center;margin-top:4px">${subLabelsHtml}</div>` : ""}
  </div>`;

  if (node.children.length === 0) return nodeHtml;

  const arrow = `<div style="display:flex;flex-direction:column;align-items:center;color:#50505e"><div style="width:1.5px;height:18px;background:#3a3a48"></div><div style="font-size:10px;line-height:1">\u25BC</div></div>`;

  const childrenHtml = node.children.map(c => treeToHtml(c, false)).join("");

  return `<div style="display:flex;flex-direction:column;align-items:center">
    ${nodeHtml}
    ${arrow}
    <div style="display:flex;gap:16px;align-items:flex-start;justify-content:center;flex-wrap:wrap">
      ${childrenHtml}
    </div>
  </div>`;
}

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

  // Try deterministic parser first (works for box-drawing trees)
  const parsedTree = tryParseAsciiTree(ascii);
  if (parsedTree) {
    const html = `<div style="display:flex;justify-content:center;padding:20px;font-family:system-ui,sans-serif">${treeToHtml(parsedTree)}</div>`;
    return NextResponse.json({ html });
  }

  // Fall back to AI for Mermaid, flowcharts, and other formats
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
