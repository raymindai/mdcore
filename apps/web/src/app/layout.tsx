import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "mdfy.cc — Paste Markdown. See it beautiful.",
  description:
    "The universal Markdown renderer for the AI era. Paste any Markdown — GFM, Obsidian, MDX, Pandoc — and see it rendered instantly via Rust + WASM. No login required.",
  keywords: [
    "markdown",
    "renderer",
    "GFM",
    "obsidian",
    "MDX",
    "WASM",
    "rust",
    "AI",
    "mdcore",
  ],
  authors: [{ name: "mdcore", url: "https://mdcore.ai" }],
  openGraph: {
    title: "mdfy.cc — The Markdown Engine for the AI Era",
    description:
      "Paste any Markdown, see it beautiful. Powered by a Rust engine compiled to WASM. Supports every flavor: GFM, Obsidian, MDX, Pandoc, KaTeX, Mermaid.",
    url: "https://mdfy.cc",
    siteName: "mdfy.cc",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "mdfy.cc — Paste Markdown. See it beautiful.",
    description:
      "Universal Markdown renderer. Rust + WASM. Every flavor supported.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
