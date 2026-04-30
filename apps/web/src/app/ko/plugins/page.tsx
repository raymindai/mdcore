import type { Metadata } from "next";
import PluginsContent from "@/components/PluginsContent";

export const metadata: Metadata = {
  title: "플러그인 및 확장 프로그램 — mdfy.app",
  description:
    "CLI, Mac 데스크톱 앱, Chrome 확장 프로그램, VS Code 확장 프로그램, macOS QuickLook으로 mdfy.app를 어디서든 사용하세요. AI 채팅 캡처와 터미널 게시 지원.",
  alternates: {
    canonical: "https://mdfy.app/ko/plugins",
    languages: { en: "https://mdfy.app/plugins" },
  },
  openGraph: {
    title: "플러그인 및 확장 프로그램 — mdfy.app",
    description:
      "AI 채팅 캡처 Chrome 확장. VS Code, CLI, Mac 앱, macOS QuickLook으로 Markdown 관리.",
    url: "https://mdfy.app/ko/plugins",
    images: [{ url: "/api/og?title=Plugins", width: 1200, height: 630 }],
  },
};

export default function KoPluginsPage() {
  return <PluginsContent locale="ko" />;
}
