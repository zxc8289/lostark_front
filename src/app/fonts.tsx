import localFont from "next/font/local";

export const pretendard = localFont({
  src: [
    {
      path: "../../public/fonts/Pretendard/web/variable/woff2/PretendardVariable.woff2",
      weight: "45 920",
      style: "normal",
    },
  ],
  display: "swap",
  variable: "--font-pretendard", 
});
