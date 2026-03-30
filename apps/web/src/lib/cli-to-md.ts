/**
 * Convert CLI/terminal output (Claude Code, etc.) to Markdown.
 * Handles unicode box-drawing tables, checkmarks, special symbols, indented lists.
 */

/**
 * Detect if text looks like CLI/terminal output
 */
export function isCliOutput(text: string): boolean {
  const indicators = [
    /[┌┐└┘├┤┬┴┼─│]/,        // Box-drawing characters
    /[⏺✻❯⚡]/,               // Claude Code symbols
    /✅|⬜|☑|☐/,              // Checkmarks
    /^\s{2,}-\s/m,            // Indented list items
    /\d+\.\s.*\n\s{2,}/m,    // Numbered items with indented continuation
  ];
  let score = 0;
  for (const pattern of indicators) {
    if (pattern.test(text)) score++;
  }
  return score >= 2;
}

/**
 * Convert CLI output to Markdown
 */
export function cliToMarkdown(text: string): string {
  let md = text;

  // ─── Unicode table → Markdown table ───
  md = convertUnicodeTables(md);

  // ─── Checkmarks → Task list ───
  md = md.replace(/^\s*[✅☑]\s*/gm, "- [x] ");
  md = md.replace(/^\s*[⬜☐]\s*/gm, "- [ ] ");

  // ─── Remove Claude Code decorators ───
  md = md.replace(/^⏺\s*/gm, "## ");
  md = md.replace(/^✻.*$/gm, "---");
  md = md.replace(/^❯\s*/gm, "> ");

  // ─── Arrow indicators → emphasis ───
  md = md.replace(/\s*←\s*(.+)$/gm, " — *$1*");

  // ─── Indented sections with headers ───
  // Lines that start with text and end with colon, followed by indented content
  md = md.replace(/^(\S[^\n:]+):?\s*\n((?:\s{2,}[^\n]+\n?)+)/gm, (_, header, body) => {
    const trimmedHeader = header.trim().replace(/:$/, "");
    // Check if body lines look like list items
    const lines = body.split("\n").filter((l: string) => l.trim());
    const isList = lines.every((l: string) => /^\s+[-•\d.]/.test(l) || /^\s+\S/.test(l));
    if (isList) {
      const listItems = lines.map((l: string) => {
        const trimmed = l.trim();
        // Already has list marker
        if (/^[-•]/.test(trimmed)) return `- ${trimmed.replace(/^[-•]\s*/, "")}`;
        if (/^\d+[.)]\s/.test(trimmed)) return trimmed;
        return `- ${trimmed}`;
      });
      return `### ${trimmedHeader}\n\n${listItems.join("\n")}\n\n`;
    }
    return `### ${trimmedHeader}\n\n${body.replace(/^\s{2,}/gm, "")}\n`;
  });

  // ─── Clean up ───
  md = md.replace(/\n{3,}/g, "\n\n");
  md = md.trim();

  return md;
}

/**
 * Convert unicode box-drawing tables to Markdown tables
 */
function convertUnicodeTables(text: string): string {
  const lines = text.split("\n");
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Detect table start: line with ┌ or ╔
    if (/[┌╔]/.test(line) && /[─═]/.test(line)) {
      const tableLines: string[] = [];
      // Collect all table lines until closing ┘ or ╝
      while (i < lines.length) {
        tableLines.push(lines[i]);
        if (/[┘╝]/.test(lines[i])) { i++; break; }
        i++;
      }
      result.push(convertBoxTable(tableLines));
      continue;
    }

    result.push(line);
    i++;
  }

  return result.join("\n");
}

function convertBoxTable(lines: string[]): string {
  const rows: string[][] = [];

  for (const line of lines) {
    // Skip border lines (only box chars)
    if (/^[\s┌┐└┘├┤┬┴┼─│╔╗╚╝╠╣╦╩╬═║\s]+$/.test(line) && !/│.*\S.*│/.test(line) && !/║.*\S.*║/.test(line)) {
      continue;
    }

    // Data rows: split by │ or ║
    if (/[│║]/.test(line)) {
      const cells = line
        .split(/[│║]/)
        .slice(1, -1) // Remove first/last empty from border
        .map(c => c.trim());
      if (cells.length > 0 && cells.some(c => c.length > 0)) {
        rows.push(cells);
      }
    }
  }

  if (rows.length === 0) return lines.join("\n");

  // First row is header
  const colCount = Math.max(...rows.map(r => r.length));
  const padded = rows.map(r => {
    while (r.length < colCount) r.push("");
    return r;
  });

  const header = `| ${padded[0].join(" | ")} |`;
  const separator = `| ${padded[0].map(() => "---").join(" | ")} |`;
  const body = padded.slice(1).map(r => `| ${r.join(" | ")} |`).join("\n");

  return [header, separator, body].join("\n");
}
