/**
 * Paywall Middleware
 *
 * Server-side middleware for enforcing paywall restrictions across API routes.
 * Integrates with the entitlement system for consistent access control.
 *
 * @module @/middleware/paywall
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server'
import type { PlanTier, PlanFeatures } from '@/types/subscription.types'
import { PLAN_FEATURES, PLAN_LIMITS, PLANS, type PlanLimits } from '@/lib/billing/plan-config'
import { getEntitlementService } from '@/services/entitlements/entitlement.service'
import type { EntitlementContext } from '@/lib/entitlements/entitlement-types'
import {
  PaywallConfig,
  PaywallContext,
  PaywallCheckResult,
  PaywallEnforcementOptions,
  PaywallDenialCode,
  PaywallError,
  PaywallErrorCode,
  PaywallErrorResponse,
  PaywallUpgradeInfo,
  PaywallUsageInfo,
  PaywallType,
  DEFAULT_BYPASS_ROLES,
  USAGE_WARNING_THRESHOLDS,
  PLAN_TIER_NAMES,
  FEATURE_DISPLAY_NAMES,
  LIMIT_DISPLAY_NAMES,
  LIMIT_UNITS,
  type FeaturePaywallConfig,
  type LimitPaywallConfig,
  type TierPaywallConfig,
  type RolePaywallConfig,
  type ChannelPaywallConfig,
  type TimePaywallConfig,
  type CustomPaywallConfig,
} from '@/lib/billing/paywall-types'
import { getGateRegistry } from '@/lib/entitlements/gates'

// ============================================================================
// Route Configuration
// ============================================================================

/**
 * Route-to-paywall mapping for automatic enforcement.
 */
