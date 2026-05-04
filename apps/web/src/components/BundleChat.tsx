"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ScrollText, CheckSquare, Scale, HelpCircle, RotateCcw } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  docMap?: Record<number, { id: string; title: string }>;
}

interface BundleChatProps {
  bundleId: string;
  bundleTitle?: string;
  documentCount?: number;
  onCitationClick?: (docId: string) => void;
  onClose?: () => void;
}

// Quick action prompts shown as a 2x2 grid (matches Document Assistant pattern)
const QUICK_ACTIONS = [
  { label: "Summarize", icon: <ScrollText width={11} height={11} style={{ color: "var(--accent)" }} />, question: "Give me a clear, structured summary of what this bundle contains as a whole." },
  { label: "Action items", icon: <CheckSquare width={11} height={11} style={{ color: "#60a5fa" }} />, question: "Extract all action items, tasks, or recommendations mentioned across the documents. Format as a checklist." },
  { label: "Tensions", icon: <Scale width={11} height={11} style={{ color: "#fbbf24" }} />, question: "What tensions, contradictions, or conflicting viewpoints exist between these documents?" },
  { label: "What's missing", icon: <HelpCircle width={11} height={11} style={{ color: "#a78bfa" }} />, question: "What important topics, perspectives, or information are missing from this bundle?" },
];

