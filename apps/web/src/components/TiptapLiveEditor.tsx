"use client";

import {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  useCallback,
  useMemo,
} from "react";
import { useEditor, EditorContent, Extension } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
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
import { common, createLowlight } from "lowlight";
import * as Y from "yjs";
import { ySyncPlugin, yUndoPlugin } from "y-prosemirror";

const lowlightInstance = createLowlight(common);

// ─── Frontmatter helpers ───

function extractFrontmatter(md: string): { frontmatter: string; body: string } {
  const lines = md.split("\n");
  if (lines[0]?.trim() !== "---") return { frontmatter: "", body: md };
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]?.trim() === "---") {
      const frontmatter = lines.slice(0, i + 1).join("\n");
      const body = lines.slice(i + 1).join("\n").replace(/^\n+/, "");
      return { frontmatter, body };
    }
  }
  return { frontmatter: "", body: md };
}

// ─── Types ───

interface TiptapLiveEditorProps {
  markdown: string;
  onChange: (markdown: string) => void;
  canEdit: boolean;
  narrowView: boolean;
  ydoc: Y.Doc | null;
  onTitleChange?: (title: string) => void;
  onPasteImage?: (file: File) => Promise<string | null>;
}

export interface TiptapLiveEditorHandle {
  setMarkdown: (md: string) => void;
  getMarkdown: () => string;
  focus: () => void;
}

// ─── y-prosemirror extension factory ───

function createCollabExtension(fragment: Y.XmlFragment) {
  return Extension.create({
    name: "yjs-collab",
    addProseMirrorPlugins() {
      return [
        ySyncPlugin(fragment),
        yUndoPlugin(),
      ];
    },
  });
}

// ─── Component ───

