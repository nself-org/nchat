/**
 * Types for billing / payments / workspace settings domain.
 *
 * @module settings/billing/types
 */

// ============================================================================
// Billing / subscription
// ============================================================================

export type BillingInterval = 'monthly' | 'annual'
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing' | 'none'

export interface PlanInfo {
  id: string
  name: string
  /** Display price string e.g. "$3.99/mo" */
  price: string
  interval: BillingInterval
  features: string[]
}

export interface SubscriptionInfo {
  status: SubscriptionStatus
  plan: PlanInfo | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  trialEnd: string | null
}

export interface PaymentMethod {
  id: string
  brand: string
  last4: string
  expiryMonth: number
  expiryYear: number
  isDefault: boolean
}

export interface Invoice {
  id: string
  date: string
  amount: string
  status: 'paid' | 'open' | 'void' | 'uncollectible'
  downloadUrl: string | null
}

// ============================================================================
// Workspace settings
// ============================================================================

export interface WorkspaceSettings {
  name: string
  slug: string
  description: string | null
  iconUrl: string | null
  /** Hex color for workspace icon background */
  iconColor: string | null
  allowInvites: boolean
  allowPublicChannels: boolean
  defaultRole: 'admin' | 'moderator' | 'member' | 'guest'
  joinApproval: 'open' | 'invite' | 'approval'
}

export interface WorkspaceUpdatePayload {
  name?: string
  description?: string | null
  iconUrl?: string | null
  iconColor?: string | null
  allowInvites?: boolean
  allowPublicChannels?: boolean
  defaultRole?: WorkspaceSettings['defaultRole']
  joinApproval?: WorkspaceSettings['joinApproval']
}

// ============================================================================
// White-label settings
// ============================================================================

export interface WhiteLabelSettings {
  enabled: boolean
  appName: string
  appIconUrl: string | null
  primaryColor: string
  accentColor: string
  hideNselfBranding: boolean
  customDomain: string | null
  customCss: string | null
}

export interface WhiteLabelUpdatePayload {
  appName?: string
  appIconUrl?: string | null
  primaryColor?: string
  accentColor?: string
  hideNselfBranding?: boolean
  customDomain?: string | null
  customCss?: string | null
}
