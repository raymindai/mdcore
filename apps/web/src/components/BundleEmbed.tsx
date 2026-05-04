"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { renderMarkdown } from "@/lib/engine";
import { postProcessHtml } from "@/lib/postprocess";
import { parseSections, assembleSections, type Section } from "@/lib/parse-sections";
import { aggregateDiscoveries, type ChunkRef, type TensionItem, type ThreadItem } from "@/lib/discoveries";
import Tooltip from "@/components/Tooltip";
import { Layers, AlertTriangle, HelpCircle, GitBranch, Sparkles, Lightbulb, X as XIcon } from "lucide-react";

// Mirror of the AI route's response shape — kept inline to avoid a public type.
export interface SemanticChunk {
  id: string;
  type: string;
  label: string;
  content: string;
  weight: number;
  found?: boolean;
}
export interface SemanticEdge {
  source: string;
  target: string;
  type: string;
  label?: string;
  weight: number;
}
export interface SemanticChunksResult {
  chunks: SemanticChunk[];
  edges: SemanticEdge[];
  version?: number;
}

const BundleCanvas = dynamic(() => import("@/components/BundleCanvas"), { ssr: false });

interface BundleDocument {
  id: string;
  title: string | null;
  markdown: string;
  created_at: string;
  updated_at: string;
}

interface BundleEmbedProps {
  bundleId: string;
  view?: "canvas" | "list";
  onOpenDoc?: (docId: string) => void;
  // External "AI panel is open" signal — when true, the canvas auto-closes
  // its NodeInfoPanel (right side). Used to keep the right side of the screen
  // mutually exclusive between the canvas-info panel and the AI chat.
  aiPanelOpen?: boolean;
  // Called by the canvas right after it opens its NodeInfoPanel so the parent
  // (MdEditor) can close the AI panel. Same mutual-exclusivity pact.
  onSelectNodeInfo?: () => void;
  // Fires when this component creates a new doc (synthesis save, extract,
  // etc.). The parent (MdEditor) registers the new doc as a tab marked
  // `unread: true` so the sidebar shows a pulsing orange dot until the user
  // opens it.
  onDocCreated?: (info: { docId: string; title: string; markdown?: string }) => void;
  // Authoritative auth headers from the parent (MdEditor): Bearer JWT +
  // x-anonymous-id + x-user-id + x-user-email. When provided, BundleEmbed
  // uses these for ALL API calls instead of best-effort localStorage probing,
  // which fails for signed-in users (Supabase stores tokens in cookies, not
  // localStorage, so reading "mdfy-user-id" gives null → 403 Unauthorized).
  authHeaders?: Record<string, string>;
}

