/**
 * Purpose:    Ported /admin/performance — performance monitoring dashboard (Web Vitals + system
 *             metrics) from the legacy PerformanceMonitor. Metrics surface renders AsyncScreen
 *             states until the observability/metrics Action is live.
 * SOT:        F-NCHAT-VITE-ROUTE — /admin/performance
 */
import { Gauge, Cpu, Database, Zap } from 'lucide-react'
import { AsyncScreen } from '@nself/ui'
import { ok } from '@nself/errors'
import { AdminGate, AdminPage, AdminPageHeader, AdminSection } from '@/components/admin/AdminScaffold'
import { StatsCard, StatsGrid } from '@/components/admin/AdminPrimitives'

interface Vital {
  label: string
  value: string
  rating: 'good' | 'needs-improvement' | 'poor'
}

export default function AdminPerformancePage() {
  // Metrics Action not yet live → AsyncScreen empty until the observability endpoint lands.
  const vitals = ok<readonly Vital[]>([])
  return (
    <AdminGate>
      <AdminPage>
        <AdminPageHeader
          icon={<Gauge className="h-7 w-7" />}
          title="Performance Monitor"
          description="Monitor application performance, Web Vitals, and system metrics"
        />

        <StatsGrid columns={4}>
          <StatsCard title="CPU Usage" value="—" description="Current load" icon={<Cpu className="h-4 w-4" />} />
          <StatsCard title="Memory" value="—" description="Heap in use" icon={<Database className="h-4 w-4" />} />
          <StatsCard title="Avg. Response" value="—" description="GraphQL p50" icon={<Zap className="h-4 w-4" />} />
          <StatsCard title="Uptime" value="—" description="Last 24h" icon={<Gauge className="h-4 w-4" />} />
        </StatsGrid>

        <AdminSection title="Core Web Vitals" description="LCP, FID, CLS, INP measured in the field.">
          <AsyncScreen<readonly Vital[]>
            result={vitals}
            emptyCheck={(v) => v.length === 0}
            renderData={(v) => (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {v.map((m) => (
                  <li key={m.label} className="rounded-md border border-slate-800 p-3 text-center">
                    <p className="text-xs text-slate-400">{m.label}</p>
                    <p className="mt-1 text-lg font-semibold text-slate-100">{m.value}</p>
                  </li>
                ))}
              </ul>
            )}
            slots={{
              empty: (
                <p className="py-8 text-center text-sm text-slate-400">
                  No performance samples yet. Vitals appear once the observability collector reports data.
                </p>
              ),
            }}
          />
        </AdminSection>
      </AdminPage>
    </AdminGate>
  )
}
