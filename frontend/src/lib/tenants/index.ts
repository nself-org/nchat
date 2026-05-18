/**
 * Tenant Management Library
 *
 * Multi-tenant SaaS infrastructure for nself-chat.
 * Provides tenant isolation, billing, and resource management.
 *
 * @module @/lib/tenants
 * @version 1.0.0
 */

// Types
export type {
  Tenant,
  TenantStatus,
  BillingPlan,
  BillingInterval,
  TenantBranding,
  TenantBilling,
  TenantLimits,
  TenantFeatures,
  TenantUsage,
  TenantSettings,
  TenantInvitation,
  TenantAuditLog,
  TenantContext,
  CreateTenantRequest,
  UpdateTenantRequest,
  SubscriptionPlan,
} from "./types";

export { DEFAULT_PLANS } from "./types";

// Tenant Service
export { TenantService, getTenantService } from "./tenant-service";

// Middleware
export {
  tenantMiddleware,
  parseTenantFromHostname,
  fetchTenant,
  buildTenantContext,
  storeTenantContext,
  getTenantContext,
  getTenantId,
  getTenantSchema,
  getDefaultTenantConfig,
} from "./tenant-middleware";

export type { TenantMiddlewareConfig } from "./tenant-middleware";
