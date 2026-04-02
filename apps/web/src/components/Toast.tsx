"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface ToastItem {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

let globalShow: ((message: string, type?: "success" | "error" | "info") => void) | null = null;

/** Call from anywhere: showToast("Saved!", "success") */
export function showToast(message: string, type: "success" | "error" | "info" = "info") {
  globalShow?.(message, type);
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const show = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
    const id = ++idRef.current;
    setToasts(prev => [...prev.slice(-4), { id, message, type }]); // Max 5
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  useEffect(() => {
    globalShow = show;
    return () => { globalShow = null; };
  }, [show]);

  if (toasts.length === 0) return null;

  const colors = {
    success: { bg: "rgba(74,222,128,0.15)", border: "rgba(74,222,128,0.3)", text: "#4ade80" },
    error: { bg: "rgba(239,68,68,0.15)", border: "rgba(239,68,68,0.3)", text: "#ef4444" },
    info: { bg: "var(--surface)", border: "var(--border)", text: "var(--text-secondary)" },
  };

  return (
    <div className="fixed bottom-4 right-4 z-[99999] flex flex-col gap-2" style={{ maxWidth: 340 }}>
      {toasts.map(t => (
        <div
          key={t.id}
          className="px-4 py-2.5 rounded-lg text-xs font-medium shadow-lg"
          style={{ background: colors[t.type].bg, border: `1px solid ${colors[t.type].border}`, color: colors[t.type].text, animation: "fadeInUp 0.2s ease-out" }}
        >
          {t.message}
        </div>
      ))}
      <style>{`@keyframes fadeInUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
}
