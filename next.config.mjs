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
   * CORS Headers Configuration
   *
   * These headers provide a fallback for CORS handling.
   * The primary CORS logic is in middleware.ts and lib/middleware/cors.ts
   *
   * Different policies are applied based on route:
   * - /api/v1/* (Public API): Allows external access with API key auth
   * - /api/webhooks/* (Webhooks): Allows webhook providers
   * - /api/openapi (Docs): Allows public access for documentation tools
   * - /api/* (Internal): Restricted to same origin in production
   */
  async headers() {
    const isDev = process.env.NODE_ENV === 'development';

    return [
      // Public API routes (v1) - allow external access
      {
        source: '/api/v1/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, PATCH, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Authorization, Content-Type, Accept, X-Requested-With, X-Request-ID' },
          { key: 'Access-Control-Expose-Headers', value: 'X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, X-Request-ID' },
          { key: 'Access-Control-Max-Age', value: '86400' },
        ],
      },
      // Webhook endpoints
      {
        source: '/api/webhooks/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Stripe-Signature, X-Twilio-Signature, X-Hub-Signature-256' },
          { key: 'Access-Control-Max-Age', value: '86400' },
        ],
      },
      // OpenAPI documentation
      {
        source: '/api/openapi',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Accept, Content-Type' },
          { key: 'Access-Control-Max-Age', value: '86400' },
        ],
      },
      // Internal API routes - more restrictive in production
      {
        source: '/api/:path((?!v1|webhooks|openapi).*)',
        headers: isDev
          ? [
              // Development: Allow localhost origins
              { key: 'Access-Control-Allow-Origin', value: 'http://localhost:3000' },
              { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, PATCH, DELETE, OPTIONS' },
              { key: 'Access-Control-Allow-Headers', value: 'Authorization, Content-Type, Accept, X-Requested-With, X-Request-ID' },
              { key: 'Access-Control-Allow-Credentials', value: 'true' },
              { key: 'Access-Control-Expose-Headers', value: 'X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, X-Request-ID' },
              { key: 'Access-Control-Max-Age', value: '600' },
              { key: 'Vary', value: 'Origin' },
            ]
          : [
              // Production: Headers set by middleware based on Origin validation
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