/**
 * Purpose:    Form + toolbar controls shared by ported admin pages that @nself/ui does not yet
 *             expose (Textarea, Select, Field group, ToolbarButton, ConfirmDialog, Modal).
 *             Button/Input come from @nself/ui; the rest are thin Tailwind atoms so pages can
 *             reproduce the legacy shadcn forms/dialogs faithfully without leaving isolation.
 * Inputs:     presentational props per component.
 * Outputs:    Accessible Tailwind form controls + dialogs.
 * Constraints:Presentational only. RTL-safe Tailwind logical props. Dialogs are simple modal
 *             overlays (focus-trap-light) — adequate for admin tooling parity.
 * SOT:        F-NCHAT-VITE-ADMIN-CONTROLS-01
 */
import { useEffect, useId, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { X } from 'lucide-react'
import { Button } from '@nself/ui'

/** Field — label + control + hint wrapper. */
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-200">{label}</span>
      {children}
      {hint && <span className="block text-xs text-slate-500">{hint}</span>}
    </label>
  )
}

const CONTROL =
  'w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none'

/** Textarea — multi-line text input. */
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${CONTROL} ${props.className ?? ''}`} />
}

interface SelectOption {
  value: string
  label: string
}

/** Select — native styled select. */
export function Select({
  options,
  className,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { options: SelectOption[] }) {
  return (
    <select {...rest} className={`${CONTROL} ${className ?? ''}`}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

/** ToolbarButton — secondary/ghost action button used in admin page headers. */
export function ToolbarButton({
  icon,
  children,
  onClick,
  disabled,
  variant = 'secondary',
}: {
  icon?: ReactNode
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive'
}) {
  return (
    <Button variant={variant} size="sm" onClick={onClick} disabled={disabled}>
      <span className="inline-flex items-center gap-2">
        {icon}
        {children}
      </span>
    </Button>
  )
}

/** Modal — lightweight overlay dialog. */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children?: ReactNode
  footer?: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-lg border border-slate-800 bg-slate-900 shadow-xl">
        <header className="flex items-start justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-100">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-slate-400">{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </header>
        {children && <div className="space-y-4 px-5 py-4">{children}</div>}
        {footer && <footer className="flex justify-end gap-2 border-t border-slate-800 px-5 py-4">{footer}</footer>}
      </div>
    </div>
  )
}

/** ConfirmDialog — destructive/confirm action modal. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel = 'Confirm',
  destructive,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  body: string
  confirmLabel?: string
  destructive?: boolean
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={destructive ? 'destructive' : 'primary'} size="sm" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-300">{body}</p>
    </Modal>
  )
}

/** Checkbox row with label. */
export function CheckboxRow({
  label,
  checked,
  onChange,
}: {
  label: ReactNode
  checked: boolean
  onChange: (next: boolean) => void
}) {
  const id = useId()
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-2 text-sm text-slate-200">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-sky-500"
      />
      {label}
    </label>
  )
}
