/**
 * Convert CLI/terminal output to Markdown.
 * Handles unicode box-drawing tables, checkmarks, Claude Code symbols, indented lists.
 */

/**
 * Detect if text looks like CLI/terminal output.
 */
export function isCliOutput(text: string): boolean {
  const indicators = [
    /[┌┐└┘├┤┬┴┼─│]/,
    /[⏺✻❯⚡]/,
    /✅|⬜|☑|☐/,
    /^\s{2,}-\s/m,
    /\d+\.\s.*\n\s{2,}/m,
  ];
  let score = 0;
  for (const pattern of indicators) {
    if (pattern.test(text)) score++;
  }
  return score >= 2;
}

/**
 * Convert CLI output to Markdown.
 */
export function cliToMarkdown(text: string): string {
  let md = text;

  md = convertUnicodeTables(md);

  // Checkmarks → Task list
  md = md.replace(/^\s*[✅☑]\s*/gm, "- [x] ");
  md = md.replace(/^\s*[⬜☐]\s*/gm, "- [ ] ");

  // Claude Code decorators
  md = md.replace(/^⏺\s*/gm, "## ");
  md = md.replace(/^✻.*$/gm, "---");
  md = md.replace(/^❯\s*/gm, "> ");

  // Arrow indicators → emphasis
  md = md.replace(/\s*←\s*(.+)$/gm, " — *$1*");

  // Indented sections with headers
  md = md.replace(
    /^(\S[^\n:]+):?\s*\n((?:\s{2,}[^\n]+\n)*(?:\s{2,}[^\n]+))/gm,
    (_, header, body) => {
      const trimmedHeader = header.trim().replace(/:$/, "");
      const lines = body.split("\n").filter((l: string) => l.trim());
      const isList = lines.every(
        (l: string) => /^\s+[-•\d.]/.test(l) || /^\s+\S/.test(l)
      );
      if (isList) {
        const listItems = lines.map((l: string) => {
          const trimmed = l.trim();
          if (/^[-•]/.test(trimmed))
            return `- ${trimmed.replace(/^[-•]\s*/, "")}`;
          if (/^\d+[.)]\s/.test(trimmed)) return trimmed;
          return `- ${trimmed}`;
        });
        return `### ${trimmedHeader}\n\n${listItems.join("\n")}\n\n`;
      }
      return `### ${trimmedHeader}\n\n${body.replace(/^\s{2,}/gm, "")}\n`;
    }
  );

  md = md.replace(/\n{3,}/g, "\n\n");
  return md.trim();
}

function convertUnicodeTables(text: string): string {
  const lines = text.split("\n");
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (/[┌╔]/.test(line) && /[─═]/.test(line)) {
      const tableLines: string[] = [];
      while (i < lines.length) {
        tableLines.push(lines[i]);
        if (/[┘╝]/.test(lines[i])) {
          i++;
          break;
        }
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
    if (
      /^[\s┌┐└┘├┤┬┴┼─│╔╗╚╝╠╣╦╩╬═║\s]+$/.test(line) &&
      !/│.*\S.*│/.test(line) &&
      !/║.*\S.*║/.test(line)
    ) {
      continue;
    }
    if (/[│║]/.test(line)) {
      const cells = line
        .split(/[│║]/)
        .slice(1, -1)
        .map((c) => c.trim());
      if (cells.length > 0 && cells.some((c) => c.length > 0)) {
        rows.push(cells);
      }
    }
  }

  if (rows.length === 0) return lines.join("\n");

  const colCount = Math.max(...rows.map((r) => r.length));
  const padded = rows.map((r) => {
    while (r.length < colCount) r.push("");
    return r;
  });

  const header = `| ${padded[0].join(" | ")} |`;
  const separator = `| ${padded[0].map(() => "---").join(" | ")} |`;
  const body = padded
    .slice(1)
    .map((r) => `| ${r.join(" | ")} |`)
    .join("\n");

  return [header, separator, body].join("\n");
}
