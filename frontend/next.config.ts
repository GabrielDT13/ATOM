import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1"],
  turbopack: {
    root: process.cwd(),
  },
  async rewrites() {
    return [
      {
        source: "/backend-api/:path*",
        destination: `${
          process.env.BACKEND_INTERNAL_URL ?? "http://atom-backend:8000"
        }/:path*`,
      },
    ];
  },
};

export default nextConfig;
