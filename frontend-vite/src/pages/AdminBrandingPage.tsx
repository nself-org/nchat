/**
 * Purpose:    Ported /admin/branding — white-label branding dashboard from the legacy
 *             BrandingDashboard: workspace name, logo, primary colour, custom domain. Persists via
 *             a future branding Action (handlers wired with optimistic local UI).
 * SOT:        F-NCHAT-VITE-ROUTE — /admin/branding
 */
import { useState } from 'react'
import { Palette } from 'lucide-react'
import { Button, Input } from '@nself/ui'
import { AdminGate, AdminPage, AdminPageHeader, AdminSection } from '@/components/admin/AdminScaffold'
import { Field } from '@/components/admin/AdminControls'

export default function AdminBrandingPage() {
  const [name, setName] = useState('nChat')
  const [logoUrl, setLogoUrl] = useState('')
  const [color, setColor] = useState('#0ea5e9')
  const [domain, setDomain] = useState('')

  return (
    <AdminGate>
      <AdminPage>
        <AdminPageHeader
          icon={<Palette className="h-7 w-7" />}
          title="White-Label Branding"
          description="Manage white-label branding and customization"
        />

        <AdminSection title="Workspace Identity" description="Name, logo, and accent colour shown across the app.">
          <div className="grid gap-5 sm:grid-cols-2">
            <Input label="Workspace name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="Logo URL" placeholder="https://..." value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
            <Field label="Primary colour">
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-9 w-12 rounded border border-slate-700 bg-slate-900"
                  aria-label="Primary colour"
                />
                <span className="font-mono text-sm text-slate-300">{color}</span>
              </div>
            </Field>
            <Input
              label="Custom domain"
              placeholder="chat.yourcompany.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
          </div>
          <div className="mt-5 flex justify-end">
            <Button variant="primary" size="sm">
              Save branding
            </Button>
          </div>
        </AdminSection>

        <AdminSection title="Preview" description="How the workspace identity appears in the header.">
          <div className="flex items-center gap-3 rounded-md border border-slate-800 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full text-white" style={{ background: color }}>
              {name.charAt(0) || 'n'}
            </div>
            <span className="text-lg font-semibold text-slate-100">{name || 'nChat'}</span>
          </div>
        </AdminSection>
      </AdminPage>
    </AdminGate>
  )
}
