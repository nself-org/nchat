/**
 * Tenant Middleware
 *
 * Extracts tenant context from subdomain or custom domain.
 * Runs before request processing to ensure tenant isolation.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { TenantContext, Tenant } from "./types";

import { logger } from "@/lib/logger";

/**
 * Configuration for multi-tenant routing
 */
export interface TenantMiddlewareConfig {
  baseDomain: string; // e.g., 'nchat.app' or 'localhost:3000'
  allowedDomains?: string[]; // Whitelist of custom domains
  enableCustomDomains: boolean;
  disableMultiTenancy?: boolean; // For single-tenant mode
  defaultTenant?: string; // Default tenant slug for single-tenant mode
}

/**
 * Parse tenant from hostname
 */
export function parseTenantFromHostname(
  hostname: string,
  config: TenantMiddlewareConfig,
): { subdomain: string | null; isCustomDomain: boolean } {
  // Remove port if present
  const hostnameWithoutPort = hostname.split(":")[0];

  // Check if it's a custom domain (not a subdomain of baseDomain)
  if (config.enableCustomDomains && config.allowedDomains) {
    if (config.allowedDomains.includes(hostnameWithoutPort)) {
      return {
        subdomain: null,
        isCustomDomain: true,
      };
    }
  }

  // Check if it's a subdomain
  const baseDomainWithoutPort = config.baseDomain.split(":")[0];

  // Handle localhost and IP addresses
  if (
    hostnameWithoutPort === "localhost" ||
    hostnameWithoutPort.match(/^\d+\.\d+\.\d+\.\d+$/)
  ) {
    // In development, use default tenant or extract from path
    return {
      subdomain: config.defaultTenant || null,
      isCustomDomain: false,
    };
  }

  // Extract subdomain from hostname
  // e.g., 'acme.nchat.app' -> 'acme'
  if (hostnameWithoutPort.endsWith(`.${baseDomainWithoutPort}`)) {
    const subdomain = hostnameWithoutPort.replace(
      `.${baseDomainWithoutPort}`,
      "",
    );

    // Ignore 'www' subdomain
    if (subdomain === "www") {
      return { subdomain: null, isCustomDomain: false };
    }

    return { subdomain, isCustomDomain: false };
  }

  // No tenant found
  return { subdomain: null, isCustomDomain: false };
}

/**
 * Fetch tenant by subdomain or custom domain
 */
export async function fetchTenant(
  subdomain: string | null,
  hostname: string,
  isCustomDomain: boolean,
): Promise<Tenant | null> {
  try {
    // In a real implementation, this would query the database
    // For now, we'll use an API route to fetch tenant info

    const endpoint = isCustomDomain
      ? `/api/tenants/by-domain?domain=${encodeURIComponent(hostname)}`
      : `/api/tenants/by-slug?slug=${encodeURIComponent(subdomain || "")}`;

    // Use internal API call (server-side)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}${endpoint}`, {
      headers: {
        "X-Internal-Request": "true",
      },
    });

    if (!response.ok) {
      return null;
    }

    const tenant = await response.json();
    return tenant;
  } catch (error) {
    logger.error("Error fetching tenant:", error);
    return null;
  }
}

/**
 * Build tenant context
 */
export function buildTenantContext(
  tenant: Tenant,
  subdomain: string,
  isCustomDomain: boolean,
): TenantContext {
  return {
    tenant,
    subdomain,
    isCustomDomain,
    schemaName: tenant.schemaName,
  };
}

/**
 * Store tenant context in request headers
 */
export function storeTenantContext(
  request: NextRequest,
  context: TenantContext,
): NextRequest {
  const requestHeaders = new Headers(request.headers);

  // Store tenant context as headers for API routes
  requestHeaders.set("X-Tenant-Id", context.tenant.id);
  requestHeaders.set("X-Tenant-Slug", context.tenant.slug);
  requestHeaders.set("X-Tenant-Schema", context.schemaName);
  requestHeaders.set(
    "X-Tenant-Context",
    JSON.stringify({
      id: context.tenant.id,
      slug: context.tenant.slug,
      name: context.tenant.name,
      schemaName: context.schemaName,
      status: context.tenant.status,
      plan: context.tenant.billing.plan,
    }),
  );

  return request;
}

