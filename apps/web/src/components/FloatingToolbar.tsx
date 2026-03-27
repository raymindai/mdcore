"use client";

import { useEffect, useState, useCallback, useRef } from "react";

interface FloatingToolbarProps {
  containerRef: React.RefObject<HTMLElement | null>;
}

export default function FloatingToolbar({ containerRef }: FloatingToolbarProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [active, setActive] = useState<Record<string, boolean>>({});
  const toolbarRef = useRef<HTMLDivElement>(null);

  const updateToolbar = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) {
      setPos(null);
      return;
    }

    // Only show if selection is inside our container
    const container = containerRef.current;
    if (!container) return;
    const anchor = sel.anchorNode;
    if (!anchor || !container.contains(anchor)) {
      setPos(null);
      return;
    }

    // Don't show for code blocks, math, mermaid
    const el = anchor instanceof HTMLElement ? anchor : anchor.parentElement;
    if (el?.closest("pre, .mermaid-container, .math-rendered, code")) {
      setPos(null);
      return;
    }

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (rect.width === 0) {
      setPos(null);
      return;
    }

    // Position above the selection
    setPos({
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
    });

    // Check active states
    setActive({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      strikethrough: document.queryCommandState("strikeThrough"),
      underline: document.queryCommandState("underline"),
    });
  }, [containerRef]);

  useEffect(() => {
    document.addEventListener("selectionchange", updateToolbar);
    return () => document.removeEventListener("selectionchange", updateToolbar);
  }, [updateToolbar]);

  // Hide on scroll
  useEffect(() => {
    const container = containerRef.current?.closest(".overflow-auto");
    if (!container) return;
    const onScroll = () => setPos(null);
    container.addEventListener("scroll", onScroll);
    return () => container.removeEventListener("scroll", onScroll);
  }, [containerRef]);

  const exec = useCallback((cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    // Re-focus the editable area
    containerRef.current?.querySelector("article")?.focus();
    updateToolbar();
  }, [containerRef, updateToolbar]);

  const toggleHeading = useCallback((level: number) => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const node = sel.anchorNode;
    const block = node instanceof HTMLElement ? node : node?.parentElement;
    const heading = block?.closest("h1,h2,h3,h4,h5,h6");

    if (heading && heading.tagName === `H${level}`) {
      // Remove heading — convert to paragraph
      document.execCommand("formatBlock", false, "p");
    } else {
      document.execCommand("formatBlock", false, `h${level}`);
    }
    updateToolbar();
  }, [updateToolbar]);

  const insertLink = useCallback(() => {
    const url = prompt("URL:");
    if (url) {
      document.execCommand("createLink", false, url);
    }
    updateToolbar();
  }, [updateToolbar]);

  if (!pos) return null;

  const btnClass = "px-2 py-1.5 rounded text-xs font-medium transition-colors hover:bg-[var(--accent-dim)]";
  const activeClass = "bg-[var(--accent-dim)] text-[var(--accent)]";

  return (
    <div
      ref={toolbarRef}
      className="fixed z-50 flex items-center gap-0.5 px-1 py-0.5 rounded-lg shadow-xl border"
      style={{
        left: pos.x,
        top: pos.y,
        transform: "translate(-50%, -100%)",
        background: "var(--surface)",
        borderColor: "var(--border)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
      }}
      onMouseDown={(e) => e.preventDefault()} // prevent blur
    >
      {/* Text style — compact for floating context */}
      <button className={`${btnClass} ${active.bold ? activeClass : ""}`} onClick={() => exec("bold")} title="Bold" style={{ fontWeight: 700 }}>B</button>
      <button className={`${btnClass} ${active.italic ? activeClass : ""}`} onClick={() => exec("italic")} title="Italic" style={{ fontStyle: "italic" }}>I</button>
      <button className={`${btnClass} ${active.underline ? activeClass : ""}`} onClick={() => exec("underline")} title="Underline" style={{ textDecoration: "underline" }}>U</button>
      <button className={`${btnClass} ${active.strikethrough ? activeClass : ""}`} onClick={() => exec("strikeThrough")} title="Strikethrough" style={{ textDecoration: "line-through" }}>S</button>
      <button className={`${btnClass} font-mono text-[10px]`} onClick={() => {
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed && sel.rangeCount) {
          const range = sel.getRangeAt(0);
          const code = document.createElement("code");
          range.surroundContents(code);
        }
      }} title="Inline code">&lt;/&gt;</button>

      <div className="w-px h-5 mx-0.5" style={{ background: "var(--border)" }} />

      {/* Headings */}
      <button className={btnClass} onClick={() => toggleHeading(1)} title="Heading 1">H1</button>
      <button className={btnClass} onClick={() => toggleHeading(2)} title="Heading 2">H2</button>
      <button className={btnClass} onClick={() => toggleHeading(3)} title="Heading 3">H3</button>

      <div className="w-px h-5 mx-0.5" style={{ background: "var(--border)" }} />

      {/* Link & Color */}
      <button className={btnClass} onClick={insertLink} title="Link">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6.5 9.5l3-3M7 11l-1.5 1.5a2.12 2.12 0 01-3-3L4 8m5-1l1.5-1.5a2.12 2.12 0 013 3L12 10" strokeLinecap="round"/></svg>
      </button>
      <button className={btnClass} onClick={() => exec("hiliteColor", "rgba(251,146,60,0.2)")} title="Highlight">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="var(--accent)" opacity="0.6"><rect x="1" y="10" width="14" height="4" rx="1"/></svg>
      </button>
      <button className={btnClass} onClick={() => exec("removeFormat")} title="Clear formatting">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M4 3h8l-3 10M2 13l12-10"/></svg>
      </button>
    </div>
  );
}
