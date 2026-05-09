"use client";

// Hub-scoped chat panel — twin of BundleChat, but with retrieval that
// spans the user's whole hub via the concept_index ontology. Streams
// plain text (the /api/hub/[slug]/chat backend writes Anthropic deltas
// directly to the response body, no SSE wrapper) and renders
// [doc:<id>] citation chips inline.

import { useState, useRef, useEffect, useCallback } from "react";
import { ScrollText, GitBranch, Sparkles, HelpCircle, RotateCcw, Network } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface HubChatProps {
  slug: string;
  hubName?: string;
  conceptCount?: number;
  /** Click handler for [doc:<id>] citation chips. Caller resolves the
   *  doc id (open as tab, navigate, etc.). */
  onCitationClick?: (docId: string) => void;
}

const QUICK_ACTIONS = [
  { label: "Map of my hub", icon: <Network width={11} height={11} style={{ color: "var(--accent)" }} />, question: "Give me a high-level map of the main concepts in this hub and how they connect." },
  { label: "What's important", icon: <Sparkles width={11} height={11} style={{ color: "#60a5fa" }} />, question: "Which concepts are most central across my docs? Why?" },
  { label: "Connections", icon: <GitBranch width={11} height={11} style={{ color: "#fbbf24" }} />, question: "What are the most surprising connections between docs in this hub?" },
  { label: "Gaps", icon: <HelpCircle width={11} height={11} style={{ color: "#a78bfa" }} />, question: "Based on my docs, what important questions am I NOT answering yet?" },
];

export default function HubChat({ slug, hubName, conceptCount, onCitationClick }: HubChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Persist chat history per hub so reloading keeps the conversation.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`mdfy-hub-chat-${slug}`);
      if (saved) setMessages(JSON.parse(saved));
    } catch { /* ignore */ }
  }, [slug]);
  useEffect(() => {
    if (messages.length > 0) {
      try { localStorage.setItem(`mdfy-hub-chat-${slug}`, JSON.stringify(messages)); } catch { /* ignore */ }
    }
  }, [messages, slug]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isStreaming]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;
    setError(null);
    const userMsg: Message = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);
    setMessages([...newMessages, { role: "assistant", content: "" }]);

    try {
      const res = await fetch(`/api/hub/${slug}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text.trim(),
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok || !res.body) {
        setError(`Failed to start chat (${res.status})`);
        setIsStreaming(false);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        assistantContent += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: assistantContent };
          return next;
        });
      }
    } catch {
      setError("Connection failed");
    } finally {
      setIsStreaming(false);
    }
  }, [slug, messages, isStreaming]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const clearChat = () => {
    if (!confirm("Clear chat history?")) return;
    setMessages([]);
    try { localStorage.removeItem(`mdfy-hub-chat-${slug}`); } catch { /* ignore */ }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-2 py-2 shrink-0" style={{ borderBottom: "1px solid var(--border-dim)" }}>
        <div className="grid grid-cols-2 gap-1">
          {QUICK_ACTIONS.map((q, i) => (
            <button key={i} onClick={() => sendMessage(q.question)} disabled={isStreaming}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-caption transition-colors hover:bg-[var(--accent-dim)] disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "var(--toggle-bg)", color: "var(--text-primary)" }}>
              {q.icon}
              <span>{q.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center mb-3" style={{ background: "var(--accent-dim)" }}>
              <Network width={22} height={22} style={{ color: "var(--accent)" }} />
            </div>
            <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{hubName || "Hub Assistant"}</h3>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {conceptCount && conceptCount > 0
                ? `${conceptCount} concepts indexed — ask anything`
                : "Run Analyze on a bundle to populate the ontology, then ask anything"}
            </p>
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

      <form onSubmit={onSubmit} className="shrink-0 px-2 py-2" style={{ borderTop: "1px solid var(--border-dim)" }}>
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg" style={{ background: "var(--toggle-bg)", border: "1px solid var(--border-dim)" }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !(e.nativeEvent as unknown as { isComposing?: boolean }).isComposing && input.trim() && !isStreaming) {
                e.preventDefault();
                onSubmit(e as unknown as React.FormEvent);
              }
            }}
            placeholder="Ask anything about your hub…"
            maxLength={500}
            disabled={isStreaming}
            autoFocus
            className="flex-1 text-caption bg-transparent"
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
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: "var(--accent-dim)" }}>
          <Network width={11} height={11} style={{ color: "var(--accent)" }} />
        </div>
        <span className="text-caption font-semibold uppercase tracking-wider" style={{ color: "var(--accent)" }}>Hub</span>
      </div>
      <div className="text-sm leading-relaxed pl-6" style={{ color: "var(--text-primary)" }}>
        <RenderedMarkdown content={message.content} onCitationClick={onCitationClick} />
        {isStreaming && <span className="inline-block w-1.5 h-4 ml-0.5 animate-pulse" style={{ background: "var(--accent)", verticalAlign: "middle" }} />}
      </div>
    </div>
  );
}

// Citation chip rendering — backend emits [doc:<id>] where <id> is the
// real document nanoid (different from BundleChat's [doc:N] indexed
// scheme). Click to navigate.
function RenderedMarkdown({ content, onCitationClick }: { content: string; onCitationClick?: (docId: string) => void }) {
  const segments: Array<{ type: "text" | "citation"; value: string; docId?: string }> = [];
  const regex = /\[doc:([\w-]+)\]/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: content.slice(lastIndex, match.index) });
    }
    segments.push({ type: "citation", value: match[0], docId: match[1] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    segments.push({ type: "text", value: content.slice(lastIndex) });
  }
  return (
    <>
      {segments.map((seg, i) => {
        if (seg.type === "citation" && seg.docId) {
          return (
            <button key={i} onClick={() => onCitationClick?.(seg.docId!)} title={`Open doc ${seg.docId}`}
              className="inline-flex items-center mx-0.5 px-1.5 py-0.5 rounded text-caption font-mono font-semibold transition-colors hover:brightness-125 align-baseline"
              style={{ background: "var(--accent-dim)", color: "var(--accent)", verticalAlign: "baseline" }}>
              <ScrollText width={9} height={9} style={{ marginRight: 3 }} />
              {seg.docId}
            </button>
          );
        }
        return <span key={i} dangerouslySetInnerHTML={{ __html: renderBasicMarkdown(seg.value) }} />;
      })}
    </>
  );
}

function renderBasicMarkdown(text: string): string {
  return text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, '<code style="background: var(--toggle-bg); padding: 1px 5px; border-radius: 3px; font-size: 0.9em;">$1</code>')
    .replace(/^#{1,3}\s+(.+)$/gm, '<strong style="display: block; margin-top: 0.5em;">$1</strong>')
    .replace(/^[-*]\s+(.+)$/gm, '<div style="margin-left: 1em; position: relative;"><span style="position: absolute; left: -1em; color: var(--accent)">•</span>$1</div>')
    .replace(/^\d+\.\s+(.+)$/gm, '<div style="margin-left: 1em;">$1</div>')
    .replace(/\n\n/g, "<br/><br/>")
    .replace(/\n/g, "<br/>");
}
