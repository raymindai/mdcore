/** Extract title from markdown (first # heading, or first line) */
export function extractTitleFromMd(md: string): string {
  const match = md.match(/^#\s+(.+)/m);
  return match ? match[1].trim() : "Untitled";
}
