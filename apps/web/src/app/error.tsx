"use client";
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ padding: 40, textAlign: "center", color: "#a1a1aa", fontFamily: "system-ui" }}>
      <h2 style={{ color: "#f87171", marginBottom: 16 }}>Something went wrong</h2>
      <p style={{ marginBottom: 24 }}>{error.message || "An unexpected error occurred"}</p>
      <button onClick={reset} style={{ padding: "8px 24px", borderRadius: 8, background: "#fb923c", color: "#000", fontWeight: 600, border: "none", cursor: "pointer" }}>
        Try Again
      </button>
    </div>
  );
}
