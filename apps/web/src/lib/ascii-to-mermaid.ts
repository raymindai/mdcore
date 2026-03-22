/**
 * Convert ASCII art box diagrams to Mermaid flowchart code.
 * Handles nested boxes, arrows, and bullet-point content.
 */

interface AsciiBox {
  title: string;
  content: string[];
  children: AsciiBox[];
  row: number;
  col: number;
  depth: number;
}

/**
 * Parse ASCII art into box structure and convert to Mermaid.
 * Returns null if parsing fails.
 */
export function asciiToMermaid(text: string): string | null {
  const lines = text.split("\n");
  if (lines.length < 3) return null;

  try {
    const boxes = parseBoxes(lines, 0, lines.length, 0);
    if (boxes.length === 0) return null;

    // Detect arrows between boxes
    const arrows = detectArrows(lines);

    return generateMermaid(boxes, arrows);
  } catch {
    return null;
  }
}

function parseBoxes(lines: string[], startRow: number, endRow: number, minCol: number): AsciiBox[] {
  const boxes: AsciiBox[] = [];
  let i = startRow;

  while (i < endRow) {
    const line = lines[i] || "";

    // Find box start: ┌ or ╔
    const boxStart = findBoxStart(line, minCol);
    if (boxStart >= 0) {
      // Find the matching bottom: └ or ╚
      const boxEnd = findBoxEnd(lines, i, boxStart, endRow);
      if (boxEnd > i) {
        const box = extractBox(lines, i, boxEnd, boxStart);
        if (box) {
          boxes.push(box);
          i = boxEnd + 1;
          continue;
        }
      }
    }
    i++;
  }

  return boxes;
}

function findBoxStart(line: string, minCol: number): number {
  for (let c = minCol; c < line.length; c++) {
    if (line[c] === "┌" || line[c] === "╔") return c;
  }
  return -1;
}

function findBoxEnd(lines: string[], startRow: number, startCol: number, maxRow: number): number {
  for (let r = startRow + 1; r < maxRow; r++) {
    const line = lines[r] || "";
    // Look for └ or ╚ at approximately the same column
    for (let c = Math.max(0, startCol - 2); c <= Math.min(line.length, startCol + 2); c++) {
      if (line[c] === "└" || line[c] === "╚") return r;
    }
  }
  return -1;
}

function extractBox(lines: string[], startRow: number, endRow: number, startCol: number): AsciiBox | null {
  // Extract title from the top border line or first content line
  const topLine = lines[startRow];
  let title = "";

  // Check if title is embedded in border: ┌─ Title ─────┐
  const titleMatch = topLine.match(/[┌╔][─═]*\s*(.+?)\s*[─═]*[┐╗]/);
  if (titleMatch) {
    title = titleMatch[1].replace(/[─═]/g, "").trim();
  }

  // Extract content lines (between │ markers)
  const content: string[] = [];
  const innerLines: string[] = [];

  for (let r = startRow + 1; r < endRow; r++) {
    const line = lines[r];
    // Extract text between │ markers
    const stripped = stripBoxBorders(line);
    if (stripped !== null) {
      const trimmed = stripped.trim();
      if (trimmed && !trimmed.match(/^[─═┬┴]+$/)) {
        innerLines.push(lines[r]);
        if (!title && trimmed.length > 0) {
          title = trimmed;
        } else {
          content.push(trimmed);
        }
      }
    }
  }

  if (!title) return null;

  // Look for nested boxes
  const children = parseBoxes(lines, startRow + 1, endRow, startCol + 1);

  // If we found children, filter out their content from our content
  if (children.length > 0) {
    const childTitles = new Set(children.flatMap(c => [c.title, ...c.content]));
    const filteredContent = content.filter(c => !childTitles.has(c));
    return { title, content: filteredContent, children, row: startRow, col: startCol, depth: 0 };
  }

  return { title, content, children: [], row: startRow, col: startCol, depth: 0 };
}

function stripBoxBorders(line: string): string | null {
  // Remove │ or ║ from start and end
  const match = line.match(/[│║]\s*(.*?)\s*[│║]/);
  if (match) return match[1];

  // Also handle lines with just │ on one side
  if (line.includes("│") || line.includes("║")) {
    return line.replace(/[│║]/g, "").trim();
  }
  return null;
}

function detectArrows(lines: string[]): { fromRow: number; toRow: number }[] {
  const arrows: { fromRow: number; toRow: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes("▼") || line.includes("↓")) {
      arrows.push({ fromRow: i - 1, toRow: i + 1 });
    }
    if (line.includes("→") || line.includes("▶")) {
      arrows.push({ fromRow: i, toRow: i });
    }
  }

  return arrows;
}

function generateMermaid(boxes: AsciiBox[], arrows: { fromRow: number; toRow: number }[]): string {
  let id = 0;
  const nodeIds = new Map<number, string>(); // row → id mapping
  const lines: string[] = ["flowchart TD"];

  function processBox(box: AsciiBox, indent: string): string {
    const nodeId = `n${id++}`;
    nodeIds.set(box.row, nodeId);

    if (box.children.length > 0) {
      // Box with children → subgraph
      lines.push(`${indent}subgraph ${nodeId}["${escapeLabel(box.title)}"]`);
      for (const child of box.children) {
        processBox(child, indent + "    ");
      }
      // Add content as nodes inside subgraph
      for (const content of box.content) {
        if (content.trim()) {
          const cId = `n${id++}`;
          lines.push(`${indent}    ${cId}["${escapeLabel(content)}"]`);
        }
      }
      lines.push(`${indent}end`);
    } else if (box.content.length > 0) {
      // Box with content → node with content as tooltip/label
      const fullLabel = [box.title, ...box.content].join("<br/>");
      lines.push(`${indent}${nodeId}["${escapeLabel(fullLabel)}"]`);
    } else {
      // Simple box → simple node
      lines.push(`${indent}${nodeId}["${escapeLabel(box.title)}"]`);
    }

    return nodeId;
  }

  for (const box of boxes) {
    processBox(box, "    ");
  }

  // Add arrows based on detected arrow characters
  // Simple heuristic: connect boxes that have arrows between them
  const sortedBoxRows = [...nodeIds.entries()].sort((a, b) => a[0] - b[0]);
  for (const arrow of arrows) {
    // Find the box above and below the arrow
    let fromId = "";
    let toId = "";
    for (const [row, nid] of sortedBoxRows) {
      if (row <= arrow.fromRow) fromId = nid;
      if (row >= arrow.toRow && !toId) toId = nid;
    }
    if (fromId && toId && fromId !== toId) {
      lines.push(`    ${fromId} --> ${toId}`);
    }
  }

  // If no arrows detected but multiple top-level boxes, connect them sequentially
  if (arrows.length === 0 && boxes.length > 1) {
    for (let i = 0; i < boxes.length - 1; i++) {
      const fromId = nodeIds.get(boxes[i].row);
      const toId = nodeIds.get(boxes[i + 1].row);
      if (fromId && toId) {
        lines.push(`    ${fromId} --> ${toId}`);
      }
    }
  }

  return lines.join("\n");
}

function escapeLabel(text: string): string {
  return text
    .replace(/"/g, "'")
    .replace(/[┌┐└┘│─├┤┬┴┼═║╔╗╚╝╠╣╦╩╬┊┈]/g, "")
    .trim();
}
