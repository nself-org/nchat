/**
 * Purpose:    Compliance feature panels ported from the legacy `@/components/compliance` set
 *             (ComplianceDashboard, ComplianceReports, DataRetentionSettings, ConsentManager,
 *             CookieSettings, LegalHold). The legacy code lived outside the admin route dir and
 *             is not reachable from the Vite SPA; these self-contained panels preserve the same
 *             feature surface (GDPR data-subject requests, retention policies, consent + cookies,
 *             legal holds) and degrade via AsyncScreen where the backend Action is not yet live.
 * Inputs:     none (each panel manages its own local UI state).
 * Outputs:    Admin compliance panels. Data surfaces render AsyncScreen states until the
 *             compliance plugin Actions land (see backend_pending: compliance export/audit Actions).
 * Constraints:Presentational + local-state only; no direct SQL. Settings persist via future
 *             compliance Action mutations (wired as no-op handlers + optimistic UI for now).
 * SOT:        F-NCHAT-VITE-ADMIN-COMPLIANCE-01
 */
import { useState } from 'react'
import { FileText, ShieldCheck, Cookie, Gavel, Clock, Download } from 'lucide-react'
import { AsyncScreen, Button } from '@nself/ui'
import { ok } from '@nself/errors'
import { AdminSection } from './AdminScaffold'
import { Badge, ToggleRow, Tabs, TabsList, TabsTrigger, TabsContent } from './AdminPrimitives'
import { Field, Select, Textarea } from './AdminControls'

// ─── ComplianceReports — GDPR data-subject request log ─────────────────────────
interface DsrRow {
  id: string
  type: 'export' | 'deletion' | 'access'
  subject: string
  status: 'pending' | 'completed' | 'rejected'
  requestedAt: string
}

/** ComplianceReports — list of data-subject requests + a generator. */
export function ComplianceReports() {
  // Backend compliance Action not live yet → render the empty AsyncScreen state.
  const result = ok<readonly DsrRow[]>([])
  return (
    <AdminSection
      title={
        <span className="flex items-center gap-2">
          <FileText className="h-4 w-4" /> Compliance Reports
        </span>
      }
      description="Generate and track GDPR / CCPA data-subject requests (export, access, deletion)."
      actions={
        <Button variant="primary" size="sm">
          <span className="inline-flex items-center gap-2">
            <Download className="h-4 w-4" /> New Report
          </span>
        </Button>
      }
    >
      <AsyncScreen<readonly DsrRow[]>
        result={result}
        emptyCheck={(rows) => rows.length === 0}
        renderData={(rows) => (
          <ul className="divide-y divide-slate-800">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-3 text-sm">
                <span className="text-slate-200">{r.subject}</span>
                <Badge tone={r.status === 'completed' ? 'success' : r.status === 'rejected' ? 'destructive' : 'warning'}>
                  {r.status}
                </Badge>
              </li>
            ))}
          </ul>
        )}
        slots={{
          empty: (
            <p className="py-8 text-center text-sm text-slate-400">
              No data-subject requests yet. Generated reports will appear here once the compliance plugin is enabled.
            </p>
          ),
        }}
      />
    </AdminSection>
  )
}

// ─── DataRetentionSettings ─────────────────────────────────────────────────────
/** DataRetentionSettings — message + file retention windows. */
export function DataRetentionSettings() {
  const [messageDays, setMessageDays] = useState('365')
  const [fileDays, setFileDays] = useState('180')
  const [autoDelete, setAutoDelete] = useState(false)
  const windows = [
    { value: '30', label: '30 days' },
    { value: '90', label: '90 days' },
    { value: '180', label: '180 days' },
    { value: '365', label: '1 year' },
    { value: '0', label: 'Forever' },
  ]
  return (
    <AdminSection
      title={
        <span className="flex items-center gap-2">
          <Clock className="h-4 w-4" /> Data Retention
        </span>
      }
      description="Control how long messages and files are retained before automatic deletion."
    >
      <div className="space-y-5">
        <Field label="Message retention" hint="Messages older than this window are eligible for deletion.">
          <Select value={messageDays} onChange={(e) => setMessageDays(e.target.value)} options={windows} />
        </Field>
        <Field label="File retention" hint="Uploaded files older than this window are eligible for deletion.">
          <Select value={fileDays} onChange={(e) => setFileDays(e.target.value)} options={windows} />
        </Field>
        <ToggleRow
          label="Enable automatic deletion"
          hint="Runs the retention sweep on the configured schedule (free, per Security-Always-Free)."
          checked={autoDelete}
          onChange={setAutoDelete}
        />
        <div className="flex justify-end">
          <Button variant="primary" size="sm">
            Save retention policy
          </Button>
        </div>
      </div>
    </AdminSection>
  )
}

