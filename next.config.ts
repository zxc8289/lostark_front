import type { NextConfig } from 'next';

const isProd = process.env.NODE_ENV === 'production';
const repo = 'lostark_front';

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,


};

export default nextConfig;
