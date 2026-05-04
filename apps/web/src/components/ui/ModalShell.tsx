"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

/**
 * Single shell for ALL modal dialogs. Replaces 7 different modal frames
 * (AddChunk, SectionEditor, ChunkEditor, Synthesis, AddDocsPicker,
 * Concept drawer, Add docs picker, etc.) with one consistent layout:
 *
 *   ┌─────────────────────────────────────┐
 *   │ <leadingIcon> <title> <subtitle> [×]│  ← header (slot)
 *   ├─────────────────────────────────────┤
 *   │                                     │
 *   │  children (scrollable body)         │
 *   │                                     │
 *   ├─────────────────────────────────────┤
 *   │            <footer slot>            │  ← footer (optional)
 *   └─────────────────────────────────────┘
 *
 * Backdrop click + Esc both close. Pass `size` for the three width tiers.
 */

type Size = "sm" | "md" | "lg";

const SIZE: Record<Size, string> = {
  sm: "min(420px, 92vw)",
  md: "min(640px, 92vw)",
  lg: "min(820px, 92vw)",
};

export interface ModalShellProps {
  open: boolean;
  onClose: () => void;
  size?: Size;
  /** Header left side — usually icon + title + optional subtitle/badge */
  title: ReactNode;
  /** Optional secondary header text shown next to the title in faint color */
  subtitle?: ReactNode;
  /** Optional footer slot (action buttons usually) */
  footer?: ReactNode;
  /** Extra content inside the header on the right (before close button) */
  headerExtras?: ReactNode;
  children: ReactNode;
  /** Disable Esc + backdrop close (e.g. while a save is in flight) */
  dismissable?: boolean;
}

export function ModalShell({ open, onClose, size = "md", title, subtitle, footer, headerExtras, children, dismissable = true }: ModalShellProps) {
  useEffect(() => {
    if (!open || !dismissable) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, dismissable]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={dismissable ? onClose : undefined}
    >
      <div
        className="rounded-lg overflow-hidden flex flex-col"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          width: SIZE[size],
          maxHeight: "84vh",
          boxShadow: "var(--shadow-modal)",
          borderRadius: "var(--radius-lg)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <header
          className="shrink-0 flex items-center justify-between gap-3"
          style={{ padding: "var(--space-3) var(--space-4)", borderBottom: "1px solid var(--border-dim)" }}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-heading truncate" style={{ color: "var(--text-primary)" }}>{title}</span>
            {subtitle && (
              <span className="text-caption truncate" style={{ color: "var(--text-faint)" }}>{subtitle}</span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {headerExtras}
            <button
              onClick={onClose}
              className="p-1 rounded transition-colors hover:bg-[var(--menu-hover)]"
              style={{ color: "var(--text-faint)", borderRadius: "var(--radius-sm)" }}
              aria-label="Close"
            >
              <X width={14} height={14} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto" style={{ padding: "var(--space-4)" }}>
          {children}
        </div>

        {footer && (
          <footer
            className="shrink-0 flex items-center justify-end gap-2"
            style={{ padding: "var(--space-3) var(--space-4)", borderTop: "1px solid var(--border-dim)" }}
          >
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
