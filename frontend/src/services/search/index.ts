/**
 * Search Services Index
 *
 * Exports all search-related services for easy importing.
 *
 * @module services/search
 */

// Index Service
export {
  IndexService,
  getIndexService,
  createIndexService,
  type IndexInfo,
  type IndexHealth,
  type IndexOperationResult,
  type BatchOperationResult,
  type IndexStats,
} from "./index.service";

// Search Service
export {
  SearchService,
  getSearchService,
  createSearchService,
  type SearchType,
  type SearchFilters,
  type SearchOptions,
  type SearchHit,
  type MessageSearchHit,
  type FileSearchHit,
  type UserSearchHit,
  type ChannelSearchHit,
  type AnySearchHit,
  type SearchResults,
  type TypedSearchResults,
  type SearchSuggestion,
} from "./search.service";

// Sync Service
export {
  SyncService,
  getSyncService,
  createSyncService,
  type SyncStatus,
  type SyncError,
  type SyncResult,
  type ReindexProgress,
  type SyncEventType,
  type SyncEvent,
  type SyncEventHandler,
  type FileInput,
  type UserInput,
  type ChannelInput,
} from "./sync.service";

// Message Indexer (existing)
export {
  MessageIndexer,
  getMessageIndexer,
  createMessageIndexer,
  transformMessageToDocument,
  subscribeToMessageEvents,
  type IndexingStatus,
  type IndexingResult,
  type BatchIndexingResult,
  type MessageWithContext,
  type MessageEventType,
  type MessageEvent,
} from "./message-indexer";

// Real-time Sync Service
export {
  RealtimeSyncService,
  getRealtimeSyncService,
  createRealtimeSyncService,
  type RealtimeSyncConfig,
  type MessageEvent as RealtimeMessageEvent,
  type ChannelEvent as RealtimeChannelEvent,
  type UserEvent as RealtimeUserEvent,
  type FileEvent as RealtimeFileEvent,
  type SyncEvent as RealtimeSyncEvent,
  type SyncEventHandler as RealtimeSyncEventHandler,
} from "./realtime-sync";
