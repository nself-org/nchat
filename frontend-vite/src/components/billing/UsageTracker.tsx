/**
 * Purpose:    Usage + limits dashboard — ported from legacy
 *             frontend/src/components/billing/UsageTracker.tsx. Shows current-plan
 *             header, limit-warning alerts, per-metric progress bars, detailed
 *             warning cards, and an upgrade suggestion when limits are exceeded.
 * Inputs:     limits (UsageLimits, sourced from Hasura np_billing_usage), onUpgrade().
 * Outputs:    Usage overview UI; fires onUpgrade when the suggested-plan CTA is clicked.
 * Constraints:Presentational. Progress colours follow the legacy thresholds
 *             (75/90/100%). No data fetching here — the page owns the query.
 * SOT:        F-NCHAT-VITE-ROUTE — /billing
 */
import { AlertTriangle, TrendingUp, CheckCircle2 } from 'lucide-react'
import { Button } from '@nself/ui'
import {
  PLANS,
  getUsagePercentage,
  formatUsage,
  suggestUpgrade,
  type UsageLimits,
  type UsageWarning,
} from './billing-types'

interface UsageTrackerProps {
  limits: UsageLimits
  onUpgrade?: () => void
}

function usageColor(p: number): string {
  if (p >= 100) return 'text-red-400'
  if (p >= 90) return 'text-orange-400'
  if (p >= 75) return 'text-yellow-400'
  return 'text-emerald-400'
}

function progressColor(p: number): string {
  if (p >= 100) return 'bg-red-500'
  if (p >= 90) return 'bg-orange-500'
  if (p >= 75) return 'bg-yellow-500'
  return 'bg-emerald-500'
}

