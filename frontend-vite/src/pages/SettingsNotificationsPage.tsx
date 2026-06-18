/**
 * Purpose:    Notification preferences — delivery channels, per-event toggles, quiet hours, and
 *             email-digest cadence. Ported from frontend/src/app/settings/notifications/page.tsx +
 *             its NotificationPreferences component, made self-contained (the legacy heavy component
 *             pulled app stores not present in the SPA). Save flow preserved (toast -> SavedNotice).
 * Inputs:     none. Outputs: notification settings editor.
 * Constraints:Local state today; persistence maps to N-2-S3z settings Action + N-2-S2k notifications
 *             (backend pending — see backend_pending). All controls fully interactive + accessible.
 * SOT:        F-NCHAT-VITE-ROUTE — /settings/notifications  ·  api ticket N-2-S3z / N-2-S2k
 */
import { useState } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@nself/ui'
import { SettingsLayout, PageHeader, SettingsSection, SettingsRow, Toggle, Select, SavedNotice } from '@/components/settings'

interface NotifState {
  desktop: boolean
  email: boolean
  push: boolean
  sound: boolean
  directMessages: boolean
  mentions: boolean
  threadReplies: boolean
  channelMessages: boolean
  reactions: boolean
  quietHoursEnabled: boolean
  quietStart: string
  quietEnd: string
  digest: 'off' | 'daily' | 'weekly'
}

const DEFAULTS: NotifState = {
  desktop: true,
  email: true,
  push: false,
  sound: true,
  directMessages: true,
  mentions: true,
  threadReplies: true,
  channelMessages: false,
  reactions: false,
  quietHoursEnabled: false,
  quietStart: '22:00',
  quietEnd: '08:00',
  digest: 'daily',
}

const HOURS = Array.from({ length: 24 }, (_, h) => {
  const v = `${String(h).padStart(2, '0')}:00`
  return { value: v, label: v }
})

export default function SettingsNotificationsPage() {
  const [s, setS] = useState<NotifState>(DEFAULTS)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const set = <K extends keyof NotifState>(key: K, value: NotifState[K]) => {
    setS((prev) => ({ ...prev, [key]: value }))
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
        <PageHeader icon={Bell} title="Notifications" description="Configure how and when you receive notifications" />

        <SettingsSection title="Delivery Channels" description="Choose where notifications are delivered">
          <Toggle id="n-desktop" label="Desktop notifications" description="Show notifications on this device" checked={s.desktop} onChange={(v) => set('desktop', v)} />
          <Toggle id="n-email" label="Email notifications" description="Send notifications to your email" checked={s.email} onChange={(v) => set('email', v)} />
          <Toggle id="n-push" label="Mobile push" description="Push notifications to your mobile devices" checked={s.push} onChange={(v) => set('push', v)} />
          <Toggle id="n-sound" label="Notification sounds" description="Play a sound for new notifications" checked={s.sound} onChange={(v) => set('sound', v)} />
        </SettingsSection>

        <SettingsSection title="Notify Me About" description="Pick which events trigger a notification">
          <Toggle id="n-dm" label="Direct messages" description="When someone sends you a DM" checked={s.directMessages} onChange={(v) => set('directMessages', v)} />
          <Toggle id="n-mention" label="Mentions" description="When you are @mentioned" checked={s.mentions} onChange={(v) => set('mentions', v)} />
          <Toggle id="n-thread" label="Thread replies" description="Replies in threads you follow" checked={s.threadReplies} onChange={(v) => set('threadReplies', v)} />
          <Toggle id="n-channel" label="All channel messages" description="Every message in channels you join" checked={s.channelMessages} onChange={(v) => set('channelMessages', v)} />
          <Toggle id="n-react" label="Reactions" description="When someone reacts to your messages" checked={s.reactions} onChange={(v) => set('reactions', v)} />
        </SettingsSection>

        <SettingsSection title="Quiet Hours" description="Mute notifications during a set time window">
          <Toggle id="n-quiet" label="Enable quiet hours" description="Pause notifications during these hours" checked={s.quietHoursEnabled} onChange={(v) => set('quietHoursEnabled', v)} />
          <div className="grid grid-cols-2 gap-4">
            <SettingsRow label="From" htmlFor="quiet-start" vertical>
              <Select id="quiet-start" value={s.quietStart} options={HOURS} onChange={(v) => set('quietStart', v)} disabled={!s.quietHoursEnabled} />
            </SettingsRow>
            <SettingsRow label="To" htmlFor="quiet-end" vertical>
              <Select id="quiet-end" value={s.quietEnd} options={HOURS} onChange={(v) => set('quietEnd', v)} disabled={!s.quietHoursEnabled} />
            </SettingsRow>
          </div>
        </SettingsSection>

        <SettingsSection title="Email Digest" description="Receive a summary of activity by email">
          <SettingsRow label="Digest frequency" description="How often to send the activity digest" htmlFor="digest" vertical>
            <Select
              id="digest"
              value={s.digest}
              options={[
                { value: 'off', label: 'Off' },
                { value: 'daily', label: 'Daily' },
                { value: 'weekly', label: 'Weekly' },
              ]}
              onChange={(v) => set('digest', v as NotifState['digest'])}
            />
          </SettingsRow>
        </SettingsSection>

        <div className="flex items-center gap-4">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
          <SavedNotice show={saved} message="Notification preferences updated." />
        </div>
      </div>
    </SettingsLayout>
  )
}
