/**
 * Heuristic knowledge graph extraction from markdown documents.
 * Tier 1: instant, client-side, no API cost.
 * Extracts headings, code languages, bold keywords, links, and shared terms.
 * Builds graph nodes and edges based on concept co-occurrence.
 */

// ─── Types ───

export interface GraphNode {
  id: string;
  label: string;
  type: "document" | "concept" | "entity" | "tag";
  documentId?: string;
  weight: number;
  color?: string;
  metadata?: Record<string, unknown>;
}

export interface GraphEdge {
  source: string;
  target: string;
  label?: string;
  weight: number;
  type: "references" | "shares_concept" | "related" | "contains";
}

export interface GraphCluster {
  id: string;
  label: string;
  nodeIds: string[];
  color: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  clusters: GraphCluster[];
  version: number;
}

// ─── Cluster colors (matching mdfy accent palette) ───

const CLUSTER_COLORS = [
  "#fb923c", // orange (primary)
  "#60a5fa", // blue
  "#a78bfa", // purple
  "#4ade80", // green
  "#f472b6", // pink
  "#2dd4bf", // teal
  "#fbbf24", // yellow
  "#f87171", // red
];

// ─── Stop words (common terms to ignore) ───

const STOP_WORDS = new Set([
  "the", "be", "to", "of", "and", "a", "in", "that", "have", "i",
  "it", "for", "not", "on", "with", "he", "as", "you", "do", "at",
  "this", "but", "his", "by", "from", "they", "we", "say", "her",
  "she", "or", "an", "will", "my", "one", "all", "would", "there",
  "their", "what", "so", "up", "out", "if", "about", "who", "get",
  "which", "go", "me", "when", "make", "can", "like", "time", "no",
  "just", "him", "know", "take", "people", "into", "year", "your",
  "good", "some", "could", "them", "see", "other", "than", "then",
  "now", "look", "only", "come", "its", "over", "think", "also",
  "back", "after", "use", "two", "how", "our", "work", "first",
  "well", "way", "even", "new", "want", "because", "any", "these",
  "give", "day", "most", "us", "is", "are", "was", "were", "been",
  "has", "had", "did", "does", "doing", "being", "am",
  // Korean common particles/words
  "은", "는", "이", "가", "을", "를", "에", "에서", "의", "로", "으로",
  "와", "과", "하다", "있다", "없다", "되다", "것", "수", "등", "및",
]);

// ─── Extraction helpers ───

