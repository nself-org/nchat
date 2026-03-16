/**
 * Desktop Hooks
 *
 * Export all desktop-specific React hooks
 */

export { useElectron } from './use-electron'
export type { UseElectronResult } from './use-electron'

export { useWindow } from './use-window'
export type { UseWindowResult } from './use-window'

export { useNativeMenu, triggerMenuAction } from './use-native-menu'
export type { MenuActionCallback } from './use-native-menu'

export { useScreenShare } from './use-screen-share'
export type { ScreenSource } from './use-screen-share'

export { useClipboard } from './use-clipboard'
