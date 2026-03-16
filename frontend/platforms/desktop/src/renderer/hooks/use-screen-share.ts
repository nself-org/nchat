/**
 * Screen Share Hook for ɳChat Desktop
 *
 * Uses Electron's desktopCapturer (via IPC) to enumerate available screen
 * and window sources, then feeds the selected sourceId to
 * navigator.mediaDevices.getUserMedia for the actual stream.
 *
 * This is the desktop-specific replacement for the browser's
 * getDisplayMedia() API which Electron does not expose to the renderer
 * when contextIsolation is enabled.
 *
 * @example
 * ```typescript
 * function CallControls() {
 *   const { sources, loadSources, startScreenShare, stopScreenShare, isSharing } = useScreenShare()
 *
 *   const onShareClick = async () => {
 *     await loadSources()
 *     // Show source picker UI, then:
 *     const stream = await startScreenShare(sources[0].id)
 *     liveKitRoom.localParticipant.publishTrack(stream.getVideoTracks()[0])
 *   }
 *
 *   return <button onClick={onShareClick}>{isSharing ? 'Stop sharing' : 'Share screen'}</button>
 * }
 * ```
 */

import { useState, useCallback, useRef } from 'react'

export interface ScreenSource {
  id: string
  name: string
  thumbnailDataUrl: string
  appIconDataUrl: string | null
}

export function useScreenShare() {
  const [sources, setSources] = useState<ScreenSource[]>([])
  const [isSharing, setIsSharing] = useState(false)
  const [isLoadingSources, setIsLoadingSources] = useState(false)
  const streamRef = useRef<MediaStream | null>(null)

  /**
   * Enumerate available screens and application windows via Electron IPC.
   */
  const loadSources = useCallback(
    async (types: Array<'screen' | 'window'> = ['screen', 'window']) => {
      setIsLoadingSources(true)
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const electronApi = (window as any).electronAPI
        if (!electronApi) {
          console.warn('[ScreenShare] electronAPI not available — not running in Electron')
          return []
        }

        const result: ScreenSource[] = await electronApi.getScreenSources({ types })
        setSources(result)
        return result
      } finally {
        setIsLoadingSources(false)
      }
    },
    []
  )

  /**
   * Start screen share for the given source ID.
   * Returns the MediaStream or null if permission was denied.
   */
  const startScreenShare = useCallback(async (sourceId: string): Promise<MediaStream | null> => {
    try {
      // Electron exposes a chromeMediaSource constraint for desktopCapturer
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          // @ts-expect-error — Electron-specific constraint
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId,
          },
        },
      })

      streamRef.current = stream
      setIsSharing(true)

      // Auto-cleanup when the track ends (user stops via OS controls)
      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        setIsSharing(false)
        streamRef.current = null
      })

      return stream
    } catch (e) {
      console.error('[ScreenShare] getUserMedia failed:', e)
      return null
    }
  }, [])

  /**
   * Stop the active screen share stream.
   */
  const stopScreenShare = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setIsSharing(false)
  }, [])

  return {
    sources,
    isLoadingSources,
    isSharing,
    loadSources,
    startScreenShare,
    stopScreenShare,
  }
}