export const PAYWALL_ROUTES: Record<string, PaywallConfig> = {
  // Video calls require starter+
  '/api/calls': {
    id: 'calls',
    name: 'Video Calls',
    type: 'feature',
    feature: 'videoCalls',
    action: 'execute',
    enabled: true,
    priority: 100,
    errorMessage: 'Video calls require a paid plan',
    upgradeMessage: 'Upgrade to Starter to unlock video calls',
  } as FeaturePaywallConfig,

  '/api/calls/*/join': {
    id: 'calls-join',
    name: 'Join Call',
    type: 'limit',
    limit: 'maxCallParticipants',
    action: 'execute',
    enabled: true,
    priority: 100,
    warningThreshold: 80,
    hardLimit: true,
  } as LimitPaywallConfig,

  // Screen sharing requires professional+
  '/api/calls/*/screen-share': {
    id: 'screen-share',
    name: 'Screen Sharing',
    type: 'feature',
    feature: 'screenSharing',
    action: 'execute',
    enabled: true,
    priority: 100,
  } as FeaturePaywallConfig,

  // Webhooks require starter+
  '/api/webhooks': {
    id: 'webhooks',
    name: 'Webhooks',
    type: 'feature',
    feature: 'webhooks',
    action: 'create',
    enabled: true,
    priority: 100,
  } as FeaturePaywallConfig,

  // External API access requires professional+
  '/api/external': {
    id: 'api-access',
    name: 'API Access',
    type: 'feature',
    feature: 'apiAccess',
    action: 'access',
    enabled: true,
    priority: 100,
  } as FeaturePaywallConfig,

  '/api/external/*': {
    id: 'api-access-nested',
    name: 'API Access',
    type: 'feature',
    feature: 'apiAccess',
    action: 'access',
    enabled: true,
    priority: 100,
  } as FeaturePaywallConfig,

  // SSO requires enterprise
  '/api/auth/sso': {
    id: 'sso',
    name: 'SSO / SAML',
    type: 'feature',
    feature: 'sso',
    action: 'configure',
    enabled: true,
    priority: 100,
  } as FeaturePaywallConfig,

  '/api/auth/sso/*': {
    id: 'sso-nested',
    name: 'SSO / SAML',
    type: 'feature',
    feature: 'sso',
    action: 'access',
    enabled: true,
    priority: 100,
  } as FeaturePaywallConfig,

  '/api/auth/saml': {
    id: 'saml',
    name: 'SAML',
    type: 'feature',
    feature: 'sso',
    action: 'configure',
    enabled: true,
    priority: 100,
  } as FeaturePaywallConfig,

  // Audit logs require professional+
  '/api/audit': {
    id: 'audit-logs',
    name: 'Audit Logs',
    type: 'feature',
    feature: 'auditLogs',
    action: 'view',
    enabled: true,
    priority: 100,
  } as FeaturePaywallConfig,

  '/api/audit/*': {
    id: 'audit-logs-nested',
    name: 'Audit Logs',
    type: 'feature',
    feature: 'auditLogs',
    action: 'view',
    enabled: true,
    priority: 100,
  } as FeaturePaywallConfig,

  // Custom branding requires enterprise
  '/api/tenants/*/branding': {
    id: 'branding',
    name: 'Custom Branding',
    type: 'feature',
    feature: 'customBranding',
    action: 'configure',
    enabled: true,
    priority: 100,
  } as FeaturePaywallConfig,

  // Data export requires professional+
  '/api/export': {
    id: 'data-export',
    name: 'Data Export',
    type: 'feature',
    feature: 'dataExport',
    action: 'export',
    enabled: true,
    priority: 100,
  } as FeaturePaywallConfig,

  '/api/export/*': {
    id: 'data-export-nested',
    name: 'Data Export',
    type: 'feature',
    feature: 'dataExport',
    action: 'export',
    enabled: true,
    priority: 100,
  } as FeaturePaywallConfig,

  // Integrations require starter+
  '/api/integrations': {
    id: 'integrations',
    name: 'Integrations',
    type: 'feature',
    feature: 'integrations',
    action: 'access',
    enabled: true,
    priority: 100,
  } as FeaturePaywallConfig,

  '/api/integrations/*': {
    id: 'integrations-nested',
    name: 'Integrations',
    type: 'feature',
    feature: 'integrations',
    action: 'configure',
    enabled: true,
    priority: 100,
  } as FeaturePaywallConfig,

  // Voice messages require starter+
  '/api/messages/voice': {
    id: 'voice-messages',
    name: 'Voice Messages',
    type: 'feature',
    feature: 'voiceMessages',
    action: 'create',
    enabled: true,
    priority: 100,
  } as FeaturePaywallConfig,

  // Custom emoji require starter+
  '/api/emoji/custom': {
    id: 'custom-emoji',
    name: 'Custom Emoji',
    type: 'feature',
    feature: 'customEmoji',
    action: 'create',
    enabled: true,
    priority: 100,
  } as FeaturePaywallConfig,

  // Channel creation has limits
  '/api/channels': {
    id: 'channels-limit',
    name: 'Channel Limit',
    type: 'limit',
    limit: 'maxChannels',
    action: 'create',
    enabled: true,
    priority: 100,
    warningThreshold: 80,
    hardLimit: true,
  } as LimitPaywallConfig,

  // Member invites have limits
  '/api/workspaces/*/members': {
    id: 'members-limit',
    name: 'Member Limit',
    type: 'limit',
    limit: 'maxMembers',
    action: 'create',
    enabled: true,
    priority: 100,
    warningThreshold: 80,
    hardLimit: true,
  } as LimitPaywallConfig,

  // File uploads have limits
  '/api/attachments': {
    id: 'file-size-limit',
    name: 'File Size Limit',
    type: 'limit',
    limit: 'maxFileSizeBytes',
    action: 'create',
    enabled: true,
    priority: 100,
    hardLimit: true,
  } as LimitPaywallConfig,

  '/api/files/upload': {
    id: 'storage-limit',
    name: 'Storage Limit',
    type: 'limit',
    limit: 'maxStorageBytes',
    action: 'create',
    enabled: true,
    priority: 100,
    warningThreshold: 90,
    hardLimit: true,
  } as LimitPaywallConfig,

  // Streaming has limits
  '/api/streams': {
    id: 'stream-duration',
    name: 'Stream Duration',
    type: 'limit',
    limit: 'maxStreamDurationMinutes',
    action: 'create',
    enabled: true,
    priority: 100,
    hardLimit: false,
  } as LimitPaywallConfig,

  // Admin dashboard requires starter+
  '/api/admin': {
    id: 'admin-dashboard',
    name: 'Admin Dashboard',
    type: 'feature',
    feature: 'adminDashboard',
    action: 'access',
    enabled: true,
    priority: 100,
  } as FeaturePaywallConfig,

  '/api/admin/*': {
    id: 'admin-dashboard-nested',
    name: 'Admin Dashboard',
    type: 'feature',
    feature: 'adminDashboard',
    action: 'access',
    enabled: true,
    priority: 100,
  } as FeaturePaywallConfig,
}

