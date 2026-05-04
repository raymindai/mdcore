"use client";
import { useState } from "react";

export default function HubCopyUrlButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch { /* ignore */ }
      }}
      className="text-caption px-2 py-1 rounded transition-colors"
      style={{
        background: copied ? "var(--accent)" : "var(--background)",
        color: copied ? "#000" : "var(--text-primary)",
        border: `1px solid ${copied ? "var(--accent)" : "var(--accent)"}`,
        fontWeight: 600,
      }}
    >
      {copied ? "Copied" : "Copy URL"}
    </button>
  );
}
