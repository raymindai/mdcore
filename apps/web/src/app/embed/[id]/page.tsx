"use client";

import { useState, useEffect, useRef } from "react";
import { renderMarkdown } from "@/lib/engine";
import { postProcessHtml } from "@/lib/postprocess";
import { useParams } from "next/navigation";

export default function EmbedPage() {
  const { id } = useParams<{ id: string }>();
  const [html, setHtml] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await fetch(`/api/docs/${id}`);
        if (!res.ok) {
          setHtml("<p>Document not found</p>");
          setIsLoading(false);
          return;
        }
        const doc = await res.json();
        const result = await renderMarkdown(doc.markdown);
        const processed = postProcessHtml(result.html);
        setHtml(processed);
        setIsLoading(false);
      } catch {
        setHtml("<p>Failed to load</p>");
        setIsLoading(false);
      }
    })();
  }, [id]);

  // Mermaid rendering
  useEffect(() => {
    if (!previewRef.current || isLoading) return;
    const containers = previewRef.current.querySelectorAll(".mermaid-container");
    if (containers.length === 0) return;

    import("mermaid").then((m) => {
      m.default.initialize({ startOnLoad: false, theme: "dark", fontFamily: "ui-monospace, monospace", fontSize: 13 });
      containers.forEach(async (c) => {
        const pre = c.querySelector("pre.mermaid");
        if (!pre) return;
        const code = pre.textContent || "";
        const mId = c.getAttribute("data-mermaid-id") || "mermaid-0";
        try {
          const { svg } = await m.default.render(mId, code);
          c.innerHTML = `<div class="mermaid-rendered">${svg}</div>`;
        } catch { /* ignore */ }
      });
    });
  }, [html, isLoading]);

  return (
    <div style={{ background: "#09090b", color: "#fafafa", minHeight: "100vh" }}>
      <div ref={previewRef}>
        {isLoading ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#71717a" }}>Loading...</div>
        ) : (
          <article
            className="mdcore-rendered p-4 sm:p-6"
            style={{ maxWidth: "none" }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </div>
      <div
        style={{
          padding: "8px 16px",
          borderTop: "1px solid #27272a",
          textAlign: "right",
          fontSize: "11px",
        }}
      >
        <a
          href={`https://mdfy.cc/${id}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#fb923c", textDecoration: "none" }}
        >
          mdfy.cc
        </a>
      </div>
    </div>
  );
}