// ============================================================================
// Context Extraction
// ============================================================================

/**
 * Extract paywall context from request.
 */
export async function extractPaywallContext(
  request: NextRequest
): Promise<PaywallContext | null> {
  // Get user info from headers/session
  const userId = request.headers.get('x-user-id')
  const userRole = request.headers.get('x-user-role') ?? undefined
  const organizationId = request.headers.get('x-organization-id') ?? undefined
  const workspaceId = request.headers.get('x-workspace-id') ?? undefined
  const channelId = request.headers.get('x-channel-id') ?? undefined
  const planTier = (request.headers.get('x-plan-tier') as PlanTier) ?? 'free'
  const subscriptionStatus = request.headers.get('x-subscription-status') ?? undefined
  const isInTrial = request.headers.get('x-is-trial') === 'true'

  if (!userId) {
    return null
  }

  return {
    userId,
    userRole,
    organizationId,
    workspaceId,
    channelId,
    planTier,
    subscriptionStatus,
    isInTrial,
    requestMetadata: {
      path: request.nextUrl.pathname,
      method: request.method,
    },
  }
}

// ============================================================================
// Paywall Check Functions
// ============================================================================

/**
 * Check feature-based paywall.
 */
async function checkFeaturePaywall(
  config: FeaturePaywallConfig,
  context: PaywallContext
): Promise<PaywallCheckResult> {
  const planFeatures = PLAN_FEATURES[context.planTier]
  const hasFeature = planFeatures[config.feature] as boolean

  if (hasFeature) {
    return {
      allowed: true,
      currentPlan: context.planTier,
    }
  }

  // Find minimum tier with this feature
  const requiredPlan = findMinimumTierForFeature(config.feature)

  return {
    allowed: false,
    type: 'feature',
    code: PaywallDenialCode.FEATURE_NOT_AVAILABLE,
    reason: config.errorMessage ?? `${config.name} is not available on your current plan`,
    currentPlan: context.planTier,
    requiredPlan,
    upgrade: buildUpgradeInfo(context.planTier, requiredPlan, config.feature),
  }
}

/**
 * Check limit-based paywall.
 */
