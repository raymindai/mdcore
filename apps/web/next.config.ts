import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "officeparser"],
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
