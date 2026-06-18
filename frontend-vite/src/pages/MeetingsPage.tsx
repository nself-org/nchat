/**
 * Purpose:    "/meetings" — meetings dashboard ported from the legacy meetings page. Lists
 *             meetings (Hasura, AsyncScreen 7-state) with List / Calendar tab views, a detail
 *             side panel, join navigation, delete via the cancelMeeting Action, and a header
 *             CTA that routes to the full-page scheduler.
 * Inputs:     none (auth from context, data via useMeetingsList).
 * Outputs:    Header + tabs + meeting list/calendar + detail panel.
 * Constraints:Server data lives in urql (canonical §6). Tabs use local state (no @nself/ui Tabs
 *             primitive yet). Delete confirms before calling the Action.
 * SOT:        F-NCHAT-VITE-ROUTE — /meetings
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, List, Calendar } from 'lucide-react'
import { AsyncScreen } from '@nself/ui'
import { MeetingList } from '@/components/calls/MeetingList'
import { MeetingCalendar } from '@/components/calls/MeetingCalendar'
import { MeetingDetailPanel } from '@/components/calls/MeetingDetailPanel'
import { useMeetingActions, useMeetingsList } from '@/components/calls/useMeetings'
import type { Meeting } from '@/components/calls/types'

type Tab = 'list' | 'calendar'

export default function MeetingsPage() {
  const navigate = useNavigate()
  const { result, reexecute } = useMeetingsList()
  const { cancelMeeting } = useMeetingActions()
  const [tab, setTab] = useState<Tab>('list')
  const [selected, setSelected] = useState<Meeting | null>(null)

  const join = (m: Meeting) => navigate(`/meetings/${m.meeting_code}`)

  const remove = async (m: Meeting) => {
    if (!window.confirm(`Delete "${m.title}"?`)) return
    const r = await cancelMeeting(m.id)
    if (r._tag === 'Ok') {
      if (selected?.id === m.id) setSelected(null)
      reexecute()
    }
  }

  return (
    <div className="flex h-full">
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Meetings</h1>
            <p className="mt-1 text-sm text-slate-400">Schedule and manage your meetings</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/meetings/schedule')}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
          >
            <Plus className="h-4 w-4" />
            Schedule meeting
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-800 py-3">
          <TabButton active={tab === 'list'} onClick={() => setTab('list')} Icon={List} label="List" />
          <TabButton
            active={tab === 'calendar'}
            onClick={() => setTab('calendar')}
            Icon={Calendar}
            label="Calendar"
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto pt-6">
          <AsyncScreen
            result={result}
            onRetry={reexecute}
            emptyCheck={(meetings) => meetings.length === 0}
            slots={{
              empty: (
                <div className="flex flex-col items-center gap-2 py-16 text-center">
                  <p className="text-sm text-slate-400">
                    No meetings scheduled. Click “Schedule meeting” to create one.
                  </p>
                </div>
              ),
            }}
            renderData={(meetings) =>
              tab === 'list' ? (
                <MeetingList meetings={meetings} onSelect={setSelected} onJoin={join} onDelete={remove} />
              ) : (
                <MeetingCalendar meetings={meetings} onSelect={setSelected} />
              )
            }
          />
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="w-[360px] border-s border-slate-800 ps-6">
          <MeetingDetailPanel
            meeting={selected}
            onClose={() => setSelected(null)}
            onJoin={() => join(selected)}
            onDelete={() => remove(selected)}
          />
        </div>
      )}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  Icon,
  label,
}: {
  active: boolean
  onClick: () => void
  Icon: typeof List
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded px-3 py-1.5 text-sm ${
        active ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )
}
