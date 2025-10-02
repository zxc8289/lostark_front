import type { NextConfig } from 'next';

const isProd = process.env.NODE_ENV === 'production';
const repo = 'lostark_front';

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,


  basePath: isProd ? `/${repo}` : undefined,
  assetPrefix: isProd ? `/${repo}/` : undefined,

  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.discordapp.com',
        pathname: '/avatars/**',
      },
    ],
  },
};

export default nextConfig;
