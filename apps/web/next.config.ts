import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack(config) {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
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
