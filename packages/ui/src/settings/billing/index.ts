/**
 * Billing / payments / workspace / white-label settings barrel.
 *
 * @module settings/billing
 */

// Types
export type {
  BillingInterval,
  SubscriptionStatus,
  PlanInfo,
  SubscriptionInfo,
  PaymentMethod,
  Invoice,
  WorkspaceSettings as WorkspaceSettingsData,
  WorkspaceUpdatePayload,
  WhiteLabelSettings as WhiteLabelSettingsData,
  WhiteLabelUpdatePayload,
} from './types'

// Billing settings
export type { BillingSettingsAdapter, BillingSettingsProps } from './billing-settings'
export { BillingSettings } from './billing-settings'

// Workspace settings
export type { WorkspaceSettingsAdapter, WorkspaceSettingsProps } from './workspace-settings'
export { WorkspaceSettings } from './workspace-settings'

// White-label settings
export type { WhiteLabelSettingsAdapter, WhiteLabelSettingsProps } from './white-label-settings'
export { WhiteLabelSettings } from './white-label-settings'
