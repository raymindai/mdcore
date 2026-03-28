"use client";

import { useEffect, useState, useCallback, useRef } from "react";

interface FloatingToolbarProps {
  containerRef: React.RefObject<HTMLElement | null>;
}

export default function FloatingToolbar({ containerRef }: FloatingToolbarProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [active, setActive] = useState<Record<string, boolean>>({});
  const [blockType, setBlockType] = useState("p");
  const [inputPopup, setInputPopup] = useState<{ label: string; onSubmit: (v: string) => void } | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const updateToolbar = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) { setPos(null); return; }
    const container = containerRef.current;
    if (!container) return;
    const anchor = sel.anchorNode;
    if (!anchor || !container.contains(anchor)) { setPos(null); return; }
    const el = anchor instanceof HTMLElement ? anchor : anchor.parentElement;
    if (el?.closest("pre, .mermaid-container, .math-rendered, code, table")) { setPos(null); return; }
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    if (rect.width === 0) { setPos(null); return; }

    setPos({ x: rect.left + rect.width / 2, y: rect.top - 8 });
    setActive({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      strikethrough: document.queryCommandState("strikeThrough"),
      ul: document.queryCommandState("insertUnorderedList"),
      ol: document.queryCommandState("insertOrderedList"),
      code: !!el?.closest("code"),
    });

    const block = document.queryCommandValue("formatBlock").toLowerCase().replace(/[<>]/g, "");
    if (block && /^h[1-6]$|^p$|^blockquote$/.test(block)) {
      setBlockType(block);
    } else {
      const heading = el?.closest("h1,h2,h3,h4,h5,h6,blockquote,p,li");
      if (heading) {
        const tag = heading.tagName.toLowerCase();
        setBlockType(tag === "li" ? "p" : tag);
      }
    }
  }, [containerRef]);

  useEffect(() => {
    document.addEventListener("selectionchange", updateToolbar);
    return () => document.removeEventListener("selectionchange", updateToolbar);
  }, [updateToolbar]);

  useEffect(() => {
    const scroller = containerRef.current?.closest(".overflow-auto");
    if (!scroller) return;
    const hide = () => setPos(null);
    scroller.addEventListener("scroll", hide);
    return () => scroller.removeEventListener("scroll", hide);
  }, [containerRef]);

  const exec = useCallback((cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    containerRef.current?.querySelector("article")?.focus();
    updateToolbar();
  }, [containerRef, updateToolbar]);

  const fmtBlock = useCallback((tag: string) => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const node = sel.anchorNode;
    const block = node instanceof HTMLElement ? node : node?.parentElement;
    const heading = block?.closest("h1,h2,h3,h4,h5,h6,blockquote");
    if (heading && heading.tagName.toLowerCase() === tag) {
      document.execCommand("formatBlock", false, "p");
    } else {
      document.execCommand("formatBlock", false, tag);
    }
    updateToolbar();
  }, [updateToolbar]);

  if (!pos) return null;

  const I = 14;
  const b = "w-7 h-7 flex items-center justify-center rounded transition-colors hover:bg-[var(--accent-dim)] hover:text-[var(--accent)] shrink-0";
  const on = "bg-[var(--accent-dim)] text-[var(--accent)]";
  const sep = <div className="w-px h-5 shrink-0 mx-0.5" style={{ background: "var(--border)" }} />;

  // Clamp position so toolbar doesn't overflow viewport
  const clampedX = Math.max(200, Math.min(pos.x, window.innerWidth - 200));

  return (
    <div
      ref={toolbarRef}
      className="fixed z-[9998] flex flex-wrap items-center gap-0.5 px-1.5 py-1 rounded-lg shadow-xl border max-w-[90vw]"
      style={{
        left: clampedX, top: pos.y,
        transform: "translate(-50%, -100%)",
        background: "var(--surface)", borderColor: "var(--border)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {/* Undo / Redo */}
      <button className={b} onClick={() => exec("undo")}>
        <svg width={I} height={I} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 7h7a3 3 0 010 6H8"/><path d="M6 4L3 7l3 3"/></svg>
      </button>
      <button className={b} onClick={() => exec("redo")}>
        <svg width={I} height={I} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M13 7H6a3 3 0 000 6h2"/><path d="M10 4l3 3-3 3"/></svg>
      </button>
      {sep}

      {/* Headings */}
      <button className={`${b} ${blockType === "h1" ? on : ""}`} onClick={() => fmtBlock("h1")}><span className="text-[10px] font-bold">H1</span></button>
      <button className={`${b} ${blockType === "h2" ? on : ""}`} onClick={() => fmtBlock("h2")}><span className="text-[10px] font-bold">H2</span></button>
      <button className={`${b} ${blockType === "h3" ? on : ""}`} onClick={() => fmtBlock("h3")}><span className="text-[10px] font-semibold">H3</span></button>
      <button className={`${b} ${blockType === "h4" ? on : ""}`} onClick={() => fmtBlock("h4")}><span className="text-[10px]">H4</span></button>
      <button className={`${b} ${blockType === "h5" ? on : ""}`} onClick={() => fmtBlock("h5")}><span className="text-[10px]">H5</span></button>
      <button className={`${b} ${blockType === "h6" ? on : ""}`} onClick={() => fmtBlock("h6")}><span className="text-[10px]">H6</span></button>
      <button className={`${b} ${blockType === "p" ? on : ""}`} onClick={() => fmtBlock("p")}><span className="text-[10px]">P</span></button>
      {sep}

      {/* Inline */}
      <button className={`${b} ${active.bold ? on : ""}`} onClick={() => exec("bold")}><span className="font-bold text-[12px]">B</span></button>
      <button className={`${b} ${active.italic ? on : ""}`} onClick={() => exec("italic")}><span className="italic text-[12px]">I</span></button>
      <button className={`${b} ${active.strikethrough ? on : ""}`} onClick={() => exec("strikeThrough")}><span className="line-through text-[12px]">S</span></button>
      <button className={`${b} ${active.code ? on : ""}`} onClick={() => {
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed && sel.rangeCount) {
          try { sel.getRangeAt(0).surroundContents(document.createElement("code")); } catch { /* */ }
        }
      }}><span className="font-mono text-[10px]">{`</>`}</span></button>
      {sep}

      {/* Lists */}
      <button className={`${b} ${active.ul ? on : ""}`} onClick={() => exec("insertUnorderedList")}>
        <svg width={I} height={I} viewBox="0 0 16 16" fill="currentColor"><circle cx="3" cy="4" r="1"/><circle cx="3" cy="8" r="1"/><circle cx="3" cy="12" r="1"/><rect x="6" y="3" width="8" height="2" rx="0.5"/><rect x="6" y="7" width="8" height="2" rx="0.5"/><rect x="6" y="11" width="8" height="2" rx="0.5"/></svg>
      </button>
      <button className={`${b} ${active.ol ? on : ""}`} onClick={() => exec("insertOrderedList")}>
        <svg width={I} height={I} viewBox="0 0 16 16" fill="currentColor"><text x="1" y="5" fontSize="4.5" fontWeight="700">1</text><text x="1" y="9" fontSize="4.5" fontWeight="700">2</text><text x="1" y="13" fontSize="4.5" fontWeight="700">3</text><rect x="6" y="3" width="8" height="2" rx="0.5"/><rect x="6" y="7" width="8" height="2" rx="0.5"/><rect x="6" y="11" width="8" height="2" rx="0.5"/></svg>
      </button>
      <button className={b} onClick={() => exec("indent")}>
        <svg width={I} height={I} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 4h10M7 8h6M7 12h6M3 7l2 1.5L3 10"/></svg>
      </button>
      <button className={b} onClick={() => exec("outdent")}>
        <svg width={I} height={I} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 4h10M7 8h6M7 12h6M5 7l-2 1.5L5 10"/></svg>
      </button>
      {sep}

      {/* Block */}
      <button className={`${b} ${blockType === "blockquote" ? on : ""}`} onClick={() => fmtBlock("blockquote")}>
        <svg width={I} height={I} viewBox="0 0 16 16" fill="currentColor"><path d="M3 3h4v4H5.5L4 10H3V3zm6 0h4v4h-1.5L10 10H9V3z"/></svg>
      </button>
      <button className={b} onClick={() => exec("insertHorizontalRule")}>
        <svg width={I} height={I} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="2" y1="8" x2="14" y2="8"/></svg>
      </button>
      {sep}

      {/* Link, Image */}
      <button className={b} onClick={() => setInputPopup({ label: "URL", onSubmit: (u) => { exec("createLink", u); setInputPopup(null); } })}>
        <svg width={I} height={I} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M7 9l2-2"/><rect x="1" y="7" width="5" height="5" rx="1.5" transform="rotate(-45 3.5 9.5)"/><rect x="7" y="1" width="5" height="5" rx="1.5" transform="rotate(-45 9.5 3.5)"/></svg>
      </button>
      <button className={b} onClick={() => setInputPopup({ label: "Image URL", onSubmit: (u) => { exec("insertImage", u); setInputPopup(null); } })}>
        <svg width={I} height={I} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><rect x="2" y="3" width="12" height="10" rx="1.5"/><circle cx="5.5" cy="6.5" r="1.2"/><path d="M2 11l3.5-3 2.5 2 3-2.5L14 11" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      {sep}

      {/* Clear */}
      <button className={b} onClick={() => exec("removeFormat")}>
        <svg width={I} height={I} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 13h10M6 3l-2.5 7h9L10 3"/><line x1="4" y1="8" x2="12" y2="8"/></svg>
      </button>
      {/* Inline input popup */}
      {inputPopup && (
        <div className="fixed inset-0 z-[9999]" onClick={() => setInputPopup(null)} onMouseDown={(e) => e.stopPropagation()}>
          <div className="absolute rounded-lg shadow-xl p-3 flex flex-col gap-2" style={{ left: pos.x, top: pos.y - 80, transform: "translate(-50%, -100%)", background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)", minWidth: 260 }} onClick={(e) => e.stopPropagation()}>
            <label className="text-[11px] font-mono" style={{ color: "var(--text-muted)" }}>{inputPopup.label}</label>
            <input autoFocus className="px-3 py-1.5 rounded-md text-sm outline-none" style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--text-primary)" }} placeholder={inputPopup.label}
              onKeyDown={(e) => { if (e.key === "Enter") { const v = (e.target as HTMLInputElement).value.trim(); if (v) inputPopup.onSubmit(v); } if (e.key === "Escape") setInputPopup(null); }} />
          </div>
        </div>
      )}
    </div>
  );
}
