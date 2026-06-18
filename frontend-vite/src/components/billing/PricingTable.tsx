/**
 * Purpose:    Subscription pricing table — ported from legacy
 *             frontend/src/components/billing/PricingTable.tsx. Renders all plan tiers
 *             with a monthly/yearly toggle, key features, and a select CTA per plan.
 * Inputs:     currentPlan, onSelectPlan(planId, interval), showAnnualSavings.
 * Outputs:    Interactive pricing grid; calls onSelectPlan for non-enterprise tiers.
 * Constraints:Presentational. Enterprise routes to the contact-sales page via <Link>;
 *             "compare" link kept as a route Link (no window.location, react-router).
 * SOT:        F-NCHAT-VITE-ROUTE — /billing
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Zap, Shield, Sparkles } from 'lucide-react'
import { Button } from '@nself/ui'
import {
  PLANS,
  calculateAnnualSavings,
  formatPrice,
  type Plan,
  type PlanTier,
  type BillingInterval,
} from './billing-types'

interface PricingTableProps {
  currentPlan?: PlanTier
  onSelectPlan?: (planId: PlanTier, interval: BillingInterval) => void
  showAnnualSavings?: boolean
}

function planIcon(id: PlanTier) {
  switch (id) {
    case 'starter':
      return <Zap className="h-6 w-6" />
    case 'pro':
      return <Sparkles className="h-6 w-6" />
    case 'business':
    case 'enterprise':
      return <Shield className="h-6 w-6" />
    default:
      return null
  }
}

export function PricingTable({
  currentPlan = 'free',
  onSelectPlan,
  showAnnualSavings = true,
}: PricingTableProps) {
  const [interval, setInterval] = useState<BillingInterval>('month')
  const plans = Object.values(PLANS)

  const isCurrent = (id: PlanTier) => id === currentPlan
  const buttonText = (plan: Plan) => {
    if (plan.id === currentPlan) return 'Current Plan'
    if (plan.id === 'free') return 'Get Started'
    if (plan.id === 'enterprise') return 'Contact Sales'
    return 'Upgrade'
  }

  return (
    <div className="space-y-8">
      {/* Billing interval toggle */}
      <div className="flex items-center justify-center gap-3">
        <span className="text-sm text-slate-300">Monthly</span>
        <button
          type="button"
          role="switch"
          aria-checked={interval === 'year'}
          aria-label="Toggle annual billing"
          onClick={() => setInterval((i) => (i === 'year' ? 'month' : 'year'))}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            interval === 'year' ? 'bg-sky-500' : 'bg-slate-700'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              interval === 'year' ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <span className="text-sm text-slate-300">
          Yearly
          {showAnnualSavings && (
            <span className="ms-2 text-xs text-emerald-400">Save up to 17%</span>
          )}
        </span>
      </div>

      {/* Plans grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => {
          const price = interval === 'month' ? plan.price.monthly : plan.price.yearly / 12
          const annualSavings = calculateAnnualSavings(plan)
          const isPopular = plan.popular || plan.recommended
          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-lg border bg-slate-900 p-5 ${
                isCurrent(plan.id)
                  ? 'border-2 border-emerald-500'
                  : isPopular
                    ? 'border-sky-500 shadow-lg'
                    : 'border-slate-800'
              }`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-sky-500 px-3 py-0.5 text-xs font-medium text-white">
                    {plan.recommended ? 'Recommended' : 'Popular'}
                  </span>
                </div>
              )}

              <div className="mb-3 flex items-center gap-2 text-sky-300">
                {planIcon(plan.id)}
                <h3 className="text-xl font-semibold text-slate-100">{plan.name}</h3>
              </div>
              <p className="mb-4 text-sm text-slate-400">{plan.description}</p>

              <div className="mb-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-slate-100">{formatPrice(price)}</span>
                  {price > 0 && <span className="text-sm text-slate-400">/month</span>}
                </div>
                {interval === 'year' && price > 0 && (
                  <p className="mt-1 text-xs text-slate-400">
                    Billed {formatPrice(plan.price.yearly)} annually
                  </p>
                )}
                {showAnnualSavings && interval === 'year' && annualSavings > 0 && (
                  <p className="mt-1 text-xs text-emerald-400">
                    Save {formatPrice(annualSavings)} per year
                  </p>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <p className="text-sm font-medium text-slate-200">Key Features:</p>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 text-emerald-400" />
                    <span>
                      {plan.features.maxUsers === null
                        ? 'Unlimited users'
                        : `Up to ${plan.features.maxUsers} users`}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 text-emerald-400" />
                    <span>
                      {plan.features.maxStorageGB === null
                        ? 'Unlimited storage'
                        : `${plan.features.maxStorageGB}GB storage`}
                    </span>
                  </li>
                  {plan.features.videoConferencing && (
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 text-emerald-400" />
                      <span>Video calls ({plan.features.maxCallParticipants} participants)</span>
                    </li>
                  )}
                  {plan.features.customBranding && (
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 text-emerald-400" />
                      <span>Custom branding</span>
                    </li>
                  )}
                  {plan.features.advancedAnalytics && (
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 text-emerald-400" />
                      <span>Advanced analytics</span>
                    </li>
                  )}
                  {plan.features.prioritySupport && (
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 text-emerald-400" />
                      <span>Priority support</span>
                    </li>
                  )}
                  {plan.features.tokenGating && (
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 text-emerald-400" />
                      <span>NFT token gating</span>
                    </li>
                  )}
                </ul>
              </div>

              <div className="mt-5">
                {plan.id === 'enterprise' ? (
                  <Link to="/contact-sales">
                    <Button variant="secondary" disabled={isCurrent(plan.id)}>
                      {buttonText(plan)}
                    </Button>
                  </Link>
                ) : (
                  <Button
                    variant={isPopular ? 'primary' : 'secondary'}
                    disabled={isCurrent(plan.id)}
                    onClick={() => onSelectPlan?.(plan.id, interval)}
                  >
                    {buttonText(plan)}
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="text-center">
        <Link to="/billing/compare" className="text-sm text-sky-400 hover:underline">
          View detailed feature comparison →
        </Link>
      </div>
    </div>
  )
}
