/**
 * Draft System - Export all draft-related functionality
 */

// Types
export * from "./draft-types";

// Storage
export {
  DraftStorage,
  LocalStorageDraftAdapter,
  IndexedDBDraftAdapter,
  getDraftStorage,
  resetDraftStorage,
} from "./draft-storage";

// Auto-save
export {
  DraftAutoSaveManager,
  getAutoSaveManager,
  resetAutoSaveManager,
  createDebouncedSave,
  formatLastSaveTime,
  getAutoSaveStatusText,
} from "./draft-autosave";

// Sync
export {
  DraftSyncManager,
  getSyncManager,
  resetSyncManager,
  createMockSyncApiClient,
} from "./draft-sync";

// Manager
export {
  DraftManager,
  getDraftManager,
  resetDraftManager,
} from "./draft-manager";
