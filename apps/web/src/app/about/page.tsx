import type { Metadata } from "next";
import AboutContent from "@/components/AboutContent";

export const metadata: Metadata = {
  title: "About — mdfy.cc",
  description:
    "mdfy.cc — Own your markdown. Use it anywhere. Capture AI answers, edit in WYSIWYG, share and deploy as context.",
  openGraph: {
    title: "About — mdfy.cc",
    description:
      "Own your markdown. Use it anywhere. Capture AI answers, edit in WYSIWYG, share and deploy as context.",
    url: "https://mdfy.cc/about",
  },
};

export default function AboutPage() {
  return <AboutContent locale="en" />;
}