async function checkLimitPaywall(
  config: LimitPaywallConfig,
  context: PaywallContext,
  currentUsage?: number
): Promise<PaywallCheckResult> {
  const planLimits = PLAN_LIMITS[context.planTier]
  const limit = planLimits[config.limit]

  // Unlimited
  if (limit === null) {
    return {
      allowed: true,
      currentPlan: context.planTier,
      usage: {
        current: currentUsage ?? 0,
        limit: null,
        remaining: null,
        percentage: null,
        warningLevel: 'none',
        unit: LIMIT_UNITS[config.limit],
      },
    }
  }

  const usage = currentUsage ?? 0
  const percentage = (usage / limit) * 100
  const remaining = Math.max(0, limit - usage)
  const warningLevel = getWarningLevel(percentage)

  const usageInfo: PaywallUsageInfo = {
    current: usage,
    limit,
    remaining,
    percentage,
    warningLevel,
    unit: LIMIT_UNITS[config.limit],
  }

  // Check if exceeding limit
  if (config.hardLimit && usage >= limit) {
    const requiredPlan = findMinimumTierForHigherLimit(context.planTier, config.limit)

    return {
      allowed: false,
      type: 'limit',
      code: PaywallDenialCode.LIMIT_EXCEEDED,
      reason: `${LIMIT_DISPLAY_NAMES[config.limit]} limit exceeded`,
      currentPlan: context.planTier,
      requiredPlan,
      upgrade: buildUpgradeInfo(context.planTier, requiredPlan, undefined, config.limit),
      usage: usageInfo,
    }
  }

  // Check warning threshold
  if (config.warningThreshold && percentage >= config.warningThreshold) {
    return {
      allowed: true,
      type: 'limit',
      code: PaywallDenialCode.LIMIT_APPROACHING,
      reason: `Approaching ${LIMIT_DISPLAY_NAMES[config.limit]} limit`,
      currentPlan: context.planTier,
      usage: usageInfo,
    }
  }

  return {
    allowed: true,
    currentPlan: context.planTier,
    usage: usageInfo,
  }
}

/**
 * Check tier-based paywall.
 */
async function checkTierPaywall(
  config: TierPaywallConfig,
  context: PaywallContext
): Promise<PaywallCheckResult> {
  const tierOrder: PlanTier[] = ['free', 'starter', 'professional', 'enterprise', 'custom']
  const currentIndex = tierOrder.indexOf(context.planTier)
  const requiredIndex = tierOrder.indexOf(config.minimumTier)

  // Custom tier handling
  if (context.planTier === 'custom' && config.allowCustom) {
    return {
      allowed: true,
      currentPlan: context.planTier,
    }
  }

  if (currentIndex >= requiredIndex) {
    return {
      allowed: true,
      currentPlan: context.planTier,
    }
  }

  return {
    allowed: false,
    type: 'tier',
    code: PaywallDenialCode.TIER_INSUFFICIENT,
    reason: `This feature requires the ${PLAN_TIER_NAMES[config.minimumTier]} plan or higher`,
    currentPlan: context.planTier,
    requiredPlan: config.minimumTier,
    upgrade: buildUpgradeInfo(context.planTier, config.minimumTier),
  }
}

/**
 * Check role-based paywall.
 */
async function checkRolePaywall(
  config: RolePaywallConfig,
  context: PaywallContext
): Promise<PaywallCheckResult> {
  const userRole = context.userRole

  // Check denied roles first
  if (config.deniedRoles && userRole && config.deniedRoles.includes(userRole)) {
    return {
      allowed: false,
      type: 'role',
      code: PaywallDenialCode.ROLE_INSUFFICIENT,
      reason: `Your role (${userRole}) does not have access to this feature`,
      currentPlan: context.planTier,
    }
  }

  // Check allowed roles
  if (config.allowedRoles) {
    if (!userRole || !config.allowedRoles.includes(userRole)) {
      return {
        allowed: false,
        type: 'role',
        code: PaywallDenialCode.ROLE_REQUIRED,
        reason: `This feature requires one of these roles: ${config.allowedRoles.join(', ')}`,
        currentPlan: context.planTier,
      }
    }
  }

  return {
    allowed: true,
    currentPlan: context.planTier,
  }
}

/**
 * Check channel-based paywall.
 */
