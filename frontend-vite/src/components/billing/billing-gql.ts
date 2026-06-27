/**
 * Purpose:    GraphQL documents for the billing surface + page-level utility helpers
 *             (toResult, buildUsageLimits) extracted from BillingPage.tsx to stay within
 *             the 300-line file cap. Usage + subscription + invoice reads are HASURA-direct
 *             via urql (@nself/graphql-client); checkout (Stripe / crypto intent) is a
 *             BFF Action (billing plugin, 18 routes, N-2-S5) that is not live yet.
 * Inputs:     None — exports gql document strings, typed result shapes, and pure helpers.
 * Outputs:    USAGE_QUERY, INVOICES_QUERY, CREATE_CHECKOUT_MUTATION, toResult, buildUsageLimits.
 * Constraints:Tables are np_-prefixed and tenant/account scoped — Hasura permissions +
 *             RLS enforce authz (Multi-Tenant Convention Wall). No authz logic client-side.
 * SOT:        F-NCHAT-VITE-ROUTE — /billing
 */
import { ok, err, type Result, type AppError } from '@nself/errors'
import type { PlanTier, BillingInterval, PaymentStatus, UsageLimits, UsageWarning } from './billing-types'
import { PLANS } from './billing-plans'

/**
 * Current account usage + plan. Maps the legacy `/api/billing/usage` route to a
 * HASURA-direct read of np_billing_usage (one row per account/period). RLS scopes
 * to the caller's source_account_id / tenant_id.
 */
export const USAGE_QUERY = /* GraphQL */ `
  query BillingUsage {
    np_billing_usage(order_by: { period: desc }, limit: 1) {
      plan
      period
      users
      channels
      messages
      storage_gb
      integrations
      bots
      ai_minutes
      ai_queries
      call_minutes
      recording_gb
    }
  }
`

export interface UsageRow {
  plan: PlanTier
  period: string
  users: number
  channels: number
  messages: number
  storage_gb: number
  integrations: number
  bots: number
  ai_minutes: number
  ai_queries: number
  call_minutes: number
  recording_gb: number
}

export interface UsageQueryData {
  np_billing_usage: UsageRow[]
}

/** Billing history. Legacy `/api/billing/invoices` → HASURA-direct read of np_billing_invoices. */
export const INVOICES_QUERY = /* GraphQL */ `
  query BillingInvoices {
    np_billing_invoices(order_by: { created_at: desc }, limit: 50) {
      id
      amount
      currency
      status
      created_at
      paid_at
      download_url
    }
  }
`

export interface InvoiceRow {
  id: string
  amount: number
  currency: string
  status: PaymentStatus
  created_at: string
  paid_at: string | null
  download_url: string | null
}

export interface InvoicesQueryData {
  np_billing_invoices: InvoiceRow[]
}

/**
 * Stripe Checkout session creation. Legacy `/api/billing/checkout` → backend billing
 * plugin Action `billing_create_checkout` (Stripe SDK runs server-side; N-2-S5 BFF).
 * Returns a hosted-checkout URL the SPA redirects to. NOT YET LIVE backend-side.
 */
export const CREATE_CHECKOUT_MUTATION = /* GraphQL */ `
  mutation BillingCreateCheckout($plan: String!, $interval: String!) {
    billing_create_checkout(plan: $plan, interval: $interval) {
      checkoutUrl
    }
  }
`

export interface CreateCheckoutVars {
  plan: PlanTier
  interval: BillingInterval
}

export interface CreateCheckoutData {
  billing_create_checkout: { checkoutUrl: string }
}

// ─── Page-level helpers (extracted from BillingPage.tsx) ──────────────────────

/** Converts a urql result tuple into an AppError-typed Result (or 'loading'). */
export function toResult<T>(fetching: boolean, error: unknown, data: T | undefined): Result<T, AppError> | 'loading' {
  if (fetching) return 'loading'
  if (error) {
    return err({
      code: 'internal',
      status: 500,
      message: error instanceof Error ? error.message : 'Request failed',
    } satisfies AppError)
  }
  return ok((data ?? ([] as unknown as T)) as T)
}

/** Build UsageLimits (warnings + exceeded) from a usage row against the plan's features. */
export function buildUsageLimits(data: UsageQueryData | undefined): UsageLimits | null {
  const row = data?.np_billing_usage?.[0]
  if (!row) return null
  const limits = PLANS[row.plan].features
  const current = {
    userId: '',
    period: row.period,
    users: row.users,
    channels: row.channels,
    messages: row.messages,
    storageGB: row.storage_gb,
    integrations: row.integrations,
    bots: row.bots,
    aiMinutes: row.ai_minutes,
    aiQueries: row.ai_queries,
    callMinutes: row.call_minutes,
    recordingGB: row.recording_gb,
  }
  const checks: ReadonlyArray<[string, number, number | null]> = [
    ['Users', current.users, limits.maxUsers],
    ['Channels', current.channels, limits.maxChannels],
    ['Messages', current.messages, limits.maxMessagesPerMonth],
    ['Storage', current.storageGB, limits.maxStorageGB],
  ]
  const warnings: UsageWarning[] = []
  let exceeded = false
  for (const [feature, used, limit] of checks) {
    if (limit === null || limit === 0) continue
    const pct = (used / limit) * 100
    if (pct >= 100) exceeded = true
    if (pct >= 75) {
      warnings.push({
        feature,
        current: used,
        limit,
        percentage: pct,
        severity: pct >= 100 ? 'critical' : pct >= 90 ? 'warning' : 'info',
      })
    }
  }
  return { plan: row.plan, current, limits, warnings, exceeded }
}
