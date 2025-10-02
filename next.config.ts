// next.config.ts

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.discordapp.com',
        port: '',
        pathname: '/avatars/**',
      },
    ],
  },
};

export default {
  output: 'export',          // 중요: 정적 export
  images: { unoptimized: true }, // GitHub Pages에서 이미지 최적화 비활성화
  trailingSlash: true,       // 폴더형 index.html 생성 -> 딥링크 404 방지에 유리
  // 사용자/조직 페이지가 아니라 "프로젝트 페이지"라면 아래 두 줄을 켜세요:
  // basePath: isProd ? `/${repo}` : '',
  // assetPrefix: isProd ? `/${repo}/` : '',
}