import type { Metadata } from "next";
import AboutContent from "@/components/AboutContent";

export const metadata: Metadata = {
  title: "About — mdfy.cc",
  description:
    "mdfy.cc — Own your markdown, use it anywhere. Capture AI conversations from ChatGPT and Claude, edit in WYSIWYG, share with permanent URLs, and deploy as context.",
  alternates: {
    canonical: "https://mdfy.cc/about",
    languages: { ko: "https://mdfy.cc/ko/about" },
  },
  openGraph: {
    title: "About — mdfy.cc",
    description:
      "Own your markdown, use it anywhere. Capture AI conversations, edit in WYSIWYG, share with permanent URLs, and deploy as context.",
    url: "https://mdfy.cc/about",
    images: [{ url: "/api/og?title=About", width: 1200, height: 630 }],
  },
};

export default function AboutPage() {
  return <AboutContent locale="en" />;
}
