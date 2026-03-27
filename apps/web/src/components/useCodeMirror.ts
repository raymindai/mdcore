"use client";

import { useRef, useEffect, useCallback } from "react";
import { EditorState, Compartment } from "@codemirror/state";
import { EditorView, keymap, placeholder as cmPlaceholder } from "@codemirror/view";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
// language-data removed — dynamic chunk loading fails in Next.js
import { defaultKeymap, indentWithTab } from "@codemirror/commands";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { syntaxHighlighting, defaultHighlightStyle, HighlightStyle } from "@codemirror/language";
import { tags } from "@lezer/highlight";
// WYSIWYG is handled by Tiptap in the preview pane, not CM6 decorations

// ─── Theme definitions using CSS variables ───

const baseTheme = EditorView.baseTheme({
  "&": {
    height: "100%",
    fontSize: "13px",
    fontFamily: "ui-monospace, 'SF Mono', 'Cascadia Code', 'JetBrains Mono', Menlo, monospace",
  },
  ".cm-scroller": {
    overflow: "auto",
    lineHeight: "1.65",
  },
  ".cm-content": {
    padding: "12px 20px",
    caretColor: "var(--accent)",
  },
  "&.cm-focused": {
    outline: "none",
  },
  ".cm-gutters": {
    display: "none", // hidden by default, can toggle later
  },
  ".cm-activeLine": {
    backgroundColor: "transparent",
  },
  ".cm-selectionBackground": {
    backgroundColor: "var(--accent-dim) !important",
  },
  "&.cm-focused .cm-selectionBackground": {
    backgroundColor: "var(--accent-dim) !important",
  },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "var(--accent)",
    borderLeftWidth: "2px",
  },
  ".cm-placeholder": {
    color: "var(--text-faint)",
    fontStyle: "italic",
  },
});

// Markdown-specific syntax highlighting
const markdownHighlight = HighlightStyle.define([
  { tag: tags.heading1, fontWeight: "700", fontSize: "1.3em" },
  { tag: tags.heading2, fontWeight: "700", fontSize: "1.15em" },
  { tag: tags.heading3, fontWeight: "600", fontSize: "1.05em" },
  { tag: tags.heading4, fontWeight: "600" },
  { tag: tags.heading5, fontWeight: "600" },
  { tag: tags.heading6, fontWeight: "600" },
  { tag: tags.strong, fontWeight: "700" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.strikethrough, textDecoration: "line-through" },
  { tag: tags.monospace, fontFamily: "inherit", color: "var(--accent)" },
  { tag: tags.url, color: "var(--accent)", textDecoration: "underline" },
  { tag: tags.link, color: "var(--accent)" },
  { tag: tags.meta, color: "var(--text-faint)" },
  { tag: tags.processingInstruction, color: "var(--text-faint)" }, // markdown markers like ** _ #
  { tag: tags.quote, color: "var(--text-muted)", fontStyle: "italic" },
  { tag: tags.contentSeparator, color: "var(--border)" }, // ---
]);

const darkColorTheme = EditorView.theme({
  "&": {
    backgroundColor: "transparent",
    color: "var(--editor-text)",
  },
}, { dark: true });

const lightColorTheme = EditorView.theme({
  "&": {
    backgroundColor: "transparent",
    color: "var(--editor-text)",
  },
}, { dark: false });

// ─── Hook ───

export interface UseCodeMirrorOptions {
  initialDoc: string;
  onChange: (value: string) => void;
  onPaste?: (text: string, html: string) => string | null;
  theme: "dark" | "light";
  placeholder?: string;
}

export interface UseCodeMirrorReturn {
  containerRef: React.RefObject<HTMLDivElement | null>;
  view: EditorView | null;
  focus: () => void;
  getDoc: () => string;
  setDoc: (text: string) => void;
  scrollToLine: (line: number) => void;
  setSelection: (from: number, to: number) => void;
  getCursorPos: () => number;
}

export function useCodeMirror({
  initialDoc,
  onChange,
  onPaste,
  theme,
  placeholder,
}: UseCodeMirrorOptions): UseCodeMirrorReturn {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const themeCompartment = useRef(new Compartment());
  const onChangeRef = useRef(onChange);
  const onPasteRef = useRef(onPaste);
  const isExternalUpdate = useRef(false); // suppress onChange during setDoc

  // Keep refs up to date
  onChangeRef.current = onChange;
  onPasteRef.current = onPaste;

  // Initialize editor
  useEffect(() => {
    if (!containerRef.current || viewRef.current) return;

    const isDark = theme === "dark";

    const state = EditorState.create({
      doc: initialDoc,
      extensions: [
        baseTheme,
        themeCompartment.current.of(isDark ? darkColorTheme : lightColorTheme),
        syntaxHighlighting(markdownHighlight),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        markdown({ base: markdownLanguage }),
        highlightSelectionMatches(),
        EditorView.lineWrapping,
        cmPlaceholder(placeholder || ""),
        keymap.of([
          ...defaultKeymap,
          ...searchKeymap,
          indentWithTab,
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !isExternalUpdate.current) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
        // Paste handler
        EditorView.domEventHandlers({
          paste(event, view) {
            const htmlData = event.clipboardData?.getData("text/html") || "";
            const textData = event.clipboardData?.getData("text/plain") || "";
            const result = onPasteRef.current?.(textData, htmlData);
            if (result != null) {
              event.preventDefault();
              const { from, to } = view.state.selection.main;
              view.dispatch({
                changes: { from, to, insert: result },
                selection: { anchor: from + result.length },
              });
              return true;
            }
            return false;
          },
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Mount once

  // Theme switching
  useEffect(() => {
    if (!viewRef.current) return;
    const isDark = theme === "dark";
    viewRef.current.dispatch({
      effects: themeCompartment.current.reconfigure(
        isDark ? darkColorTheme : lightColorTheme
      ),
    });
  }, [theme]);

  // Imperative API
  const focus = useCallback(() => {
    viewRef.current?.focus();
  }, []);

  const getDoc = useCallback(() => {
    return viewRef.current?.state.doc.toString() || "";
  }, []);

  const setDoc = useCallback((text: string) => {
    const view = viewRef.current;
    if (!view) return;
    const currentDoc = view.state.doc.toString();
    if (currentDoc === text) return; // no-op if same
    isExternalUpdate.current = true;
    view.dispatch({
      changes: { from: 0, to: currentDoc.length, insert: text },
    });
    isExternalUpdate.current = false;
  }, []);

  const scrollToLine = useCallback((line: number) => {
    const view = viewRef.current;
    if (!view) return;
    const lineNum = Math.max(1, Math.min(line + 1, view.state.doc.lines));
    const lineInfo = view.state.doc.line(lineNum);
    view.dispatch({
      effects: EditorView.scrollIntoView(lineInfo.from, { y: "center" }),
    });
  }, []);

  const setSelection = useCallback((from: number, to: number) => {
    const view = viewRef.current;
    if (!view) return;
    const docLen = view.state.doc.length;
    const safeFrom = Math.min(from, docLen);
    const safeTo = Math.min(to, docLen);
    view.dispatch({
      selection: { anchor: safeFrom, head: safeTo },
    });
  }, []);

  const getCursorPos = useCallback(() => {
    return viewRef.current?.state.selection.main.head ?? 0;
  }, []);

  return {
    containerRef,
    view: viewRef.current,
    focus,
    getDoc,
    setDoc,
    scrollToLine,
    setSelection,
    getCursorPos,
  };
}
