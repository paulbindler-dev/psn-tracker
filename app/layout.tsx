import type { Metadata, Viewport } from 'next'
import { DM_Sans } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({ subsets: ['latin'] })

export const viewport: Viewport = {
  themeColor: '#0D1B2A',
}

export const metadata: Metadata = {
  title: 'PSN Tracker',
  description: 'Comparateur PSN FR / KR',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PSN Tracker',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className={dmSans.className}>{children}</body>
    </html>
  )
}
