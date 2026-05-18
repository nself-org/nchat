/**
 * Use Video Layout Hook
 *
 * Manages video call layout modes and tile positions.
 */

"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  LayoutManager,
  createLayoutManager,
  type LayoutMode,
  type LayoutDimensions,
  type ParticipantTile,
  type LayoutResult,
} from "@/lib/calls/layout-manager";

// =============================================================================
// Types
// =============================================================================

export interface UseVideoLayoutOptions {
  containerRef: React.RefObject<HTMLElement | null>;
  participantIds: string[];
  initialMode?: LayoutMode;
  speakingParticipantId?: string;
  screenShareParticipantId?: string;
}

export interface UseVideoLayoutReturn {
  // Layout
  mode: LayoutMode;
  tiles: ParticipantTile[];
  mainTile: ParticipantTile | null;
  thumbnails: ParticipantTile[];

  // Actions
  setMode: (mode: LayoutMode) => void;
  pinParticipant: (participantId: string | null) => void;
  setSpeakingParticipant: (participantId: string | null) => void;
  setScreenShareParticipant: (participantId: string | null) => void;

  // Utilities
  getTileForParticipant: (participantId: string) => ParticipantTile | null;
  recalculateLayout: () => void;
}

// =============================================================================
// Hook
// =============================================================================

export function useVideoLayout(
  options: UseVideoLayoutOptions,
): UseVideoLayoutReturn {
  const {
    containerRef,
    participantIds,
    initialMode = "grid",
    speakingParticipantId,
    screenShareParticipantId,
  } = options;

  const [mode, setModeState] = useState<LayoutMode>(initialMode);
  const [layout, setLayout] = useState<LayoutResult>({
    tiles: [],
    mainTile: null,
    thumbnails: [],
  });
  const [dimensions, setDimensions] = useState<LayoutDimensions>({
    containerWidth: 0,
    containerHeight: 0,
    participantCount: 0,
  });

  const layoutManagerRef = useRef<LayoutManager>(
    createLayoutManager({
      mode: initialMode,
      speakingParticipantId: speakingParticipantId ?? undefined,
      screenShareParticipantId: screenShareParticipantId ?? undefined,
    }),
  );

  // ===========================================================================
  // Layout Calculation
  // ===========================================================================

  const calculateLayout = useCallback(() => {
    if (!containerRef.current) {
      return;
    }

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();

    const newDimensions: LayoutDimensions = {
      containerWidth: rect.width,
      containerHeight: rect.height,
      participantCount: participantIds.length,
    };

    setDimensions(newDimensions);

    const newLayout = layoutManagerRef.current.calculateLayout(
      participantIds,
      newDimensions,
    );
    setLayout(newLayout);
  }, [containerRef, participantIds]);

  // ===========================================================================
  // Resize Observer
  // ===========================================================================

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      calculateLayout();
    });

    resizeObserver.observe(containerRef.current);

    // Initial calculation
    calculateLayout();

    return () => {
      resizeObserver.disconnect();
    };
  }, [containerRef, calculateLayout]);

  // ===========================================================================
  // Update on participant changes
  // ===========================================================================

  useEffect(() => {
    calculateLayout();
  }, [participantIds, calculateLayout]);

  // ===========================================================================
  // Update on speaking/screen share changes
  // ===========================================================================

  useEffect(() => {
    if (speakingParticipantId !== undefined) {
      layoutManagerRef.current.setSpeakingParticipant(speakingParticipantId);
      calculateLayout();
    }
  }, [speakingParticipantId, calculateLayout]);

  useEffect(() => {
    if (screenShareParticipantId !== undefined) {
      layoutManagerRef.current.setScreenShareParticipant(
        screenShareParticipantId,
      );
      calculateLayout();
    }
  }, [screenShareParticipantId, calculateLayout]);

  // ===========================================================================
  // Actions
  // ===========================================================================

  const setMode = useCallback(
    (newMode: LayoutMode) => {
      setModeState(newMode);
      layoutManagerRef.current.setMode(newMode);
      calculateLayout();
    },
    [calculateLayout],
  );

  const pinParticipant = useCallback(
    (participantId: string | null) => {
      layoutManagerRef.current.setPinnedParticipant(participantId);
      calculateLayout();
    },
    [calculateLayout],
  );

  const setSpeakingParticipant = useCallback(
    (participantId: string | null) => {
      layoutManagerRef.current.setSpeakingParticipant(participantId);
      calculateLayout();
    },
    [calculateLayout],
  );

  const setScreenShareParticipant = useCallback(
    (participantId: string | null) => {
      layoutManagerRef.current.setScreenShareParticipant(participantId);
      calculateLayout();
    },
    [calculateLayout],
  );

  // ===========================================================================
  // Utilities
  // ===========================================================================

  const getTileForParticipant = useCallback(
    (participantId: string): ParticipantTile | null => {
      return (
        layout.tiles.find((tile) => tile.participantId === participantId) ||
        null
      );
    },
    [layout.tiles],
  );

  const recalculateLayout = useCallback(() => {
    calculateLayout();
  }, [calculateLayout]);

  // ===========================================================================
  // Return
  // ===========================================================================

  return {
    // Layout
    mode,
    tiles: layout.tiles,
    mainTile: layout.mainTile,
    thumbnails: layout.thumbnails,

    // Actions
    setMode,
    pinParticipant,
    setSpeakingParticipant,
    setScreenShareParticipant,

    // Utilities
    getTileForParticipant,
    recalculateLayout,
  };
}
