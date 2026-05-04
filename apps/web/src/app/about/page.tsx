import type { Metadata } from "next";
import AboutContent from "@/components/AboutContent";

export const metadata: Metadata = {
  title: "About — mdfy.app",
  description:
    "mdfy is your personal knowledge hub for the AI era. Capture from any AI chat, bundle by topic, deploy to any AI as a URL. Document, Bundle, and Hub URLs — same primitive, three scopes.",
  alternates: {
    canonical: "https://mdfy.app/about",
    languages: { ko: "https://mdfy.app/ko/about" },
  },
  openGraph: {
    title: "About — mdfy.app",
    description:
      "Your personal knowledge hub for the AI era. Capture, Bundle, Deploy — every URL is a living document, deployable to any AI.",
    url: "https://mdfy.app/about",
    images: [{ url: "/api/og?title=About", width: 1200, height: 630 }],
  },
};

export default function AboutPage() {
  return <AboutContent locale="en" />;
}
