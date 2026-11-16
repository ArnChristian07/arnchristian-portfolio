import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  poweredByHeader: false,
  images: {
    // AVIF first (roughly 20% smaller than WebP for the hero art and photos).
    formats: ["image/avif", "image/webp"],
    // Optimized variants are keyed by URL; uploads get new URLs, so cache long.
    minimumCacheTTL: 60 * 60 * 24 * 30,
    // Photos and project covers uploaded from /admin are served by Cloudinary.
    // Limited to this project's cloud so the optimizer can't be used for others.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: process.env.CLOUDINARY_CLOUD_NAME ? `/${process.env.CLOUDINARY_CLOUD_NAME}/**` : "/**",
      },
    ],
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
