import type { Metadata } from "next";
import ManifestoContent from "@/components/ManifestoContent";

export const metadata: Metadata = {
  title: "Why I'm building mdfy — Manifesto",
  description:
    "Markdown URLs as the substrate for AI-era knowledge. Authored memory, not extracted. The bigger bet behind mdfy.cc and the cross-AI publishing layer.",
  alternates: {
    canonical: "https://mdfy.cc/manifesto",
    languages: { ko: "https://mdfy.cc/ko/manifesto" },
  },
  openGraph: {
    title: "Why I'm building mdfy — Manifesto",
    description: "Markdown URLs as the substrate for AI-era knowledge. The bigger bet behind mdfy.cc.",
    url: "https://mdfy.cc/manifesto",
    images: [{ url: "/api/og?title=Manifesto", width: 1200, height: 630 }],
  },
};

export default function ManifestoPage() {
  return <ManifestoContent locale="en" />;
}
