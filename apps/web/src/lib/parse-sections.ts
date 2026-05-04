/**
 * Decompose a markdown document into editable sections.
 *
 * A "section" is a heading + everything until the next heading at the same or
 * shallower level. The very first chunk of content (before any heading) is
 * captured as a level-0 "preamble" section so that round-tripping
 * parse → edit → assemble preserves the document.
 *
 * Heading detection is intentionally simple (ATX-style only, ignoring fenced
 * code blocks). Setext-style headings (=== / ---) and headings inside code
 * blocks are NOT treated as section boundaries — that matches what users
 * usually mean when they say "split this doc by H1/H2/H3".
 */

export interface Section {
  /** Stable id for React keys; regenerated on every parse, do not persist. */
  id: string;
  /** 0 = preamble (no heading), 1..6 = ATX heading level */
  level: number;
  /** Heading text (without leading #s); empty for preamble */
  heading: string;
  /** Markdown body — content after the heading line up to the next heading.
   *  For preamble, this is everything before the first heading. */
  body: string;
}

const HEADING_RE = /^(#{1,6})\s+(.+?)\s*#*\s*$/;
const FENCE_RE = /^(`{3,}|~{3,})/;

export function parseSections(md: string): Section[] {
  const lines = md.split("\n");
  const sections: Section[] = [];

  let inFence = false;
  let fenceMarker = "";
  let preambleLines: string[] = [];
  let current: { level: number; heading: string; bodyLines: string[] } | null = null;

  const closeCurrent = () => {
    if (current) {
      sections.push({
        id: `s${sections.length}`,
        level: current.level,
        heading: current.heading,
        body: current.bodyLines.join("\n").replace(/^\n+|\n+$/g, ""),
      });
      current = null;
    }
  };

  for (const line of lines) {
    // Track fenced code blocks so we don't treat `# something` inside them as a heading
    const fenceMatch = line.match(FENCE_RE);
    if (fenceMatch) {
      if (!inFence) {
        inFence = true;
        fenceMarker = fenceMatch[1];
      } else if (line.startsWith(fenceMarker)) {
        inFence = false;
        fenceMarker = "";
      }
    }

    const headingMatch = !inFence ? line.match(HEADING_RE) : null;
    if (headingMatch) {
      if (current === null && preambleLines.length > 0) {
        // Flush preamble before the first heading
        sections.push({
          id: `s${sections.length}`,
          level: 0,
          heading: "",
          body: preambleLines.join("\n").replace(/^\n+|\n+$/g, ""),
        });
        preambleLines = [];
      }
      closeCurrent();
      current = {
        level: headingMatch[1].length,
        heading: headingMatch[2].trim(),
        bodyLines: [],
      };
    } else if (current) {
      current.bodyLines.push(line);
    } else {
      preambleLines.push(line);
    }
  }

  if (current === null && preambleLines.length > 0) {
    // Document had no headings at all
    sections.push({
      id: `s${sections.length}`,
      level: 0,
      heading: "",
      body: preambleLines.join("\n").replace(/^\n+|\n+$/g, ""),
    });
  }
  closeCurrent();

  return sections;
}

/**
 * Inverse of parseSections — stitch sections back into a markdown string.
 * Preserves heading levels; preamble (level 0) emits its body only.
 */
export function assembleSections(sections: Section[]): string {
  return sections
    .map(s => {
      if (s.level === 0) return s.body;
      const hashes = "#".repeat(Math.min(6, Math.max(1, s.level)));
      const head = `${hashes} ${s.heading}`.trimEnd();
      return s.body ? `${head}\n\n${s.body}` : head;
    })
    .filter(Boolean)
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim() + "\n";
}

/**
 * Short preview of a section body for display on a section node.
 * Strips heading markers, code fences, and link/image syntax.
 */
export function sectionPreview(body: string, maxChars = 120): string {
  if (!body) return "";
  const cleaned = body
    .replace(/```[\s\S]*?```/g, "[code]")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!?\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/^\s*[>\-*+]\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^\s*\|.*\|\s*$/gm, "")
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ");
  return cleaned.length > maxChars ? cleaned.slice(0, maxChars - 1).trim() + "…" : cleaned;
}
