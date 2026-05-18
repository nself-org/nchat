/**
 * useMessageVersions Hook
 *
 * Hook for working with specific message versions and comparisons.
 */

"use client";

import { useState, useCallback, useMemo } from "react";
import {
  type MessageVersion,
  type MessageEditHistory,
  type VersionDiff,
  type VersionSelection,
  type ComparisonViewMode,
  calculateVersionDiff,
  getVersion,
  getOriginalVersion,
  getCurrentVersion,
  getCachedHistory,
} from "@/lib/message-history";

export interface UseMessageVersionsOptions {
  /** Message ID */
  messageId: string;
  /** Initial left version number for comparison */
  initialLeftVersion?: number;
  /** Initial right version number for comparison */
  initialRightVersion?: number;
}

export interface UseMessageVersionsReturn {
  /** All versions */
  versions: MessageVersion[];
  /** Currently selected versions for comparison */
  selection: VersionSelection;
  /** The diff between selected versions */
  diff: VersionDiff | null;
  /** Current comparison view mode */
  viewMode: ComparisonViewMode;

  // Version getters
  /** Get a specific version by number */
  getVersionByNumber: (versionNumber: number) => MessageVersion | null;
  /** Get the original version */
  getOriginal: () => MessageVersion | null;
  /** Get the current version */
  getCurrent: () => MessageVersion | null;
  /** Get the previous version relative to a given version */
  getPrevious: (version: MessageVersion) => MessageVersion | null;
  /** Get the next version relative to a given version */
  getNext: (version: MessageVersion) => MessageVersion | null;

  // Selection actions
  /** Select left version */
  selectLeft: (version: MessageVersion | null) => void;
  /** Select right version */
  selectRight: (version: MessageVersion | null) => void;
  /** Select both versions at once */
  selectVersions: (
    left: MessageVersion | null,
    right: MessageVersion | null,
  ) => void;
  /** Swap left and right selections */
  swapSelection: () => void;
  /** Clear selection */
  clearSelection: () => void;
  /** Select original vs current */
  selectOriginalVsCurrent: () => void;

  // View mode
  /** Set comparison view mode */
  setViewMode: (mode: ComparisonViewMode) => void;

  // Computed values
  /** Total number of versions */
  totalVersions: number;
  /** Total number of edits */
  editCount: number;
  /** Whether there are any edits */
  hasEdits: boolean;
  /** Unique editors */
  editors: MessageVersion["editedBy"][];
}

/**
 * Hook for working with message versions and comparisons.
 */
