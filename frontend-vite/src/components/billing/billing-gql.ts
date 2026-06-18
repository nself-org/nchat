/**
 * Purpose:    GraphQL documents for the billing surface, targeting Hasura directly via
 *             @nself/graphql-client (urql) per canonical pattern §2 and the P3 API
 *             migration plan (nchat-api-migration-tickets.md). Usage + subscription +
 *             invoice reads are HASURA-direct; checkout (Stripe / crypto intent) is a
 *             BFF Action (billing plugin, 18 routes, N-2-S5) that is not live yet.
 * Inputs:     None — exports gql document strings + typed result shapes.
 * Outputs:    USAGE_QUERY, INVOICES_QUERY, CREATE_CHECKOUT_MUTATION.
 * Constraints:Tables are np_-prefixed and tenant/account scoped — Hasura permissions +
 *             RLS enforce authz (Multi-Tenant Convention Wall). No authz logic client-side.
 * SOT:        F-NCHAT-VITE-ROUTE — /billing
 */
import type { PlanTier, BillingInterval, PaymentStatus } from './billing-types'

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
