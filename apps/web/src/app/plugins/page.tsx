import type { Metadata } from "next";
import PluginsContent from "@/components/PluginsContent";

export const metadata: Metadata = {
  title: "Plugins and Extensions — mdfy.app",
  description:
    "Bring mdfy.app everywhere with CLI, Mac desktop app, Chrome extension, VS Code extension, and macOS QuickLook. Capture AI chats, publish from terminal.",
  alternates: {
    canonical: "https://mdfy.app/plugins",
    languages: { ko: "https://mdfy.app/ko/plugins" },
  },
  openGraph: {
    title: "Plugins and Extensions — mdfy.app",
    description: "Chrome extension for AI chat capture. VS Code extension, CLI, Mac app, and macOS QuickLook for Markdown.",
    url: "https://mdfy.app/plugins",
    images: [{ url: "/api/og?title=Plugins", width: 1200, height: 630 }],
  },
};

export default function PluginsPage() {
  return <PluginsContent locale="en" />;
}
