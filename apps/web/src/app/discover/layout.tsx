import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Trending Projects — mdfy.app",
  description:
    "Browse trending GitHub projects and read their documentation beautifully rendered on mdfy.app. Discover popular open-source repositories.",
  openGraph: {
    title: "Trending Projects — mdfy.app",
    description:
      "Browse trending GitHub projects and read their documentation beautifully rendered on mdfy.app.",
    url: "https://mdfy.app/discover",
    images: [{ url: "/api/og?title=Discover", width: 1200, height: 630 }],
  },
};

export default function DiscoverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
