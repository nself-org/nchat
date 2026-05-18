/**
 * useElectronWindow Hook
 *
 * Hook for window management in Electron.
 * Provides window controls and state management.
 */

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  isElectron,
  showWindow,
  hideWindow,
  minimizeWindow,
  maximizeWindow,
  toggleFullscreen,
  isWindowMaximized,
  isWindowFullscreen,
  isWindowFocused,
  setZoomLevel as setZoom,
  getZoomLevel as getZoom,
  zoomIn,
  zoomOut,
  resetZoom,
  reloadWindow,
  clearCache,
  getWindowState,
  onWindowStateChange,
  getModifierKey,
  getModifierLabel,
  type WindowState,
} from "@/lib/electron";

export interface UseElectronWindowReturn {
  /** Current window state */
  state: WindowState;
  /** Whether window is maximized */
  isMaximized: boolean;
  /** Whether window is in fullscreen mode */
  isFullscreen: boolean;
  /** Whether window is focused */
  isFocused: boolean;
  /** Current zoom level */
  zoomLevel: number;
  /** Show the window */
  show: () => Promise<void>;
  /** Hide the window */
  hide: () => Promise<void>;
  /** Minimize the window */
  minimize: () => Promise<void>;
  /** Maximize or restore the window */
  maximize: () => Promise<void>;
  /** Toggle fullscreen mode */
  toggleFullscreen: () => Promise<void>;
  /** Set zoom level */
  setZoom: (level: number) => Promise<void>;
  /** Zoom in */
  zoomIn: () => Promise<void>;
  /** Zoom out */
  zoomOut: () => Promise<void>;
  /** Reset zoom to 100% */
  resetZoom: () => Promise<void>;
  /** Reload the window */
  reload: () => Promise<void>;
  /** Clear cache */
  clearCache: () => Promise<void>;
  /** Keyboard modifier key (Meta for Mac, Control for others) */
  modifierKey: "Meta" | "Control";
  /** Keyboard modifier label for display */
  modifierLabel: string;
}

/**
 * Hook for Electron window management
 *
 * @example
 * ```tsx
 * const {
 *   isMaximized,
 *   isFullscreen,
 *   minimize,
 *   maximize,
 *   toggleFullscreen,
 *   zoomLevel,
 *   setZoom
 * } = useElectronWindow();
 * ```
 */
export function useElectronWindow(): UseElectronWindowReturn {
  const [state, setState] = useState<WindowState>({
    isMaximized: false,
    isFullscreen: false,
    isFocused: true,
    zoomLevel: 1,
  });

  // Initialize state
  useEffect(() => {
    if (!isElectron()) return;

    async function init() {
      const windowState = await getWindowState();
      setState(windowState);
    }

    init();

    // Subscribe to state changes
    const cleanup = onWindowStateChange((partial) => {
      setState((prev) => ({ ...prev, ...partial }));
    });

    return cleanup;
  }, []);

  // Window controls
  const show = useCallback(async () => {
    await showWindow();
  }, []);

  const hide = useCallback(async () => {
    await hideWindow();
  }, []);

  const minimize = useCallback(async () => {
    await minimizeWindow();
  }, []);

  const maximize = useCallback(async () => {
    await maximizeWindow();
    const isMax = await isWindowMaximized();
    setState((prev) => ({ ...prev, isMaximized: isMax }));
  }, []);

  const toggleFS = useCallback(async () => {
    await toggleFullscreen();
    const isFS = await isWindowFullscreen();
    setState((prev) => ({ ...prev, isFullscreen: isFS }));
  }, []);

  // Zoom controls
  const setZoomLevel = useCallback(async (level: number) => {
    const newLevel = await setZoom(level);
    setState((prev) => ({ ...prev, zoomLevel: newLevel }));
  }, []);

  const handleZoomIn = useCallback(async () => {
    const newLevel = await zoomIn();
    setState((prev) => ({ ...prev, zoomLevel: newLevel }));
  }, []);

  const handleZoomOut = useCallback(async () => {
    const newLevel = await zoomOut();
    setState((prev) => ({ ...prev, zoomLevel: newLevel }));
  }, []);

  const handleResetZoom = useCallback(async () => {
    const newLevel = await resetZoom();
    setState((prev) => ({ ...prev, zoomLevel: newLevel }));
  }, []);

  // Other actions
  const reload = useCallback(async () => {
    await reloadWindow();
  }, []);

  const handleClearCache = useCallback(async () => {
    await clearCache();
  }, []);

  // Platform info
  const modifierKey = useMemo(() => getModifierKey(), []);
  const modifierLabel = useMemo(() => getModifierLabel(), []);

  return useMemo(
    () => ({
      state,
      isMaximized: state.isMaximized,
      isFullscreen: state.isFullscreen,
      isFocused: state.isFocused,
      zoomLevel: state.zoomLevel,
      show,
      hide,
      minimize,
      maximize,
      toggleFullscreen: toggleFS,
      setZoom: setZoomLevel,
      zoomIn: handleZoomIn,
      zoomOut: handleZoomOut,
      resetZoom: handleResetZoom,
      reload,
      clearCache: handleClearCache,
      modifierKey,
      modifierLabel,
    }),
    [
      state,
      show,
      hide,
      minimize,
      maximize,
      toggleFS,
      setZoomLevel,
      handleZoomIn,
      handleZoomOut,
      handleResetZoom,
      reload,
      handleClearCache,
      modifierKey,
      modifierLabel,
    ],
  );
}

/**
 * Hook for zoom controls only
 */
export function useZoom() {
  const [zoomLevel, setZoomState] = useState(1);

  useEffect(() => {
    async function init() {
      const level = await getZoom();
      setZoomState(level);
    }
    init();
  }, []);

  const setLevel = useCallback(async (level: number) => {
    const newLevel = await setZoom(level);
    setZoomState(newLevel);
    return newLevel;
  }, []);

  const increase = useCallback(async () => {
    const newLevel = await zoomIn();
    setZoomState(newLevel);
    return newLevel;
  }, []);

  const decrease = useCallback(async () => {
    const newLevel = await zoomOut();
    setZoomState(newLevel);
    return newLevel;
  }, []);

  const reset = useCallback(async () => {
    const newLevel = await resetZoom();
    setZoomState(newLevel);
    return newLevel;
  }, []);

  return {
    zoomLevel,
    setLevel,
    increase,
    decrease,
    reset,
  };
}

export default useElectronWindow;
