import type { Metadata } from "next";
import AboutContent from "@/components/AboutContent";

export const metadata: Metadata = {
  title: "소개 — mdfy.app",
  description:
    "mdfy.app — 당신의 마크다운, 어디서든. ChatGPT, Claude 답변을 한 곳에 모으고. WYSIWYG으로 편집하고, 영구 URL로 공유하고, 어떤 AI에도 컨텍스트로 사용하세요.",
  alternates: {
    canonical: "https://mdfy.app/ko/about",
    languages: { en: "https://mdfy.app/about" },
  },
  openGraph: {
    title: "소개 — mdfy.app",
    description:
      "당신의 마크다운, 어디서든. 내가 만들고, 내가 쓰고, 내 것.",
    url: "https://mdfy.app/ko/about",
    images: [{ url: "/api/og?title=About", width: 1200, height: 630 }],
  },
};

export default function KoAboutPage() {
  return <AboutContent locale="ko" />;
}
