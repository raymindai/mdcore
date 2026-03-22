import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "mdcore.ai — Markdown API for the AI Era",
  description:
    "Render, convert, and normalize Markdown via API. Powered by a Rust engine compiled to WASM. One API, every format, every flavor.",
  openGraph: {
    title: "mdcore.ai — Markdown API for the AI Era",
    description:
      "Render, convert, and normalize Markdown via API. One engine, every format.",
    url: "https://mdcore.ai",
    siteName: "mdcore.ai",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "mdcore.ai — Markdown API for the AI Era",
    description: "Render, convert, and normalize Markdown via API.",
  },
};

export default function MdcoreAiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