export function useMessageVersions(
  options: UseMessageVersionsOptions,
): UseMessageVersionsReturn {
  const { messageId, initialLeftVersion, initialRightVersion } = options;

  // Load history from cache
  const history = useMemo(() => getCachedHistory(messageId), [messageId]);

  const versions = history?.versions ?? [];

  // Initialize selection
  const [selection, setSelection] = useState<VersionSelection>(() => {
    if (!history) return { left: null, right: null };

    const left = initialLeftVersion
      ? getVersion(history, initialLeftVersion)
      : getOriginalVersion(history);
    const right = initialRightVersion
      ? getVersion(history, initialRightVersion)
      : getCurrentVersion(history);

    return { left: left ?? null, right: right ?? null };
  });

  const [viewMode, setViewMode] = useState<ComparisonViewMode>("inline");

  // Calculate diff between selected versions
  const diff = useMemo(() => {
    if (!selection.left || !selection.right) return null;
    return calculateVersionDiff(selection.left, selection.right);
  }, [selection.left, selection.right]);

  // Version getters
  const getVersionByNumber = useCallback(
    (versionNumber: number): MessageVersion | null => {
      return versions.find((v) => v.versionNumber === versionNumber) ?? null;
    },
    [versions],
  );

  const getOriginal = useCallback((): MessageVersion | null => {
    return versions.find((v) => v.isOriginal) ?? versions[0] ?? null;
  }, [versions]);

  const getCurrent = useCallback((): MessageVersion | null => {
    return (
      versions.find((v) => v.isCurrent) ?? versions[versions.length - 1] ?? null
    );
  }, [versions]);

  const getPrevious = useCallback(
    (version: MessageVersion): MessageVersion | null => {
      const prevNumber = version.versionNumber - 1;
      if (prevNumber < 1) return null;
      return versions.find((v) => v.versionNumber === prevNumber) ?? null;
    },
    [versions],
  );

  const getNext = useCallback(
    (version: MessageVersion): MessageVersion | null => {
      const nextNumber = version.versionNumber + 1;
      return versions.find((v) => v.versionNumber === nextNumber) ?? null;
    },
    [versions],
  );

  // Selection actions
  const selectLeft = useCallback((version: MessageVersion | null) => {
    setSelection((prev) => ({ ...prev, left: version }));
  }, []);

  const selectRight = useCallback((version: MessageVersion | null) => {
    setSelection((prev) => ({ ...prev, right: version }));
  }, []);

  const selectVersions = useCallback(
    (left: MessageVersion | null, right: MessageVersion | null) => {
      setSelection({ left, right });
    },
    [],
  );

  const swapSelection = useCallback(() => {
    setSelection((prev) => ({ left: prev.right, right: prev.left }));
  }, []);

  const clearSelection = useCallback(() => {
    setSelection({ left: null, right: null });
  }, []);

  const selectOriginalVsCurrent = useCallback(() => {
    const original = getOriginal();
    const current = getCurrent();
    setSelection({ left: original, right: current });
  }, [getOriginal, getCurrent]);

  // Computed values
  const totalVersions = versions.length;
  const editCount = history?.editCount ?? 0;
  const hasEdits = editCount > 0;

  const editors = useMemo(() => {
    const editorMap = new Map<string, MessageVersion["editedBy"]>();
    for (const version of versions) {
      if (!editorMap.has(version.editedBy.id)) {
        editorMap.set(version.editedBy.id, version.editedBy);
      }
    }
    return Array.from(editorMap.values());
  }, [versions]);

  return {
    versions,
    selection,
    diff,
    viewMode,
    getVersionByNumber,
    getOriginal,
    getCurrent,
    getPrevious,
    getNext,
    selectLeft,
    selectRight,
    selectVersions,
    swapSelection,
    clearSelection,
    selectOriginalVsCurrent,
    setViewMode,
    totalVersions,
    editCount,
    hasEdits,
    editors,
  };
}

/**
 * Hook for navigating through versions sequentially.
 */
export function useVersionNavigation(messageId: string) {
  const history = useMemo(() => getCachedHistory(messageId), [messageId]);
  const versions = history?.versions ?? [];
  const [currentIndex, setCurrentIndex] = useState(versions.length - 1);

  const currentVersion = versions[currentIndex] ?? null;
  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < versions.length - 1;

  const goBack = useCallback(() => {
    if (canGoBack) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [canGoBack]);

  const goForward = useCallback(() => {
    if (canGoForward) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [canGoForward]);

  const goToVersion = useCallback(
    (versionNumber: number) => {
      const index = versions.findIndex(
        (v) => v.versionNumber === versionNumber,
      );
      if (index !== -1) {
        setCurrentIndex(index);
      }
    },
    [versions],
  );

  const goToFirst = useCallback(() => {
    setCurrentIndex(0);
  }, []);

  const goToLast = useCallback(() => {
    setCurrentIndex(versions.length - 1);
  }, [versions.length]);

  return {
    currentVersion,
    currentIndex,
    totalVersions: versions.length,
    canGoBack,
    canGoForward,
    goBack,
    goForward,
    goToVersion,
    goToFirst,
    goToLast,
  };
}

/**
 * Hook for diff calculation between arbitrary content.
 */
export function useDiff(oldContent: string, newContent: string): VersionDiff {
  return useMemo(() => {
    const fromVersion: MessageVersion = {
      id: "old",
      messageId: "",
      versionNumber: 1,
      content: oldContent,
      createdAt: new Date(),
      editedBy: { id: "", username: "", displayName: "" },
      isOriginal: true,
      isCurrent: false,
    };
    const toVersion: MessageVersion = {
      id: "new",
      messageId: "",
      versionNumber: 2,
      content: newContent,
      createdAt: new Date(),
      editedBy: { id: "", username: "", displayName: "" },
      isOriginal: false,
      isCurrent: true,
    };
    return calculateVersionDiff(fromVersion, toVersion);
  }, [oldContent, newContent]);
}

export default useMessageVersions;
