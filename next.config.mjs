import withPWA from 'next-pwa';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'inzwwbbbdookxkkotbxj.supabase.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  turbopack: {},

  /**
   * Security and CORS Headers Configuration
   *
   * This configuration implements comprehensive security headers following OWASP recommendations:
   * - Content-Security-Policy (CSP) - Prevents XSS and controls resource loading
   * - X-Frame-Options - Prevents clickjacking attacks
   * - X-Content-Type-Options - Prevents MIME sniffing attacks
   * - Referrer-Policy - Controls referrer information leakage
   * - X-XSS-Protection - Legacy XSS protection for older browsers
   * - Strict-Transport-Security (HSTS) - Enforces HTTPS connections
   * - Permissions-Policy - Controls browser feature access
   * - X-DNS-Prefetch-Control - Controls DNS prefetching behavior
   *
   * CORS policies are also applied based on route:
   * - /api/v1/* (Public API): Allows external access with API key auth
   * - /api/webhooks/* (Webhooks): Allows webhook providers
   * - /api/openapi (Docs): Allows public access for documentation tools
   * - /api/* (Internal): Restricted to same origin in production
   */
  async headers() {
    const isDev = process.env.NODE_ENV === 'development';

    /**
     * Content-Security-Policy Configuration
     *
     * This CSP is carefully crafted to:
     * 1. Allow Next.js to function properly (inline scripts/styles for hydration)
     * 2. Allow Supabase connections for database and auth
     * 3. Allow Stripe.js for payment processing
     * 4. Allow Google Fonts loaded via next/font
     * 5. Block all other potentially malicious sources
     *
     * Development mode is more permissive to allow hot reload and dev tools.
     * Production mode is strict and uses 'unsafe-inline' only where necessary.
     */
    const cspDirectives = {
      // Default fallback - restrict to self
      'default-src': ["'self'"],

      // Scripts - allow self, and unsafe-inline/eval for Next.js hydration
      // In production, Next.js requires these for client-side rendering
      'script-src': isDev
        ? ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://js.stripe.com']
        : ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://js.stripe.com'],

      // Styles - allow self and unsafe-inline for Next.js styled-jsx and Tailwind
      'style-src': ["'self'", "'unsafe-inline'"],

      // Images - allow self, data URIs, blobs, Supabase storage, and HTTPS
      'img-src': ["'self'", 'data:', 'blob:', 'https://*.supabase.co', 'https:'],

      // Fonts - allow self and data URIs (for inline fonts)
      'font-src': ["'self'", 'data:'],

      // Connect (fetch, XHR, WebSocket) - allow self, Supabase, and Stripe
      'connect-src': isDev
        ? [
            "'self'",
            'https://*.supabase.co',
            'wss://*.supabase.co',
            'https://api.stripe.com',
            'https://api.openai.com',
            'https://api.anthropic.com',
            'ws://localhost:*',
            'http://localhost:*',
          ]
        : [
            "'self'",
            'https://*.supabase.co',
            'wss://*.supabase.co',
            'https://api.stripe.com',
            'https://api.openai.com',
            'https://api.anthropic.com',
          ],

      // Frames - allow self and Stripe for checkout
      'frame-src': ["'self'", 'https://js.stripe.com', 'https://hooks.stripe.com'],

      // Prevent framing by others (X-Frame-Options handles this but CSP is more flexible)
      'frame-ancestors': ["'self'"],

      // Form actions - only allow self
      'form-action': ["'self'"],

      // Base URI - only allow self to prevent base tag hijacking
      'base-uri': ["'self'"],

      // Object/plugin sources - block all plugins (Flash, Java, etc.)
      'object-src': ["'none'"],

      // Manifest - allow self for PWA manifest
      'manifest-src': ["'self'"],

      // Worker sources - allow self for service workers (PWA)
      'worker-src': ["'self'", 'blob:'],

      // Media sources - allow self, Supabase storage, and blobs
      'media-src': ["'self'", 'https://*.supabase.co', 'blob:'],

      // Upgrade insecure requests in production
      ...(isDev ? {} : { 'upgrade-insecure-requests': [] }),
    };

    // Build CSP header value
    const cspValue = Object.entries(cspDirectives)
      .map(([directive, sources]) => {
        if (sources.length === 0) {
          return directive;
        }
        return `${directive} ${sources.join(' ')}`;
      })
      .join('; ');

    /**
     * Security Headers (applied to all routes)
     * Following OWASP recommendations and modern browser security standards
     */
    const securityHeaders = [
      // Content-Security-Policy - Primary defense against XSS
      {
        key: 'Content-Security-Policy',
        value: cspValue,
      },

      // X-Frame-Options - Prevent clickjacking (SAMEORIGIN allows same-origin framing)
      // Note: frame-ancestors in CSP is preferred but X-Frame-Options provides fallback
      {
        key: 'X-Frame-Options',
        value: 'SAMEORIGIN',
      },

      // X-Content-Type-Options - Prevent MIME sniffing attacks
      // Forces browsers to respect Content-Type header
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },

      // Referrer-Policy - Control referrer information leakage
      // 'strict-origin-when-cross-origin' sends origin for cross-origin, full for same-origin
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
      },

      // X-XSS-Protection - Legacy XSS protection for older browsers
      // Modern browsers use CSP, but this provides fallback
      {
        key: 'X-XSS-Protection',
        value: '1; mode=block',
      },

      // Strict-Transport-Security (HSTS) - Enforce HTTPS
      // max-age=2 years, includeSubDomains, preload-ready
      // Only apply in production to avoid issues with local development
      ...(isDev
        ? []
        : [
            {
              key: 'Strict-Transport-Security',
              value: 'max-age=63072000; includeSubDomains; preload',
            },
          ]),

      // Permissions-Policy - Control browser features
      // Disable dangerous features, allow camera/microphone/geolocation with consent
      {
        key: 'Permissions-Policy',
        value: [
          'accelerometer=()',
          'autoplay=()',
          'camera=(self)',
          'cross-origin-isolated=()',
          'display-capture=()',
          'encrypted-media=()',
          'fullscreen=(self)',
          'geolocation=(self)',
          'gyroscope=()',
          'keyboard-map=()',
          'magnetometer=()',
          'microphone=(self)',
          'midi=()',
          'payment=(self)',
          'picture-in-picture=()',
          'publickey-credentials-get=()',
          'screen-wake-lock=()',
          'sync-xhr=(self)',
          'usb=()',
          'xr-spatial-tracking=()',
        ].join(', '),
      },

      // X-DNS-Prefetch-Control - Control DNS prefetching
      // 'on' enables prefetching for faster navigation
      {
        key: 'X-DNS-Prefetch-Control',
        value: 'on',
      },
    ];

    /**
     * API-specific security headers
     * API routes have slightly different CSP needs (no frames, stricter sources)
     */
    const apiCspDirectives = {
      'default-src': ["'none'"],
      'script-src': ["'none'"],
      'style-src': ["'none'"],
      'img-src': ["'none'"],
      'font-src': ["'none'"],
      'connect-src': ["'self'"],
      'frame-src': ["'none'"],
      'frame-ancestors': ["'none'"],
      'form-action': ["'none'"],
      'base-uri': ["'none'"],
      'object-src': ["'none'"],
    };

    const apiCspValue = Object.entries(apiCspDirectives)
      .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
      .join('; ');

    const apiSecurityHeaders = [
      { key: 'Content-Security-Policy', value: apiCspValue },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'X-XSS-Protection', value: '1; mode=block' },
      ...(isDev ? [] : [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]),
      { key: 'Permissions-Policy', value: 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()' },
      { key: 'X-DNS-Prefetch-Control', value: 'off' },
      // Cache-Control for API responses (no caching by default)
      { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
      { key: 'Pragma', value: 'no-cache' },
      { key: 'Expires', value: '0' },
    ];

    return [
      // Apply security headers to all non-API routes
      {
        source: '/((?!api).*)',
        headers: securityHeaders,
      },

      // Public API routes (v1) - security headers + allow external access
      {
        source: '/api/v1/:path*',
        headers: [
          ...apiSecurityHeaders,
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, PATCH, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Authorization, Content-Type, Accept, X-Requested-With, X-Request-ID' },
          { key: 'Access-Control-Expose-Headers', value: 'X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, X-Request-ID' },
          { key: 'Access-Control-Max-Age', value: '86400' },
        ],
      },

      // Webhook endpoints - security headers + allow webhook providers
      {
        source: '/api/webhooks/:path*',
        headers: [
          ...apiSecurityHeaders,
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Stripe-Signature, X-Twilio-Signature, X-Hub-Signature-256' },
          { key: 'Access-Control-Max-Age', value: '86400' },
        ],
      },

      // OpenAPI documentation - security headers + public access
      {
        source: '/api/openapi',
        headers: [
          ...apiSecurityHeaders,
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Accept, Content-Type' },
          { key: 'Access-Control-Max-Age', value: '86400' },
        ],
      },

      // Internal API routes - security headers + restrictive CORS in production
      {
        source: '/api/:path((?!v1|webhooks|openapi).*)',
        headers: isDev
          ? [
              ...apiSecurityHeaders,
              { key: 'Access-Control-Allow-Origin', value: 'http://localhost:3000' },
              { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, PATCH, DELETE, OPTIONS' },
              { key: 'Access-Control-Allow-Headers', value: 'Authorization, Content-Type, Accept, X-Requested-With, X-Request-ID' },
              { key: 'Access-Control-Allow-Credentials', value: 'true' },
              { key: 'Access-Control-Expose-Headers', value: 'X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, X-Request-ID' },
              { key: 'Access-Control-Max-Age', value: '600' },
              { key: 'Vary', value: 'Origin' },
            ]
          : [
              ...apiSecurityHeaders,
              { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, PATCH, DELETE, OPTIONS' },
              { key: 'Access-Control-Allow-Headers', value: 'Authorization, Content-Type, Accept, X-Requested-With, X-Request-ID' },
              { key: 'Access-Control-Allow-Credentials', value: 'true' },
              { key: 'Access-Control-Expose-Headers', value: 'X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, X-Request-ID' },
              { key: 'Access-Control-Max-Age', value: '600' },
              { key: 'Vary', value: 'Origin' },
            ],
      },
    ];
  },
};

export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})(nextConfig);