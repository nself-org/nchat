/**
 * Next.js Middleware
 *
 * Handles:
 * 1. Multi-tenant routing (subdomain/custom domain resolution)
 * 2. Authentication and authorization at the edge
 * 3. Security headers
 *
 * This middleware runs before page rendering for protected routes.
 *
 * NOTE: This middleware provides basic route protection. Client-side guards
 * (AuthGuard, RoleGuard, SetupGuard) provide more granular control and
 * better UX with loading states.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  tenantMiddleware,
  getDefaultTenantConfig,
} from "@/lib/tenants/tenant-middleware";

/**
 * Routes that don't require authentication
 */
const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/signup",
  "/auth/signin",
  "/auth/signup",
  "/auth/reset-password",
  "/auth/verify-email",
  "/auth/callback",
];

/**
 * Development-only routes (blocked in production)
 */
const DEV_ONLY_ROUTES = ["/dev"];

/**
 * Routes that require authentication
 */
const PROTECTED_ROUTES = ["/chat", "/settings", "/admin", "/setup"];

/**
 * Routes that require admin role
 */
const ADMIN_ROUTES = ["/admin"];

/**
 * API routes that should bypass middleware
 */
const API_ROUTES = ["/api"];

/**
 * Static assets and Next.js internal routes
 */
const IGNORED_PATHS = ["/_next", "/favicon.ico", "/robots.txt", "/sitemap.xml"];

/**
 * Check if path matches any pattern in the list
 */
function matchesPath(pathname: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    if (pattern.endsWith("*")) {
      return pathname.startsWith(pattern.slice(0, -1));
    }
    return pathname === pattern || pathname.startsWith(`${pattern}/`);
  });
}

/**
 * Check if path is a public route
 */
function isPublicRoute(pathname: string): boolean {
  return matchesPath(pathname, PUBLIC_ROUTES);
}

/**
 * Check if path is a protected route
 */
function isProtectedRoute(pathname: string): boolean {
  return matchesPath(pathname, PROTECTED_ROUTES);
}

/**
 * Check if path is an admin route
 */
function isAdminRoute(pathname: string): boolean {
  return matchesPath(pathname, ADMIN_ROUTES);
}

/**
 * Check if path should be ignored by middleware
 */
function shouldIgnore(pathname: string): boolean {
  return (
    matchesPath(pathname, IGNORED_PATHS) || matchesPath(pathname, API_ROUTES)
  );
}

/**
 * Check if path is a development-only route
 */
function isDevOnlyRoute(pathname: string): boolean {
  return matchesPath(pathname, DEV_ONLY_ROUTES);
}

/**
 * Get session token from cookies
 */
function getSessionToken(request: NextRequest): string | null {
  // Check for session cookie (name from auth.config.ts)
  const sessionCookie = request.cookies.get("nchat-session");
  if (sessionCookie?.value) {
    return sessionCookie.value;
  }

  // Also check for Nhost session (for production auth)
  const nhostSession = request.cookies.get("nhostSession");
  if (nhostSession?.value) {
    return nhostSession.value;
  }

  // Check for dev auth session
  const devSession = request.cookies.get("nchat-dev-session");
  if (devSession?.value) {
    return devSession.value;
  }

  return null;
}

/**
 * Parse session to get user info
 * NOTE: In production, you'd verify the JWT here
 */
function parseSession(token: string): { userId: string; role: string } | null {
  try {
    // For dev auth, session might be a simple JSON
    const parsed = JSON.parse(token);
    if (parsed.userId && parsed.role) {
      return { userId: parsed.userId, role: parsed.role };
    }

    // For JWT tokens, decode and verify
    // NOTE: Full JWT verification should happen server-side
    // Middleware just does basic checks
    const parts = token.split(".");
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]));
      if (payload.sub || payload.userId) {
        return {
          userId: payload.sub || payload.userId,
          role: payload["x-hasura-default-role"] || payload.role || "member",
        };
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Check if user has admin role
 */
function isAdminRole(role: string): boolean {
  return ["owner", "admin"].includes(role);
}

/**
 * Generate a random nonce for CSP
 */
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Buffer.from(array).toString("base64");
}

/**
 * Get Content Security Policy header value
 */
