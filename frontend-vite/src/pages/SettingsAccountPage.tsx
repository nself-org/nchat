/**
 * Purpose:    Account settings — change email, change password, connected OAuth accounts, 2FA toggle,
 *             active sessions, and a Danger Zone delete-account flow with typed "DELETE" confirmation.
 *             Full feature parity with frontend/src/app/settings/account/page.tsx. @/contexts auth ->
 *             @nself/auth-core (useAuth + useAuthStrategy.logout); shadcn AlertDialog -> a controlled
 *             inline confirmation panel (no Radix dialog in the SPA @nself/ui set).
 * Inputs:     none (current user from auth). Outputs: account editor.
 * Constraints:Email/password/connect/2FA/delete are server side-effects mapping to N-2-S3a auth
 *             Actions (OAuth/MFA/password) + N-2-S3l user delete (backend pending — see backend_pending).
 *             Until those Actions land, mutations show a pending notice rather than faking success.
 *             Delete confirmation is gated on typing DELETE exactly (legacy parity). Accessible.
 * SOT:        F-NCHAT-VITE-ROUTE — /settings/account  ·  api tickets N-2-S3a (auth) / N-2-S3l (users)
 */
import { useState, type FormEvent } from 'react'
import { useAuth, useAuthStrategy } from '@nself/auth-core'
import { Button, Input } from '@nself/ui'
import { Settings as SettingsIcon, Smartphone, Shield, Check, AlertTriangle, Trash2 } from 'lucide-react'
import { SettingsLayout, PageHeader, SettingsSection, SettingsRow } from '@/components/settings'

type Provider = 'google' | 'github' | 'apple'

const PROVIDER_NAMES: Record<Provider, string> = { google: 'Google', github: 'GitHub', apple: 'Apple' }

interface ConnectedAccount {
  id: string
  provider: Provider
  email: string
}

const PENDING = 'This action requires the backend auth Action, which is not live yet.'

