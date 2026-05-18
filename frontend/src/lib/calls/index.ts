/**
 * Call Management Library
 *
 * Central export for all call management functionality.
 */

// State Machine
export {
  CallStateMachine,
  createCallStateMachine,
  getAllStates,
  getValidTransitions,
  isValidTransition,
  type CallState,
  type CallEndReason,
  type StateTransitionEvent,
  type StateMachineConfig,
} from "./call-state-machine";

// Invitation Manager
export {
  CallInvitationManager,
  createInvitationManager,
  type CallInvitation,
  type InvitationConfig,
  type InvitationManagerConfig,
} from "./call-invitation";

// Status Manager
export {
  CallStatusManager,
  createStatusManager,
  type UserStatus,
  type UserCallStatus,
  type StatusManagerConfig,
} from "./call-status-manager";

// Quality Monitor
export {
  CallQualityMonitor,
  createQualityMonitor,
  type QualityLevel,
  type QualityMetrics,
  type QualityThresholds,
  type QualityAlert,
  type QualityMonitorConfig,
} from "./call-quality-monitor";

// Events
export {
  CallEventEmitter,
  getCallEventEmitter,
  resetCallEventEmitter,
  createCallEvent,
  emitCallCreated,
  emitCallEnded,
  emitQualityChanged,
  emitCallError,
  logCallEventToDatabase,
  subscribeToCallEvents,
  createEventLogger,
  type CallEventType,
  type CallEvent,
  type CallCreatedEvent,
  type CallStateChangedEvent,
  type CallEndedEvent,
  type MediaChangedEvent,
  type QualityChangedEvent,
  type QualityAlertEvent,
  type InvitationEvent,
  type StatusChangedEvent,
  type CallErrorEvent,
  type AnyCallEvent,
  type CallEventHandler,
  type CallEventHandlers,
} from "./call-events";
