import type { Metadata } from "next";
import ManifestoContent from "@/components/ManifestoContent";

export const metadata: Metadata = {
  title: "Manifesto — Personal knowledge hub for the AI era",
  description:
    "Own your markdown. Build your hub. Deploy anywhere. Document, Bundle, Hub — same URL primitive, three scopes. AI is a collaborator, not just a tool.",
  alternates: {
    canonical: "https://mdfy.app/manifesto",
    languages: { ko: "https://mdfy.app/ko/manifesto" },
  },
  openGraph: {
    title: "Manifesto — mdfy.app",
    description: "Own your markdown. Build your hub. Deploy anywhere. The 7 beliefs behind mdfy.",
    url: "https://mdfy.app/manifesto",
    images: [{ url: "/api/og?title=Manifesto", width: 1200, height: 630 }],
  },
};

export default function ManifestoPage() {
  return <ManifestoContent locale="en" />;
}
