"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Undo2, Redo2, List, ListOrdered, IndentIncrease, IndentDecrease,
  Quote, Minus, Link2, ImageIcon, RemoveFormatting,
} from "lucide-react";

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

  // Clamp position so toolbar stays within viewport
  const toolbarW = toolbarRef.current?.offsetWidth || 500;
  const toolbarH = toolbarRef.current?.offsetHeight || 40;
  const pad = 8;
  // Calculate left position (no transform needed)
  const rawLeft = pos.x - toolbarW / 2;
  const clampedLeft = Math.max(pad, Math.min(rawLeft, window.innerWidth - toolbarW - pad));
  const clampedTop = Math.max(pad, pos.y - toolbarH - 8);

  return (
    <div
      ref={toolbarRef}
      className="fixed z-[9998] flex flex-wrap items-center gap-0.5 px-1.5 py-1 rounded-lg shadow-xl border max-w-[90vw]"
      style={{
        left: clampedLeft, top: clampedTop,
        background: "var(--surface)", borderColor: "var(--border)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {/* Undo / Redo */}
      <button className={b} onClick={() => exec("undo")}>
        <Undo2 size={I} strokeWidth={1.5} />
      </button>
      <button className={b} onClick={() => exec("redo")}>
        <Redo2 size={I} strokeWidth={1.5} />
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
        updateToolbar();
        containerRef.current?.focus();
      }}><span className="font-mono text-[10px]">{`</>`}</span></button>
      {sep}

      {/* Lists */}
      <button className={`${b} ${active.ul ? on : ""}`} onClick={() => exec("insertUnorderedList")}>
        <List size={I} strokeWidth={1.5} />
      </button>
      <button className={`${b} ${active.ol ? on : ""}`} onClick={() => exec("insertOrderedList")}>
        <ListOrdered size={I} strokeWidth={1.5} />
      </button>
      <button className={b} onClick={() => exec("indent")}>
        <IndentIncrease size={I} strokeWidth={1.5} />
      </button>
      <button className={b} onClick={() => exec("outdent")}>
        <IndentDecrease size={I} strokeWidth={1.5} />
      </button>
      {sep}

      {/* Block */}
      <button className={`${b} ${blockType === "blockquote" ? on : ""}`} onClick={() => fmtBlock("blockquote")}>
        <Quote size={I} strokeWidth={1.5} />
      </button>
      <button className={b} onClick={() => exec("insertHorizontalRule")}>
        <Minus size={I} strokeWidth={2} />
      </button>
      {sep}

      {/* Link, Image */}
      <button className={b} onClick={() => setInputPopup({ label: "URL", onSubmit: (u) => { exec("createLink", u); setInputPopup(null); } })}>
        <Link2 size={I} strokeWidth={1.5} />
      </button>
      <button className={b} onClick={() => setInputPopup({ label: "Image URL", onSubmit: (u) => { exec("insertImage", u); setInputPopup(null); } })}>
        <ImageIcon size={I} strokeWidth={1.5} />
      </button>
      {sep}

      {/* Clear */}
      <button className={b} onClick={() => exec("removeFormat")}>
        <RemoveFormatting size={I} strokeWidth={1.5} />
      </button>
      {/* Inline input popup */}
      {inputPopup && (
        <div className="fixed inset-0 z-[9999]" onClick={() => setInputPopup(null)} onMouseDown={(e) => e.stopPropagation()}>
          <div className="absolute rounded-lg shadow-xl p-3 flex flex-col gap-2" style={{ left: Math.max(140, Math.min(pos.x, typeof window !== "undefined" ? window.innerWidth - 140 : pos.x)), top: Math.max(8, pos.y - 80), transform: "translate(-50%, -100%)", background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)", minWidth: 260 }} onClick={(e) => e.stopPropagation()}>
            <label className="text-[11px] font-mono" style={{ color: "var(--text-muted)" }}>{inputPopup.label}</label>
            <input autoFocus className="px-3 py-1.5 rounded-md text-sm outline-none" style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--text-primary)" }} placeholder={inputPopup.label}
              onKeyDown={(e) => { if (e.key === "Enter") { const v = (e.target as HTMLInputElement).value.trim(); if (v) inputPopup.onSubmit(v); } if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setInputPopup(null); } }} />
          </div>
        </div>
      )}
    </div>
  );
}
