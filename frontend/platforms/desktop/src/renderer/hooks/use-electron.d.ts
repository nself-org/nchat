/**
 * useElectron Hook
 *
 * React hook for Electron desktop features
 */
/**
 * Electron hook interface
 */
export interface UseElectronResult {
    isElectron: boolean;
    platform: string;
    isMac: boolean;
    isWindows: boolean;
    isLinux: boolean;
    appVersion: string | null;
    appName: string | null;
}
/**
 * useElectron Hook
 *
 * Provides access to Electron desktop API and platform detection
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const { isElectron, platform, appVersion } = useElectron()
 *
 *   if (!isElectron) {
 *     return <div>Not running in Electron</div>
 *   }
 *
 *   return <div>Running on {platform}, version {appVersion}</div>
 * }
 * ```
 */
export declare function useElectron(): UseElectronResult;
//# sourceMappingURL=use-electron.d.ts.map