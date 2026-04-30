import type { Metadata } from "next";
import AboutContent from "@/components/AboutContent";

export const metadata: Metadata = {
  title: "About — mdfy.app",
  description:
    "mdfy.app — Own your markdown, use it anywhere. Capture AI conversations from ChatGPT and Claude, edit in WYSIWYG, share with permanent URLs, and deploy as context.",
  alternates: {
    canonical: "https://mdfy.app/about",
    languages: { ko: "https://mdfy.app/ko/about" },
  },
  openGraph: {
    title: "About — mdfy.app",
    description:
      "Own your markdown, use it anywhere. Capture AI conversations, edit in WYSIWYG, share with permanent URLs, and deploy as context.",
    url: "https://mdfy.app/about",
    images: [{ url: "/api/og?title=About", width: 1200, height: 630 }],
  },
};

export default function AboutPage() {
  return <AboutContent locale="en" />;
}
