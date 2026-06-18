/**
 * Purpose:    Billing + wallet domain types and the static plan catalogue, ported
 *             1:1 from the legacy Next app (frontend/src/types/billing.ts +
 *             frontend/src/config/billing-plans.ts). Group-local to the billing port
 *             so the Vite SPA carries no dependency on the legacy `@/config` tree.
 * Inputs:     None — pure type + const definitions.
 * Outputs:    PlanTier/BillingInterval/UsageLimits types, the PLANS catalogue,
 *             CRYPTO_NETWORKS, and the pricing helper functions.
 * Constraints:Presentational data only. Stripe price IDs come from import.meta.env at
 *             checkout time (BFF-pending, see BillingPage notes), never hardcoded here.
 * SOT:        F-NCHAT-VITE-ROUTE — /billing
 */

export type PlanTier = 'free' | 'starter' | 'pro' | 'business' | 'enterprise'
export type BillingInterval = 'month' | 'year'
export type PaymentMethod = 'card' | 'crypto'
export type CryptoNetwork = 'ethereum' | 'polygon' | 'bsc' | 'arbitrum'
export type CryptoCurrency = 'ETH' | 'USDC' | 'USDT'

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'refunded'

export interface PlanFeatures {
  maxUsers: number | null
  maxChannels: number | null
  maxMessagesPerMonth: number | null
  maxStorageGB: number | null
  maxFileUploadMB: number
  maxIntegrations: number | null
  maxBots: number | null
  maxAdmins: number | null
  customBranding: boolean
  advancedAnalytics: boolean
  prioritySupport: boolean
  sla: boolean
  ssoIntegration: boolean
  auditLogs: boolean
  dataExport: boolean
  apiAccess: boolean
  webhooks: boolean
  customDomain: boolean
  whiteLabel: boolean
  aiSummarization: boolean
  aiModerationMinutes: number | null
  aiSearchQueries: number | null
  videoConferencing: boolean
  screenSharing: boolean
  voiceMessages: boolean
  maxCallParticipants: number
  recordingStorage: boolean
  guestAccess: boolean
  tokenGating: boolean
  cryptoPayments: boolean
  nftIntegration: boolean
}

export interface PlanPrice {
  monthly: number
  yearly: number
  cryptoMonthly?: { eth: number; usdc: number; usdt: number }
}

export interface Plan {
  id: PlanTier
  name: string
  description: string
  tagline: string
  price: PlanPrice
  features: PlanFeatures
  popular?: boolean
  recommended?: boolean
  color?: string
}

export interface UsageMetrics {
  userId: string
  period: string
  users: number
  channels: number
  messages: number
  storageGB: number
  integrations: number
  bots: number
  aiMinutes: number
  aiQueries: number
  callMinutes: number
  recordingGB: number
}

export interface UsageWarning {
  feature: string
  current: number
  limit: number
  percentage: number
  severity: 'info' | 'warning' | 'critical'
}

export interface UsageLimits {
  plan: PlanTier
  current: UsageMetrics
  limits: PlanFeatures
  warnings: UsageWarning[]
  exceeded: boolean
}

export interface Invoice {
  id: string
  amount: number
  currency: string
  status: PaymentStatus
  createdAt: string
  paidAt?: string | null
  downloadUrl?: string | null
}

const FREE_FEATURES: PlanFeatures = {
  maxUsers: 10,
  maxChannels: 5,
  maxMessagesPerMonth: 10000,
  maxStorageGB: 5,
  maxFileUploadMB: 10,
  maxIntegrations: 2,
  maxBots: 1,
  maxAdmins: 1,
  customBranding: false,
  advancedAnalytics: false,
  prioritySupport: false,
  sla: false,
  ssoIntegration: false,
  auditLogs: false,
  dataExport: true,
  apiAccess: false,
  webhooks: false,
  customDomain: false,
  whiteLabel: false,
  aiSummarization: false,
  aiModerationMinutes: null,
  aiSearchQueries: 100,
  videoConferencing: true,
  screenSharing: false,
  voiceMessages: true,
  maxCallParticipants: 4,
  recordingStorage: false,
  guestAccess: false,
  tokenGating: false,
  cryptoPayments: false,
  nftIntegration: false,
}

