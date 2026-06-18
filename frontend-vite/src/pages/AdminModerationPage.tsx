/**
 * Purpose:    Ported /admin/moderation — AI-powered content moderation dashboard with three tabs
 *             (dashboard, queue, settings). Bundle-gated: when the moderation plugin is absent the
 *             page renders the nChat-bundle upsell (legacy parity); moderator role required.
 * SOT:        F-NCHAT-VITE-ROUTE — /admin/moderation
 */
import { Shield, BarChart3, ListChecks, Settings } from 'lucide-react'
import { AdminGate, AdminPage, AdminPageHeader } from '@/components/admin/AdminScaffold'
import { Tabs, TabsList, TabsTrigger, TabsContent, BundleUpsell } from '@/components/admin/AdminPrimitives'
import { ModerationDashboard, ModerationQueue, ModerationSettings } from '@/components/admin/ModerationPanels'
import { nchatBundle } from '@/components/admin/featureDetect'

export default function AdminModerationPage() {
  return (
    <AdminGate allow={['owner', 'admin', 'moderator']}>
      <AdminPage>
        {!nchatBundle.moderation ? (
          <BundleUpsell
            icon={<Shield className="h-8 w-8" />}
            title="Moderation requires the nChat bundle"
            body="AI-assisted moderation, auto-ban thresholds, and the moderation queue are part of the nChat bundle ($0.99/mo). Install the moderation plugin to enable these tools."
            installHint="nself plugin install moderation && nself build && nself start"
          />
        ) : (
          <>
            <AdminPageHeader
              icon={<Shield className="h-7 w-7" />}
              title="Content Moderation"
              description="AI-powered moderation system with advanced detection and analytics"
            />
            <Tabs defaultValue="dashboard" className="space-y-2">
              <TabsList>
                <TabsTrigger value="dashboard">
                  <BarChart3 className="h-4 w-4" /> Dashboard
                </TabsTrigger>
                <TabsTrigger value="queue">
                  <ListChecks className="h-4 w-4" /> Queue
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
              <TabsContent value="settings">
                <ModerationSettings />
              </TabsContent>
            </Tabs>
          </>
        )}
      </AdminPage>
    </AdminGate>
  )
}
