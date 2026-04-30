"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import MdfyLogo from "@/components/MdfyLogo";
import { renderMarkdown } from "@/lib/engine";
import { postProcessHtml } from "@/lib/postprocess";

const BundleCanvas = dynamic(() => import("@/components/BundleCanvas"), { ssr: false });

type Theme = "dark" | "light";

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
  documentCount,
  showBadge = true,
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
  const [aiGraph, setAiGraph] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [editToken, setEditToken] = useState<string | null>(null);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedHtml, setSelectedHtml] = useState("");
  const [theme, setThemeState] = useState<Theme>("dark");
  const [isLoading, setIsLoading] = useState(true);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [unlocked, setUnlocked] = useState(!isProtected);
  const [copied, setCopied] = useState(false);
  const [contextCopied, setContextCopied] = useState(false);
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

        // Build headers from localStorage (non-blocking)
        const anonId = localStorage.getItem("mdfy-anonymous-id");
        if (anonId) headers["x-anonymous-id"] = anonId;
        const storedUserId = localStorage.getItem("mdfy-user-id");
        if (storedUserId) headers["x-user-id"] = storedUserId;
        const storedEmail = localStorage.getItem("mdfy-user-email");
        if (storedEmail) headers["x-user-email"] = storedEmail;

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
        const docs = data.documents || [];
        setDocuments(docs);
        if (data.editToken) setEditToken(data.editToken);

        // Use cached AI graph if available
        if (data.graph_data) {
          setAiGraph(data.graph_data);
        }

        // Auto-open first document
        if (docs.length > 0) {
          const first = docs[0];
          setSelectedDocId(first.id);
          try {
            const result = await renderMarkdown(first.markdown);
            const processed = postProcessHtml(result.html);
            setSelectedHtml(processed);
          } catch { /* render error */ }
        }
        setIsLoading(false);

        // Trigger AI analysis if no cached graph
        if (!data.graph_data && docs.length >= 2) {
          setIsAnalyzing(true);
          try {
            const graphRes = await fetch(`/api/bundles/${id}/graph`, {
              method: "POST",
              headers: { "Content-Type": "application/json", ...headers },
              body: JSON.stringify({ editToken: data.editToken }),
            });
            if (graphRes.ok) {
              const graphData = await graphRes.json();
              setAiGraph(graphData.graphData);
            }
          } catch { /* AI not available */ }
          setIsAnalyzing(false);
        }
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

  // Copy as Context — concatenate all docs for AI
  const handleCopyContext = useCallback(async () => {
    const context = documents.map((doc, i) => {
      const title = doc.title || "Untitled";
      return `--- Document ${i + 1}: ${title} ---\n\n${doc.markdown}`;
    }).join("\n\n---\n\n");

    const header = `Bundle: ${initialTitle || "Untitled Bundle"}\nDocuments: ${documents.length}\n\n`;
    try {
      await navigator.clipboard.writeText(header + context);
      setContextCopied(true);
      setTimeout(() => setContextCopied(false), 2000);
    } catch { /* clipboard error */ }
  }, [documents, initialTitle]);

  // Render selected document
  const renderDocument = useCallback(async (doc: BundleDocument) => {
    setSelectedDocId(doc.id);
    try {
      const result = await renderMarkdown(doc.markdown);
      const processed = postProcessHtml(result.html);
      setSelectedHtml(processed);
    } catch {
      setSelectedHtml(`<p style="color: var(--text-muted)">Failed to render document</p>`);
    }
  }, []);

  // Handle canvas node click
  const handleDocumentClick = useCallback((docId: string) => {
    const doc = documents.find(d => d.id === docId);
    if (doc) renderDocument(doc);
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
        mermaid.initialize({ startOnLoad: false, theme: theme === "dark" ? "dark" : "default", securityLevel: "loose" });
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
              style={{ background: "var(--surface)", color: "var(--text-primary)", border: `1px solid ${passwordError ? "#ef4444" : "var(--border)"}` }}
              autoFocus
            />
            <button onClick={handlePasswordSubmit} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "var(--accent)", color: "#fff" }}>
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

      {/* Canvas + Document Reader split */}
      <div className="flex" style={{ height: "calc(100vh - 53px)" }}>
        {/* Canvas */}
        <div className="relative" style={{ flex: 1, height: "100%", borderRight: selectedDocId ? "1px solid var(--border)" : "none" }}>
          {documents.length > 0 ? (
            <BundleCanvas
              documents={documents}
              aiGraph={aiGraph}
              isAnalyzing={isAnalyzing}
              onDocumentClick={handleDocumentClick}
              onCopyContext={handleCopyContext}
            />
          ) : (
            <div className="flex items-center justify-center h-full" style={{ color: "var(--text-muted)" }}>
              <p className="text-sm">No documents in this bundle</p>
            </div>
          )}

          {/* Context copied toast */}
          {contextCopied && (
            <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-lg text-xs font-medium animate-in fade-in" style={{ background: "var(--accent)", color: "#fff", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
              Copied all documents as AI context
            </div>
          )}
        </div>

        {/* Document Reader Panel */}
        {selectedDocId && (
          <div className="w-[45%] max-w-2xl flex flex-col overflow-hidden">
            {/* Panel header */}
            <div className="shrink-0 flex items-center justify-between px-4 py-2.5" style={{ borderBottom: "1px solid var(--border-dim)", background: "var(--surface)" }}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold" style={{ color: "var(--accent)" }}>
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
                className="p-1 rounded transition-colors hover:bg-[var(--toggle-bg)]"
                style={{ color: "var(--text-faint)" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            {/* Rendered content */}
            <div className="flex-1 overflow-auto px-6 py-6">
              <div
                ref={previewRef}
                className="mdcore-rendered prose prose-invert"
                dangerouslySetInnerHTML={{ __html: selectedHtml }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Badge */}
      {showBadge && !selectedDocId && (
        <div className="absolute bottom-3 right-3 z-20">
          <a href="https://mdfy.app" target="_blank" rel="noopener noreferrer" className="text-[9px] px-2 py-1 rounded transition-colors hover:underline" style={{ color: "var(--text-faint)", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }}>
            Published with mdfy.app
          </a>
        </div>
      )}
    </div>
  );
}
