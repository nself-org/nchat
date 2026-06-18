/**
 * Purpose:    Ported /admin/compliance/privacy — tabbed privacy settings (consent, cookies,
 *             legal holds) with a back link to the compliance dashboard (legacy parity).
 * SOT:        F-NCHAT-VITE-ROUTE — /admin/compliance/privacy
 */
import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { AdminGate, AdminPage } from '@/components/admin/AdminScaffold'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/admin/AdminPrimitives'
import { ConsentManager, CookieSettings, LegalHold } from '@/components/admin/CompliancePanels'

export default function AdminCompliancePrivacyPage() {
  return (
    <AdminGate>
      <AdminPage>
        <Link to="/admin/compliance" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200">
          <ChevronLeft className="h-4 w-4" /> Back to Compliance
        </Link>
        <Tabs defaultValue="consent" className="space-y-2">
          <TabsList>
            <TabsTrigger value="consent">Consent Management</TabsTrigger>
            <TabsTrigger value="cookies">Cookie Settings</TabsTrigger>
            <TabsTrigger value="legal-holds">Legal Holds</TabsTrigger>
          </TabsList>
          <TabsContent value="consent">
            <ConsentManager />
          </TabsContent>
          <TabsContent value="cookies">
            <CookieSettings />
          </TabsContent>
          <TabsContent value="legal-holds">
            <LegalHold />
          </TabsContent>
        </Tabs>
      </AdminPage>
    </AdminGate>
  )
}
