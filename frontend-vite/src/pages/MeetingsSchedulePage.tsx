/**
 * Purpose:    "/meetings/schedule" — full-page meeting scheduler ported from the legacy schedule
 *             page. Three-step wizard (Basic info / Participants & reminders / Settings) backed
 *             by useMeetingForm, submitting via the createMeeting Action; on success shows the
 *             confirmation and redirects to /meetings.
 * Inputs:     none (form state local; createMeeting via useMeetingActions).
 * Outputs:    Wizard | success screen.
 * Constraints:Validation mirrors the legacy rules. All scheduling fields preserved (recurrence,
 *             participants, reminders, privacy, A/V, features). createMeeting Action pending
 *             backend — submit surfaces a typed error instead of stubbing the feature.
 * SOT:        F-NCHAT-VITE-ROUTE — /meetings/schedule
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, Users, Settings, CheckCircle, Loader2 } from 'lucide-react'
import { useMeetingActions } from '@/components/calls/useMeetings'
import { useMeetingForm } from '@/components/calls/useMeetingForm'
import { MeetingFormBasic } from '@/components/calls/MeetingFormBasic'
import { MeetingFormParticipants } from '@/components/calls/MeetingFormParticipants'
import { MeetingFormSettings } from '@/components/calls/MeetingFormSettings'

const STEPS = [
  { id: 'basic', title: 'Basic info', Icon: Calendar },
  { id: 'participants', title: 'Participants', Icon: Users },
  { id: 'settings', title: 'Settings', Icon: Settings },
] as const

export default function MeetingsSchedulePage() {
  const navigate = useNavigate()
  const { form, update, errors, setErrors, validate, buildInput } = useMeetingForm()
  const { creating, createMeeting } = useMeetingActions()
  const [step, setStep] = useState(0)
  const [success, setSuccess] = useState(false)

  const submit = async () => {
    if (!validate()) {
      setStep(0)
      return
    }
    const r = await createMeeting(buildInput())
    if (r._tag === 'Ok') {
      setSuccess(true)
      setTimeout(() => navigate('/meetings'), 1500)
    } else {
      setErrors({ submit: r.error.message })
    }
  }

  if (success) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md rounded-lg border border-slate-800 bg-slate-900 p-10 text-center">
          <CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-500" />
          <h2 className="mb-2 text-2xl font-bold text-slate-100">Meeting scheduled</h2>
          <p className="text-sm text-slate-400">Redirecting to meetings…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-sm text-slate-400 hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-100">Schedule meeting</h1>
          <p className="text-sm text-slate-400">Create a new scheduled meeting</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-4">
        {/* Steps nav */}
        <nav className="space-y-1 lg:col-span-1">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStep(i)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-start ${
                step === i ? 'bg-sky-600/15 text-sky-300' : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-sm ${
                  step >= i ? 'border-sky-500 bg-sky-600 text-white' : 'border-slate-600'
                }`}
              >
                {step > i ? <CheckCircle className="h-4 w-4" /> : i + 1}
              </span>
              {s.title}
            </button>
          ))}
        </nav>

        {/* Form body */}
        <div className="lg:col-span-3">
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
            {step === 0 && <MeetingFormBasic form={form} update={update} errors={errors} />}
            {step === 1 && <MeetingFormParticipants form={form} update={update} />}
            {step === 2 && <MeetingFormSettings form={form} update={update} />}

            {errors.submit && (
              <div className="mt-4 rounded bg-red-500/10 p-3 text-sm text-red-400">{errors.submit}</div>
            )}

            <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setStep(Math.max(0, step - 1))}
                disabled={step === 0}
                className="rounded border border-slate-700 px-4 py-2 text-sm text-slate-200 disabled:opacity-40"
              >
                Previous
              </button>
              {step < STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(Math.min(STEPS.length - 1, step + 1))}
                  className="rounded bg-sky-600 px-4 py-2 text-sm text-white hover:bg-sky-700"
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  onClick={submit}
                  disabled={creating}
                  className="inline-flex items-center gap-2 rounded bg-sky-600 px-4 py-2 text-sm text-white hover:bg-sky-700 disabled:opacity-60"
                >
                  {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                  Schedule meeting
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
