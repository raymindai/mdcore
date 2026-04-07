import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // /d/ pages are allowed: public shared docs are organic traffic.
        // Per-page noindex is set in d/[id]/page.tsx for protected/restricted/expired docs.
        disallow: ["/embed/", "/api/", "/auth/"],
      },
    ],
    sitemap: "https://mdfy.cc/sitemap.xml",
    host: "https://mdfy.cc",
  };
}