const TiptapLiveEditor = forwardRef<TiptapLiveEditorHandle, TiptapLiveEditorProps>(
  function TiptapLiveEditor(
    { markdown, onChange, canEdit, narrowView, ydoc, onTitleChange, onPasteImage },
    ref
  ) {
    const suppressOnUpdate = useRef(false);
    const debounceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
    const frontmatterRef = useRef("");
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const onTitleChangeRef = useRef(onTitleChange);
    onTitleChangeRef.current = onTitleChange;
    const onPasteImageRef = useRef(onPasteImage);
    onPasteImageRef.current = onPasteImage;
    const initializedYjsRef = useRef(false);

    const { frontmatter: initialFm, body: initialBody } = extractFrontmatter(markdown);
    if (!frontmatterRef.current && initialFm) {
      frontmatterRef.current = initialFm;
    }

    // Build extensions — include y-prosemirror if ydoc available
    const extensions = useMemo(() => {
      const exts = [
        StarterKit.configure({
          codeBlock: false,
          heading: { levels: [1, 2, 3, 4, 5, 6] },
          // Disable built-in history when yUndoPlugin is active
          ...(ydoc ? { history: false } : {}),
        }),
        CodeBlockLowlight.configure({
          lowlight: lowlightInstance,
          defaultLanguage: null,
          HTMLAttributes: { class: "hljs" },
        }),
        Link.configure({ openOnClick: false, HTMLAttributes: { class: "tiptap-link" } }),
        TaskList,
        TaskItem.configure({ nested: true }),
        Table.configure({ resizable: false }),
        TableRow,
        TableCell,
        TableHeader,
        Image.configure({ inline: true }),
        Placeholder.configure({ placeholder: "Start writing..." }),
        TiptapMarkdown.configure({
          html: true, tightLists: true, bulletListMarker: "-",
          linkify: true, breaks: false,
          transformPastedText: true, transformCopiedText: true,
        }),
      ];
      // Add y-prosemirror collaboration
      if (ydoc) {
        const fragment = ydoc.getXmlFragment("prosemirror");
        exts.push(createCollabExtension(fragment));
      }
      return exts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [!!ydoc]);

    const editor = useEditor({
      immediatelyRender: false,
      extensions,
      // When ydoc exists, ySyncPlugin manages content — don't set initial content
      // (it would conflict with the XmlFragment)
      content: ydoc ? undefined : initialBody,
      editorProps: {
        attributes: {
          class: `mdcore-rendered tiptap-editor max-w-none focus:outline-none ${
            narrowView ? "p-3 sm:p-6 mx-auto max-w-3xl" : "p-3 sm:p-6"
          }`,
        },
        handlePaste: (view, event) => {
          const items = Array.from(event.clipboardData?.items || []);
          const imageItems = items.filter((item) => item.type.startsWith("image/"));
          if (imageItems.length > 0 && onPasteImageRef.current) {
            event.preventDefault();
            (async () => {
              for (const imageItem of imageItems) {
                const file = imageItem.getAsFile();
                if (!file) continue;
                const url = await onPasteImageRef.current!(file);
                if (url) {
                  view.dispatch(
                    view.state.tr.replaceSelectionWith(
                      view.state.schema.nodes.image.create({ src: url, alt: file.name || "image" })
                    )
                  );
                }
              }
            })();
            return true;
          }
          return false;
        },
      },
      onUpdate: ({ editor: ed }) => {
        if (suppressOnUpdate.current) return;
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const bodyMd = (ed.storage as any).markdown?.getMarkdown() as string;
          if (bodyMd == null) return;
          const fullMd = frontmatterRef.current
            ? frontmatterRef.current + "\n" + bodyMd
            : bodyMd;
          onChangeRef.current(fullMd);
          const firstNode = ed.state.doc.firstChild;
          if (firstNode?.type.name === "heading" && firstNode.attrs.level === 1) {
            const titleText = firstNode.textContent.trim();
            if (titleText) onTitleChangeRef.current?.(titleText);
          }
        }, 150);
      },
    });

    // Initialize Y.XmlFragment with content if empty (first user)
    // CRITICAL: Wait for sync-response before initializing. If both users
    // initialize independently, CRDT merge doubles the content.
    useEffect(() => {
      if (!editor || !ydoc || initializedYjsRef.current) return;
      const fragment = ydoc.getXmlFragment("prosemirror");

      // Already populated (from sync-response or previous session)
      if (fragment.length > 0) {
        initializedYjsRef.current = true;
        return;
      }

      // Watch for fragment being populated by sync-response
      const observer = () => {
        if (fragment.length > 0 && !initializedYjsRef.current) {
          initializedYjsRef.current = true;
        }
      };
      fragment.observe(observer);

      // Wait 2.5s (longer than useCollaboration's 2s init timer)
      // If no peer populates the fragment, we're the first user
      const timer = setTimeout(() => {
        if (initializedYjsRef.current) return;
        if (fragment.length > 0) { initializedYjsRef.current = true; return; }
        initializedYjsRef.current = true;
        suppressOnUpdate.current = true;
        editor.commands.setContent(initialBody);
        suppressOnUpdate.current = false;
      }, 2500);

      return () => { clearTimeout(timer); fragment.unobserve(observer); };
    }, [editor, ydoc, initialBody]);

    useEffect(() => {
      if (!editor) return;
      editor.setEditable(canEdit);
    }, [canEdit, editor]);

    useEffect(() => {
      if (!editor) return;
      const padClass = narrowView ? "p-3 sm:p-6 mx-auto max-w-3xl" : "p-3 sm:p-6";
      editor.setOptions({
        editorProps: {
          attributes: {
            class: `mdcore-rendered tiptap-editor max-w-none focus:outline-none ${padClass}`,
          },
        },
      });
    }, [narrowView, editor]);


    const getMarkdownImperative = useCallback(() => {
      if (!editor) return "";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bodyMd = (editor.storage as any).markdown?.getMarkdown() as string;
      if (!bodyMd) return frontmatterRef.current || "";
      return frontmatterRef.current
        ? frontmatterRef.current + "\n" + bodyMd
        : bodyMd;
    }, [editor]);

    useImperativeHandle(
      ref,
      () => ({
        setMarkdown: (md: string) => {
        if (!editor) return;
        const { frontmatter: fm, body } = extractFrontmatter(md);
        frontmatterRef.current = fm;
        suppressOnUpdate.current = true;
        editor.commands.setContent(body);
        suppressOnUpdate.current = false;
      },
        getMarkdown: getMarkdownImperative,
        focus: () => editor?.commands.focus(),
      }),
      [getMarkdownImperative, editor]
    );

    if (!editor) return null;

    return (
      <EditorContent
        editor={editor}
        className="tiptap-live-editor-wrapper h-full"
      />
    );
  }
);

export default TiptapLiveEditor;
