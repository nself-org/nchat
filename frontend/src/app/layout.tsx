import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";
import { AppProviders } from "@/providers";
import { WebVitalsWrapper } from "@/components/performance/web-vitals-wrapper";

// Initialize Sentry client-side monitoring
import "@/sentry.client.config";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

// =============================================================================
// Metadata
// =============================================================================

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "nChat";
const APP_DESCRIPTION =
  process.env.NEXT_PUBLIC_APP_TAGLINE || "Modern team communication platform";

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  keywords: [
    "chat",
    "team",
    "communication",
    "collaboration",
    "messaging",
    "slack alternative",
  ],
  authors: [{ name: "nself", url: "https://nself.io" }],
  creator: "nself",
  publisher: "nself",
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/icons/icon-192.png", sizes: "192x192" },
      { url: "/icons/icon-152.png", sizes: "152x152" },
      { url: "/icons/icon-144.png", sizes: "144x144" },
    ],
    other: [
      {
        rel: "mask-icon",
        url: "/icons/maskable-icon.png",
      },
    ],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: APP_NAME,
    title: APP_NAME,
    description: APP_DESCRIPTION,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: `${APP_NAME} - Team Communication Platform`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: APP_NAME,
    description: APP_DESCRIPTION,
    images: ["/og-image.png"],
    creator: "@nself_io",
  },
  robots: {
    index: true,
    follow: true,
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "msapplication-TileColor": "#6366f1",
    "msapplication-tap-highlight": "no",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#18181b" },
  ],
};

// =============================================================================
// Root Layout
// =============================================================================

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <head>
        {/* PWA primary color */}
        <meta name="theme-color" content="#6366f1" />

        {/* Accessibility: Prefers reduced motion */}
        <meta name="color-scheme" content="light dark" />

        {/* Preconnect to external services */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />

        {/* DNS prefetch for API endpoints — only rendered when the env var is set
            so we never emit an empty href="" which violates WCAG (axe: empty-href) */}
        {process.env.NEXT_PUBLIC_GRAPHQL_URL && (
          <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_GRAPHQL_URL} />
        )}
        {process.env.NEXT_PUBLIC_AUTH_URL && (
          <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_AUTH_URL} />
        )}

        {/* iOS splash screens - generated for common device sizes */}
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-2048-2732.png"
          media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-1668-2388.png"
          media="(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-1536-2048.png"
          media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-1290-2796.png"
          media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-1179-2556.png"
          media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-1170-2532.png"
          media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-1125-2436.png"
          media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-1242-2688.png"
          media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-828-1792.png"
          media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-750-1334.png"
          media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-640-1136.png"
          media="(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        />
      </head>
      <body
        className={` ${inter.className} selection:bg-primary/20 min-h-screen bg-background text-foreground antialiased selection:text-primary`}
      >
        {/* Skip to main content link for screen readers */}
        <a
          href="#main-content"
          className="focus:text-primary-foreground sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[9999] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          Skip to main content
        </a>

        {/* Performance monitoring */}
        <WebVitalsWrapper
          enabled={true}
          providers={
            process.env.NODE_ENV === "production" ? ["sentry"] : ["console"]
          }
          sampleRate={1.0}
          debug={process.env.NODE_ENV === "development"}
        />

        {/* Main app with all providers */}
        <AppProviders>
          {/* Main content area */}
          <main
            id="main-content"
            tabIndex={-1}
            className="min-h-screen outline-none focus:outline-none"
          >
            {children}
          </main>
        </AppProviders>

        {/* Portal root for modals */}
        <div id="modal-root" />

        {/* Portal root for tooltips */}
        <div id="tooltip-root" />

        {/* Portal root for context menus */}
        <div id="context-menu-root" />
      </body>
    </html>
  );
}
