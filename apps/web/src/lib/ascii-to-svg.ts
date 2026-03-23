/**
 * Render ASCII box-drawing art as clean SVG.
 * Each character maps to a grid cell.
 * Box-drawing characters → SVG lines/arcs.
 * Text → SVG text elements.
 * Arrows → SVG triangles.
 */

const CHAR_W = 9;   // character width in px
const LINE_H = 18;  // line height in px
const HALF_W = CHAR_W / 2;
const HALF_H = LINE_H / 2;

// Colors (CSS variables don't work in SVG inline, so we use actual values)
interface ThemeColors {
  line: string;
  text: string;
  fill: string;
  bg: string;
  arrow: string;
}

const DARK_COLORS: ThemeColors = {
  line: "#52525b",   // zinc-600
  text: "#d4d4d8",   // zinc-300
  fill: "rgba(39, 39, 42, 0.5)", // surface with alpha
  bg: "#18181b",     // zinc-900
  arrow: "#fb923c",  // accent
};

const LIGHT_COLORS: ThemeColors = {
  line: "#a1a1aa",   // zinc-400
  text: "#3f3f46",   // zinc-700
  fill: "rgba(244, 244, 245, 0.8)",
  bg: "#faf9f7",
  arrow: "#ea580c",
};

export function asciiToSvg(text: string, isDark: boolean = true): string {
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;
  const lines = text.split("\n");
  const maxCols = Math.max(...lines.map(l => l.length));
  const rows = lines.length;

  const width = maxCols * CHAR_W + 20; // padding
  const height = rows * LINE_H + 20;

  const svgParts: string[] = [];

  // Collect text runs (consecutive non-box-drawing characters)
  const textRuns: { x: number; y: number; text: string }[] = [];

  for (let row = 0; row < rows; row++) {
    const line = lines[row] || "";
    let textBuffer = "";
    let textStartCol = -1;

    for (let col = 0; col < line.length; col++) {
      const ch = line[col];
      const cx = col * CHAR_W + 10; // center x
      const cy = row * LINE_H + 10; // center y
      const mx = cx + HALF_W;       // mid x
      const my = cy + HALF_H;       // mid y

      if (isBoxChar(ch)) {
        // Flush text buffer
        if (textBuffer.trim()) {
          textRuns.push({ x: textStartCol * CHAR_W + 10, y: row * LINE_H + 10 + HALF_H + 4, text: textBuffer });
        }
        textBuffer = "";
        textStartCol = -1;

        // Render box-drawing character as SVG paths
        const paths = boxCharToSvg(ch, mx, my, colors);
        svgParts.push(paths);
      } else if (isArrowChar(ch)) {
        if (textBuffer.trim()) {
          textRuns.push({ x: textStartCol * CHAR_W + 10, y: row * LINE_H + 10 + HALF_H + 4, text: textBuffer });
        }
        textBuffer = "";
        textStartCol = -1;
        svgParts.push(arrowCharToSvg(ch, mx, my, colors));
      } else if (ch !== " " || textBuffer.length > 0) {
        if (textStartCol === -1) textStartCol = col;
        textBuffer += ch;
      }
    }

    // Flush remaining text
    if (textBuffer.trim()) {
      textRuns.push({ x: textStartCol * CHAR_W + 10, y: row * LINE_H + 10 + HALF_H + 4, text: textBuffer });
    }
  }

  // Detect filled boxes: find closed rectangles and fill them
  const fills = detectBoxFills(lines, colors);

  // Build SVG
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="max-width:100%;height:auto">`;

  // Background
  svg += `<rect width="${width}" height="${height}" fill="${colors.bg}" rx="8"/>`;

  // Box fills (render behind lines)
  svg += fills;

  // Lines
  svg += svgParts.join("");

  // Text
  for (const run of textRuns) {
    const escaped = run.text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    svg += `<text x="${run.x}" y="${run.y}" font-family="system-ui,-apple-system,sans-serif" font-size="13" fill="${colors.text}">${escaped}</text>`;
  }

  svg += "</svg>";
  return svg;
}

function isBoxChar(ch: string): boolean {
  return "┌┐└┘│─├┤┬┴┼╌═║╔╗╚╝╠╣╦╩╬".includes(ch);
}

function isArrowChar(ch: string): boolean {
  return "▼▲→←▶◀↓↑".includes(ch);
}

function boxCharToSvg(ch: string, mx: number, my: number, colors: ThemeColors): string {
  const s = `stroke="${colors.line}" stroke-width="1.5" fill="none"`;
  const hw = HALF_W;
  const hh = HALF_H;

  switch (ch) {
    // Corners
    case "┌": return `<path d="M${mx},${my + hh} L${mx},${my + 2} Q${mx},${my} ${mx + 2},${my} L${mx + hw},${my}" ${s}/>`;
    case "┐": return `<path d="M${mx - hw},${my} L${mx - 2},${my} Q${mx},${my} ${mx},${my + 2} L${mx},${my + hh}" ${s}/>`;
    case "└": return `<path d="M${mx},${my - hh} L${mx},${my - 2} Q${mx},${my} ${mx + 2},${my} L${mx + hw},${my}" ${s}/>`;
    case "┘": return `<path d="M${mx - hw},${my} L${mx - 2},${my} Q${mx},${my} ${mx},${my - 2} L${mx},${my - hh}" ${s}/>`;

    // Double corners
    case "╔": return `<path d="M${mx},${my + hh} L${mx},${my} L${mx + hw},${my}" ${s} stroke-width="2.5"/>`;
    case "╗": return `<path d="M${mx - hw},${my} L${mx},${my} L${mx},${my + hh}" ${s} stroke-width="2.5"/>`;
    case "╚": return `<path d="M${mx},${my - hh} L${mx},${my} L${mx + hw},${my}" ${s} stroke-width="2.5"/>`;
    case "╝": return `<path d="M${mx - hw},${my} L${mx},${my} L${mx},${my - hh}" ${s} stroke-width="2.5"/>`;

    // Lines
    case "─": return `<line x1="${mx - hw}" y1="${my}" x2="${mx + hw}" y2="${my}" ${s}/>`;
    case "│": return `<line x1="${mx}" y1="${my - hh}" x2="${mx}" y2="${my + hh}" ${s}/>`;
    case "═": return `<line x1="${mx - hw}" y1="${my}" x2="${mx + hw}" y2="${my}" ${s} stroke-width="2.5"/>`;
    case "║": return `<line x1="${mx}" y1="${my - hh}" x2="${mx}" y2="${my + hh}" ${s} stroke-width="2.5"/>`;
    case "╌": return `<line x1="${mx - hw}" y1="${my}" x2="${mx + hw}" y2="${my}" ${s} stroke-dasharray="4 2"/>`;

    // T-junctions
    case "├": return `<line x1="${mx}" y1="${my - hh}" x2="${mx}" y2="${my + hh}" ${s}/><line x1="${mx}" y1="${my}" x2="${mx + hw}" y2="${my}" ${s}/>`;
    case "┤": return `<line x1="${mx}" y1="${my - hh}" x2="${mx}" y2="${my + hh}" ${s}/><line x1="${mx - hw}" y1="${my}" x2="${mx}" y2="${my}" ${s}/>`;
    case "┬": return `<line x1="${mx - hw}" y1="${my}" x2="${mx + hw}" y2="${my}" ${s}/><line x1="${mx}" y1="${my}" x2="${mx}" y2="${my + hh}" ${s}/>`;
    case "┴": return `<line x1="${mx - hw}" y1="${my}" x2="${mx + hw}" y2="${my}" ${s}/><line x1="${mx}" y1="${my - hh}" x2="${mx}" y2="${my}" ${s}/>`;

    // Double T-junctions
    case "╠": return `<line x1="${mx}" y1="${my - hh}" x2="${mx}" y2="${my + hh}" ${s} stroke-width="2.5"/><line x1="${mx}" y1="${my}" x2="${mx + hw}" y2="${my}" ${s} stroke-width="2.5"/>`;
    case "╣": return `<line x1="${mx}" y1="${my - hh}" x2="${mx}" y2="${my + hh}" ${s} stroke-width="2.5"/><line x1="${mx - hw}" y1="${my}" x2="${mx}" y2="${my}" ${s} stroke-width="2.5"/>`;
    case "╦": return `<line x1="${mx - hw}" y1="${my}" x2="${mx + hw}" y2="${my}" ${s} stroke-width="2.5"/><line x1="${mx}" y1="${my}" x2="${mx}" y2="${my + hh}" ${s} stroke-width="2.5"/>`;
    case "╩": return `<line x1="${mx - hw}" y1="${my}" x2="${mx + hw}" y2="${my}" ${s} stroke-width="2.5"/><line x1="${mx}" y1="${my - hh}" x2="${mx}" y2="${my}" ${s} stroke-width="2.5"/>`;

    // Cross
    case "┼": return `<line x1="${mx - hw}" y1="${my}" x2="${mx + hw}" y2="${my}" ${s}/><line x1="${mx}" y1="${my - hh}" x2="${mx}" y2="${my + hh}" ${s}/>`;
    case "╬": return `<line x1="${mx - hw}" y1="${my}" x2="${mx + hw}" y2="${my}" ${s} stroke-width="2.5"/><line x1="${mx}" y1="${my - hh}" x2="${mx}" y2="${my + hh}" ${s} stroke-width="2.5"/>`;

    default: return "";
  }
}

function arrowCharToSvg(ch: string, mx: number, my: number, colors: ThemeColors): string {
  const s = 5; // arrow size
  switch (ch) {
    case "▼": case "↓": return `<polygon points="${mx},${my + s} ${mx - s},${my - s} ${mx + s},${my - s}" fill="${colors.arrow}"/>`;
    case "▲": case "↑": return `<polygon points="${mx},${my - s} ${mx - s},${my + s} ${mx + s},${my + s}" fill="${colors.arrow}"/>`;
    case "→": case "▶": return `<polygon points="${mx + s},${my} ${mx - s},${my - s} ${mx - s},${my + s}" fill="${colors.arrow}"/>`;
    case "←": case "◀": return `<polygon points="${mx - s},${my} ${mx + s},${my - s} ${mx + s},${my + s}" fill="${colors.arrow}"/>`;
    default: return "";
  }
}

/**
 * Detect closed rectangular regions and generate subtle fill rectangles.
 */
function detectBoxFills(lines: string[], colors: ThemeColors): string {
  let fills = "";
  const visited = new Set<string>();

  for (let row = 0; row < lines.length; row++) {
    const line = lines[row] || "";
    for (let col = 0; col < line.length; col++) {
      if (line[col] === "┌" || line[col] === "╔") {
        const key = `${row},${col}`;
        if (visited.has(key)) continue;
        visited.add(key);

        // Trace right to find ┐
        let endCol = col + 1;
        while (endCol < line.length && line[endCol] !== "┐" && line[endCol] !== "╗") endCol++;
        if (endCol >= line.length) continue;

        // Trace down to find └
        let endRow = row + 1;
        while (endRow < lines.length) {
          const eLine = lines[endRow] || "";
          if ((eLine[col] === "└" || eLine[col] === "╚") && (eLine[endCol] === "┘" || eLine[endCol] === "╝")) break;
          endRow++;
        }
        if (endRow >= lines.length) continue;

        // Draw fill rectangle
        const x = col * CHAR_W + 10 + HALF_W;
        const y = row * LINE_H + 10 + HALF_H;
        const w = (endCol - col) * CHAR_W;
        const h = (endRow - row) * LINE_H;
        fills += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${colors.fill}" />`;
      }
    }
  }

  return fills;
}
