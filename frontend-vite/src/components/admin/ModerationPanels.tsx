/**
 * Purpose:    Moderation feature panels ported from the legacy `@/components/admin/moderation/*`
 *             and `@/components/moderation/ComprehensiveModerationDashboard`. Self-contained so the
 *             Vite SPA admin moderation pages keep their full surface: dashboard stats, the
 *             moderation queue (flagged content with approve/remove/ban actions), settings
 *             (auto-mod thresholds, banned words), and the comprehensive (reports + appeals) view.
 *             The moderation pipeline runs server-side (moderation plugin Action, api-migration
 *             N-2-S3d); until that Action is live, data surfaces render AsyncScreen states.
 * Inputs:     none (local UI state per panel).
 * Outputs:    Moderation admin panels.
 * Constraints:Bundle-gated (nchatBundle.moderation). No client-side verdicts — the scan/verdict
 *             logic stays backend-side; this is the operator UI only.
 * SOT:        F-NCHAT-VITE-ADMIN-MODERATION-01
 */
import { useState } from 'react'
import { ListChecks, BarChart3, Settings, Flag, Gavel } from 'lucide-react'
import { AsyncScreen, Button } from '@nself/ui'
import { ok } from '@nself/errors'
import { AdminSection } from './AdminScaffold'
import { StatsCard, StatsGrid, Badge, ToggleRow, Tabs, TabsList, TabsTrigger, TabsContent } from './AdminPrimitives'
import { Field, Textarea } from './AdminControls'

interface QueueItem {
  id: string
  author: string
  channel: string
  reason: string
  excerpt: string
  severity: 'low' | 'medium' | 'high'
}

/** ModerationDashboard — overview KPIs for the moderation system. */
export function ModerationDashboard() {
  return (
    <div className="space-y-6">
      <StatsGrid columns={4}>
        <StatsCard title="Pending Review" value="—" description="In queue" icon={<ListChecks className="h-4 w-4" />} />
        <StatsCard title="Auto-Removed" value="—" description="Last 24h" icon={<Flag className="h-4 w-4" />} accent="warning" />
        <StatsCard title="Appeals" value="—" description="Awaiting decision" icon={<Gavel className="h-4 w-4" />} />
        <StatsCard title="Active Bans" value="—" description="Current" icon={<BarChart3 className="h-4 w-4" />} accent="error" />
      </StatsGrid>
      <AdminSection title="Detection Trend" description="Flagged content volume over time (from the moderation plugin).">
        <p className="py-8 text-center text-sm text-slate-400">
          Trend data appears once the moderation plugin reports detection metrics.
        </p>
      </AdminSection>
    </div>
  )
}

/** ModerationQueue — flagged content awaiting an operator decision. */
export function ModerationQueue() {
  const items = ok<readonly QueueItem[]>([])
  return (
    <AdminSection title="Moderation Queue" description="Review flagged content. Decisions are enforced server-side.">
      <AsyncScreen<readonly QueueItem[]>
        result={items}
        emptyCheck={(i) => i.length === 0}
        renderData={(rows) => (
          <ul className="space-y-3">
            {rows.map((it) => (
              <li key={it.id} className="rounded-md border border-slate-800 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-200">
                      {it.author} <span className="text-slate-500">in #{it.channel}</span>
                    </p>
                    <p className="mt-1 text-sm text-slate-400">{it.excerpt}</p>
                  </div>
                  <Badge tone={it.severity === 'high' ? 'destructive' : it.severity === 'medium' ? 'warning' : 'secondary'}>
                    {it.reason}
                  </Badge>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button variant="secondary" size="sm">Approve</Button>
                  <Button variant="destructive" size="sm">Remove</Button>
                  <Button variant="ghost" size="sm">Ban author</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        slots={{
          empty: <p className="py-8 text-center text-sm text-slate-400">Queue is clear — no flagged content awaiting review.</p>,
        }}
      />
    </AdminSection>
  )
}

/** ModerationSettings — auto-moderation thresholds + banned words. */
export function ModerationSettings() {
  const [autoMod, setAutoMod] = useState(true)
  const [autoBan, setAutoBan] = useState(false)
  const [slowmode, setSlowmode] = useState(false)
  const [bannedWords, setBannedWords] = useState('')
  return (
    <AdminSection title="Moderation Settings" description="Configure automated moderation behaviour.">
      <div className="space-y-5">
        <ToggleRow label="Enable auto-moderation" hint="Run the AI moderation pipeline on every message." checked={autoMod} onChange={setAutoMod} />
        <ToggleRow label="Auto-ban on repeated violations" hint="Ban users who exceed the violation threshold." checked={autoBan} onChange={setAutoBan} />
        <ToggleRow label="Enable slowmode on raids" hint="Throttle posting when a raid is detected." checked={slowmode} onChange={setSlowmode} />
        <Field label="Banned words" hint="Comma-separated. Messages containing these are auto-flagged.">
          <Textarea
            rows={3}
            placeholder="Enter words separated by commas"
            value={bannedWords}
            onChange={(e) => setBannedWords(e.target.value)}
          />
        </Field>
        <div className="flex justify-end">
          <Button variant="primary" size="sm">Save settings</Button>
        </div>
      </div>
    </AdminSection>
  )
}

/** ComprehensiveModerationDashboard — moderation + reports + appeals, tabbed. */
export function ComprehensiveModerationDashboard() {
  return (
    <Tabs defaultValue="dashboard" className="space-y-2">
      <TabsList>
        <TabsTrigger value="dashboard">
          <BarChart3 className="h-4 w-4" /> Dashboard
        </TabsTrigger>
        <TabsTrigger value="queue">
          <ListChecks className="h-4 w-4" /> Queue
        </TabsTrigger>
        <TabsTrigger value="appeals">
          <Gavel className="h-4 w-4" /> Appeals
        </TabsTrigger>
        <TabsTrigger value="settings">
          <Settings className="h-4 w-4" /> Settings
        </TabsTrigger>
      </TabsList>
      <TabsContent value="dashboard">
        <ModerationDashboard />
      </TabsContent>
      <TabsContent value="queue">
        <ModerationQueue />
      </TabsContent>
      <TabsContent value="appeals">
        <AdminSection title="Appeals" description="User appeals against moderation decisions.">
          <p className="py-8 text-center text-sm text-slate-400">No pending appeals.</p>
        </AdminSection>
      </TabsContent>
      <TabsContent value="settings">
        <ModerationSettings />
      </TabsContent>
    </Tabs>
  )
}
