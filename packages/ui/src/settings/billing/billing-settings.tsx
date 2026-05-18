/**
 * Billing settings — subscription info, payment methods, invoice history.
 * Injectable BillingSettingsAdapter replaces store/context deps.
 *
 * @module settings/billing/billing-settings
 */

'use client'

import * as React from 'react'
import { cn } from '../../lib/utils'
import type {
  SubscriptionInfo,
  PaymentMethod,
  Invoice,
  PlanInfo,
  BillingInterval,
} from './types'
import { SettingsSectionCard } from '../settings-layout'

// ============================================================================
// Adapter
// ============================================================================

export interface BillingSettingsAdapter {
  subscription: SubscriptionInfo
  paymentMethods: PaymentMethod[]
  invoices: Invoice[]
  availablePlans: PlanInfo[]
  isLoading?: boolean
  isSaving?: boolean
  onSelectPlan: (planId: string, interval: BillingInterval) => void | Promise<void>
  onAddPaymentMethod: () => void
  onSetDefaultPaymentMethod: (methodId: string) => void | Promise<void>
  onRemovePaymentMethod: (methodId: string) => void | Promise<void>
  onCancelSubscription: () => void | Promise<void>
  onResumeSubscription: () => void | Promise<void>
  onDownloadInvoice: (invoiceId: string) => void
}

export interface BillingSettingsProps {
  adapter: BillingSettingsAdapter
  className?: string
}

// ============================================================================
// Helpers
// ============================================================================

function StatusBadge({ status }: { status: SubscriptionInfo['status'] }) {
  const styles: Record<typeof status, string> = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    trialing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    past_due: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    canceled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    none: 'bg-muted text-muted-foreground',
  }
  const labels: Record<typeof status, string> = {
    active: 'Active',
    trialing: 'Trial',
    past_due: 'Past due',
    canceled: 'Canceled',
    none: 'No plan',
  }
  return (
    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', styles[status])}>
      {labels[status]}
    </span>
  )
}

function InvoiceStatusBadge({ status }: { status: Invoice['status'] }) {
  const styles: Record<typeof status, string> = {
    paid: 'text-green-600 dark:text-green-400',
    open: 'text-yellow-600 dark:text-yellow-400',
    void: 'text-muted-foreground',
    uncollectible: 'text-red-600 dark:text-red-400',
  }
  return <span className={cn('text-xs font-medium capitalize', styles[status])}>{status}</span>
}

// ============================================================================
// Card icon (credit card brand)
// ============================================================================

function CardIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('h-5 w-8', className)} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  )
}

// ============================================================================
// Billing Settings
// ============================================================================

