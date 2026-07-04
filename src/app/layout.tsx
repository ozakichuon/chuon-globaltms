import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "中温タレントマネジメント",
  description:
    "株式会社中温の従業員DB・在留資格ダッシュボード・キャリアパス可視化システム",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
