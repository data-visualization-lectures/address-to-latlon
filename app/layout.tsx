import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "住所 → 緯度経度 変換ツール",
  description: "CSVファイルの住所データを緯度・経度に変換します。日本の住所に特化した高精度なジオコーディング",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50">{children}</body>
    </html>
  )
}
