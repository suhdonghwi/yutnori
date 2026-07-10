import type { Metadata } from "next";
import { Geist, Noto_Serif_KR } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const notoSerif = Noto_Serif_KR({ variable: "--font-noto-serif-kr", subsets: ["latin"], weight: ["500", "700", "900"] });

export const metadata: Metadata = {
  title: "한판 윷놀이",
  description: "두 사람이 마주 앉아 즐기는 전통 3D 윷놀이",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "한판 윷놀이",
    description: "두 사람이 마주 앉아 즐기는 전통 3D 윷놀이",
    locale: "ko_KR",
    type: "website",
    images: [{ url: "/og.png", width: 1672, height: 941, alt: "한판 윷놀이 3D 게임판" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "한판 윷놀이",
    description: "두 사람이 마주 앉아 즐기는 전통 3D 윷놀이",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className={`${geist.variable} ${notoSerif.variable}`}>{children}</body>
    </html>
  );
}
