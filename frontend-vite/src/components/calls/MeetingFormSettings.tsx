/**
 * Purpose:    Step 3 of the meeting scheduler (settings) ported from the legacy schedule page:
 *             privacy / password, A/V defaults (mute on join, video off on join, screen-share),
 *             and feature toggles (waiting room, in-meeting chat).
 * Inputs:     form (MeetingFormState), update (typed setter).
 * Outputs:    The step-3 form fields.
 * Constraints:Presentational + delegated state. All legacy settings fields preserved.
 * SOT:        F-NCHAT-VITE-MEETINGS-FORM-SETTINGS-01
 */
import type { MeetingFormState } from './useMeetingForm'

interface Props {
  form: MeetingFormState
  update: <K extends keyof MeetingFormState>(key: K, value: MeetingFormState[K]) => void
}

interface ToggleRowProps {
  id: string
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}

function ToggleRow({ id, label, description, checked, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-slate-700 p-4">
      <div className="flex-1">
        <label htmlFor={id} className="block text-sm font-medium text-slate-200">
          {label}
        </label>
        <p className="mt-0.5 text-xs text-slate-400">{description}</p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
          checked ? 'bg-sky-600' : 'bg-slate-600'
        }`}
      >
        <span
          aria-hidden="true"
          className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

export function MeetingFormSettings({ form, update }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-4 text-base font-semibold text-slate-100">Privacy</h3>
        <div className="space-y-3">
          <ToggleRow
            id="settings-private"
            label="Private meeting"
            description="Only invited participants can join"
            checked={form.isPrivate}
            onChange={(v) => update('isPrivate', v)}
          />
          {form.isPrivate && (
            <div className="space-y-1">
              <label htmlFor="settings-password" className="block text-sm font-medium text-slate-200">
                Meeting password <span className="text-slate-400">(optional)</span>
              </label>
              <input
                id="settings-password"
                type="password"
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                placeholder="Leave blank for no password"
                className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
              />
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-base font-semibold text-slate-100">Audio &amp; Video defaults</h3>
        <div className="space-y-3">
          <ToggleRow
            id="settings-mute"
            label="Mute participants on join"
            description="Participants join with microphone muted"
            checked={form.muteOnJoin}
            onChange={(v) => update('muteOnJoin', v)}
          />
          <ToggleRow
            id="settings-video-off"
            label="Turn off camera on join"
            description="Participants join with camera disabled"
            checked={form.videoOffOnJoin}
            onChange={(v) => update('videoOffOnJoin', v)}
          />
          <ToggleRow
            id="settings-screenshare"
            label="Allow screen sharing"
            description="Participants can share their screen"
            checked={form.allowScreenShare}
            onChange={(v) => update('allowScreenShare', v)}
          />
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-base font-semibold text-slate-100">Features</h3>
        <div className="space-y-3">
          <ToggleRow
            id="settings-waiting-room"
            label="Waiting room"
            description="Admit participants one by one from a waiting room"
            checked={form.waitingRoom}
            onChange={(v) => update('waitingRoom', v)}
          />
          <ToggleRow
            id="settings-chat"
            label="In-meeting chat"
            description="Allow participants to send messages during the meeting"
            checked={form.enableChat}
            onChange={(v) => update('enableChat', v)}
          />
        </div>
      </div>
    </div>
  )
}
