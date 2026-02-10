// Bundle analyzer for monitoring bundle size
// Run with: ANALYZE=true pnpm build
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export for S3 hosting
  output: 'export',

  // Image optimization (handled externally via Sharp/Lambda)
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'media.pitfal.solutions',
        pathname: '/**',
      },
    ],
  },

  // Trailing slashes for S3 compatibility
  trailingSlash: true,

  // Environment variables exposed to browser
  env: {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'https://www.pitfal.solutions',
    NEXT_PUBLIC_MEDIA_URL: process.env.NEXT_PUBLIC_MEDIA_URL || 'https://media.pitfal.solutions',
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://www.pitfal.solutions/api',
  },

  // Strict mode for development
  reactStrictMode: true,

  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Handle SVG imports
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });

    return config;
  },

  // NOTE: Security headers are configured in CloudFront response headers policy
  // (infrastructure/terraform/cloudfront.tf) since output: 'export' generates
  // static files. Next.js headers() and redirects() only work with a server.
};

module.exports = withBundleAnalyzer(nextConfig);
