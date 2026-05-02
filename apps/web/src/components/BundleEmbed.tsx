"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { renderMarkdown } from "@/lib/engine";
import { postProcessHtml } from "@/lib/postprocess";

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
}

export default function BundleEmbed({ bundleId, view = "canvas", onOpenDoc }: BundleEmbedProps) {
  const [documents, setDocuments] = useState<BundleDocument[]>([]);
  const [aiGraph, setAiGraph] = useState<any>(null);
  const [editToken, setEditToken] = useState<string | null>(null);
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
    const headers: Record<string, string> = {};
    const anonId = localStorage.getItem("mdfy-anonymous-id");
    if (anonId) headers["x-anonymous-id"] = anonId;
    const userId = localStorage.getItem("mdfy-user-id");
    if (userId) headers["x-user-id"] = userId;

    fetch(`/api/bundles/${bundleId}`, { headers })
      .then(res => res.ok ? res.json() : null)
      .then(async (data) => {
        if (!data) { setIsLoading(false); return; }
        setDocuments(data.documents || []);
        if (data.editToken) setEditToken(data.editToken);
        if (data.graph_data) setAiGraph(data.graph_data);
        setIsLoading(false);

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
  }, [bundleId]);

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
      setSelectedNodeInfo({
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
      setSelectedNodeInfo({
        type: concept.type, label: concept.label, weight: concept.weight, description: concept.description,
        connectedDocs: connectedDocs.map(d => ({ id: d.id, title: d.title || "Untitled" })),
        relationships,
      });
      return;
    }
    // Summary node
    if (nodeId === "analysis:summary" && aiGraph) {
      setSelectedNodeInfo({
        type: "analysis", label: "Bundle Analysis",
        summary: aiGraph.summary, themes: aiGraph.themes, insights: aiGraph.insights,
        keyTakeaways: aiGraph.keyTakeaways, gaps: aiGraph.gaps,
      });
      return;
    }
  }, [onOpenDoc, aiGraph, documents]);

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
    <div className="w-full h-full flex">
      <div className="flex-1 min-w-0">
        <BundleCanvas
          documents={documents}
          aiGraph={aiGraph}
          isAnalyzing={isAnalyzing}
          onDocumentClick={handleNodeClick}
          onCopyContext={handleCopyContext}
          onRegenerate={handleRegenerate}
        />
      </div>
      {selectedNodeInfo && (
        <NodeInfoPanel info={selectedNodeInfo} onClose={() => setSelectedNodeInfo(null)} onOpenDoc={onOpenDoc} />
      )}
    </div>
  );
}

// ─── Node Info Side Panel — shows details for clicked concept/analysis node ───

function NodeInfoPanel({ info, onClose, onOpenDoc }: { info: any; onClose: () => void; onOpenDoc?: (docId: string) => void }) {
  const colorMap: Record<string, string> = {
    analysis: "#60a5fa", entity: "#4ade80", tag: "#a78bfa", concept: "#38bdf8", document: "#fb923c",
  };
  const iconMap: Record<string, string> = {
    analysis: "◈", entity: "◆", tag: "#", concept: "○", document: "■",
  };
  const color = colorMap[info.type] || "#38bdf8";

  return (
    <div className="shrink-0 flex flex-col overflow-hidden" style={{ width: "min(420px, 50%)", borderLeft: "1px solid var(--border)", background: "var(--surface)" }}>
      {/* Header */}
      <div className="shrink-0 px-4 py-2.5 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-sm shrink-0" style={{ color }}>{iconMap[info.type]}</span>
          <span className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{info.label}</span>
          <span className="text-xs px-1.5 py-0.5 rounded shrink-0" style={{ background: `${color}20`, color }}>{info.type}</span>
          {info.type === "document" && info.docId && onOpenDoc && (
            <button onClick={() => onOpenDoc(info.docId)} className="text-xs px-2 py-0.5 rounded shrink-0 transition-colors hover:bg-[var(--accent-dim)]" style={{ color: "var(--accent)", border: "1px solid var(--accent)" }}>
              Open as tab
            </button>
          )}
        </div>
        <button onClick={onClose} className="p-1.5 rounded transition-colors hover:bg-[var(--toggle-bg)] shrink-0" style={{ color: "var(--text-faint)" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-5 py-5 space-y-5">
        {/* Document panel */}
        {info.type === "document" && (
          <>
            {info.docStats && (
              <div className="flex flex-wrap gap-2">
                <span className="text-xs px-2 py-0.5 rounded" style={{ background: "var(--toggle-bg)", color: "var(--text-faint)" }}>{info.docStats.wordCount.toLocaleString()} words</span>
                <span className="text-xs px-2 py-0.5 rounded" style={{ background: "var(--toggle-bg)", color: "var(--text-faint)" }}>~{info.docStats.readingTime} min</span>
                <span className="text-xs px-2 py-0.5 rounded" style={{ background: "var(--toggle-bg)", color: "var(--text-faint)" }}>{info.docStats.sections} sections</span>
                {info.docStats.hasCode && <span className="text-xs px-2 py-0.5 rounded" style={{ background: "rgba(167,139,250,0.12)", color: "#a78bfa" }}>Code</span>}
              </div>
            )}
            {info.documentSummary && (
              <div className="rounded-lg p-3" style={{ background: "var(--accent-dim)", border: "1px solid var(--accent)" }}>
                <h4 className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--accent)" }}>AI Summary</h4>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>{info.documentSummary}</p>
              </div>
            )}
            {info.connectedDocs && info.connectedDocs.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-faint)" }}>Related Concepts</h4>
                <div className="flex flex-wrap gap-1.5">
                  {info.connectedDocs.map((c: { id: string; title: string }) => (
                    <span key={c.id} className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(56,189,248,0.1)", color: "#38bdf8", border: "1px solid rgba(56,189,248,0.2)" }}>{c.title}</span>
                  ))}
                </div>
              </div>
            )}
            {info.docContent && (
              <div className="pt-3" style={{ borderTop: "1px solid var(--border-dim)" }}>
                <div className="mdcore-rendered prose prose-invert" dangerouslySetInnerHTML={{ __html: info.docContent }} />
              </div>
            )}
          </>
        )}

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
                    Open as tab
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
