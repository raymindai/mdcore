/**
 * Render ASCII box-drawing art as clean SVG.
 * Each character maps to a grid cell.
 * Box-drawing characters → SVG lines/arcs.
 * Text → SVG text elements.
 * Arrows → SVG triangles.
 */

const CHAR_W = 9;   // half-width character width in px
const LINE_H = 18;  // line height in px
const HALF_H = LINE_H / 2;

/**
 * Check if a character is full-width (CJK, Hangul, etc).
 * Full-width chars take 2x the space of ASCII in monospace fonts.
 */
function isFullWidth(ch: string): boolean {
  const code = ch.charCodeAt(0);
  return (
    (code >= 0x1100 && code <= 0x11FF) ||   // Hangul Jamo
    (code >= 0x2E80 && code <= 0x9FFF) ||   // CJK
    (code >= 0xAC00 && code <= 0xD7AF) ||   // Hangul Syllables
    (code >= 0xF900 && code <= 0xFAFF) ||   // CJK Compatibility
    (code >= 0xFE10 && code <= 0xFE6F) ||   // CJK Forms
    (code >= 0xFF01 && code <= 0xFF60) ||   // Fullwidth Forms
    (code >= 0xFFE0 && code <= 0xFFE6)      // Fullwidth Signs
  );
}

/**
 * Get x position for a column, accounting for full-width characters.
 */
function getCharX(line: string, col: number): number {
  let x = 0;
  for (let i = 0; i < col && i < line.length; i++) {
    x += isFullWidth(line[i]) ? CHAR_W * 2 : CHAR_W;
  }
  return x;
}

/**
 * Get the width a character takes.
 */
function getCharWidth(ch: string): number {
  return isFullWidth(ch) ? CHAR_W * 2 : CHAR_W;
}

// Colors (CSS variables don't work in SVG inline, so we use actual values)
interface ThemeColors {
  line: string;
  text: string;
  fill: string;
  bg: string;
  arrow: string;
}

const DARK_COLORS: ThemeColors = {
  line: "#737373",   // zinc-600
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
  const rows = lines.length;

  // Calculate max width accounting for full-width characters
  const maxWidth = Math.max(...lines.map(l => {
    let w = 0;
    for (let i = 0; i < l.length; i++) w += getCharWidth(l[i]);
    return w;
  }));

  const width = maxWidth + 20;
  const height = rows * LINE_H + 20;

  const svgParts: string[] = [];
  const textRuns: { x: number; y: number; text: string }[] = [];

  for (let row = 0; row < rows; row++) {
    const line = lines[row] || "";
    let textBuffer = "";
    let textStartX = -1;

    for (let col = 0; col < line.length; col++) {
      const ch = line[col];
      const cx = getCharX(line, col) + 10;
      const cw = getCharWidth(ch);
      const cy = row * LINE_H + 10;
      const mx = cx + cw / 2;
      const my = cy + HALF_H;

      if (isBoxChar(ch)) {
        if (textBuffer.trim()) {
          textRuns.push({ x: textStartX, y: row * LINE_H + 10 + HALF_H + 4, text: textBuffer });
        }
        textBuffer = "";
        textStartX = -1;

        const halfW = cw / 2;
        svgParts.push(boxCharToSvgDynamic(ch, mx, my, halfW, HALF_H, colors));
      } else if (isStandaloneArrow(ch, line, col)) {
        if (textBuffer.trim()) {
          textRuns.push({ x: textStartX, y: row * LINE_H + 10 + HALF_H + 4, text: textBuffer });
        }
        textBuffer = "";
        textStartX = -1;
        svgParts.push(arrowCharToSvg(ch, mx, my, colors));
      } else if (ch !== " " || textBuffer.length > 0) {
        if (textStartX === -1) textStartX = cx;
        textBuffer += ch;
      }
    }

    if (textBuffer.trim()) {
      textRuns.push({ x: textStartX, y: row * LINE_H + 10 + HALF_H + 4, text: textBuffer });
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
  return "▼▲▶◀↓↑".includes(ch); // NOT → ← (they appear in text)
}

/**
 * Only treat arrow chars as arrows if they're standalone
 * (surrounded by spaces or box chars, not in the middle of text)
 */
function isStandaloneArrow(ch: string, line: string, col: number): boolean {
  if (!isArrowChar(ch)) return false;
  const prev = col > 0 ? line[col - 1] : " ";
  const next = col < line.length - 1 ? line[col + 1] : " ";
  return (prev === " " || isBoxChar(prev)) && (next === " " || isBoxChar(next));
}

function boxCharToSvgDynamic(ch: string, mx: number, my: number, hw: number, hh: number, colors: ThemeColors): string {
  const s = `stroke="${colors.line}" stroke-width="1.5" fill="none"`;

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

        // Draw fill rectangle using dynamic widths
        const x = getCharX(line, col) + 10 + getCharWidth(line[col]) / 2;
        const y = row * LINE_H + 10 + HALF_H;
        const w = getCharX(line, endCol) - getCharX(line, col);
        const h = (endRow - row) * LINE_H;
        fills += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${colors.fill}" />`;
      }
    }
  }

  return fills;
}
