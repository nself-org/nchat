/**
 * Purpose:    Profile settings — edit display name, username, bio, timezone, language; view email,
 *             role, avatar. Ported from frontend/src/app/settings/profile/page.tsx with full feature
 *             parity (avatar block, basic-info fields, read-only role, regional settings, save flow).
 *             Next patterns -> Vite: @/contexts/auth-context useAuth -> @nself/auth-core useAuth;
 *             updateProfile() server call -> Hasura mutation via urql (@nself/graphql-client).
 * Inputs:     none (current user from auth + Hasura). Outputs: profile editor.
 * Constraints:Profile READ maps to N-2-S2c (auth session/profile CRUD via Hasura). The current-user
 *             profile query (np_users by JWT id) + update_users_by_pk mutation are wired but the
 *             Hasura permission/row-filter + extended columns (username/bio/timezone/language) are
 *             NOT yet provisioned backend-side — see backend_pending. Until then the query errors
 *             gracefully (AsyncScreen) and we seed the form from the JWT UserProfile so the page is
 *             fully usable. Save reports a pending-backend notice rather than silently dropping data.
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

// ─── Hasura contract (N-2-S2c) ──────────────────────────────────────────────
// Read the current user's profile row. `id` comes from the JWT (X-Hasura-User-Id),
// so Hasura's row filter restricts the result to the caller. Extended profile
// columns are listed in backend_pending until the schema lands.
const CURRENT_USER_QUERY = /* GraphQL */ `
  query CurrentUserProfile($id: uuid!) {
    users_by_pk(id: $id) {
      id
      email
      displayName: display_name
      username
      bio
      timezone
      locale
      avatarUrl: avatar_url
      defaultRole: default_role
    }
  }
`

const UPDATE_PROFILE_MUTATION = /* GraphQL */ `
  mutation UpdateProfile($id: uuid!, $set: users_set_input!) {
    update_users_by_pk(pk_columns: { id: $id }, _set: $set) {
      id
    }
  }
`

interface ProfileRow {
  id: string
  email: string
  displayName: string | null
  username: string | null
  bio: string | null
  timezone: string | null
  locale: string | null
  avatarUrl: string | null
  defaultRole: string | null
}

interface FormData {
  displayName: string
  username: string
  email: string
  bio: string
  timezone: string
  language: string
}

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Dubai',
  'Asia/Tokyo',
  'UTC',
].map((tz) => ({ value: tz, label: tz }))

const LANGUAGES = [{ value: 'en', label: 'English' }]

function roleDescription(role: string): string {
  const map: Record<string, string> = {
    owner: 'Full access to all settings and user management',
    admin: 'Can manage users and channels, moderate content',
    moderator: 'Can moderate content and manage channels',
    member: 'Standard member with full chat access',
    user: 'Standard member with full chat access',
    guest: 'Limited access to specific channels',
  }
  return map[role] ?? 'Standard member'
}

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
      // Backend Action/columns not yet live — surface honestly, do not pretend success.
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
            {/* Avatar */}
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
                  <Button type="button" disabled>
                    Upload photo
                  </Button>
                  <p className="text-xs text-slate-500">Avatar upload requires the storage upload Action (pending).</p>
                </div>
              </div>
            </SettingsSection>

            {/* Basic info */}
            <SettingsSection title="Basic Information" description="This information will be visible to other users">
              <SettingsRow label="Display Name" description="Your name as it appears to others" htmlFor="displayName" vertical>
                <Input
                  id="displayName"
                  name="displayName"
                  value={form.displayName}
                  onChange={handleChange}
                  placeholder="Enter your display name"
                  disabled={saving}
                  maxLength={50}
                  data-testid="profile-display-name"
                />
              </SettingsRow>

              <SettingsRow
                label="Username"
                description="Your unique identifier. Letters, numbers, and underscores only."
                htmlFor="username"
                vertical
              >
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">@</span>
                  <Input
                    id="username"
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    placeholder="username"
                    disabled={saving}
                    pattern="^[a-zA-Z0-9_]+$"
                    maxLength={30}
                    data-testid="profile-username"
                  />
                </div>
              </SettingsRow>

              <SettingsRow label="Email" description="Your email address (managed in Account settings)" htmlFor="email" vertical>
                <Input id="email" name="email" type="email" value={form.email} disabled />
              </SettingsRow>

              <SettingsRow label="Bio" description="A short description about yourself (max 160 characters)" htmlFor="bio" vertical>
                <Textarea
                  id="bio"
                  name="bio"
                  value={form.bio}
                  onChange={handleChange}
                  placeholder="Tell others about yourself..."
                  disabled={saving}
                  maxLength={160}
                  rows={3}
                  testId="profile-bio"
                />
                <p className="text-xs text-slate-500">{form.bio.length}/160 characters</p>
              </SettingsRow>
            </SettingsSection>

            {/* Role (read-only) */}
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

            {/* Regional */}
            <SettingsSection title="Regional Settings" description="Configure your timezone and language preferences">
              <SettingsRow label="Timezone" description="Used for displaying times and scheduling" htmlFor="timezone" vertical>
                <Select
                  id="timezone"
                  value={form.timezone}
                  options={TIMEZONES}
                  onChange={(v) => setForm((prev) => ({ ...prev, timezone: v }))}
                  disabled={saving}
                />
              </SettingsRow>
              <SettingsRow label="Language" description="The language used throughout the application" htmlFor="language" vertical>
                <Select
                  id="language"
                  value={form.language}
                  options={LANGUAGES}
                  onChange={(v) => setForm((prev) => ({ ...prev, language: v }))}
                  disabled={saving}
                />
              </SettingsRow>
            </SettingsSection>

            {/* Profile fetch error — non-blocking (form still usable from JWT identity) */}
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
              {saveError && (
                <p role="status" className="text-sm text-amber-400">
                  {saveError}
                </p>
              )}
            </div>
          </form>
        )}
      </div>
    </SettingsLayout>
  )
}
