/**
 * Purpose:    Message input composer for the channel view. Ported from the legacy
 *             ChatContainer composer: a growable textarea with Enter-to-send,
 *             Shift+Enter for newline, and a disabled state while sending.
 * Inputs:     onSend(content) callback, disabled flag, placeholder.
 * Outputs:    A controlled composer form; clears + refocuses on submit.
 * Constraints:Presentational + local state only. Send wiring (the message-send Action,
 *             P3 N-2-S3g) is provided by the parent — when the Action is not live the
 *             parent disables the composer and surfaces the pending state.
 * SOT:        F-NCHAT-VITE-CHAT-COMPOSER-01
 */
import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { SendHorizonal } from 'lucide-react'
import { Button } from '@nself/ui'

interface Props {
  onSend: (content: string) => void
  disabled?: boolean
  placeholder?: string
}

export function MessageComposer({ onSend, disabled = false, placeholder }: Props) {
  const [value, setValue] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

  function submit() {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
    ref.current?.focus()
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    submit()
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-end gap-2 border-t border-slate-800 bg-slate-950 p-3"
    >
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={1}
        disabled={disabled}
        placeholder={placeholder ?? 'Write a message…'}
        aria-label="Message input"
        className="max-h-40 min-h-[2.5rem] flex-1 resize-none rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none disabled:opacity-50"
      />
      <Button type="submit" disabled={disabled || value.trim().length === 0} aria-label="Send message">
        <SendHorizonal className="h-4 w-4" />
      </Button>
    </form>
  )
}
