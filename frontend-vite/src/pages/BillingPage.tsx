/**
 * Purpose:    /billing — Billing & Subscriptions. Ported from legacy
 *             frontend/src/app/billing/page.tsx. Three tabs (Usage & Limits, Plans &
 *             Pricing, Billing History) plus a checkout dialog offering Stripe (card)
 *             and crypto payment. Usage + invoices load from Hasura via urql; the plan
 *             catalogue is static.
 * Inputs:     useAuth() (signed-in user); urql useQuery (BillingUsage, BillingInvoices);
 *             urql useMutation (BillingCreateCheckout).
 * Outputs:    The full billing screen. Selecting a plan opens the checkout dialog.
 * Constraints:Stripe checkout + the crypto payment-intent reconciliation are backend
 *             BFF Actions (billing plugin, Wave N-2-S5) that are NOT live yet — the
 *             usage/invoice queries degrade through AsyncScreen, and "Continue to
 *             Stripe" surfaces the mutation error until the Action lands (see
 *             backend_pending). No features are stubbed away.
 * SOT:        F-NCHAT-VITE-ROUTE — /billing
 */
import { useMemo, useState } from 'react'
import { useQuery, useMutation } from 'urql'
import { Button, AsyncScreen, EmptyState } from '@nself/ui'
import { ok, err, type Result, type AppError } from '@nself/errors'
import { PricingTable } from '@/components/billing/PricingTable'
import { UsageTracker } from '@/components/billing/UsageTracker'
import { CryptoPayment } from '@/components/billing/CryptoPayment'
import {
  PLANS,
  type PlanTier,
  type BillingInterval,
  type UsageLimits,
  type UsageWarning,
} from '@/components/billing/billing-types'
import {
  USAGE_QUERY,
  INVOICES_QUERY,
  CREATE_CHECKOUT_MUTATION,
  type UsageQueryData,
  type InvoicesQueryData,
  type InvoiceRow,
  type CreateCheckoutData,
  type CreateCheckoutVars,
} from '@/components/billing/billing-gql'

type Tab = 'usage' | 'plans' | 'history'

