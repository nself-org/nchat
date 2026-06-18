/**
 * Purpose:    Ported /admin/billing — billing dashboard (plan, revenue stats, subscriptions) from
 *             the legacy BillingDashboard. Billing data flows through the backend Stripe billing
 *             plugin (BFF, per api-migration N-2-S5); until that Action is live the subscription
 *             table renders AsyncScreen states and revenue tiles show placeholders.
 * SOT:        F-NCHAT-VITE-ROUTE — /admin/billing
 */
import { CreditCard, DollarSign, Users, TrendingUp } from 'lucide-react'
import { AsyncScreen, Button } from '@nself/ui'
import { ok } from '@nself/errors'
import { AdminGate, AdminPage, AdminPageHeader, AdminSection } from '@/components/admin/AdminScaffold'
import { StatsCard, StatsGrid, Badge } from '@/components/admin/AdminPrimitives'

interface Subscription {
  id: string
  customer: string
  plan: string
  status: 'active' | 'past_due' | 'canceled'
  amount: string
}

export default function AdminBillingPage() {
  // Stripe billing plugin (BFF) not live yet → empty AsyncScreen state.
  const subs = ok<readonly Subscription[]>([])
  return (
    <AdminGate>
      <AdminPage>
        <AdminPageHeader
          icon={<CreditCard className="h-7 w-7" />}
          title="Billing"
          description="View billing stats, revenue, and manage subscriptions"
        />

        <StatsGrid columns={4}>
          <StatsCard title="MRR" value="—" description="Monthly recurring" icon={<DollarSign className="h-4 w-4" />} />
          <StatsCard title="Active Subs" value="—" description="Paying customers" icon={<Users className="h-4 w-4" />} />
          <StatsCard title="ARPU" value="—" description="Avg. revenue / user" icon={<TrendingUp className="h-4 w-4" />} />
          <StatsCard title="Churn" value="—" description="Last 30 days" icon={<TrendingUp className="h-4 w-4" />} />
        </StatsGrid>

        <AdminSection
          title="Subscriptions"
          description="Active subscriptions managed via the nSelf billing plugin (Stripe)."
          actions={<Button variant="secondary" size="sm">Open Stripe</Button>}
        >
          <AsyncScreen<readonly Subscription[]>
            result={subs}
            emptyCheck={(s) => s.length === 0}
            renderData={(rows) => (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-left text-slate-400">
                    <th className="py-2">Customer</th>
                    <th className="py-2">Plan</th>
                    <th className="py-2">Status</th>
                    <th className="py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => (
                    <tr key={s.id} className="border-b border-slate-800/60">
                      <td className="py-2 text-slate-200">{s.customer}</td>
                      <td className="py-2 text-slate-300">{s.plan}</td>
                      <td className="py-2">
                        <Badge tone={s.status === 'active' ? 'success' : s.status === 'past_due' ? 'warning' : 'secondary'}>
                          {s.status}
                        </Badge>
                      </td>
                      <td className="py-2 text-right text-slate-300">{s.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            slots={{
              empty: (
                <p className="py-8 text-center text-sm text-slate-400">
                  No subscriptions yet. Customer subscriptions appear here once the billing plugin is connected to Stripe.
                </p>
              ),
            }}
          />
        </AdminSection>
      </AdminPage>
    </AdminGate>
  )
}
