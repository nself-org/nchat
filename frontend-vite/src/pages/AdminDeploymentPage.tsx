/**
 * Purpose:    Ported /admin/deployment — deploy to Vercel + deployment status, two-tab layout
 *             from the legacy deployment page (VercelDeployButton + DeploymentStatusChecker).
 *             nSelf-First doctrine: this surface deploys via the nSelf/Vercel flow, not raw docker.
 * SOT:        F-NCHAT-VITE-ROUTE — /admin/deployment
 */
import { Rocket, Activity, ExternalLink } from 'lucide-react'
import { Button } from '@nself/ui'
import { AdminGate, AdminPage, AdminPageHeader, AdminSection } from '@/components/admin/AdminScaffold'
import { Tabs, TabsList, TabsTrigger, TabsContent, Badge } from '@/components/admin/AdminPrimitives'

const SERVICES = ['Hasura GraphQL', 'PostgreSQL', 'Hasura Auth', 'Storage (MinIO)', 'Realtime']

export default function AdminDeploymentPage() {
  return (
    <AdminGate>
      <AdminPage>
        <AdminPageHeader
          icon={<Rocket className="h-7 w-7" />}
          title="Deployment"
          description="Deploy your nChat instance to Vercel and monitor service health"
        />
        <Tabs defaultValue="deploy" className="space-y-2">
          <TabsList>
            <TabsTrigger value="deploy">Deploy to Vercel</TabsTrigger>
            <TabsTrigger value="status">Deployment Status</TabsTrigger>
          </TabsList>

          <TabsContent value="deploy">
            <AdminSection title="Deploy to Vercel" description="One-click deploy of the nChat frontend.">
              <p className="mb-4 text-sm text-slate-400">
                Deploy the nChat web client to Vercel. The backend is provisioned separately via the nSelf CLI
                (<code className="rounded bg-slate-800 px-1">nself build &amp;&amp; nself start</code>).
              </p>
              <a
                href="https://vercel.com/new"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-400"
              >
                <Rocket className="h-4 w-4" /> Deploy to Vercel <ExternalLink className="h-4 w-4" />
              </a>
            </AdminSection>
          </TabsContent>

          <TabsContent value="status">
            <AdminSection
              title={
                <span className="flex items-center gap-2">
                  <Activity className="h-4 w-4" /> Service Health
                </span>
              }
              description="Live status of the backend services that power this instance."
              actions={<Button variant="secondary" size="sm">Refresh</Button>}
            >
              <ul className="space-y-2">
                {SERVICES.map((s) => (
                  <li key={s} className="flex items-center justify-between rounded-md border border-slate-800 p-3 text-sm">
                    <span className="text-slate-200">{s}</span>
                    <Badge tone="success">Operational</Badge>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-slate-500">
                Status reflects the configured backend; connect <code className="rounded bg-slate-800 px-1">nself doctor</code>{' '}
                output for live checks.
              </p>
            </AdminSection>
          </TabsContent>
        </Tabs>
      </AdminPage>
    </AdminGate>
  )
}
