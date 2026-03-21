import Link from "next/link";

export default function NotFound() {
  return (
    <div
      className="flex flex-col items-center justify-center h-screen gap-4"
      style={{ background: "var(--background)", color: "var(--foreground)" }}
    >
      <h1 className="text-6xl font-bold" style={{ color: "var(--accent)" }}>
        404
      </h1>
      <p style={{ color: "var(--text-muted)" }}>Document not found</p>
      <Link
        href="/"
        className="mt-4 px-4 py-2 rounded-md text-sm font-mono"
        style={{ background: "var(--accent-dim)", color: "var(--accent)" }}
      >
        Create a new document
      </Link>
    </div>
  );
}