async function checkChannelPaywall(
  config: ChannelPaywallConfig,
  context: PaywallContext
): Promise<PaywallCheckResult> {
  const channelId = context.channelId
  const channelType = context.metadata?.channelType as string | undefined

  // Check premium channel IDs
  if (config.premiumChannelIds && channelId && config.premiumChannelIds.includes(channelId)) {
    // Check if user has required feature
    if (config.requiredFeature) {
      const hasFeature = PLAN_FEATURES[context.planTier][config.requiredFeature] as boolean
      if (!hasFeature) {
        return {
          allowed: false,
          type: 'channel',
          code: PaywallDenialCode.CHANNEL_PREMIUM,
          reason: 'This is a premium channel',
          currentPlan: context.planTier,
          requiredPlan: findMinimumTierForFeature(config.requiredFeature),
        }
      }
    }
  }

  // Check premium channel types
  if (config.premiumChannelTypes && channelType && config.premiumChannelTypes.includes(channelType)) {
    if (config.requiredFeature) {
      const hasFeature = PLAN_FEATURES[context.planTier][config.requiredFeature] as boolean
      if (!hasFeature) {
        return {
          allowed: false,
          type: 'channel',
          code: PaywallDenialCode.CHANNEL_RESTRICTED,
          reason: `${channelType} channels require an upgraded plan`,
          currentPlan: context.planTier,
          requiredPlan: findMinimumTierForFeature(config.requiredFeature),
        }
      }
    }
  }

  return {
    allowed: true,
    currentPlan: context.planTier,
  }
}

/**
 * Check time-based paywall.
 */
async function checkTimePaywall(
  config: TimePaywallConfig,
  context: PaywallContext
): Promise<PaywallCheckResult> {
  // Check subscription status
  if (config.requireActiveSubscription) {
    const validStatuses = ['active', 'trialing']
    if (!context.subscriptionStatus || !validStatuses.includes(context.subscriptionStatus)) {
      return {
        allowed: false,
        type: 'time',
        code: PaywallDenialCode.SUBSCRIPTION_EXPIRED,
        reason: 'An active subscription is required',
        currentPlan: context.planTier,
      }
    }
  }

  // Check trial status
  if (config.requireTrial && !context.isInTrial) {
    return {
      allowed: false,
      type: 'time',
      code: PaywallDenialCode.TRIAL_EXPIRED,
      reason: 'Trial period has expired',
      currentPlan: context.planTier,
    }
  }

  // Check allowed hours
  if (config.allowedHours) {
    const now = new Date()
    const timezone = config.timezone ?? 'UTC'
    const options: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      hour12: false,
      timeZone: timezone,
    }
    const currentHour = parseInt(new Intl.DateTimeFormat('en-US', options).format(now))

    const { start, end } = config.allowedHours
    let withinHours: boolean

    if (start <= end) {
      withinHours = currentHour >= start && currentHour < end
    } else {
      withinHours = currentHour >= start || currentHour < end
    }

    if (!withinHours) {
      return {
        allowed: false,
        type: 'time',
        code: PaywallDenialCode.OUTSIDE_ALLOWED_HOURS,
        reason: `Access only available between ${start}:00 and ${end}:00`,
        currentPlan: context.planTier,
      }
    }
  }

  // Check allowed days
  if (config.allowedDays) {
    const now = new Date()
    const timezone = config.timezone ?? 'UTC'
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      timeZone: timezone,
    }
    const dayStr = new Intl.DateTimeFormat('en-US', options).format(now)
    const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
    const currentDay = dayMap[dayStr] ?? 0

    if (!config.allowedDays.includes(currentDay)) {
      return {
        allowed: false,
        type: 'time',
        code: PaywallDenialCode.OUTSIDE_ALLOWED_HOURS,
        reason: 'Access is not available on this day',
        currentPlan: context.planTier,
      }
    }
  }

  return {
    allowed: true,
    currentPlan: context.planTier,
  }
}

/**
 * Check custom gate paywall.
 */
