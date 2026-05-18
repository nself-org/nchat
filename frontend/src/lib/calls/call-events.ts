/**
 * Call Events System
 *
 * Centralized event emitter for call-related events.
 * Provides type-safe event handling and event history.
 */

import { EventEmitter } from "events";
import type { CallState } from "./call-state-machine";
import type {
  QualityLevel,
  QualityMetrics,
  QualityAlert,
} from "./call-quality-monitor";
import type { CallInvitation } from "./call-invitation";
import type { UserCallStatus } from "./call-status-manager";

// =============================================================================
// Event Types
// =============================================================================

/**
 * All possible call events
 */
export type CallEventType =
  // Lifecycle events
  | "call:created"
  | "call:ringing"
  | "call:answered"
  | "call:connected"
  | "call:held"
  | "call:resumed"
  | "call:transferred"
  | "call:ended"

  // Media events
  | "call:mute-changed"
  | "call:video-changed"
  | "call:screen-share-started"
  | "call:screen-share-stopped"

  // Quality events
  | "call:quality-changed"
  | "call:quality-alert"
  | "call:quality-critical"

  // State events
  | "call:state-changed"
  | "call:reconnecting"
  | "call:reconnected"

  // Invitation events
  | "call:invitation-received"
  | "call:invitation-accepted"
  | "call:invitation-declined"
  | "call:invitation-missed"
  | "call:invitation-cancelled"

  // Status events
  | "call:status-changed"
  | "call:user-busy"
  | "call:user-available"

  // Error events
  | "call:error"
  | "call:media-error"
  | "call:connection-error";

/**
 * Base event interface
 */
export interface CallEvent {
  type: CallEventType;
  callId: string;
  timestamp: Date;
  userId?: string;
  metadata?: Record<string, any>;
}

/**
 * Call created event
 */
export interface CallCreatedEvent extends CallEvent {
  type: "call:created";
  callType: "voice" | "video";
  initiatorId: string;
  targetUserId: string;
  channelId?: string;
}

/**
 * Call state changed event
 */
export interface CallStateChangedEvent extends CallEvent {
  type: "call:state-changed";
  from: CallState;
  to: CallState;
  reason?: string;
}

/**
 * Call ended event
 */
export interface CallEndedEvent extends CallEvent {
  type: "call:ended";
  reason:
    | "completed"
    | "declined"
    | "missed"
    | "busy"
    | "timeout"
    | "error"
    | "network"
    | "cancelled";
  duration: number; // milliseconds
}

/**
 * Media changed event
 */
export interface MediaChangedEvent extends CallEvent {
  type: "call:mute-changed" | "call:video-changed";
  userId: string;
  enabled: boolean;
}

/**
 * Quality changed event
 */
export interface QualityChangedEvent extends CallEvent {
  type: "call:quality-changed";
  from: QualityLevel;
  to: QualityLevel;
  metrics: QualityMetrics;
}

/**
 * Quality alert event
 */
export interface QualityAlertEvent extends CallEvent {
  type: "call:quality-alert";
  alert: QualityAlert;
}

/**
 * Invitation event
 */
export interface InvitationEvent extends CallEvent {
  type:
    | "call:invitation-received"
    | "call:invitation-accepted"
    | "call:invitation-declined"
    | "call:invitation-missed"
    | "call:invitation-cancelled";
  invitation: CallInvitation;
}

/**
 * Status changed event
 */
export interface StatusChangedEvent extends CallEvent {
  type: "call:status-changed";
  status: UserCallStatus;
  previousStatus?: UserCallStatus;
}

/**
 * Error event
 */
export interface CallErrorEvent extends CallEvent {
  type: "call:error" | "call:media-error" | "call:connection-error";
  error: Error;
  recoverable: boolean;
}

/**
 * Union of all event types
 */
export type AnyCallEvent =
  | CallCreatedEvent
  | CallStateChangedEvent
  | CallEndedEvent
  | MediaChangedEvent
  | QualityChangedEvent
  | QualityAlertEvent
  | InvitationEvent
  | StatusChangedEvent
  | CallErrorEvent
  | CallEvent;

// =============================================================================
// Event Handler Types
// =============================================================================

export type CallEventHandler<T extends AnyCallEvent = AnyCallEvent> = (
  event: T,
) => void;

