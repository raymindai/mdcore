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
  title: "mdfy.cc -- The fastest way from thought to shared document.",
  description:
    "Create, edit, and share beautiful documents instantly. WYSIWYG Markdown editor with AI tools, cross-platform sync, and developer API. No login required.",
  keywords: [
    "markdown",
    "editor",
    "publisher",
    "share",
    "document",
    "WYSIWYG",
    "MCP",
    "API",
    "AI",
  ],
  authors: [{ name: "mdfy", url: "https://mdfy.cc" }],
  metadataBase: new URL("https://mdfy.cc"),
  openGraph: {
    title: "mdfy.cc -- Create. Share. Publish.",
    description:
      "Create, edit, and share beautiful documents instantly. WYSIWYG Markdown editor with AI tools, cross-platform sync, and developer API. No login required.",
    url: "https://mdfy.cc",
    siteName: "mdfy.cc",
    type: "website",
    images: [{ url: "/api/og", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "mdfy.cc -- The fastest way from thought to shared document.",
    description:
      "Create, edit, and share beautiful documents instantly. WYSIWYG Markdown editor with AI tools, cross-platform sync, and developer API.",
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
