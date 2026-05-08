import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "officeparser"],
  // Long-slug explainer docs (mdfy.app/how-mdfy-works, etc.) live in the
  // documents table the same as any other doc, but their ids exceed the
  // 12-char nanoid pattern Vercel's top-level rewrite assumes. Map each
  // human-readable slug explicitly to /d/<id> so the public viewer
  // renders. Each slug here MUST match a documents.id in the founder hub.
  async rewrites() {
    // Long-slug content lives in the documents/bundles tables but the
    // top-level Vercel rewrite expects 6-12-char nanoids. Each branded
    // slug needs an explicit rewrite to /d/<id> or /b/<id> so the
    // public viewer renders. New mdfy explainer/foundation content all
    // ships with long slugs; add new entries here as they are published.
    return [
      // Architecture explainers
      { source: "/how-mdfy-works", destination: "/d/how-mdfy-works" },
      { source: "/mdfy-memory", destination: "/d/mdfy-memory" },
      // Legacy alias (now a redirect stub doc)
      { source: "/how-mdfy-rag-works", destination: "/d/how-mdfy-rag-works" },
      // mdfy-about-mdfy content set
      { source: "/what-is-mdfy", destination: "/d/what-is-mdfy" },
      { source: "/mdfy-three-primitives", destination: "/d/mdfy-three-primitives" },
      { source: "/mdfy-vs-vendor-memory", destination: "/d/mdfy-vs-vendor-memory" },
      { source: "/mdfy-skills-overview", destination: "/d/mdfy-skills-overview" },
      { source: "/mdfy-bundle-spec", destination: "/d/mdfy-bundle-spec" },
      { source: "/mdfy-faq", destination: "/d/mdfy-faq" },
      { source: "/mdfy-roadmap-2026", destination: "/d/mdfy-roadmap-2026" },
    ];
  },
  webpack(config) {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    // Tell webpack the runtime supports async/await — silences the asyncWebAssembly
    // "target environment does not appear to support async/await" warning.
    config.output = {
      ...config.output,
      environment: {
        ...(config.output?.environment || {}),
        asyncFunction: true,
      },
    };
    // Mermaid: exclude from webpack bundle — loaded via CDN script tag
    // This avoids dynamic import chunk resolution issues with mermaid v11
    if (!config.externals) config.externals = [];
    if (Array.isArray(config.externals)) {
      config.externals.push({ mermaid: "mermaid" });
    }
    return config;
  },
};

export default nextConfig;
