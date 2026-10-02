import type { NextConfig } from "next";

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
    ],
  },
};

export default nextConfig;
