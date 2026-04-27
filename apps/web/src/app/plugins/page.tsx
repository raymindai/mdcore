import type { Metadata } from "next";
import PluginsContent from "@/components/PluginsContent";

export const metadata: Metadata = {
  title: "Plugins — mdfy.cc",
  description:
    "CLI tool, Mac app, Chrome extension, VS Code extension, QuickLook. Bring mdfy.cc everywhere.",
  openGraph: {
    title: "Plugins — mdfy.cc",
    description: "Chrome extension for AI chat capture. macOS QuickLook for Markdown preview.",
    url: "https://mdfy.cc/plugins",
  },
};

export default function PluginsPage() {
  return <PluginsContent locale="en" />;
}
