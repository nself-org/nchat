/**
 * DM Archive - Archive and restore functionality for direct messages
 *
 * Handles archiving conversations without deleting them
 */

import type { DirectMessage, DMArchiveInfo, DMStatus } from "./dm-types";

// ============================================================================
// Archive Types
// ============================================================================

export interface ArchiveOptions {
  reason?: string;
  deleteAfterDays?: number; // Optional: auto-delete after N days
}

export interface UnarchiveResult {
  success: boolean;
  dm?: DirectMessage;
  error?: string;
}

// ============================================================================
// Archive Functions
// ============================================================================

/**
 * Prepare archive info for a DM
 */
export function createArchiveInfo(
  dmId: string,
  archivedBy: string,
  options?: ArchiveOptions,
): DMArchiveInfo {
  return {
    dmId,
    archivedAt: new Date().toISOString(),
    archivedBy,
    reason: options?.reason,
    canUnarchive: true,
  };
}

/**
 * Check if a DM can be archived
 */
export function canArchive(dm: DirectMessage): boolean {
  // Already archived
  if (dm.status === "archived") {
    return false;
  }

  // Deleted DMs cannot be archived
  if (dm.status === "deleted") {
    return false;
  }

  return true;
}

/**
 * Check if a DM can be unarchived
 */
export function canUnarchive(dm: DirectMessage): boolean {
  return dm.status === "archived";
}

/**
 * Get archive display info
 */
export function getArchiveDisplayInfo(dm: DirectMessage): {
  isArchived: boolean;
  archivedAt: string | null;
  archivedBy: string | null;
  daysArchived: number | null;
} {
  if (dm.status !== "archived" || !dm.archivedAt) {
    return {
      isArchived: false,
      archivedAt: null,
      archivedBy: null,
      daysArchived: null,
    };
  }

  const archivedDate = new Date(dm.archivedAt);
  const now = new Date();
  const daysArchived = Math.floor(
    (now.getTime() - archivedDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  return {
    isArchived: true,
    archivedAt: dm.archivedAt,
    archivedBy: dm.archivedBy,
    daysArchived,
  };
}

// ============================================================================
// Filter Functions
// ============================================================================

/**
 * Filter DMs by archive status
 */
export function filterByArchiveStatus(
  dms: DirectMessage[],
  status: "active" | "archived" | "all",
): DirectMessage[] {
  switch (status) {
    case "active":
      return dms.filter((dm) => dm.status === "active");
    case "archived":
      return dms.filter((dm) => dm.status === "archived");
    case "all":
    default:
      return dms;
  }
}

/**
 * Get all archived DMs
 */
export function getArchivedDMs(dms: DirectMessage[]): DirectMessage[] {
  return filterByArchiveStatus(dms, "archived");
}

/**
 * Get all active DMs
 */
export function getActiveDMs(dms: DirectMessage[]): DirectMessage[] {
  return filterByArchiveStatus(dms, "active");
}

/**
 * Get archive count
 */
export function getArchiveCount(dms: DirectMessage[]): number {
  return dms.filter((dm) => dm.status === "archived").length;
}

// ============================================================================
// Archive Sorting
// ============================================================================

/**
 * Sort archived DMs by archive date
 */
export function sortByArchiveDate(
  dms: DirectMessage[],
  order: "asc" | "desc" = "desc",
): DirectMessage[] {
  return [...dms].sort((a, b) => {
    const aDate = a.archivedAt ? new Date(a.archivedAt).getTime() : 0;
    const bDate = b.archivedAt ? new Date(b.archivedAt).getTime() : 0;
    return order === "desc" ? bDate - aDate : aDate - bDate;
  });
}

// ============================================================================
// Bulk Archive Operations
// ============================================================================

/**
 * Check if multiple DMs can be archived
 */
export function canBulkArchive(dms: DirectMessage[]): {
  canArchive: DirectMessage[];
  cannotArchive: Array<{ dm: DirectMessage; reason: string }>;
} {
  const canArchiveList: DirectMessage[] = [];
  const cannotArchiveList: Array<{ dm: DirectMessage; reason: string }> = [];

  dms.forEach((dm) => {
    if (dm.status === "archived") {
      cannotArchiveList.push({ dm, reason: "Already archived" });
    } else if (dm.status === "deleted") {
      cannotArchiveList.push({ dm, reason: "DM is deleted" });
    } else {
      canArchiveList.push(dm);
    }
  });

  return { canArchive: canArchiveList, cannotArchive: cannotArchiveList };
}

/**
 * Check if multiple DMs can be unarchived
 */
export function canBulkUnarchive(dms: DirectMessage[]): {
  canUnarchive: DirectMessage[];
  cannotUnarchive: Array<{ dm: DirectMessage; reason: string }>;
} {
  const canUnarchiveList: DirectMessage[] = [];
  const cannotUnarchiveList: Array<{ dm: DirectMessage; reason: string }> = [];

  dms.forEach((dm) => {
    if (dm.status === "archived") {
      canUnarchiveList.push(dm);
    } else if (dm.status === "active") {
      cannotUnarchiveList.push({ dm, reason: "Not archived" });
    } else {
      cannotUnarchiveList.push({ dm, reason: "DM is deleted" });
    }
  });

  return {
    canUnarchive: canUnarchiveList,
    cannotUnarchive: cannotUnarchiveList,
  };
}

// ============================================================================
// Archive Cleanup
// ============================================================================

/**
 * Get DMs that should be auto-deleted based on archive age
 */
export function getStaleArchivedDMs(
  dms: DirectMessage[],
  deleteAfterDays: number,
): DirectMessage[] {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - deleteAfterDays);

  return dms.filter((dm) => {
    if (dm.status !== "archived" || !dm.archivedAt) {
      return false;
    }
    return new Date(dm.archivedAt) < cutoffDate;
  });
}

/**
 * Get archive storage estimate (rough calculation)
 */
export function estimateArchiveStorage(archivedDMs: DirectMessage[]): {
  count: number;
  estimatedSizeBytes: number;
  estimatedSizeFormatted: string;
} {
  const count = archivedDMs.length;
  // Rough estimate: average DM conversation size
  const avgConversationSize = 50 * 1024; // 50KB per conversation
  const estimatedSizeBytes = count * avgConversationSize;

  let estimatedSizeFormatted: string;
  if (estimatedSizeBytes < 1024) {
    estimatedSizeFormatted = `${estimatedSizeBytes} B`;
  } else if (estimatedSizeBytes < 1024 * 1024) {
    estimatedSizeFormatted = `${(estimatedSizeBytes / 1024).toFixed(1)} KB`;
  } else if (estimatedSizeBytes < 1024 * 1024 * 1024) {
    estimatedSizeFormatted = `${(estimatedSizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  } else {
    estimatedSizeFormatted = `${(estimatedSizeBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  return {
    count,
    estimatedSizeBytes,
    estimatedSizeFormatted,
  };
}

// ============================================================================
// Archive Export
// ============================================================================

export interface ArchiveExport {
  dmId: string;
  name: string;
  participants: string[];
  messageCount: number;
  archivedAt: string;
  exportedAt: string;
}

/**
 * Prepare DM for export
 */
export function prepareArchiveExport(dm: DirectMessage): ArchiveExport {
  return {
    dmId: dm.id,
    name: dm.name || "Direct Message",
    participants: dm.participants.map(
      (p) => p.user.displayName || p.user.username,
    ),
    messageCount: 0, // Would be populated from messages
    archivedAt: dm.archivedAt || new Date().toISOString(),
    exportedAt: new Date().toISOString(),
  };
}
