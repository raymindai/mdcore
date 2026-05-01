"use client";

import { type Editor } from "@tiptap/core";
import { Editor as TiptapEditor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Image as TiptapImage } from "@tiptap/extension-image";
import { Link as TiptapLink } from "@tiptap/extension-link";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { Placeholder } from "@tiptap/extension-placeholder";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { Markdown as TiptapMarkdown } from "tiptap-markdown";
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  forwardRef,
  useState,
} from "react";
import { common, createLowlight } from "lowlight";
import katex from "katex";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Minus,
  CheckSquare,
} from "lucide-react";

const lowlight = createLowlight(common);

// ─── Frontmatter ───
function extractFrontmatter(md: string): { frontmatter: string; body: string } {
  if (!md.startsWith("---")) return { frontmatter: "", body: md };
  const end = md.indexOf("\n---", 3);
  if (end === -1) return { frontmatter: "", body: md };
  return { frontmatter: md.slice(0, end + 4), body: md.slice(end + 4).replace(/^\n/, "") };
}

function reattachFrontmatter(fm: string, body: string): string {
  return fm ? fm + "\n" + body : body;
}

// ─── Types ───
export interface TiptapLiveEditorProps {
  markdown: string;
  onChange: (md: string) => void;
  canEdit: boolean;
  narrowView: boolean;
  onPasteImage?: (file: File) => Promise<string | null>;
  onDoubleClickCode?: (lang: string, code: string) => void;
  onDoubleClickMath?: (tex: string, mode: "inline" | "display") => void;
  onDoubleClickMermaid?: (code: string) => void;
}

export interface TiptapLiveEditorHandle {
  setMarkdown: (md: string) => void;
  getMarkdown: () => string;
  focus: () => void;
  getEditor: () => Editor | null;
}