export function BillingSettings({ adapter, className }: BillingSettingsProps) {
  const {
    subscription,
    paymentMethods,
    invoices,
    availablePlans,
    isLoading,
    isSaving,
    onSelectPlan,
    onAddPaymentMethod,
    onSetDefaultPaymentMethod,
    onRemovePaymentMethod,
    onCancelSubscription,
    onResumeSubscription,
    onDownloadInvoice,
  } = adapter

  const [interval, setInterval] = React.useState<BillingInterval>('monthly')

  if (isLoading) {
    return (
      <div className={cn('space-y-6', className)}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg border bg-muted/40" />
        ))}
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Current plan */}
      <SettingsSectionCard title="Current plan">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            {subscription.plan ? (
              <>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{subscription.plan.name}</p>
                  <StatusBadge status={subscription.status} />
                </div>
                <p className="text-sm text-muted-foreground">{subscription.plan.price}</p>
                {subscription.currentPeriodEnd && (
                  <p className="text-xs text-muted-foreground">
                    {subscription.cancelAtPeriodEnd ? 'Cancels' : 'Renews'} on{' '}
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                  </p>
                )}
                {subscription.trialEnd && (
                  <p className="text-xs text-muted-foreground">
                    Trial ends {new Date(subscription.trialEnd).toLocaleDateString()}
                  </p>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2">
                <p className="font-medium">Free plan</p>
                <StatusBadge status="none" />
              </div>
            )}
          </div>

          {subscription.status === 'active' && !subscription.cancelAtPeriodEnd && (
            <button
              type="button"
              onClick={onCancelSubscription}
              disabled={isSaving}
              className={cn(
                'shrink-0 rounded-md px-3 py-1.5 text-sm text-destructive',
                'hover:bg-destructive/10 transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              Cancel plan
            </button>
          )}

          {subscription.cancelAtPeriodEnd && (
            <button
              type="button"
              onClick={onResumeSubscription}
              disabled={isSaving}
              className={cn(
                'shrink-0 rounded-md border px-3 py-1.5 text-sm',
                'hover:bg-accent transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              Resume plan
            </button>
          )}
        </div>
      </SettingsSectionCard>

      {/* Available plans */}
      {availablePlans.length > 0 && (
        <SettingsSectionCard title="Upgrade plan">
          {/* Interval toggle */}
          <div className="mb-4 flex gap-2">
            {(['monthly', 'annual'] as const).map((iv) => (
              <button
                key={iv}
                type="button"
                onClick={() => setInterval(iv)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm capitalize transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  interval === iv
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'border hover:bg-accent'
                )}
              >
                {iv === 'annual' ? 'Annual (save ~16%)' : 'Monthly'}
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {availablePlans.map((plan) => {
              const isCurrent = subscription.plan?.id === plan.id
              return (
                <div
                  key={plan.id}
                  className={cn(
                    'rounded-lg border p-4 space-y-3',
                    isCurrent && 'border-primary ring-1 ring-primary'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{plan.name}</p>
                    {isCurrent && (
                      <span className="text-xs text-primary font-medium">Current</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{plan.price}</p>
                  <ul className="space-y-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <svg viewBox="0 0 16 16" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 8l3.5 3.5L13 4" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  {!isCurrent && (
                    <button
                      type="button"
                      onClick={() => onSelectPlan(plan.id, interval)}
                      disabled={isSaving}
                      className={cn(
                        'w-full rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground',
                        'hover:bg-primary/90 transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        'disabled:opacity-50 disabled:cursor-not-allowed'
                      )}
                    >
                      Select plan
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </SettingsSectionCard>
      )}

      {/* Payment methods */}
      <SettingsSectionCard title="Payment methods">
        <div className="space-y-3">
          {paymentMethods.length === 0 && (
            <p className="text-sm text-muted-foreground">No payment methods added.</p>
          )}
          {paymentMethods.map((method) => (
            <div
              key={method.id}
              className="flex items-center gap-3 rounded-md border p-3"
            >
              <CardIcon className="shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium capitalize">
                  {method.brand} ending in {method.last4}
                  {method.isDefault && (
                    <span className="ml-2 text-xs text-muted-foreground">(default)</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  Expires {method.expiryMonth}/{method.expiryYear}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                {!method.isDefault && (
                  <button
                    type="button"
                    onClick={() => onSetDefaultPaymentMethod(method.id)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Set default
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onRemovePaymentMethod(method.id)}
                  className="text-xs text-destructive hover:text-destructive/80"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={onAddPaymentMethod}
            className={cn(
              'flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground',
              'hover:bg-accent hover:text-foreground transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            )}
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3v10M3 8h10" />
            </svg>
            Add payment method
          </button>
        </div>
      </SettingsSectionCard>

      {/* Invoices */}
      {invoices.length > 0 && (
        <SettingsSectionCard title="Billing history">
          <div className="divide-y">
            {invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{inv.amount}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(inv.date).toLocaleDateString()}
                    </span>
                    <InvoiceStatusBadge status={inv.status} />
                  </div>
                </div>
                {inv.downloadUrl && (
                  <button
                    type="button"
                    onClick={() => onDownloadInvoice(inv.id)}
                    className={cn(
                      'rounded-md px-2.5 py-1 text-xs',
                      'hover:bg-accent transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                    )}
                  >
                    Download
                  </button>
                )}
              </div>
            ))}
          </div>
        </SettingsSectionCard>
      )}
    </div>
  )
}
