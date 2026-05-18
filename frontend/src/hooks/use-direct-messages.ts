"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@apollo/client";
import { useAuth } from "@/contexts/auth-context";
import { useDMStore } from "@/stores/dm-store";
import { useToast } from "@/hooks/use-toast";
import {
  GET_OR_CREATE_DM,
  FIND_DM_BY_PARTICIPANTS,
  GET_USER_DMS,
} from "@/graphql/direct-messages";
import { findExistingDM } from "@/lib/dm/dm-manager";
import type { DirectMessage } from "@/lib/dm/dm-types";

/**
 * Hook for managing direct messages
 */
export function useDirectMessages() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const { dms, setDMs, addDM, setActiveDM, setLoading, setError } =
    useDMStore();

  // Get or create DM mutation
  const [getOrCreateDMMutation, { loading: creating }] =
    useMutation(GET_OR_CREATE_DM);

  // Query user's DMs
  const {
    loading: loadingDMs,
    error: queryError,
    refetch,
  } = useQuery(GET_USER_DMS, {
    variables: { userId: user?.id },
    skip: !user?.id,
    onCompleted: (data) => {
      if (data?.nchat_dm_participants) {
        const dmList = data.nchat_dm_participants.map((p: any) => p.dm);
        setDMs(dmList);
      }
    },
    onError: (err) => {
      setError(err.message);
      toast({
        title: "Error loading DMs",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  /**
   * Navigate to or create a DM with a user
   */
  const navigateToOrCreateDM = useCallback(
    async (targetUserId: string) => {
      if (!user?.id) {
        toast({
          title: "Not authenticated",
          description: "Please sign in to send messages",
          variant: "destructive",
        });
        return null;
      }

      if (targetUserId === user.id) {
        toast({
          title: "Cannot message yourself",
          description: "You cannot create a DM with yourself",
          variant: "destructive",
        });
        return null;
      }

      setLoading(true);

      try {
        // First check if DM already exists in local store
        const dmList = Array.from(dms.values());
        const existingDM = findExistingDM(dmList, user.id, targetUserId);

        if (existingDM) {
          // Navigate to existing DM
          setActiveDM(existingDM.id);
          router.push(`/chat/dm/${existingDM.id}`);
          return existingDM.id;
        }

        // Create new DM
        const { data } = await getOrCreateDMMutation({
          variables: {
            userId1: user.id,
            userId2: targetUserId,
          },
        });

        if (data?.insert_nchat_direct_messages_one) {
          const newDM = data.insert_nchat_direct_messages_one;
          addDM(newDM);
          setActiveDM(newDM.id);
          router.push(`/chat/dm/${newDM.id}`);

          toast({
            title: "Direct message opened",
            description: "You can now chat with this user",
          });

          return newDM.id;
        }

        return null;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to open DM";
        setError(errorMessage);
        toast({
          title: "Failed to open DM",
          description: errorMessage,
          variant: "destructive",
        });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [
      user,
      dms,
      router,
      getOrCreateDMMutation,
      addDM,
      setActiveDM,
      setLoading,
      setError,
      toast,
    ],
  );

  /**
   * Open existing DM by ID
   */
  const openDM = useCallback(
    (dmId: string) => {
      setActiveDM(dmId);
      router.push(`/chat/dm/${dmId}`);
    },
    [router, setActiveDM],
  );

  /**
   * Refresh DM list
   */
  const refreshDMs = useCallback(async () => {
    if (refetch) {
      await refetch();
    }
  }, [refetch]);

  return {
    // State
    dms: Array.from(dms.values()),
    loading: loadingDMs || creating,
    error: queryError?.message || null,

    // Actions
    navigateToOrCreateDM,
    openDM,
    refreshDMs,
  };
}
