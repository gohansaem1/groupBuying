import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'

export const metadata: Metadata = {
  title: '제주 공동구매',
  description: '제주 공동구매 플랫폼',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>
        <Script
          src="https://developers.kakao.com/sdk/js/kakao.js"
          strategy="afterInteractive"
        />
        {children}
      </body>
    </html>
  )
}

