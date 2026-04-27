import type { Metadata } from "next";
import AboutContent from "@/components/AboutContent";

export const metadata: Metadata = {
  title: "About — mdfy.cc",
  description:
    "mdfy.cc — 당신의 마크다운, 어디서든. ChatGPT, Claude 답변을 한 곳에. 마크다운으로 편집하고, 어떤 AI에도 컨텍스트로.",
  openGraph: {
    title: "About — mdfy.cc",
    description:
      "당신의 마크다운, 어디서든. 내가 만들고, 내가 쓰고, 내 것.",
    url: "https://mdfy.cc/ko/about",
  },
};

export default function KoAboutPage() {
  return <AboutContent locale="ko" />;
}