function toResult<T>(fetching: boolean, error: unknown, data: T | undefined): Result<T, AppError> | 'loading' {
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
function buildUsageLimits(data: UsageQueryData | undefined): UsageLimits | null {
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

export default function BillingPage() {
  const [tab, setTab] = useState<Tab>('usage')
  const [selectedPlan, setSelectedPlan] = useState<PlanTier | null>(null)
  const [selectedInterval, setSelectedInterval] = useState<BillingInterval>('month')
  const [payMethod, setPayMethod] = useState<'card' | 'crypto'>('card')
  const [showCheckout, setShowCheckout] = useState(false)

  const [usageRes, reexecUsage] = useQuery<UsageQueryData>({ query: USAGE_QUERY })
  const [invoiceRes, reexecInvoices] = useQuery<InvoicesQueryData>({ query: INVOICES_QUERY })
  const [checkoutState, createCheckout] = useMutation<CreateCheckoutData, CreateCheckoutVars>(
    CREATE_CHECKOUT_MUTATION,
  )

  const usageLimits = useMemo(() => buildUsageLimits(usageRes.data), [usageRes.data])
  const currentPlan: PlanTier = usageLimits?.plan ?? 'free'

  const handleSelectPlan = (planId: PlanTier, interval: BillingInterval) => {
    setSelectedPlan(planId)
    setSelectedInterval(interval)
    setPayMethod('card')
    setShowCheckout(true)
  }

  const handleStripeCheckout = async () => {
    if (!selectedPlan) return
    const result = await createCheckout({ plan: selectedPlan, interval: selectedInterval })
    const url = result.data?.billing_create_checkout?.checkoutUrl
    if (url) window.location.assign(url)
  }

  const TABS: ReadonlyArray<{ id: Tab; label: string }> = [
    { id: 'usage', label: 'Usage & Limits' },
    { id: 'plans', label: 'Plans & Pricing' },
    { id: 'history', label: 'Billing History' },
  ]

  return (
    <div className="mx-auto max-w-7xl space-y-8 py-2">
      <header>
        <h1 className="text-3xl font-bold text-slate-100">Billing &amp; Subscriptions</h1>
        <p className="mt-2 text-slate-400">Manage your subscription, usage, and payment methods</p>
      </header>

      {/* Tabs */}
      <div role="tablist" className="flex gap-2 border-b border-slate-800">
        {TABS.map((tabItem) => (
          <button
            key={tabItem.id}
            role="tab"
            aria-selected={tab === tabItem.id}
            onClick={() => setTab(tabItem.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              tab === tabItem.id
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tabItem.label}
          </button>
        ))}
      </div>

      {/* Usage */}
      {tab === 'usage' && (
        <AsyncScreen<UsageQueryData>
          result={toResult(usageRes.fetching, usageRes.error, usageRes.data)}
          emptyCheck={(d) => (d.np_billing_usage?.length ?? 0) === 0}
          onRetry={() => reexecUsage({ requestPolicy: 'network-only' })}
          slots={{
            empty: (
              <EmptyState
                heading="No usage data yet"
                body="Usage metrics appear once your workspace records its first billing period."
              />
            ),
          }}
          renderData={() =>
            usageLimits ? (
              <UsageTracker limits={usageLimits} onUpgrade={() => setTab('plans')} />
            ) : (
              <EmptyState heading="No usage data yet" body="Usage metrics are not available." />
            )
          }
        />
      )}

      {/* Plans */}
      {tab === 'plans' && (
        <PricingTable currentPlan={currentPlan} onSelectPlan={handleSelectPlan} />
      )}

      {/* History */}
      {tab === 'history' && (
        <AsyncScreen<InvoicesQueryData>
          result={toResult(invoiceRes.fetching, invoiceRes.error, invoiceRes.data)}
          emptyCheck={(d) => (d.np_billing_invoices?.length ?? 0) === 0}
          onRetry={() => reexecInvoices({ requestPolicy: 'network-only' })}
          slots={{
            empty: <EmptyState heading="No billing history yet" body="Paid invoices appear here." />,
          }}
          renderData={(d) => (
            <div className="overflow-hidden rounded-lg border border-slate-800">
              <table className="w-full text-sm">
                <thead className="bg-slate-900 text-left text-slate-400">
                  <tr>
                    <th className="px-4 py-2 font-medium">Date</th>
                    <th className="px-4 py-2 font-medium">Amount</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {d.np_billing_invoices.map((inv: InvoiceRow) => (
                    <tr key={inv.id} className="border-t border-slate-800 text-slate-300">
                      <td className="px-4 py-2">{new Date(inv.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-2">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: inv.currency }).format(
                          inv.amount,
                        )}
                      </td>
                      <td className="px-4 py-2 capitalize">{inv.status}</td>
                      <td className="px-4 py-2 text-right">
                        {inv.download_url && (
                          <a
                            href={inv.download_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sky-400 hover:underline"
                          >
                            Download
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        />
      )}

      {/* Checkout dialog */}
      {showCheckout && selectedPlan && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowCheckout(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl space-y-5 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h2 className="text-xl font-semibold text-slate-100">Complete Your Subscription</h2>
              <p className="text-sm text-slate-400">
                Subscribe to {PLANS[selectedPlan].name} — choose your payment method
              </p>
            </div>

            <div role="tablist" className="grid grid-cols-2 gap-2 rounded-md border border-slate-800 p-1">
              <button
                role="tab"
                aria-selected={payMethod === 'card'}
                onClick={() => setPayMethod('card')}
                className={`rounded px-3 py-2 text-sm ${
                  payMethod === 'card' ? 'bg-sky-500 text-white' : 'text-slate-300'
                }`}
              >
                Credit Card (Stripe)
              </button>
              <button
                role="tab"
                aria-selected={payMethod === 'crypto'}
                onClick={() => setPayMethod('crypto')}
                className={`rounded px-3 py-2 text-sm ${
                  payMethod === 'crypto' ? 'bg-sky-500 text-white' : 'text-slate-300'
                }`}
              >
                Cryptocurrency
              </button>
            </div>

            {payMethod === 'card' ? (
              <div className="space-y-4">
                <p className="text-sm text-slate-400">
                  You&apos;ll be redirected to Stripe to complete your payment securely.
                </p>
                {checkoutState.error && (
                  <p className="text-sm text-red-400">
                    Checkout is not available yet: {checkoutState.error.message}
                  </p>
                )}
                <Button
                  variant="primary"
                  loading={checkoutState.fetching}
                  onClick={() => void handleStripeCheckout()}
                >
                  Continue to Stripe
                </Button>
              </div>
            ) : (
              <CryptoPayment
                planId={selectedPlan}
                interval={selectedInterval}
                onPaymentComplete={() => setShowCheckout(false)}
              />
            )}

            <div className="text-right">
              <Button variant="ghost" onClick={() => setShowCheckout(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