export default function BundleChat({ bundleId, bundleTitle, documentCount, onCitationClick, onClose }: BundleChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load chat history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`mdfy-chat-${bundleId}`);
      if (saved) setMessages(JSON.parse(saved));
    } catch { /* ignore */ }
  }, [bundleId]);

  // Save chat history
  useEffect(() => {
    if (messages.length > 0) {
      try { localStorage.setItem(`mdfy-chat-${bundleId}`, JSON.stringify(messages)); } catch { /* ignore */ }
    }
  }, [messages, bundleId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;
    setError(null);

    const userMsg: Message = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);

    // Add empty assistant message for streaming
    setMessages([...newMessages, { role: "assistant", content: "" }]);

    try {
      const res = await fetch(`/api/bundles/${bundleId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text.trim(),
          history: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok || !res.body) {
        setError("Failed to start chat");
        setIsStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantContent = "";
      let docMap: Record<number, { id: string; title: string }> | undefined;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.error) { setError(data.error); break; }
            if (data.text) {
              assistantContent += data.text;
              setMessages(prev => {
                const next = [...prev];
                next[next.length - 1] = { role: "assistant", content: assistantContent, docMap };
                return next;
              });
            }
            if (data.done && data.docMap) {
              docMap = data.docMap;
              setMessages(prev => {
                const next = [...prev];
                next[next.length - 1] = { role: "assistant", content: assistantContent, docMap };
                return next;
              });
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch {
      setError("Connection failed");
    } finally {
      setIsStreaming(false);
    }
  }, [bundleId, messages, isStreaming]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  // Kept for potential future textarea use; the input is now single-line.

  const clearChat = () => {
    if (!confirm("Clear chat history?")) return;
    setMessages([]);
    try { localStorage.removeItem(`mdfy-chat-${bundleId}`); } catch { /* ignore */ }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Quick actions — 2x2 grid, mirrors Document Assistant style */}
      <div className="px-2 py-2 shrink-0" style={{ borderBottom: "1px solid var(--border-dim)" }}>
        <div className="grid grid-cols-2 gap-1">
          {QUICK_ACTIONS.map((q, i) => (
            <button key={i} onClick={() => sendMessage(q.question)}
              disabled={isStreaming}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[10px] transition-colors hover:bg-[var(--accent-dim)] disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "var(--toggle-bg)", color: "var(--text-primary)" }}>
              {q.icon}
              <span>{q.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Messages / empty state */}
      <div className="flex-1 overflow-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center mb-3" style={{ background: "var(--accent-dim)" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
            </div>
            <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{bundleTitle || "This bundle"}</h3>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{documentCount} document{documentCount !== 1 ? "s" : ""} loaded · Ask anything</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <MessageBubble key={i} message={msg} onCitationClick={onCitationClick} isStreaming={isStreaming && i === messages.length - 1} />
            ))}
            {error && (
              <div className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>
                {error}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input — visually matches Document Assistant input exactly:
          same wrapper padding, same inner box (toggle-bg + border-dim, rounded-lg,
          px-3 py-2, gap-1.5), same text-[11px], same paper-plane Send icon. */}
      <form onSubmit={onSubmit} className="shrink-0 px-2 py-2" style={{ borderTop: "1px solid var(--border-dim)" }}>
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg" style={{ background: "var(--toggle-bg)", border: "1px solid var(--border-dim)" }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !(e.nativeEvent as unknown as { isComposing?: boolean }).isComposing && input.trim() && !isStreaming) {
                e.preventDefault();
                onSubmit(e as unknown as React.FormEvent);
              }
            }}
            placeholder="Ask anything about this bundle..."
            maxLength={500}
            disabled={isStreaming}
            autoFocus
            className="flex-1 text-[11px] bg-transparent"
            style={{ color: "var(--text-secondary)", border: "none", outline: "none" }}
          />
          {messages.length > 0 && (
            <button type="button" onClick={clearChat}
              className="shrink-0 flex items-center justify-center w-5 h-5 rounded transition-colors hover:bg-[var(--menu-hover)]"
              style={{ color: "var(--text-faint)" }}
              title="Clear chat history">
              <RotateCcw width={9} height={9} />
            </button>
          )}
          <button type="submit" disabled={!input.trim() || isStreaming}
            className="shrink-0 p-1.5 rounded-md transition-colors"
            style={{ background: input.trim() && !isStreaming ? "var(--accent)" : "transparent", color: input.trim() && !isStreaming ? "#000" : "var(--text-faint)" }}
            title="Send">
            {isStreaming ? (
              <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin block" />
            ) : (
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2L2 8.5l5 2L9.5 16z"/><path d="M14 2L7 10.5"/></svg>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Message Bubble with citation rendering ───

function MessageBubble({ message, onCitationClick, isStreaming }: { message: Message; onCitationClick?: (docId: string) => void; isStreaming?: boolean }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] px-3 py-2 rounded-2xl rounded-tr-sm text-sm" style={{ background: "var(--accent)", color: "#fff" }}>
          {message.content}
        </div>
      </div>
    );
  }

  // Render assistant message with citation parsing
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: "var(--accent-dim)" }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/></svg>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--accent)" }}>AI</span>
      </div>
      <div className="text-sm leading-relaxed pl-6" style={{ color: "var(--text-primary)" }}>
        <RenderedMarkdown content={message.content} docMap={message.docMap} onCitationClick={onCitationClick} />
        {isStreaming && <span className="inline-block w-1.5 h-4 ml-0.5 animate-pulse" style={{ background: "var(--accent)", verticalAlign: "middle" }} />}
      </div>
    </div>
  );
}

// ─── Markdown rendering with [doc:N] citation parsing ───

function RenderedMarkdown({ content, docMap, onCitationClick }: { content: string; docMap?: Record<number, { id: string; title: string }>; onCitationClick?: (docId: string) => void }) {
  // Parse citations and split into segments
  const segments: Array<{ type: "text" | "citation"; value: string; docNum?: number }> = [];
  const regex = /\[doc:(\d+)\]/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: content.slice(lastIndex, match.index) });
    }
    segments.push({ type: "citation", value: match[0], docNum: parseInt(match[1]) });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    segments.push({ type: "text", value: content.slice(lastIndex) });
  }

  return (
    <>
      {segments.map((seg, i) => {
        if (seg.type === "citation" && seg.docNum && docMap?.[seg.docNum]) {
          const doc = docMap[seg.docNum];
          return (
            <button key={i} onClick={() => onCitationClick?.(doc.id)} title={doc.title}
              className="inline-flex items-center gap-0.5 mx-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors hover:brightness-125 align-baseline"
              style={{ background: "var(--accent-dim)", color: "var(--accent)", verticalAlign: "baseline" }}>
              {seg.docNum}
            </button>
          );
        }
        // Render text with basic markdown (paragraphs, bold, lists)
        return <span key={i} dangerouslySetInnerHTML={{ __html: renderBasicMarkdown(seg.value) }} />;
      })}
    </>
  );
}

function renderBasicMarkdown(text: string): string {
  return text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code style="background: var(--toggle-bg); padding: 1px 5px; border-radius: 3px; font-size: 0.9em;">$1</code>')
    .replace(/^#{1,3}\s+(.+)$/gm, '<strong style="display: block; margin-top: 0.5em;">$1</strong>')
    .replace(/^[-*]\s+(.+)$/gm, '<div style="margin-left: 1em; position: relative;"><span style="position: absolute; left: -1em; color: var(--accent)">•</span>$1</div>')
    .replace(/^\d+\.\s+(.+)$/gm, '<div style="margin-left: 1em;">$1</div>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}
