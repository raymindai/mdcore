"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import MdfyLogo from "@/components/MdfyLogo";
import { renderMarkdown } from "@/lib/engine";
import { postProcessHtml } from "@/lib/postprocess";
import { extractGraphHeuristic, type GraphData } from "@/lib/graph-extract";

const KnowledgeGraph = dynamic(() => import("@/components/KnowledgeGraph"), { ssr: false });

type Theme = "dark" | "light";
type ViewMode = "graph" | "list";

interface BundleDocument {
  id: string;
  title: string | null;
  markdown: string;
  created_at: string;
  updated_at: string;
}

export default function BundleViewer({
  id,
  title: initialTitle,
  description,
  isProtected = false,
  isDraft = false,
  documentCount,
  showBadge = true,
  layout = "graph",
}: {
  id: string;
  title: string | null;
  description?: string | null;
  isProtected?: boolean;
  isDraft?: boolean;
  documentCount: number;
  showBadge?: boolean;
  layout?: string;
}) {
  const [documents, setDocuments] = useState<BundleDocument[]>([]);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedHtml, setSelectedHtml] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>(layout === "list" ? "list" : "graph");
  const [theme, setThemeState] = useState<Theme>("dark");
  const [isLoading, setIsLoading] = useState(true);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [unlocked, setUnlocked] = useState(!isProtected && !isDraft);
  const [copied, setCopied] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // Theme
  useEffect(() => {
    const saved = localStorage.getItem("mdfy-theme");
    if (saved === "dark" || saved === "light") {
      setThemeState(saved);
      document.documentElement.setAttribute("data-theme", saved);
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setThemeState(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("mdfy-theme", next);
  };

  // Fetch bundle data
  useEffect(() => {
    if (!unlocked) return;

    (async () => {
      try {
        const headers: Record<string, string> = {};

        // Add auth headers if available
        try {
          const { getSupabaseBrowserClient } = await import("@/lib/supabase-browser");
          const supabase = getSupabaseBrowserClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            headers["x-user-id"] = user.id;
            if (user.email) headers["x-user-email"] = user.email;
          }
        } catch { /* no session */ }

        // Add anonymous ID
        const anonId = localStorage.getItem("mdfy-anonymous-id");
        if (anonId) headers["x-anonymous-id"] = anonId;

        const res = await fetch(`/api/bundles/${id}`, { headers });
        if (!res.ok) {
          if (res.status === 401) {
            const data = await res.json();
            if (data.passwordRequired) {
              setUnlocked(false);
              setIsLoading(false);
              return;
            }
          }
          setIsLoading(false);
          return;
        }

        const data = await res.json();

        // If owner, could redirect to editor (future)
        setDocuments(data.documents || []);

        // Use cached graph data if available, otherwise extract heuristically
        if (data.graph_data) {
          setGraphData(data.graph_data);
        } else if (data.documents?.length > 0) {
          const extracted = extractGraphHeuristic(data.documents);
          setGraphData(extracted);
        }

        setIsLoading(false);
      } catch {
        setIsLoading(false);
      }
    })();
  }, [id, unlocked]);

  // Password unlock
  const handlePasswordSubmit = async () => {
    try {
      const res = await fetch(`/api/bundles/${id}`, {
        headers: { "x-document-password": passwordInput },
      });
      if (res.ok) {
        setUnlocked(true);
        setIsLoading(true);
        setPasswordError(false);
      } else {
        setPasswordError(true);
      }
    } catch {
      setPasswordError(true);
    }
  };

  // Render selected document
  const renderDocument = useCallback(async (doc: BundleDocument) => {
    setSelectedDocId(doc.id);
    try {
      const result = await renderMarkdown(doc.markdown);
      const processed = await postProcessHtml(result.html);
      setSelectedHtml(processed);
    } catch {
      setSelectedHtml(`<p style="color: var(--text-muted)">Failed to render document</p>`);
    }
  }, [theme]);

  // Handle graph node click
  const handleNodeClick = useCallback((nodeId: string, nodeType: string, documentId?: string) => {
    if (nodeType === "document" && documentId) {
      const doc = documents.find(d => d.id === documentId);
      if (doc) renderDocument(doc);
    }
  }, [documents, renderDocument]);

  // Re-render selected doc when theme changes
  useEffect(() => {
    if (selectedDocId) {
      const doc = documents.find(d => d.id === selectedDocId);
      if (doc) renderDocument(doc);
    }
  }, [theme, selectedDocId, documents, renderDocument]);

  // Mermaid rendering
  useEffect(() => {
    if (!selectedHtml || !previewRef.current) return;
    const containers = previewRef.current.querySelectorAll(".mermaid-container");
    if (containers.length === 0) return;

    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: theme === "dark" ? "dark" : "default",
          securityLevel: "loose",
        });
        for (const el of containers) {
          const code = el.getAttribute("data-mermaid");
          if (!code) continue;
          const { svg } = await mermaid.render(`mermaid-${Math.random().toString(36).slice(2)}`, code);
          el.innerHTML = svg;
        }
      } catch { /* mermaid render error */ }
    })();
  }, [selectedHtml, theme]);

  // Copy link
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/b/${id}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard error */ }
  };

  // ─── Password screen ───
  if (isProtected && !unlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <div className="w-full max-w-sm mx-4">
          <div className="text-center mb-6">
            <MdfyLogo />
            <h1 className="text-lg font-semibold mt-4" style={{ color: "var(--text-primary)" }}>Protected Bundle</h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{documentCount} documents</p>
          </div>
          <div className="flex gap-2">
            <input
              type="password"
              value={passwordInput}
              onChange={e => { setPasswordInput(e.target.value); setPasswordError(false); }}
              onKeyDown={e => e.key === "Enter" && handlePasswordSubmit()}
              placeholder="Enter password"
              className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
              style={{
                background: "var(--surface)",
                color: "var(--text-primary)",
                border: `1px solid ${passwordError ? "#ef4444" : "var(--border)"}`,
              }}
              autoFocus
            />
            <button
              onClick={handlePasswordSubmit}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              Unlock
            </button>
          </div>
          {passwordError && <p className="text-xs mt-2 text-center" style={{ color: "#ef4444" }}>Wrong password</p>}
        </div>
      </div>
    );
  }

  // ─── Loading ───
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }} />
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>Loading bundle...</span>
        </div>
      </div>
    );
  }

  // ─── Main view ───
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
      {/* Header */}
      <header className="shrink-0 flex items-center justify-between px-4 py-3 z-30" style={{ borderBottom: "1px solid var(--border)", background: "var(--header-bg)", backdropFilter: "blur(12px)" }}>
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center">
            <MdfyLogo />
          </Link>
          <div className="flex flex-col">
            <h1 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{initialTitle || "Untitled Bundle"}</h1>
            {description && <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{description}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex rounded-md overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            <button
              onClick={() => setViewMode("graph")}
              className="px-2.5 py-1.5 text-[11px] font-medium transition-colors"
              style={{
                background: viewMode === "graph" ? "var(--accent)" : "transparent",
                color: viewMode === "graph" ? "#fff" : "var(--text-muted)",
              }}
            >
              Graph
            </button>
            <button
              onClick={() => setViewMode("list")}
              className="px-2.5 py-1.5 text-[11px] font-medium transition-colors"
              style={{
                background: viewMode === "list" ? "var(--accent)" : "transparent",
                color: viewMode === "list" ? "#fff" : "var(--text-muted)",
                borderLeft: "1px solid var(--border)",
              }}
            >
              List
            </button>
          </div>

          {/* Theme toggle */}
          <button onClick={toggleTheme} className="p-2 rounded-md transition-colors hover:bg-[var(--toggle-bg)]" title="Toggle theme">
            {theme === "dark" ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            )}
          </button>

          {/* Copy link */}
          <button onClick={copyLink} className="p-2 rounded-md transition-colors hover:bg-[var(--toggle-bg)]" title="Copy link">
            {copied ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            )}
          </button>
        </div>
      </header>

      {/* Content */}
      {viewMode === "graph" ? (
        <div className="flex-1 flex flex-col">
          {/* Knowledge Graph */}
          {graphData && graphData.nodes.length > 0 ? (
            <div className="relative" style={{ height: selectedDocId ? "45vh" : "calc(100vh - 53px)", minHeight: 300, transition: "height 0.3s ease" }}>
              <KnowledgeGraph
                graphData={graphData}
                documents={documents}
                onNodeClick={handleNodeClick}
                height="100%"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center py-20" style={{ color: "var(--text-muted)" }}>
              <p className="text-sm">No graph data available</p>
            </div>
          )}

          {/* Selected document viewer */}
          {selectedDocId && (
            <div className="flex-1 overflow-auto" style={{ borderTop: "1px solid var(--border)" }}>
              {/* Document header */}
              <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-2.5" style={{ background: "var(--surface)", borderBottom: "1px solid var(--border-dim)" }}>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium" style={{ color: "var(--accent)" }}>
                    {documents.find(d => d.id === selectedDocId)?.title || "Untitled"}
                  </span>
                  <button
                    onClick={() => window.open(`/d/${selectedDocId}`, "_blank")}
                    className="text-[10px] px-2 py-0.5 rounded transition-colors hover:bg-[var(--toggle-bg)]"
                    style={{ color: "var(--text-faint)", border: "1px solid var(--border-dim)" }}
                  >
                    Open
                  </button>
                </div>
                <button
                  onClick={() => { setSelectedDocId(null); setSelectedHtml(""); }}
                  className="text-[10px] px-2 py-0.5 rounded transition-colors hover:bg-[var(--toggle-bg)]"
                  style={{ color: "var(--text-faint)" }}
                >
                  Close
                </button>
              </div>
              {/* Rendered content */}
              <div className="max-w-3xl mx-auto px-6 py-8">
                <div
                  ref={previewRef}
                  className="mdcore-rendered prose prose-invert"
                  dangerouslySetInnerHTML={{ __html: selectedHtml }}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        /* List view */
        <div className="flex-1 overflow-auto">
          {/* Document list sidebar + graph mini widget */}
          <div className="max-w-4xl mx-auto px-6 py-8">
            {/* Mini graph */}
            {graphData && graphData.nodes.length > 0 && (
              <div className="rounded-xl overflow-hidden mb-8" style={{ border: "1px solid var(--border)", height: 250 }}>
                <KnowledgeGraph
                  graphData={graphData}
                  documents={documents}
                  onNodeClick={handleNodeClick}
                  height={250}
                />
              </div>
            )}

            {/* Documents rendered sequentially */}
            {documents.map((doc, i) => (
              <DocumentCard key={doc.id} doc={doc} theme={theme} index={i} total={documents.length} />
            ))}
          </div>
        </div>
      )}

      {/* Badge */}
      {showBadge && (
        <div className="shrink-0 text-center py-3" style={{ borderTop: "1px solid var(--border-dim)" }}>
          <a href="https://mdfy.app" target="_blank" rel="noopener noreferrer" className="text-[10px] transition-colors hover:underline" style={{ color: "var(--text-faint)" }}>
            Published with mdfy.app
          </a>
        </div>
      )}
    </div>
  );
}