/**
 * Main tenant middleware function
 */
export async function tenantMiddleware(
  request: NextRequest,
  config: TenantMiddlewareConfig,
): Promise<NextResponse> {
  // Skip tenant resolution for public routes
  const { pathname } = request.nextUrl;

  // List of routes that don't require tenant context
  const publicRoutes = [
    "/api/health",
    "/api/tenants/create",
    "/_next",
    "/favicon.ico",
    "/robots.txt",
    "/sitemap.xml",
  ];

  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // If multi-tenancy is disabled, use default tenant
  if (config.disableMultiTenancy && config.defaultTenant) {
    // Fetch default tenant and continue
    const tenant = await fetchTenant(config.defaultTenant, "", false);

    if (!tenant) {
      return NextResponse.json(
        { error: "Default tenant not found" },
        { status: 500 },
      );
    }

    const context = buildTenantContext(tenant, config.defaultTenant, false);
    const modifiedRequest = storeTenantContext(request, context);

    return NextResponse.next({
      request: modifiedRequest,
    });
  }

  // Parse tenant from hostname
  const hostname = request.headers.get("host") || "";
  const { subdomain, isCustomDomain } = parseTenantFromHostname(
    hostname,
    config,
  );

  // No tenant found - redirect to tenant selection or creation
  if (!subdomain && !isCustomDomain) {
    // Redirect to main landing page or tenant creation
    const mainUrl = new URL(`/select-tenant`, `https://${config.baseDomain}`);
    return NextResponse.redirect(mainUrl);
  }

  // Fetch tenant data
  const tenant = await fetchTenant(subdomain, hostname, isCustomDomain);

  if (!tenant) {
    // Tenant not found - show error page
    return NextResponse.rewrite(new URL("/tenant-not-found", request.url));
  }

  // Check tenant status
  if (tenant.status === "suspended") {
    return NextResponse.rewrite(new URL("/tenant-suspended", request.url));
  }

  if (tenant.status === "cancelled") {
    return NextResponse.rewrite(new URL("/tenant-cancelled", request.url));
  }

  // Check trial expiration
  if (
    tenant.status === "trial" &&
    tenant.trialEndsAt &&
    new Date(tenant.trialEndsAt) < new Date()
  ) {
    return NextResponse.rewrite(new URL("/trial-expired", request.url));
  }

  // Build tenant context
  const context = buildTenantContext(
    tenant,
    subdomain || hostname,
    isCustomDomain,
  );

  // Store context in headers
  const modifiedRequest = storeTenantContext(request, context);

  // Continue with modified request
  return NextResponse.next({
    request: modifiedRequest,
  });
}

/**
 * Get tenant context from request headers (for API routes)
 */
export function getTenantContext(request: Request): TenantContext | null {
  const tenantContextHeader = request.headers.get("X-Tenant-Context");

  if (!tenantContextHeader) {
    return null;
  }

  try {
    const context = JSON.parse(tenantContextHeader);
    return context as TenantContext;
  } catch {
    return null;
  }
}

/**
 * Get tenant ID from request headers
 */
export function getTenantId(request: Request): string | null {
  return request.headers.get("X-Tenant-Id");
}

/**
 * Get tenant schema from request headers
 */
export function getTenantSchema(request: Request): string | null {
  return request.headers.get("X-Tenant-Schema");
}

/**
 * Middleware config helper
 */
export function getDefaultTenantConfig(): TenantMiddlewareConfig {
  const isDevelopment = process.env.NODE_ENV === "development";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const url = new URL(appUrl);

  return {
    baseDomain: url.hostname + (url.port ? `:${url.port}` : ""),
    enableCustomDomains: process.env.ENABLE_CUSTOM_DOMAINS === "true",
    disableMultiTenancy: process.env.DISABLE_MULTI_TENANCY === "true",
    defaultTenant:
      process.env.DEFAULT_TENANT_SLUG || (isDevelopment ? "demo" : undefined),
  };
}