export const PLANS: Record<PlanTier, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Perfect for personal use and small teams',
    tagline: 'Get started for free',
    price: { monthly: 0, yearly: 0 },
    features: FREE_FEATURES,
    color: 'slate',
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'For growing teams with basic needs',
    tagline: 'Everything in Free, plus more',
    price: { monthly: 8, yearly: 80, cryptoMonthly: { eth: 0.0025, usdc: 8, usdt: 8 } },
    features: {
      ...FREE_FEATURES,
      maxUsers: 50,
      maxChannels: 25,
      maxMessagesPerMonth: 100000,
      maxStorageGB: 50,
      maxFileUploadMB: 50,
      maxIntegrations: 10,
      maxBots: 5,
      maxAdmins: 3,
      customBranding: true,
      auditLogs: true,
      apiAccess: true,
      webhooks: true,
      aiSummarization: true,
      aiModerationMinutes: 100,
      aiSearchQueries: 1000,
      screenSharing: true,
      maxCallParticipants: 10,
      recordingStorage: true,
      guestAccess: true,
    },
    popular: true,
    color: 'blue',
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'For professional teams with advanced needs',
    tagline: 'Most popular for teams',
    price: { monthly: 25, yearly: 250, cryptoMonthly: { eth: 0.008, usdc: 25, usdt: 25 } },
    features: {
      ...FREE_FEATURES,
      maxUsers: 200,
      maxChannels: 100,
      maxMessagesPerMonth: 500000,
      maxStorageGB: 250,
      maxFileUploadMB: 200,
      maxIntegrations: 50,
      maxBots: 20,
      maxAdmins: 10,
      customBranding: true,
      advancedAnalytics: true,
      prioritySupport: true,
      ssoIntegration: true,
      auditLogs: true,
      apiAccess: true,
      webhooks: true,
      customDomain: true,
      whiteLabel: true,
      aiSummarization: true,
      aiModerationMinutes: 500,
      aiSearchQueries: 5000,
      screenSharing: true,
      maxCallParticipants: 25,
      recordingStorage: true,
      guestAccess: true,
      tokenGating: true,
      cryptoPayments: true,
      nftIntegration: true,
    },
    recommended: true,
    color: 'indigo',
  },
  business: {
    id: 'business',
    name: 'Business',
    description: 'For large organizations with complex requirements',
    tagline: 'Advanced features and support',
    price: { monthly: 75, yearly: 750, cryptoMonthly: { eth: 0.024, usdc: 75, usdt: 75 } },
    features: {
      ...FREE_FEATURES,
      maxUsers: 1000,
      maxChannels: 500,
      maxMessagesPerMonth: 2000000,
      maxStorageGB: 1000,
      maxFileUploadMB: 500,
      maxIntegrations: null,
      maxBots: 100,
      maxAdmins: 50,
      customBranding: true,
      advancedAnalytics: true,
      prioritySupport: true,
      sla: true,
      ssoIntegration: true,
      auditLogs: true,
      apiAccess: true,
      webhooks: true,
      customDomain: true,
      whiteLabel: true,
      aiSummarization: true,
      aiModerationMinutes: 2000,
      aiSearchQueries: 20000,
      screenSharing: true,
      maxCallParticipants: 100,
      recordingStorage: true,
      guestAccess: true,
      tokenGating: true,
      cryptoPayments: true,
      nftIntegration: true,
    },
    color: 'purple',
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Custom solutions for enterprise organizations',
    tagline: 'Unlimited everything + dedicated support',
    price: { monthly: 0, yearly: 0 },
    features: {
      ...FREE_FEATURES,
      maxUsers: null,
      maxChannels: null,
      maxMessagesPerMonth: null,
      maxStorageGB: null,
      maxFileUploadMB: 2000,
      maxIntegrations: null,
      maxBots: null,
      maxAdmins: null,
      customBranding: true,
      advancedAnalytics: true,
      prioritySupport: true,
      sla: true,
      ssoIntegration: true,
      auditLogs: true,
      apiAccess: true,
      webhooks: true,
      customDomain: true,
      whiteLabel: true,
      aiSummarization: true,
      aiModerationMinutes: null,
      aiSearchQueries: null,
      screenSharing: true,
      maxCallParticipants: 500,
      recordingStorage: true,
      guestAccess: true,
      tokenGating: true,
      cryptoPayments: true,
      nftIntegration: true,
    },
    color: 'amber',
  },
}

export const CRYPTO_NETWORKS = {
  ethereum: { name: 'Ethereum', chainId: 1, symbol: 'ETH' },
  polygon: { name: 'Polygon', chainId: 137, symbol: 'MATIC' },
  bsc: { name: 'Binance Smart Chain', chainId: 56, symbol: 'BNB' },
  arbitrum: { name: 'Arbitrum', chainId: 42161, symbol: 'ETH' },
} as const

export function calculateAnnualSavings(plan: Plan): number {
  if (plan.price.monthly === 0) return 0
  return plan.price.monthly * 12 - plan.price.yearly
}

export function formatPrice(amount: number, currency = 'USD'): string {
  if (amount === 0) return 'Free'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount)
}

export function getUsagePercentage(current: number, limit: number | null): number {
  if (limit === null) return 0 // unlimited
  if (limit === 0) return 100
  return Math.min(100, (current / limit) * 100)
}

export function formatUsage(current: number, limit: number | null, unit = ''): string {
  const fmt = (n: number) => (Number.isInteger(n) ? n.toLocaleString() : n.toFixed(1))
  if (limit === null) return `${fmt(current)}${unit} / Unlimited`
  return `${fmt(current)}${unit} / ${fmt(limit)}${unit}`
}

const TIER_ORDER: PlanTier[] = ['free', 'starter', 'pro', 'business', 'enterprise']

/** Suggest the smallest plan whose limits accommodate the given usage. */
export function suggestUpgrade(current: PlanTier): PlanTier | null {
  const idx = TIER_ORDER.indexOf(current)
  return idx >= 0 && idx < TIER_ORDER.length - 1 ? TIER_ORDER[idx + 1] : null
}