export default function SettingsAccountPage() {
  const auth = useAuth()
  const strategy = useAuthStrategy()
  const user = auth.status === 'authenticated' ? auth.user : null

  const [loading, setLoading] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [email, setEmail] = useState(user?.email ?? '')
  const [emailPassword, setEmailPassword] = useState('')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [connected] = useState<ConnectedAccount[]>([])
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [showDelete, setShowDelete] = useState(false)

  const pending = (key: string) => {
    setLoading(key)
    setTimeout(() => {
      setLoading(null)
      setNotice(PENDING)
    }, 300)
  }

  const handleEmailChange = (e: FormEvent) => {
    e.preventDefault()
    pending('email')
  }

  const handlePasswordChange = (e: FormEvent) => {
    e.preventDefault()
    setPasswordError(null)
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters')
      return
    }
    pending('password')
  }

  const handleToggle2FA = () => {
    setNotice(PENDING)
    setTwoFactorEnabled((v) => v)
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') return
    setNotice('Account deletion requires the backend delete Action (pending). Signing you out instead.')
    setLoading('delete')
    await strategy.logout()
    setLoading(null)
  }

  if (auth.status === 'loading') {
    return (
      <SettingsLayout>
        <p className="text-slate-400">Loading…</p>
      </SettingsLayout>
    )
  }

  if (!user) {
    return (
      <SettingsLayout>
        <p className="text-slate-400">Please sign in to manage your account.</p>
      </SettingsLayout>
    )
  }

  return (
    <SettingsLayout>
      <div className="space-y-6">
        <PageHeader icon={SettingsIcon} title="Account" description="Manage your account settings and security" />

        {notice && (
          <p role="status" className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-300">
            {notice}
          </p>
        )}

        {/* Email */}
        <SettingsSection title="Email Address" description="Change the email associated with your account">
          <form onSubmit={handleEmailChange} className="space-y-4">
            <SettingsRow label="New email address" htmlFor="new-email" vertical>
              <Input id="new-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter new email" disabled={loading === 'email'} data-testid="account-email" />
            </SettingsRow>
            <SettingsRow label="Current password" description="Enter your password to confirm the change" htmlFor="email-password" vertical>
              <Input id="email-password" type="password" value={emailPassword} onChange={(e) => setEmailPassword(e.target.value)} placeholder="Enter current password" disabled={loading === 'email'} />
            </SettingsRow>
            <div className="flex items-center gap-4">
              <Button type="submit" disabled={loading === 'email' || !email || !emailPassword}>
                {loading === 'email' ? 'Updating…' : 'Update Email'}
              </Button>
              {saved === 'email' && (
                <span className="flex items-center gap-1 text-sm text-emerald-400">
                  <Check className="h-4 w-4" /> Email updated successfully
                </span>
              )}
            </div>
          </form>
        </SettingsSection>

        {/* Password */}
        <SettingsSection title="Password" description="Change your password to keep your account secure">
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <SettingsRow label="Current password" htmlFor="current-password" vertical>
              <Input id="current-password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Enter current password" disabled={loading === 'password'} />
            </SettingsRow>
            <SettingsRow label="New password" htmlFor="new-password" vertical>
              <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" disabled={loading === 'password'} minLength={8} />
              <p className="text-xs text-slate-500">Must be at least 8 characters</p>
            </SettingsRow>
            <SettingsRow label="Confirm new password" htmlFor="confirm-password" vertical>
              <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" disabled={loading === 'password'} />
            </SettingsRow>
            {passwordError && <p className="text-sm text-red-400">{passwordError}</p>}
            <div className="flex items-center gap-4">
              <Button type="submit" data-testid="change-password" disabled={loading === 'password' || !currentPassword || !newPassword || !confirmPassword}>
                {loading === 'password' ? 'Updating…' : 'Update Password'}
              </Button>
              {saved === 'password' && (
                <span className="flex items-center gap-1 text-sm text-emerald-400">
                  <Check className="h-4 w-4" /> Password updated successfully
                </span>
              )}
            </div>
          </form>
        </SettingsSection>

        {/* Connected accounts */}
        <SettingsSection title="Connected Accounts" description="Manage your connected social accounts for sign-in">
          <div className="space-y-3">
            {connected.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border border-slate-700 p-4">
                <div>
                  <p className="font-medium text-slate-200">{PROVIDER_NAMES[a.provider]}</p>
                  <p className="text-sm text-slate-400">{a.email}</p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => setNotice(PENDING)}>
                  Disconnect
                </Button>
              </div>
            ))}
            {(['google', 'github', 'apple'] as Provider[])
              .filter((p) => !connected.some((a) => a.provider === p))
              .map((provider) => (
                <div key={provider} className="flex items-center justify-between rounded-lg border border-dashed border-slate-700 p-4">
                  <div>
                    <p className="font-medium text-slate-200">{PROVIDER_NAMES[provider]}</p>
                    <p className="text-sm text-slate-400">Not connected</p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => setNotice(PENDING)}>
                    Connect
                  </Button>
                </div>
              ))}
          </div>
        </SettingsSection>

        {/* 2FA */}
        <SettingsSection title="Two-Factor Authentication" description="Add an extra layer of security to your account">
          <div className="flex items-center justify-between rounded-lg border border-slate-700 p-4">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-slate-400" aria-hidden="true" />
              <div>
                <p className="font-medium text-slate-200">Authenticator App</p>
                <p className="text-sm text-slate-400">
                  {twoFactorEnabled ? 'Two-factor authentication is enabled' : 'Use an authenticator app to generate codes'}
                </p>
              </div>
            </div>
            <Button variant={twoFactorEnabled ? 'secondary' : 'primary'} onClick={handleToggle2FA}>
              {twoFactorEnabled ? 'Disable' : 'Enable'}
            </Button>
          </div>
          {twoFactorEnabled && (
            <div className="rounded-lg border border-emerald-700 bg-emerald-950 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-emerald-200">
                <Shield className="h-5 w-5" /> Two-factor authentication is active
              </p>
            </div>
          )}
        </SettingsSection>

        {/* Sessions */}
        <SettingsSection title="Active Sessions" description="Manage your active login sessions">
          <div className="flex items-center justify-between rounded-lg border border-slate-700 p-4">
            <div className="flex items-center gap-3">
              <Check className="h-5 w-5 text-emerald-400" aria-hidden="true" />
              <div>
                <p className="font-medium text-slate-200">Current Session</p>
                <p className="text-sm text-slate-400">This device — Active now</p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-300">Active</span>
          </div>
          <Button variant="secondary" className="w-full" onClick={() => setNotice(PENDING)}>
            Sign out of all other sessions
          </Button>
        </SettingsSection>

        {/* Danger zone */}
        <SettingsSection title="Danger Zone" description="Irreversible and destructive actions">
          <div className="rounded-lg border border-red-700/60 bg-red-950/40 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-red-400" aria-hidden="true" />
              <div className="flex-1">
                <p className="font-medium text-red-300">Delete Account</p>
                <p className="mt-1 text-sm text-slate-400">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                {!showDelete ? (
                  <Button variant="secondary" size="sm" className="mt-4" data-testid="delete-account" onClick={() => setShowDelete(true)}>
                    <Trash2 className="me-2 h-4 w-4" /> Delete Account
                  </Button>
                ) : (
                  <div className="mt-4 space-y-3">
                    <label htmlFor="delete-confirm" className="block text-sm text-slate-300">
                      Type <strong>DELETE</strong> to confirm
                    </label>
                    <Input id="delete-confirm" value={deleteConfirmation} onChange={(e) => setDeleteConfirmation(e.target.value)} placeholder="DELETE" />
                    <div className="flex gap-3">
                      <Button variant="secondary" size="sm" onClick={() => { setShowDelete(false); setDeleteConfirmation('') }}>
                        Cancel
                      </Button>
                      <Button variant="destructive" size="sm" onClick={handleDeleteAccount} disabled={deleteConfirmation !== 'DELETE' || loading === 'delete'}>
                        {loading === 'delete' ? 'Deleting…' : 'Delete Account'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </SettingsSection>
      </div>
    </SettingsLayout>
  )
}
