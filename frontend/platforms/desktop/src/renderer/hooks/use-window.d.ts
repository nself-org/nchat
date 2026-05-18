/**
 * useWindow Hook
 *
 * React hook for window controls
 */
/**
 * Window hook interface
 */
export interface UseWindowResult {
    isMaximized: boolean;
    minimize: () => void;
    maximize: () => void;
    close: () => void;
    toggleMaximize: () => void;
}
/**
 * useWindow Hook
 *
 * Provides window control functions for Electron
 *
 * @example
 * ```typescript
 * function TitleBar() {
 *   const { isMaximized, minimize, maximize, close } = useWindow()
 *
 *   return (
 *     <div className="title-bar">
 *       <button onClick={minimize}>−</button>
 *       <button onClick={maximize}>{isMaximized ? '❐' : '☐'}</button>
 *       <button onClick={close}>✕</button>
 *     </div>
 *   )
 * }
 * ```
 */
export declare function useWindow(): UseWindowResult;
//# sourceMappingURL=use-window.d.ts.map