import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@libsql/client", "@libsql/isomorphic-ws"],
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "*.workers.dev" },
      { protocol: "https", hostname: "*.r2.cloudflarestorage.com" },
      { protocol: "https", hostname: "filegarden.com" },
      { protocol: "https", hostname: "*.filegarden.com" },
      { protocol: "https", hostname: "file.garden" },
      { protocol: "https", hostname: "*.file.garden" },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
});
