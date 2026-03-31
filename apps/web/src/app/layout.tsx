import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
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
  metadataBase: new URL("https://mdfy.cc"),
  openGraph: {
    title: "mdfy.cc — The Markdown Engine for the AI Era",
    description:
      "Paste any Markdown, see it beautiful. Powered by a Rust engine compiled to WASM. Supports every flavor: GFM, Obsidian, MDX, Pandoc, KaTeX, Mermaid.",
    url: "https://mdfy.cc",
    siteName: "mdfy.cc",
    type: "website",
    images: [{ url: "/api/og", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "mdfy.cc — Paste Markdown. See it beautiful.",
    description:
      "Universal Markdown renderer. Rust + WASM. Every flavor supported.",
    images: ["/api/og"],
  },
  robots: {
    index: true,
    follow: true,
  },
  other: {
    "theme-color": "#09090b",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning style={{ background: "#09090b" }}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('mdfy-theme');if(t==='light'){document.documentElement.setAttribute('data-theme','light');document.documentElement.style.background='#faf9f7'}}catch(e){}`,
          }}
        />
        <script src="https://cdn.jsdelivr.net/npm/mermaid@11.13.0/dist/mermaid.min.js" defer />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
