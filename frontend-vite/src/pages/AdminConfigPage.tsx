/**
 * Purpose:    Ported /admin/config — app configuration overview. Faithful to the legacy
 *             "under construction" config page: explains the env-var based configuration model
 *             (platform template, feature flags, theme vars) while the full editor is rebuilt.
 * SOT:        F-NCHAT-VITE-ROUTE — /admin/config
 */
import { Settings, Wrench } from 'lucide-react'
import { AdminGate, AdminPage, AdminPageHeader, AdminSection } from '@/components/admin/AdminScaffold'

export default function AdminConfigPage() {
  return (
    <AdminGate>
      <AdminPage>
        <AdminPageHeader
          icon={<Settings className="h-7 w-7" />}
          title="App Configuration"
          description="Customize your application settings, branding, and features"
        />
        <AdminSection
          title={
            <span className="flex items-center gap-2">
              <Wrench className="h-4 w-4" /> Under Construction
            </span>
          }
          description="The admin configuration interface is being rebuilt with improved functionality."
        >
          <div className="space-y-4 text-sm text-slate-400">
            <p>In the meantime, you can configure your application using:</p>
            <ul className="ms-4 list-inside list-disc space-y-1">
              <li>
                Environment variables in <code className="rounded bg-slate-800 px-1">.env.local</code>
              </li>
              <li>
                Platform templates via <code className="rounded bg-slate-800 px-1">VITE_PLATFORM_TEMPLATE</code>
              </li>
              <li>
                Feature flags via <code className="rounded bg-slate-800 px-1">VITE_FEATURE_*</code> variables
              </li>
              <li>
                Theme customization via <code className="rounded bg-slate-800 px-1">VITE_THEME_*</code> variables
              </li>
            </ul>
            <p className="mt-4">
              See <code className="rounded bg-slate-800 px-1">.env.example</code> for a complete list of configuration
              options.
            </p>
          </div>
        </AdminSection>
      </AdminPage>
    </AdminGate>
  )
}