async function checkCustomPaywall(
  config: CustomPaywallConfig,
  context: PaywallContext
): Promise<PaywallCheckResult> {
  const registry = getGateRegistry()
  const gate = registry.get(config.gateFn)

  if (!gate) {
    throw new PaywallError(
      PaywallErrorCode.GATE_NOT_FOUND,
      `Gate not found: ${config.gateFn}`,
      config.id
    )
  }

  try {
    const entitlementContext: EntitlementContext = {
      userId: context.userId,
      userRole: context.userRole,
      organizationId: context.organizationId,
      workspaceId: context.workspaceId,
      channelId: context.channelId,
      planTier: context.planTier,
      metadata: context.metadata,
    }

    const result = await gate.fn(
      entitlementContext,
      {
        key: config.id,
        name: config.name,
        description: config.description ?? '',
        category: 'admin',
        valueType: 'custom',
        inheritable: false,
        grantable: false,
        gateFn: config.gateFn,
        gateParams: config.gateParams,
      },
      undefined
    )

    if (result.allowed) {
      return {
        allowed: true,
        currentPlan: context.planTier,
      }
    }

    return {
      allowed: false,
      type: 'custom',
      code: PaywallDenialCode.ACCESS_DENIED,
      reason: result.reason ?? 'Access denied',
      currentPlan: context.planTier,
      metadata: result.metadata,
    }
  } catch (error) {
    throw new PaywallError(
      PaywallErrorCode.GATE_ERROR,
      error instanceof Error ? error.message : 'Gate execution failed',
      config.id
    )
  }
}

// ============================================================================
// Main Check Function
// ============================================================================

/**
 * Check paywall for a given configuration and context.
 */
export async function checkPaywall(
  config: PaywallConfig,
  context: PaywallContext,
  options: PaywallEnforcementOptions = {}
): Promise<PaywallCheckResult> {
  // Check if paywall is enabled
  if (!config.enabled) {
    return {
      allowed: true,
      currentPlan: context.planTier,
    }
  }

  // Check bypass roles
  const bypassRoles = config.bypassRoles ?? DEFAULT_BYPASS_ROLES
  if (context.userRole && bypassRoles.includes(context.userRole)) {
    return {
      allowed: true,
      currentPlan: context.planTier,
      metadata: { bypassed: true, bypassReason: 'role' },
    }
  }

  // Check bypass user IDs
  if (config.bypassUserIds && config.bypassUserIds.includes(context.userId)) {
    return {
      allowed: true,
      currentPlan: context.planTier,
      metadata: { bypassed: true, bypassReason: 'userId' },
    }
  }

  // Run type-specific check
  let result: PaywallCheckResult

  switch (config.type) {
    case 'feature':
      result = await checkFeaturePaywall(config, context)
      break
    case 'limit':
      result = await checkLimitPaywall(config, context)
      break
    case 'tier':
      result = await checkTierPaywall(config, context)
      break
    case 'role':
      result = await checkRolePaywall(config, context)
      break
    case 'channel':
      result = await checkChannelPaywall(config, context)
      break
    case 'time':
      result = await checkTimePaywall(config, context)
      break
    case 'custom':
      result = await checkCustomPaywall(config, context)
      break
    default:
      throw new PaywallError(
        PaywallErrorCode.INVALID_CONFIG,
        `Unknown paywall type: ${(config as PaywallConfig).type}`,
        (config as PaywallConfig).id
      )
  }

  // Call denied handler if applicable
  if (!result.allowed && options.onDenied) {
    options.onDenied(result)
  }

  return result
}

/**
 * Check paywall for a route.
 */
export async function checkRoutePaywall(
  request: NextRequest,
  options: PaywallEnforcementOptions = {}
): Promise<PaywallCheckResult> {
  const context = await extractPaywallContext(request)

  if (!context) {
    // No user context - allow (auth will handle)
    return {
      allowed: true,
      currentPlan: 'free',
    }
  }

  const config = matchRouteToPaywall(request.nextUrl.pathname)

  if (!config) {
    // No paywall for this route
    return {
      allowed: true,
      currentPlan: context.planTier,
    }
  }

  return checkPaywall(config, context, options)
}

/**
 * Match route path to paywall configuration.
 */
export function matchRouteToPaywall(pathname: string): PaywallConfig | undefined {
  // Exact match first
  if (PAYWALL_ROUTES[pathname]) {
    return PAYWALL_ROUTES[pathname]
  }

  // Pattern match with wildcards
  for (const [pattern, config] of Object.entries(PAYWALL_ROUTES)) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '[^/]+') + '$')
    if (regex.test(pathname)) {
      return config
    }
  }

  return undefined
}

