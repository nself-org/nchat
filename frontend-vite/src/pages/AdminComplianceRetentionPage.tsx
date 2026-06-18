/**
 * Purpose:    Ported /admin/compliance/retention — message + file retention policy settings,
 *             with a back link to the compliance dashboard (legacy parity).
 * SOT:        F-NCHAT-VITE-ROUTE — /admin/compliance/retention
 */
import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { AdminGate, AdminPage } from '@/components/admin/AdminScaffold'
import { DataRetentionSettings } from '@/components/admin/CompliancePanels'

export default function AdminComplianceRetentionPage() {
  return (
    <AdminGate>
      <AdminPage>
        <Link to="/admin/compliance" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200">
          <ChevronLeft className="h-4 w-4" /> Back to Compliance
        </Link>
        <DataRetentionSettings />
      </AdminPage>
    </AdminGate>
  )
}