export default function BundleEmbed({ bundleId, view = "canvas", onOpenDoc, aiPanelOpen, onSelectNodeInfo, onDocCreated, authHeaders: parentAuthHeaders }: BundleEmbedProps) {
  const [documents, setDocuments] = useState<BundleDocument[]>([]);
  const [aiGraph, setAiGraph] = useState<any>(null);
  const [editToken, setEditToken] = useState<string | null>(null);
  const [bundleIntent, setBundleIntent] = useState<string>("");
  const [bundleIsOwner, setBundleIsOwner] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNodeInfo, setSelectedNodeInfo] = useState<{
    type: string; label: string; weight?: number; description?: string;
    summary?: string; themes?: string[]; insights?: string[];
    keyTakeaways?: string[]; gaps?: string[];
    connectedDocs?: Array<{ id: string; title: string }>;
    relationships?: Array<{ label: string; target: string }>;
    docId?: string;
    docContent?: string;
    docStats?: { wordCount: number; readingTime: number; sections: number; hasCode: boolean };
    documentSummary?: string;
  } | null>(null);

  // Fetch bundle data
  useEffect(() => {
    setIsLoading(true);
    // Prefer parent auth headers (Bearer JWT for signed-in users) — fall back
    // to localStorage for the standalone bundle viewer.
    let headers: Record<string, string> = {};
    if (parentAuthHeaders) {
      headers = { ...parentAuthHeaders };
    } else {
      const anonId = localStorage.getItem("mdfy-anonymous-id");
      if (anonId) headers["x-anonymous-id"] = anonId;
      const userId = localStorage.getItem("mdfy-user-id");
      if (userId) headers["x-user-id"] = userId;
    }

    fetch(`/api/bundles/${bundleId}`, { headers })
      .then(res => res.ok ? res.json() : null)
      .then(async (data) => {
        if (!data) { setIsLoading(false); return; }
        setDocuments(data.documents || []);
        if (data.editToken) setEditToken(data.editToken);
        if (data.graph_data) setAiGraph(data.graph_data);
        if (typeof data.intent === "string") setBundleIntent(data.intent);
        setBundleIsOwner(!!data.isOwner);
        setIsLoading(false);

        // Background: pull cached decompositions for every doc in parallel.
        // Each one that hits cache lights up Discoveries without the user
        // having to click "Run discovery". Cache misses (404s) are silent —
        // we don't auto-decompose, that's the user's deliberate action.
        const docList: Array<{ id: string }> = data.documents || [];
        if (docList.length > 0) {
          docList.forEach(d => {
            fetch(`/api/docs/${d.id}/decompose`, { headers })
              .then(r => r.ok ? r.json() : null)
              .then(payload => {
                if (payload?.semanticChunks) {
                  setDecompositionByDocId(prev => prev[d.id] ? prev : { ...prev, [d.id]: payload.semanticChunks });
                }
              })
              .catch(() => { /* missing cache — skip */ });
          });
        }

        // Auto-trigger AI analysis if no cached graph
        if (!data.graph_data && data.documents?.length >= 2) {
          setIsAnalyzing(true);
          try {
            const res = await fetch(`/api/bundles/${bundleId}/graph`, {
              method: "POST",
              headers: { "Content-Type": "application/json", ...headers },
              body: JSON.stringify({ editToken: data.editToken }),
            });
            if (res.ok) {
              const g = await res.json();
              setAiGraph(g.graphData);
            }
          } catch { /* AI not available */ }
          setIsAnalyzing(false);
        }
      })
      .catch(() => setIsLoading(false));
  }, [bundleId, parentAuthHeaders]);

  const handleCopyContext = useCallback(async () => {
    const context = documents.map((doc, i) => {
      return `--- Document ${i + 1}: ${doc.title || "Untitled"} ---\n\n${doc.markdown}`;
    }).join("\n\n---\n\n");
    try { await navigator.clipboard.writeText(context); } catch { /* clipboard error */ }
  }, [documents]);

  const handleRegenerate = useCallback(async () => {
    setAiGraph(null);
    setIsAnalyzing(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const anonId = localStorage.getItem("mdfy-anonymous-id");
      if (anonId) headers["x-anonymous-id"] = anonId;
      const res = await fetch(`/api/bundles/${bundleId}/graph`, {
        method: "POST", headers,
        body: JSON.stringify({ editToken }),
      });
      if (res.ok) {
        const g = await res.json();
        setAiGraph(g.graphData);
      }
    } catch { /* error */ }
    setIsAnalyzing(false);
  }, [bundleId, editToken]);

  // Build auth headers for bundle PATCH (uses anonymousId or userId/email)
  // Mutual exclusivity with AI chat panel: when the parent opens the AI chat,
  // close our NodeInfoPanel so the right side doesn't show two stacked panels.
  useEffect(() => {
    if (aiPanelOpen && selectedNodeInfo) setSelectedNodeInfo(null);
  }, [aiPanelOpen, selectedNodeInfo]);

  // Wrap setSelectedNodeInfo with a notification to the parent — when we open
  // a node info panel, the parent should close the AI chat.
  const openNodeInfo = useCallback((info: typeof selectedNodeInfo) => {
    if (info) onSelectNodeInfo?.();
    setSelectedNodeInfo(info);
  }, [onSelectNodeInfo]);

  // Prefer parent (MdEditor) auth headers — they include the live Bearer JWT
  // for signed-in users, which the localStorage fallback below cannot provide
  // (Supabase stores tokens in cookies, not localStorage). Without this, the
  // decompose API returns 403 for every signed-in user even though they own
  // the doc.
  const buildPatchHeaders = useCallback(() => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (parentAuthHeaders) {
      Object.assign(headers, parentAuthHeaders);
      return headers;
    }
    try {
      const anonId = localStorage.getItem("mdfy-anonymous-id");
      if (anonId) headers["x-anonymous-id"] = anonId;
      const userId = localStorage.getItem("mdfy-user-id");
      if (userId) headers["x-user-id"] = userId;
      const userEmail = localStorage.getItem("mdfy-user-email");
      if (userEmail) headers["x-user-email"] = userEmail;
    } catch { /* ignore */ }
    return headers;
  }, [parentAuthHeaders]);

  // Remove a single document from this bundle
  const handleRemoveDoc = useCallback(async (docId: string) => {
    const doc = documents.find(d => d.id === docId);
    const title = doc?.title || "this document";
    if (!confirm(`Remove "${title}" from this bundle?`)) return;
    // Optimistic update
    setDocuments(prev => prev.filter(d => d.id !== docId));
    if (selectedNodeInfo?.docId === docId) setSelectedNodeInfo(null);
    try {
      const res = await fetch(`/api/bundles/${bundleId}`, {
        method: "PATCH",
        headers: buildPatchHeaders(),
        body: JSON.stringify({ action: "remove-documents", documentIds: [docId], editToken }),
      });
      if (!res.ok) {
        // Rollback
        if (doc) setDocuments(prev => [...prev, doc]);
      }
    } catch {
      if (doc) setDocuments(prev => [...prev, doc]);
    }
  }, [bundleId, editToken, documents, selectedNodeInfo, buildPatchHeaders]);

  // ─── Decompose: explode a single doc into AI-derived semantic chunks ───
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);
  const [decompositionByDocId, setDecompositionByDocId] = useState<Record<string, SemanticChunksResult>>({});
  const [decomposingDocId, setDecomposingDocId] = useState<string | null>(null);
  const [decomposeError, setDecomposeError] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<{ docId: string; section: Section } | null>(null);
  const [editingChunk, setEditingChunk] = useState<{ docId: string; chunk: SemanticChunk } | null>(null);
  const [sectionCtxMenu, setSectionCtxMenu] = useState<{ x: number; y: number; docId: string; section: Section } | null>(null);
  const [chunkCtxMenu, setChunkCtxMenu] = useState<{ x: number; y: number; docId: string; chunk: SemanticChunk } | null>(null);
  // Multi-select chunks for bulk actions (delete, extract, copy)
  const [selectedChunkIds, setSelectedChunkIds] = useState<Set<string>>(new Set());
  // "Add chunk" modal — when set, opens AddChunkModal to compose a new chunk
  // and append it to the source doc.
  const [addingChunkForDocId, setAddingChunkForDocId] = useState<string | null>(null);
  // Filter chunks by type (null = all)
  const [chunkTypeFilter, setChunkTypeFilter] = useState<string | null>(null);

  // Clear chunk selection on collapse / decomposition change
  useEffect(() => { setSelectedChunkIds(new Set()); setChunkTypeFilter(null); }, [expandedDocId]);

  // Save bundle intent. Optimistic — server-side persists via PATCH set-intent.
  const saveBundleIntent = useCallback(async (next: string) => {
    setBundleIntent(next);
    try {
      await fetch(`/api/bundles/${bundleId}`, {
        method: "PATCH",
        headers: buildPatchHeaders(),
        body: JSON.stringify({ action: "set-intent", intent: next, editToken }),
      });
    } catch { /* best-effort */ }
  }, [bundleId, buildPatchHeaders, editToken]);

  // ─── Synthesis (Memo / FAQ / Brief) ───
  const [synthesizing, setSynthesizing] = useState<null | "memo" | "faq" | "brief">(null);
  const [synthesisResult, setSynthesisResult] = useState<{ kind: string; markdown: string } | null>(null);
  const [showSynthesisModal, setShowSynthesisModal] = useState(false);

  const runSynthesis = useCallback(async (kind: "memo" | "faq" | "brief") => {
    setSynthesizing(kind);
    setSynthesisResult(null);
    setShowSynthesisModal(true);
    try {
      const res = await fetch(`/api/bundles/${bundleId}/synthesize`, {
        method: "POST",
        headers: buildPatchHeaders(),
        body: JSON.stringify({ kind, editToken }),
      });
      if (res.ok) {
        const data = await res.json();
        setSynthesisResult({ kind: data.kind, markdown: data.markdown });
      } else {
        const err = await res.json().catch(() => ({}));
        setSynthesisResult({ kind, markdown: `> Synthesis failed: ${err.error || "unknown error"}` });
      }
    } catch {
      setSynthesisResult({ kind, markdown: "> Network error during synthesis." });
    } finally {
      setSynthesizing(null);
    }
  }, [bundleId, buildPatchHeaders, editToken]);

  // Save synthesis output as a *compiled* doc — it remembers its source
  // bundle/docs/intent so the user can later recompile and we can detect when
  // the source has drifted (compiled_at < MAX(source.updated_at)).
  const saveSynthesisAsDoc = useCallback(async (kind: string, markdown: string) => {
    const headers = buildPatchHeaders();
    const userId = (() => { try { return localStorage.getItem("mdfy-user-id") || undefined; } catch { return undefined; } })();
    const anonymousId = (() => { try { return localStorage.getItem("mdfy-anonymous-id") || undefined; } catch { return undefined; } })();
    const titles: Record<string, string> = { memo: "Memo", faq: "FAQ", brief: "Brief" };
    const title = `${titles[kind] || "Synthesis"} — ${new Date().toLocaleDateString()}`;
    try {
      const res = await fetch("/api/docs", {
        method: "POST",
        headers,
        body: JSON.stringify({
          markdown, title, userId, anonymousId,
          editMode: userId ? "account" : "token",
          isDraft: true,
          // Provenance for recompile + outdated detection
          compileKind: kind,
          compileFrom: {
            bundleId,
            docIds: documents.map(d => d.id),
            intent: bundleIntent || null,
          },
        }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      const newDocId = data?.id;
      if (newDocId) {
        await fetch(`/api/bundles/${bundleId}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ action: "add-documents", documentIds: [newDocId], editToken }),
        });
        const r = await fetch(`/api/bundles/${bundleId}`, { headers });
        if (r.ok) {
          const bd = await r.json();
          if (bd?.documents) setDocuments(bd.documents);
        }
        // Surface the freshly created doc in the parent's sidebar with the
        // unread pulse — user can find it without scrolling 64 entries.
        onDocCreated?.({ docId: newDocId, title, markdown });
      }
      return newDocId as string | null;
    } catch { return null; }
  }, [bundleId, editToken, buildPatchHeaders, documents, bundleIntent, onDocCreated]);

  // ─── Tension resolutions cache (per tension id) ───
  const [tensionResolutions, setTensionResolutions] = useState<Record<string, { loading: boolean; text?: string; error?: string }>>({});
  const resolveTension = useCallback(async (tension: TensionItem) => {
    setTensionResolutions(prev => ({ ...prev, [tension.id]: { loading: true } }));
    try {
      const res = await fetch(`/api/bundles/${bundleId}/resolve-tension`, {
        method: "POST",
        headers: buildPatchHeaders(),
        body: JSON.stringify({
          source: { docTitle: tension.source.docTitle, chunkLabel: tension.source.chunkLabel, chunkContent: tension.source.chunkContent, chunkType: tension.source.chunkType },
          target: { docTitle: tension.target.docTitle, chunkLabel: tension.target.chunkLabel, chunkContent: tension.target.chunkContent, chunkType: tension.target.chunkType },
          editToken,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setTensionResolutions(prev => ({ ...prev, [tension.id]: { loading: false, text: data.resolution || "" } }));
      } else {
        const err = await res.json().catch(() => ({}));
        setTensionResolutions(prev => ({ ...prev, [tension.id]: { loading: false, error: err.error || "Failed" } }));
      }
    } catch {
      setTensionResolutions(prev => ({ ...prev, [tension.id]: { loading: false, error: "Network error" } }));
    }
  }, [bundleId, buildPatchHeaders, editToken]);

  // ─── Discoveries panel (default right-side view when nothing is selected) ───
  const [showDiscoveries, setShowDiscoveries] = useState(true);
  const [bulkDecomposing, setBulkDecomposing] = useState<{ done: number; total: number } | null>(null);
  // Externally requested chunk to focus on canvas (Discoveries → fly-to)
  const [focusChunkId, setFocusChunkId] = useState<string | null>(null);

  // Fetch (or refetch) decomposition for a doc WITHOUT touching canvas state.
  // Used by both the canvas-expand path and the sidebar pane — the sidebar
  // calls this directly so it doesn't accidentally explode the doc on the
  // canvas (and close the very panel the user is working in).
  const fetchDecomposition = useCallback(async (docId: string, force = false) => {
    setDecomposeError(null);
    if (!force && decompositionByDocId[docId]) return;
    setDecomposingDocId(docId);
    const headers = buildPatchHeaders();
    try {
      if (!force) {
        const cached = await fetch(`/api/docs/${docId}/decompose`, { headers });
        if (cached.ok) {
          const data = await cached.json();
          if (data?.semanticChunks) {
            setDecompositionByDocId(prev => ({ ...prev, [docId]: data.semanticChunks }));
            setDecomposingDocId(null);
            return;
          }
        }
      }
      const res = await fetch(`/api/docs/${docId}/decompose${force ? "?force=1" : ""}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ intent: bundleIntent || undefined }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.semanticChunks) {
          setDecompositionByDocId(prev => ({ ...prev, [docId]: data.semanticChunks }));
        }
      } else {
        const err = await res.json().catch(() => ({}));
        setDecomposeError(err.error || "Decomposition failed");
      }
    } catch {
      setDecomposeError("Network error during decomposition");
    } finally {
      setDecomposingDocId(null);
    }
  }, [decompositionByDocId, buildPatchHeaders, bundleIntent]);

  // Canvas-mode decompose: explode the doc on the constellation. Closes the
  // node info panel because the canvas is taking the spotlight.
  const decomposeDoc = useCallback(async (docId: string, force = false) => {
    setExpandedDocId(docId);
    setSelectedNodeInfo(null);
    await fetchDecomposition(docId, force);
  }, [fetchDecomposition]);

  // Bulk decompose every doc in the bundle (sequential to avoid hammering
  // AI rate limits). Skips docs that already have a cached decomposition
  // unless force = true. Used by the Discoveries panel's "Run discovery"
  // CTA to populate cross-doc tensions/questions/actions/threads.
  const decomposeAllDocs = useCallback(async (force = false) => {
    const targets = documents.filter(d => force || !decompositionByDocId[d.id]);
    if (targets.length === 0) return;
    setBulkDecomposing({ done: 0, total: targets.length });
    for (let i = 0; i < targets.length; i++) {
      await fetchDecomposition(targets[i].id, force);
      setBulkDecomposing({ done: i + 1, total: targets.length });
    }
    setBulkDecomposing(null);
  }, [documents, decompositionByDocId, fetchDecomposition]);

  // Aggregate discoveries from whatever decompositions we currently have,
  // PLUS the bundle-level AI graph (insights/gaps/connections). The combined
  // panel is the bundle "speaking" — both per-doc patterns and whole-bundle
  // observations flow into the same surface.
  const discoveries = useMemo(
    () => aggregateDiscoveries(documents, decompositionByDocId, aiGraph),
    [documents, decompositionByDocId, aiGraph]
  );

  // Click a discovery item → fly to the chunk on canvas. We expand the
  // owning doc so the chunk is rendered, ensure decomposition is loaded,
  // then request the canvas to fit-view + pulse that specific node.
  const flyToChunk = useCallback((ref: ChunkRef) => {
    setExpandedDocId(ref.docId);
    fetchDecomposition(ref.docId, false);
    setShowDiscoveries(false);
    setFocusChunkId(ref.chunkId);
  }, [fetchDecomposition]);
  useEffect(() => {
    if (!sectionCtxMenu && !chunkCtxMenu) return;
    const close = () => { setSectionCtxMenu(null); setChunkCtxMenu(null); };
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [sectionCtxMenu, chunkCtxMenu]);

  /** Persist a new full markdown for a doc — optimistic update + PATCH /api/docs/[id]. */
  const updateDocMarkdown = useCallback(async (docId: string, newMd: string, newTitle?: string) => {
    setDocuments(prev => prev.map(d => d.id === docId
      ? { ...d, markdown: newMd, title: newTitle ?? d.title, updated_at: new Date().toISOString() }
      : d));
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      try {
        const anonId = localStorage.getItem("mdfy-anonymous-id");
        if (anonId) headers["x-anonymous-id"] = anonId;
        const userId = localStorage.getItem("mdfy-user-id");
        if (userId) headers["x-user-id"] = userId;
        const userEmail = localStorage.getItem("mdfy-user-email");
        if (userEmail) headers["x-user-email"] = userEmail;
      } catch { /* ignore */ }
      await fetch(`/api/docs/${docId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ action: "auto-save", markdown: newMd, title: newTitle }),
      });
    } catch { /* leave optimistic state in place */ }
  }, []);

  const replaceSection = useCallback(async (docId: string, sectionId: string, next: Section) => {
    const doc = documents.find(d => d.id === docId);
    if (!doc) return;
    const sections = parseSections(doc.markdown);
    const idx = sections.findIndex(s => s.id === sectionId);
    if (idx < 0) return;
    sections[idx] = { ...sections[idx], heading: next.heading, body: next.body };
    const newMd = assembleSections(sections);
    await updateDocMarkdown(docId, newMd);
  }, [documents, updateDocMarkdown]);

  const removeSection = useCallback(async (docId: string, sectionId: string) => {
    const doc = documents.find(d => d.id === docId);
    if (!doc) return;
    if (!confirm("Delete this section?")) return;
    const sections = parseSections(doc.markdown).filter(s => s.id !== sectionId);
    await updateDocMarkdown(docId, assembleSections(sections));
  }, [documents, updateDocMarkdown]);

  // ─── Semantic chunk edits ─────────────────────────────────────────────
  // The chunk's `content` field is verbatim text from the source doc, so we
  // edit by exact-substring replace. If the substring isn't found (doc drifted
  // since decomposition), we surface that to the user instead of silently
  // appending. After any chunk edit, we re-trigger decomposition so the canvas
  // rehydrates with fresh chunks/edges.
  const replaceChunkInDoc = useCallback(async (docId: string, chunk: SemanticChunk, newContent: string, newLabel: string) => {
    const doc = documents.find(d => d.id === docId);
    if (!doc) return false;
    if (!doc.markdown.includes(chunk.content)) {
      setDecomposeError("Chunk text could not be located in source document. Edit it directly via the document tab.");
      return false;
    }
    const newMd = doc.markdown.replace(chunk.content, newContent);
    await updateDocMarkdown(docId, newMd);
    // Patch local cache so UI reflects the edit immediately; next decompose
    // will overwrite from the server.
    setDecompositionByDocId(prev => {
      const cur = prev[docId];
      if (!cur) return prev;
      return {
        ...prev,
        [docId]: {
          ...cur,
          chunks: cur.chunks.map(c => c.id === chunk.id ? { ...c, content: newContent, label: newLabel } : c),
        },
      };
    });
    return true;
  }, [documents, updateDocMarkdown]);

  const removeChunkFromDoc = useCallback(async (docId: string, chunk: SemanticChunk) => {
    const doc = documents.find(d => d.id === docId);
    if (!doc) return;
    if (!confirm(`Delete chunk "${chunk.label}" from the document? This removes its text from the source.`)) return;
    if (!doc.markdown.includes(chunk.content)) {
      setDecomposeError("Chunk text could not be located in source document.");
      return;
    }
    const newMd = doc.markdown.replace(chunk.content, "").replace(/\n{3,}/g, "\n\n");
    await updateDocMarkdown(docId, newMd);
    setDecompositionByDocId(prev => {
      const cur = prev[docId];
      if (!cur) return prev;
      return {
        ...prev,
        [docId]: {
          ...cur,
          chunks: cur.chunks.filter(c => c.id !== chunk.id),
          edges: cur.edges.filter(e => e.source !== chunk.id && e.target !== chunk.id),
        },
      };
    });
  }, [documents, updateDocMarkdown]);

  // ─── Add chunk: append a new chunk's content to the source doc ───
  const addChunk = useCallback(async (docId: string, label: string, content: string) => {
    const doc = documents.find(d => d.id === docId);
    if (!doc) return;
    // Append as a new section: an H2 heading with the label, then the body.
    // This guarantees the new content is detectable as its own chunk on the
    // next decompose run.
    const newMd = `${doc.markdown.trimEnd()}\n\n## ${label.trim()}\n\n${content.trim()}\n`;
    await updateDocMarkdown(docId, newMd);
    // Force re-decompose so the new chunk shows up in the canvas
    setDecompositionByDocId(prev => { const next = { ...prev }; delete next[docId]; return next; });
    decomposeDoc(docId, true);
  }, [documents, updateDocMarkdown, decomposeDoc]);

  // ─── Reorder a chunk within the source doc ───
  // We move the chunk's verbatim content to before/after another chunk's
  // content. This works because the AI prompt requires verbatim content;
  // when content drifts, the chunk is marked Stale and reorder is rejected.
  const reorderChunk = useCallback(async (docId: string, fromChunkId: string, targetChunkId: string, position: "before" | "after") => {
    if (fromChunkId === targetChunkId) return;
    const decomp = decompositionByDocId[docId];
    if (!decomp) return;
    const fromChunk = decomp.chunks.find(c => c.id === fromChunkId);
    const targetChunk = decomp.chunks.find(c => c.id === targetChunkId);
    if (!fromChunk || !targetChunk) return;
    const doc = documents.find(d => d.id === docId);
    if (!doc) return;
    if (!doc.markdown.includes(fromChunk.content) || !doc.markdown.includes(targetChunk.content)) {
      setDecomposeError("Chunk text drifted — re-analyze before reordering.");
      return;
    }
    // Cut the from-chunk out, then insert it relative to the target.
    let md = doc.markdown.replace(fromChunk.content, "");
    const targetIdx = md.indexOf(targetChunk.content);
    if (targetIdx < 0) { setDecomposeError("Reorder anchor missing."); return; }
    const insertIdx = position === "before" ? targetIdx : targetIdx + targetChunk.content.length;
    md = md.slice(0, insertIdx) + "\n\n" + fromChunk.content + "\n\n" + md.slice(insertIdx);
    md = md.replace(/\n{3,}/g, "\n\n");
    await updateDocMarkdown(docId, md);
    // Optimistically reorder the chunks array so the canvas updates without
    // waiting for re-decomposition.
    setDecompositionByDocId(prev => {
      const cur = prev[docId];
      if (!cur) return prev;
      const reordered = [...cur.chunks];
      const fromIdx = reordered.findIndex(c => c.id === fromChunkId);
      const [moved] = reordered.splice(fromIdx, 1);
      const tIdx = reordered.findIndex(c => c.id === targetChunkId);
      reordered.splice(position === "before" ? tIdx : tIdx + 1, 0, moved);
      return { ...prev, [docId]: { ...cur, chunks: reordered } };
    });
  }, [decompositionByDocId, documents, updateDocMarkdown]);

  // ─── Move a single chunk up/down within source doc ───
  const moveChunkUpDown = useCallback(async (docId: string, chunkId: string, direction: "up" | "down") => {
    const decomp = decompositionByDocId[docId];
    if (!decomp) return;
    const idx = decomp.chunks.findIndex(c => c.id === chunkId);
    if (idx < 0) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= decomp.chunks.length) return;
    const targetChunk = decomp.chunks[targetIdx];
    await reorderChunk(docId, chunkId, targetChunk.id, direction === "up" ? "before" : "after");
  }, [decompositionByDocId, reorderChunk]);

  // ─── Bulk: delete N selected chunks ───
  const bulkDeleteChunks = useCallback(async (docId: string, chunkIds: string[]) => {
    if (chunkIds.length === 0) return;
    if (!confirm(`Delete ${chunkIds.length} chunk${chunkIds.length === 1 ? "" : "s"} from the source document?`)) return;
    const doc = documents.find(d => d.id === docId);
    const decomp = decompositionByDocId[docId];
    if (!doc || !decomp) return;
    let md = doc.markdown;
    const targets = decomp.chunks.filter(c => chunkIds.includes(c.id));
    for (const c of targets) {
      if (md.includes(c.content)) md = md.replace(c.content, "");
    }
    md = md.replace(/\n{3,}/g, "\n\n");
    await updateDocMarkdown(docId, md);
    setDecompositionByDocId(prev => {
      const cur = prev[docId];
      if (!cur) return prev;
      const removed = new Set(chunkIds);
      return {
        ...prev,
        [docId]: {
          ...cur,
          chunks: cur.chunks.filter(c => !removed.has(c.id)),
          edges: cur.edges.filter(e => !removed.has(e.source) && !removed.has(e.target)),
        },
      };
    });
    setSelectedChunkIds(new Set());
  }, [documents, decompositionByDocId, updateDocMarkdown]);

  // ─── Bulk: copy selected chunks' content to clipboard ───
  const bulkCopyChunks = useCallback(async (docId: string, chunkIds: string[]) => {
    const decomp = decompositionByDocId[docId];
    if (!decomp) return;
    const ordered = decomp.chunks.filter(c => chunkIds.includes(c.id));
    if (ordered.length === 0) return;
    const joined = ordered.map(c => `## ${c.label}\n\n${c.content}`).join("\n\n---\n\n");
    try { await navigator.clipboard.writeText(joined); } catch { /* ignore */ }
  }, [decompositionByDocId]);

  // ─── Extract chunks (1 or many) into a new document, optionally removing
  //     them from the source. The new doc is created via POST /api/docs and
  //     joined to the bundle so it shows up alongside the source. ───
  const extractChunksToNewDoc = useCallback(async (docId: string, chunkIds: string[], opts?: { removeFromSource?: boolean; title?: string }) => {
    const decomp = decompositionByDocId[docId];
    if (!decomp || chunkIds.length === 0) return;
    const ordered = decomp.chunks.filter(c => chunkIds.includes(c.id));
    if (ordered.length === 0) return;
    const removeFromSource = opts?.removeFromSource !== false;
    const sourceDoc = documents.find(d => d.id === docId);
    const baseTitle = opts?.title || (ordered.length === 1 ? ordered[0].label : `Extracted from ${sourceDoc?.title || "document"}`);

    // Build the new doc body
    const body = ordered.length === 1
      ? `# ${ordered[0].label}\n\n${ordered[0].content}\n`
      : `# ${baseTitle}\n\n${ordered.map(c => `## ${c.label}\n\n${c.content}`).join("\n\n")}\n`;

    const headers = buildPatchHeaders();
    let createdDocId: string | null = null;
    try {
      const userId = (() => { try { return localStorage.getItem("mdfy-user-id") || undefined; } catch { return undefined; } })();
      const anonymousId = (() => { try { return localStorage.getItem("mdfy-anonymous-id") || undefined; } catch { return undefined; } })();
      const res = await fetch("/api/docs", {
        method: "POST",
        headers,
        body: JSON.stringify({ markdown: body, title: baseTitle, userId, anonymousId, editMode: userId ? "account" : "token", isDraft: true }),
      });
      if (res.ok) {
        const data = await res.json();
        createdDocId = data?.id || null;
      } else {
        setDecomposeError("Failed to create extracted document.");
        return;
      }
    } catch {
      setDecomposeError("Network error during extraction.");
      return;
    }

    // Add the new doc to this bundle
    if (createdDocId) {
      try {
        await fetch(`/api/bundles/${bundleId}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ action: "add-documents", documentIds: [createdDocId], editToken }),
        });
        const r = await fetch(`/api/bundles/${bundleId}`, { headers });
        if (r.ok) {
          const data = await r.json();
          if (data?.documents) setDocuments(data.documents);
        }
      } catch { /* ignore */ }
      // Mark unread in the parent's sidebar
      onDocCreated?.({ docId: createdDocId, title: baseTitle, markdown: body });
    }

    // Optionally remove from source
    if (removeFromSource && sourceDoc) {
      let md = sourceDoc.markdown;
      for (const c of ordered) {
        if (md.includes(c.content)) md = md.replace(c.content, "");
      }
      md = md.replace(/\n{3,}/g, "\n\n");
      await updateDocMarkdown(docId, md);
      setDecompositionByDocId(prev => {
        const cur = prev[docId];
        if (!cur) return prev;
        const removed = new Set(chunkIds);
        return {
          ...prev,
          [docId]: {
            ...cur,
            chunks: cur.chunks.filter(c => !removed.has(c.id)),
            edges: cur.edges.filter(e => !removed.has(e.source) && !removed.has(e.target)),
          },
        };
      });
    }
    setSelectedChunkIds(new Set());
  }, [decompositionByDocId, documents, bundleId, editToken, buildPatchHeaders, updateDocMarkdown, onDocCreated]);

  const insertSectionAfter = useCallback(async (docId: string, sectionId: string) => {
    const doc = documents.find(d => d.id === docId);
    if (!doc) return;
    const sections = parseSections(doc.markdown);
    const idx = sections.findIndex(s => s.id === sectionId);
    if (idx < 0) return;
    const fresh: Section = {
      id: `s${sections.length}`,
      level: Math.max(1, sections[idx].level) || 2,
      heading: "New section",
      body: "",
    };
    sections.splice(idx + 1, 0, fresh);
    await updateDocMarkdown(docId, assembleSections(sections));
    // Open the new section for immediate editing
    setEditingSection({ docId, section: fresh });
  }, [documents, updateDocMarkdown]);

  // Open the doc picker modal
  const [showAddPicker, setShowAddPicker] = useState(false);
  const handleAddDocs = useCallback(async (docIds: string[]) => {
    if (docIds.length === 0) return;
    try {
      const res = await fetch(`/api/bundles/${bundleId}`, {
        method: "PATCH",
        headers: buildPatchHeaders(),
        body: JSON.stringify({ action: "add-documents", documentIds: docIds, editToken }),
      });
      if (res.ok) {
        // Refetch to get full doc bodies
        const r = await fetch(`/api/bundles/${bundleId}`, { headers: buildPatchHeaders() });
        if (r.ok) {
          const data = await r.json();
          if (data?.documents) setDocuments(data.documents);
        }
      }
    } catch { /* ignore */ }
  }, [bundleId, editToken, buildPatchHeaders]);

  const handleNodeClick = useCallback(async (nodeId: string) => {
    // Document → show in side panel with rendered content
    if (nodeId.startsWith("doc:")) {
      const docId = nodeId.slice(4);
      const doc = documents.find(d => d.id === docId);
      if (!doc) return;
      const wc = doc.markdown.split(/\s+/).filter(Boolean).length;
      let html = "";
      try {
        const result = await renderMarkdown(doc.markdown);
        html = postProcessHtml(result.html);
      } catch { /* render error */ }
      // Find connected concepts
      const connectedConcepts = aiGraph?.edges
        ?.filter((e: any) => (e.source === nodeId || e.target === nodeId))
        ?.map((e: any) => {
          const otherId = e.source === nodeId ? e.target : e.source;
          if (otherId.startsWith("concept:")) {
            const c = aiGraph.nodes.find((n: any) => n.id === otherId);
            return c ? { id: otherId, title: c.label } : null;
          }
          return null;
        })
        ?.filter(Boolean) || [];
      openNodeInfo({
        type: "document", label: doc.title || "Untitled",
        docId,
        docContent: html,
        documentSummary: aiGraph?.documentSummaries?.[nodeId],
        docStats: {
          wordCount: wc, readingTime: Math.max(1, Math.ceil(wc / 200)),
          sections: (doc.markdown.match(/^#{1,3}\s+/gm) || []).length,
          hasCode: /```\w+/.test(doc.markdown),
        },
        connectedDocs: connectedConcepts,
      });
      return;
    }
    // Concept/Entity/Tag → show in side panel
    if (nodeId.startsWith("concept:") && aiGraph) {
      const concept = aiGraph.nodes.find((n: any) => n.id === nodeId);
      if (!concept) return;
      const connectedDocIds = aiGraph.edges
        .filter((e: any) => (e.source === nodeId && e.target.startsWith("doc:")) || (e.target === nodeId && e.source.startsWith("doc:")))
        .map((e: any) => e.source.startsWith("doc:") ? e.source.slice(4) : e.target.slice(4));
      const connectedDocs = documents.filter(d => connectedDocIds.includes(d.id));
      const relationships = aiGraph.edges
        .filter((e: any) => e.source === nodeId || e.target === nodeId)
        .map((e: any) => {
          const targetId = e.source === nodeId ? e.target : e.source;
          const targetNode = aiGraph.nodes.find((n: any) => n.id === targetId) || documents.find(d => `doc:${d.id}` === targetId);
          return { label: e.label || "related", target: (targetNode as any)?.label || (targetNode as any)?.title || targetId };
        });
      openNodeInfo({
        type: concept.type, label: concept.label, weight: concept.weight, description: concept.description,
        connectedDocs: connectedDocs.map(d => ({ id: d.id, title: d.title || "Untitled" })),
        relationships,
      });
      return;
    }
    // Summary node
    if (nodeId === "analysis:summary" && aiGraph) {
      openNodeInfo({
        type: "analysis", label: "Bundle Analysis",
        summary: aiGraph.summary, themes: aiGraph.themes, insights: aiGraph.insights,
        keyTakeaways: aiGraph.keyTakeaways, gaps: aiGraph.gaps,
      });
      return;
    }
  }, [onOpenDoc, aiGraph, documents, openNodeInfo]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ background: "var(--background)" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }} />
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>Loading bundle...</span>
        </div>
      </div>
    );
  }

  if (view === "list") {
    return <BundleListView documents={documents} onOpenDoc={onOpenDoc} />;
  }

  return (
    <BundleCanvasLayout
      selectedNodeInfo={selectedNodeInfo}
      onCloseNodeInfo={() => setSelectedNodeInfo(null)}
      onOpenDoc={onOpenDoc}
      canvas={
        <BundleCanvas
          documents={documents}
          aiGraph={aiGraph}
          isAnalyzing={isAnalyzing}
          onDocumentClick={handleNodeClick}
          onCopyContext={handleCopyContext}
          onRegenerate={handleRegenerate}
          onRemoveDoc={handleRemoveDoc}
          onOpenDoc={onOpenDoc}
          onRequestAddDocs={() => setShowAddPicker(true)}
          onAddDocs={handleAddDocs}
          expandedDocId={expandedDocId}
          decomposition={expandedDocId ? decompositionByDocId[expandedDocId] || null : null}
          isDecomposing={decomposingDocId === expandedDocId}
          decomposeError={expandedDocId ? decomposeError : null}
          onDecomposeDoc={(docId) => decomposeDoc(docId)}
          onRedecomposeDoc={(docId) => decomposeDoc(docId, true)}
          onCollapseDoc={() => { setExpandedDocId(null); setDecomposeError(null); setSelectedChunkIds(new Set()); }}
          onSectionClick={(docId, section) => setEditingSection({ docId, section })}
          onSectionContextMenu={(docId, section, x, y) => setSectionCtxMenu({ docId, section, x, y })}
          onChunkClick={(docId, chunk, additive) => {
            // Additive (Cmd/Shift) → toggle in selection. Plain click on a
            // chunk → open the editor (replace any existing selection so the
            // edit feels focused). Functional setState avoids stale closure
            // captures of selectedChunkIds.
            if (additive) {
              setSelectedChunkIds(prev => {
                const next = new Set(prev);
                if (next.has(chunk.id)) next.delete(chunk.id); else next.add(chunk.id);
                return next;
              });
              return;
            }
            setSelectedChunkIds(new Set());
            setEditingChunk({ docId, chunk });
          }}
          onChunkContextMenu={(docId, chunk, x, y) => setChunkCtxMenu({ docId, chunk, x, y })}
          selectedChunkIds={selectedChunkIds}
          onClearChunkSelection={() => setSelectedChunkIds(new Set())}
          onChunkDragReorder={(docId, fromId, targetId, position) => reorderChunk(docId, fromId, targetId, position)}
          chunkTypeFilter={chunkTypeFilter}
          onAddChunk={(docId) => setAddingChunkForDocId(docId)}
          onChangeChunkTypeFilter={(t) => setChunkTypeFilter(t)}
          focusChunkId={focusChunkId}
          onFocusChunkSettled={() => setFocusChunkId(null)}
          onSynthesize={runSynthesis}
        />
      }
      bulkChunkBarNode={expandedDocId && selectedChunkIds.size > 0 && (
        <ChunkBulkBar
          count={selectedChunkIds.size}
          onClear={() => setSelectedChunkIds(new Set())}
          onCopy={() => bulkCopyChunks(expandedDocId, Array.from(selectedChunkIds))}
          onExtract={() => extractChunksToNewDoc(expandedDocId, Array.from(selectedChunkIds), { removeFromSource: true })}
          onExtractKeep={() => extractChunksToNewDoc(expandedDocId, Array.from(selectedChunkIds), { removeFromSource: false })}
          onDelete={() => bulkDeleteChunks(expandedDocId, Array.from(selectedChunkIds))}
        />
      )}
      addChunkModalNode={(
        <>
          {addingChunkForDocId && (
            <AddChunkModal
              onClose={() => setAddingChunkForDocId(null)}
              onCreate={async (label, content) => {
                await addChunk(addingChunkForDocId, label, content);
                setAddingChunkForDocId(null);
              }}
            />
          )}
          {showSynthesisModal && (
            <SynthesisModal
              kind={synthesizing || synthesisResult?.kind || "memo"}
              isLoading={!!synthesizing}
              markdown={synthesisResult?.markdown || ""}
              onClose={() => { setShowSynthesisModal(false); setSynthesisResult(null); }}
              onSaveAsDoc={async () => {
                if (!synthesisResult) return;
                const newId = await saveSynthesisAsDoc(synthesisResult.kind, synthesisResult.markdown);
                if (newId) { setShowSynthesisModal(false); setSynthesisResult(null); }
              }}
              onCopy={async () => {
                if (!synthesisResult) return;
                try { await navigator.clipboard.writeText(synthesisResult.markdown); } catch { /* ignore */ }
              }}
            />
          )}
        </>
      )}
      discoveriesPanel={showDiscoveries ? (
        <DiscoveriesPanel
          discoveries={discoveries}
          totalDocs={documents.length}
          documents={documents}
          isBulkRunning={bulkDecomposing}
          onRun={() => decomposeAllDocs(false)}
          onClose={() => setShowDiscoveries(false)}
          onSelectChunk={flyToChunk}
          onOpenDoc={onOpenDoc}
          intent={bundleIntent}
          isOwner={bundleIsOwner}
          onSaveIntent={saveBundleIntent}
          tensionResolutions={tensionResolutions}
          onResolveTension={resolveTension}
        />
      ) : null}
      reopenDiscoveriesNode={!showDiscoveries && !aiPanelOpen ? (
        <DiscoveriesReopenButton
          onClick={() => setShowDiscoveries(true)}
          count={discoveries.tensions.length + discoveries.questions.length + discoveries.threads.length + discoveries.insights.length + discoveries.gaps.length + discoveries.connections.length}
        />
      ) : null}
      decomposeBridge={selectedNodeInfo?.docId ? {
        decomposition: decompositionByDocId[selectedNodeInfo.docId] || null,
        isDecomposing: decomposingDocId === selectedNodeInfo.docId,
        // IMPORTANT: sidebar uses fetchDecomposition (data only) — not
        // decomposeDoc — so requesting a sidebar decompose does NOT
        // explode the doc on the canvas or close the panel.
        onRequestDecompose: () => fetchDecomposition(selectedNodeInfo.docId!, false),
        onRedecompose: () => fetchDecomposition(selectedNodeInfo.docId!, true),
        onEditChunk: (chunk) => setEditingChunk({ docId: selectedNodeInfo.docId!, chunk }),
        onDeleteChunk: (chunk) => removeChunkFromDoc(selectedNodeInfo.docId!, chunk),
        onAddChunk: () => setAddingChunkForDocId(selectedNodeInfo.docId!),
        onMoveChunk: (chunkId, direction) => moveChunkUpDown(selectedNodeInfo.docId!, chunkId, direction),
        onExtractChunk: (chunkId, removeFromSource) => extractChunksToNewDoc(selectedNodeInfo.docId!, [chunkId], { removeFromSource }),
      } : undefined}
      sectionEditorNode={(
        <>
          {editingSection && (
            <SectionEditor
              docId={editingSection.docId}
              section={editingSection.section}
              onClose={() => setEditingSection(null)}
              onSave={async (next) => {
                await replaceSection(editingSection.docId, editingSection.section.id, next);
                setEditingSection(null);
              }}
            />
          )}
          {editingChunk && (
            <ChunkEditor
              chunk={editingChunk.chunk}
              onClose={() => setEditingChunk(null)}
              onSave={async (newContent, newLabel) => {
                const ok = await replaceChunkInDoc(editingChunk.docId, editingChunk.chunk, newContent, newLabel);
                if (ok) setEditingChunk(null);
              }}
            />
          )}
        </>
      )}
      sectionCtxMenuNode={(
        <>
          {sectionCtxMenu && (
            <div
              className="fixed z-[200] py-1 rounded-lg shadow-xl"
              style={{
                left: Math.min(sectionCtxMenu.x, (typeof window !== "undefined" ? window.innerWidth : 1024) - 200),
                top: Math.min(sectionCtxMenu.y, (typeof window !== "undefined" ? window.innerHeight : 768) - 120),
                minWidth: 200,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => { setEditingSection({ docId: sectionCtxMenu.docId, section: sectionCtxMenu.section }); setSectionCtxMenu(null); }}
                className="w-full text-left px-3 py-1.5 text-[11px] flex items-center gap-2 transition-colors hover:bg-[var(--menu-hover)]"
                style={{ color: "var(--text-secondary)" }}
              >
                Edit section
              </button>
              <button
                onClick={() => { insertSectionAfter(sectionCtxMenu.docId, sectionCtxMenu.section.id); setSectionCtxMenu(null); }}
                className="w-full text-left px-3 py-1.5 text-[11px] flex items-center gap-2 transition-colors hover:bg-[var(--menu-hover)]"
                style={{ color: "var(--text-secondary)" }}
              >
                Add section after
              </button>
              <button
                onClick={() => { removeSection(sectionCtxMenu.docId, sectionCtxMenu.section.id); setSectionCtxMenu(null); }}
                className="w-full text-left px-3 py-1.5 text-[11px] flex items-center gap-2 transition-colors hover:bg-[var(--menu-hover)]"
                style={{ color: "#ef4444" }}
              >
                Delete section
              </button>
            </div>
          )}
          {chunkCtxMenu && (
            <div
              className="fixed z-[200] py-1 rounded-lg shadow-xl"
              style={{
                left: Math.min(chunkCtxMenu.x, (typeof window !== "undefined" ? window.innerWidth : 1024) - 220),
                top: Math.min(chunkCtxMenu.y, (typeof window !== "undefined" ? window.innerHeight : 768) - 140),
                minWidth: 220,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => { setEditingChunk({ docId: chunkCtxMenu.docId, chunk: chunkCtxMenu.chunk }); setChunkCtxMenu(null); }}
                className="w-full text-left px-3 py-1.5 text-[11px] flex items-center gap-2 transition-colors hover:bg-[var(--menu-hover)]"
                style={{ color: "var(--text-secondary)" }}
              >
                Edit chunk
              </button>
              <button
                onClick={() => { removeChunkFromDoc(chunkCtxMenu.docId, chunkCtxMenu.chunk); setChunkCtxMenu(null); }}
                className="w-full text-left px-3 py-1.5 text-[11px] flex items-center gap-2 transition-colors hover:bg-[var(--menu-hover)]"
                style={{ color: "#ef4444" }}
              >
                Delete chunk from source
              </button>
            </div>
          )}
        </>
      )}
      addPickerNode={showAddPicker && (
        <AddDocsPicker
          existingIds={new Set(documents.map(d => d.id))}
          onClose={() => setShowAddPicker(false)}
          onAdd={(ids) => { handleAddDocs(ids); setShowAddPicker(false); }}
          authHeaders={parentAuthHeaders}
        />
      )}
    />
  );
}

// ─── Layout wrapper: side-by-side when wide, drawer overlay when narrow ───
// Threshold = 700px. Below that, the NodeInfoPanel sits absolute over the
// canvas with a backdrop instead of pushing the canvas to a tiny strip.
function BundleCanvasLayout({
  canvas,
  selectedNodeInfo,
  onCloseNodeInfo,
  onOpenDoc,
  addPickerNode,
  sectionEditorNode,
  sectionCtxMenuNode,
  bulkChunkBarNode,
  addChunkModalNode,
  nodeInfoExtras,
  decomposeBridge,
  discoveriesPanel,
  reopenDiscoveriesNode,
}: {
  canvas: React.ReactNode;
  selectedNodeInfo: NodeInfoData | null;
  onCloseNodeInfo: () => void;
  onOpenDoc?: (docId: string) => void;
  addPickerNode: React.ReactNode;
  sectionEditorNode?: React.ReactNode;
  sectionCtxMenuNode?: React.ReactNode;
  bulkChunkBarNode?: React.ReactNode;
  addChunkModalNode?: React.ReactNode;
  nodeInfoExtras?: React.ReactNode;
  decomposeBridge?: DecomposeBridge;
  /** Discoveries panel — shown on the right when nothing is selected. */
  discoveriesPanel?: React.ReactNode;
  /** Floating "Discoveries" pill shown when the panel is hidden. */
  reopenDiscoveriesNode?: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number>(0);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const obs = new ResizeObserver(() => setWidth(el.clientWidth));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  const NARROW_THRESHOLD = 700;
  const isNarrow = width > 0 && width < NARROW_THRESHOLD;
  return (
    <div ref={containerRef} className="w-full h-full flex relative">
      <div className="flex-1 min-w-0">{canvas}</div>
      {/* Discoveries panel — default right-side when nothing is selected.
          Replaced by NodeInfoPanel as soon as a node is clicked, so the
          right side is always doing one focused thing. */}
      {!selectedNodeInfo && discoveriesPanel && !isNarrow && (
        <>{discoveriesPanel}</>
      )}
      {/* Re-open button when discoveries is hidden — only shown when nothing
          else is open on the right side. */}
      {!selectedNodeInfo && !discoveriesPanel && reopenDiscoveriesNode}
      {selectedNodeInfo && !isNarrow && (
        <NodeInfoPanel info={selectedNodeInfo} onClose={onCloseNodeInfo} onOpenDoc={onOpenDoc} decomposeBridge={decomposeBridge} />
      )}
      {selectedNodeInfo && isNarrow && (
        <>
          {/* Backdrop dismisses the drawer */}
          <div
            className="absolute inset-0 z-[150]"
            style={{ background: "rgba(0,0,0,0.4)" }}
            onClick={onCloseNodeInfo}
          />
          <div className="absolute top-0 bottom-0 right-0 z-[151] flex" style={{ maxWidth: "100%" }}>
            <NodeInfoPanel info={selectedNodeInfo} onClose={onCloseNodeInfo} onOpenDoc={onOpenDoc} decomposeBridge={decomposeBridge} />
          </div>
        </>
      )}
      {addPickerNode}
      {sectionEditorNode}
      {sectionCtxMenuNode}
      {addChunkModalNode}
      {/* Floating bulk-action bar — top-center, above canvas */}
      {bulkChunkBarNode && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[40]">
          {bulkChunkBarNode}
        </div>
      )}
      {nodeInfoExtras}
    </div>
  );
}

function DiscoveriesReopenButton({ onClick, count }: { onClick: () => void; count: number }) {
  return (
    <button
      onClick={onClick}
      className="absolute top-3 right-[180px] z-[35] flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11px] font-semibold transition-all hover:brightness-110"
      style={{ background: "var(--accent-dim)", border: "1px solid var(--accent)", color: "var(--accent)" }}
    >
      <Sparkles width={11} height={11} />
      <span>Discoveries</span>
      {count > 0 && (
        <span className="text-[9px] px-1 py-0 rounded font-mono tabular-nums" style={{ background: "var(--accent)", color: "#000" }}>{count}</span>
      )}
    </button>
  );
}

// ─── Discoveries Panel — what the bundle wants to tell you ───
// Surfaces cross-doc tensions, open questions, action items, and recurring
// threads from AI-decomposed chunks. Default right-side view when nothing is
// selected; the bundle "talks first" instead of waiting for the user to dig.
function DiscoveriesPanel({
  discoveries,
  totalDocs,
  documents,
  isBulkRunning,
  onRun,
  onClose,
  onSelectChunk,
  onOpenDoc,
  intent,
  isOwner,
  onSaveIntent,
  tensionResolutions,
  onResolveTension,
}: {
  discoveries: {
    tensions: TensionItem[];
    questions: ChunkRef[];
    threads: ThreadItem[];
    insights: string[];
    gaps: string[];
    connections: { doc1Id: string; doc2Id: string; relationship: string }[];
    decomposedCount: number;
  };
  totalDocs: number;
  documents: Array<{ id: string; title: string | null }>;
  isBulkRunning: { done: number; total: number } | null;
  onRun: () => void;
  onClose: () => void;
  onSelectChunk: (ref: ChunkRef) => void;
  onOpenDoc?: (docId: string) => void;
  intent?: string;
  isOwner?: boolean;
  onSaveIntent?: (next: string) => void;
  tensionResolutions?: Record<string, { loading: boolean; text?: string; error?: string }>;
  onResolveTension?: (tension: TensionItem) => void;
}) {
  const { tensions, questions, threads, insights, gaps, connections, decomposedCount } = discoveries;
  const hasAny = tensions.length + questions.length + threads.length + insights.length + gaps.length + connections.length > 0;
  const fullyAnalyzed = decomposedCount === totalDocs && totalDocs > 0;
  const docTitleById = (id: string) => documents.find(d => d.id === id)?.title || "Untitled";

  return (
    <div className="shrink-0 flex flex-col overflow-hidden" style={{ width: "min(420px, 50%)", borderLeft: "1px solid var(--border)", background: "var(--surface)" }}>
      {/* Header */}
      <div className="shrink-0 px-4 py-2.5 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Sparkles width={13} height={13} style={{ color: "var(--accent)" }} />
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Discoveries</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--toggle-bg)", color: "var(--text-faint)" }}>
            {decomposedCount} / {totalDocs} analyzed
          </span>
        </div>
        <button onClick={onClose} className="p-1.5 rounded transition-colors hover:bg-[var(--toggle-bg)] shrink-0" style={{ color: "var(--text-faint)" }} title="Hide discoveries">
          <XIcon width={14} height={14} />
        </button>
      </div>

      {/* Intent — the bundle's North Star. Owners can edit; viewers see it
          as a quoted purpose statement. The intent feeds into all AI prompts
          (decompose + bundle graph) so analysis is anchored. */}
      {(isOwner || intent) && (
        <BundleIntentBlock intent={intent || ""} canEdit={!!isOwner} onSave={onSaveIntent} />
      )}

      {/* Run / re-run CTA strip */}
      {(!fullyAnalyzed || isBulkRunning) && (
        <div className="shrink-0 px-4 py-2.5 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border-dim)", background: "var(--accent-dim)" }}>
          {isBulkRunning ? (
            <>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full animate-pulse shrink-0" style={{ background: "var(--accent)" }} />
                <span className="text-[11px]" style={{ color: "var(--accent)" }}>
                  Analyzing {isBulkRunning.done} / {isBulkRunning.total}…
                </span>
              </div>
              <div className="flex-1 ml-3 h-1 rounded-full overflow-hidden" style={{ background: "var(--toggle-bg)" }}>
                <div className="h-full transition-all" style={{ width: `${(isBulkRunning.done / isBulkRunning.total) * 100}%`, background: "var(--accent)" }} />
              </div>
            </>
          ) : (
            <>
              <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                {decomposedCount === 0
                  ? "Analyze every doc to surface cross-doc insights."
                  : `${totalDocs - decomposedCount} doc${totalDocs - decomposedCount === 1 ? "" : "s"} unanalyzed.`}
              </span>
              <button onClick={onRun}
                className="px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors hover:brightness-110 shrink-0"
                style={{ background: "var(--accent)", color: "#000" }}>
                Run discovery
              </button>
            </>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto px-4 py-3 space-y-4">
        {!hasAny && !isBulkRunning && (
          <div className="text-[12px] text-center py-8 leading-relaxed" style={{ color: "var(--text-faint)" }}>
            {decomposedCount === 0
              ? "Run discovery to extract tensions, questions, action items, and cross-doc threads from your bundle."
              : "Nothing surfaced yet. Try analyzing more documents."}
          </div>
        )}

        {/* Tensions */}
        {tensions.length > 0 && (
          <DiscoverySection
            icon={<AlertTriangle width={12} height={12} style={{ color: "#ef4444" }} />}
            label="Tensions"
            count={tensions.length}
            color="#ef4444"
          >
            {tensions.map(t => {
              const res = tensionResolutions?.[t.id];
              return (
                <div key={t.id} className="rounded-lg p-2.5 space-y-1.5"
                  style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  <div className="flex items-start gap-2">
                    <button onClick={() => onSelectChunk(t.source)}
                      className="flex-1 text-left text-[11px] leading-snug hover:underline"
                      style={{ color: "var(--text-primary)" }}>
                      <span className="font-semibold">{t.source.chunkLabel}</span>
                      <span className="text-[9px] ml-1.5" style={{ color: "var(--text-faint)" }}>{t.source.docTitle}</span>
                    </button>
                  </div>
                  <div className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded inline-block font-semibold" style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}>
                    ↔ {t.relation}
                  </div>
                  <div className="flex items-start gap-2">
                    <button onClick={() => onSelectChunk(t.target)}
                      className="flex-1 text-left text-[11px] leading-snug hover:underline"
                      style={{ color: "var(--text-primary)" }}>
                      <span className="font-semibold">{t.target.chunkLabel}</span>
                      <span className="text-[9px] ml-1.5" style={{ color: "var(--text-faint)" }}>{t.target.docTitle}</span>
                    </button>
                  </div>
                  {/* Resolve with AI — shows inline */}
                  {!res && onResolveTension && (
                    <button onClick={() => onResolveTension(t)}
                      className="w-full mt-1 text-[10px] font-semibold py-1 rounded transition-colors hover:brightness-110"
                      style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)" }}>
                      ✨ Resolve with AI
                    </button>
                  )}
                  {res?.loading && (
                    <div className="text-[10px] flex items-center gap-1.5 py-1" style={{ color: "var(--text-faint)" }}>
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#ef4444" }} />
                      Reconciling…
                    </div>
                  )}
                  {res?.error && (
                    <div className="text-[10px] py-1" style={{ color: "#ef4444" }}>Error: {res.error}</div>
                  )}
                  {res?.text && (
                    <div className="text-[10px] leading-relaxed mt-1 px-2 py-1.5 rounded whitespace-pre-wrap"
                      style={{ background: "rgba(74,222,128,0.06)", color: "var(--text-secondary)", border: "1px solid rgba(74,222,128,0.18)" }}>
                      {res.text}
                    </div>
                  )}
                </div>
              );
            })}
          </DiscoverySection>
        )}

        {/* Open Questions */}
        {questions.length > 0 && (
          <DiscoverySection
            icon={<HelpCircle width={12} height={12} style={{ color: "#a78bfa" }} />}
            label="Open Questions"
            count={questions.length}
            color="#a78bfa"
          >
            {questions.map(q => (
              <button key={`${q.docId}:${q.chunkId}`} onClick={() => onSelectChunk(q)}
                className="w-full text-left rounded-lg px-2.5 py-2 hover:bg-[var(--menu-hover)] transition-colors group"
                style={{ background: "var(--toggle-bg)" }}>
                <div className="text-[11px] font-semibold leading-snug mb-0.5" style={{ color: "var(--text-primary)" }}>
                  {q.chunkLabel}
                </div>
                <div className="text-[9px]" style={{ color: "var(--text-faint)" }}>{q.docTitle}</div>
              </button>
            ))}
          </DiscoverySection>
        )}

        {/* Bundle-level Insights — non-obvious patterns the AI noticed
            looking at all docs together. Pulled from the bundle graph's
            `insights` (highest-value Discoveries because they require
            whole-bundle reasoning, not just per-doc extraction). */}
        {insights.length > 0 && (
          <DiscoverySection
            icon={<Lightbulb width={12} height={12} style={{ color: "#fbbf24" }} />}
            label="Insights"
            count={insights.length}
            color="#fbbf24"
          >
            {insights.map((ins, i) => (
              <div key={i} className="rounded-lg px-2.5 py-2 leading-relaxed text-[11px]"
                style={{ background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.18)", color: "var(--text-secondary)" }}>
                {ins}
              </div>
            ))}
          </DiscoverySection>
        )}

        {/* Gaps — what these docs DON'T cover */}
        {gaps.length > 0 && (
          <DiscoverySection
            icon={<HelpCircle width={12} height={12} style={{ color: "#f87171" }} />}
            label="Gaps"
            count={gaps.length}
            color="#f87171"
          >
            {gaps.map((g, i) => (
              <div key={i} className="rounded-lg px-2.5 py-2 leading-relaxed text-[11px] flex gap-2"
                style={{ background: "rgba(248,113,113,0.05)", border: "1px solid rgba(248,113,113,0.18)", color: "var(--text-secondary)" }}>
                <span className="shrink-0 mt-0.5 font-bold" style={{ color: "#f87171" }}>!</span>
                <span>{g}</span>
              </div>
            ))}
          </DiscoverySection>
        )}

        {/* Doc-to-doc Connections — explicit relationships the AI noticed
            between specific document pairs. Click either side → open that doc. */}
        {connections.length > 0 && (
          <DiscoverySection
            icon={<GitBranch width={12} height={12} style={{ color: "#60a5fa" }} />}
            label="Connections"
            count={connections.length}
            color="#60a5fa"
          >
            {connections.map((c, i) => (
              <div key={i} className="rounded-lg px-2.5 py-2"
                style={{ background: "var(--toggle-bg)", border: "1px solid rgba(96,165,250,0.18)" }}>
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                  <button onClick={() => onOpenDoc?.(c.doc1Id)}
                    className="text-[11px] font-semibold hover:underline truncate"
                    style={{ color: "#60a5fa" }}>
                    {docTitleById(c.doc1Id)}
                  </button>
                  <span className="text-[9px]" style={{ color: "var(--text-faint)" }}>↔</span>
                  <button onClick={() => onOpenDoc?.(c.doc2Id)}
                    className="text-[11px] font-semibold hover:underline truncate"
                    style={{ color: "#60a5fa" }}>
                    {docTitleById(c.doc2Id)}
                  </button>
                </div>
                <div className="text-[10px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {c.relationship}
                </div>
              </div>
            ))}
          </DiscoverySection>
        )}

        {/* Cross-doc Threads */}
        {threads.length > 0 && (
          <DiscoverySection
            icon={<GitBranch width={12} height={12} style={{ color: "#38bdf8" }} />}
            label="Cross-doc Threads"
            count={threads.length}
            color="#38bdf8"
          >
            {threads.map(t => (
              <div key={t.id} className="rounded-lg px-2.5 py-2"
                style={{ background: "var(--toggle-bg)", border: "1px solid rgba(56,189,248,0.18)" }}>
                <div className="text-[11px] font-semibold mb-1" style={{ color: "#38bdf8" }}>
                  {t.label}
                </div>
                <div className="space-y-0.5">
                  {t.occurrences.map(ref => (
                    <button key={`${ref.docId}:${ref.chunkId}`} onClick={() => onSelectChunk(ref)}
                      className="w-full text-left text-[10px] leading-snug hover:underline truncate"
                      style={{ color: "var(--text-secondary)" }}>
                      <span style={{ color: "var(--text-faint)" }}>·</span> {ref.docTitle}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </DiscoverySection>
        )}
      </div>
    </div>
  );
}

// ─── Intent block — a single editable line that anchors AI analysis ───
function BundleIntentBlock({ intent, canEdit, onSave }: {
  intent: string;
  canEdit: boolean;
  onSave?: (next: string) => void;
}) {
  const [editing, setEditing] = useState(intent.length === 0 && canEdit);
  const [draft, setDraft] = useState(intent);
  useEffect(() => { setDraft(intent); }, [intent]);

  const commit = () => {
    const next = draft.trim();
    if (next !== intent) onSave?.(next);
    setEditing(false);
  };

  return (
    <div className="shrink-0 px-4 py-2.5" style={{ borderBottom: "1px solid var(--border-dim)", background: "var(--toggle-bg)" }}>
      <div className="text-[9px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-faint)" }}>
        Intent
      </div>
      {editing && canEdit ? (
        <input
          type="text"
          value={draft}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(intent); setEditing(false); } }}
          placeholder="What question is this bundle here to answer?"
          className="w-full text-[12px] px-2 py-1 rounded outline-none"
          style={{ background: "var(--background)", color: "var(--text-primary)", border: "1px solid var(--accent)" }}
        />
      ) : (
        <button
          onClick={() => canEdit && setEditing(true)}
          className="block w-full text-left text-[12px] leading-snug rounded px-2 py-1 transition-colors hover:bg-[var(--menu-hover)]"
          style={{
            color: intent ? "var(--text-primary)" : "var(--text-faint)",
            cursor: canEdit ? "text" : "default",
            fontStyle: intent ? "normal" : "italic",
          }}
        >
          {intent || (canEdit ? "Click to set the question this bundle answers…" : "No intent set")}
        </button>
      )}
    </div>
  );
}

function DiscoverySection({ icon, label, count, color, children }: {
  icon: React.ReactNode;
  label: string;
  count: number;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color }}>{label}</span>
        <span className="text-[9px] px-1.5 py-0.5 rounded font-mono tabular-nums" style={{ background: `${color}18`, color }}>{count}</span>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

// ─── Section Editor — modal for editing one section's heading + body ───
function SectionEditor({ docId, section, onClose, onSave }: {
  docId: string;
  section: Section;
  onClose: () => void;
  onSave: (next: Section) => void | Promise<void>;
}) {
  const [heading, setHeading] = useState(section.heading);
  const [body, setBody] = useState(section.body);
  const [level, setLevel] = useState(section.level);
  const [saving, setSaving] = useState(false);
  const dirty = heading !== section.heading || body !== section.body || level !== section.level;
  // Suppress unused-var warning for docId — kept in the prop signature for
  // future "save under different doc" extensions.
  void docId;
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.55)" }} onClick={onClose}>
      <div
        className="rounded-xl overflow-hidden flex flex-col"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", width: "min(720px, 92vw)", maxHeight: "84vh", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 flex items-center justify-between shrink-0" style={{ borderBottom: "1px solid var(--border-dim)" }}>
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>Edit section</span>
            {section.level > 0 ? (
              <select
                value={level}
                onChange={(e) => setLevel(Number(e.target.value))}
                className="text-[10px] px-1.5 py-0.5 rounded outline-none"
                style={{ background: "var(--toggle-bg)", color: "var(--text-secondary)", border: "1px solid var(--border-dim)" }}
              >
                {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>H{n}</option>)}
              </select>
            ) : (
              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--toggle-bg)", color: "var(--text-faint)" }}>Preamble</span>
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--menu-hover)] transition-colors" style={{ color: "var(--text-faint)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="px-4 py-3 flex-1 overflow-auto flex flex-col gap-3 min-h-0">
          {section.level > 0 && (
            <input
              type="text"
              value={heading}
              onChange={(e) => setHeading(e.target.value)}
              placeholder="Heading"
              className="text-[14px] font-semibold px-3 py-2 rounded-md outline-none"
              style={{ background: "var(--toggle-bg)", color: "var(--text-primary)", border: "1px solid var(--border-dim)" }}
            />
          )}
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Section content (markdown)…"
            spellCheck={false}
            className="text-[12px] px-3 py-2 rounded-md outline-none resize-none flex-1"
            style={{ background: "var(--background)", color: "var(--text-primary)", border: "1px solid var(--border-dim)", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", lineHeight: 1.55, minHeight: 240 }}
          />
        </div>
        <div className="px-4 py-3 flex items-center justify-end gap-2 shrink-0" style={{ borderTop: "1px solid var(--border-dim)" }}>
          <button onClick={onClose} className="px-3 py-1.5 text-[11px] rounded-md transition-colors hover:bg-[var(--menu-hover)]" style={{ color: "var(--text-muted)" }}>Cancel</button>
          <button
            onClick={async () => {
              if (!dirty || saving) return;
              setSaving(true);
              await onSave({ ...section, heading: heading.trim(), body, level });
              setSaving(false);
            }}
            disabled={!dirty || saving}
            className="px-3 py-1.5 text-[11px] font-medium rounded-md transition-colors"
            style={{
              background: dirty && !saving ? "var(--accent)" : "var(--toggle-bg)",
              color: dirty && !saving ? "#000" : "var(--text-faint)",
              cursor: dirty && !saving ? "pointer" : "default",
            }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Chunk Editor — modal for editing one semantic chunk's content + label ───
function ChunkEditor({ chunk, onClose, onSave }: {
  chunk: SemanticChunk;
  onClose: () => void;
  onSave: (newContent: string, newLabel: string) => void | Promise<void>;
}) {
  const [content, setContent] = useState(chunk.content);
  const [label, setLabel] = useState(chunk.label);
  const [saving, setSaving] = useState(false);
  const dirty = content !== chunk.content || label !== chunk.label;
  const typeColor: Record<string, string> = {
    concept: "#38bdf8", claim: "#fb923c", example: "#4ade80", definition: "#60a5fa",
    task: "#fbbf24", question: "#a78bfa", context: "#94a3b8", evidence: "#f472b6",
  };
  const color = typeColor[chunk.type] || "#94a3b8";
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.55)" }} onClick={onClose}>
      <div
        className="rounded-xl overflow-hidden flex flex-col"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", width: "min(720px, 92vw)", maxHeight: "84vh", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 flex items-center justify-between shrink-0" style={{ borderBottom: "1px solid var(--border-dim)" }}>
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>Edit chunk</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold" style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>{chunk.type}</span>
            {chunk.found === false && (
              <Tooltip text="Source text drifted — edits cannot be located in the document. Re-run Decompose first." position="bottom">
                <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}>Stale</span>
              </Tooltip>
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--menu-hover)] transition-colors" style={{ color: "var(--text-faint)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="px-4 py-3 flex-1 overflow-auto flex flex-col gap-3 min-h-0">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: "var(--text-faint)" }}>Label</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Short title (3-5 words)"
              className="w-full text-[13px] font-semibold px-3 py-2 rounded-md outline-none"
              style={{ background: "var(--toggle-bg)", color: "var(--text-primary)", border: "1px solid var(--border-dim)" }}
            />
          </div>
          <div className="flex-1 flex flex-col min-h-0">
            <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: "var(--text-faint)" }}>Content (verbatim from doc)</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Chunk content…"
              spellCheck={false}
              className="text-[12px] px-3 py-2 rounded-md outline-none resize-none flex-1"
              style={{ background: "var(--background)", color: "var(--text-primary)", border: "1px solid var(--border-dim)", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", lineHeight: 1.55, minHeight: 220 }}
            />
          </div>
        </div>
        <div className="px-4 py-3 flex items-center justify-end gap-2 shrink-0" style={{ borderTop: "1px solid var(--border-dim)" }}>
          <button onClick={onClose} className="px-3 py-1.5 text-[11px] rounded-md transition-colors hover:bg-[var(--menu-hover)]" style={{ color: "var(--text-muted)" }}>Cancel</button>
          <button
            onClick={async () => {
              if (!dirty || saving) return;
              setSaving(true);
              await onSave(content, label.trim());
              setSaving(false);
            }}
            disabled={!dirty || saving}
            className="px-3 py-1.5 text-[11px] font-medium rounded-md transition-colors"
            style={{
              background: dirty && !saving ? "var(--accent)" : "var(--toggle-bg)",
              color: dirty && !saving ? "#000" : "var(--text-faint)",
              cursor: dirty && !saving ? "pointer" : "default",
            }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Bulk action bar for multi-selected chunks ───
function ChunkBulkBar({ count, onClear, onCopy, onExtract, onExtractKeep, onDelete }: {
  count: number;
  onClear: () => void;
  onCopy: () => void;
  onExtract: () => void;
  onExtractKeep: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-1 px-1 py-1 rounded-lg shadow-xl"
      style={{ background: "var(--surface)", border: "1px solid var(--accent)", boxShadow: "0 8px 24px rgba(0,0,0,0.35)" }}>
      <span className="text-[11px] font-semibold px-2 py-1 rounded-md"
        style={{ color: "var(--accent)", background: "var(--accent-dim)" }}>
        {count} selected
      </span>
      <div style={{ width: 1, height: 18, background: "var(--border-dim)" }} />
      <Tooltip text="Copy selected chunks to clipboard" position="bottom">
        <button onClick={onCopy}
          className="px-2 py-1 text-[11px] rounded-md transition-colors hover:bg-[var(--toggle-bg)]"
          style={{ color: "var(--text-secondary)" }}>
          Copy
        </button>
      </Tooltip>
      <Tooltip text="Move selected chunks into a new document (removes from source)" position="bottom">
        <button onClick={onExtract}
          className="px-2 py-1 text-[11px] rounded-md transition-colors hover:bg-[var(--toggle-bg)]"
          style={{ color: "var(--text-secondary)" }}>
          Extract → new doc
        </button>
      </Tooltip>
      <Tooltip text="Copy selected chunks into a new document (keeps in source)" position="bottom">
        <button onClick={onExtractKeep}
          className="px-2 py-1 text-[11px] rounded-md transition-colors hover:bg-[var(--toggle-bg)]"
          style={{ color: "var(--text-secondary)" }}>
          Branch → new doc
        </button>
      </Tooltip>
      <div style={{ width: 1, height: 18, background: "var(--border-dim)" }} />
      <Tooltip text="Delete selected chunks from source" position="bottom">
        <button onClick={onDelete}
          className="px-2 py-1 text-[11px] rounded-md transition-colors hover:bg-[rgba(239,68,68,0.12)]"
          style={{ color: "#ef4444" }}>
          Delete
        </button>
      </Tooltip>
      <div style={{ width: 1, height: 18, background: "var(--border-dim)" }} />
      <Tooltip text="Clear selection (Esc)" position="bottom">
        <button onClick={onClear}
          className="p-1 rounded-md transition-colors hover:bg-[var(--toggle-bg)]"
          style={{ color: "var(--text-faint)" }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </Tooltip>
    </div>
  );
}

// ─── Add Chunk modal — composes a new chunk and appends to source doc ───
const ADD_CHUNK_TYPES = ["concept", "claim", "example", "definition", "task", "question", "context", "evidence"] as const;
function AddChunkModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (label: string, content: string) => void | Promise<void>;
}) {
  const [label, setLabel] = useState("");
  const [content, setContent] = useState("");
  const [creating, setCreating] = useState(false);
  const valid = label.trim().length > 0 && content.trim().length > 0;
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.55)" }} onClick={onClose}>
      <div
        className="rounded-xl overflow-hidden flex flex-col"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", width: "min(640px, 92vw)", maxHeight: "84vh", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 flex items-center justify-between shrink-0" style={{ borderBottom: "1px solid var(--border-dim)" }}>
          <span className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>Add new chunk</span>
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--menu-hover)] transition-colors" style={{ color: "var(--text-faint)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="px-4 py-3 flex-1 overflow-auto flex flex-col gap-3 min-h-0">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: "var(--text-faint)" }}>Label</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Short title (3-5 words)"
              autoFocus
              className="w-full text-[13px] font-semibold px-3 py-2 rounded-md outline-none"
              style={{ background: "var(--toggle-bg)", color: "var(--text-primary)", border: "1px solid var(--border-dim)" }}
            />
          </div>
          <div className="flex-1 flex flex-col min-h-0">
            <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: "var(--text-faint)" }}>Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What does this chunk say? Markdown is fine."
              spellCheck={false}
              className="text-[12px] px-3 py-2 rounded-md outline-none resize-none flex-1"
              style={{ background: "var(--background)", color: "var(--text-primary)", border: "1px solid var(--border-dim)", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", lineHeight: 1.55, minHeight: 200 }}
            />
            <p className="text-[10px] mt-1.5" style={{ color: "var(--text-faint)" }}>
              The chunk will be appended to the source document and re-classified by AI on the next decompose run.
            </p>
          </div>
        </div>
        <div className="px-4 py-3 flex items-center justify-end gap-2 shrink-0" style={{ borderTop: "1px solid var(--border-dim)" }}>
          <button onClick={onClose} className="px-3 py-1.5 text-[11px] rounded-md transition-colors hover:bg-[var(--menu-hover)]" style={{ color: "var(--text-muted)" }}>Cancel</button>
          <button
            onClick={async () => {
              if (!valid || creating) return;
              setCreating(true);
              await onCreate(label.trim(), content.trim());
              setCreating(false);
            }}
            disabled={!valid || creating}
            className="px-3 py-1.5 text-[11px] font-medium rounded-md transition-colors"
            style={{
              background: valid && !creating ? "var(--accent)" : "var(--toggle-bg)",
              color: valid && !creating ? "#000" : "var(--text-faint)",
              cursor: valid && !creating ? "pointer" : "default",
            }}
          >
            {creating ? "Adding…" : "Add chunk"}
          </button>
        </div>
      </div>
    </div>
  );
}
// expose chunk type list for the toolbar/filter (used elsewhere)
export const CHUNK_TYPES = ADD_CHUNK_TYPES;

