"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

// Curated list of emojis useful for folder labeling. Grouped loosely by theme.
const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  { label: "Folders & Files",
    emojis: ["📁", "📂", "🗂️", "🗃️", "🗄️", "📋", "📒", "📕", "📗", "📘", "📙", "📓", "📔", "📰", "📦", "💼"] },
  { label: "Symbols",
    emojis: ["⭐", "🔥", "✨", "💡", "🎯", "⚡", "🚀", "🎨", "🎓", "🏆", "❤️", "💚", "💙", "💜", "🟠", "🟢"] },
  { label: "Activities",
    emojis: ["📝", "🔧", "🔬", "🧪", "🧠", "🎮", "🎵", "🎬", "📷", "📊", "📈", "📉", "💰", "💳", "🏠", "🌍"] },
  { label: "Nature",
    emojis: ["🌟", "🌙", "☀️", "🌈", "🌳", "🌱", "🍀", "🌸", "🐱", "🐶", "🦊", "🦄", "🐝", "🦋", "🌊", "❄️"] },
];

export default function FolderEmojiPicker({
  currentEmoji,
  onSelect,
  onClose,
}: {
  currentEmoji?: string;
  onSelect: (emoji: string | null) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const q = search.trim().toLowerCase();
  const filteredGroups = q
    ? EMOJI_GROUPS.map(g => ({ ...g, emojis: g.emojis.filter(e => e.includes(q)) })).filter(g => g.emojis.length > 0)
    : EMOJI_GROUPS;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        className="rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden flex flex-col"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", maxHeight: "70vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Folder icon</h2>
          <button onClick={onClose} className="w-6 h-6 rounded flex items-center justify-center hover:bg-[var(--toggle-bg)]" style={{ color: "var(--text-faint)" }}>
            <X width={12} height={12} />
          </button>
        </div>
        <div className="px-4 pb-2">
          <input
            ref={inputRef}
            type="text"
            placeholder="Filter emoji..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-1.5 rounded-md text-[12px] outline-none"
            style={{ background: "var(--background)", border: "1px solid var(--border-dim)", color: "var(--text-primary)" }}
          />
        </div>
        <div className="px-4 pb-2 flex-1 min-h-0 overflow-auto">
          <button
            onClick={() => onSelect(null)}
            className="w-full text-left text-[11px] px-2 py-1.5 mb-2 rounded-md transition-colors hover:bg-[var(--toggle-bg)]"
            style={{ color: currentEmoji ? "var(--text-secondary)" : "var(--accent)", border: `1px dashed ${currentEmoji ? "var(--border-dim)" : "var(--accent)"}` }}
          >
            Use default folder icon
          </button>
          {filteredGroups.map(group => (
            <div key={group.label} className="mb-3">
              <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--text-faint)" }}>{group.label}</div>
              <div className="grid grid-cols-8 gap-1">
                {group.emojis.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => onSelect(emoji)}
                    className="w-8 h-8 rounded text-[18px] leading-none flex items-center justify-center transition-colors hover:bg-[var(--accent-dim)]"
                    style={{
                      background: currentEmoji === emoji ? "var(--accent-dim)" : "transparent",
                      outline: currentEmoji === emoji ? "1px solid var(--accent)" : "none",
                    }}
                    title={emoji}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {filteredGroups.length === 0 && (
            <div className="text-[11px] py-4 text-center" style={{ color: "var(--text-faint)" }}>
              No matches.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
