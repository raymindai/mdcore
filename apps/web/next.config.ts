import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "officeparser"],
  // Long-slug explainer docs (mdfy.app/how-mdfy-works, etc.) live in the
  // documents table the same as any other doc, but their ids exceed the
  // 12-char nanoid pattern Vercel's top-level rewrite assumes. Map each
  // human-readable slug explicitly to /d/<id> so the public viewer
  // renders. Each slug here MUST match a documents.id in the founder hub.
  async rewrites() {
    return [
      { source: "/how-mdfy-works", destination: "/d/how-mdfy-works" },
      { source: "/how-mdfy-rag-works", destination: "/d/how-mdfy-rag-works" },
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
