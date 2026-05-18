"use client";

import { useCallback, useMemo } from "react";
import {
  useQuery,
  useMutation,
  useSubscription,
  useLazyQuery,
  type ApolloError,
} from "@apollo/client";
import { useAuth } from "@/contexts/auth-context";
import {
  GET_USER,
  GET_USER_PROFILE,
  GET_USERS,
  GET_ONLINE_USERS,
  GET_USER_PRESENCE,
  GET_USERS_PRESENCE,
  GET_USERS_BY_ROLE,
  GET_CURRENT_USER,
  SEARCH_USERS_FOR_MENTION,
  UPDATE_PROFILE,
  UPDATE_STATUS,
  CLEAR_STATUS,
  UPDATE_PRESENCE,
  SET_OFFLINE,
  UPDATE_USER_SETTINGS,
  UPDATE_NOTIFICATION_PREFERENCES,
  UPDATE_AVATAR,
  DELETE_AVATAR,
  DEACTIVATE_USER,
  REACTIVATE_USER,
  UPDATE_USER_ROLE,
  PRESENCE_SUBSCRIPTION,
  ALL_PRESENCE_SUBSCRIPTION,
  USERS_PRESENCE_SUBSCRIPTION,
  USER_STATUS_SUBSCRIPTION,
  USER_PROFILE_SUBSCRIPTION,
  type UserStatus,
  type UpdateProfileVariables,
  type UpdateStatusVariables,
  type UpdatePresenceVariables,
} from "@/graphql/users";

// ============================================================================
// TYPES
// ============================================================================

export type { UserStatus };

export interface UserRole {
  id: string;
  name: string;
  permissions: string[];
}

export interface UserPresence {
  id: string;
  user_id: string;
  status: UserStatus;
  last_seen_at: string;
  device?: string;
  user?: UserBasic;
}

export interface UserBasic {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
}

export interface UserProfile extends UserBasic {
  email: string;
  bio?: string;
  status?: string;
  status_emoji?: string;
  status_expires_at?: string;
  timezone?: string;
  locale?: string;
  created_at: string;
  updated_at: string;
  role?: UserRole;
  presence?: UserPresence;
  settings?: Record<string, unknown>;
  notification_preferences?: Record<string, unknown>;
}

export interface User extends UserProfile {
  channel_memberships?: Array<{
    channel: {
      id: string;
      name: string;
      slug: string;
      type: string;
    };
    role: string;
  }>;
  messages_aggregate?: {
    aggregate: {
      count: number;
    };
  };
}

// Hook return types
export interface UseCurrentUserReturn {
  user: UserProfile | null;
  loading: boolean;
  error: ApolloError | undefined;
  refetch: () => Promise<void>;
}

export interface UseUserReturn {
  user: User | null;
  loading: boolean;
  error: ApolloError | undefined;
  refetch: () => Promise<void>;
}

export interface UseUsersReturn {
  users: UserProfile[];
  totalCount: number;
  hasMore: boolean;
  loading: boolean;
  error: ApolloError | undefined;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
}

export interface UseOnlineUsersReturn {
  onlineUsers: UserPresence[];
  loading: boolean;
  error: ApolloError | undefined;
  refetch: () => Promise<void>;
}

export interface UseUserPresenceReturn {
  presence: UserPresence | null;
  loading: boolean;
  error: ApolloError | undefined;
}

export interface UseUpdateProfileReturn {
  updateProfile: (
    variables: Omit<UpdateProfileVariables, "id">,
  ) => Promise<UserProfile | null>;
  updateAvatar: (avatarUrl: string) => Promise<boolean>;
  deleteAvatar: () => Promise<boolean>;
  loading: boolean;
  error: ApolloError | undefined;
}

export interface UseUpdateStatusReturn {
  updateStatus: (
    status: string,
    emoji?: string,
    expiresAt?: string,
  ) => Promise<boolean>;
  clearStatus: () => Promise<boolean>;
  loading: boolean;
  error: ApolloError | undefined;
}

