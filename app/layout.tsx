import type { Metadata } from 'next'
import { Inter, Geist_Mono } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import QueryProvider from '@/components/providers/query-provider'
import AnalyticsProvider from '@/components/providers/analytics-provider'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter'
})

const geistMono = Geist_Mono({ 
  subsets: ['latin'],
  variable: '--font-geist-mono'
})

export const metadata: Metadata = {
  title: 'HazardOS - Environmental Remediation Management',
  description: 'The Operating System for Hazardous Materials Companies',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'HazardOS',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#FF6B35',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/png" sizes="32x32" href="/logos/favicon-32.png" />
        <link rel="shortcut icon" href="/logos/favicon-32.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/logos/icon-192-color.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/logos/icon-192-color.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/logos/icon-512-color.png" />
      </head>
      <body className={`${inter.variable} ${geistMono.variable} font-sans`}>
        <QueryProvider>
          <AnalyticsProvider>
            {children}
            <Toaster />
          </AnalyticsProvider>
        </QueryProvider>
      </body>
    </html>
  )
}