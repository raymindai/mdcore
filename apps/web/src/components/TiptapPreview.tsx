"use client";

import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
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

// ─── Types ───

interface TiptapPreviewProps {
  initialMarkdown: string;
  onChange: (markdown: string) => void;
  className?: string;
  viewMode: "split" | "preview" | "editor";
}

export interface TiptapPreviewHandle {
  /** Set markdown content from external source (CM6, undo, tab switch). Does NOT trigger onChange. */
  setMarkdown: (md: string) => void;
}

// ─── Component ───

const TiptapPreview = forwardRef<TiptapPreviewHandle, TiptapPreviewProps>(
  function TiptapPreview({ initialMarkdown, onChange, className = "", viewMode }, ref) {
    const suppressOnUpdate = useRef(false);

    const editor = useEditor({
      immediatelyRender: false,
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
        Placeholder.configure({ placeholder: "Start writing..." }),
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
      content: initialMarkdown,
      editorProps: {
        attributes: {
          class: `mdcore-rendered tiptap-editor max-w-none focus:outline-none ${
            viewMode === "preview"
              ? "p-4 sm:p-8 mx-auto max-w-3xl"
              : "p-3 sm:p-6"
          }`,
        },
      },
      onUpdate: ({ editor }) => {
        if (suppressOnUpdate.current) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const md = (editor.storage as any).markdown.getMarkdown() as string;
        onChange(md);
      },
    });

    // Expose imperative handle for external sync
    useImperativeHandle(ref, () => ({
      setMarkdown: (md: string) => {
        if (!editor) return;
        suppressOnUpdate.current = true;
        editor.commands.setContent(md);
        suppressOnUpdate.current = false;
      },
    }), [editor]);

    // Update editor class when viewMode changes
    useEffect(() => {
      if (!editor) return;
      const padClass =
        viewMode === "preview"
          ? "p-4 sm:p-8 mx-auto max-w-3xl"
          : "p-3 sm:p-6";
      editor.setOptions({
        editorProps: {
          attributes: {
            class: `mdcore-rendered tiptap-editor max-w-none focus:outline-none ${padClass}`,
          },
        },
      });
    }, [viewMode, editor]);

    if (!editor) return null;

    return (
      <EditorContent
        editor={editor}
        className={`tiptap-preview-wrapper ${className}`}
      />
    );
  }
);

export default TiptapPreview;
