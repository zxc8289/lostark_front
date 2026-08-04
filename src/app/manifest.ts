import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "로아체크",
    short_name: "로아체크",
    description:
      "로스트아크 숙제 관리, 레이드 수익 계산, 딜 지분 분석, 젬 세팅 계산 도구",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#1B1D22",
    theme_color: "#1B1D22",
    orientation: "portrait-primary",
    lang: "ko-KR",
    categories: ["games", "utilities", "productivity"],
    icons: [
      {
        src: "/icons/pwa/loacheck-circle-v3-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/pwa/loacheck-circle-v3-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
