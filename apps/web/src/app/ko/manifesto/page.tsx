import type { Metadata } from "next";
import ManifestoContent from "@/components/ManifestoContent";

export const metadata: Metadata = {
  title: "Manifesto — AI 시대의 개인 지식허브",
  description:
    "당신의 마크다운을 소유하세요. 허브를 만드세요. 어디든 deploy하세요. Document · Bundle · Hub — 같은 URL primitive, 세 가지 스코프. AI는 도구가 아니라 collaborator입니다.",
  alternates: {
    canonical: "https://mdfy.app/ko/manifesto",
    languages: { en: "https://mdfy.app/manifesto" },
  },
  openGraph: {
    title: "Manifesto — mdfy.app",
    description: "당신의 마크다운을 소유하세요. 허브를 만드세요. 어디든 deploy하세요. mdfy의 7가지 belief.",
    url: "https://mdfy.app/ko/manifesto",
    images: [{ url: "/api/og?title=Manifesto", width: 1200, height: 630 }],
  },
};

export default function KoManifestoPage() {
  return <ManifestoContent locale="ko" />;
}