export interface UseUpdatePresenceReturn {
  updatePresence: (status: UserStatus, device?: string) => Promise<boolean>;
  setOnline: () => Promise<boolean>;
  setAway: () => Promise<boolean>;
  setBusy: () => Promise<boolean>;
  setOffline: () => Promise<boolean>;
  loading: boolean;
  error: ApolloError | undefined;
}

export interface UseUserSettingsReturn {
  updateSettings: (settings: Record<string, unknown>) => Promise<boolean>;
  updateNotificationPreferences: (
    preferences: Record<string, unknown>,
  ) => Promise<boolean>;
  loading: boolean;
  error: ApolloError | undefined;
}

export interface UseSearchUsersForMentionReturn {
  search: (query: string, channelId?: string) => Promise<UserBasic[]>;
  results: UserBasic[];
  loading: boolean;
  error: ApolloError | undefined;
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Get the current logged-in user with full details
 */
export function useCurrentUser(): UseCurrentUserReturn {
  const { user: authUser } = useAuth();

  const { data, loading, error, refetch } = useQuery(GET_CURRENT_USER, {
    variables: { id: authUser?.id },
    skip: !authUser?.id,
  });

  // Subscribe to profile changes
  useSubscription(USER_PROFILE_SUBSCRIPTION, {
    variables: { userId: authUser?.id },
    skip: !authUser?.id,
  });

  return {
    user: data?.nchat_users_by_pk ?? null,
    loading,
    error,
    refetch: async () => {
      await refetch();
    },
  };
}

/**
 * Get a user by ID, username, or email
 */
export function useUser(
  identifier: string,
  options?: { by?: "id" | "username" | "email"; autoSubscribe?: boolean },
): UseUserReturn {
  const { by = "id", autoSubscribe = true } = options ?? {};

  const variables = {
    id: by === "id" ? identifier : undefined,
    username: by === "username" ? identifier : undefined,
    email: by === "email" ? identifier : undefined,
  };

  const { data, loading, error, refetch } = useQuery(GET_USER, {
    variables,
    skip: !identifier,
  });

  const userId = data?.nchat_users?.[0]?.id;

  // Subscribe to user status changes
  useSubscription(USER_STATUS_SUBSCRIPTION, {
    variables: { userId },
    skip: !userId || !autoSubscribe,
  });

  return {
    user: data?.nchat_users?.[0] ?? null,
    loading,
    error,
    refetch: async () => {
      await refetch();
    },
  };
}

/**
 * Get user profile with extended information
 */
export function useUserProfile(userId: string): UseUserReturn {
  const { data, loading, error, refetch } = useQuery(GET_USER_PROFILE, {
    variables: { id: userId },
    skip: !userId,
  });

  return {
    user: data?.nchat_users_by_pk ?? null,
    loading,
    error,
    refetch: async () => {
      await refetch();
    },
  };
}

/**
 * Get users list with pagination and search
 */
export function useUsers(options?: {
  limit?: number;
  search?: string;
  roleId?: string;
}): UseUsersReturn {
  const { limit = 50, search, roleId } = options ?? {};

  const searchPattern = search ? `%${search}%` : undefined;

  const { data, loading, error, fetchMore, refetch } = useQuery(GET_USERS, {
    variables: {
      limit,
      offset: 0,
      search: searchPattern,
      roleId,
    },
    fetchPolicy: "cache-and-network",
  });

  const users = useMemo(() => {
    return data?.nchat_users ?? [];
  }, [data]);

  const totalCount = data?.nchat_users_aggregate?.aggregate?.count ?? 0;
  const hasMore = users.length < totalCount;

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;

    await fetchMore({
      variables: {
        limit,
        offset: users.length,
        search: searchPattern,
        roleId,
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;

        return {
          ...fetchMoreResult,
          nchat_users: [...prev.nchat_users, ...fetchMoreResult.nchat_users],
        };
      },
    });
  }, [hasMore, loading, users.length, limit, searchPattern, roleId, fetchMore]);

  return {
    users,
    totalCount,
    hasMore,
    loading,
    error,
    loadMore,
    refetch: async () => {
      await refetch();
    },
  };
}

/**
 * Get online users
 */
