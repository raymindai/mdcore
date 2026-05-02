"use client";

import { useState, useRef, useEffect, useCallback } from "react";

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

const SUGGESTED_QUESTIONS = [
  { label: "Summarize this bundle", icon: "📋", question: "Give me a clear, structured summary of what this bundle contains as a whole." },
  { label: "Find action items", icon: "✓", question: "Extract all action items, tasks, or recommendations mentioned across the documents. Format as a checklist." },
  { label: "Key tensions & contradictions", icon: "⚖", question: "What tensions, contradictions, or conflicting viewpoints exist between these documents?" },
  { label: "What's missing?", icon: "❓", question: "What important topics, perspectives, or information are missing from this bundle?" },
];

export default function BundleChat({ bundleId, bundleTitle, documentCount, onCitationClick, onClose }: BundleChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    if (!confirm("Clear chat history?")) return;
    setMessages([]);
    try { localStorage.removeItem(`mdfy-chat-${bundleId}`); } catch { /* ignore */ }
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--surface)", borderLeft: "1px solid var(--border)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 shrink-0" style={{ borderBottom: "1px solid var(--border-dim)" }}>
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Chat with Bundle</span>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button onClick={clearChat} title="Clear history" className="p-1.5 rounded transition-colors hover:bg-[var(--toggle-bg)]" style={{ color: "var(--text-faint)" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="p-1.5 rounded transition-colors hover:bg-[var(--toggle-bg)]" style={{ color: "var(--text-faint)" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center mb-3" style={{ background: "var(--accent-dim)" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
              </div>
              <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{bundleTitle || "This bundle"}</h3>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{documentCount} document{documentCount !== 1 ? "s" : ""} loaded · Ask anything</p>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>Suggested</p>
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button key={i} onClick={() => sendMessage(q.question)}
                  className="w-full text-left px-3 py-2.5 rounded-lg flex items-start gap-2.5 transition-colors hover:bg-[var(--accent-dim)]"
                  style={{ background: "var(--toggle-bg)" }}>
                  <span className="text-base shrink-0" style={{ marginTop: 1 }}>{q.icon}</span>
                  <span className="text-xs" style={{ color: "var(--text-primary)" }}>{q.label}</span>
                </button>
              ))}
            </div>
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

      {/* Input */}
      <form onSubmit={onSubmit} className="shrink-0 p-3" style={{ borderTop: "1px solid var(--border-dim)" }}>
        <div className="flex items-end gap-2 rounded-xl p-2" style={{ background: "var(--background)", border: "1px solid var(--border)" }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask anything about this bundle..."
            rows={1}
            disabled={isStreaming}
            className="flex-1 resize-none outline-none bg-transparent text-sm"
            style={{ color: "var(--text-primary)", maxHeight: 120, minHeight: 20 }}
          />
          <button type="submit" disabled={!input.trim() || isStreaming}
            className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style={{
              background: input.trim() && !isStreaming ? "var(--accent)" : "var(--toggle-bg)",
              color: input.trim() && !isStreaming ? "#fff" : "var(--text-faint)",
              cursor: input.trim() && !isStreaming ? "pointer" : "default",
            }}>
            {isStreaming ? (
              <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            )}
          </button>
        </div>
        <p className="text-[10px] mt-1.5 px-1" style={{ color: "var(--text-faint)" }}>Enter to send · Shift+Enter for newline</p>
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