// ─── Synthesis modal — preview AI-generated Memo / FAQ / Brief ───
function SynthesisModal({ kind, isLoading, markdown, onClose, onSaveAsDoc, onCopy }: {
  kind: string;
  isLoading: boolean;
  markdown: string;
  onClose: () => void;
  onSaveAsDoc: () => void | Promise<void>;
  onCopy: () => void | Promise<void>;
}) {
  const titles: Record<string, string> = { memo: "Decision Memo", faq: "Frequently Asked Questions", brief: "Brief" };
  const subs: Record<string, string> = {
    memo: "1-page synthesis with key findings, tensions, and recommendations.",
    faq: "Synthesized questions and answers across all docs.",
    brief: "Narrative essay tying the bundle together.",
  };
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.55)" }} onClick={onClose}>
      <div
        className="rounded-xl overflow-hidden flex flex-col"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", width: "min(820px, 92vw)", maxHeight: "84vh", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 flex items-center justify-between shrink-0" style={{ borderBottom: "1px solid var(--border-dim)" }}>
          <div className="flex items-center gap-2">
            <Sparkles width={14} height={14} style={{ color: "var(--accent)" }} />
            <span className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>{titles[kind] || "Synthesis"}</span>
            <span className="text-[10px]" style={{ color: "var(--text-faint)" }}>{subs[kind] || ""}</span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--menu-hover)] transition-colors" style={{ color: "var(--text-faint)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="flex-1 overflow-auto px-6 py-5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2" style={{ color: "var(--text-faint)" }}>
              <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }} />
              <span className="text-[11px]">AI is synthesizing the bundle…</span>
              <span className="text-[10px]">This usually takes 5-15 seconds.</span>
            </div>
          ) : (
            <pre className="text-[12px] leading-[1.6] whitespace-pre-wrap font-sans" style={{ color: "var(--text-primary)" }}>{markdown}</pre>
          )}
        </div>
        <div className="px-4 py-3 flex items-center justify-end gap-2 shrink-0" style={{ borderTop: "1px solid var(--border-dim)" }}>
          <button onClick={onClose} className="px-3 py-1.5 text-[11px] rounded-md transition-colors hover:bg-[var(--menu-hover)]" style={{ color: "var(--text-muted)" }}>Close</button>
          <button onClick={onCopy} disabled={isLoading || !markdown}
            className="px-3 py-1.5 text-[11px] rounded-md transition-colors hover:bg-[var(--toggle-bg)]"
            style={{ color: "var(--text-secondary)", border: "1px solid var(--border-dim)", opacity: isLoading || !markdown ? 0.4 : 1 }}>
            Copy
          </button>
          <button onClick={onSaveAsDoc} disabled={isLoading || !markdown}
            className="px-3 py-1.5 text-[11px] font-medium rounded-md transition-colors"
            style={{
              background: !isLoading && markdown ? "var(--accent)" : "var(--toggle-bg)",
              color: !isLoading && markdown ? "#000" : "var(--text-faint)",
              cursor: !isLoading && markdown ? "pointer" : "default",
            }}>
            Save as document
          </button>
        </div>
      </div>
    </div>
  );
}

