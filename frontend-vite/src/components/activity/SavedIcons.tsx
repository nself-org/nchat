/**
 * Purpose:    Inline SVG icons for the saved-messages views (bookmark, star, folder, plus,
 *             download, trash, pencil, share, dots, back arrow). Self-contained so the saved
 *             pages need no external icon library — keeps the group fully isolated.
 * Inputs:     className per icon; `filled` on Star to toggle the starred look.
 * Outputs:    Icon components.
 * Constraints:Presentational only; currentColor stroke/fill.
 * SOT:        F-NCHAT-VITE-SAVED-ICONS-01
 */
import type { JSX } from 'react'

interface IconProps {
  className?: string
}

function Svg({
  className,
  children,
  fill = 'none',
}: IconProps & { children: JSX.Element | JSX.Element[]; fill?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function BookmarkIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </Svg>
  )
}
export function StarIcon({ className, filled }: IconProps & { filled?: boolean }) {
  return (
    <Svg className={className} fill={filled ? 'currentColor' : 'none'}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </Svg>
  )
}
export function FolderIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </Svg>
  )
}
export function PlusIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </Svg>
  )
}
export function DownloadIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </Svg>
  )
}
export function TrashIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </Svg>
  )
}
export function PencilIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z" />
    </Svg>
  )
}
export function ShareIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </Svg>
  )
}
export function MoreIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
      <circle cx="5" cy="12" r="1" />
    </Svg>
  )
}
export function BackIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </Svg>
  )
}
export function PaperclipIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </Svg>
  )
}
