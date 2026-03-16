/**
 * Clipboard Hook for ɳChat Desktop
 *
 * Wraps Electron's clipboard IPC bridge for reading/writing text and images.
 * Falls back to the browser Clipboard API when not running in Electron.
 *
 * @example
 * ```typescript
 * function MessageInput() {
 *   const { readText, writeText, readImage, hasImage } = useClipboard()
 *
 *   const handlePaste = async () => {
 *     if (await hasImage()) {
 *       const dataUrl = await readImage()
 *       // Insert image attachment
 *     } else {
 *       const text = await readText()
 *       insertText(text)
 *     }
 *   }
 * }
 * ```
 */

import { useCallback } from 'react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const electronAPI = (): any => (window as any).electronAPI ?? null

export function useClipboard() {
  const readText = useCallback(async (): Promise<string> => {
    const api = electronAPI()
    if (api?.readClipboardText) {
      return api.readClipboardText()
    }
    // Browser fallback
    try {
      return await navigator.clipboard.readText()
    } catch {
      return ''
    }
  }, [])

  const writeText = useCallback((text: string): void => {
    const api = electronAPI()
    if (api?.writeClipboardText) {
      api.writeClipboardText(text)
      return
    }
    // Browser fallback
    navigator.clipboard.writeText(text).catch(() => {})
  }, [])

  const readImage = useCallback(async (): Promise<string | null> => {
    const api = electronAPI()
    if (api?.readClipboardImage) {
      return api.readClipboardImage()
    }
    return null
  }, [])

  const writeImage = useCallback((dataUrl: string): void => {
    const api = electronAPI()
    if (api?.writeClipboardImage) {
      api.writeClipboardImage(dataUrl)
    }
  }, [])

  const hasImage = useCallback(async (): Promise<boolean> => {
    const api = electronAPI()
    if (api?.clipboardHasImage) {
      return api.clipboardHasImage()
    }
    return false
  }, [])

  return { readText, writeText, readImage, writeImage, hasImage }
}