export interface CallEventHandlers {
  "call:created"?: CallEventHandler<CallCreatedEvent>;
  "call:ringing"?: CallEventHandler<CallEvent>;
  "call:answered"?: CallEventHandler<CallEvent>;
  "call:connected"?: CallEventHandler<CallEvent>;
  "call:held"?: CallEventHandler<CallEvent>;
  "call:resumed"?: CallEventHandler<CallEvent>;
  "call:transferred"?: CallEventHandler<CallEvent>;
  "call:ended"?: CallEventHandler<CallEndedEvent>;
  "call:mute-changed"?: CallEventHandler<MediaChangedEvent>;
  "call:video-changed"?: CallEventHandler<MediaChangedEvent>;
  "call:screen-share-started"?: CallEventHandler<CallEvent>;
  "call:screen-share-stopped"?: CallEventHandler<CallEvent>;
  "call:quality-changed"?: CallEventHandler<QualityChangedEvent>;
  "call:quality-alert"?: CallEventHandler<QualityAlertEvent>;
  "call:quality-critical"?: CallEventHandler<QualityAlertEvent>;
  "call:state-changed"?: CallEventHandler<CallStateChangedEvent>;
  "call:reconnecting"?: CallEventHandler<CallEvent>;
  "call:reconnected"?: CallEventHandler<CallEvent>;
  "call:invitation-received"?: CallEventHandler<InvitationEvent>;
  "call:invitation-accepted"?: CallEventHandler<InvitationEvent>;
  "call:invitation-declined"?: CallEventHandler<InvitationEvent>;
  "call:invitation-missed"?: CallEventHandler<InvitationEvent>;
  "call:invitation-cancelled"?: CallEventHandler<InvitationEvent>;
  "call:status-changed"?: CallEventHandler<StatusChangedEvent>;
  "call:user-busy"?: CallEventHandler<StatusChangedEvent>;
  "call:user-available"?: CallEventHandler<StatusChangedEvent>;
  "call:error"?: CallEventHandler<CallErrorEvent>;
  "call:media-error"?: CallEventHandler<CallErrorEvent>;
  "call:connection-error"?: CallEventHandler<CallErrorEvent>;
}

// =============================================================================
// Call Event Emitter
// =============================================================================

export class CallEventEmitter extends EventEmitter {
  private history: AnyCallEvent[] = [];
  private maxHistory = 100;

  /**
   * Emit call event
   */
  emitCallEvent<T extends AnyCallEvent>(event: T): void {
    // Add to history
    this.history.push(event);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    // Emit event
    this.emit(event.type, event);
    this.emit("*", event); // Wildcard listener
  }

  /**
   * Get event history
   */
  getHistory(filter?: {
    callId?: string;
    type?: CallEventType | CallEventType[];
    userId?: string;
    since?: Date;
  }): AnyCallEvent[] {
    let events = [...this.history];

    if (filter) {
      if (filter.callId) {
        events = events.filter((e) => e.callId === filter.callId);
      }

      if (filter.type) {
        const types = Array.isArray(filter.type) ? filter.type : [filter.type];
        events = events.filter((e) => types.includes(e.type));
      }

      if (filter.userId) {
        events = events.filter((e) => e.userId === filter.userId);
      }

      if (filter.since) {
        events = events.filter((e) => e.timestamp >= filter.since!);
      }
    }

    return events;
  }

