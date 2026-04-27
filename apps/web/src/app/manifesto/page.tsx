import type { Metadata } from "next";
import ManifestoContent from "@/components/ManifestoContent";

export const metadata: Metadata = {
  title: "Why I'm building mdfy — Manifesto",
  description:
    "Markdown URLs as the substrate for AI-era knowledge. Authored memory, not extracted. The bigger bet behind mdfy.cc.",
  openGraph: {
    title: "Why I'm building mdfy — Manifesto",
    description: "Markdown URLs as the substrate for AI-era knowledge.",
    url: "https://mdfy.cc/manifesto",
  },
};

export default function ManifestoPage() {
  return <ManifestoContent locale="en" />;
}
