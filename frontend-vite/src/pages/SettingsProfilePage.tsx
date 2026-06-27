/**
 * Purpose:    Profile settings — edit display name, username, bio, timezone, language; view email,
 *             role, avatar. Ported from frontend/src/app/settings/profile/page.tsx with full feature
 *             parity (avatar block, basic-info fields, read-only role, regional settings, save flow).
 *             Next patterns -> Vite: @/contexts/auth-context useAuth -> @nself/auth-core useAuth;
 *             updateProfile() server call -> Hasura mutation via urql (@nself/graphql-client).
 *             GraphQL documents + static helpers extracted to settings-profile-gql.ts.
 * Inputs:     none (current user from auth + Hasura). Outputs: profile editor.
 * Constraints:Profile READ maps to N-2-S2c (auth session/profile CRUD via Hasura). Extended columns
 *             are NOT yet provisioned backend-side — query errors gracefully (AsyncScreen) and
 *             form seeds from the JWT UserProfile. Save reports a pending-backend notice.
 * SOT:        F-NCHAT-VITE-ROUTE — /settings/profile  ·  api ticket N-2-S2c
 */
import { useState, useEffect, type ChangeEvent, type FormEvent } from 'react'
import { useQuery, useMutation } from 'urql'
import { useAuth } from '@nself/auth-core'
import { Button, Input } from '@nself/ui'
import { User } from 'lucide-react'
import {
  SettingsLayout,
  PageHeader,
  SettingsSection,
  SettingsRow,
  Select,
  Textarea,
  SavedNotice,
} from '@/components/settings'
import {
  CURRENT_USER_QUERY,
  UPDATE_PROFILE_MUTATION,
  TIMEZONES,
  LANGUAGES,
  roleDescription,
  type ProfileRow,
  type FormData,
} from '@/components/settings/settings-profile-gql'

