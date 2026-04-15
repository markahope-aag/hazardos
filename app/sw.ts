import { defaultCache } from '@serwist/next/worker'
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'
import {
  Serwist,
  NetworkFirst,
  CacheFirst,
  StaleWhileRevalidate,
  ExpirationPlugin,
} from 'serwist'

// Bump this string whenever a deploy needs to force all PWA clients off their
// stale runtime caches. The value is compiled into the service worker binary,
// so the browser detects a new SW version and activates it. The activate
// handler below also wipes named runtime caches so clients re-fetch against
// the new deployment instead of serving stale JS/CSS/API responses.
const SW_VERSION = '2026-04-14-force-refresh'

// Runtime cache names that the activate handler clears on each version bump.
// Kept in sync with the runtimeCaching entries below (fonts are intentionally
// excluded — they rarely change and the entries are small).
const RUNTIME_CACHES_TO_CLEAR = [
  'supabase-api',
  'supabase-storage',
  'images',
  'static-resources',
]

// This declares the value of `injectionPoint` to TypeScript.
// At build time, `self.__SW_MANIFEST` is replaced with the actual precache manifest.
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

// Runs on every SW version swap. Drop stale runtime caches so the new build
// isn't serving resources from the previous deploy.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(
        names
          .filter((name) => RUNTIME_CACHES_TO_CLEAR.includes(name))
          .map((name) => caches.delete(name))
      )
      // eslint-disable-next-line no-console
      console.info(`[sw] activated ${SW_VERSION} — cleared runtime caches`)
    })()
  )
})

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Default Next.js caching rules
    ...defaultCache,

    // Cache Supabase API calls with NetworkFirst (short TTL)
    {
      matcher: ({ url }) =>
        url.hostname.includes('supabase.co') &&
        url.pathname.startsWith('/rest/'),
      handler: new NetworkFirst({
        cacheName: 'supabase-api',
        networkTimeoutSeconds: 10,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 100,
            maxAgeSeconds: 5 * 60, // 5 minutes
          }),
        ],
      }),
    },

    // Cache Supabase storage (photos) with CacheFirst
    {
      matcher: ({ url }) =>
        url.hostname.includes('supabase.co') &&
        url.pathname.startsWith('/storage/'),
      handler: new CacheFirst({
        cacheName: 'supabase-storage',
        plugins: [
          new ExpirationPlugin({
            maxEntries: 200,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          }),
        ],
      }),
    },

    // Cache Google Fonts stylesheets
    {
      matcher: ({ url }) => url.hostname === 'fonts.googleapis.com',
      handler: new StaleWhileRevalidate({
        cacheName: 'google-fonts-stylesheets',
        plugins: [
          new ExpirationPlugin({
            maxEntries: 10,
            maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
          }),
        ],
      }),
    },

    // Cache Google Font files
    {
      matcher: ({ url }) => url.hostname === 'fonts.gstatic.com',
      handler: new CacheFirst({
        cacheName: 'google-fonts-webfonts',
        plugins: [
          new ExpirationPlugin({
            maxEntries: 30,
            maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
          }),
        ],
      }),
    },

    // Cache images
    {
      matcher: ({ request }) => request.destination === 'image',
      handler: new CacheFirst({
        cacheName: 'images',
        plugins: [
          new ExpirationPlugin({
            maxEntries: 100,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          }),
        ],
      }),
    },

    // Cache JS/CSS
    {
      matcher: ({ request }) =>
        request.destination === 'script' || request.destination === 'style',
      handler: new StaleWhileRevalidate({
        cacheName: 'static-resources',
        plugins: [
          new ExpirationPlugin({
            maxEntries: 100,
            maxAgeSeconds: 24 * 60 * 60, // 1 day
          }),
        ],
      }),
    },
  ],

  // Fallback for offline navigation
  fallbacks: {
    entries: [
      {
        url: '/offline',
        matcher({ request }) {
          return request.destination === 'document'
        },
      },
    ],
  },
})

serwist.addEventListeners()
