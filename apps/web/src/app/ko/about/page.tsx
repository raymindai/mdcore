import type { Metadata } from "next";
import AboutContent from "@/components/AboutContent";

export const metadata: Metadata = {
  title: "소개 — mdfy.app",
  description:
    "mdfy는 AI 시대의 개인 지식허브입니다. 어디서든 캡처하고, 주제별로 묶고, 어떤 AI에든 URL로 deploy하세요. Document · Bundle · Hub — 같은 URL primitive, 세 가지 스코프.",
  alternates: {
    canonical: "https://mdfy.app/ko/about",
    languages: { en: "https://mdfy.app/about" },
  },
  openGraph: {
    title: "소개 — mdfy.app",
    description:
      "AI 시대의 개인 지식허브. Capture · Bundle · Deploy — 모든 URL이 살아있는 문서이자 어떤 AI에든 컨텍스트로 deploy 가능.",
    url: "https://mdfy.app/ko/about",
    images: [{ url: "/api/og?title=About", width: 1200, height: 630 }],
  },
};

export default function KoAboutPage() {
  return <AboutContent locale="ko" />;
}
