/**
 * Purpose:    Appearance settings — theme (light/dark/system), language, animations, compact mode.
 *             Ported from frontend/src/app/settings/appearance/page.tsx. next-themes useTheme ->
 *             a self-contained theme controller (localStorage + document class + prefers-color-scheme),
 *             since the SPA has no next-themes provider. All controls + hidden test selects preserved.
 * Inputs:     none. Outputs: appearance editor.
 * Constraints:Theme applied immediately to <html>. Language locked to en (i18n v1.1.1 lock) but the
 *             full option list is preserved as in legacy. Persistence of animations/compact is local
 *             today; maps to N-2-S3z settings Action (backend pending).
 * SOT:        F-NCHAT-VITE-ROUTE — /settings/appearance  ·  api ticket N-2-S3z (settings)
 */
import { useEffect, useState } from 'react'
import { Palette, Sun, Moon, Monitor, type LucideIcon } from 'lucide-react'
import { SettingsSection, SettingsLayout, PageHeader, Toggle } from '@/components/settings'

type Theme = 'light' | 'dark' | 'system'

const THEME_KEY = 'nchat-theme'

function applyTheme(theme: Theme) {
  const root = document.documentElement
  const resolved =
    theme === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme
  root.classList.toggle('dark', resolved === 'dark')
}

const THEME_OPTIONS: ReadonlyArray<{ value: Theme; label: string; description: string; icon: LucideIcon; color: string }> = [
  { value: 'light', label: 'Light', description: 'A clean, bright interface', icon: Sun, color: 'text-amber-400' },
  { value: 'dark', label: 'Dark', description: 'Easy on the eyes in low light', icon: Moon, color: 'text-sky-400' },
  { value: 'system', label: 'System', description: 'Match your device settings', icon: Monitor, color: 'text-slate-400' },
]

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'it', label: 'Italian' },
  { value: 'ja', label: 'Japanese' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ar', label: 'Arabic' },
]

export default function SettingsAppearancePage() {
  const [theme, setThemeState] = useState<Theme>('system')
  const [animations, setAnimations] = useState(true)
  const [compact, setCompact] = useState(false)
  const [language] = useState('en') // i18n v1.1.1 lock: en only

  useEffect(() => {
    const stored = (localStorage.getItem(THEME_KEY) as Theme | null) ?? 'system'
    setThemeState(stored)
    applyTheme(stored)
  }, [])

  const setTheme = (t: Theme) => {
    setThemeState(t)
    localStorage.setItem(THEME_KEY, t)
    applyTheme(t)
  }

  return (
    <SettingsLayout>
      <div className="space-y-6">
        <PageHeader icon={Palette} title="Appearance Settings" description="Customize the look and feel of the app" />

        <SettingsSection title="Theme" description="Select your preferred color scheme">
          {/* Hidden select for test automation, kept in sync with the radio cards */}
          <select
            data-testid="select-theme"
            value={theme}
            onChange={(e) => setTheme(e.target.value as Theme)}
            className="sr-only"
            aria-label="Select theme"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </select>
          <div role="radiogroup" aria-label="Theme" className="space-y-3">
            {THEME_OPTIONS.map((opt) => {
              const active = theme === opt.value
              const id = `theme-${opt.value}`
              return (
                <label
                  key={opt.value}
                  htmlFor={id}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors ${
                    active ? 'border-sky-500 bg-sky-500/10' : 'border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  <input id={id} type="radio" name="theme" checked={active} onChange={() => setTheme(opt.value)} className="h-4 w-4 accent-sky-600" />
                  <opt.icon className={`h-5 w-5 ${opt.color}`} aria-hidden="true" />
                  <span className="flex-1">
                    <span className="block font-medium text-slate-200">{opt.label}</span>
                    <span className="block text-sm text-slate-400">{opt.description}</span>
                  </span>
                </label>
              )
            })}
          </div>
        </SettingsSection>

        <SettingsSection title="Language" description="Select your preferred display language">
          <select data-testid="select-language" value={language} disabled className="sr-only" aria-label="Select language">
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
          <p className="text-sm text-slate-400">
            Current language: <span className="font-medium text-slate-200">English</span>
          </p>
          <p className="text-xs text-slate-500">Additional languages arrive once the i18n locale lock is lifted.</p>
        </SettingsSection>

        <SettingsSection title="Animations" description="Control interface animation effects">
          <Toggle id="toggle-animations" label="Enable Animations" description="Show motion effects and transitions" checked={animations} onChange={setAnimations} testId="toggle-animations" />
          <Toggle id="toggle-compact-mode" label="Compact Mode" description="Reduce spacing for a denser layout" checked={compact} onChange={setCompact} testId="toggle-compact-mode" />
        </SettingsSection>
      </div>
    </SettingsLayout>
  )
}
