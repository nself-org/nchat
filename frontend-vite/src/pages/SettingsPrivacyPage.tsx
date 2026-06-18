/**
 * Purpose:    Privacy settings — DM permission, online-status/last-seen, read receipts & typing,
 *             profile visibility + per-field visibility, and activity status. Full feature parity with
 *             frontend/src/app/settings/privacy/page.tsx (every section, radio option, and toggle).
 *             shadcn RadioGroup/Switch -> group-local RadioCardGroup/Toggle primitives.
 * Inputs:     none. Outputs: privacy editor.
 * Constraints:Local state; persistence maps to N-2-S3z privacy Action (backend pending). Accessible.
 * SOT:        F-NCHAT-VITE-ROUTE — /settings/privacy  ·  api ticket N-2-S3z (privacy)
 */
import { useState } from 'react'
import { Shield, Globe, Users, Lock } from 'lucide-react'
import { Button } from '@nself/ui'
import { SettingsLayout, PageHeader, SettingsSection, SettingsRow, Toggle, RadioCardGroup, SavedNotice } from '@/components/settings'

interface PrivacyState {
  dmPermission: 'everyone' | 'members' | 'none'
  showOnlineStatus: boolean
  showLastSeen: boolean
  readReceipts: boolean
  typingIndicators: boolean
  profileVisibility: 'public' | 'members' | 'private'
  showEmail: boolean
  showBio: boolean
  showActivity: boolean
}

const DEFAULTS: PrivacyState = {
  dmPermission: 'everyone',
  showOnlineStatus: true,
  showLastSeen: true,
  readReceipts: true,
  typingIndicators: true,
  profileVisibility: 'members',
  showEmail: false,
  showBio: true,
  showActivity: true,
}

export default function SettingsPrivacyPage() {
  const [s, setS] = useState<PrivacyState>(DEFAULTS)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const set = <K extends keyof PrivacyState>(k: K, v: PrivacyState[K]) => {
    setS((prev) => ({ ...prev, [k]: v }))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    await new Promise((r) => setTimeout(r, 400))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <SettingsLayout>
      <div className="space-y-6">
        <PageHeader icon={Shield} title="Privacy" description="Control who can see your activity and contact you" />

        <SettingsSection title="Direct Messages" description="Control who can send you direct messages">
          <SettingsRow label="Who can send you direct messages" description="Choose who is allowed to start a conversation with you" vertical>
            <RadioCardGroup
              name="dm-permission"
              value={s.dmPermission}
              onChange={(v) => set('dmPermission', v)}
              options={[
                { value: 'everyone', label: 'Everyone', description: 'Anyone can send you a direct message', icon: Globe },
                { value: 'members', label: 'Workspace members only', description: 'Only members of your workspace can message you', icon: Users },
                { value: 'none', label: 'No one', description: 'Disable direct messages entirely', icon: Lock },
              ]}
            />
          </SettingsRow>
        </SettingsSection>

        <SettingsSection title="Online Status" description="Control visibility of your online presence">
          <Toggle id="show-online" label="Show online status" description="Let others see when you're online" checked={s.showOnlineStatus} onChange={(v) => set('showOnlineStatus', v)} testId="toggle-online-status" />
          <Toggle id="show-last-seen" label="Show last seen" description="Let others see when you were last active" checked={s.showLastSeen} onChange={(v) => set('showLastSeen', v)} disabled={!s.showOnlineStatus} />
        </SettingsSection>

        <SettingsSection title="Messages" description="Control message read and typing indicators">
          <Toggle id="read-receipts" label="Read receipts" description="Let others see when you've read their messages" checked={s.readReceipts} onChange={(v) => set('readReceipts', v)} />
          <Toggle id="typing" label="Typing indicators" description="Let others see when you're typing" checked={s.typingIndicators} onChange={(v) => set('typingIndicators', v)} />
        </SettingsSection>

        <SettingsSection title="Profile Visibility" description="Choose who can view your full profile">
          <SettingsRow label="Profile visibility" vertical>
            <RadioCardGroup
              name="profile-visibility"
              value={s.profileVisibility}
              onChange={(v) => set('profileVisibility', v)}
              options={[
                { value: 'public', label: 'Public', description: 'Anyone can view your profile' },
                { value: 'members', label: 'Workspace members', description: 'Only workspace members can view your profile' },
                { value: 'private', label: 'Private', description: 'Only show basic info (name and avatar)' },
              ]}
            />
          </SettingsRow>
          <div className="rounded-lg border border-slate-700 p-4">
            <p className="text-sm font-medium text-slate-200">Profile fields visibility</p>
            <Toggle id="show-email" label="Show email address" description="Display your email on your profile" checked={s.showEmail} onChange={(v) => set('showEmail', v)} />
            <Toggle id="show-bio" label="Show bio" description="Display your bio on your profile" checked={s.showBio} onChange={(v) => set('showBio', v)} />
          </div>
        </SettingsSection>

        <SettingsSection title="Activity" description="Control visibility of your activity">
          <Toggle id="show-activity" label="Show activity status" description="Let others see what channels you're active in" checked={s.showActivity} onChange={(v) => set('showActivity', v)} />
        </SettingsSection>

        <div className="flex items-center gap-4">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
          <SavedNotice show={saved} />
        </div>
      </div>
    </SettingsLayout>
  )
}
