import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // /d/ pages are allowed: public shared docs are organic traffic.
        // Per-page noindex is set in d/[id]/page.tsx for protected/restricted/expired docs.
        disallow: ["/embed/", "/auth/", "/settings/", "/admin/"],
        // /api/docs/ is allowed so AI tools can fetch document content
      },
    ],
    sitemap: "https://mdfy.app/sitemap.xml",
    host: "https://mdfy.app",
  };
}
