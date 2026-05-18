/**
 * useNativeMenu Hook
 *
 * React hook that registers renderer-side callbacks for native Electron menu
 * actions. The Electron main process sends IPC events (e.g. 'new-conversation')
 * when the user selects a menu item; this hook wires those events to the
 * appropriate React handler.
 */
/**
 * Menu action callback type
 */
export type MenuActionCallback = () => void;
/**
 * IPC event channel names sent by the main process menu
 */
declare const MENU_EVENTS: {
    readonly newConversation: "new-conversation";
    readonly preferences: "open-preferences";
    readonly about: "open-about";
    readonly quit: "app-quit";
};
/**
 * useNativeMenu Hook
 *
 * Registers callbacks for native Electron menu actions via contextBridge IPC.
 *
 * @example
 * ```typescript
 * function App() {
 *   useNativeMenu({
 *     onNewConversation: () => setShowNewConversation(true),
 *     onPreferences: () => navigate('/settings'),
 *   })
 *
 *   return <div>App</div>
 * }
 * ```
 */
export declare function useNativeMenu(callbacks: {
    onNewConversation?: MenuActionCallback;
    onPreferences?: MenuActionCallback;
    onAbout?: MenuActionCallback;
    onQuit?: MenuActionCallback;
}): void;
/**
 * Trigger a native menu action programmatically from the renderer.
 *
 * Useful for keyboard shortcut handlers that want to invoke the same
 * action as a menu item without duplicating logic.
 */
export declare function triggerMenuAction(action: keyof typeof MENU_EVENTS): void;
export {};
//# sourceMappingURL=use-native-menu.d.ts.map