// ─── Selection Toolbar ───
function SelectionToolbar({ editor }: { editor: Editor }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      const { from, to } = editor.state.selection;
      if (from === to || !editor.isFocused) {
        setPos(null);
        setShowLinkInput(false);
        return;
      }
      const domAtPos = editor.view.coordsAtPos(from);
      const domEnd = editor.view.coordsAtPos(to);
      const editorRect = editor.view.dom.closest(".overflow-auto")?.getBoundingClientRect();
      if (!editorRect) return;
      setPos({
        top: domAtPos.top - editorRect.top - 44,
        left: (domAtPos.left + domEnd.left) / 2 - editorRect.left,
      });
    };

    editor.on("selectionUpdate", update);
    editor.on("blur", () => { setPos(null); setShowLinkInput(false); });
    return () => {
      editor.off("selectionUpdate", update);
    };
  }, [editor]);

  const applyLink = useCallback(() => {
    if (linkUrl) editor.chain().focus().setLink({ href: linkUrl }).run();
    setShowLinkInput(false);
    setLinkUrl("");
  }, [editor, linkUrl]);

  if (!pos) return null;

  const btn = (active: boolean) => ({
    background: active ? "var(--accent-dim)" : "transparent",
    color: active ? "var(--accent)" : "var(--text-secondary)",
    border: "none",
    borderRadius: 4,
    padding: "4px 6px",
    cursor: "pointer" as const,
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    transition: "background 0.1s",
  });

  return (
    <div
      ref={toolbarRef}
      className="absolute z-[9999] flex items-center gap-0.5 px-1.5 py-1 rounded-lg shadow-xl"
      style={{
        top: Math.max(4, pos.top),
        left: Math.max(8, pos.left - 120),
        background: "var(--surface)",
        border: "1px solid var(--border)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        pointerEvents: "auto",
      }}
      onMouseDown={(e) => e.preventDefault()} // prevent blur
    >
      {showLinkInput ? (
        <div className="flex items-center gap-1 px-1">
          <input
            type="text"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") applyLink(); if (e.key === "Escape") { setShowLinkInput(false); setLinkUrl(""); } }}
            placeholder="https://..."
            className="text-[11px] px-2 py-1 rounded outline-none"
            style={{ background: "var(--background)", color: "var(--text-primary)", border: "1px solid var(--border)", width: 180 }}
            autoFocus
          />
          <button onClick={applyLink} style={{ fontSize: 10, padding: "3px 8px", background: "var(--accent)", color: "#000", border: "none", borderRadius: 4, fontWeight: 600, cursor: "pointer" }}>OK</button>
        </div>
      ) : (
        <>
          <button onClick={() => editor.chain().focus().toggleBold().run()} style={btn(editor.isActive("bold"))} title="Bold (⌘B)"><Bold width={14} height={14} /></button>
          <button onClick={() => editor.chain().focus().toggleItalic().run()} style={btn(editor.isActive("italic"))} title="Italic (⌘I)"><Italic width={14} height={14} /></button>
          <button onClick={() => editor.chain().focus().toggleStrike().run()} style={btn(editor.isActive("strike"))} title="Strikethrough"><Strikethrough width={14} height={14} /></button>
          <button onClick={() => editor.chain().focus().toggleCode().run()} style={btn(editor.isActive("code"))} title="Code"><Code width={14} height={14} /></button>
          <div style={{ width: 1, height: 16, background: "var(--border-dim)", margin: "0 2px" }} />
          <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} style={btn(editor.isActive("heading", { level: 1 }))} title="H1"><Heading1 width={14} height={14} /></button>
          <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} style={btn(editor.isActive("heading", { level: 2 }))} title="H2"><Heading2 width={14} height={14} /></button>
          <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} style={btn(editor.isActive("heading", { level: 3 }))} title="H3"><Heading3 width={14} height={14} /></button>
          <div style={{ width: 1, height: 16, background: "var(--border-dim)", margin: "0 2px" }} />
          <button onClick={() => editor.chain().focus().toggleBulletList().run()} style={btn(editor.isActive("bulletList"))} title="Bullet list"><List width={14} height={14} /></button>
          <button onClick={() => editor.chain().focus().toggleOrderedList().run()} style={btn(editor.isActive("orderedList"))} title="Ordered list"><ListOrdered width={14} height={14} /></button>
          <button onClick={() => editor.chain().focus().toggleTaskList().run()} style={btn(editor.isActive("taskList"))} title="Task list"><CheckSquare width={14} height={14} /></button>
          <button onClick={() => editor.chain().focus().toggleBlockquote().run()} style={btn(editor.isActive("blockquote"))} title="Quote"><Quote width={14} height={14} /></button>
          <div style={{ width: 1, height: 16, background: "var(--border-dim)", margin: "0 2px" }} />
          <button onClick={() => { if (editor.isActive("link")) { editor.chain().focus().unsetLink().run(); } else { setShowLinkInput(true); setLinkUrl(editor.getAttributes("link").href || ""); } }} style={btn(editor.isActive("link"))} title="Link (⌘K)"><LinkIcon width={14} height={14} /></button>
          <button onClick={() => editor.chain().focus().setHorizontalRule().run()} style={btn(false)} title="Horizontal rule"><Minus width={14} height={14} /></button>
          <div style={{ width: 1, height: 16, background: "var(--border-dim)", margin: "0 2px" }} />
          <button onClick={() => editor.chain().focus().sinkListItem("listItem").run()} style={btn(false)} title="Indent">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 6H11M21 12H11M21 18H11M3 8l4 4-4 4"/></svg>
          </button>
          <button onClick={() => editor.chain().focus().liftListItem("listItem").run()} style={btn(false)} title="Outdent">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 6H11M21 12H11M21 18H11M7 8l-4 4 4 4"/></svg>
          </button>
          <button onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} style={btn(false)} title="Clear formatting">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>
          </button>
        </>
      )}
    </div>
  );
}

// ─── Mount guard — only render editor on client ───
const TiptapLiveEditor = forwardRef<TiptapLiveEditorHandle, TiptapLiveEditorProps>(
  function TiptapLiveEditor(props, ref) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);
    if (typeof window === "undefined" || !mounted) return null;
    return <TiptapLiveEditorInner {...props} ref={ref} />;
  }
);

