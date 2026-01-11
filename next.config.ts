import type { NextConfig } from "next";

// Bundle Analyzer - hanya aktif saat ANALYZE=true
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Performance: Compress responses
  compress: true,
  // Performance: Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
  // Performance: Headers for caching
  headers: async () => [
    {
      source: '/:all*(svg|jpg|png|webp|avif)',
      locale: false,
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    },
    {
      source: '/_next/static/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    },
  ],
  // Performance: Experimental optimizations
  experimental: {
    optimizeCss: true,
  },
};

export default withBundleAnalyzer(nextConfig);
