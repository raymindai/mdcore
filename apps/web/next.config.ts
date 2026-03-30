import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "officeparser"],
  webpack(config) {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    // Mermaid: exclude from webpack bundle — loaded via CDN script tag
    // This avoids dynamic import chunk resolution issues with mermaid v11
    if (!config.externals) config.externals = [];
    if (Array.isArray(config.externals)) {
      config.externals.push({ mermaid: "mermaid" });
    }
    return config;
  },
  async rewrites() {
    return [
      {
        // Short document IDs → SSR viewer page
        source: "/:id([A-Za-z0-9_-]{6,10})",
        destination: "/d/:id",
      },
    ];
  },
};

export default nextConfig;