// ─── Document Card (for list view) ───

function DocumentCard({ doc, theme, index, total }: { doc: BundleDocument; theme: Theme; index: number; total: number }) {
  const [html, setHtml] = useState("");
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const result = await renderMarkdown(doc.markdown);
        const processed = await postProcessHtml(result.html);
        setHtml(processed);
      } catch { /* render error */ }
    })();
  }, [doc.markdown, theme]);

  // Mermaid
  useEffect(() => {
    if (!html || !previewRef.current) return;
    const containers = previewRef.current.querySelectorAll(".mermaid-container");
    if (containers.length === 0) return;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({ startOnLoad: false, theme: theme === "dark" ? "dark" : "default", securityLevel: "loose" });
        for (const el of containers) {
          const code = el.getAttribute("data-mermaid");
          if (!code) continue;
          const { svg } = await mermaid.render(`mermaid-list-${Math.random().toString(36).slice(2)}`, code);
          el.innerHTML = svg;
        }
      } catch { /* mermaid error */ }
    })();
  }, [html, theme]);

  return (
    <div className="mb-8" style={{ borderBottom: index < total - 1 ? "1px solid var(--border-dim)" : "none", paddingBottom: index < total - 1 ? "2rem" : 0 }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{doc.title || "Untitled"}</h2>
        <a href={`/d/${doc.id}`} target="_blank" rel="noopener noreferrer" className="text-[10px] px-2 py-0.5 rounded transition-colors hover:bg-[var(--toggle-bg)]" style={{ color: "var(--text-faint)", border: "1px solid var(--border-dim)" }}>
          Open
        </a>
      </div>
      <div
        ref={previewRef}
        className="mdcore-rendered prose prose-invert"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