export default function SettingsProfilePage() {
  const auth = useAuth()
  const userId = auth.status === 'authenticated' ? auth.user.id : ''

  const [{ data, fetching, error }, refetch] = useQuery<{ users_by_pk: ProfileRow | null }>({
    query: CURRENT_USER_QUERY,
    variables: { id: userId },
    pause: userId === '',
    requestPolicy: 'cache-and-network',
  })

  const [, updateProfile] = useMutation(UPDATE_PROFILE_MUTATION)

  const [form, setForm] = useState<FormData>({
    displayName: '',
    username: '',
    email: '',
    bio: '',
    timezone: 'America/New_York',
    language: 'en',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Seed the form: prefer the Hasura row, fall back to JWT-derived identity.
  useEffect(() => {
    const row = data?.users_by_pk
    if (row) {
      setForm({
        displayName: row.displayName ?? '',
        username: row.username ?? '',
        email: row.email ?? '',
        bio: row.bio ?? '',
        timezone: row.timezone ?? 'America/New_York',
        language: row.locale ?? 'en',
      })
    } else if (auth.status === 'authenticated') {
      setForm((prev) => ({
        ...prev,
        displayName: auth.user.displayName,
        email: auth.user.email,
      }))
    }
  }, [data, auth])

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setSaved(false)
    setSaveError(null)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    const res = await updateProfile({
      id: userId,
      set: {
        display_name: form.displayName,
        username: form.username,
        bio: form.bio,
        timezone: form.timezone,
        locale: form.language,
      },
    })
    setSaving(false)
    if (res.error) {
      setSaveError('Profile saving is not available yet — the backend profile mutation is pending.')
      return
    }
    setSaved(true)
    refetch({ requestPolicy: 'network-only' })
    setTimeout(() => setSaved(false), 3000)
  }

  const row = data?.users_by_pk
  const avatarFallback = (form.displayName || form.username || form.email || '?').charAt(0).toUpperCase()
  const role = row?.defaultRole ?? (auth.status === 'authenticated' ? auth.user.defaultRole : '')

  return (
    <SettingsLayout>
      <div className="space-y-6">
        <PageHeader icon={User} title="Profile" description="Manage your personal information and preferences" />

        {auth.status === 'loading' && <p className="text-slate-400">Loading…</p>}

        {auth.status !== 'authenticated' && auth.status !== 'loading' && (
          <p className="text-slate-400">Please sign in to manage your profile.</p>
        )}

        {auth.status === 'authenticated' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <SettingsSection title="Profile Photo" description="Upload a photo to personalize your account">
              <div className="flex items-center gap-4">
                {row?.avatarUrl ? (
                  <img src={row.avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sky-600 text-xl font-semibold text-white">
                    {avatarFallback}
                  </div>
                )}
                <div className="space-y-1">
                  <Button type="button" disabled>Upload photo</Button>
                  <p className="text-xs text-slate-500">Avatar upload requires the storage upload Action (pending).</p>
                </div>
              </div>
            </SettingsSection>

            <SettingsSection title="Basic Information" description="This information will be visible to other users">
              <SettingsRow label="Display Name" description="Your name as it appears to others" htmlFor="displayName" vertical>
                <Input
                  id="displayName" label="Display name" name="displayName"
                  value={form.displayName} onChange={handleChange}
                  placeholder="Enter your display name" disabled={saving} maxLength={50}
                  data-testid="profile-display-name"
                />
              </SettingsRow>
              <SettingsRow label="Username" description="Your unique identifier. Letters, numbers, and underscores only." htmlFor="username" vertical>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">@</span>
                  <Input
                    id="username" label="Username" name="username"
                    value={form.username} onChange={handleChange}
                    placeholder="username" disabled={saving}
                    pattern="^[a-zA-Z0-9_]+$" maxLength={30}
                    data-testid="profile-username"
                  />
                </div>
              </SettingsRow>
              <SettingsRow label="Email" description="Your email address (managed in Account settings)" htmlFor="email" vertical>
                <Input id="email" label="Email" name="email" type="email" value={form.email} disabled />
              </SettingsRow>
              <SettingsRow label="Bio" description="A short description about yourself (max 160 characters)" htmlFor="bio" vertical>
                <Textarea
                  id="bio" name="bio" value={form.bio} onChange={handleChange}
                  placeholder="Tell others about yourself..." disabled={saving} maxLength={160} rows={3} testId="profile-bio"
                />
                <p className="text-xs text-slate-500">{form.bio.length}/160 characters</p>
              </SettingsRow>
            </SettingsSection>

            {role && (
              <SettingsSection title="Role" description="Your role determines your permissions in the workspace">
                <div className="flex items-center justify-between rounded-lg border border-slate-700 p-4">
                  <div>
                    <p className="font-medium text-slate-100">{role.charAt(0).toUpperCase() + role.slice(1)}</p>
                    <p className="text-sm text-slate-400">{roleDescription(role)}</p>
                  </div>
                  <span className="rounded-full bg-sky-500/10 px-3 py-1 text-sm font-medium text-sky-400">{role}</span>
                </div>
              </SettingsSection>
            )}

            <SettingsSection title="Regional Settings" description="Configure your timezone and language preferences">
              <SettingsRow label="Timezone" description="Used for displaying times and scheduling" htmlFor="timezone" vertical>
                <Select
                  id="timezone" value={form.timezone} options={TIMEZONES}
                  onChange={(v) => setForm((prev) => ({ ...prev, timezone: v }))} disabled={saving}
                />
              </SettingsRow>
              <SettingsRow label="Language" description="The language used throughout the application" htmlFor="language" vertical>
                <Select
                  id="language" value={form.language} options={LANGUAGES}
                  onChange={(v) => setForm((prev) => ({ ...prev, language: v }))} disabled={saving}
                />
              </SettingsRow>
            </SettingsSection>

            {error && !fetching && (
              <p className="text-sm text-amber-400" role="status">
                Could not load extended profile from the server yet — showing your account identity. Saving is pending backend support.
              </p>
            )}

            <div className="flex items-center gap-4">
              <Button type="submit" disabled={saving} data-testid="save-profile">
                {saving ? 'Saving…' : 'Save Changes'}
              </Button>
              <SavedNotice show={saved} />
              {saveError && <p role="status" className="text-sm text-amber-400">{saveError}</p>}
            </div>
          </form>
        )}
      </div>
    </SettingsLayout>
  )
}
