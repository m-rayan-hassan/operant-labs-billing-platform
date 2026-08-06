import type { NextConfig } from "next";

const API_UPSTREAM = process.env.API_UPSTREAM || "http://localhost:8008";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_UPSTREAM}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