function UsageItem({
  label,
  current,
  limit,
  unit = '',
}: {
  label: string
  current: number
  limit: number | null
  unit?: string
}) {
  const pct = getUsagePercentage(current, limit)
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-200">{label}</span>
        <span className={usageColor(pct)}>{formatUsage(current, limit, unit)}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full ${progressColor(pct)}`} style={{ width: `${pct}%` }} />
      </div>
      {pct >= 90 && (
        <p className="text-xs text-slate-400">{pct >= 100 ? 'Limit reached' : 'Approaching limit'}</p>
      )}
    </div>
  )
}

function WarningCard({ warning }: { warning: UsageWarning }) {
  const Icon = warning.severity === 'critical' ? AlertTriangle : TrendingUp
  const border =
    warning.severity === 'critical'
      ? 'border-red-500/60'
      : warning.severity === 'warning'
        ? 'border-orange-500/60'
        : 'border-sky-500/60'
  const iconColor =
    warning.severity === 'critical'
      ? 'text-red-400'
      : warning.severity === 'warning'
        ? 'text-orange-400'
        : 'text-sky-400'
  return (
    <div className={`flex items-start gap-3 rounded-lg border ${border} bg-slate-900 p-3`}>
      <Icon className={`mt-0.5 h-5 w-5 ${iconColor}`} />
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium text-slate-200">{warning.feature}</p>
        <p className="text-xs text-slate-400">
          Using {warning.current.toLocaleString()} of {warning.limit.toLocaleString()} (
          {warning.percentage.toFixed(1)}%)
        </p>
      </div>
      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
        {warning.severity}
      </span>
    </div>
  )
}

export function UsageTracker({ limits, onUpgrade }: UsageTrackerProps) {
  const { current, limits: planLimits, warnings, exceeded, plan } = limits
  const suggested = exceeded ? suggestUpgrade(plan) : null

  return (
    <div className="space-y-6">
      {/* Current plan */}
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-100">
              Current Plan: {PLANS[plan].name}
            </h3>
            <p className="text-sm text-slate-400">{PLANS[plan].description}</p>
          </div>
          <span className="rounded-md border border-slate-700 px-4 py-2 text-lg text-slate-200">
            {plan === 'free' ? 'Free' : `$${PLANS[plan].price.monthly}/mo`}
          </span>
        </div>
      </div>

      {/* Limit alert */}
      {warnings.length > 0 && (
        <div
          className={`flex items-start gap-3 rounded-lg border p-4 ${
            exceeded ? 'border-red-500/60 bg-red-950/30' : 'border-slate-700 bg-slate-900'
          }`}
        >
          <AlertTriangle className={`mt-0.5 h-4 w-4 ${exceeded ? 'text-red-400' : 'text-slate-300'}`} />
          <div>
            <p className="font-medium text-slate-100">
              {exceeded ? 'Usage Limits Exceeded' : 'Approaching Usage Limits'}
            </p>
            <p className="text-sm text-slate-400">
              {exceeded
                ? 'You have exceeded your plan limits. Some features may be restricted.'
                : 'You are approaching your plan limits. Consider upgrading to avoid interruption.'}
            </p>
          </div>
        </div>
      )}

      {/* Usage metrics */}
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
        <h3 className="text-lg font-semibold text-slate-100">Usage Overview</h3>
        <p className="mb-4 text-sm text-slate-400">Current usage for the billing period</p>
        <div className="space-y-6">
          <UsageItem label="Users" current={current.users} limit={planLimits.maxUsers} />
          <UsageItem label="Channels" current={current.channels} limit={planLimits.maxChannels} />
          <UsageItem
            label="Messages"
            current={current.messages}
            limit={planLimits.maxMessagesPerMonth}
          />
          <UsageItem
            label="Storage"
            current={current.storageGB}
            limit={planLimits.maxStorageGB}
            unit="GB"
          />
          <UsageItem
            label="Integrations"
            current={current.integrations}
            limit={planLimits.maxIntegrations}
          />
          <UsageItem label="Bots" current={current.bots} limit={planLimits.maxBots} />
          {planLimits.aiModerationMinutes !== null && (
            <UsageItem
              label="AI Minutes"
              current={current.aiMinutes}
              limit={planLimits.aiModerationMinutes}
              unit=" min"
            />
          )}
          {planLimits.aiSearchQueries !== null && (
            <UsageItem
              label="AI Search Queries"
              current={current.aiQueries}
              limit={planLimits.aiSearchQueries}
            />
          )}
        </div>
      </div>

      {/* Detailed warnings */}
      {warnings.length > 0 && (
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
          <h3 className="text-lg font-semibold text-slate-100">Usage Alerts</h3>
          <p className="mb-3 text-sm text-slate-400">Features requiring attention</p>
          <div className="space-y-3">
            {warnings.map((w, i) => (
              <WarningCard key={i} warning={w} />
            ))}
          </div>
        </div>
      )}

      {/* Upgrade suggestion */}
      {suggested && onUpgrade && (
        <div className="rounded-lg border border-sky-500 bg-slate-900 p-5">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
            <TrendingUp className="h-5 w-5" />
            Upgrade Recommended
          </h3>
          <p className="mb-4 text-sm text-slate-400">
            The {PLANS[suggested].name} plan would accommodate your current usage
          </p>
          <div className="mb-4 grid gap-2 text-sm text-slate-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>
                {PLANS[suggested].features.maxUsers === null
                  ? 'Unlimited users'
                  : `Up to ${PLANS[suggested].features.maxUsers} users`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>
                {PLANS[suggested].features.maxStorageGB === null
                  ? 'Unlimited storage'
                  : `${PLANS[suggested].features.maxStorageGB}GB storage`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>
                {PLANS[suggested].features.maxMessagesPerMonth === null
                  ? 'Unlimited messages'
                  : `${PLANS[suggested].features.maxMessagesPerMonth.toLocaleString()} messages/month`}
              </span>
            </div>
          </div>
          <Button variant="primary" size="lg" onClick={onUpgrade}>
            Upgrade to {PLANS[suggested].name} - ${PLANS[suggested].price.monthly}/month
          </Button>
        </div>
      )}
    </div>
  )
}
