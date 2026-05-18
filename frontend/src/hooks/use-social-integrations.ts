/**
 * Social Integrations Hook
 * Manages integration between social accounts and channels
 */

import { useQuery, useMutation, gql } from "@apollo/client";
import { useCallback } from "react";
import type { SocialIntegration } from "@/lib/social/types";

import { logger } from "@/lib/logger";

const GET_SOCIAL_INTEGRATIONS = gql`
  query GetSocialIntegrations {
    nchat_social_integrations(order_by: { created_at: desc }) {
      id
      account_id
      channel_id
      auto_post
      filter_hashtags
      filter_keywords
      exclude_retweets
      exclude_replies
      min_engagement
      created_at
      updated_at
      account {
        id
        platform
        account_name
        account_handle
        avatar_url
      }
      channel {
        id
        name
        slug
      }
    }
  }
`;

const GET_INTEGRATIONS_BY_ACCOUNT = gql`
  query GetIntegrationsByAccount($accountId: uuid!) {
    nchat_social_integrations(
      where: { account_id: { _eq: $accountId } }
      order_by: { created_at: desc }
    ) {
      id
      account_id
      channel_id
      auto_post
      filter_hashtags
      filter_keywords
      exclude_retweets
      exclude_replies
      min_engagement
      channel {
        id
        name
        slug
      }
    }
  }
`;

const CREATE_INTEGRATION = gql`
  mutation CreateSocialIntegration(
    $integration: nchat_social_integrations_insert_input!
  ) {
    insert_nchat_social_integrations_one(object: $integration) {
      id
      account_id
      channel_id
      auto_post
      filter_hashtags
      filter_keywords
      exclude_retweets
      exclude_replies
      min_engagement
    }
  }
`;

const UPDATE_INTEGRATION = gql`
  mutation UpdateSocialIntegration(
    $id: uuid!
    $updates: nchat_social_integrations_set_input!
  ) {
    update_nchat_social_integrations_by_pk(
      pk_columns: { id: $id }
      _set: $updates
    ) {
      id
      auto_post
      filter_hashtags
      filter_keywords
      exclude_retweets
      exclude_replies
      min_engagement
    }
  }
`;

const DELETE_INTEGRATION = gql`
  mutation DeleteSocialIntegration($id: uuid!) {
    delete_nchat_social_integrations_by_pk(id: $id) {
      id
    }
  }
`;

export function useSocialIntegrations(accountId?: string) {
  const query = accountId
    ? GET_INTEGRATIONS_BY_ACCOUNT
    : GET_SOCIAL_INTEGRATIONS;
  const variables = accountId ? { accountId } : undefined;

  const { data, loading, error, refetch } = useQuery(query, {
    variables,
    fetchPolicy: "cache-and-network",
  });

  const [createIntegrationMutation] = useMutation(CREATE_INTEGRATION);
  const [updateIntegrationMutation] = useMutation(UPDATE_INTEGRATION);
  const [deleteIntegrationMutation] = useMutation(DELETE_INTEGRATION);

  const integrations: SocialIntegration[] =
    data?.nchat_social_integrations || [];

  /**
   * Create a new integration
   */
  const createIntegration = useCallback(
    async (input: {
      accountId: string;
      channelId: string;
      autoPost?: boolean;
      filterHashtags?: string[];
      filterKeywords?: string[];
      excludeRetweets?: boolean;
      excludeReplies?: boolean;
      minEngagement?: number;
      createdBy: string;
    }) => {
      try {
        const { data } = await createIntegrationMutation({
          variables: {
            integration: {
              account_id: input.accountId,
              channel_id: input.channelId,
              auto_post: input.autoPost ?? true,
              filter_hashtags: input.filterHashtags || [],
              filter_keywords: input.filterKeywords || [],
              exclude_retweets: input.excludeRetweets || false,
              exclude_replies: input.excludeReplies || false,
              min_engagement: input.minEngagement || 0,
              created_by: input.createdBy,
            },
          },
          refetchQueries: [query],
        });

        return data?.insert_nchat_social_integrations_one;
      } catch (err) {
        logger.error("Failed to create integration:", err);
        throw err;
      }
    },
    [createIntegrationMutation, query],
  );

  /**
   * Update an existing integration
   */
  const updateIntegration = useCallback(
    async (
      id: string,
      updates: {
        autoPost?: boolean;
        filterHashtags?: string[];
        filterKeywords?: string[];
        excludeRetweets?: boolean;
        excludeReplies?: boolean;
        minEngagement?: number;
      },
    ) => {
      try {
        const { data } = await updateIntegrationMutation({
          variables: {
            id,
            updates: {
              auto_post: updates.autoPost,
              filter_hashtags: updates.filterHashtags,
              filter_keywords: updates.filterKeywords,
              exclude_retweets: updates.excludeRetweets,
              exclude_replies: updates.excludeReplies,
              min_engagement: updates.minEngagement,
            },
          },
        });

        return data?.update_nchat_social_integrations_by_pk;
      } catch (err) {
        logger.error("Failed to update integration:", err);
        throw err;
      }
    },
    [updateIntegrationMutation],
  );

  /**
   * Delete an integration
   */
  const deleteIntegration = useCallback(
    async (id: string) => {
      try {
        await deleteIntegrationMutation({
          variables: { id },
          update(cache) {
            cache.evict({ id: `nchat_social_integrations:${id}` });
            cache.gc();
          },
        });
      } catch (err) {
        logger.error("Failed to delete integration:", err);
        throw err;
      }
    },
    [deleteIntegrationMutation],
  );

  /**
   * Get integrations for a specific channel
   */
  const getIntegrationsByChannel = useCallback(
    (channelId: string) => {
      return integrations.filter((int) => int.channel_id === channelId);
    },
    [integrations],
  );

  return {
    integrations,
    loading,
    error,
    refetch,
    createIntegration,
    updateIntegration,
    deleteIntegration,
    getIntegrationsByChannel,
  };
}
