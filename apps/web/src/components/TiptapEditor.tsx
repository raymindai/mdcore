"use client";

import { useEffect, useRef, useImperativeHandle, forwardRef, useCallback, useMemo } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Link } from "@tiptap/extension-link";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Image } from "@tiptap/extension-image";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Markdown as TiptapMarkdown } from "tiptap-markdown";
import type { Editor } from "@tiptap/react";
import * as Y from "yjs";
import { ySyncPlugin, yCursorPlugin, yUndoPlugin } from "y-prosemirror";
import { Extension } from "@tiptap/react";

interface TiptapEditorProps {
  initialMarkdown: string;
  onChange: (markdown: string) => void;
  canEdit: boolean;
  narrowView: boolean;
  ydoc: Y.Doc | null;
  onTitleChange?: (title: string) => void;
  onPasteImage?: (file: File) => Promise<string | null>;
  className?: string;
}

export interface TiptapEditorHandle {
  setMarkdown: (md: string) => void;
  getMarkdown: () => string;
  getEditor: () => Editor | null;
  focus: () => void;
}

// Extract and restore frontmatter (tiptap-markdown strips it)
function extractFrontmatter(md: string): { frontmatter: string; body: string } {
  const lines = md.split("\n");
  if (lines[0]?.trim() !== "---") return { frontmatter: "", body: md };
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]?.trim() === "---") {
      return {
        frontmatter: lines.slice(0, i + 1).join("\n") + "\n",
        body: lines.slice(i + 1).join("\n").replace(/^\n+/, ""),
      };
    }
  }
  return { frontmatter: "", body: md };
}

// Create y-prosemirror extensions for Tiptap
function createCollaborationExtension(ydoc: Y.Doc) {
  const fragment = ydoc.getXmlFragment("prosemirror");
  return Extension.create({
    name: "yjs-collaboration",
    addProseMirrorPlugins() {
      return [
        ySyncPlugin(fragment),
        yUndoPlugin(),
      ];
    },
  });
}

