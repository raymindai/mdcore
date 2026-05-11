import type { Metadata } from "next";
import ManifestoContent from "@/components/ManifestoContent";

export const metadata: Metadata = {
  title: "Manifesto — Your AI memory, owned as a URL",
  description:
    "You set the direction. mdfy structures the URL. Any AI reads it. The 7 beliefs behind mdfy — markdown as the AI-era memory format, hub as the deployable shape, URL as the primitive.",
  alternates: {
    canonical: "https://mdfy.app/manifesto",
    languages: { ko: "https://mdfy.app/ko/manifesto" },
  },
  openGraph: {
    title: "Manifesto — mdfy.app",
    description: "You set the direction. mdfy structures the URL. Any AI reads it. The 7 beliefs behind mdfy.",
    url: "https://mdfy.app/manifesto",
    images: [{ url: "/api/og?title=Manifesto", width: 1200, height: 630 }],
  },
};

export default function ManifestoPage() {
  return <ManifestoContent locale="en" />;
}