function getCSP(nonce: string, isDev: boolean): string {
  const cspDirectives = [
    `default-src 'self'`,
    `script-src 'self' ${isDev ? "'unsafe-eval'" : ""} 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'unsafe-inline'`, // Tailwind requires unsafe-inline
    `img-src 'self' data: blob: https:`,
    `font-src 'self' data:`,
    `connect-src 'self' ${isDev ? "ws: wss:" : "wss:"} ${process.env.NEXT_PUBLIC_GRAPHQL_URL || "http://api.localhost"} ${process.env.NEXT_PUBLIC_AUTH_URL || "http://auth.localhost"}`,
    `media-src 'self' blob:`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
    isDev ? "" : `report-uri /api/csp-report`,
  ];

  return cspDirectives.filter(Boolean).join("; ");
}

/**
 * Add security headers to response
 */
function addSecurityHeaders(
  response: NextResponse,
  isDev: boolean,
): NextResponse {
  const nonce = generateNonce();

  // Content Security Policy
  response.headers.set("Content-Security-Policy", getCSP(nonce, isDev));

  // Additional security headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-DNS-Prefetch-Control", "on");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );

  // Strict-Transport-Security (only in production with HTTPS)
  if (!isDev) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }

  // Store nonce in header for use by scripts
  response.headers.set("X-Nonce", nonce);

  return response;
}

/**
 * Main middleware function
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for ignored paths
  if (shouldIgnore(pathname)) {
    return NextResponse.next();
  }

  // In development mode with dev auth enabled, be more permissive
  // Client-side guards will handle the actual protection
  const isDev = process.env.NODE_ENV === "development";
  const useDevAuth = process.env.NEXT_PUBLIC_USE_DEV_AUTH === "true";

  // Block /dev/* routes in production
  // These are developer documentation pages that should not be exposed
  if (isDevOnlyRoute(pathname) && !isDev) {
    // Return 404 in production for dev routes
    return NextResponse.rewrite(new URL("/404", request.url));
  }

  // 1. MULTI-TENANT ROUTING (if enabled)
  const enableMultiTenancy = process.env.ENABLE_MULTI_TENANCY === "true";

  if (enableMultiTenancy) {
    const tenantConfig = getDefaultTenantConfig();
    const tenantResponse = await tenantMiddleware(request, tenantConfig);

    // If tenant middleware returned a redirect, rewrite, or error, return it with security headers
    if (tenantResponse.status !== 200) {
      return addSecurityHeaders(tenantResponse, isDev);
    }

    // For successful tenant resolution, tenantMiddleware returns NextResponse.next({ request: modifiedRequest })
    // which already has the tenant context headers. Apply security headers and return.
    // Note: In multi-tenant mode, we rely on client-side guards for auth since
    // the tenant middleware already handles request modification internally.
    return addSecurityHeaders(tenantResponse, isDev);
  }

  if (isDev && useDevAuth) {
    // In dev mode, let client-side guards handle everything
    // This allows the auto-login feature to work properly
    const response = NextResponse.next();
    return addSecurityHeaders(response, isDev);
  }

  // Get session
  const sessionToken = getSessionToken(request);
  const session = sessionToken ? parseSession(sessionToken) : null;
  const isAuthenticated = !!session;

  // Handle public routes (login, signup)
  if (isPublicRoute(pathname)) {
    // If authenticated and trying to access login/signup, redirect to chat
    if (
      isAuthenticated &&
      (pathname === "/login" ||
        pathname === "/signup" ||
        pathname === "/auth/signin" ||
        pathname === "/auth/signup")
    ) {
      const response = NextResponse.redirect(new URL("/chat", request.url));
      return addSecurityHeaders(response, isDev);
    }
    const response = NextResponse.next();
    return addSecurityHeaders(response, isDev);
  }

  // Handle protected routes
  if (isProtectedRoute(pathname)) {
    // If not authenticated, redirect to login
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("returnTo", pathname);
      const response = NextResponse.redirect(loginUrl);
      return addSecurityHeaders(response, isDev);
    }

    // Check admin routes
    if (isAdminRoute(pathname) && session) {
      if (!isAdminRole(session.role)) {
        // Not authorized for admin routes - redirect to chat with error
        const chatUrl = new URL("/chat", request.url);
        chatUrl.searchParams.set("error", "unauthorized");
        const response = NextResponse.redirect(chatUrl);
        return addSecurityHeaders(response, isDev);
      }
    }

    // User is authenticated and authorized
    const response = NextResponse.next();
    return addSecurityHeaders(response, isDev);
  }

  // For all other routes, proceed
  const response = NextResponse.next();
  return addSecurityHeaders(response, isDev);
}

/**
 * Configure which routes middleware runs on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
