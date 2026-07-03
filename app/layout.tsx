import type { Metadata } from 'next'
import { Inter, Geist_Mono } from 'next/font/google'
import './globals.css'
import { SerwistProvider } from '@serwist/next/react'
import { Toaster } from '@/components/ui/toaster'
import QueryProvider from '@/components/providers/query-provider'
import AnalyticsProvider from '@/components/providers/analytics-provider'

// The service worker is built to /sw.js by withSerwist (next.config.mjs) but
// v9 no longer auto-registers it — the app must mount SerwistProvider to call
// register() client-side. Without this, no SW installs, so runtime caching and
// offline navigation (resume a survey after a hard refresh with no network)
// never work. `disable` mirrors the build's dev disable: no sw.js is emitted in
// development, so attempting to register would just 404.
const isSwDisabled = process.env.NODE_ENV === 'development'

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
    startupImage: '/logos/icon-512-color.png',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  // Allow zoom for accessibility (low-vision users need to be able to zoom)
  userScalable: true,
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
        {/* SVG first so modern browsers use the crisp vector; PNG
            fallbacks cover older browsers and specific size requests. */}
        <link rel="icon" type="image/svg+xml" href="/logos/favicon-32.svg" />
        <link rel="icon" type="image/png" sizes="32x32" href="/logos/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/logos/favicon-16.png" />
        <link rel="shortcut icon" href="/logos/favicon-32.png" />
        {/* iOS home-screen icon. We ship icon-192-color, which iOS
            happily scales to whatever size the home screen needs. No
            180×180 master in the brand drop. */}
        <link rel="apple-touch-icon" sizes="192x192" href="/logos/icon-192-color.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/logos/icon-192-color.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/logos/icon-512-color.png" />
      </head>
      <body className={`${inter.variable} ${geistMono.variable} font-sans`}>
        <SerwistProvider swUrl="/sw.js" disable={isSwDisabled}>
          <QueryProvider>
            <AnalyticsProvider>
              {children}
              <Toaster />
            </AnalyticsProvider>
          </QueryProvider>
        </SerwistProvider>
      </body>
    </html>
  )
}