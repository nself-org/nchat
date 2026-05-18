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
export interface ScreenSource {
    id: string;
    name: string;
    thumbnailDataUrl: string;
    appIconDataUrl: string | null;
}
export declare function useScreenShare(): {
    sources: ScreenSource[];
    isLoadingSources: boolean;
    isSharing: boolean;
    loadSources: (types?: Array<"screen" | "window">) => Promise<ScreenSource[]>;
    startScreenShare: (sourceId: string) => Promise<MediaStream | null>;
    stopScreenShare: () => void;
};
//# sourceMappingURL=use-screen-share.d.ts.map