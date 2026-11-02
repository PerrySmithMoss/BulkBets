import type { NextConfig } from "next";
import { getApiOrigin } from "./src/lib/api/origin";

const nextConfig: NextConfig = {
  ...(process.env.VERCEL === "1" ? {} : { output: "standalone" as const }),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store" },
          { key: "Vercel-CDN-Cache-Control", value: "no-store" },
          { key: "x-vercel-enable-rewrite-caching", value: "0" },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        // Keep browser API calls on the same origin, including auth cookies.
        source: "/api/:path*",
        destination: `${getApiOrigin()}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
