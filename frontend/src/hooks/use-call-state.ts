/**
 * useCallState Hook
 *
 * React hook for managing call state machine.
 * Provides state transitions and state information.
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { logger } from "@/lib/logger";
import {
  CallStateMachine,
  createCallStateMachine,
  type CallState,
  type StateTransitionEvent,
  type StateMachineConfig,
} from "@/lib/calls/call-state-machine";

// =============================================================================
// Types
// =============================================================================

export interface UseCallStateOptions extends StateMachineConfig {
  autoLog?: boolean;
}

export interface UseCallStateReturn {
  // Current state
  state: CallState;
  previousState: CallState | null;

  // State checks
  isIdle: boolean;
  isInitiating: boolean;
  isRinging: boolean;
  isConnecting: boolean;
  isConnected: boolean;
  isReconnecting: boolean;
  isHeld: boolean;
  isTransferring: boolean;
  isEnding: boolean;
  isEnded: boolean;
  isActive: boolean;
  isInProgress: boolean;

  // State information
  displayName: string;
  stateDuration: number;
  totalDuration: number;
  connectedDuration: number;

  // Transitions
  canTransitionTo: (targetState: CallState) => boolean;
  transition: (
    targetState: CallState,
    reason?: string,
    metadata?: Record<string, any>,
  ) => boolean;

  // History
  history: StateTransitionEvent[];

  // Control
  reset: () => void;
}

// =============================================================================
// Hook
// =============================================================================

export function useCallState(
  options: UseCallStateOptions = {},
): UseCallStateReturn {
  const { autoLog = false, ...config } = options;

  // State machine instance
  const machineRef = useRef<CallStateMachine | null>(null);

  // React state
  const [state, setState] = useState<CallState>(config.initialState || "idle");
  const [previousState, setPreviousState] = useState<CallState | null>(null);
  const [history, setHistory] = useState<StateTransitionEvent[]>([]);
  const [, forceUpdate] = useState({});

  // Initialize state machine
  useEffect(() => {
    machineRef.current = createCallStateMachine({
      ...config,
      onTransition: (event) => {
        setState(event.to);
        setPreviousState(event.from);
        setHistory((prev) => [...prev, event]);

        if (autoLog) {
          logger.info(`[Call State] ${event.from} -> ${event.to}`, {
            reason: event.reason,
          });
        }

        // Call user's onTransition
        if (config.onTransition) {
          config.onTransition(event);
        }
      },
      onInvalidTransition: (from, to) => {
        logger.warn(`[Call State] Invalid transition: ${from} -> ${to}`);

        if (config.onInvalidTransition) {
          config.onInvalidTransition(from as CallState, to as CallState);
        }
      },
    });

    return () => {
      machineRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // State checks
  const isIdle = state === "idle";
  const isInitiating = state === "initiating";
  const isRinging = state === "ringing";
  const isConnecting = state === "connecting";
  const isConnected = state === "connected";
  const isReconnecting = state === "reconnecting";
  const isHeld = state === "held";
  const isTransferring = state === "transferring";
  const isEnding = state === "ending";
  const isEnded = state === "ended";
  const isActive = machineRef.current?.isActive() || false;
  const isInProgress = machineRef.current?.isInProgress() || false;

  // State information
  const displayName = machineRef.current?.getStateDisplayName() || state;
  const [stateDuration, setStateDuration] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [connectedDuration, setConnectedDuration] = useState(0);

  // Update durations every second
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      if (machineRef.current) {
        setStateDuration(machineRef.current.getCurrentStateDuration());
        setTotalDuration(machineRef.current.getTotalDuration());
        setConnectedDuration(machineRef.current.getConnectedDuration());
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive]);

  // Transitions
  const canTransitionTo = useCallback((targetState: CallState): boolean => {
    return machineRef.current?.canTransitionTo(targetState) || false;
  }, []);

  const transition = useCallback(
    (
      targetState: CallState,
      reason?: string,
      metadata?: Record<string, any>,
    ): boolean => {
      if (!machineRef.current) return false;
      return machineRef.current.transition(targetState, reason, metadata);
    },
    [],
  );

  // Reset
  const reset = useCallback(() => {
    if (machineRef.current) {
      machineRef.current.reset();
      setState(config.initialState || "idle");
      setPreviousState(null);
      setHistory([]);
      setStateDuration(0);
      setTotalDuration(0);
      setConnectedDuration(0);
    }
  }, [config.initialState]);

  return {
    // Current state
    state,
    previousState,

    // State checks
    isIdle,
    isInitiating,
    isRinging,
    isConnecting,
    isConnected,
    isReconnecting,
    isHeld,
    isTransferring,
    isEnding,
    isEnded,
    isActive,
    isInProgress,

    // State information
    displayName,
    stateDuration,
    totalDuration,
    connectedDuration,

    // Transitions
    canTransitionTo,
    transition,

    // History
    history,

    // Control
    reset,
  };
}
