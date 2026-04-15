import Link from "next/link";

export default function NotFound() {
  return (
    <div
      className="flex flex-col items-center justify-center h-screen gap-4 px-6"
      style={{ background: "var(--background)", color: "var(--foreground)" }}
    >
      <h1 className="text-6xl font-bold" style={{ color: "var(--accent)" }}>
        404
      </h1>
      <p className="text-lg" style={{ color: "var(--text-muted)" }}>Document not found</p>
      <p className="text-sm text-center max-w-md" style={{ color: "var(--text-faint)", lineHeight: 1.6 }}>
        This document may have been removed after 7 days of inactivity.
        Sign in to keep your documents permanently.
      </p>
      <div className="flex gap-3 mt-2">
        <Link
          href="/"
          className="px-5 py-2 rounded-lg text-sm font-medium"
          style={{ background: "var(--accent)", color: "#000" }}
        >
          Create a new document
        </Link>
        <Link
          href="/"
          className="px-5 py-2 rounded-lg text-sm font-medium"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
