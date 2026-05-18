const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

// Build-time security gate: fail fast if the dummy admin secret would be bundled
// into a production build. This prevents the secret from ever reaching runtime.
// Fires before any webpack pass so the error surfaces immediately.
if (process.env.NODE_ENV === 'production' && !process.env.HASURA_ADMIN_SECRET) {
  throw new Error(
    '[BUILD GATE FIRED] HASURA_ADMIN_SECRET must be set for production builds. ' +
      'The dummy admin secret cannot be bundled into production. ' +
      'Set HASURA_ADMIN_SECRET in your environment or CI secrets.'
  )
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Disable static export - app uses dynamic features (useSearchParams, etc.)
  // Use standalone for Docker builds without export
  // output: 'standalone',
  // TypeScript strict mode re-enabled for v1.0.9 — pnpm tsc --noEmit returns 0 errors.
  // ESLint re-enabled: all warnings resolved.
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  // isomorphic-dompurify imports jsdom on the server side. jsdom reads its own
  // browser/default-stylesheet.css at module init via readFileSync. When Next.js
  // bundles jsdom for the server, the relative path resolution breaks and the
  // build fails with ENOENT during page data collection for routes that import
  // the message formatter service. Marking jsdom (and its canvas peer) as server
  // externals causes Node.js to load them natively, preserving the correct
  // __dirname-relative path and eliminating the ENOENT entirely.
  serverExternalPackages: ['jsdom', 'canvas'],
  // Webpack externals: belt-and-suspenders approach to guarantee jsdom is never
  // bundled. serverExternalPackages handles most cases; webpack externals handles
  // edge cases in the App Router's isAppLayer bundling path.
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Force jsdom (and its canvas peer) to be loaded natively by Node.js,
      // not bundled by webpack. jsdom's style-rules.js reads
      // browser/default-stylesheet.css via readFileSync at module init using
      // a __dirname-relative path that only resolves correctly when loaded
      // natively from node_modules, not from a webpack chunk.
      const existingExternals = config.externals || []
      const externalsArray = Array.isArray(existingExternals)
        ? existingExternals
        : [existingExternals]
      config.externals = [
        ...externalsArray,
        ({ request }, callback) => {
          if (request === 'jsdom' || request === 'canvas') {
            return callback(null, `commonjs ${request}`)
          }
          return callback()
        },
      ]
    }
    return config
  },
  experimental: {
    // Optimize package imports to reduce bundle size
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-icons',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-dialog',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-avatar',
      '@radix-ui/react-popover',
      '@radix-ui/react-accordion',
      'date-fns',
      'recharts',
      'framer-motion',
    ],
    // instrumentation.js is available by default in Next.js 15+
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    // Tightened allowlist (SEC-T13): removed wildcard '**' hostname.
    // Only allow localhost (dev), the self-hosted MinIO storage endpoint,
    // Nhost storage (default nSelf auth/storage), and known CDN hosts.
    // Operators running custom storage endpoints should set
    // NEXT_PUBLIC_STORAGE_URL and add their hostname here.
    remotePatterns: [
      // Local development — MinIO / direct backend
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'http',
        hostname: 'storage.localhost',
      },
      // Self-hosted nSelf storage (MinIO via nginx, any subdomain of local.nself.org)
      {
        protocol: 'https',
        hostname: '*.local.nself.org',
      },
      // nSelf managed cloud storage
      {
        protocol: 'https',
        hostname: '*.nself.org',
      },
      // Nhost managed storage (default nSelf hosted backend)
      {
        protocol: 'https',
        hostname: '*.nhost.run',
      },
      // User avatars / link unfurl previews — common public CDNs
      {
        protocol: 'https',
        hostname: '*.gravatar.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.jsdelivr.net',
      },
    ],
    minimumCacheTTL: 60,
    // Add image optimization settings
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
    // Enable React compiler optimizations
    reactRemoveProperties:
      process.env.NODE_ENV === 'production' ? { properties: ['^data-testid$'] } : false,
  },
  // Performance optimizations
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,
  // Webpack optimizations (commented out for now - causing build issues)
  // Will re-enable after resolving compatibility issues
  // webpack: (config, { dev, isServer }) => {
  //   if (!dev && !isServer) {
  //     // Client-side production optimizations only
  //   }
  //   return config;
  // },
  async headers() {
    const isDev = process.env.NODE_ENV === 'development'

    // Production-grade Content Security Policy
    // Uses strict CSP with report-uri for monitoring
    const productionCSP = [
      "default-src 'self'",
      "script-src 'self' 'strict-dynamic' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      "media-src 'self' blob: data:",
      "connect-src 'self' https://*.nself.io wss://*.nself.io",
      "frame-src 'self'",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
      "report-uri /api/security/csp-report",
    ].join('; ')

    // Development CSP (more permissive for hot reload, etc.)
    const developmentCSP = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https: http://localhost:* http://storage.localhost",
      "media-src 'self' blob: data:",
      "connect-src 'self' http://localhost:* http://api.localhost http://auth.localhost http://storage.localhost ws://localhost:* wss://*",
      "frame-src 'self' https:",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
    ].join('; ')

    // Permissions Policy - restrict access to sensitive browser features
    // Note: camera/microphone enabled for video/voice calling features
    const permissionsPolicy = [
      'accelerometer=()',
      'ambient-light-sensor=()',
      'autoplay=(self)',
      'battery=()',
      'bluetooth=()',
      'browsing-topics=()',
      'camera=(self)',  // Enabled for video calls
      'display-capture=(self)',  // Enabled for screen sharing
      'document-domain=()',
      'encrypted-media=(self)',
      'fullscreen=(self)',
      'geolocation=()',
      'gyroscope=()',
      'hid=()',
      'idle-detection=()',
      'local-fonts=(self)',
      'magnetometer=()',
      'microphone=(self)',  // Enabled for voice calls
      'midi=()',
      'payment=()',
      'picture-in-picture=(self)',
      'publickey-credentials-create=(self)',
      'publickey-credentials-get=(self)',
      'screen-wake-lock=(self)',
      'serial=()',
      'speaker-selection=(self)',
      'storage-access=(self)',
      'usb=()',
      'web-share=(self)',
      'xr-spatial-tracking=()',
    ].join(', ')

    return [
      // Main application routes
      {
        source: '/:path*',
        headers: [
          // DNS and Transport
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          // HSTS - Strict Transport Security (2 years, include subdomains, preload ready)
          // Only applied in production to avoid issues with local development
          ...(isDev ? [] : [{
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          }]),
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: isDev ? developmentCSP : productionCSP,
          },
          // Frame Options - Prevent clickjacking
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // Content Type Options - Prevent MIME sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Referrer Policy - Control referrer information
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Permissions Policy - Browser feature permissions
          {
            key: 'Permissions-Policy',
            value: permissionsPolicy,
          },
          // Cross-Origin Policies
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'credentialless',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'same-origin',
          },
          // Cross-Domain Policies (Flash/PDF)
          {
            key: 'X-Permitted-Cross-Domain-Policies',
            value: 'none',
          },
          // XSS Protection (legacy, but still useful for older browsers)
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Expect-CT - Certificate Transparency (production only)
          ...(isDev ? [] : [{
            key: 'Expect-CT',
            value: 'max-age=86400, enforce',
          }]),
        ],
      },
      // Static assets - long cache, cross-origin allowed
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'cross-origin',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
      // Next.js static assets
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'cross-origin',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
      // API routes - stricter headers
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
    ]
  },
  async rewrites() {
    return [
      {
        source: '/api/graphql',
        destination: process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://api.localhost/v1/graphql',
      },
    ]
  },
}

module.exports = withBundleAnalyzer(nextConfig)
