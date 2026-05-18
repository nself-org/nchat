/**
 * Call History Service
 *
 * Manages call history including storing, retrieving,
 * and managing missed calls.
 */

import { apolloClient } from "@/lib/apollo-client";
import { gql } from "@apollo/client";
import { logger } from "@/lib/logger";

// =============================================================================
// Types
// =============================================================================

export type CallHistoryType = "voice" | "video";
export type CallHistoryDirection = "incoming" | "outgoing";
export type CallHistoryStatus =
  | "completed"
  | "missed"
  | "declined"
  | "cancelled"
  | "failed";

export interface CallHistoryEntry {
  id: string;
  callId: string;
  type: CallHistoryType;
  direction: CallHistoryDirection;
  status: CallHistoryStatus;
  participantId: string;
  participantName: string;
  participantAvatarUrl?: string;
  channelId?: string;
  startedAt: Date;
  endedAt?: Date;
  duration: number;
  isMissed: boolean;
  isRead: boolean;
}

export interface CallHistoryFilter {
  type?: CallHistoryType;
  direction?: CallHistoryDirection;
  status?: CallHistoryStatus;
  isMissed?: boolean;
  fromDate?: Date;
  toDate?: Date;
  participantId?: string;
}

export interface CallHistoryStats {
  totalCalls: number;
  incomingCalls: number;
  outgoingCalls: number;
  missedCalls: number;
  totalDuration: number;
  averageDuration: number;
}

// =============================================================================
// GraphQL Queries and Mutations
// =============================================================================

const GET_CALL_HISTORY = gql`
  query GetCallHistory($userId: uuid!, $limit: Int!, $offset: Int!) {
    nchat_calls(
      where: {
        _or: [
          { caller_id: { _eq: $userId } }
          { participants: { user_id: { _eq: $userId } } }
        ]
      }
      order_by: { started_at: desc }
      limit: $limit
      offset: $offset
    ) {
      id
      call_id
      type
      status
      started_at
      ended_at
      duration
      caller_id
      channel_id
      caller {
        id
        username
        display_name
        avatar_url
      }
      participants {
        user_id
        user {
          id
          username
          display_name
          avatar_url
        }
      }
    }
  }
`;

const GET_MISSED_CALLS_COUNT = gql`
  query GetMissedCallsCount($userId: uuid!) {
    nchat_calls_aggregate(
      where: {
        participants: { user_id: { _eq: $userId } }
        status: { _eq: "missed" }
        _not: { caller_id: { _eq: $userId } }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;

const MARK_CALL_AS_READ = gql`
  mutation MarkCallAsRead($callId: uuid!, $userId: uuid!) {
    update_nchat_call_participants(
      where: { call_id: { _eq: $callId }, user_id: { _eq: $userId } }
      _set: { is_read: true }
    ) {
      affected_rows
    }
  }
`;

const DELETE_CALL_HISTORY_ENTRY = gql`
  mutation DeleteCallHistoryEntry($callId: uuid!, $userId: uuid!) {
    update_nchat_call_participants(
      where: { call_id: { _eq: $callId }, user_id: { _eq: $userId } }
      _set: { is_deleted: true }
    ) {
      affected_rows
    }
  }
`;

const CLEAR_CALL_HISTORY = gql`
  mutation ClearCallHistory($userId: uuid!) {
    update_nchat_call_participants(
      where: { user_id: { _eq: $userId } }
      _set: { is_deleted: true }
    ) {
      affected_rows
    }
  }
