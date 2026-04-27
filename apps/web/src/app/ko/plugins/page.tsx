import type { Metadata } from "next";
import PluginsContent from "@/components/PluginsContent";

export const metadata: Metadata = {
  title: "Plugins — mdfy.cc",
  description:
    "CLI, Mac 앱, Chrome 확장, VS Code 확장, QuickLook. mdfy.cc를 어디서든 사용하세요.",
  openGraph: {
    title: "Plugins — mdfy.cc",
    description:
      "AI 채팅 캡처 Chrome 확장. macOS QuickLook으로 Markdown 미리보기.",
    url: "https://mdfy.cc/ko/plugins",
  },
};

export default function KoPluginsPage() {
  return <PluginsContent locale="ko" />;
}
