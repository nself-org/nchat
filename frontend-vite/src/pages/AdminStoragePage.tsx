/**
 * Purpose:    Ported /admin/storage — storage management dashboard (team quota, usage breakdown)
 *             from the legacy StorageManagement. Usage breakdown renders AsyncScreen states until
 *             the storage stats Action is live.
 * SOT:        F-NCHAT-VITE-ROUTE — /admin/storage
 */
import { HardDrive, Image, FileText, Film } from 'lucide-react'
import { AsyncScreen } from '@nself/ui'
import { ok } from '@nself/errors'
import { AdminGate, AdminPage, AdminPageHeader, AdminSection } from '@/components/admin/AdminScaffold'
import { StatsCard, StatsGrid } from '@/components/admin/AdminPrimitives'

interface UsageRow {
  kind: string
  size: string
  pct: number
  icon: typeof Image
}

export default function AdminStoragePage() {
  const usage = ok<readonly UsageRow[]>([])
  return (
    <AdminGate>
      <AdminPage>
        <AdminPageHeader
          icon={<HardDrive className="h-7 w-7" />}
          title="Storage Management"
          description="Manage team storage, quotas, and usage"
        />

        <StatsGrid columns={3}>
          <StatsCard title="Used" value="—" description="Of available quota" icon={<HardDrive className="h-4 w-4" />} />
          <StatsCard title="Files" value="—" description="Total objects" icon={<FileText className="h-4 w-4" />} />
          <StatsCard title="Media" value="—" description="Images + video" icon={<Film className="h-4 w-4" />} />
        </StatsGrid>

        <AdminSection title="Usage Breakdown" description="Storage consumed per content type.">
          <AsyncScreen<readonly UsageRow[]>
            result={usage}
            emptyCheck={(u) => u.length === 0}
            renderData={(rows) => (
              <ul className="space-y-2">
                {rows.map((r) => {
                  const Icon = r.icon
                  return (
                    <li key={r.kind} className="rounded-md border border-slate-800 p-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-slate-200">
                          <Icon className="h-4 w-4" /> {r.kind}
                        </span>
                        <span className="text-slate-400">{r.size}</span>
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-slate-800">
                        <div className="h-1.5 rounded-full bg-sky-500" style={{ width: `${r.pct}%` }} />
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
            slots={{
              empty: (
                <p className="py-8 text-center text-sm text-slate-400">
                  No storage data yet. Usage appears once the storage service reports object stats.
                </p>
              ),
            }}
          />
        </AdminSection>
      </AdminPage>
    </AdminGate>
  )
}
