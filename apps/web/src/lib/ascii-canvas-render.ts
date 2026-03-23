/**
 * Render ASCII art to a <canvas> element with pixel-perfect alignment.
 * Uses measureText() to handle CJK/emoji mixed-width characters correctly.
 */

export function renderAsciiToCanvas(
  text: string,
  container: HTMLElement,
  isDark: boolean
): void {
  const lines = text.split("\n");
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Font setup — use a reliable monospace font
  const fontSize = 14;
  const lineHeight = fontSize * 1.6;
  const font = `${fontSize}px "SF Mono", "Menlo", "Monaco", "Cascadia Code", "Consolas", monospace`;
  ctx.font = font;

  // Measure the baseline character width (ASCII "0")
  const charW = ctx.measureText("0").width;

  // Colors
  const colors = isDark
    ? { bg: "#18181b", text: "#d4d4d8", line: "#71717a", accent: "#fb923c" }
    : { bg: "#f8f9fa", text: "#3f3f46", line: "#a1a1aa", accent: "#ea580c" };

  // Calculate canvas dimensions
  // For each line, calculate the total width accounting for actual character widths
  let maxWidth = 0;
  const lineWidths: number[] = [];
  for (const line of lines) {
    const w = ctx.measureText(line).width;
    lineWidths.push(w);
    if (w > maxWidth) maxWidth = w;
  }

  const padding = 24;
  const width = Math.ceil(maxWidth + padding * 2);
  const height = Math.ceil(lines.length * lineHeight + padding * 2);

  // Set canvas size (with devicePixelRatio for sharp rendering)
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.scale(dpr, dpr);

  // Background
  ctx.fillStyle = colors.bg;
  roundRect(ctx, 0, 0, width, height, 12);
  ctx.fill();

  // Render each line
  ctx.font = font;
  ctx.textBaseline = "middle";

  for (let row = 0; row < lines.length; row++) {
    const line = lines[row];
    const y = padding + row * lineHeight + lineHeight / 2;
    let x = padding;

    for (let col = 0; col < line.length; col++) {
      const ch = line[col];

      // Choose color based on character type
      if (isBoxDrawing(ch)) {
        ctx.fillStyle = colors.line;
      } else if (isArrow(ch)) {
        ctx.fillStyle = colors.accent;
      } else if (isProgressBlock(ch)) {
        ctx.fillStyle = colors.accent;
      } else {
        ctx.fillStyle = colors.text;
      }

      ctx.fillText(ch, x, y);
      x += ctx.measureText(ch).width;
    }
  }

  // Replace container content with canvas
  container.innerHTML = "";
  container.style.textAlign = "center";
  container.style.padding = "0.5rem";
  container.style.overflow = "auto";
  canvas.style.maxWidth = "100%";
  canvas.style.height = "auto";
  canvas.style.borderRadius = "8px";
  container.appendChild(canvas);
}

function isBoxDrawing(ch: string): boolean {
  return "┌┐└┘│─├┤┬┴┼╌═║╔╗╚╝╠╣╦╩╬┊┈".includes(ch);
}

function isArrow(ch: string): boolean {
  return "▼▲→←▶◀↓↑".includes(ch);
}

function isProgressBlock(ch: string): boolean {
  return "█▓▒░".includes(ch);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