// ============================================================================
// Middleware Factory
// ============================================================================

/**
 * Create paywall middleware for a specific configuration.
 */
export function createPaywallMiddleware(config: PaywallConfig) {
  return async function paywallMiddleware(request: NextRequest) {
    const context = await extractPaywallContext(request)

    if (!context) {
      return null // No user context, let other middleware handle
    }

    const result = await checkPaywall(config, context)

    if (!result.allowed) {
      return buildPaywallResponse(result)
    }

    return null // Allow request to proceed
  }
}

/**
 * Global paywall middleware.
 */
export async function paywallMiddleware(request: NextRequest) {
  const result = await checkRoutePaywall(request)

  if (!result.allowed) {
    return buildPaywallResponse(result)
  }

  return null // Allow request to proceed
}

/**
 * Higher-order function to wrap API handlers with paywall.
 */
export function withPaywall(
  handler: (request: NextRequest, context?: unknown) => Promise<NextResponse>,
  config: PaywallConfig
) {
  return async function paywallHandler(request: NextRequest, handlerContext?: unknown) {
    const context = await extractPaywallContext(request)

    if (!context) {
      return handler(request, handlerContext)
    }

    const result = await checkPaywall(config, context)

    if (!result.allowed) {
      return buildPaywallResponse(result)
    }

    return handler(request, handlerContext)
  }
}

/**
 * Decorator for API routes requiring feature access.
 */
export function requireFeature(feature: keyof PlanFeatures) {
  const config: FeaturePaywallConfig = {
    id: `require-${feature}`,
    name: FEATURE_DISPLAY_NAMES[feature] ?? feature,
    type: 'feature',
    feature,
    action: 'access',
    enabled: true,
    priority: 100,
  }

  return (handler: (request: NextRequest, context?: unknown) => Promise<NextResponse>) =>
    withPaywall(handler, config)
}

/**
 * Decorator for API routes requiring minimum tier.
 */