`;

// =============================================================================
// Call History Service
// =============================================================================

export class CallHistoryService {
  private userId: string;
  private cache: Map<string, CallHistoryEntry> = new Map();
  private lastFetch: Date | null = null;
  private cacheValidityMs: number = 60000; // 1 minute

  constructor(userId: string) {
    this.userId = userId;
  }

  // ===========================================================================
  // Fetch Methods
  // ===========================================================================

  async getHistory(
    limit: number = 50,
    offset: number = 0,
    filter?: CallHistoryFilter,
  ): Promise<CallHistoryEntry[]> {
    try {
      const result = await apolloClient.query({
        query: GET_CALL_HISTORY,
        variables: {
          userId: this.userId,
          limit,
          offset,
        },
        fetchPolicy: "network-only",
      });

      const entries = this.transformCallsToHistory(result.data.nchat_calls);

      // Apply client-side filtering
      let filteredEntries = entries;
      if (filter) {
        filteredEntries = this.applyFilter(entries, filter);
      }

      // Update cache
      filteredEntries.forEach((entry) => {
        this.cache.set(entry.id, entry);
      });
      this.lastFetch = new Date();

      return filteredEntries;
    } catch (error) {
      logger.error("[CallHistory] Failed to fetch history:", error);
      throw error;
    }
  }

  async getRecentCalls(limit: number = 10): Promise<CallHistoryEntry[]> {
    return this.getHistory(limit, 0);
  }

  async getMissedCalls(): Promise<CallHistoryEntry[]> {
    return this.getHistory(100, 0, { isMissed: true });
  }

  async getCallById(callId: string): Promise<CallHistoryEntry | null> {
    // Check cache first
    if (this.cache.has(callId)) {
      return this.cache.get(callId)!;
    }

    // Fetch from server
    const history = await this.getHistory(1, 0);
    const entry = history.find((e) => e.callId === callId);
    return entry || null;
  }

  async getMissedCallsCount(): Promise<number> {
    try {
      const result = await apolloClient.query({
        query: GET_MISSED_CALLS_COUNT,
        variables: { userId: this.userId },
        fetchPolicy: "network-only",
      });

      return result.data.nchat_calls_aggregate.aggregate.count;
    } catch (error) {
      logger.error("[CallHistory] Failed to get missed calls count:", error);
      return 0;
    }
  }

  // ===========================================================================
  // Modification Methods
  // ===========================================================================

  async markAsRead(callId: string): Promise<void> {
    try {
      await apolloClient.mutate({
        mutation: MARK_CALL_AS_READ,
        variables: {
          callId,
          userId: this.userId,
        },
      });

      // Update cache
      const entry = this.cache.get(callId);
      if (entry) {
        entry.isRead = true;
        this.cache.set(callId, entry);
      }
    } catch (error) {
      logger.error("[CallHistory] Failed to mark as read:", error);
      throw error;
    }
  }

  async markAllAsRead(): Promise<void> {
    const missedCalls = await this.getMissedCalls();
    await Promise.all(
      missedCalls
        .filter((call) => !call.isRead)
        .map((call) => this.markAsRead(call.id)),
    );
  }

  async deleteEntry(callId: string): Promise<void> {
    try {
      await apolloClient.mutate({
        mutation: DELETE_CALL_HISTORY_ENTRY,
        variables: {
          callId,
          userId: this.userId,
        },
      });

      // Remove from cache
      this.cache.delete(callId);
    } catch (error) {
      logger.error("[CallHistory] Failed to delete entry:", error);
      throw error;
    }
  }

  async clearHistory(): Promise<void> {
    try {
      await apolloClient.mutate({
        mutation: CLEAR_CALL_HISTORY,
        variables: { userId: this.userId },
      });

      // Clear cache
      this.cache.clear();
    } catch (error) {
      logger.error("[CallHistory] Failed to clear history:", error);
      throw error;
    }
  }

  // ===========================================================================
  // Statistics
  // ===========================================================================

  async getStats(fromDate?: Date, toDate?: Date): Promise<CallHistoryStats> {
    const history = await this.getHistory(1000, 0, { fromDate, toDate });

    const stats: CallHistoryStats = {
      totalCalls: history.length,
      incomingCalls: history.filter((e) => e.direction === "incoming").length,
      outgoingCalls: history.filter((e) => e.direction === "outgoing").length,
      missedCalls: history.filter((e) => e.isMissed).length,
      totalDuration: history.reduce((sum, e) => sum + e.duration, 0),
      averageDuration: 0,
    };

    const completedCalls = history.filter((e) => e.status === "completed");
    if (completedCalls.length > 0) {
      stats.averageDuration = Math.round(
        completedCalls.reduce((sum, e) => sum + e.duration, 0) /
          completedCalls.length,
      );
    }

    return stats;
  }

  getCallsByParticipant(participantId: string): CallHistoryEntry[] {
    return Array.from(this.cache.values()).filter(
      (entry) => entry.participantId === participantId,
    );
  }

  // ===========================================================================
  // Local Storage (for offline support)
  // ===========================================================================

  addLocalEntry(
    entry: Omit<CallHistoryEntry, "id" | "isRead">,
  ): CallHistoryEntry {
    const fullEntry: CallHistoryEntry = {
      ...entry,
      id: entry.callId,
      isRead: false,
    };

    this.cache.set(fullEntry.id, fullEntry);
    this.persistToLocalStorage();

    return fullEntry;
  }

  private persistToLocalStorage(): void {
    try {
      const entries = Array.from(this.cache.values());
      localStorage.setItem(
        `call-history-${this.userId}`,
        JSON.stringify(entries.slice(0, 100)), // Keep only last 100 entries
      );
    } catch (error) {
      logger.error("[CallHistory] Failed to persist to localStorage:", error);
    }
  }

  loadFromLocalStorage(): void {
    try {
      const data = localStorage.getItem(`call-history-${this.userId}`);
      if (data) {
        const entries: CallHistoryEntry[] = JSON.parse(data);
        entries.forEach((entry) => {
          // Convert date strings back to Date objects
          entry.startedAt = new Date(entry.startedAt);
          if (entry.endedAt) {
            entry.endedAt = new Date(entry.endedAt);
          }
          this.cache.set(entry.id, entry);
        });
      }
    } catch (error) {
      logger.error("[CallHistory] Failed to load from localStorage:", error);
    }
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  private transformCallsToHistory(calls: any[]): CallHistoryEntry[] {
    return calls.map((call) => {
      const isOutgoing = call.caller_id === this.userId;
      const participant = isOutgoing
        ? call.participants.find((p: any) => p.user_id !== this.userId)?.user
        : call.caller;

      return {
        id: call.id,
        callId: call.call_id,
        type: call.type as CallHistoryType,
        direction: isOutgoing ? "outgoing" : "incoming",
        status: this.mapStatus(call.status),
        participantId: participant?.id || "",
        participantName:
          participant?.display_name || participant?.username || "Unknown",
        participantAvatarUrl: participant?.avatar_url,
        channelId: call.channel_id,
        startedAt: new Date(call.started_at),
        endedAt: call.ended_at ? new Date(call.ended_at) : undefined,
        duration: call.duration || 0,
        isMissed:
          call.status === "missed" ||
          (call.status === "ended" && call.duration === 0 && !isOutgoing),
        isRead: true, // Would come from participant record in full implementation
      } as CallHistoryEntry;
    });
  }

  private mapStatus(status: string): CallHistoryStatus {
    switch (status) {
      case "ended":
      case "completed":
        return "completed";
      case "missed":
      case "no_answer":
      case "timeout":
        return "missed";
      case "declined":
        return "declined";
      case "cancelled":
        return "cancelled";
      default:
        return "completed";
    }
  }

  private applyFilter(
    entries: CallHistoryEntry[],
    filter: CallHistoryFilter,
  ): CallHistoryEntry[] {
    return entries.filter((entry) => {
      if (filter.type && entry.type !== filter.type) return false;
      if (filter.direction && entry.direction !== filter.direction)
        return false;
      if (filter.status && entry.status !== filter.status) return false;
      if (filter.isMissed !== undefined && entry.isMissed !== filter.isMissed)
        return false;
      if (filter.participantId && entry.participantId !== filter.participantId)
        return false;
      if (filter.fromDate && entry.startedAt < filter.fromDate) return false;
      if (filter.toDate && entry.startedAt > filter.toDate) return false;
      return true;
    });
  }

  // ===========================================================================
  // Cache Management
  // ===========================================================================

  invalidateCache(): void {
    this.cache.clear();
    this.lastFetch = null;
  }

  isCacheValid(): boolean {
    if (!this.lastFetch) return false;
    return Date.now() - this.lastFetch.getTime() < this.cacheValidityMs;
  }

  getCachedHistory(): CallHistoryEntry[] {
    return Array.from(this.cache.values()).sort(
      (a, b) => b.startedAt.getTime() - a.startedAt.getTime(),
    );
  }
}

// =============================================================================
// Factory Function
// =============================================================================

export function createCallHistoryService(userId: string): CallHistoryService {
  return new CallHistoryService(userId);
}

// =============================================================================
// Utility Functions
// =============================================================================

export function formatCallDuration(seconds: number): string {
  if (seconds === 0) return "0:00";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export function formatCallTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: "short" });
  } else {
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }
}

export function getCallStatusLabel(
  status: CallHistoryStatus,
  direction: CallHistoryDirection,
): string {
  switch (status) {
    case "completed":
      return direction === "outgoing" ? "Outgoing call" : "Incoming call";
    case "missed":
      return "Missed call";
    case "declined":
      return direction === "outgoing" ? "Not answered" : "Declined";
    case "cancelled":
      return "Cancelled";
    case "failed":
      return "Failed";
    default:
      return "Call";
  }
}