export function useOnlineUsers(autoSubscribe = true): UseOnlineUsersReturn {
  const { data, loading, error, refetch } = useQuery(GET_ONLINE_USERS, {
    fetchPolicy: "cache-and-network",
    pollInterval: 30000, // Poll every 30 seconds as backup
  });

  // Subscribe to all presence changes
  useSubscription(ALL_PRESENCE_SUBSCRIPTION, {
    skip: !autoSubscribe,
  });

  const onlineUsers = useMemo(() => {
    return data?.nchat_user_presence ?? [];
  }, [data]);

  return {
    onlineUsers,
    loading,
    error,
    refetch: async () => {
      await refetch();
    },
  };
}

/**
 * Get a specific user's presence
 */
export function useUserPresence(
  userId: string,
  autoSubscribe = true,
): UseUserPresenceReturn {
  const { data, loading, error } = useQuery(GET_USER_PRESENCE, {
    variables: { userId },
    skip: !userId,
  });

  // Subscribe to presence changes
  useSubscription(PRESENCE_SUBSCRIPTION, {
    variables: { userId },
    skip: !userId || !autoSubscribe,
  });

  return {
    presence: data?.nchat_user_presence?.[0] ?? null,
    loading,
    error,
  };
}

/**
 * Get presence for multiple users
 */
export function useUsersPresence(userIds: string[], autoSubscribe = true) {
  const { data, loading, error, refetch } = useQuery(GET_USERS_PRESENCE, {
    variables: { userIds },
    skip: !userIds.length,
  });

  // Subscribe to presence changes
  useSubscription(USERS_PRESENCE_SUBSCRIPTION, {
    variables: { userIds },
    skip: !userIds.length || !autoSubscribe,
  });

  const presenceMap = useMemo(() => {
    const map = new Map<string, UserPresence>();
    data?.nchat_user_presence?.forEach((p: UserPresence) => {
      map.set(p.user_id, p);
    });
    return map;
  }, [data]);

  return {
    presenceMap,
    presenceList: data?.nchat_user_presence ?? [],
    loading,
    error,
    refetch: async () => {
      await refetch();
    },
  };
}

/**
 * Get users by role
 */
export function useUsersByRole(roleName: string) {
  const { data, loading, error, refetch } = useQuery(GET_USERS_BY_ROLE, {
    variables: { roleName },
    skip: !roleName,
  });

  return {
    users: data?.nchat_users ?? [],
    loading,
    error,
    refetch: async () => {
      await refetch();
    },
  };
}

/**
 * Update user profile
 */
