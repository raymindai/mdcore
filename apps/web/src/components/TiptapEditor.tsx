"use client";

import { useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from "react";
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

interface TiptapEditorProps {
  initialMarkdown: string;
  onChange: (markdown: string) => void;
  canEdit: boolean;
  narrowView: boolean;
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

const TiptapEditor = forwardRef<TiptapEditorHandle, TiptapEditorProps>(
  function TiptapEditor({ initialMarkdown, onChange, canEdit, narrowView, onTitleChange, onPasteImage, className = "" }, ref) {
    const suppressOnUpdate = useRef(false);
    const frontmatterRef = useRef("");
    const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
    const lastTitleRef = useRef<string | undefined>(undefined);

    // Extract frontmatter on initial content
    const { frontmatter: initFm, body: initBody } = extractFrontmatter(initialMarkdown);
    if (!frontmatterRef.current && initFm) frontmatterRef.current = initFm;

    const getMarkdownFromEditor = useCallback((editor: Editor): string => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body = (editor.storage as any).markdown.getMarkdown() as string;
      return frontmatterRef.current ? frontmatterRef.current + "\n" + body : body;
    }, []);

    const editor = useEditor({
      immediatelyRender: false,
      editable: canEdit,
      extensions: [
        StarterKit.configure({
          codeBlock: {
            HTMLAttributes: { class: "hljs" },
          },
          heading: { levels: [1, 2, 3, 4, 5, 6] },
        }),
        Link.configure({
          openOnClick: false,
          HTMLAttributes: { class: "tiptap-link" },
        }),
        TaskList,
        TaskItem.configure({ nested: true }),
        Table.configure({ resizable: false }),
        TableRow,
        TableCell,
        TableHeader,
        Image.configure({ inline: true }),
        Placeholder.configure({ placeholder: "Paste any Markdown here — GFM, Obsidian, MDX, Pandoc, anything..." }),
        TiptapMarkdown.configure({
          html: true,
          tightLists: true,
          bulletListMarker: "-",
          linkify: true,
          breaks: false,
          transformPastedText: true,
          transformCopiedText: true,
        }),
      ],
      content: initBody,
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
        // Debounce markdown serialization
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          const md = getMarkdownFromEditor(ed);
          onChange(md);
          // Title extraction
          if (onTitleChange) {
            const firstNode = ed.state.doc.firstChild;
            const title = firstNode?.type.name === "heading" && firstNode.attrs.level === 1
              ? firstNode.textContent.trim()
              : undefined;
            if (title !== lastTitleRef.current) {
              lastTitleRef.current = title;
              if (title) onTitleChange(title);
            }
          }
        }, 150);
      },
    });

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

    // Expose imperative handle
    useImperativeHandle(ref, () => ({
      setMarkdown: (md: string) => {
        if (!editor) return;
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
    }), [editor, initialMarkdown, getMarkdownFromEditor]);

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