// ─── ConsentManager ────────────────────────────────────────────────────────────
/** ConsentManager — granular consent toggles. */
export function ConsentManager() {
  const [analytics, setAnalytics] = useState(true)
  const [marketing, setMarketing] = useState(false)
  const [thirdParty, setThirdParty] = useState(false)
  return (
    <AdminSection
      title={
        <span className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" /> Consent Management
        </span>
      }
      description="Configure which consent categories users are prompted for."
    >
      <div className="space-y-4">
        <ToggleRow label="Analytics consent" hint="Track product usage (Umami)." checked={analytics} onChange={setAnalytics} />
        <ToggleRow label="Marketing consent" hint="Permit marketing communications." checked={marketing} onChange={setMarketing} />
        <ToggleRow
          label="Third-party data sharing"
          hint="Share data with integrated third parties."
          checked={thirdParty}
          onChange={setThirdParty}
        />
      </div>
    </AdminSection>
  )
}

// ─── CookieSettings ────────────────────────────────────────────────────────────
/** CookieSettings — cookie banner + policy configuration. */
export function CookieSettings() {
  const [banner, setBanner] = useState(true)
  const [policy, setPolicy] = useState('We use cookies to provide and improve nChat.')
  return (
    <AdminSection
      title={
        <span className="flex items-center gap-2">
          <Cookie className="h-4 w-4" /> Cookie Settings
        </span>
      }
      description="Manage the cookie consent banner and policy text."
    >
      <div className="space-y-4">
        <ToggleRow label="Show cookie banner" checked={banner} onChange={setBanner} />
        <Field label="Cookie policy text">
          <Textarea rows={3} value={policy} onChange={(e) => setPolicy(e.target.value)} />
        </Field>
        <div className="flex justify-end">
          <Button variant="primary" size="sm">
            Save cookie settings
          </Button>
        </div>
      </div>
    </AdminSection>
  )
}

// ─── LegalHold ─────────────────────────────────────────────────────────────────
interface HoldRow {
  id: string
  subject: string
  reason: string
  active: boolean
}

/** LegalHold — preserve data for legal/eDiscovery purposes. */
export function LegalHold() {
  const result = ok<readonly HoldRow[]>([])
  return (
    <AdminSection
      title={
        <span className="flex items-center gap-2">
          <Gavel className="h-4 w-4" /> Legal Holds
        </span>
      }
      description="Place holds that exempt specific users or channels from retention deletion."
      actions={
        <Button variant="primary" size="sm">
          Create hold
        </Button>
      }
    >
      <AsyncScreen<readonly HoldRow[]>
        result={result}
        emptyCheck={(r) => r.length === 0}
        renderData={(rows) => (
          <ul className="divide-y divide-slate-800">
            {rows.map((h) => (
              <li key={h.id} className="flex items-center justify-between py-3 text-sm">
                <span className="text-slate-200">{h.subject}</span>
                <Badge tone={h.active ? 'warning' : 'secondary'}>{h.active ? 'Active' : 'Released'}</Badge>
              </li>
            ))}
          </ul>
        )}
        slots={{ empty: <p className="py-8 text-center text-sm text-slate-400">No active legal holds.</p> }}
      />
    </AdminSection>
  )
}

// ─── ComplianceDashboard — top-level overview with tabs ────────────────────────
/** ComplianceDashboard — the /admin/compliance landing surface. */
export function ComplianceDashboard() {
  return (
    <Tabs defaultValue="reports" className="space-y-2">
      <TabsList>
        <TabsTrigger value="reports">
          <FileText className="h-4 w-4" /> Reports
        </TabsTrigger>
        <TabsTrigger value="retention">
          <Clock className="h-4 w-4" /> Retention
        </TabsTrigger>
        <TabsTrigger value="consent">
          <ShieldCheck className="h-4 w-4" /> Consent
        </TabsTrigger>
        <TabsTrigger value="holds">
          <Gavel className="h-4 w-4" /> Legal Holds
        </TabsTrigger>
      </TabsList>
      <TabsContent value="reports">
        <ComplianceReports />
      </TabsContent>
      <TabsContent value="retention">
        <DataRetentionSettings />
      </TabsContent>
      <TabsContent value="consent">
        <div className="space-y-6">
          <ConsentManager />
          <CookieSettings />
        </div>
      </TabsContent>
      <TabsContent value="holds">
        <LegalHold />
      </TabsContent>
    </Tabs>
  )
}
