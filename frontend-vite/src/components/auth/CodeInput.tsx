/**
 * Purpose:    Six-box one-time-code input for 2FA TOTP entry. Faithful port of the legacy
 *             auth/2fa-verify keypad: per-digit boxes, auto-advance, backspace-to-previous,
 *             arrow navigation, paste-to-fill, and auto-submit when all 6 digits are present.
 * Inputs:     value (string[6]), onChange(next string[6]), onComplete(code) when full,
 *             disabled flag.
 * Outputs:    Six numeric inputs.
 * Constraints:Presentational + local focus management only — no data fetching. Digits only.
 *             WCAG: each box has an aria-label; group is labelled by the caller.
 * SOT:        F-NCHAT-VITE-AUTH-CODE-INPUT-01
 */
import { useRef, type KeyboardEvent, type ClipboardEvent } from 'react'

const LENGTH = 6

interface Props {
  value: string[]
  onChange: (next: string[]) => void
  onComplete?: (code: string) => void
  disabled?: boolean
}

export function CodeInput({ value, onChange, onComplete, disabled }: Props) {
  const refs = useRef<(HTMLInputElement | null)[]>([])

  const commit = (next: string[]) => {
    onChange(next)
    if (next.every((d) => d) && onComplete) onComplete(next.join(''))
  }

  const handleChange = (index: number, raw: string) => {
    const digit = raw.replace(/[^0-9]/g, '')
    if (digit.length > 1) return
    const next = [...value]
    next[index] = digit
    onChange(next)
    if (digit && index < LENGTH - 1) refs.current[index + 1]?.focus()
    if (digit && index === LENGTH - 1 && next.every((d) => d)) commit(next)
  }

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      const next = [...value]
      if (value[index]) {
        next[index] = ''
        onChange(next)
      } else if (index > 0) {
        next[index - 1] = ''
        onChange(next)
        refs.current[index - 1]?.focus()
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      refs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < LENGTH - 1) {
      refs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const digits = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, LENGTH).split('')
    const next = [...value]
    digits.forEach((d, i) => {
      if (i < LENGTH) next[i] = d
    })
    const firstEmpty = next.findIndex((d) => !d)
    refs.current[firstEmpty === -1 ? LENGTH - 1 : firstEmpty]?.focus()
    commit(next)
  }

  return (
    <div className="flex justify-center gap-2">
      {value.map((digit, index) => (
        <input
          // eslint-disable-next-line react/no-array-index-key
          key={index}
          ref={(el) => {
            refs.current[index] = el
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          aria-label={`Digit ${index + 1} of ${LENGTH}`}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={index === 0 ? handlePaste : undefined}
          disabled={disabled}
          autoComplete="off"
          className="h-14 w-12 rounded-md border border-slate-300 bg-white text-center text-2xl font-semibold text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
      ))}
    </div>
  )
}
