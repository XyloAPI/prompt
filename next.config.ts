import type { NextConfig } from "next";

// Static export for Cloudflare Pages (free, no Functions, no CPU limits).
// Dynamic/admin behavior lives in workers/mini-api + client-side fetch.
const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
