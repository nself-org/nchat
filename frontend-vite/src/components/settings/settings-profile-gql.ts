/**
 * Purpose:    GraphQL documents, types, and static helpers for the profile settings page,
 *             extracted from SettingsProfilePage.tsx to stay within the 300-line file cap.
 * Inputs:     None — exports gql strings, TS interfaces, and pure helper functions.
 * Outputs:    CURRENT_USER_QUERY, UPDATE_PROFILE_MUTATION, ProfileRow, FormData,
 *             TIMEZONES, LANGUAGES, roleDescription.
 * Constraints:N-2-S2c (auth session/profile CRUD via Hasura). Extended columns
 *             (username/bio/timezone/language) are NOT yet provisioned backend-side —
 *             form seeds from JWT fallback and saves surface a pending notice.
 * SOT:        F-NCHAT-VITE-ROUTE — /settings/profile  ·  api ticket N-2-S2c
 */

/** Read the current user's extended profile row (RLS scoped by X-Hasura-User-Id JWT claim). */
export const CURRENT_USER_QUERY = /* GraphQL */ `
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

/** Update the caller's own profile row. Requires Hasura row filter matching JWT id. */
export const UPDATE_PROFILE_MUTATION = /* GraphQL */ `
  mutation UpdateProfile($id: uuid!, $set: users_set_input!) {
    update_users_by_pk(pk_columns: { id: $id }, _set: $set) {
      id
    }
  }
`

export interface ProfileRow {
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

export interface FormData {
  displayName: string
  username: string
  email: string
  bio: string
  timezone: string
  language: string
}

export const TIMEZONES = [
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

export const LANGUAGES = [{ value: 'en', label: 'English' }]

/** Human-readable description for a workspace role. */
export function roleDescription(role: string): string {
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
