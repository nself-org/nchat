/**
 * Message Edit History Diff Calculation
 *
 * Utilities for calculating and displaying differences between message versions.
 * Uses a word-based diff algorithm for readable comparisons.
 */

import type {
  DiffSegment,
  DiffChangeType,
  VersionDiff,
  WordDiff,
  MessageVersion,
} from "./history-types";

// ============================================================================
// Core Diff Algorithm
// ============================================================================

/**
 * Calculate the longest common subsequence (LCS) between two arrays.
 */
function lcs<T>(a: T[], b: T[]): T[] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find LCS
  const result: T[] = [];
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      result.unshift(a[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return result;
}

/**
 * Split text into words while preserving whitespace.
 */
export function tokenize(text: string): string[] {
  // Split on word boundaries while keeping whitespace
  const tokens: string[] = [];
  let current = "";
  let inWord = false;

  for (const char of text) {
    const isWhitespace = /\s/.test(char);
    if (isWhitespace !== inWord) {
      if (current) {
        tokens.push(current);
      }
      current = char;
      inWord = !isWhitespace;
    } else {
      current += char;
    }
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
}

/**
 * Calculate word-level diff between two strings.
 */
export function calculateWordDiff(
  oldText: string,
  newText: string,
): WordDiff[] {
  const oldTokens = tokenize(oldText);
  const newTokens = tokenize(newText);
  const common = lcs(oldTokens, newTokens);

  const result: WordDiff[] = [];
  let oldIdx = 0;
  let newIdx = 0;
  let commonIdx = 0;

  while (oldIdx < oldTokens.length || newIdx < newTokens.length) {
    if (
      commonIdx < common.length &&
      oldIdx < oldTokens.length &&
      oldTokens[oldIdx] === common[commonIdx]
    ) {
      // Match in old, check if it's also in new at current position
      if (
        newIdx < newTokens.length &&
        newTokens[newIdx] === common[commonIdx]
      ) {
        result.push({ value: common[commonIdx], type: "unchanged" });
        oldIdx++;
        newIdx++;
        commonIdx++;
      } else if (newIdx < newTokens.length) {
        // New has something different here
        result.push({ value: newTokens[newIdx], type: "added" });
        newIdx++;
      } else {
        // Reached end of new, rest of old is removed
        result.push({ value: oldTokens[oldIdx], type: "removed" });
        oldIdx++;
      }
    } else if (
      commonIdx < common.length &&
      newIdx < newTokens.length &&
      newTokens[newIdx] === common[commonIdx]
    ) {
      // Match in new but not old - old was removed
      if (oldIdx < oldTokens.length) {
        result.push({ value: oldTokens[oldIdx], type: "removed" });
        oldIdx++;
      }
    } else {
      // No match in common - handle removals and additions
      if (oldIdx < oldTokens.length) {
        result.push({ value: oldTokens[oldIdx], type: "removed" });
        oldIdx++;
      }
      if (
        newIdx < newTokens.length &&
        (oldIdx >= oldTokens.length ||
          oldTokens[oldIdx - 1] !== newTokens[newIdx])
      ) {
        // Only add if not already covered
        if (
          result.length === 0 ||
          result[result.length - 1].value !== newTokens[newIdx]
        ) {
          result.push({ value: newTokens[newIdx], type: "added" });
          newIdx++;
        }
      }
    }
  }

  return mergeAdjacentDiffs(result);
}

/**
 * Merge adjacent diffs of the same type for cleaner output.
 */
function mergeAdjacentDiffs(diffs: WordDiff[]): WordDiff[] {
  if (diffs.length === 0) return [];

  const merged: WordDiff[] = [{ ...diffs[0] }];

  for (let i = 1; i < diffs.length; i++) {
    const current = diffs[i];
    const last = merged[merged.length - 1];

    if (current.type === last.type) {
      last.value += current.value;
    } else {
      merged.push({ ...current });
    }
  }

  return merged;
}

/**
 * Convert word diffs to display segments.
 */
export function wordDiffsToSegments(wordDiffs: WordDiff[]): DiffSegment[] {
  return wordDiffs.map((diff) => ({
    text: diff.value,
    type: diff.type,
  }));
}

// ============================================================================
// Version Diff
// ============================================================================

/**
 * Calculate the diff between two message versions.
 */
export function calculateVersionDiff(
  fromVersion: MessageVersion,
  toVersion: MessageVersion,
): VersionDiff {
  const wordDiffs = calculateWordDiff(fromVersion.content, toVersion.content);
  const segments = wordDiffsToSegments(wordDiffs);

  let charsAdded = 0;
  let charsRemoved = 0;

  for (const diff of wordDiffs) {
    if (diff.type === "added") {
      charsAdded += diff.value.length;
    } else if (diff.type === "removed") {
      charsRemoved += diff.value.length;
    }
  }

  const summary = generateDiffSummary(charsAdded, charsRemoved);

  return {
    fromVersion,
    toVersion,
    segments,
    charsAdded,
    charsRemoved,
    summary,
  };
}

/**
 * Generate a human-readable summary of the diff.
 */
function generateDiffSummary(charsAdded: number, charsRemoved: number): string {
  if (charsAdded === 0 && charsRemoved === 0) {
    return "No changes";
  }

  const parts: string[] = [];

  if (charsAdded > 0) {
    parts.push(`+${charsAdded} character${charsAdded !== 1 ? "s" : ""}`);
  }

  if (charsRemoved > 0) {
    parts.push(`-${charsRemoved} character${charsRemoved !== 1 ? "s" : ""}`);
  }

  return parts.join(", ");
}

// ============================================================================
// Character-Level Diff (for inline highlighting)
// ============================================================================

/**
 * Calculate character-level diff for more precise highlighting.
 */
export function calculateCharDiff(
  oldText: string,
  newText: string,
): DiffSegment[] {
  const oldChars = oldText.split("");
  const newChars = newText.split("");
  const common = lcs(oldChars, newChars);

  const result: DiffSegment[] = [];
  let oldIdx = 0;
  let newIdx = 0;
  let commonIdx = 0;

  while (oldIdx < oldChars.length || newIdx < newChars.length) {
    if (
      commonIdx < common.length &&
      oldIdx < oldChars.length &&
      oldChars[oldIdx] === common[commonIdx] &&
      newIdx < newChars.length &&
      newChars[newIdx] === common[commonIdx]
    ) {
      // Both match common
      result.push({ text: common[commonIdx], type: "unchanged" });
      oldIdx++;
      newIdx++;
      commonIdx++;
    } else {
      // Handle mismatches
      if (
        oldIdx < oldChars.length &&
        (commonIdx >= common.length || oldChars[oldIdx] !== common[commonIdx])
      ) {
        result.push({ text: oldChars[oldIdx], type: "removed" });
        oldIdx++;
      }
      if (
        newIdx < newChars.length &&
        (commonIdx >= common.length || newChars[newIdx] !== common[commonIdx])
      ) {
        result.push({ text: newChars[newIdx], type: "added" });
        newIdx++;
      }
    }
  }

  return mergeAdjacentSegments(result);
}

/**
 * Merge adjacent segments of the same type.
 */
function mergeAdjacentSegments(segments: DiffSegment[]): DiffSegment[] {
  if (segments.length === 0) return [];

  const merged: DiffSegment[] = [{ ...segments[0] }];

  for (let i = 1; i < segments.length; i++) {
    const current = segments[i];
    const last = merged[merged.length - 1];

    if (current.type === last.type) {
      last.text += current.text;
    } else {
      merged.push({ ...current });
    }
  }

  return merged;
}

// ============================================================================
// Diff Display Utilities
// ============================================================================

/**
 * Check if two versions have any differences.
 */
export function hasChanges(oldText: string, newText: string): boolean {
  return oldText !== newText;
}

/**
 * Get percentage of text changed.
 */
export function getChangePercentage(oldText: string, newText: string): number {
  if (oldText === newText) return 0;
  if (oldText.length === 0 && newText.length === 0) return 0;
  if (oldText.length === 0) return 100;
  if (newText.length === 0) return 100;

  const wordDiffs = calculateWordDiff(oldText, newText);
  let changedChars = 0;
  let totalChars = 0;

  for (const diff of wordDiffs) {
    if (diff.type !== "unchanged") {
      changedChars += diff.value.length;
    }
    totalChars += diff.value.length;
  }

  if (totalChars === 0) return 0;
  return Math.round((changedChars / totalChars) * 100);
}

/**
 * Truncate diff for preview display.
 */
export function truncateDiff(
  segments: DiffSegment[],
  maxLength: number = 100,
): DiffSegment[] {
  const result: DiffSegment[] = [];
  let currentLength = 0;

  for (const segment of segments) {
    if (currentLength >= maxLength) {
      result.push({ text: "...", type: "unchanged" });
      break;
    }

    const remaining = maxLength - currentLength;
    if (segment.text.length <= remaining) {
      result.push(segment);
      currentLength += segment.text.length;
    } else {
      result.push({
        text: segment.text.slice(0, remaining) + "...",
        type: segment.type,
      });
      break;
    }
  }

  return result;
}

/**
 * Format diff segments as plain text (for copying).
 */
export function diffToPlainText(segments: DiffSegment[]): string {
  return segments
    .map((segment) => {
      switch (segment.type) {
        case "added":
          return `[+${segment.text}]`;
        case "removed":
          return `[-${segment.text}]`;
        default:
          return segment.text;
      }
    })
    .join("");
}

/**
 * Get only the changed parts for highlighting.
 */
export function getChangedSegments(segments: DiffSegment[]): DiffSegment[] {
  return segments.filter((s) => s.type !== "unchanged");
}

// ============================================================================
// Unified Diff Format
// ============================================================================

/**
 * Generate unified diff format (like git diff).
 */
export function generateUnifiedDiff(
  oldText: string,
  newText: string,
  contextLines: number = 3,
): string {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");

  const hunks: string[] = [];
  const linesDiff = calculateLineDiff(oldLines, newLines);

  let currentHunk: string[] = [];
  let oldStart = 1;
  let newStart = 1;
  let oldCount = 0;
  let newCount = 0;
  let lastChangeIdx = -contextLines - 1;

  for (let i = 0; i < linesDiff.length; i++) {
    const { line, type } = linesDiff[i];

    if (type !== "unchanged") {
      // Include context before change
      if (i - lastChangeIdx > contextLines * 2) {
        // Finish previous hunk if exists
        if (currentHunk.length > 0) {
          hunks.push(
            `@@ -${oldStart},${oldCount} +${newStart},${newCount} @@\n${currentHunk.join("\n")}`,
          );
          currentHunk = [];
          oldCount = 0;
          newCount = 0;
        }
        // Start new hunk with context
        oldStart = Math.max(1, i - contextLines + 1);
        newStart = Math.max(1, i - contextLines + 1);
        for (let j = Math.max(0, i - contextLines); j < i; j++) {
          currentHunk.push(` ${linesDiff[j].line}`);
          oldCount++;
          newCount++;
        }
      }

      lastChangeIdx = i;
    }

    if (i - lastChangeIdx <= contextLines || type !== "unchanged") {
      if (type === "removed") {
        currentHunk.push(`-${line}`);
        oldCount++;
      } else if (type === "added") {
        currentHunk.push(`+${line}`);
        newCount++;
      } else {
        currentHunk.push(` ${line}`);
        oldCount++;
        newCount++;
      }
    }
  }

  // Finish last hunk
  if (currentHunk.length > 0) {
    hunks.push(
      `@@ -${oldStart},${oldCount} +${newStart},${newCount} @@\n${currentHunk.join("\n")}`,
    );
  }

  return hunks.join("\n");
}

/**
 * Calculate line-level diff.
 */
function calculateLineDiff(
  oldLines: string[],
  newLines: string[],
): Array<{ line: string; type: DiffChangeType }> {
  const common = lcs(oldLines, newLines);
  const result: Array<{ line: string; type: DiffChangeType }> = [];

  let oldIdx = 0;
  let newIdx = 0;
  let commonIdx = 0;

  while (oldIdx < oldLines.length || newIdx < newLines.length) {
    if (
      commonIdx < common.length &&
      oldIdx < oldLines.length &&
      oldLines[oldIdx] === common[commonIdx] &&
      newIdx < newLines.length &&
      newLines[newIdx] === common[commonIdx]
    ) {
      result.push({ line: common[commonIdx], type: "unchanged" });
      oldIdx++;
      newIdx++;
      commonIdx++;
    } else {
      if (
        oldIdx < oldLines.length &&
        (commonIdx >= common.length || oldLines[oldIdx] !== common[commonIdx])
      ) {
        result.push({ line: oldLines[oldIdx], type: "removed" });
        oldIdx++;
      }
      if (
        newIdx < newLines.length &&
        (commonIdx >= common.length || newLines[newIdx] !== common[commonIdx])
      ) {
        result.push({ line: newLines[newIdx], type: "added" });
        newIdx++;
      }
    }
  }

  return result;
}
