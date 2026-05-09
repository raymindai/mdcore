// Shared markdown-stripper for chunk / preview surfaces.
//
// Side panels and graph cards display the first 100-200 chars of a
// chunk's body as a one-line preview. Dumping raw markdown there shows
// **bold**, headings, [links](url), and code fences as syntax instead
// of human-readable text. This walks the common syntax and produces a
// flat preview string. Truncation is the caller's responsibility.

export function stripMarkdownPreview(md: string): string {
  return (md || "")
    .replace(/^---[\s\S]*?---\s*/m, "")               // frontmatter block
    .replace(/```[\s\S]*?```/g, " [code] ")           // fenced code blocks
    .replace(/`([^`]+)`/g, "$1")                       // inline code
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")             // images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")          // links → label
    .replace(/^#{1,6}\s+/gm, "")                       // ATX headings
    .replace(/^=+$|^-+$/gm, "")                        // setext heading underlines
    .replace(/(\*\*|__)(.+?)\1/g, "$2")               // bold
    .replace(/(\*|_)(.+?)\1/g, "$2")                  // italic
    .replace(/^\s*>\s+/gm, "")                         // blockquote
    .replace(/^\s*[-*+]\s+/gm, "")                     // unordered bullets
    .replace(/^\s*\d+\.\s+/gm, "")                     // ordered list
    .replace(/^\s*\|.*\|\s*$/gm, "")                   // table rows (raw)
    .replace(/\s+/g, " ")
    .trim();
}