const TiptapEditor = forwardRef<TiptapEditorHandle, TiptapEditorProps>(
  function TiptapEditor({ initialMarkdown, onChange, canEdit, narrowView, ydoc, onTitleChange, onPasteImage, className = "" }, ref) {
    const suppressOnUpdate = useRef(false);
    const frontmatterRef = useRef("");
    const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
    const lastTitleRef = useRef<string | undefined>(undefined);
    const initializedYdoc = useRef(false);

    // Extract frontmatter on initial content
    const { frontmatter: initFm, body: initBody } = extractFrontmatter(initialMarkdown);
    if (!frontmatterRef.current && initFm) frontmatterRef.current = initFm;

    const getMarkdownFromEditor = useCallback((editor: Editor): string => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body = (editor.storage as any).markdown.getMarkdown() as string;
      return frontmatterRef.current ? frontmatterRef.current + "\n" + body : body;
    }, []);

    // Build extensions — include y-prosemirror if ydoc is available
    const extensions = useMemo(() => {
      const exts = [
        StarterKit.configure({
          codeBlock: { HTMLAttributes: { class: "hljs" } },
          heading: { levels: [1, 2, 3, 4, 5, 6] },
          ...(ydoc ? { history: false } : {}), // Disable built-in history when using yUndoPlugin
        }),
        Link.configure({ openOnClick: false, HTMLAttributes: { class: "tiptap-link" } }),
        TaskList,
        TaskItem.configure({ nested: true }),
        Table.configure({ resizable: false }),
        TableRow,
        TableCell,
        TableHeader,
        Image.configure({ inline: true }),
        Placeholder.configure({ placeholder: "Paste any Markdown here — GFM, Obsidian, MDX, Pandoc, anything..." }),
        TiptapMarkdown.configure({
          html: true, tightLists: true, bulletListMarker: "-",
          linkify: true, breaks: false,
          transformPastedText: true, transformCopiedText: true,
        }),
      ];
      if (ydoc) {
        exts.push(createCollaborationExtension(ydoc));
      }
      return exts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [!!ydoc]);

    const editor = useEditor({
      immediatelyRender: false,
      editable: canEdit,
      extensions,
      // If ydoc exists, y-prosemirror manages content. Otherwise, use initial markdown.
      content: ydoc ? undefined : initBody,
      editorProps: {
        attributes: {
          class: `mdcore-rendered tiptap-editor max-w-none focus:outline-none ${
            narrowView ? "p-3 sm:p-6 mx-auto max-w-3xl" : "p-3 sm:p-6 max-w-none"
          }`,
        },
        handlePaste: onPasteImage ? (view, event) => {
          const items = Array.from(event.clipboardData?.items || []);
          const imageItem = items.find(item => item.type.startsWith("image/"));
          if (!imageItem) return false;
          event.preventDefault();
          const file = imageItem.getAsFile();
          if (!file) return false;
          onPasteImage(file).then(url => {
            if (url && view.state) {
              const { tr } = view.state;
              const node = view.state.schema.nodes.image.create({ src: url, alt: file.name });
              view.dispatch(tr.replaceSelectionWith(node));
            }
          });
          return true;
        } : undefined,
      },
      onUpdate: ({ editor: ed }) => {
        if (suppressOnUpdate.current) return;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          const md = getMarkdownFromEditor(ed);
          onChange(md);
          if (onTitleChange) {
            const firstNode = ed.state.doc.firstChild;
            const title = firstNode?.type.name === "heading" && firstNode.attrs.level === 1
              ? firstNode.textContent.trim() : undefined;
            if (title !== lastTitleRef.current) {
              lastTitleRef.current = title;
              if (title) onTitleChange(title);
            }
          }
        }, 150);
      },
    });

    // Initialize Y.Doc XmlFragment with content if we're the first user
    useEffect(() => {
      if (!editor || !ydoc || initializedYdoc.current) return;
      const fragment = ydoc.getXmlFragment("prosemirror");
      // If the fragment is empty (we're the first user or just created), populate it
      if (fragment.length === 0 && initBody) {
        initializedYdoc.current = true;
        // Set content via editor (which syncs to Y.XmlFragment via ySyncPlugin)
        suppressOnUpdate.current = true;
        editor.commands.setContent(initBody);
        suppressOnUpdate.current = false;
      } else if (fragment.length > 0) {
        initializedYdoc.current = true;
        // Fragment already has content (from peer) — y-prosemirror handles rendering
      }
    }, [editor, ydoc, initBody]);

    // Update editable state
    useEffect(() => {
      if (editor) editor.setEditable(canEdit);
    }, [canEdit, editor]);

    // Update class when narrowView changes
    useEffect(() => {
      if (!editor) return;
      const padClass = narrowView ? "p-3 sm:p-6 mx-auto max-w-3xl" : "p-3 sm:p-6 max-w-none";
      editor.setOptions({
        editorProps: {
          attributes: {
            class: `mdcore-rendered tiptap-editor max-w-none focus:outline-none ${padClass}`,
          },
        },
      });
    }, [narrowView, editor]);

    useImperativeHandle(ref, () => ({
      setMarkdown: (md: string) => {
        if (!editor) return;
        // When y-prosemirror is active, don't manually setContent — Yjs handles sync
        if (ydoc) return;
        const { frontmatter, body } = extractFrontmatter(md);
        frontmatterRef.current = frontmatter;
        suppressOnUpdate.current = true;
        editor.commands.setContent(body);
        suppressOnUpdate.current = false;
      },
      getMarkdown: () => {
        if (!editor) return frontmatterRef.current + initialMarkdown;
        return getMarkdownFromEditor(editor);
      },
      getEditor: () => editor,
      focus: () => editor?.commands.focus(),
    }), [editor, initialMarkdown, getMarkdownFromEditor, ydoc]);

    if (!editor) return null;

    return (
      <EditorContent
        editor={editor}
        className={`tiptap-editor-wrapper flex-1 overflow-auto ${className}`}
        style={{ cursor: canEdit ? "text" : "default" }}
      />
    );
  }
);

export default TiptapEditor;