type NodeInfoData = {
  type: string; label: string; weight?: number; description?: string;
  summary?: string; themes?: string[]; insights?: string[];
  keyTakeaways?: string[]; gaps?: string[];
  connectedDocs?: Array<{ id: string; title: string }>;
  relationships?: Array<{ label: string; target: string }>;
  docId?: string;
  docContent?: string;
  docStats?: { wordCount: number; readingTime: number; sections: number; hasCode: boolean };
  documentSummary?: string;
};

// ─── Add documents picker — modal listing user docs not yet in bundle ───

function AddDocsPicker({ existingIds, onClose, onAdd, authHeaders }: { existingIds: Set<string>; onClose: () => void; onAdd: (ids: string[]) => void; authHeaders?: Record<string, string> }) {
  const [docs, setDocs] = useState<Array<{ id: string; title: string | null; updated_at: string }>>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    let headers: Record<string, string> = {};
    if (authHeaders) {
      headers = { ...authHeaders };
    } else {
      try {
        const anonId = localStorage.getItem("mdfy-anonymous-id");
        if (anonId) headers["x-anonymous-id"] = anonId;
        const userId = localStorage.getItem("mdfy-user-id");
        if (userId) headers["x-user-id"] = userId;
        const userEmail = localStorage.getItem("mdfy-user-email");
        if (userEmail) headers["x-user-email"] = userEmail;
      } catch { /* ignore */ }
    }
    fetch("/api/user/documents", { headers })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.documents) {
          // Exclude docs already in this bundle
          setDocs(data.documents.filter((d: { id: string }) => !existingIds.has(d.id)));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [existingIds, authHeaders]);

  const filtered = filter
    ? docs.filter(d => (d.title || "").toLowerCase().includes(filter.toLowerCase()))
    : docs;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose}>
      <div className="rounded-xl overflow-hidden flex flex-col" style={{ background: "var(--surface)", border: "1px solid var(--border)", width: "min(480px, 90vw)", maxHeight: "70vh" }} onClick={(e) => e.stopPropagation()}>
        <div className="px-4 py-3 flex items-center justify-between shrink-0" style={{ borderBottom: "1px solid var(--border-dim)" }}>
          <span className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>Add documents to bundle</span>
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--menu-hover)] transition-colors" style={{ color: "var(--text-faint)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="px-4 py-2 shrink-0" style={{ borderBottom: "1px solid var(--border-dim)" }}>
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search documents…"
            className="w-full text-[12px] px-2 py-1.5 rounded-md outline-none"
            style={{ background: "var(--toggle-bg)", border: "1px solid var(--border-dim)", color: "var(--text-primary)" }}
          />
        </div>
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="px-4 py-8 text-center text-[12px]" style={{ color: "var(--text-faint)" }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-[12px]" style={{ color: "var(--text-faint)" }}>
              {docs.length === 0 ? "No other documents available." : "No documents match your search."}
            </div>
          ) : (
            <div className="py-1">
              {filtered.map(d => {
                const checked = selected.has(d.id);
                return (
                  <button
                    key={d.id}
                    onClick={() => {
                      setSelected(prev => {
                        const next = new Set(prev);
                        if (next.has(d.id)) next.delete(d.id); else next.add(d.id);
                        return next;
                      });
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-left text-[12px] transition-colors hover:bg-[var(--menu-hover)]"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <span className="shrink-0 w-4 h-4 rounded border flex items-center justify-center" style={{
                      background: checked ? "var(--accent)" : "transparent",
                      borderColor: checked ? "var(--accent)" : "var(--border)",
                    }}>
                      {checked && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                    </span>
                    <span className="flex-1 truncate">{d.title || "Untitled"}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="px-4 py-3 flex items-center justify-end gap-2 shrink-0" style={{ borderTop: "1px solid var(--border-dim)" }}>
          <button onClick={onClose} className="px-3 py-1.5 text-[11px] rounded-md transition-colors hover:bg-[var(--menu-hover)]" style={{ color: "var(--text-muted)" }}>Cancel</button>
          <button
            onClick={() => onAdd(Array.from(selected))}
            disabled={selected.size === 0}
            className="px-3 py-1.5 text-[11px] font-medium rounded-md transition-colors"
            style={{
              background: selected.size > 0 ? "var(--accent)" : "var(--toggle-bg)",
              color: selected.size > 0 ? "#000" : "var(--text-faint)",
              cursor: selected.size > 0 ? "pointer" : "default",
            }}
          >
            Add {selected.size > 0 ? `(${selected.size})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Node Info Side Panel — shows details for clicked concept/analysis node ───

interface DecomposeBridge {
  decomposition: SemanticChunksResult | null;
  isDecomposing: boolean;
  onRequestDecompose: () => void;
  onRedecompose: () => void;
  onEditChunk: (chunk: SemanticChunk) => void;
  onDeleteChunk: (chunk: SemanticChunk) => void;
  onAddChunk: () => void;
  onMoveChunk: (chunkId: string, direction: "up" | "down") => void;
  onExtractChunk: (chunkId: string, removeFromSource: boolean) => void;
}

function NodeInfoPanel({ info, onClose, onOpenDoc, decomposeBridge }: {
  info: any;
  onClose: () => void;
  onOpenDoc?: (docId: string) => void;
  decomposeBridge?: DecomposeBridge;
}) {
  const colorMap: Record<string, string> = {
    analysis: "#60a5fa", entity: "#4ade80", tag: "#a78bfa", concept: "#38bdf8", document: "#fb923c",
  };
  const iconMap: Record<string, string> = {
    analysis: "◈", entity: "◆", tag: "#", concept: "○", document: "■",
  };
  const color = colorMap[info.type] || "#38bdf8";

  // Resizable width — persists across selections in this session
  const [width, setWidth] = useState<number>(() => {
    if (typeof window === "undefined") return 420;
    try {
      const saved = localStorage.getItem("mdfy-bundle-info-panel-width");
      if (saved) return Math.max(280, Math.min(720, parseInt(saved) || 420));
    } catch { /* ignore */ }
    return 420;
  });
  const isDraggingRef = useRef(false);
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const newW = Math.max(280, Math.min(720, window.innerWidth - e.clientX));
      setWidth(newW);
    };
    const onUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      try { localStorage.setItem("mdfy-bundle-info-panel-width", String(width)); } catch { /* ignore */ }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [width]);

  return (
    <div className="shrink-0 flex flex-col overflow-hidden relative" style={{ width, borderLeft: "1px solid var(--border)", background: "var(--surface)" }}>
      {/* Resize handle — same style as the left sidebar */}
      <div
        className="absolute top-0 bottom-0 cursor-col-resize z-[100]"
        style={{ width: 5, left: -2, background: "var(--border-dim)" }}
        onMouseDown={(e) => {
          e.preventDefault();
          isDraggingRef.current = true;
          document.body.style.cursor = "col-resize";
          document.body.style.userSelect = "none";
        }}
      >
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[3px] h-8" style={{ background: "var(--text-faint)", borderRadius: 2, opacity: 0.3 }} />
      </div>
      {/* Header */}
      <div className="shrink-0 px-4 py-2.5 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-sm shrink-0" style={{ color }}>{iconMap[info.type]}</span>
          <span className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{info.label}</span>
          {info.type === "document" && info.docId && onOpenDoc && (
            <button
              onClick={() => onOpenDoc(info.docId)}
              className="text-xs px-2 py-0.5 rounded shrink-0 transition-colors hover:text-[var(--text-primary)] hover:border-[var(--border)] hover:bg-[var(--toggle-bg)]"
              style={{ color: "var(--text-faint)", border: "1px solid var(--border-dim)", background: "transparent" }}
            >
              Open
            </button>
          )}
        </div>
        <button onClick={onClose} className="p-1.5 rounded transition-colors hover:bg-[var(--toggle-bg)] shrink-0" style={{ color: "var(--text-faint)" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      {/* For document type, split into Insights / Document tabs so the actual
          markdown content lives in its own scroll area, separated from AI
          analysis + metadata. Other node types render flat (no tabs). */}
      {info.type === "document" ? (
        <DocumentNodeBody info={info} decomposeBridge={decomposeBridge} />
      ) : (
      <div className="flex-1 overflow-auto px-5 py-5 space-y-5">

        {/* Analysis panel */}
        {info.type === "analysis" && (
          <>
            {info.summary && (
              <div className="rounded-lg p-4" style={{ background: "var(--accent-dim)", border: "1px solid var(--accent)" }}>
                <h4 className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--accent)" }}>Executive Summary</h4>
                <p className="text-sm leading-[1.7]" style={{ color: "var(--text-primary)" }}>{info.summary}</p>
              </div>
            )}
            {info.keyTakeaways && info.keyTakeaways.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-faint)" }}>Key Takeaways</h4>
                <div className="space-y-1.5">
                  {info.keyTakeaways.map((t: string, i: number) => (
                    <div key={i} className="flex gap-2 items-start">
                      <span className="text-xs font-bold w-5 h-5 flex items-center justify-center rounded shrink-0" style={{ background: "var(--accent)", color: "#fff" }}>{i + 1}</span>
                      <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{t}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {info.themes && info.themes.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-faint)" }}>Themes</h4>
                <div className="flex flex-wrap gap-1.5">
                  {info.themes.map((t: string, i: number) => (
                    <span key={i} className="text-xs px-3 py-1 rounded-full" style={{ background: "rgba(96,165,250,0.1)", color: "#60a5fa", border: "1px solid rgba(96,165,250,0.2)" }}>{t}</span>
                  ))}
                </div>
              </div>
            )}
            {info.insights && info.insights.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-faint)" }}>Cross-Document Insights</h4>
                <div className="space-y-2">
                  {info.insights.map((ins: string, i: number) => (
                    <div key={i} className="flex gap-2 rounded-lg p-2.5" style={{ background: "var(--toggle-bg)" }}>
                      <span className="text-xs shrink-0" style={{ color: "var(--accent)" }}>→</span>
                      <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{ins}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {info.gaps && info.gaps.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#f87171" }}>Gaps & Missing</h4>
                <div className="space-y-1.5">
                  {info.gaps.map((g: string, i: number) => (
                    <div key={i} className="flex gap-2 rounded-lg p-2.5" style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.15)" }}>
                      <span className="text-xs shrink-0" style={{ color: "#f87171" }}>!</span>
                      <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{g}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Concept/Entity/Tag panel */}
        {(info.type === "concept" || info.type === "entity" || info.type === "tag") && (
          <>
            {info.weight && (
              <div className="flex items-center gap-3">
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>Importance {info.weight}/10</span>
                <div className="flex gap-0.5">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="w-1.5 h-3 rounded-sm" style={{ background: i < info.weight! ? color : "var(--border-dim)" }} />
                  ))}
                </div>
              </div>
            )}
            {info.description && (
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{info.description}</p>
            )}
            {info.connectedDocs && info.connectedDocs.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-faint)" }}>Appears in {info.connectedDocs.length} document{info.connectedDocs.length > 1 ? "s" : ""}</h4>
                <div className="space-y-1.5">
                  {info.connectedDocs.map((doc: { id: string; title: string }) => (
                    <button key={doc.id} onClick={() => onOpenDoc?.(doc.id)}
                      className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-[var(--accent-dim)] flex items-center gap-2.5"
                      style={{ color: "var(--text-primary)", background: "var(--toggle-bg)" }}>
                      <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: "var(--accent)" }} />
                      {doc.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {info.relationships && info.relationships.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-faint)" }}>Relationships</h4>
                <div className="space-y-1.5">
                  {info.relationships.map((rel: any, i: number) => (
                    <div key={i} className="flex items-start gap-2.5 px-3 py-2 rounded-lg text-sm" style={{ background: "var(--toggle-bg)" }}>
                      <span className="shrink-0 mt-0.5" style={{ color }}>→</span>
                      <div>
                        <span className="font-medium" style={{ color: "var(--text-primary)" }}>{rel.target}</span>
                        <span className="ml-1.5 text-xs" style={{ color: "var(--text-muted)" }}>{rel.label}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      )}
    </div>
  );
}

// ─── Document body with Document / Insights / Decompose tabs ───
function DocumentNodeBody({ info, decomposeBridge }: { info: any; decomposeBridge?: DecomposeBridge }) {
  type TabId = "document" | "insights" | "decompose";
  const [tab, setTab] = useState<TabId>(info.docContent ? "document" : "insights");
  // Default to "document" so users see the actual content first; if there's
  // no rendered content, fall back to insights.
  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Tab switcher */}
      <div className="shrink-0 flex items-center gap-1 px-3 pt-2.5 pb-0" style={{ borderBottom: "1px solid var(--border-dim)" }}>
        {([
          { id: "document" as const, label: "Document" },
          { id: "insights" as const, label: "Insights" },
          ...(decomposeBridge ? [{ id: "decompose" as const, label: "Decompose" }] : []),
        ]).map(t => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="px-3 pt-1.5 pb-2 text-[11px] font-medium transition-colors relative"
              style={{
                color: active ? "var(--text-primary)" : "var(--text-faint)",
                background: "transparent",
              }}
            >
              {t.label}
              {active && (
                <div className="absolute left-0 right-0 -bottom-px h-[2px]" style={{ background: "var(--accent)" }} />
              )}
            </button>
          );
        })}
      </div>

      {tab === "decompose" && decomposeBridge ? (
        <DecomposeListPane bridge={decomposeBridge} />
      ) : tab === "document" ? (
        // Pure markdown content — no AI/meta noise
        <div className="flex-1 overflow-auto px-5 py-5">
          {info.docContent ? (
            <div className="mdcore-rendered prose prose-invert" dangerouslySetInnerHTML={{ __html: info.docContent }} />
          ) : (
            <div className="text-[12px] text-center py-8" style={{ color: "var(--text-faint)" }}>
              No content rendered.
            </div>
          )}
        </div>
      ) : (
        // Metadata + AI insights about this document
        <div className="flex-1 overflow-auto px-5 py-5 space-y-5">
          {info.docStats && (
            <div>
              <h4 className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-faint)" }}>About</h4>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs px-2 py-0.5 rounded" style={{ background: "var(--toggle-bg)", color: "var(--text-faint)" }}>{info.docStats.wordCount.toLocaleString()} words</span>
                <span className="text-xs px-2 py-0.5 rounded" style={{ background: "var(--toggle-bg)", color: "var(--text-faint)" }}>~{info.docStats.readingTime} min</span>
                <span className="text-xs px-2 py-0.5 rounded" style={{ background: "var(--toggle-bg)", color: "var(--text-faint)" }}>{info.docStats.sections} sections</span>
                {info.docStats.hasCode && <span className="text-xs px-2 py-0.5 rounded" style={{ background: "rgba(167,139,250,0.12)", color: "#a78bfa" }}>Code</span>}
              </div>
            </div>
          )}
          {info.documentSummary && (
            <div className="rounded-lg p-3" style={{ background: "var(--accent-dim)", border: "1px solid var(--accent)" }}>
              <h4 className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--accent)" }}>AI Summary</h4>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>{info.documentSummary}</p>
            </div>
          )}
          {info.connectedDocs && info.connectedDocs.length > 0 && (
            <div>
              <h4 className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-faint)" }}>Related Concepts</h4>
              <div className="flex flex-wrap gap-1.5">
                {info.connectedDocs.map((c: { id: string; title: string }) => (
                  <span key={c.id} className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(56,189,248,0.1)", color: "#38bdf8", border: "1px solid rgba(56,189,248,0.2)" }}>{c.title}</span>
                ))}
              </div>
            </div>
          )}
          {!info.docStats && !info.documentSummary && (!info.connectedDocs || info.connectedDocs.length === 0) && (
            <div className="text-[12px] text-center py-8" style={{ color: "var(--text-faint)" }}>
              No insights yet. Run Analyze to generate.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sidebar decompose pane: focused vertical chunk list editor ───
// Same data + handlers as the canvas decomposition, but rendered as a
// top-to-bottom sortable list inside the right side panel. Optimized for
// quick edit / add / delete / extract on a single document without the
// visual constellation around it.
function DecomposeListPane({ bridge }: { bridge: DecomposeBridge }) {
  const decomp = bridge.decomposition;
  if (bridge.isDecomposing && !decomp) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ color: "var(--text-faint)" }}>
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }} />
          <span className="text-[11px]">Analyzing document…</span>
        </div>
      </div>
    );
  }
  if (!decomp) {
    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="flex flex-col items-center gap-3 max-w-[320px] text-center">
          <Layers width={28} height={28} style={{ color: "var(--accent)" }} />
          <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Decompose this document into AI-classified semantic chunks (concepts, claims, examples…) and edit each piece independently.
          </p>
          <button
            onClick={bridge.onRequestDecompose}
            className="mt-1 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-colors hover:brightness-110"
            style={{ background: "var(--accent)", color: "#000" }}
          >
            Decompose with AI
          </button>
        </div>
      </div>
    );
  }
  return <DecomposeListPaneBody bridge={bridge} decomp={decomp} />;
}

const SIDEBAR_CHUNK_TYPES = ["concept", "claim", "example", "definition", "task", "question", "context", "evidence"] as const;
const SIDEBAR_CHUNK_COLORS: Record<string, { border: string; text: string; bg: string }> = {
  concept: { border: "#38bdf8", text: "#38bdf8", bg: "rgba(56,189,248,0.06)" },
  claim: { border: "#fb923c", text: "#fb923c", bg: "rgba(251,146,60,0.06)" },
  example: { border: "#4ade80", text: "#4ade80", bg: "rgba(74,222,128,0.06)" },
  definition: { border: "#60a5fa", text: "#60a5fa", bg: "rgba(96,165,250,0.06)" },
  task: { border: "#fbbf24", text: "#fbbf24", bg: "rgba(251,191,36,0.06)" },
  question: { border: "#a78bfa", text: "#a78bfa", bg: "rgba(167,139,250,0.06)" },
  context: { border: "#94a3b8", text: "#94a3b8", bg: "rgba(148,163,184,0.06)" },
  evidence: { border: "#f472b6", text: "#f472b6", bg: "rgba(244,114,182,0.06)" },
};

function DecomposeListPaneBody({ bridge, decomp }: { bridge: DecomposeBridge; decomp: SemanticChunksResult }) {
  const [filter, setFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const filtered = decomp.chunks.filter(c => {
    if (filter && c.type !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!c.label.toLowerCase().includes(q) && !c.content.toLowerCase().includes(q)) return false;
    }
    return true;
  });
  const presentTypes = Array.from(new Set(decomp.chunks.map(c => c.type)));

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Toolbar: search + actions */}
      <div className="shrink-0 px-3 py-2 flex items-center gap-1.5" style={{ borderBottom: "1px solid var(--border-dim)" }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search chunks…"
          className="flex-1 text-[11px] px-2 py-1 rounded-md outline-none"
          style={{ background: "var(--toggle-bg)", color: "var(--text-primary)", border: "1px solid var(--border-dim)" }}
        />
        <Tooltip text="Add a new chunk" position="bottom">
          <button onClick={bridge.onAddChunk}
            className="p-1 rounded-md hover:bg-[var(--menu-hover)] transition-colors"
            style={{ color: "var(--accent)" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
          </button>
        </Tooltip>
        <Tooltip text="Re-analyze with AI" position="bottom">
          <button onClick={bridge.onRedecompose}
            className="p-1 rounded-md hover:bg-[var(--menu-hover)] transition-colors"
            style={{ color: "var(--text-muted)" }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>
          </button>
        </Tooltip>
      </div>

      {/* Type filter pills */}
      {presentTypes.length > 1 && (
        <div className="shrink-0 px-3 py-1.5 flex items-center gap-1 flex-wrap" style={{ borderBottom: "1px solid var(--border-dim)" }}>
          <button
            onClick={() => setFilter(null)}
            className="px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider rounded transition-colors"
            style={{
              color: filter === null ? "var(--accent)" : "var(--text-faint)",
              background: filter === null ? "var(--accent-dim)" : "transparent",
            }}
          >All ({decomp.chunks.length})</button>
          {presentTypes.map(t => {
            const palette = SIDEBAR_CHUNK_COLORS[t] || SIDEBAR_CHUNK_COLORS.context;
            const active = filter === t;
            const count = decomp.chunks.filter(c => c.type === t).length;
            return (
              <button
                key={t}
                onClick={() => setFilter(active ? null : t)}
                className="px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider rounded transition-colors"
                style={{
                  color: active ? palette.text : "var(--text-faint)",
                  background: active ? `${palette.border}22` : "transparent",
                  border: active ? `1px solid ${palette.border}55` : "1px solid transparent",
                }}
              >{t} ({count})</button>
            );
          })}
        </div>
      )}

      {/* Chunk list */}
      <div className="flex-1 overflow-auto px-3 py-2 space-y-1.5">
        {filtered.length === 0 ? (
          <div className="text-[11px] text-center py-6" style={{ color: "var(--text-faint)" }}>
            {search || filter ? "No chunks match your filter." : "No chunks yet."}
          </div>
        ) : (
          filtered.map((c, i) => {
            const palette = SIDEBAR_CHUNK_COLORS[c.type] || SIDEBAR_CHUNK_COLORS.context;
            const fullIdx = decomp.chunks.findIndex(x => x.id === c.id);
            const isFirst = fullIdx === 0;
            const isLast = fullIdx === decomp.chunks.length - 1;
            return (
              <div key={c.id} className="rounded-lg overflow-hidden group/chunk" style={{
                background: "var(--surface)",
                border: `1px solid ${palette.border}30`,
              }}>
                <div className="flex items-center gap-1.5 px-2.5 py-1.5" style={{ background: palette.bg, borderBottom: `1px solid ${palette.border}25` }}>
                  <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ color: palette.text, background: `${palette.border}18` }}>{c.type}</span>
                  <span className="text-[11px] font-semibold truncate flex-1 cursor-pointer" style={{ color: "var(--text-primary)" }}
                    onClick={() => bridge.onEditChunk(c)}>
                    {c.label}
                  </span>
                  {c.found === false && (
                    <span className="text-[7px] font-bold uppercase tracking-wider px-1 py-0.5 rounded" style={{ color: "#ef4444", background: "rgba(239,68,68,0.12)" }}>Stale</span>
                  )}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover/chunk:opacity-100 transition-opacity">
                    <Tooltip text="Move up" position="top">
                      <button onClick={() => bridge.onMoveChunk(c.id, "up")} disabled={isFirst}
                        className="p-0.5 rounded hover:bg-[var(--menu-hover)] disabled:opacity-30"
                        style={{ color: "var(--text-faint)" }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 15l-6-6-6 6"/></svg>
                      </button>
                    </Tooltip>
                    <Tooltip text="Move down" position="top">
                      <button onClick={() => bridge.onMoveChunk(c.id, "down")} disabled={isLast}
                        className="p-0.5 rounded hover:bg-[var(--menu-hover)] disabled:opacity-30"
                        style={{ color: "var(--text-faint)" }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                      </button>
                    </Tooltip>
                    <Tooltip text="Edit chunk" position="top">
                      <button onClick={() => bridge.onEditChunk(c)}
                        className="p-0.5 rounded hover:bg-[var(--menu-hover)]"
                        style={{ color: "var(--text-faint)" }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                      </button>
                    </Tooltip>
                    <Tooltip text="Extract to new doc (and remove from source)" position="top">
                      <button onClick={() => bridge.onExtractChunk(c.id, true)}
                        className="p-0.5 rounded hover:bg-[var(--menu-hover)]"
                        style={{ color: "var(--text-faint)" }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 3h7v7"/><path d="M10 14L21 3"/><path d="M21 14v7H3V3h7"/></svg>
                      </button>
                    </Tooltip>
                    <Tooltip text="Delete chunk" position="top">
                      <button onClick={() => bridge.onDeleteChunk(c)}
                        className="p-0.5 rounded hover:bg-[rgba(239,68,68,0.12)]"
                        style={{ color: "#ef4444" }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </Tooltip>
                  </div>
                </div>
                <p className="px-2.5 py-2 text-[10px] leading-[1.5] cursor-pointer" style={{ color: "var(--text-muted)" }}
                  onClick={() => bridge.onEditChunk(c)}>
                  {c.content.length > 200 ? c.content.slice(0, 199).trim() + "…" : c.content}
                </p>
                <span className="hidden">{i}</span>
              </div>
            );
          })
        )}
      </div>
      {/* Footer summary */}
      <div className="shrink-0 px-3 py-1.5 text-[9px] flex items-center justify-between" style={{ borderTop: "1px solid var(--border-dim)", color: "var(--text-faint)" }}>
        <span>{decomp.chunks.length} chunk{decomp.chunks.length === 1 ? "" : "s"} · {decomp.edges.length} relation{decomp.edges.length === 1 ? "" : "s"}</span>
        {void SIDEBAR_CHUNK_TYPES /* keep tree-shaking happy */}
      </div>
    </div>
  );
}

// ─── Bundle List View — sequential document rendering with TOC ───

function BundleListView({ documents, onOpenDoc }: { documents: BundleDocument[]; onOpenDoc?: (docId: string) => void }) {
  const [renderedDocs, setRenderedDocs] = useState<Map<string, string>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeDocId, setActiveDocId] = useState<string | null>(documents[0]?.id || null);

  // Render all documents
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const newMap = new Map<string, string>();
      for (const doc of documents) {
        try {
          const result = await renderMarkdown(doc.markdown);
          const processed = postProcessHtml(result.html);
          newMap.set(doc.id, processed);
        } catch {
          newMap.set(doc.id, `<p style="color: var(--text-muted)">Failed to render</p>`);
        }
      }
      if (!cancelled) setRenderedDocs(newMap);
    })();
    return () => { cancelled = true; };
  }, [documents]);

  // Track which doc is active in viewport
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onScroll = () => {
      const sections = container.querySelectorAll("[data-doc-section]");
      let closestId: string | null = null;
      let closestDistance = Infinity;
      sections.forEach(s => {
        const rect = s.getBoundingClientRect();
        const distance = Math.abs(rect.top - 100); // 100px from top
        if (distance < closestDistance) {
          closestDistance = distance;
          closestId = s.getAttribute("data-doc-section");
        }
      });
      if (closestId) setActiveDocId(closestId);
    };
    container.addEventListener("scroll", onScroll);
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToDoc = (docId: string) => {
    const el = containerRef.current?.querySelector(`[data-doc-section="${docId}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="w-full h-full flex" style={{ background: "var(--background)" }}>
      {/* TOC sidebar */}
      <div className="shrink-0 w-56 overflow-auto" style={{ borderRight: "1px solid var(--border-dim)" }}>
        <div className="px-3 py-3">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-faint)" }}>Contents</h3>
          {documents.map((doc, i) => (
            <button key={doc.id} onClick={() => scrollToDoc(doc.id)}
              className="w-full text-left px-2.5 py-1.5 rounded-md flex items-center gap-2 transition-colors hover:bg-[var(--toggle-bg)] mb-0.5"
              style={{ background: activeDocId === doc.id ? "var(--accent-dim)" : "transparent" }}>
              <span className="text-[9px] font-mono w-4 shrink-0" style={{ color: "var(--text-faint)" }}>{i + 1}</span>
              <span className="text-xs truncate flex-1" style={{ color: activeDocId === doc.id ? "var(--accent)" : "var(--text-secondary)", fontWeight: activeDocId === doc.id ? 600 : 400 }}>{doc.title || "Untitled"}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sequential rendering */}
      <div className="flex-1 overflow-auto" ref={containerRef}>
        <div className="max-w-3xl mx-auto px-8 py-8">
          {documents.map((doc, i) => (
            <div key={doc.id} data-doc-section={doc.id} className="mb-12 pb-8" style={{ borderBottom: i < documents.length - 1 ? "1px solid var(--border-dim)" : "none" }}>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[10px] font-mono w-6 h-6 flex items-center justify-center rounded" style={{ background: "var(--accent)", color: "#000" }}>{i + 1}</span>
                <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{doc.title || "Untitled"}</h2>
                {onOpenDoc && (
                  <button onClick={() => onOpenDoc(doc.id)} className="ml-auto text-[10px] px-2 py-0.5 rounded transition-colors hover:bg-[var(--toggle-bg)]" style={{ color: "var(--text-faint)", border: "1px solid var(--border-dim)" }}>
                    Open
                  </button>
                )}
              </div>
              <div className="mdcore-rendered prose prose-invert" dangerouslySetInnerHTML={{ __html: renderedDocs.get(doc.id) || "" }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
