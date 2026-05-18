/**
 * Social Accounts Hook
 * Manages social media account connections
 */

import { useQuery, useMutation, gql } from "@apollo/client";
import { useCallback } from "react";
import type { SocialAccount, SocialPlatform } from "@/lib/social/types";

import { logger } from "@/lib/logger";

const GET_SOCIAL_ACCOUNTS = gql`
  query GetSocialAccounts {
    nchat_social_accounts(order_by: { created_at: desc }) {
      id
      platform
      account_id
      account_name
      account_handle
      avatar_url
      is_active
      last_poll_time
      token_expires_at
      created_at
      updated_at
    }
  }
`;

const TOGGLE_ACCOUNT_STATUS = gql`
  mutation ToggleAccountStatus($id: uuid!, $isActive: Boolean!) {
    update_nchat_social_accounts_by_pk(
      pk_columns: { id: $id }
      _set: { is_active: $isActive }
    ) {
      id
      is_active
    }
  }
`;

const DELETE_ACCOUNT = gql`
  mutation DeleteSocialAccount($id: uuid!) {
    delete_nchat_social_accounts_by_pk(id: $id) {
      id
    }
  }
`;

export function useSocialAccounts() {
  const { data, loading, error, refetch } = useQuery(GET_SOCIAL_ACCOUNTS, {
    fetchPolicy: "cache-and-network",
  });

  const [toggleStatusMutation] = useMutation(TOGGLE_ACCOUNT_STATUS);
  const [deleteAccountMutation] = useMutation(DELETE_ACCOUNT);

  const accounts: SocialAccount[] = data?.nchat_social_accounts || [];

  /**
   * Connect a new social account (opens OAuth flow)
   */
  const connectAccount = useCallback((platform: SocialPlatform) => {
    const authUrl = `/api/social/${platform}/auth`;
    window.location.href = authUrl;
  }, []);

  /**
   * Toggle account active/inactive status
   */
  const toggleAccountStatus = useCallback(
    async (id: string, isActive: boolean) => {
      try {
        await toggleStatusMutation({
          variables: { id, isActive },
          optimisticResponse: {
            update_nchat_social_accounts_by_pk: {
              __typename: "nchat_social_accounts",
              id,
              is_active: isActive,
            },
          },
        });
      } catch (err) {
        logger.error("Failed to toggle account status:", err);
        throw err;
      }
    },
    [toggleStatusMutation],
  );

  /**
   * Delete a social account
   */
  const deleteAccount = useCallback(
    async (id: string) => {
      try {
        await deleteAccountMutation({
          variables: { id },
          update(cache) {
            cache.evict({ id: `nchat_social_accounts:${id}` });
            cache.gc();
          },
        });
      } catch (err) {
        logger.error("Failed to delete account:", err);
        throw err;
      }
    },
    [deleteAccountMutation],
  );

  /**
   * Trigger manual import for an account
   */
  const triggerImport = useCallback(async (accountId: string) => {
    try {
      const response = await fetch("/api/social/poll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      });

      if (!response.ok) {
        throw new Error("Import failed");
      }

      const result = await response.json();
      return result.result;
    } catch (err) {
      logger.error("Failed to trigger import:", err);
      throw err;
    }
  }, []);

  /**
   * Get accounts by platform
   */
  const getAccountsByPlatform = useCallback(
    (platform: SocialPlatform) => {
      return accounts.filter((acc) => acc.platform === platform);
    },
    [accounts],
  );

  /**
   * Get active accounts
   */
  const activeAccounts = accounts.filter((acc) => acc.is_active);

  /**
   * Get inactive accounts
   */
  const inactiveAccounts = accounts.filter((acc) => !acc.is_active);

  /**
   * Check if a platform is connected
   */
  const isPlatformConnected = useCallback(
    (platform: SocialPlatform) => {
      return accounts.some((acc) => acc.platform === platform && acc.is_active);
    },
    [accounts],
  );

  return {
    accounts,
    activeAccounts,
    inactiveAccounts,
    loading,
    error,
    refetch,
    connectAccount,
    toggleAccountStatus,
    deleteAccount,
    triggerImport,
    getAccountsByPlatform,
    isPlatformConnected,
  };
}
