import type { Metadata } from "next"
import Script from "next/script"
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
      <head>
        {/* Google Analytics */}
        <Script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-1W481Z4L80"
          strategy="afterInteractive"
        />
        <Script
          id="google-analytics"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-1W481Z4L80');
            `,
          }}
        />
        {/* Supabase & Auth */}
        <Script
          src="https://auth.dataviz.jp/lib/supabase.js"
          strategy="beforeInteractive"
        />
        <Script
          src="https://auth.dataviz.jp/lib/dataviz-auth-client.js"
          strategy="afterInteractive"
        />
      </head>
      <body className="bg-gray-50">{children}</body>
    </html>
  )
}
