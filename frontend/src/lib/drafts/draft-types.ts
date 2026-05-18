/**
 * Draft Types - TypeScript type definitions for the drafts system
 *
 * Defines types for drafts, attachments, mentions, and related entities
 */

// ============================================================================
// Core Draft Types
// ============================================================================

/**
 * Draft context type - identifies what kind of draft this is
 */
export type DraftContextType = "channel" | "thread" | "dm";

/**
 * Draft attachment - represents a file attached to a draft
 */
export interface DraftAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  localUrl: string; // blob URL for preview
  uploadProgress?: number; // 0-100
  uploadError?: string;
  file?: File; // Original file object (not persisted)
  thumbnailUrl?: string;
}

/**
 * Draft mention - represents a mention in a draft
 */
export interface DraftMention {
  type: "user" | "channel" | "everyone" | "here";
  id?: string;
  name: string;
  startIndex?: number;
  endIndex?: number;
}

/**
 * Reply preview - information about the message being replied to
 */
export interface DraftReplyPreview {
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  timestamp?: string;
}

/**
 * Draft formatting state - preserves rich text formatting
 */
export interface DraftFormatting {
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  isStrikethrough: boolean;
  isCode: boolean;
  isBlockquote: boolean;
}

/**
 * Main draft interface
 */
export interface Draft {
  // Identity
  id: string;
  contextKey: string; // e.g., "channel:123", "thread:456", "dm:789"
  contextType: DraftContextType;
  contextId: string; // The actual ID (channel/thread/dm)

  // Content
  content: string; // Plain text content
  contentHtml?: string; // Rich text HTML content

  // Reply context
  replyToMessageId: string | null;
  replyToPreview?: DraftReplyPreview;

  // Attachments
  attachmentIds: string[]; // References to attachment store
  attachments?: DraftAttachment[]; // Embedded attachments (for display)

  // Mentions
  mentions: DraftMention[];

  // Cursor/selection state
  selectionStart: number;
  selectionEnd: number;

  // Metadata
  createdAt: number; // timestamp
  lastModified: number; // timestamp
  version: number; // for conflict resolution in sync

  // Sync state
  syncStatus?: "synced" | "pending" | "error";
  syncError?: string;
  lastSyncedAt?: number;
}

/**
 * Draft metadata for listing purposes
 */
export interface DraftMetadata {
  contextKey: string;
  contextType: DraftContextType;
  contextId: string;
  contextName: string; // Channel name, user name, etc.
  contextIcon?: string;
  contentPreview: string;
  hasAttachments: boolean;
  attachmentCount: number;
  lastModified: number;
  isReply: boolean;
}

// ============================================================================
// Auto-save Types
// ============================================================================

/**
 * Auto-save status
 */
export type AutoSaveStatus = "idle" | "saving" | "saved" | "error";

/**
 * Auto-save state
 */
export interface AutoSaveState {
  status: AutoSaveStatus;
  lastSaveTime: number | null;
  error: string | null;
  pendingChanges: boolean;
}

/**
 * Auto-save configuration
 */
export interface AutoSaveConfig {
  enabled: boolean;
  debounceMs: number; // Time to wait after last keystroke before saving
  intervalMs: number; // Force save interval even without changes
  minContentLength: number; // Minimum content length to trigger save
  saveOnBlur: boolean; // Save when input loses focus
  saveOnChannelSwitch: boolean; // Save when switching channels
}

// ============================================================================
// Storage Types
// ============================================================================

/**
 * Storage adapter interface - allows different storage backends
 */
export interface DraftStorageAdapter {
  get(contextKey: string): Promise<Draft | null>;
  set(contextKey: string, draft: Draft): Promise<void>;
  remove(contextKey: string): Promise<void>;
  getAll(): Promise<Draft[]>;
  clear(): Promise<void>;
  getKeys(): Promise<string[]>;
}

/**
 * Storage options
 */
export interface DraftStorageOptions {
  storageKey: string; // Key prefix for localStorage
  maxDrafts: number; // Maximum number of drafts to store
  maxAge: number; // Maximum age in milliseconds before cleanup
  useIndexedDB: boolean; // Use IndexedDB for larger storage
}

// ============================================================================
// Sync Types
// ============================================================================

/**
 * Sync configuration
 */
export interface DraftSyncConfig {
  enabled: boolean;
  syncIntervalMs: number; // How often to sync with server
  retryAttempts: number;
  retryDelayMs: number;
}

/**
 * Sync result
 */
export interface DraftSyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  conflicts: DraftConflict[];
  error?: string;
}

/**
 * Draft conflict when syncing
 */
export interface DraftConflict {
  contextKey: string;
  localDraft: Draft;
  remoteDraft: Draft;
  resolution?: "local" | "remote" | "merged";
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Draft event types
 */
export type DraftEventType =
  | "created"
  | "updated"
  | "deleted"
  | "cleared"
  | "restored"
  | "synced"
  | "sync_error"
  | "autosave_start"
  | "autosave_complete"
  | "autosave_error";

/**
 * Draft event
 */
export interface DraftEvent {
  type: DraftEventType;
  contextKey?: string;
  draft?: Draft;
  timestamp: number;
  error?: string;
}

/**
 * Draft event listener
 */
export type DraftEventListener = (event: DraftEvent) => void;

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Create draft input
 */
export type CreateDraftInput = Omit<
  Draft,
  "id" | "createdAt" | "lastModified" | "version" | "syncStatus"
>;

/**
 * Update draft input
 */
export type UpdateDraftInput = Partial<
  Omit<Draft, "id" | "contextKey" | "contextType" | "createdAt">
>;

/**
 * Draft filter options
 */
export interface DraftFilterOptions {
  contextType?: DraftContextType;
  hasAttachments?: boolean;
  isReply?: boolean;
  modifiedAfter?: number;
  modifiedBefore?: number;
  searchTerm?: string;
}

/**
 * Draft sort options
 */
export interface DraftSortOptions {
  field: "lastModified" | "createdAt" | "contextName";
  direction: "asc" | "desc";
}

// ============================================================================
// Context Key Helpers
// ============================================================================

/**
 * Create a context key from type and ID
 */
export function createContextKey(type: DraftContextType, id: string): string {
  return `${type}:${id}`;
}

/**
 * Parse a context key into type and ID
 */
export function parseContextKey(
  contextKey: string,
): { type: DraftContextType; id: string } | null {
  const parts = contextKey.split(":");
  if (parts.length !== 2) return null;

  const [type, id] = parts;
  if (!["channel", "thread", "dm"].includes(type)) return null;

  return { type: type as DraftContextType, id };
}

/**
 * Get channel draft key
 */
export function getChannelDraftKey(channelId: string): string {
  return createContextKey("channel", channelId);
}

/**
 * Get thread draft key
 */
export function getThreadDraftKey(threadId: string): string {
  return createContextKey("thread", threadId);
}

/**
 * Get DM draft key
 */
export function getDMDraftKey(conversationId: string): string {
  return createContextKey("dm", conversationId);
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Check if a draft has meaningful content
 */
export function hasDraftContent(draft: Draft | null | undefined): boolean {
  if (!draft) return false;
  return (
    draft.content.trim().length > 0 ||
    draft.attachmentIds.length > 0 ||
    (draft.attachments?.length ?? 0) > 0
  );
}

/**
 * Check if draft is empty
 */
export function isDraftEmpty(draft: Draft | null | undefined): boolean {
  return !hasDraftContent(draft);
}

/**
 * Get draft content preview (truncated)
 */
export function getDraftPreview(draft: Draft, maxLength: number = 100): string {
  const content = draft.content.trim();
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength - 3) + "...";
}
