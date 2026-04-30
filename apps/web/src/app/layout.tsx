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
  title: "mdfy.app -- Your Markdown, Beautifully Published.",
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
  authors: [{ name: "mdfy", url: "https://mdfy.app" }],
  metadataBase: new URL("https://mdfy.app"),
  openGraph: {
    title: "mdfy.app -- Your Markdown, Beautifully Published.",
    description:
      "Create, edit, and share beautiful documents instantly. WYSIWYG Markdown editor with AI tools, cross-platform sync, and developer API. No login required.",
    url: "https://mdfy.app",
    siteName: "mdfy.app",
    type: "website",
    images: [{ url: "/api/og", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "mdfy.app -- Your Markdown, Beautifully Published.",
    description:
      "Create, edit, and share beautiful documents instantly. WYSIWYG Markdown editor with AI tools, cross-platform sync, and developer API.",
    images: ["/api/og"],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://mdfy.app",
    languages: {
      en: "https://mdfy.app",
      ko: "https://mdfy.app/ko",
    },
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
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('mdfy-theme');if(t==='light'){document.documentElement.setAttribute('data-theme','light');document.documentElement.style.background='#faf9f7'}var a=localStorage.getItem('mdfy-accent');if(a&&a!=='orange'){document.documentElement.setAttribute('data-accent',a)}var s=localStorage.getItem('mdfy-scheme');if(s&&s!=='default'){document.documentElement.setAttribute('data-scheme',s)}}catch(e){}`,
          }}
        />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "mdfy.app",
          "url": "https://mdfy.app",
          "description": "Create, edit, and share beautiful documents instantly. WYSIWYG Markdown editor with AI tools, cross-platform sync, and developer API. No login required.",
          "publisher": {
            "@type": "Organization",
            "name": "Raymind AI",
            "url": "https://raymind.ai"
          },
          "potentialAction": {
            "@type": "SearchAction",
            "target": "https://mdfy.app/?q={search_term_string}",
            "query-input": "required name=search_term_string"
          }
        })}} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "mdfy.app",
          "applicationCategory": "Productivity",
          "operatingSystem": "Web, macOS, VS Code, Chrome",
          "url": "https://mdfy.app",
          "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
          "description": "Markdown publishing tool with WYSIWYG editing, AI conversation capture, and permanent shareable URLs."
        })}} />
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-V3LTDKKHTS" />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','G-V3LTDKKHTS');`,
          }}
        />
        <script src="https://cdn.jsdelivr.net/npm/mermaid@11.13.0/dist/mermaid.min.js" defer />
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js')})}`,
          }}
        />
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