export function requireTier(minimumTier: PlanTier) {
  const config: TierPaywallConfig = {
    id: `require-tier-${minimumTier}`,
    name: `${PLAN_TIER_NAMES[minimumTier]} Required`,
    type: 'tier',
    minimumTier,
    action: 'access',
    enabled: true,
    priority: 100,
  }

  return (handler: (request: NextRequest, context?: unknown) => Promise<NextResponse>) =>
    withPaywall(handler, config)
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Find minimum tier that has a feature.
 */
function findMinimumTierForFeature(feature: keyof PlanFeatures): PlanTier {
  const tiers: PlanTier[] = ['free', 'starter', 'professional', 'enterprise']

  for (const tier of tiers) {
    if (PLAN_FEATURES[tier][feature] as boolean) {
      return tier
    }
  }

  return 'enterprise'
}

/**
 * Find minimum tier with higher limit.
 */
function findMinimumTierForHigherLimit(
  currentTier: PlanTier,
  limitKey: keyof PlanLimits
): PlanTier {
  const tiers: PlanTier[] = ['free', 'starter', 'professional', 'enterprise']
  const currentLimit = PLAN_LIMITS[currentTier][limitKey]
  const currentIndex = tiers.indexOf(currentTier)

  for (let i = currentIndex + 1; i < tiers.length; i++) {
    const tier = tiers[i]
    const tierLimit = PLAN_LIMITS[tier][limitKey]

    if (tierLimit === null || (currentLimit !== null && tierLimit > currentLimit)) {
      return tier
    }
  }

  return 'enterprise'
}

/**
 * Get warning level based on usage percentage.
 */
function getWarningLevel(
  percentage: number
): 'none' | 'low' | 'medium' | 'high' | 'critical' {
  if (percentage >= USAGE_WARNING_THRESHOLDS.critical) return 'critical'
  if (percentage >= USAGE_WARNING_THRESHOLDS.high) return 'high'
  if (percentage >= USAGE_WARNING_THRESHOLDS.medium) return 'medium'
  if (percentage >= USAGE_WARNING_THRESHOLDS.low) return 'low'
  return 'none'
}

/**
 * Build upgrade info for paywall response.
 */
function buildUpgradeInfo(
  currentTier: PlanTier,
  targetTier?: PlanTier,
  feature?: keyof PlanFeatures,
  limit?: keyof PlanLimits
): PaywallUpgradeInfo | undefined {
  if (!targetTier) return undefined

  const targetPlan = PLANS[targetTier]
  const currentPlan = PLANS[currentTier]

  // Calculate features gained
  const featuresGained: string[] = []
  for (const [key, value] of Object.entries(PLAN_FEATURES[targetTier])) {
    const currentValue = PLAN_FEATURES[currentTier][key as keyof PlanFeatures]
    if (value === true && currentValue === false) {
      const displayName = FEATURE_DISPLAY_NAMES[key as keyof PlanFeatures]
      if (displayName) {
        featuresGained.push(displayName)
      }
    }
  }

  // Calculate limits increased
  const limitsIncreased: Array<{
    name: string
    key: keyof PlanLimits
    currentValue: number | null
    newValue: number | null
    unit: string
  }> = []

  for (const [key, value] of Object.entries(PLAN_LIMITS[targetTier])) {
    const currentValue = PLAN_LIMITS[currentTier][key as keyof PlanLimits]
    const limitKey = key as keyof PlanLimits

    if (value !== currentValue) {
      limitsIncreased.push({
        name: LIMIT_DISPLAY_NAMES[limitKey],
        key: limitKey,
        currentValue,
        newValue: value,
        unit: LIMIT_UNITS[limitKey],
      })
    }
  }

  return {
    targetPlan: targetTier,
    planName: targetPlan.name,
    monthlyPrice: targetPlan.pricing.monthly,
    yearlyPrice: targetPlan.pricing.yearly,
    featuresGained,
    limitsIncreased,
    upgradeUrl: `/billing/upgrade?plan=${targetTier}`,
    trialAvailable: targetTier !== 'enterprise' && targetTier !== 'custom',
    trialDays: 14,
  }
}

/**
 * Build paywall error response.
 */
export function buildPaywallResponse(result: PaywallCheckResult): NextResponse {
  const response: PaywallErrorResponse = {
    error: result.code === PaywallDenialCode.LIMIT_EXCEEDED ? 'limit_exceeded' : 'upgrade_required',
    code: result.code ?? PaywallDenialCode.ACCESS_DENIED,
    message: result.reason ?? 'Access denied',
    currentPlan: result.currentPlan,
    requiredPlan: result.requiredPlan,
  }

  if (result.upgrade) {
    response.upgrade = {
      planName: result.upgrade.planName,
      monthlyPrice: result.upgrade.monthlyPrice,
      yearlyPrice: result.upgrade.yearlyPrice,
      upgradeUrl: result.upgrade.upgradeUrl,
      trialAvailable: result.upgrade.trialAvailable ?? false,
      trialDays: result.upgrade.trialDays,
    }
  }

  if (result.usage) {
    response.usage = {
      current: result.usage.current,
      limit: result.usage.limit,
      remaining: result.usage.remaining,
      percentage: result.usage.percentage,
      unit: result.usage.unit,
    }
  }

  return NextResponse.json(response, { status: 403 })
}

// ============================================================================
// Exports for Testing
// ============================================================================

export {
  checkFeaturePaywall,
  checkLimitPaywall,
  checkTierPaywall,
  checkRolePaywall,
  checkChannelPaywall,
  checkTimePaywall,
  checkCustomPaywall,
  findMinimumTierForFeature,
  findMinimumTierForHigherLimit,
  getWarningLevel,
  buildUpgradeInfo,
}
