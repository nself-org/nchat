/**
 * Purpose:    Keyboard shortcuts reference — searchable catalog across Navigation, Messages,
 *             Formatting, Reactions, Search, Calls, and Accessibility, with OS-aware modifier keys
 *             (Cmd vs Ctrl) and a tips section. Full parity with frontend/src/app/settings/keyboard/page.tsx
 *             (every shortcut preserved). KeyboardShortcut/Kbd legacy components -> inline equivalents.
 * Inputs:     none. Outputs: shortcut reference.
 * Constraints:Read-only reference (no persistence). OS detection via navigator.userAgent. Accessible.
 * SOT:        F-NCHAT-VITE-ROUTE — /settings/keyboard
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Keyboard, Search, Info } from 'lucide-react'
import { Input } from '@nself/ui'
import { SettingsLayout, PageHeader, SettingsSection } from '@/components/settings'

interface Shortcut {
  keys: string[]
  label: string
  description?: string
}
interface Category {
  title: string
  description?: string
  shortcuts: Shortcut[]
}

const CATEGORIES: ReadonlyArray<Category> = [
  {
    title: 'Navigation',
    description: 'Move around the app quickly',
    shortcuts: [
      { keys: ['Cmd', 'K'], label: 'Quick switcher', description: 'Open quick channel/DM switcher' },
      { keys: ['Cmd', '/'], label: 'Keyboard shortcuts', description: 'Show this shortcuts panel' },
      { keys: ['Cmd', '.'], label: 'Toggle sidebar', description: 'Show or hide the sidebar' },
      { keys: ['Cmd', 'Shift', 'A'], label: 'All unreads', description: 'View all unread messages' },
      { keys: ['Cmd', 'Shift', 'T'], label: 'All threads', description: 'View all threads' },
      { keys: ['Cmd', 'Shift', 'D'], label: 'All DMs', description: 'View all direct messages' },
      { keys: ['Alt', 'Up'], label: 'Previous channel', description: 'Navigate to previous channel' },
      { keys: ['Alt', 'Down'], label: 'Next channel', description: 'Navigate to next channel' },
      { keys: ['Alt', 'Shift', 'Up'], label: 'Previous unread', description: 'Navigate to previous unread channel' },
      { keys: ['Alt', 'Shift', 'Down'], label: 'Next unread', description: 'Navigate to next unread channel' },
    ],
  },
  {
    title: 'Messages',
    description: 'Compose and interact with messages',
    shortcuts: [
      { keys: ['Cmd', 'N'], label: 'New message', description: 'Start composing a new message' },
      { keys: ['Enter'], label: 'Send message', description: 'Send the current message' },
      { keys: ['Shift', 'Enter'], label: 'New line', description: 'Insert a new line in message' },
      { keys: ['Up'], label: 'Edit last message', description: 'Edit your last message (in empty input)' },
      { keys: ['Cmd', 'Shift', 'Enter'], label: 'Create snippet', description: 'Create a code snippet' },
      { keys: ['Cmd', 'U'], label: 'Upload file', description: 'Open file upload dialog' },
      { keys: ['Escape'], label: 'Cancel', description: 'Cancel editing or close dialogs' },
    ],
  },
  {
    title: 'Formatting',
    description: 'Format your messages',
    shortcuts: [
      { keys: ['Cmd', 'B'], label: 'Bold', description: 'Make selected text bold' },
      { keys: ['Cmd', 'I'], label: 'Italic', description: 'Make selected text italic' },
      { keys: ['Cmd', 'Shift', 'X'], label: 'Strikethrough', description: 'Strike through selected text' },
      { keys: ['Cmd', 'Shift', 'C'], label: 'Code', description: 'Format as inline code' },
      { keys: ['Cmd', 'Shift', '7'], label: 'Numbered list', description: 'Create a numbered list' },
      { keys: ['Cmd', 'Shift', '8'], label: 'Bulleted list', description: 'Create a bulleted list' },
      { keys: ['Cmd', 'Shift', '>'], label: 'Quote', description: 'Format as blockquote' },
      { keys: ['Cmd', 'Shift', 'K'], label: 'Link', description: 'Insert a hyperlink' },
    ],
  },
  {
    title: 'Reactions & Actions',
    description: 'Quick reactions and message actions',
    shortcuts: [
      { keys: ['Cmd', 'Shift', '\\'], label: 'Emoji picker', description: 'Open emoji picker' },
      { keys: ['+', ':'], label: 'Add reaction', description: 'Add emoji reaction to message' },
      { keys: ['R'], label: 'Reply in thread', description: 'Start a thread on selected message' },
      { keys: ['E'], label: 'Edit message', description: 'Edit selected message' },
      { keys: ['P'], label: 'Pin message', description: 'Pin or unpin selected message' },
      { keys: ['S'], label: 'Save message', description: 'Save message for later' },
      { keys: ['M'], label: 'Mark unread', description: 'Mark message as unread' },
      { keys: ['Delete'], label: 'Delete message', description: 'Delete selected message' },
    ],
  },
  {
    title: 'Search',
    description: 'Find messages and content',
    shortcuts: [
      { keys: ['Cmd', 'F'], label: 'Search in channel', description: 'Search within current channel' },
      { keys: ['Cmd', 'G'], label: 'Global search', description: 'Search across all channels' },
      { keys: ['Cmd', 'Shift', 'F'], label: 'Search messages', description: 'Advanced message search' },
      { keys: ['Cmd', 'P'], label: 'Search people', description: 'Find a person' },
    ],
  },
  {
    title: 'Calls',
    description: 'Audio and video call shortcuts',
    shortcuts: [
      { keys: ['Cmd', 'Shift', 'H'], label: 'Start huddle', description: 'Start an audio huddle' },
      { keys: ['M'], label: 'Toggle mute', description: 'Mute or unmute microphone (in call)' },
      { keys: ['V'], label: 'Toggle video', description: 'Turn video on or off (in call)' },
      { keys: ['Cmd', 'Shift', 'E'], label: 'End call', description: 'Leave the current call' },
    ],
  },
  {
    title: 'Accessibility',
    description: 'Screen reader and accessibility shortcuts',
    shortcuts: [
      { keys: ['F6'], label: 'Move focus', description: 'Move focus between main areas' },
      { keys: ['Cmd', 'Shift', 'M'], label: 'Jump to message', description: 'Jump to message input' },
      { keys: ['Cmd', 'J'], label: 'Jump to unread', description: 'Jump to first unread message' },
    ],
  },
]

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-6 min-w-[24px] items-center justify-center rounded border border-slate-600 bg-slate-800 px-1.5 text-xs font-medium text-slate-300">
      {children}
    </kbd>
  )
}

export default function SettingsKeyboardPage() {
  const [query, setQuery] = useState('')
  const [isMac, setIsMac] = useState(true)

  useEffect(() => {
    setIsMac(/mac/i.test(navigator.userAgent))
  }, [])

  const keyFor = (k: string) => {
    if (!isMac && k === 'Cmd') return 'Ctrl'
    if (!isMac && k === 'Option') return 'Alt'
    return k
  }

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return CATEGORIES.map((c) => ({
      ...c,
      shortcuts: c.shortcuts.filter(
        (sc) =>
          sc.label.toLowerCase().includes(q) ||
          sc.description?.toLowerCase().includes(q) ||
          sc.keys.some((k) => keyFor(k).toLowerCase().includes(q)),
      ),
    })).filter((c) => c.shortcuts.length > 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, isMac])

  return (
    <SettingsLayout>
      <div className="space-y-6">
        <PageHeader icon={Keyboard} title="Keyboard Shortcuts" description="Speed up your workflow with keyboard shortcuts" />

        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          <Input label="Search shortcuts" placeholder="Search shortcuts..." value={query} onChange={(e) => setQuery(e.target.value)} className="ps-10" aria-label="Search shortcuts" />
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 p-3 text-sm text-slate-400">
          <Info className="h-4 w-4" aria-hidden="true" />
          <span>
            Showing shortcuts for <span className="font-medium text-slate-200">{isMac ? 'macOS' : 'Windows/Linux'}</span>. Use{' '}
            <Kbd>{isMac ? 'Cmd' : 'Ctrl'}</Kbd> as the primary modifier key.
          </span>
        </div>

        <div className="space-y-6">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Keyboard className="mb-4 h-12 w-12 text-slate-600" aria-hidden="true" />
              <p className="text-lg font-medium text-slate-200">No shortcuts found</p>
              <p className="text-sm text-slate-400">Try a different search term</p>
            </div>
          ) : (
            filtered.map((cat) => (
              <SettingsSection key={cat.title} title={cat.title} description={cat.description}>
                {cat.shortcuts.map((sc) => (
                  <div key={sc.label} className="flex items-center justify-between gap-4 border-b border-slate-800 py-2 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-slate-200">{sc.label}</p>
                      {sc.description && <p className="text-xs text-slate-400">{sc.description}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                      {sc.keys.map((k, i) => (
                        <span key={i} className="flex items-center gap-1">
                          <Kbd>{keyFor(k)}</Kbd>
                          {i < sc.keys.length - 1 && <span className="text-slate-500">+</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </SettingsSection>
            ))
          )}
        </div>

        <SettingsSection title="Tips" description="Get the most out of keyboard shortcuts">
          {[
            ['Learn navigation first', <>Master <Kbd>{isMac ? 'Cmd' : 'Ctrl'}</Kbd> + <Kbd>K</Kbd> and channel navigation to move around quickly.</>],
            ['Use the quick switcher', <>Press <Kbd>{isMac ? 'Cmd' : 'Ctrl'}</Kbd> + <Kbd>K</Kbd> to quickly jump to any channel, DM, or search.</>],
            ['Format messages efficiently', <>Use formatting shortcuts like <Kbd>{isMac ? 'Cmd' : 'Ctrl'}</Kbd> + <Kbd>B</Kbd> for bold while composing.</>],
          ].map(([title, body], i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg border border-slate-700 p-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sm font-bold text-sky-400">{i + 1}</div>
              <div>
                <p className="font-medium text-slate-200">{title}</p>
                <p className="text-sm text-slate-400">{body}</p>
              </div>
            </div>
          ))}
        </SettingsSection>

        <div className="rounded-lg border border-sky-800 bg-sky-950/50 p-4">
          <p className="text-sm text-sky-200">
            <strong>Coming soon:</strong> Custom keyboard shortcut bindings will be available in a future update. You'll be able to remap any shortcut to your preferred key combination.
          </p>
        </div>
      </div>
    </SettingsLayout>
  )
}
