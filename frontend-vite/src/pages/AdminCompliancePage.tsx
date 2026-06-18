/**
 * Purpose:    Ported /admin/compliance — compliance dashboard (GDPR reports, retention, consent,
 *             legal holds) ported from legacy ComplianceDashboard.
 * SOT:        F-NCHAT-VITE-ROUTE — /admin/compliance
 */
import { ShieldCheck } from 'lucide-react'
import { AdminGate, AdminPage, AdminPageHeader } from '@/components/admin/AdminScaffold'
import { ComplianceDashboard } from '@/components/admin/CompliancePanels'

export default function AdminCompliancePage() {
  return (
    <AdminGate>
      <AdminPage>
        <AdminPageHeader
          icon={<ShieldCheck className="h-7 w-7" />}
          title="Compliance"
          description="Data-subject requests, retention, consent, and legal holds"
        />
        <ComplianceDashboard />
      </AdminPage>
    </AdminGate>
  )
}
