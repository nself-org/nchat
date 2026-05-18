/**
 * Call State Machine
 *
 * Manages call state transitions with validation and event emission.
 * Ensures valid state transitions and provides type-safe state management.
 */

import { EventEmitter } from "events";

import { logger } from "@/lib/logger";

// =============================================================================
// Types
// =============================================================================

/**
 * All possible call states in the lifecycle
 */
export type CallState =
  | "idle" // No active call
  | "initiating" // Creating call (getting media, creating connection)
  | "ringing" // Calling recipient (waiting for answer)
  | "connecting" // WebRTC negotiation in progress
  | "connected" // Call is active
  | "reconnecting" // Network issue, attempting to reconnect
  | "held" // Call is on hold
  | "transferring" // Call is being transferred
  | "ending" // Hanging up (cleanup in progress)
  | "ended"; // Call has ended

/**
 * Reason for call ending
 */
export type CallEndReason =
  | "completed" // Normal hangup
  | "declined" // Recipient declined
  | "missed" // No answer
  | "busy" // Recipient busy
  | "timeout" // Connection timeout
  | "error" // Technical error
  | "network" // Network failure
  | "cancelled"; // Caller cancelled

/**
 * State transition event
 */
export interface StateTransitionEvent {
  from: CallState;
  to: CallState;
  timestamp: Date;
  reason?: string;
  metadata?: Record<string, any>;
}

/**
 * State machine configuration
 */
export interface StateMachineConfig {
  initialState?: CallState;
  onTransition?: (event: StateTransitionEvent) => void;
  onInvalidTransition?: (from: CallState, to: CallState) => void;
}

// =============================================================================
// Valid State Transitions
// =============================================================================

/**
 * Map of valid state transitions
 * Key: current state, Value: array of valid next states
 */
const VALID_TRANSITIONS: Record<CallState, CallState[]> = {
  idle: ["initiating"],
  initiating: ["ringing", "connecting", "ending", "ended"],
  ringing: ["connecting", "ending", "ended"],
  connecting: ["connected", "ending", "ended"],
  connected: ["held", "transferring", "reconnecting", "ending", "ended"],
  reconnecting: ["connected", "ending", "ended"],
  held: ["connected", "transferring", "ending", "ended"],
  transferring: ["connected", "ending", "ended"],
  ending: ["ended"],
  ended: ["idle"],
};

// =============================================================================
// Call State Machine
// =============================================================================

export class CallStateMachine extends EventEmitter {
  private currentState: CallState;
  private previousState: CallState | null = null;
  private history: StateTransitionEvent[] = [];
  private config: StateMachineConfig;

  constructor(config: StateMachineConfig = {}) {
    super();
    this.config = config;
    this.currentState = config.initialState || "idle";
  }

  /**
   * Get current state
   */
  getState(): CallState {
    return this.currentState;
  }

  /**
   * Get previous state
   */
  getPreviousState(): CallState | null {
    return this.previousState;
  }

  /**
   * Get state transition history
   */
  getHistory(): StateTransitionEvent[] {
    return [...this.history];
  }

  /**
   * Check if transition is valid
   */
  canTransitionTo(targetState: CallState): boolean {
    const validStates = VALID_TRANSITIONS[this.currentState] || [];
    return validStates.includes(targetState);
  }

  /**
   * Transition to new state
   */
  transition(
    targetState: CallState,
    reason?: string,
    metadata?: Record<string, any>,
  ): boolean {
    // Check if transition is valid
    if (!this.canTransitionTo(targetState)) {
      logger.warn(`Invalid transition: ${this.currentState} -> ${targetState}`);

      // Notify invalid transition
      if (this.config.onInvalidTransition) {
        this.config.onInvalidTransition(this.currentState, targetState);
      }

      this.emit("invalid-transition", {
        from: this.currentState,
        to: targetState,
      });

      return false;
    }

    // Create transition event
    const event: StateTransitionEvent = {
      from: this.currentState,
      to: targetState,
      timestamp: new Date(),
      reason,
      metadata,
    };

    // Update state
    this.previousState = this.currentState;
    this.currentState = targetState;

    // Record history
    this.history.push(event);

    // Notify listeners
    if (this.config.onTransition) {
      this.config.onTransition(event);
    }

    this.emit("transition", event);
    this.emit("state-change", targetState, this.previousState);
    this.emit(`enter:${targetState}`, event);
    this.emit(`exit:${this.previousState}`, event);

    return true;
  }

  /**
   * Reset state machine
   */
  reset(): void {
    this.previousState = this.currentState;
    this.currentState = this.config.initialState || "idle";
    this.history = [];
    this.emit("reset");
  }

  /**
   * Check if in specific state
   */
  isState(state: CallState): boolean {
    return this.currentState === state;
  }

  /**
   * Check if in any of the given states
   */
  isAnyState(...states: CallState[]): boolean {
    return states.includes(this.currentState);
  }

  /**
   * Check if call is active (not idle or ended)
   */
  isActive(): boolean {
    return !this.isAnyState("idle", "ended");
  }

  /**
   * Check if call is in progress (connected or held)
   */
  isInProgress(): boolean {
    return this.isAnyState("connected", "held");
  }

  /**
   * Get state display name
   */
  getStateDisplayName(): string {
    const displayNames: Record<CallState, string> = {
      idle: "Idle",
      initiating: "Starting call...",
      ringing: "Ringing...",
      connecting: "Connecting...",
      connected: "Connected",
      reconnecting: "Reconnecting...",
      held: "On Hold",
      transferring: "Transferring...",
      ending: "Ending call...",
      ended: "Ended",
    };
    return displayNames[this.currentState] || this.currentState;
  }

  /**
   * Get state duration (time in current state)
   */
  getCurrentStateDuration(): number {
    const lastTransition = this.history[this.history.length - 1];
    if (!lastTransition) return 0;

    return Date.now() - lastTransition.timestamp.getTime();
  }

  /**
   * Get total call duration (from initiation to now)
   */
  getTotalDuration(): number {
    const firstTransition = this.history.find((t) => t.from === "idle");
    if (!firstTransition) return 0;

    return Date.now() - firstTransition.timestamp.getTime();
  }

  /**
   * Get connected duration (time spent in connected state)
   */
  getConnectedDuration(): number {
    let duration = 0;
    let connectedStart: Date | null = null;

    for (const event of this.history) {
      if (event.to === "connected") {
        connectedStart = event.timestamp;
      } else if (
        connectedStart &&
        event.from === "connected" &&
        event.to !== "held"
      ) {
        duration += event.timestamp.getTime() - connectedStart.getTime();
        connectedStart = null;
      }
    }

    // Add current connected time if still connected
    if (connectedStart && this.currentState === "connected") {
      duration += Date.now() - connectedStart.getTime();
    }

    return duration;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new call state machine
 */
export function createCallStateMachine(
  config?: StateMachineConfig,
): CallStateMachine {
  return new CallStateMachine(config);
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get all possible states
 */
export function getAllStates(): CallState[] {
  return [
    "idle",
    "initiating",
    "ringing",
    "connecting",
    "connected",
    "reconnecting",
    "held",
    "transferring",
    "ending",
    "ended",
  ];
}

/**
 * Get valid transitions from a state
 */
export function getValidTransitions(state: CallState): CallState[] {
  return VALID_TRANSITIONS[state] || [];
}

/**
 * Check if a transition is valid
 */
export function isValidTransition(from: CallState, to: CallState): boolean {
  return getValidTransitions(from).includes(to);
}
