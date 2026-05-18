/**
 * useCallInvitation Hook
 *
 * React hook for managing incoming call invitations.
 * Handles ringing, notifications, and invitation responses.
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  CallInvitationManager,
  createInvitationManager,
  type CallInvitation,
  type InvitationManagerConfig,
} from "@/lib/calls/call-invitation";
import { useToast } from "./use-toast";

// =============================================================================
// Types
// =============================================================================

export interface UseCallInvitationOptions extends InvitationManagerConfig {
  autoAccept?: boolean;
  onInvitationReceived?: (invitation: CallInvitation) => void;
}

export interface UseCallInvitationReturn {
  // Invitations
  invitations: CallInvitation[];
  activeInvitations: CallInvitation[];
  hasInvitations: boolean;

  // Current ringing
  isRinging: boolean;

  // Actions
  accept: (invitationId: string) => boolean;
  decline: (invitationId: string) => boolean;
  cancel: (invitationId: string) => boolean;

  // Get invitation
  getInvitation: (invitationId: string) => CallInvitation | undefined;

  // Statistics
  stats: {
    total: number;
    pending: number;
    accepted: number;
    declined: number;
    missed: number;
    cancelled: number;
  };
}

// =============================================================================
// Hook
// =============================================================================

export function useCallInvitation(
  options: UseCallInvitationOptions = {},
): UseCallInvitationReturn {
  const { autoAccept = false, onInvitationReceived, ...config } = options;
  const { toast } = useToast();

  // Manager instance
  const managerRef = useRef<CallInvitationManager | null>(null);

  // State
  const [invitations, setInvitations] = useState<CallInvitation[]>([]);
  const [isRinging, setIsRinging] = useState(false);

  // Initialize manager
  useEffect(() => {
    managerRef.current = createInvitationManager({
      ...config,
      onInvitation: (invitation) => {
        setInvitations((prev) => [...prev, invitation]);

        // Show toast (duration handled by toast component defaults)
        toast({
          title: `Incoming ${invitation.type} call`,
          description: `${invitation.callerName} is calling you`,
        });

        // Call user's callback
        if (onInvitationReceived) {
          onInvitationReceived(invitation);
        }

        // Auto-accept if enabled
        if (autoAccept) {
          setTimeout(() => {
            managerRef.current?.acceptInvitation(invitation.id);
          }, 100);
        }

        // Call config callback
        if (config.onInvitation) {
          config.onInvitation(invitation);
        }
      },
      onTimeout: (invitation) => {
        setInvitations((prev) =>
          prev.map((inv) => (inv.id === invitation.id ? invitation : inv)),
        );

        toast({
          title: "Missed call",
          description: `You missed a call from ${invitation.callerName}`,
          variant: "destructive",
        });

        if (config.onTimeout) {
          config.onTimeout(invitation);
        }
      },
      onAccepted: (invitation) => {
        setInvitations((prev) =>
          prev.map((inv) => (inv.id === invitation.id ? invitation : inv)),
        );

        if (config.onAccepted) {
          config.onAccepted(invitation);
        }
      },
      onDeclined: (invitation) => {
        setInvitations((prev) =>
          prev.map((inv) => (inv.id === invitation.id ? invitation : inv)),
        );

        toast({
          title: "Call declined",
          description: `You declined the call from ${invitation.callerName}`,
        });

        if (config.onDeclined) {
          config.onDeclined(invitation);
        }
      },
      onCancelled: (invitation) => {
        setInvitations((prev) =>
          prev.map((inv) => (inv.id === invitation.id ? invitation : inv)),
        );

        toast({
          title: "Call cancelled",
          description: `${invitation.callerName} cancelled the call`,
        });

        if (config.onCancelled) {
          config.onCancelled(invitation);
        }
      },
    });

    // Listen to ringing events
    const handleRingingStarted = () => setIsRinging(true);
    const handleRingingStopped = () => setIsRinging(false);

    managerRef.current.on("ringing-started", handleRingingStarted);
    managerRef.current.on("ringing-stopped", handleRingingStopped);

    return () => {
      if (managerRef.current) {
        managerRef.current.cleanup();
        managerRef.current.off("ringing-started", handleRingingStarted);
        managerRef.current.off("ringing-stopped", handleRingingStopped);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Derived state
  const activeInvitations = invitations.filter(
    (inv) => inv.status === "pending",
  );
  const hasInvitations = activeInvitations.length > 0;

  // Actions
  const accept = useCallback((invitationId: string): boolean => {
    if (!managerRef.current) return false;
    return managerRef.current.acceptInvitation(invitationId);
  }, []);

  const decline = useCallback((invitationId: string): boolean => {
    if (!managerRef.current) return false;
    return managerRef.current.declineInvitation(invitationId);
  }, []);

  const cancel = useCallback((invitationId: string): boolean => {
    if (!managerRef.current) return false;
    return managerRef.current.cancelInvitation(invitationId);
  }, []);

  const getInvitation = useCallback(
    (invitationId: string): CallInvitation | undefined => {
      return managerRef.current?.getInvitation(invitationId);
    },
    [],
  );

  // Statistics
  const stats = managerRef.current?.getStats() || {
    total: 0,
    pending: 0,
    accepted: 0,
    declined: 0,
    missed: 0,
    cancelled: 0,
  };

  return {
    invitations,
    activeInvitations,
    hasInvitations,
    isRinging,
    accept,
    decline,
    cancel,
    getInvitation,
    stats,
  };
}
