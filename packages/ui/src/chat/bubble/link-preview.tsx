/**
 * Link preview components — ported from nchat/frontend/src/components/link-preview/
 * useLinkPreview hook replaced with LinkPreviewAdapter interface.
 * Specialized platform renderers (Twitter, YouTube, GitHub, etc.) inlined.
 *
 * @module chat/bubble/link-preview
 */

'use client'

import * as React from 'react'
import { cn } from '../../lib/utils'
import type { LinkPreviewData } from './types'

// ============================================================================
// Adapter
// ============================================================================

export interface LinkPreviewAdapter {
  /** Fetch metadata for a URL; resolve null if unavailable */
  fetchPreview: (url: string) => Promise<LinkPreviewData | null>
}

// ============================================================================
// Types
// ============================================================================

export interface LinkPreviewProps {
  /** URL to preview */
  url: string
  /** Adapter for fetching preview data */
  adapter: LinkPreviewAdapter
  /** Visual layout variant */
  variant?: 'vertical' | 'horizontal' | 'compact'
  /** Whether to show a dismiss button */
  dismissible?: boolean
  /** Called when dismiss is clicked */
  onDismiss?: () => void
  /** Additional class name */
  className?: string
}

export interface LinkCardProps {
  /** Preview data to render */
  data: LinkPreviewData
  /** Visual layout variant */
  variant?: 'vertical' | 'horizontal' | 'compact'
  /** Whether to show a dismiss button */
  dismissible?: boolean
  /** Called when dismiss is clicked */
  onDismiss?: () => void
  /** Additional class name */
  className?: string
}

interface LinkPreviewState {
  data: LinkPreviewData | null
  loading: boolean
  error: boolean
}

// ============================================================================
// Helpers
// ============================================================================

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function isYouTube(url: string): boolean {
  return /youtube\.com|youtu\.be/.test(url)
}

function isTwitter(url: string): boolean {
  return /twitter\.com|x\.com/.test(url)
}

function isGitHub(url: string): boolean {
  return /github\.com/.test(url)
}

function isSpotify(url: string): boolean {
  return /spotify\.com/.test(url)
}

function getYouTubeEmbedId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/)
  return m ? (m[1] ?? null) : null
}

// ============================================================================
// Specialized Renderers
// ============================================================================

