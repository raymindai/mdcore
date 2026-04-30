import type { Metadata } from "next";
import ManifestoContent from "@/components/ManifestoContent";

export const metadata: Metadata = {
  title: "내가 mdfy를 만드는 이유 — mdfy.app",
  description:
    "마크다운 URL이 AI 시대 지식의 substrate. 추출이 아닌 authorship. mdfy.app 뒤에 숨겨진 더 큰 비전과 크로스 AI 퍼블리싱 레이어.",
  alternates: {
    canonical: "https://mdfy.app/ko/manifesto",
    languages: { en: "https://mdfy.app/manifesto" },
  },
  openGraph: {
    title: "내가 mdfy를 만드는 이유",
    description: "마크다운 URL이 AI 시대 지식의 substrate. mdfy.app의 비전.",
    url: "https://mdfy.app/ko/manifesto",
    images: [{ url: "/api/og?title=Manifesto", width: 1200, height: 630 }],
  },
};

export default function KoManifestoPage() {
  return <ManifestoContent locale="ko" />;
}
