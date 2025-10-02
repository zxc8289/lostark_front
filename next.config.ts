// next.config.ts
import type { NextConfig } from 'next';

const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  ...(isProd ? { output: 'export', trailingSlash: true } : {}),

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.discordapp.com', pathname: '/avatars/**' },
    ],
  },
};

export default nextConfig;
