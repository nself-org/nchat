/**
 * Purpose:    Billing + wallet domain type definitions. The static plan catalogue (PLANS),
 *             CRYPTO_NETWORKS, and pricing helper functions are in billing-plans.ts (split
 *             to stay within the 300-line cap); all are re-exported here for backward compat.
 * Inputs:     None — pure type definitions.
 * Outputs:    PlanTier, BillingInterval, PaymentMethod, PlanFeatures, Plan, UsageLimits,
 *             Invoice, and all billing-plans.ts exports.
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

// Re-export the plan catalogue and helpers so existing imports keep working.
export {
  PLANS,
  CRYPTO_NETWORKS,
  calculateAnnualSavings,
  formatPrice,
  getUsagePercentage,
  formatUsage,
  suggestUpgrade,
} from './billing-plans'