function YouTubeCard({ data, className }: { data: LinkPreviewData; className?: string }) {
  const [showEmbed, setShowEmbed] = React.useState(false)
  const embedId = getYouTubeEmbedId(data.url)

  return (
    <div className={cn('overflow-hidden rounded-lg border bg-card', className)}>
      {showEmbed && embedId ? (
        <div className="aspect-video w-full">
          <iframe
            src={`https://www.youtube.com/embed/${embedId}?autoplay=1`}
            title={data.title ?? 'YouTube video'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowEmbed(true)}
          className="relative block w-full overflow-hidden bg-black"
        >
          {data.image && (
            <img
              src={data.image}
              alt={data.title ?? ''}
              className="aspect-video w-full object-cover opacity-80 transition-opacity hover:opacity-100"
            />
          )}
          {/* Play button overlay */}
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 shadow-lg">
              <svg viewBox="0 0 24 24" className="h-7 w-7 translate-x-0.5 text-white" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </span>
        </button>
      )}
      <div className="p-2.5">
        <a
          href={data.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-sm font-medium text-foreground hover:underline"
        >
          {data.title}
        </a>
        {data.description && (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{data.description}</p>
        )}
        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-sm bg-red-600">
            <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 text-white" fill="currentColor">
              <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0C.488 3.45.029 5.804 0 12c.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0C23.512 20.55 23.971 18.196 24 12c-.029-6.185-.484-8.549-4.385-8.816ZM9 16V8l8 3.993L9 16Z"/>
            </svg>
          </span>
          YouTube
        </div>
      </div>
    </div>
  )
}

function GitHubCard({ data, className }: { data: LinkPreviewData; className?: string }) {
  return (
    <a
      href={data.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'flex items-start gap-3 overflow-hidden rounded-lg border bg-card p-3',
        'transition-colors hover:bg-accent/30',
        className
      )}
    >
      {data.favicon && (
        <img src={data.favicon} alt="GitHub" className="mt-0.5 h-5 w-5 shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{data.title}</p>
        {data.description && (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{data.description}</p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">{getDomain(data.url)}</p>
      </div>
      {data.image && !data.image.includes('avatar') && (
        <img
          src={data.image}
          alt=""
          className="h-14 w-14 shrink-0 rounded-md object-cover"
        />
      )}
    </a>
  )
}

function SpotifyCard({ data, className }: { data: LinkPreviewData; className?: string }) {
  // Extract embed URL from Spotify share URL
  const embedUrl = data.url
    .replace('open.spotify.com/', 'open.spotify.com/embed/')
    .split('?')[0]

  return (
    <div className={cn('overflow-hidden rounded-lg border bg-card', className)}>
      <iframe
        src={embedUrl}
        title={data.title ?? 'Spotify'}
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        className="h-20 w-full border-0"
      />
    </div>
  )
}

// ============================================================================
// Generic Link Card
// ============================================================================

export function LinkCard({
  data,
  variant = 'horizontal',
  dismissible = false,
  onDismiss,
  className,
}: LinkCardProps) {
  // Delegate to specialized renderers
  if (isYouTube(data.url)) return <YouTubeCard data={data} className={className} />
  if (isGitHub(data.url)) return <GitHubCard data={data} className={className} />
  if (isSpotify(data.url)) return <SpotifyCard data={data} className={className} />

  const domain = getDomain(data.url)
  const hasImage = !!data.image

  if (variant === 'compact') {
    return (
      <a
        href={data.url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md border bg-card px-2 py-1 text-xs',
          'transition-colors hover:bg-accent/30',
          className
        )}
      >
        {data.favicon && (
          <img src={data.favicon} alt="" className="h-3.5 w-3.5 object-contain" />
        )}
        <span className="max-w-48 truncate font-medium text-foreground">
          {data.title || domain}
        </span>
        <span className="shrink-0 text-muted-foreground">{domain}</span>
      </a>
    )
  }

  if (variant === 'vertical') {
    return (
      <div className={cn('relative overflow-hidden rounded-lg border bg-card', className)}>
        {dismissible && onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss preview"
            className={cn(
              'absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full',
              'bg-background/80 text-muted-foreground backdrop-blur-sm',
              'hover:bg-background hover:text-foreground'
            )}
          >
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 4 4 12M4 4l8 8" strokeLinecap="round" />
            </svg>
          </button>
        )}
        {hasImage && (
          <img
            src={data.image!}
            alt={data.title ?? ''}
            className="aspect-video w-full object-cover"
          />
        )}
        <div className="p-3">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {data.favicon && (
              <img src={data.favicon} alt="" className="h-3.5 w-3.5 object-contain" />
            )}
            <span>{data.siteName || domain}</span>
          </div>
          <a
            href={data.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 block font-semibold text-foreground hover:underline"
          >
            {data.title}
          </a>
          {data.description && (
            <p className="mt-0.5 line-clamp-3 text-sm text-muted-foreground">{data.description}</p>
          )}
        </div>
      </div>
    )
  }

  // Default: horizontal
  return (
    <a
      href={data.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'relative flex overflow-hidden rounded-lg border bg-card',
        'transition-colors hover:bg-accent/20',
        className
      )}
    >
      {/* Left accent */}
      <span className="w-1 shrink-0 bg-primary/60" />
      {/* Content */}
      <div className="flex min-w-0 flex-1 gap-3 p-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {data.favicon && (
              <img src={data.favicon} alt="" className="h-3.5 w-3.5 object-contain" />
            )}
            <span className="truncate">{data.siteName || domain}</span>
          </div>
          <p className="mt-0.5 truncate text-sm font-semibold text-foreground">{data.title}</p>
          {data.description && (
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{data.description}</p>
          )}
        </div>
        {hasImage && (
          <img
            src={data.image!}
            alt=""
            className="h-16 w-16 shrink-0 rounded-md object-cover"
          />
        )}
      </div>
      {dismissible && onDismiss && (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); onDismiss() }}
          aria-label="Dismiss preview"
          className={cn(
            'absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full',
            'bg-background/80 text-muted-foreground backdrop-blur-sm',
            'hover:bg-background hover:text-foreground'
          )}
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 4 4 12M4 4l8 8" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </a>
  )
}

// ============================================================================
// Link Preview (with async fetch)
// ============================================================================

export function LinkPreview({
  url,
  adapter,
  variant = 'horizontal',
  dismissible = false,
  onDismiss,
  className,
}: LinkPreviewProps) {
  const [state, setState] = React.useState<LinkPreviewState>({
    data: null,
    loading: true,
    error: false,
  })

  React.useEffect(() => {
    let cancelled = false
    setState({ data: null, loading: true, error: false })

    adapter.fetchPreview(url).then(
      (data) => {
        if (cancelled) return
        setState({ data, loading: false, error: false })
      },
      () => {
        if (cancelled) return
        setState({ data: null, loading: false, error: true })
      }
    )

    return () => { cancelled = true }
  }, [url, adapter])

  if (state.loading) {
    return (
      <div
        className={cn(
          'flex h-20 overflow-hidden rounded-lg border bg-card',
          className
        )}
      >
        <span className="w-1 shrink-0 bg-primary/20" />
        <div className="flex flex-1 flex-col justify-center gap-2 p-3">
          <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-2 w-1/2 animate-pulse rounded bg-muted" />
          <div className="h-2 w-full animate-pulse rounded bg-muted" />
        </div>
      </div>
    )
  }

  if (state.error || !state.data) return null

  return (
    <LinkCard
      data={state.data}
      variant={variant}
      dismissible={dismissible}
      onDismiss={onDismiss}
      className={className}
    />
  )
}

export default LinkPreview