  /**
   * Get events for a specific call
   */
  getCallHistory(callId: string): AnyCallEvent[] {
    return this.getHistory({ callId });
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Set maximum history size
   */
  setMaxHistory(max: number): void {
    this.maxHistory = max;
    while (this.history.length > max) {
      this.history.shift();
    }
  }

  /**
   * Type-safe event listener
   */
  onCallEvent<K extends CallEventType>(
    event: K,
    handler: CallEventHandlers[K],
  ): void {
    if (handler) {
      this.on(event, handler as (...args: any[]) => void);
    }
  }

  /**
   * Type-safe one-time event listener
   */
  onceCallEvent<K extends CallEventType>(
    event: K,
    handler: CallEventHandlers[K],
  ): void {
    if (handler) {
      this.once(event, handler as (...args: any[]) => void);
    }
  }

  /**
   * Remove event listener
   */
  offCallEvent<K extends CallEventType>(
    event: K,
    handler: CallEventHandlers[K],
  ): void {
    if (handler) {
      this.off(event, handler as (...args: any[]) => void);
    }
  }

  /**
   * Listen to all events
   */
  onAnyEvent(handler: CallEventHandler): void {
    this.on("*", handler);
  }

  /**
   * Remove all event listener
   */
  offAnyEvent(handler: CallEventHandler): void {
    this.off("*", handler);
  }
}

// =============================================================================
// Global Event Emitter
// =============================================================================

let globalEmitter: CallEventEmitter | null = null;

/**
 * Get global call event emitter
 */
export function getCallEventEmitter(): CallEventEmitter {
  if (!globalEmitter) {
    globalEmitter = new CallEventEmitter();
  }
  return globalEmitter;
}

/**
 * Reset global emitter (useful for testing)
 */
export function resetCallEventEmitter(): void {
  if (globalEmitter) {
    globalEmitter.removeAllListeners();
    globalEmitter.clearHistory();
  }
  globalEmitter = null;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create a call event
 */
export function createCallEvent<T extends AnyCallEvent>(
  type: CallEventType,
  callId: string,
  data: Omit<T, "type" | "callId" | "timestamp">,
): T {
  return {
    type,
    callId,
    timestamp: new Date(),
    ...data,
  } as T;
}

/**
 * Emit a call created event
 */
export function emitCallCreated(
  callId: string,
  callType: "voice" | "video",
  initiatorId: string,
  targetUserId: string,
  channelId?: string,
): void {
  const emitter = getCallEventEmitter();
  emitter.emitCallEvent<CallCreatedEvent>({
    type: "call:created",
    callId,
    callType,
    initiatorId,
    targetUserId,
    channelId,
    timestamp: new Date(),
  });
}

/**
 * Emit a call ended event
 */
export function emitCallEnded(
  callId: string,
  reason: CallEndedEvent["reason"],
  duration: number,
): void {
  const emitter = getCallEventEmitter();
  emitter.emitCallEvent<CallEndedEvent>({
    type: "call:ended",
    callId,
    reason,
    duration,
    timestamp: new Date(),
  });
}

/**
 * Emit a quality changed event
 */
export function emitQualityChanged(
  callId: string,
  from: QualityLevel,
  to: QualityLevel,
  metrics: QualityMetrics,
): void {
  const emitter = getCallEventEmitter();
  emitter.emitCallEvent<QualityChangedEvent>({
    type: "call:quality-changed",
    callId,
    from,
    to,
    metrics,
    timestamp: new Date(),
  });
}

/**
 * Emit an error event
 */
export function emitCallError(
  callId: string,
  error: Error,
  recoverable: boolean,
  type: CallErrorEvent["type"] = "call:error",
): void {
  const emitter = getCallEventEmitter();
  emitter.emitCallEvent<CallErrorEvent>({
    type,
    callId,
    error,
    recoverable,
    timestamp: new Date(),
  });
}

/**
 * Log call event to the backend via the calls events API
 */
export async function logCallEventToDatabase(
  event: AnyCallEvent,
): Promise<void> {
  const payload = {
    callId: event.callId,
    type: event.type,
    userId: event.userId,
    timestamp: event.timestamp.toISOString(),
    metadata: event.metadata ?? null,
  };

  const response = await fetch("/api/calls/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to log call event: ${response.status} ${response.statusText}`,
    );
  }
}

// =============================================================================
// Event Listener Utilities
// =============================================================================

/**
 * Subscribe to multiple events
 */
export function subscribeToCallEvents(
  handlers: Partial<CallEventHandlers>,
): () => void {
  const emitter = getCallEventEmitter();

  // Add handlers
  for (const [event, handler] of Object.entries(handlers)) {
    if (handler) {
      emitter.onCallEvent(event as CallEventType, handler as any);
    }
  }

  // Return cleanup function
  return () => {
    for (const [event, handler] of Object.entries(handlers)) {
      if (handler) {
        emitter.offCallEvent(event as CallEventType, handler as any);
      }
    }
  };
}

/**
 * Create event logger
 */
export function createEventLogger(filter?: {
  types?: CallEventType[];
  logToConsole?: boolean;
  logToDatabase?: boolean;
}): () => void {
  const { types, logToConsole = true, logToDatabase = false } = filter || {};

  const handler: CallEventHandler = (event) => {
    // Filter by type
    if (types && !types.includes(event.type)) {
      return;
    }

    // Log to console
    if (logToConsole) {
      // eslint-disable-next-line no-console
      console.debug(`[call-event] ${event.type}`, {
        callId: event.callId,
        ts: event.timestamp,
      });
    }

    // Log to database
    if (logToDatabase) {
      logCallEventToDatabase(event).catch((err: Error) => {
        // eslint-disable-next-line no-console
        console.error("[call-event] Failed to persist event to database:", err);
      });
    }
  };

  const emitter = getCallEventEmitter();
  emitter.onAnyEvent(handler);

  return () => {
    emitter.offAnyEvent(handler);
  };
}