// ─── Inner Component (client-only, safe to use useEditor) ───
const TiptapLiveEditorInner = forwardRef<TiptapLiveEditorHandle, TiptapLiveEditorProps>(
  function TiptapLiveEditorInner({ markdown, onChange, canEdit, narrowView, onPasteImage, onDoubleClickCode, onDoubleClickMath, onDoubleClickMermaid }, ref) {
    const frontmatterRef = useRef("");
    const isSettingContent = useRef(false);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const onPasteImageRef = useRef(onPasteImage);
    onPasteImageRef.current = onPasteImage;
    const onDblClickCodeRef = useRef(onDoubleClickCode);
    onDblClickCodeRef.current = onDoubleClickCode;
    const onDblClickMathRef = useRef(onDoubleClickMath);
    onDblClickMathRef.current = onDoubleClickMath;
    const onDblClickMermaidRef = useRef(onDoubleClickMermaid);
    onDblClickMermaidRef.current = onDoubleClickMermaid;

    const { frontmatter: initialFm, body: initialBody } = extractFrontmatter(markdown);
    const initialBodyRef = useRef(initialBody);
    if (!frontmatterRef.current && initialFm) frontmatterRef.current = initialFm;

    const [editor, setEditor] = useState<Editor | null>(null);
    const editorRef = useRef<Editor | null>(null);

    useEffect(() => {
      const ed = new TiptapEditor({
        extensions: [
          StarterKit.configure({
            codeBlock: false,
            heading: { levels: [1, 2, 3, 4, 5, 6] },
          }),
          CodeBlockLowlight.configure({ lowlight, defaultLanguage: null }),
          Table.configure({ resizable: true, allowTableNodeSelection: true }),
          TableRow,
          TableCell,
          TableHeader,
          TaskList,
          TaskItem.configure({ nested: true }),
          TiptapImage.configure({ inline: true, allowBase64: true }),
          TiptapLink.configure({
            openOnClick: false,
            HTMLAttributes: { rel: "noopener noreferrer nofollow" },
          }),
          Placeholder.configure({ placeholder: "Start writing..." }),
          TiptapMarkdown.configure({
            html: true,
            transformPastedText: false,
            transformCopiedText: true,
          }),
        ],
        content: initialBodyRef.current || "<p></p>",
        editable: canEdit,
        editorProps: {
          attributes: {
            class: `mdcore-rendered focus:outline-none ${narrowView ? "p-3 sm:p-6 mx-auto max-w-3xl" : "p-3 sm:p-6 max-w-none"}`,
            style: `cursor: ${canEdit ? "text" : "default"}; min-height: 100%;`,
          },
          handleDoubleClickOn: (view, pos, node) => {
            // Code block → open code editor modal
            if (node.type.name === "codeBlock") {
              const lang = node.attrs.language || "";
              const code = node.textContent || "";
              if (lang === "mermaid" && onDblClickMermaidRef.current) {
                onDblClickMermaidRef.current(code);
                return true;
              }
              if (onDblClickCodeRef.current) {
                onDblClickCodeRef.current(lang, code);
                return true;
              }
            }
            return false;
          },
          handlePaste: (view, event) => {
            // Image paste
            const items = Array.from(event.clipboardData?.items || []);
            const imageItem = items.find((i) => i.type.startsWith("image/"));
            if (imageItem && onPasteImageRef.current) {
              event.preventDefault();
              const file = imageItem.getAsFile();
              if (!file) return true;
              onPasteImageRef.current(file).then((url) => {
                if (url) {
                  view.dispatch(view.state.tr.replaceSelectionWith(
                    view.state.schema.nodes.image.create({ src: url })
                  ));
                }
              });
              return true;
            }
            return false; // let tiptap handle text/HTML paste
          },
        },
        onUpdate: ({ editor: updatedEd }) => {
          if (isSettingContent.current) return;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const bodyMd = (updatedEd.storage as any).markdown?.getMarkdown?.() || "";
          const fullMd = reattachFrontmatter(frontmatterRef.current, bodyMd);
          onChangeRef.current(fullMd);
        },
      });

      editorRef.current = ed;
      setEditor(ed);

      return () => { ed.destroy(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => { if (editor) editor.setEditable(canEdit); }, [editor, canEdit]);

    useEffect(() => {
      if (!editor) return;
      editor.setOptions({
        editorProps: {
          attributes: {
            class: `mdcore-rendered focus:outline-none ${narrowView ? "p-3 sm:p-6 mx-auto max-w-3xl" : "p-3 sm:p-6 max-w-none"}`,
            style: `cursor: ${canEdit ? "text" : "default"}; min-height: 100%;`,
          },
        },
      });
    }, [editor, narrowView, canEdit]);

    useImperativeHandle(ref, () => ({
      setMarkdown: (md: string) => {
        if (!editor) return;
        const { frontmatter: fm, body } = extractFrontmatter(md);
        frontmatterRef.current = fm;
        isSettingContent.current = true;
        editor.commands.setContent(body || "<p></p>");
        isSettingContent.current = false;
      },
      getMarkdown: () => {
        if (!editor) return markdown;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const bodyMd = (editor.storage as any).markdown?.getMarkdown?.() || "";
        return reattachFrontmatter(frontmatterRef.current, bodyMd);
      },
      focus: () => editor?.commands.focus(),
      getEditor: () => editor,
    }), [editor, markdown]);

    // Mount editor DOM into container ref
    const containerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
      if (!editor || !containerRef.current) return;
      const el = containerRef.current;
      if (!el.contains(editor.view.dom)) {
        el.innerHTML = "";
        el.appendChild(editor.view.dom);
      }
    }, [editor]);

    // ── Post-render: KaTeX math + Mermaid diagrams ──
    // Process the Tiptap DOM after every update to render math and mermaid
    const postProcessTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
    useEffect(() => {
      if (!editor) return;

      const processDOM = () => {
        const dom = editor.view.dom;
        if (!dom) return;

        // ── KaTeX: find $...$ and $$...$$ in text nodes ──
        // Process inline math: $...$
        // Process display math: $$...$$
        dom.querySelectorAll("p, li, blockquote, h1, h2, h3, h4, h5, h6").forEach((el) => {
          const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
          const textNodes: Text[] = [];
          let node: Text | null;
          while ((node = walker.nextNode() as Text | null)) {
            if (node.textContent?.includes("$")) textNodes.push(node);
          }
          for (const textNode of textNodes) {
            const text = textNode.textContent || "";
            // Skip if already processed (parent is .katex)
            if (textNode.parentElement?.classList.contains("katex") ||
                textNode.parentElement?.closest(".katex")) continue;

            // Display math: $$...$$
            const displayMatch = text.match(/\$\$([^$]+)\$\$/);
            if (displayMatch) {
              try {
                if (katex?.renderToString) {
                  const rendered = katex.renderToString(displayMatch[1].trim(), { displayMode: true, throwOnError: false, strict: false });
                  const wrapper = document.createElement("div");
                  wrapper.className = "katex-display";
                  wrapper.setAttribute("contenteditable", "false");
                  wrapper.innerHTML = rendered;
                  const before = text.slice(0, displayMatch.index!);
                  const after = text.slice(displayMatch.index! + displayMatch[0].length);
                  if (before) textNode.parentNode?.insertBefore(document.createTextNode(before), textNode);
                  textNode.parentNode?.insertBefore(wrapper, textNode);
                  if (after) textNode.parentNode?.insertBefore(document.createTextNode(after), textNode);
                  textNode.remove();
                }
              } catch { /* skip */ }
              continue;
            }

            // Inline math: $...$  (not $$)
            const inlineMatch = text.match(/(?<!\$)\$([^$\n]+)\$(?!\$)/);
            if (inlineMatch) {
              try {
                if (katex?.renderToString) {
                  const rendered = katex.renderToString(inlineMatch[1].trim(), { displayMode: false, throwOnError: false, strict: false });
                  const wrapper = document.createElement("span");
                  wrapper.className = "katex-inline";
                  wrapper.setAttribute("contenteditable", "false");
                  wrapper.innerHTML = rendered;
                  const before = text.slice(0, inlineMatch.index!);
                  const after = text.slice(inlineMatch.index! + inlineMatch[0].length);
                  if (before) textNode.parentNode?.insertBefore(document.createTextNode(before), textNode);
                  textNode.parentNode?.insertBefore(wrapper, textNode);
                  if (after) textNode.parentNode?.insertBefore(document.createTextNode(after), textNode);
                  textNode.remove();
                }
              } catch { /* skip */ }
            }
          }
        });

        // ── Mermaid: render code blocks with language "mermaid" ──
        dom.querySelectorAll('pre').forEach((pre) => {
          // CodeBlockLowlight uses data-language attribute
          const lang = pre.getAttribute("data-language") || pre.querySelector("code")?.className?.match(/language-(\w+)/)?.[1];
          if (lang !== "mermaid") return;
          // Skip if already rendered
          if (pre.querySelector(".mermaid-rendered")) return;
          if (pre.getAttribute("data-mermaid-processed")) return;
          pre.setAttribute("data-mermaid-processed", "1");

          const code = pre.textContent || "";
          if (!code.trim()) return;

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const mermaid = (window as any).mermaid;
          if (!mermaid) return;

          const mermaidId = `tiptap-mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          mermaid.render(mermaidId, code).then(({ svg }: { svg: string }) => {
            const wrapper = document.createElement("div");
            wrapper.className = "mermaid-rendered";
            wrapper.setAttribute("contenteditable", "false");
            wrapper.innerHTML = svg;
            wrapper.style.cssText = "text-align:center;margin:0.5rem 0;";
            pre.style.display = "none";
            pre.parentNode?.insertBefore(wrapper, pre.nextSibling);
          }).catch(() => { /* mermaid parse error — leave as code block */ });
        });

        // ── Math double-click → edit modal ──
        dom.querySelectorAll(".katex-display, .katex-inline").forEach((el) => {
          if ((el as HTMLElement).dataset.mathClickBound) return;
          (el as HTMLElement).dataset.mathClickBound = "1";
          el.addEventListener("dblclick", (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Extract original LaTeX from the rendered element
            const annotation = el.querySelector("annotation");
            const tex = annotation?.textContent || el.textContent || "";
            const mode = el.classList.contains("katex-display") ? "display" : "inline";
            onDblClickMathRef.current?.(tex, mode as "inline" | "display");
          });
          (el as HTMLElement).style.cursor = "pointer";
        });

        // ── Image click → lightbox (MdEditor handles via previewRef) ──
        // Images in Tiptap are already clickable via Tiptap's Image extension
      };

      // Run on initial mount
      processDOM();

      // Run after every editor update (debounced)
      const handler = () => {
        if (postProcessTimerRef.current) clearTimeout(postProcessTimerRef.current);
        postProcessTimerRef.current = setTimeout(processDOM, 300);
      };
      editor.on("update", handler);

      return () => { editor.off("update", handler); };
    }, [editor]);

    // KaTeX CSS is imported globally via globals.css (@import "katex/dist/katex.min.css")

    // Load Mermaid JS if not already loaded
    useEffect(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((window as any).mermaid) return;
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js";
      script.async = true;
      script.onload = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).mermaid?.initialize({ startOnLoad: false, theme: "dark", securityLevel: "loose" });
      };
      document.head.appendChild(script);
    }, []);

    if (!editor) return null;

    return (
      <div className="flex-1 overflow-auto relative" style={{ background: "var(--background)" }}>
        {canEdit && <SelectionToolbar editor={editor} />}
        <div ref={containerRef} />
      </div>
    );
  }
);

export default TiptapLiveEditor;
