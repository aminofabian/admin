import type { NextConfig } from "next";

const mediaHostPatterns = [
  process.env.NEXT_PUBLIC_MEDIA_BASE_URL,
  process.env.R2_PUBLIC_BASE_URL,
]
  .filter((value): value is string => Boolean(value?.trim()))
  .map((value) => ({ protocol: 'https' as const, hostname: new URL(value.trim()).hostname }));

const nextConfig: NextConfig = {
  outputFileTracingRoot: require('path').join(__dirname),
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cryptoicons.org',
      },
      {
        protocol: 'https',
        hostname: 'cdn.jsdelivr.net',
      },
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'pub-0dd4bbe75add476fa861bf35802ca3db.r2.dev',
      },
      {
        protocol: 'https',
        hostname: 'api.bruii.com',
      },
      {
        protocol: 'https',
        hostname: 'api.serverhub.biz',
      },
      ...mediaHostPatterns,
    ],
  },
};

export default nextConfig;
