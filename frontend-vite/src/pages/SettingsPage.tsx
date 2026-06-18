/**
 * Purpose:    Settings index. On desktop (>=768px) redirects to /settings/profile (legacy parity);
 *             on mobile shows the category grid. Ported from frontend/src/app/settings/page.tsx —
 *             next/navigation useRouter.replace -> react-router useNavigate(replace), next/link -> <Link>.
 * Inputs:     none (auth via shell). Outputs: settings landing.
 * Constraints:Presentational + a one-shot responsive redirect. WCAG: nav cards are real links.
 * SOT:        F-NCHAT-VITE-ROUTE — /settings
 */
import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Bell, Shield, Settings as SettingsIcon, Keyboard, Palette, ChevronRight, type LucideIcon } from 'lucide-react'
import { SettingsLayout } from '@/components/settings'

interface Card {
  title: string
  description: string
  href: string
  icon: LucideIcon
}

const CARDS: ReadonlyArray<Card> = [
  { title: 'Profile', description: 'Update your personal information, avatar, and bio', href: '/settings/profile', icon: User },
  { title: 'Notifications', description: 'Configure how and when you receive notifications', href: '/settings/notifications', icon: Bell },
  { title: 'Privacy', description: 'Control who can see your activity and contact you', href: '/settings/privacy', icon: Shield },
  { title: 'Account', description: 'Manage your account settings and security', href: '/settings/account', icon: SettingsIcon },
  { title: 'Appearance', description: 'Customize the look and feel of the app', href: '/settings/appearance', icon: Palette },
  { title: 'Keyboard Shortcuts', description: 'View and customize keyboard shortcuts', href: '/settings/keyboard', icon: Keyboard },
]

export default function SettingsPage() {
  const navigate = useNavigate()

  useEffect(() => {
    // Desktop: jump straight to the first category, matching legacy behaviour.
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches) {
      navigate('/settings/profile', { replace: true })
    }
  }, [navigate])

  return (
    <SettingsLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Settings</h1>
          <p className="text-slate-400">Manage your account settings and preferences</p>
        </div>

        {/* Mobile grid */}
        <div className="grid gap-4 md:hidden">
          {CARDS.map((card) => (
            <Link
              key={card.href}
              to={card.href}
              className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900 p-4 transition-colors hover:bg-slate-800"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-sky-500/10">
                <card.icon className="h-6 w-6 text-sky-400" aria-hidden="true" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-base font-medium text-slate-100">{card.title}</p>
                <p className="text-sm text-slate-400">{card.description}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-500 rtl:rotate-180" aria-hidden="true" />
            </Link>
          ))}
        </div>

        {/* Desktop hint (shown briefly before redirect) */}
        <div className="hidden md:block">
          <p className="text-slate-400">Select a settings category from the sidebar.</p>
        </div>
      </div>
    </SettingsLayout>
  )
}
