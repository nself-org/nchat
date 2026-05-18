/**
 * Message Edit History Components
 *
 * UI components for viewing and managing message edit history.
 */

// Main modal/panel
export { EditHistory, EditHistoryPanel } from "./EditHistory";
export type { EditHistoryProps, EditHistoryPanelProps } from "./EditHistory";

// List components
export {
  EditHistoryList,
  HistoryTimeline,
  HistoryStats,
} from "./EditHistoryList";
export type {
  EditHistoryListProps,
  HistoryTimelineProps,
  HistoryStatsProps,
} from "./EditHistoryList";

// Item components
export {
  EditHistoryItem,
  EditHistoryItemSkeleton,
  CompactHistoryItem,
} from "./EditHistoryItem";
export type {
  EditHistoryItemProps,
  CompactHistoryItemProps,
} from "./EditHistoryItem";

// Diff components
export {
  EditDiff,
  DiffSegments,
  TextDiff,
  SideBySideDiff,
  DiffPreview,
  DiffStatsBar,
} from "./EditDiff";
export type {
  EditDiffProps,
  DiffSegmentsProps,
  TextDiffProps,
  SideBySideDiffProps,
  DiffPreviewProps,
  DiffStatsBarProps,
} from "./EditDiff";

// Timestamp components
export {
  EditTimestamp,
  TimeRange,
  VersionTimestamp,
  EditTiming,
} from "./EditTimestamp";
export type {
  EditTimestampProps,
  TimeRangeProps,
  VersionTimestampProps,
  EditTimingProps,
} from "./EditTimestamp";

// Indicator components
export { EditedIndicator, EditedBadge, EditedText } from "./EditedIndicator";
export type {
  EditedIndicatorProps,
  EditedBadgeProps,
  EditedTextProps,
} from "./EditedIndicator";

// Original message components
export {
  OriginalMessage,
  OriginalMessagePreview,
  OriginalVsCurrent,
  InlineOriginal,
} from "./OriginalMessage";
export type {
  OriginalMessageProps,
  OriginalMessagePreviewProps,
  OriginalVsCurrentProps,
  InlineOriginalProps,
} from "./OriginalMessage";

// Comparison components
export {
  VersionComparison,
  QuickComparison,
  TabbedVersionView,
} from "./VersionComparison";
export type {
  VersionComparisonProps,
  QuickComparisonProps,
  TabbedVersionViewProps,
} from "./VersionComparison";

// Admin components
export {
  RestoreVersion,
  RestoreButton,
  RestoreSuccess,
} from "./RestoreVersion";
export type {
  RestoreVersionProps,
  RestoreButtonProps,
  RestoreSuccessProps,
} from "./RestoreVersion";

export { DeleteHistory, DeleteVersions } from "./DeleteHistory";
export type { DeleteHistoryProps, DeleteVersionsProps } from "./DeleteHistory";
