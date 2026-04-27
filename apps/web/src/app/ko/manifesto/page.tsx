import type { Metadata } from "next";
import ManifestoContent from "@/components/ManifestoContent";

export const metadata: Metadata = {
  title: "내가 mdfy를 만드는 이유 — mdfy.cc",
  description:
    "마크다운 URL이 AI 시대 지식의 substrate. 추출이 아닌 authorship. mdfy의 더 큰 베팅.",
  openGraph: {
    title: "내가 mdfy를 만드는 이유",
    description: "마크다운 URL이 AI 시대 지식의 substrate.",
    url: "https://mdfy.cc/ko/manifesto",
  },
};

export default function KoManifestoPage() {
  return <ManifestoContent locale="ko" />;
}
