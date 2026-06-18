/**
 * Purpose:    Group-local presentational primitives shared by every settings sub-page —
 *             ports legacy SettingsSection, SettingsRow, PageHeader, Toggle (switch), RadioCard,
 *             Select, Textarea, and a save-status banner. Kept here (not @nself/ui) because they are
 *             settings-specific compositions; only generic primitives belong in @nself/ui.
 * Inputs:     Per-component props (see each interface).
 * Outputs:    Accessible Tailwind UI fragments (slate palette, logical properties, RTL-ready).
 * Constraints:Presentational only — no data fetching. WCAG 2.1 AA: labelled controls, role=switch,
 *             aria-current/checked. Tailwind config defines no shadcn tokens → use slate/sky scale.
 * SOT:        F-NCHAT-VITE-SETTINGS-PRIMS-01
 */
import type { ReactNode, ChangeEvent } from 'react'
import type { LucideIcon } from 'lucide-react'

// ─── Page header ────────────────────────────────────────────────────────────
export function PageHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description: string
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10">
        <Icon className="h-5 w-5 text-sky-400" aria-hidden="true" />
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">{title}</h1>
        <p className="text-sm text-slate-400">{description}</p>
      </div>
    </div>
  )
}

// ─── Section card ───────────────────────────────────────────────────────────
export function SettingsSection({
  title,
  description,
  children,
  className,
}: {
  title: string
  description?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-xl border border-slate-800 bg-slate-900 ${className ?? ''}`}>
      <header className="border-b border-slate-800 px-5 py-4">
        <h2 className="text-base font-semibold text-slate-100">{title}</h2>
        {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
      </header>
      <div className="space-y-4 px-5 py-4">{children}</div>
    </section>
  )
}

// ─── Labelled row (vertical = label above control; default = inline) ─────────
export function SettingsRow({
  label,
  description,
  htmlFor,
  vertical = false,
  children,
}: {
  label: string
  description?: string
  htmlFor?: string
  vertical?: boolean
  children: ReactNode
}) {
  if (vertical) {
    return (
      <div className="space-y-2">
        <div>
          <label htmlFor={htmlFor} className="text-sm font-medium text-slate-200">
            {label}
          </label>
          {description && <p className="text-sm text-slate-400">{description}</p>}
        </div>
        {children}
      </div>
    )
  }
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div className="space-y-0.5">
        <label htmlFor={htmlFor} className="cursor-pointer text-sm font-medium text-slate-200">
          {label}
        </label>
        {description && <p className="text-sm text-slate-400">{description}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

// ─── Toggle (accessible switch) ─────────────────────────────────────────────
export function Toggle({
  id,
  label,
  description,
  checked,
  onChange,
  disabled = false,
  testId,
}: {
  id: string
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  testId?: string
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="flex-1">
        <label htmlFor={id} className={`block text-sm font-medium ${disabled ? 'text-slate-500' : 'text-slate-200'}`}>
          {label}
        </label>
        {description && (
          <p id={`${id}-desc`} className="mt-0.5 text-sm text-slate-400">
            {description}
          </p>
        )}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={description ? `${id}-desc` : undefined}
        aria-label={label}
        disabled={disabled}
        data-testid={testId}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50 ${
          checked ? 'bg-sky-600' : 'bg-slate-700'
        }`}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
            checked ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

// ─── Radio card group ───────────────────────────────────────────────────────
export interface RadioOption<V extends string> {
  value: V
  label: string
  description?: string
  icon?: LucideIcon
}

export function RadioCardGroup<V extends string>({
  name,
  value,
  options,
  onChange,
}: {
  name: string
  value: V
  options: ReadonlyArray<RadioOption<V>>
  onChange: (value: V) => void
}) {
  return (
    <div role="radiogroup" aria-label={name} className="space-y-3">
      {options.map((opt) => {
        const active = value === opt.value
        const id = `${name}-${opt.value}`
        return (
          <label
            key={opt.value}
            htmlFor={id}
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
              active ? 'border-sky-500 bg-sky-500/10' : 'border-slate-700 hover:bg-slate-800'
            }`}
          >
            <input
              id={id}
              type="radio"
              name={name}
              value={opt.value}
              checked={active}
              onChange={() => onChange(opt.value)}
              className="mt-1 h-4 w-4 accent-sky-600"
            />
            <span className="flex-1">
              <span className="flex items-center gap-2 font-medium text-slate-200">
                {opt.icon && <opt.icon className="h-4 w-4 text-slate-400" aria-hidden="true" />}
                {opt.label}
              </span>
              {opt.description && <span className="mt-0.5 block text-sm text-slate-400">{opt.description}</span>}
            </span>
          </label>
        )
      })}
    </div>
  )
}

// ─── Native select ──────────────────────────────────────────────────────────
export function Select({
  id,
  value,
  options,
  onChange,
  disabled = false,
  testId,
  ariaLabel,
}: {
  id?: string
  value: string
  options: ReadonlyArray<{ value: string; label: string }>
  onChange: (value: string) => void
  disabled?: boolean
  testId?: string
  ariaLabel?: string
}) {
  return (
    <select
      id={id}
      value={value}
      disabled={disabled}
      data-testid={testId}
      aria-label={ariaLabel}
      onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
      className="block w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

// ─── Textarea ───────────────────────────────────────────────────────────────
export function Textarea({
  id,
  name,
  value,
  onChange,
  placeholder,
  disabled,
  maxLength,
  rows = 3,
  testId,
}: {
  id?: string
  name?: string
  value: string
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void
  placeholder?: string
  disabled?: boolean
  maxLength?: number
  rows?: number
  testId?: string
}) {
  return (
    <textarea
      id={id}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      maxLength={maxLength}
      rows={rows}
      data-testid={testId}
      className="block w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
    />
  )
}

// ─── Save status banner ─────────────────────────────────────────────────────
export function SavedNotice({ show, message = 'Changes saved successfully!' }: { show: boolean; message?: string }) {
  if (!show) return null
  return (
    <p role="status" className="text-sm text-emerald-400">
      {message}
    </p>
  )
}