export function useUpdateProfile(): UseUpdateProfileReturn {
  const { user } = useAuth();

  const [
    updateProfileMutation,
    { loading: profileLoading, error: profileError },
  ] = useMutation(UPDATE_PROFILE);
  const [updateAvatarMutation, { loading: avatarLoading, error: avatarError }] =
    useMutation(UPDATE_AVATAR);
  const [deleteAvatarMutation, { loading: deleteLoading, error: deleteError }] =
    useMutation(DELETE_AVATAR);

  const updateProfile = useCallback(
    async (
      variables: Omit<UpdateProfileVariables, "id">,
    ): Promise<UserProfile | null> => {
      if (!user) {
        throw new Error("Must be logged in to update profile");
      }

      const result = await updateProfileMutation({
        variables: {
          id: user.id,
          ...variables,
        },
        optimisticResponse: {
          update_nchat_users_by_pk: {
            __typename: "nchat_users",
            id: user.id,
            username: user.username,
            display_name: variables.displayName ?? user.displayName,
            email: user.email,
            avatar_url: user.avatarUrl,
            bio: variables.bio,
            status: null,
            status_emoji: null,
            status_expires_at: null,
            timezone: variables.timezone,
            locale: variables.locale,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        },
      });

      return result.data?.update_nchat_users_by_pk ?? null;
    },
    [user, updateProfileMutation],
  );

  const updateAvatar = useCallback(
    async (avatarUrl: string): Promise<boolean> => {
      if (!user) {
        throw new Error("Must be logged in to update avatar");
      }

      const result = await updateAvatarMutation({
        variables: {
          userId: user.id,
          avatarUrl,
        },
      });

      return !!result.data?.update_nchat_users_by_pk;
    },
    [user, updateAvatarMutation],
  );

  const deleteAvatar = useCallback(async (): Promise<boolean> => {
    if (!user) {
      throw new Error("Must be logged in to delete avatar");
    }

    const result = await deleteAvatarMutation({
      variables: {
        userId: user.id,
      },
    });

    return !!result.data?.update_nchat_users_by_pk;
  }, [user, deleteAvatarMutation]);

  return {
    updateProfile,
    updateAvatar,
    deleteAvatar,
    loading: profileLoading || avatarLoading || deleteLoading,
    error: profileError ?? avatarError ?? deleteError,
  };
}

/**
 * Update user status (custom status message)
 */
export function useUpdateStatus(): UseUpdateStatusReturn {
  const { user } = useAuth();

  const [updateStatusMutation, { loading: updateLoading, error: updateError }] =
    useMutation(UPDATE_STATUS);
  const [clearStatusMutation, { loading: clearLoading, error: clearError }] =
    useMutation(CLEAR_STATUS);

  const updateStatus = useCallback(
    async (
      status: string,
      emoji?: string,
      expiresAt?: string,
    ): Promise<boolean> => {
      if (!user) {
        throw new Error("Must be logged in to update status");
      }

      const result = await updateStatusMutation({
        variables: {
          userId: user.id,
          status,
          statusEmoji: emoji,
          statusExpiresAt: expiresAt,
        },
        optimisticResponse: {
          update_nchat_users_by_pk: {
            __typename: "nchat_users",
            id: user.id,
            status,
            status_emoji: emoji ?? null,
            status_expires_at: expiresAt ?? null,
          },
        },
      });

      return !!result.data?.update_nchat_users_by_pk;
    },
    [user, updateStatusMutation],
  );

  const clearStatus = useCallback(async (): Promise<boolean> => {
    if (!user) {
      throw new Error("Must be logged in to clear status");
    }

    const result = await clearStatusMutation({
      variables: {
        userId: user.id,
      },
      optimisticResponse: {
        update_nchat_users_by_pk: {
          __typename: "nchat_users",
          id: user.id,
          status: null,
          status_emoji: null,
        },
      },
    });

    return !!result.data?.update_nchat_users_by_pk;
  }, [user, clearStatusMutation]);

  return {
    updateStatus,
    clearStatus,
    loading: updateLoading || clearLoading,
    error: updateError ?? clearError,
  };
}

/**
 * Update user presence (online/away/busy/offline)
 */
export function useUpdatePresence(): UseUpdatePresenceReturn {
  const { user } = useAuth();

  const [
    updatePresenceMutation,
    { loading: updateLoading, error: updateError },
  ] = useMutation(UPDATE_PRESENCE);
  const [setOfflineMutation, { loading: offlineLoading, error: offlineError }] =
    useMutation(SET_OFFLINE);

  const updatePresence = useCallback(
    async (status: UserStatus, device?: string): Promise<boolean> => {
      if (!user) {
        throw new Error("Must be logged in to update presence");
      }

      const result = await updatePresenceMutation({
        variables: {
          userId: user.id,
          status,
          device,
        },
        optimisticResponse: {
          insert_nchat_user_presence_one: {
            __typename: "nchat_user_presence",
            id: `presence-${user.id}`,
            status,
            last_seen_at: new Date().toISOString(),
            device: device ?? null,
          },
        },
      });

      return !!result.data?.insert_nchat_user_presence_one;
    },
    [user, updatePresenceMutation],
  );

  const setOnline = useCallback(async (): Promise<boolean> => {
    return updatePresence("online");
  }, [updatePresence]);

  const setAway = useCallback(async (): Promise<boolean> => {
    return updatePresence("away");
  }, [updatePresence]);

  const setBusy = useCallback(async (): Promise<boolean> => {
    return updatePresence("busy");
  }, [updatePresence]);

  const setOffline = useCallback(async (): Promise<boolean> => {
    if (!user) {
      throw new Error("Must be logged in to set offline");
    }

    const result = await setOfflineMutation({
      variables: {
        userId: user.id,
      },
    });

    return (result.data?.update_nchat_user_presence?.affected_rows ?? 0) > 0;
  }, [user, setOfflineMutation]);

  return {
    updatePresence,
    setOnline,
    setAway,
    setBusy,
    setOffline,
    loading: updateLoading || offlineLoading,
    error: updateError ?? offlineError,
  };
}

/**
 * Update user settings and notification preferences
 */
export function useUserSettings(): UseUserSettingsReturn {
  const { user } = useAuth();

  const [
    updateSettingsMutation,
    { loading: settingsLoading, error: settingsError },
  ] = useMutation(UPDATE_USER_SETTINGS);
  const [updateNotifMutation, { loading: notifLoading, error: notifError }] =
    useMutation(UPDATE_NOTIFICATION_PREFERENCES);

  const updateSettings = useCallback(
    async (settings: Record<string, unknown>): Promise<boolean> => {
      if (!user) {
        throw new Error("Must be logged in to update settings");
      }

      const result = await updateSettingsMutation({
        variables: {
          userId: user.id,
          settings,
        },
      });

      return !!result.data?.update_nchat_users_by_pk;
    },
    [user, updateSettingsMutation],
  );

  const updateNotificationPreferences = useCallback(
    async (preferences: Record<string, unknown>): Promise<boolean> => {
      if (!user) {
        throw new Error("Must be logged in to update notification preferences");
      }

      const result = await updateNotifMutation({
        variables: {
          userId: user.id,
          preferences,
        },
      });

      return !!result.data?.update_nchat_users_by_pk;
    },
    [user, updateNotifMutation],
  );

  return {
    updateSettings,
    updateNotificationPreferences,
    loading: settingsLoading || notifLoading,
    error: settingsError ?? notifError,
  };
}

/**
 * Search users for mentions
 */
export function useSearchUsersForMention(): UseSearchUsersForMentionReturn {
  const [searchQuery, { data, loading, error }] = useLazyQuery(
    SEARCH_USERS_FOR_MENTION,
  );

  const search = useCallback(
    async (query: string, channelId?: string): Promise<UserBasic[]> => {
      const searchPattern = `%${query}%`;

      const result = await searchQuery({
        variables: {
          search: searchPattern,
          channelId,
          limit: 10,
        },
      });

      return result.data?.nchat_users ?? [];
    },
    [searchQuery],
  );

  return {
    search,
    results: data?.nchat_users ?? [],
    loading,
    error,
  };
}

/**
 * Deactivate/reactivate user account (admin)
 */
export function useUserAdminActions() {
  const [
    deactivateMutation,
    { loading: deactivateLoading, error: deactivateError },
  ] = useMutation(DEACTIVATE_USER);
  const [
    reactivateMutation,
    { loading: reactivateLoading, error: reactivateError },
  ] = useMutation(REACTIVATE_USER);
  const [updateRoleMutation, { loading: roleLoading, error: roleError }] =
    useMutation(UPDATE_USER_ROLE);

  const deactivateUser = useCallback(
    async (userId: string): Promise<boolean> => {
      const result = await deactivateMutation({
        variables: { userId },
      });

      return result.data?.update_nchat_users_by_pk?.is_active === false;
    },
    [deactivateMutation],
  );

  const reactivateUser = useCallback(
    async (userId: string): Promise<boolean> => {
      const result = await reactivateMutation({
        variables: { userId },
      });

      return result.data?.update_nchat_users_by_pk?.is_active === true;
    },
    [reactivateMutation],
  );

  const updateUserRole = useCallback(
    async (userId: string, roleId: string): Promise<boolean> => {
      const result = await updateRoleMutation({
        variables: { userId, roleId },
      });

      return !!result.data?.update_nchat_users_by_pk;
    },
    [updateRoleMutation],
  );

  return {
    deactivateUser,
    reactivateUser,
    updateUserRole,
    loading: deactivateLoading || reactivateLoading || roleLoading,
    error: deactivateError ?? reactivateError ?? roleError,
  };
}

export default useCurrentUser;
