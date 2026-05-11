import type { Metadata } from "next";
import AboutContent from "@/components/AboutContent";

export const metadata: Metadata = {
  title: "소개 — Karpathy의 위키, 어떤 AI에도 deploy",
  description:
    "당신이 방향을 잡고, mdfy가 URL로 구조화하고, 어떤 AI든 읽어갑니다. ChatGPT·Claude·GitHub·Obsidian·Notion에서 캡처한 모든 문서가 하나의 허브가 되고, Claude·Cursor·ChatGPT·Codex가 같은 방식으로 가져갑니다.",
  alternates: {
    canonical: "https://mdfy.app/ko/about",
    languages: { en: "https://mdfy.app/about" },
  },
  openGraph: {
    title: "소개 — mdfy.app",
    description:
      "Karpathy의 위키, 어떤 AI에도 deploy. 당신이 방향, mdfy가 구조, 어떤 AI든 읽어가는 URL.",
    url: "https://mdfy.app/ko/about",
    images: [{ url: "/api/og?title=About", width: 1200, height: 630 }],
  },
};

export default function KoAboutPage() {
  return <AboutContent locale="ko" />;
}