function extractHeadings(md: string): Array<{ level: number; text: string }> {
  const headings: Array<{ level: number; text: string }> = [];
  const regex = /^(#{1,3})\s+(.+)$/gm;
  let match;
  while ((match = regex.exec(md)) !== null) {
    headings.push({ level: match[1].length, text: match[2].trim() });
  }
  return headings;
}

function extractCodeLanguages(md: string): string[] {
  const langs = new Set<string>();
  const regex = /```(\w+)/g;
  let match;
  while ((match = regex.exec(md)) !== null) {
    const lang = match[1].toLowerCase();
    if (lang !== "text" && lang !== "plaintext" && lang !== "mermaid") {
      langs.add(lang);
    }
  }
  return Array.from(langs);
}

function extractBoldTerms(md: string): string[] {
  const terms: string[] = [];
  const regex = /\*\*([^*]+)\*\*/g;
  let match;
  while ((match = regex.exec(md)) !== null) {
    const term = match[1].trim().toLowerCase();
    if (term.length >= 2 && term.length <= 40 && !STOP_WORDS.has(term)) {
      terms.push(term);
    }
  }
  return terms;
}

function extractLinks(md: string): string[] {
  const urls: string[] = [];
  const regex = /\[([^\]]*)\]\(([^)]+)\)/g;
  let match;
  while ((match = regex.exec(md)) !== null) {
    urls.push(match[2]);
  }
  return urls;
}

function extractSignificantTerms(md: string): Map<string, number> {
  // Remove code blocks and links
  const cleaned = md
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]+`/g, "")
    .replace(/\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/[#*_~>|]/g, " ")
    .replace(/[^\w\s가-힣-]/g, " ");

  const termCounts = new Map<string, number>();

  // Extract 1-3 word phrases
  const words = cleaned.split(/\s+/).filter(w => w.length >= 3);
  for (let n = 1; n <= 2; n++) {
    for (let i = 0; i <= words.length - n; i++) {
      const phrase = words.slice(i, i + n).join(" ").toLowerCase();
      if (phrase.length < 3) continue;
      const phraseWords = phrase.split(" ");
      if (phraseWords.every(w => STOP_WORDS.has(w))) continue;
      if (phraseWords.some(w => w.length < 2)) continue;
      termCounts.set(phrase, (termCounts.get(phrase) || 0) + 1);
    }
  }

  // Filter to terms that appear at least twice
  const significant = new Map<string, number>();
  for (const [term, count] of termCounts) {
    if (count >= 2) {
      significant.set(term, count);
    }
  }

  return significant;
}

// ─── Main extraction ───

interface DocumentInput {
  id: string;
  title: string | null;
  markdown: string;
}

export function extractGraphHeuristic(documents: DocumentInput[]): GraphData {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const nodeIds = new Set<string>();

  // Per-document extraction
  const docData = documents.map(doc => {
    const headings = extractHeadings(doc.markdown);
    const codeLangs = extractCodeLanguages(doc.markdown);
    const boldTerms = extractBoldTerms(doc.markdown);
    const links = extractLinks(doc.markdown);
    const terms = extractSignificantTerms(doc.markdown);

    return { doc, headings, codeLangs, boldTerms, links, terms };
  });

  // 1. Add document nodes
  for (const { doc } of docData) {
    const nodeId = `doc:${doc.id}`;
    nodes.push({
      id: nodeId,
      label: doc.title || "Untitled",
      type: "document",
      documentId: doc.id,
      weight: Math.min(10, 3 + Math.log10(Math.max(1, doc.markdown.length))),
    });
    nodeIds.add(nodeId);
  }

  // 2. Collect all concepts across documents
  // concept → set of document IDs
  const conceptDocs = new Map<string, Set<string>>();

  for (const { doc, headings, codeLangs, boldTerms, terms } of docData) {
    // Headings as concepts
    for (const h of headings) {
      const key = h.text.toLowerCase();
      if (!conceptDocs.has(key)) conceptDocs.set(key, new Set());
      conceptDocs.get(key)!.add(doc.id);
    }

    // Code languages as concepts
    for (const lang of codeLangs) {
      const key = `lang:${lang}`;
      if (!conceptDocs.has(key)) conceptDocs.set(key, new Set());
      conceptDocs.get(key)!.add(doc.id);
    }

    // Bold terms as concepts
    for (const term of boldTerms) {
      if (!conceptDocs.has(term)) conceptDocs.set(term, new Set());
      conceptDocs.get(term)!.add(doc.id);
    }

    // Significant terms
    for (const [term, count] of terms) {
      if (count >= 3) {
        if (!conceptDocs.has(term)) conceptDocs.set(term, new Set());
        conceptDocs.get(term)!.add(doc.id);
      }
    }
  }

  // 3. Add concept nodes for terms shared across 2+ documents (max 20)
  const candidateConcepts: Array<{ key: string; label: string; docIds: string[]; weight: number }> = [];

  for (const [key, docSet] of conceptDocs) {
    if (docSet.size < 2) continue;
    const label = key.startsWith("lang:") ? key.slice(5) : key;
    candidateConcepts.push({ key, label, docIds: Array.from(docSet), weight: docSet.size });
  }

  // Sort by weight (most shared first), limit to top 20
  candidateConcepts.sort((a, b) => b.weight - a.weight);
  const sharedConcepts = candidateConcepts.slice(0, 20);

  for (const concept of sharedConcepts) {
    const type = concept.key.startsWith("lang:") ? "tag" as const : "concept" as const;
    const nodeId = `concept:${concept.key}`;
    if (!nodeIds.has(nodeId)) {
      nodes.push({
        id: nodeId,
        label: concept.label,
        type,
        weight: Math.min(8, 1 + concept.weight),
      });
      nodeIds.add(nodeId);
    }
  }

  // 4. Add edges: document → concept (contains)
  for (const concept of sharedConcepts) {
    const conceptNodeId = `concept:${concept.key}`;
    for (const docId of concept.docIds) {
      edges.push({
        source: `doc:${docId}`,
        target: conceptNodeId,
        weight: concept.weight,
        type: "contains",
      });
    }
  }

  // 5. Add direct edges between documents that share many concepts
  for (let i = 0; i < docData.length; i++) {
    for (let j = i + 1; j < docData.length; j++) {
      const doc1 = docData[i].doc;
      const doc2 = docData[j].doc;

      // Count shared concepts
      let sharedCount = 0;
      for (const concept of sharedConcepts) {
        if (concept.docIds.includes(doc1.id) && concept.docIds.includes(doc2.id)) {
          sharedCount++;
        }
      }

      if (sharedCount >= 2) {
        edges.push({
          source: `doc:${doc1.id}`,
          target: `doc:${doc2.id}`,
          label: `${sharedCount} shared`,
          weight: Math.min(5, sharedCount),
          type: "related",
        });
      }
    }
  }

  // 6. Check for cross-document links (direct references)
  for (const { doc, links } of docData) {
    for (const link of links) {
      for (const other of documents) {
        if (other.id !== doc.id && link.includes(other.id)) {
          // Direct reference from doc to other
          const edgeExists = edges.some(
            e => e.source === `doc:${doc.id}` && e.target === `doc:${other.id}` && e.type === "references"
          );
          if (!edgeExists) {
            edges.push({
              source: `doc:${doc.id}`,
              target: `doc:${other.id}`,
              weight: 3,
              type: "references",
            });
          }
        }
      }
    }
  }

  // 7. Build clusters using simple connected-component grouping
  const clusters = buildClusters(nodes, edges);

  return { nodes, edges, clusters, version: 1 };
}

function buildClusters(nodes: GraphNode[], edges: GraphEdge[]): GraphCluster[] {
  const docNodes = nodes.filter(n => n.type === "document");
  if (docNodes.length <= 1) return [];

  // Simple union-find for clustering
  const parent = new Map<string, string>();
  for (const node of docNodes) parent.set(node.id, node.id);

  function find(x: string): string {
    while (parent.get(x) !== x) {
      parent.set(x, parent.get(parent.get(x)!)!);
      x = parent.get(x)!;
    }
    return x;
  }

  function union(a: string, b: string) {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  }

  // Union documents connected by "related" or "references" edges
  for (const edge of edges) {
    if (edge.type === "related" || edge.type === "references") {
      if (parent.has(edge.source) && parent.has(edge.target)) {
        union(edge.source, edge.target);
      }
    }
  }

  // Group by root
  const groups = new Map<string, string[]>();
  for (const node of docNodes) {
    const root = find(node.id);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(node.id);
  }

  // Build cluster objects
  const clusters: GraphCluster[] = [];
  let colorIdx = 0;
  for (const [, memberIds] of groups) {
    if (memberIds.length < 2) continue;

    // Include concept nodes connected to these documents
    const allNodeIds = new Set(memberIds);
    for (const edge of edges) {
      if (edge.type === "contains") {
        if (allNodeIds.has(edge.source)) allNodeIds.add(edge.target);
        if (allNodeIds.has(edge.target)) allNodeIds.add(edge.source);
      }
    }

    clusters.push({
      id: `cluster:${colorIdx}`,
      label: `Group ${colorIdx + 1}`,
      nodeIds: Array.from(allNodeIds),
      color: CLUSTER_COLORS[colorIdx % CLUSTER_COLORS.length],
    });
    colorIdx++;
  }

  return clusters;
}
