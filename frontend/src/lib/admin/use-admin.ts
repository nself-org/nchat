/**
 * Admin Hooks - Custom hooks for admin functionality
 *
 * Provides data fetching and mutations for admin dashboard
 */

import { useCallback, useEffect } from "react";
import { useMutation, useQuery, useSubscription } from "@apollo/client";
import {
  useAdminStore,
  AdminUser,
  AdminChannel,
  ModerationReport,
  ReportStatus,
  ReportType,
} from "./admin-store";
import {
  GET_ADMIN_STATS,
  GET_USERS_ADMIN,
  GET_USER_ADMIN,
  GET_CHANNELS_ADMIN,
  GET_MODERATION_QUEUE,
  GET_ACTIVITY_LOGS,
  GET_ROLES,
  GET_ANALYTICS_DATA,
  BAN_USER,
  UNBAN_USER,
  CHANGE_USER_ROLE,
  DEACTIVATE_USER_ADMIN,
  REACTIVATE_USER_ADMIN,
  RESOLVE_REPORT,
  DELETE_MESSAGE_ADMIN,
  WARN_USER,
  DELETE_CHANNEL_ADMIN,
  ARCHIVE_CHANNEL_ADMIN,
  REPORTS_SUBSCRIPTION,
  ACTIVITY_LOGS_SUBSCRIPTION,
} from "@/graphql/admin";
import { useAuth } from "@/contexts/auth-context";

// ============================================================================
// Types
// ============================================================================

interface BanUserInput {
  userId: string;
  reason: string;
  duration?: string; // ISO date string for when the ban expires
  notifyUser?: boolean;
}

interface ResolveReportInput {
  reportId: string;
  status: ReportStatus;
  resolution: string;
  action?: "warn" | "mute" | "ban" | "delete" | "dismiss";
}

interface AnalyticsDateRange {
  startDate: Date;
  endDate: Date;
}

// ============================================================================
// useAdminStats - Fetch dashboard statistics
// ============================================================================

export function useAdminStats() {
  const { setStats, setLoadingStats, stats, isLoadingStats } = useAdminStore();

  const { loading, error, refetch } = useQuery(GET_ADMIN_STATS, {
    fetchPolicy: "cache-and-network",
    onCompleted: (data) => {
      setStats({
        totalUsers: data.users_aggregate?.aggregate?.count ?? 0,
        activeUsers: data.active_users_aggregate?.aggregate?.count ?? 0,
        onlineUsers: data.online_users_count?.aggregate?.count ?? 0,
        bannedUsers: data.banned_users_aggregate?.aggregate?.count ?? 0,
        totalChannels: data.channels_aggregate?.aggregate?.count ?? 0,
        totalMessages: data.messages_aggregate?.aggregate?.count ?? 0,
        pendingReports: data.pending_reports_aggregate?.aggregate?.count ?? 0,
        messagesLast24h: data.recent_messages_count?.aggregate?.count ?? 0,
      });
    },
  });

  useEffect(() => {
    setLoadingStats(loading);
  }, [loading, setLoadingStats]);

  return {
    stats,
    isLoading: isLoadingStats,
    error,
    refetch,
  };
}

// ============================================================================
// useAdminUsers - Fetch and manage users
// ============================================================================

export function useAdminUsers() {
  const { user } = useAuth();
  const {
    users,
    usersTotal,
    usersPage,
    usersPerPage,
    usersSearch,
    usersRoleFilter,
    usersBannedFilter,
    isLoadingUsers,
    setUsers,
    setLoadingUsers,
    setUsersPage,
    setUsersSearch,
    setUsersRoleFilter,
    setUsersBannedFilter,
    updateUser,
    openBanUserModal,
    openRoleEditor,
  } = useAdminStore();

  const { loading, error, refetch } = useQuery(GET_USERS_ADMIN, {
    variables: {
      limit: usersPerPage,
      offset: (usersPage - 1) * usersPerPage,
      search: usersSearch ? `%${usersSearch}%` : null,
      roleId: usersRoleFilter,
      isBanned: usersBannedFilter,
    },
    fetchPolicy: "cache-and-network",
    onCompleted: (data) => {
      const transformedUsers: AdminUser[] = data.nchat_users.map((u: any) => ({
        id: u.id,
        username: u.username,
        displayName: u.display_name,
        email: u.email,
        avatarUrl: u.avatar_url,
        role: u.role,
        isActive: u.is_active,
        isBanned: u.is_banned,
        bannedAt: u.banned_at,
        bannedUntil: u.banned_until,
        banReason: u.ban_reason,
        createdAt: u.created_at,
        lastSeenAt: u.presence?.last_seen_at,
        messagesCount: u.messages_aggregate?.aggregate?.count ?? 0,
        channelsCount: u.channel_memberships_aggregate?.aggregate?.count ?? 0,
      }));
      setUsers(
        transformedUsers,
        data.nchat_users_aggregate?.aggregate?.count ?? 0,
      );
    },
  });

  useEffect(() => {
    setLoadingUsers(loading);
  }, [loading, setLoadingUsers]);

  // Ban user mutation
  const [banUserMutation, { loading: banLoading }] = useMutation(BAN_USER, {
    onCompleted: (data) => {
      if (data.update_nchat_users_by_pk) {
        updateUser(data.update_nchat_users_by_pk.id, {
          isBanned: true,
          bannedAt: data.update_nchat_users_by_pk.banned_at,
          bannedUntil: data.update_nchat_users_by_pk.banned_until,
          banReason: data.update_nchat_users_by_pk.ban_reason,
        });
      }
    },
  });

  // Unban user mutation
  const [unbanUserMutation, { loading: unbanLoading }] = useMutation(
    UNBAN_USER,
    {
      onCompleted: (data) => {
        if (data.update_nchat_users_by_pk) {
          updateUser(data.update_nchat_users_by_pk.id, {
            isBanned: false,
            bannedAt: undefined,
            bannedUntil: undefined,
            banReason: undefined,
          });
        }
      },
    },
  );

  // Change role mutation
  const [changeRoleMutation, { loading: roleLoading }] = useMutation(
    CHANGE_USER_ROLE,
    {
      onCompleted: (data) => {
        if (data.update_nchat_users_by_pk) {
          updateUser(data.update_nchat_users_by_pk.id, {
            role: data.update_nchat_users_by_pk.role,
          });
        }
      },
    },
  );

  // Deactivate user mutation
  const [deactivateUserMutation] = useMutation(DEACTIVATE_USER_ADMIN, {
    onCompleted: (data) => {
      if (data.update_nchat_users_by_pk) {
        updateUser(data.update_nchat_users_by_pk.id, {
          isActive: false,
        });
      }
    },
  });

  // Reactivate user mutation
  const [reactivateUserMutation] = useMutation(REACTIVATE_USER_ADMIN, {
    onCompleted: (data) => {
      if (data.update_nchat_users_by_pk) {
        updateUser(data.update_nchat_users_by_pk.id, {
          isActive: true,
        });
      }
    },
  });

  const banUser = useCallback(
    async (input: BanUserInput) => {
      if (!user) return;
      await banUserMutation({
        variables: {
          userId: input.userId,
          reason: input.reason,
          duration: input.duration,
          moderatorId: user.id,
        },
      });
    },
    [banUserMutation, user],
  );

  const unbanUser = useCallback(
    async (userId: string) => {
      if (!user) return;
      await unbanUserMutation({
        variables: {
          userId,
          moderatorId: user.id,
        },
      });
    },
    [unbanUserMutation, user],
  );

  const changeUserRole = useCallback(
    async (userId: string, roleId: string) => {
      if (!user) return;
      await changeRoleMutation({
        variables: {
          userId,
          roleId,
          moderatorId: user.id,
        },
      });
    },
    [changeRoleMutation, user],
  );

  const deactivateUser = useCallback(
    async (userId: string) => {
      if (!user) return;
      await deactivateUserMutation({
        variables: {
          userId,
          moderatorId: user.id,
        },
      });
    },
    [deactivateUserMutation, user],
  );

  const reactivateUser = useCallback(
    async (userId: string) => {
      if (!user) return;
      await reactivateUserMutation({
        variables: {
          userId,
          moderatorId: user.id,
        },
      });
    },
    [reactivateUserMutation, user],
  );

  return {
    users,
    total: usersTotal,
    page: usersPage,
    perPage: usersPerPage,
    search: usersSearch,
    roleFilter: usersRoleFilter,
    bannedFilter: usersBannedFilter,
    isLoading: isLoadingUsers,
    isBanning: banLoading,
    isUnbanning: unbanLoading,
    isChangingRole: roleLoading,
    error,
    setPage: setUsersPage,
    setSearch: setUsersSearch,
    setRoleFilter: setUsersRoleFilter,
    setBannedFilter: setUsersBannedFilter,
    banUser,
    unbanUser,
    changeUserRole,
    deactivateUser,
    reactivateUser,
    openBanModal: openBanUserModal,
    openRoleEditor,
    refetch,
  };
}

// ============================================================================
// useAdminChannels - Fetch and manage channels
// ============================================================================

export function useAdminChannels() {
  const { user } = useAuth();
  const {
    channels,
    channelsTotal,
    channelsPage,
    channelsPerPage,
    channelsSearch,
    channelsTypeFilter,
    channelsIncludeArchived,
    isLoadingChannels,
    setChannels,
    setLoadingChannels,
    setChannelsPage,
    setChannelsSearch,
    setChannelsTypeFilter,
    setChannelsIncludeArchived,
    updateChannel,
    removeChannel,
    openDeleteChannelModal,
  } = useAdminStore();

  const { loading, error, refetch } = useQuery(GET_CHANNELS_ADMIN, {
    variables: {
      limit: channelsPerPage,
      offset: (channelsPage - 1) * channelsPerPage,
      search: channelsSearch ? `%${channelsSearch}%` : null,
      type: channelsTypeFilter,
      includeArchived: channelsIncludeArchived,
    },
    fetchPolicy: "cache-and-network",
    onCompleted: (data) => {
      const transformedChannels: AdminChannel[] = data.nchat_channels.map(
        (c: any) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          description: c.description,
          type: c.type,
          isPrivate: c.is_private,
          isArchived: c.is_archived,
          createdAt: c.created_at,
          creator: c.creator
            ? {
                id: c.creator.id,
                username: c.creator.username,
                displayName: c.creator.display_name,
              }
            : undefined,
          membersCount: c.members_aggregate?.aggregate?.count ?? 0,
          messagesCount: c.messages_aggregate?.aggregate?.count ?? 0,
        }),
      );
      setChannels(
        transformedChannels,
        data.nchat_channels_aggregate?.aggregate?.count ?? 0,
      );
    },
  });

  useEffect(() => {
    setLoadingChannels(loading);
  }, [loading, setLoadingChannels]);

  // Delete channel mutation
  const [deleteChannelMutation, { loading: deleteLoading }] = useMutation(
    DELETE_CHANNEL_ADMIN,
    {
      onCompleted: (data) => {
        if (data.delete_nchat_channels_by_pk) {
          removeChannel(data.delete_nchat_channels_by_pk.id);
        }
      },
    },
  );

  // Archive channel mutation
  const [archiveChannelMutation, { loading: archiveLoading }] = useMutation(
    ARCHIVE_CHANNEL_ADMIN,
    {
      onCompleted: (data) => {
        if (data.update_nchat_channels_by_pk) {
          updateChannel(data.update_nchat_channels_by_pk.id, {
            isArchived: true,
          });
        }
      },
    },
  );

  const deleteChannel = useCallback(
    async (channelId: string) => {
      if (!user) return;
      await deleteChannelMutation({
        variables: {
          channelId,
          moderatorId: user.id,
        },
      });
    },
    [deleteChannelMutation, user],
  );

  const archiveChannel = useCallback(
    async (channelId: string) => {
      if (!user) return;
      await archiveChannelMutation({
        variables: {
          channelId,
          moderatorId: user.id,
        },
      });
    },
    [archiveChannelMutation, user],
  );

  return {
    channels,
    total: channelsTotal,
    page: channelsPage,
    perPage: channelsPerPage,
    search: channelsSearch,
    typeFilter: channelsTypeFilter,
    includeArchived: channelsIncludeArchived,
    isLoading: isLoadingChannels,
    isDeleting: deleteLoading,
    isArchiving: archiveLoading,
    error,
    setPage: setChannelsPage,
    setSearch: setChannelsSearch,
    setTypeFilter: setChannelsTypeFilter,
    setIncludeArchived: setChannelsIncludeArchived,
    deleteChannel,
    archiveChannel,
    openDeleteModal: openDeleteChannelModal,
    refetch,
  };
}

// ============================================================================
// useModeration - Manage moderation queue
// ============================================================================

export function useModeration() {
  const { user } = useAuth();
  const {
    reports,
    reportsTotal,
    reportsPage,
    reportsPerPage,
    reportsStatusFilter,
    reportsTypeFilter,
    selectedReport,
    isLoadingReports,
    setReports,
    setLoadingReports,
    setReportsPage,
    setReportsStatusFilter,
    setReportsTypeFilter,
    setSelectedReport,
    updateReport,
    removeReport,
  } = useAdminStore();

  const { loading, error, refetch } = useQuery(GET_MODERATION_QUEUE, {
    variables: {
      limit: reportsPerPage,
      offset: (reportsPage - 1) * reportsPerPage,
      status: reportsStatusFilter,
      type: reportsTypeFilter,
    },
    fetchPolicy: "cache-and-network",
    onCompleted: (data) => {
      const transformedReports: ModerationReport[] = data.nchat_reports.map(
        (r: any) => ({
          id: r.id,
          type: r.type,
          reason: r.reason,
          status: r.status,
          createdAt: r.created_at,
          resolvedAt: r.resolved_at,
          reporter: {
            id: r.reporter.id,
            username: r.reporter.username,
            displayName: r.reporter.display_name,
          },
          reportedUser: r.reported_user
            ? {
                id: r.reported_user.id,
                username: r.reported_user.username,
                displayName: r.reported_user.display_name,
              }
            : undefined,
          reportedMessage: r.reported_message
            ? {
                id: r.reported_message.id,
                content: r.reported_message.content,
                user: {
                  id: r.reported_message.user.id,
                  username: r.reported_message.user.username,
                  displayName: r.reported_message.user.display_name,
                },
                channel: {
                  id: r.reported_message.channel.id,
                  name: r.reported_message.channel.name,
                },
              }
            : undefined,
          moderator: r.moderator
            ? {
                id: r.moderator.id,
                username: r.moderator.username,
                displayName: r.moderator.display_name,
              }
            : undefined,
          resolution: r.resolution,
        }),
      );
      setReports(
        transformedReports,
        data.nchat_reports_aggregate?.aggregate?.count ?? 0,
      );
    },
  });

  useEffect(() => {
    setLoadingReports(loading);
  }, [loading, setLoadingReports]);

  // Resolve report mutation
  const [resolveReportMutation, { loading: resolveLoading }] = useMutation(
    RESOLVE_REPORT,
    {
      onCompleted: (data) => {
        if (data.update_nchat_reports_by_pk) {
          updateReport(data.update_nchat_reports_by_pk.id, {
            status: data.update_nchat_reports_by_pk.status,
            resolution: data.update_nchat_reports_by_pk.resolution,
            resolvedAt: data.update_nchat_reports_by_pk.resolved_at,
            moderator: data.update_nchat_reports_by_pk.moderator,
          });
        }
      },
    },
  );

  // Delete message mutation
  const [deleteMessageMutation, { loading: deleteMessageLoading }] =
    useMutation(DELETE_MESSAGE_ADMIN);

  // Warn user mutation
  const [warnUserMutation, { loading: warnLoading }] = useMutation(WARN_USER);

  const resolveReport = useCallback(
    async (input: ResolveReportInput) => {
      if (!user) return;
      await resolveReportMutation({
        variables: {
          reportId: input.reportId,
          status: input.status,
          resolution: input.resolution,
          moderatorId: user.id,
          action: input.action,
        },
      });
    },
    [resolveReportMutation, user],
  );

  const deleteReportedMessage = useCallback(
    async (messageId: string, reason?: string) => {
      if (!user) return;
      await deleteMessageMutation({
        variables: {
          messageId,
          moderatorId: user.id,
          reason,
        },
      });
    },
    [deleteMessageMutation, user],
  );

  const warnReportedUser = useCallback(
    async (userId: string, reason: string) => {
      if (!user) return;
      await warnUserMutation({
        variables: {
          userId,
          reason,
          moderatorId: user.id,
        },
      });
    },
    [warnUserMutation, user],
  );

  // Subscribe to new reports
  useSubscription(REPORTS_SUBSCRIPTION, {
    onData: ({ data }) => {
      if (data.data?.nchat_reports) {
        // Refresh the list when new reports come in
        refetch();
      }
    },
  });

  return {
    reports,
    total: reportsTotal,
    page: reportsPage,
    perPage: reportsPerPage,
    statusFilter: reportsStatusFilter,
    typeFilter: reportsTypeFilter,
    selectedReport,
    isLoading: isLoadingReports,
    isResolving: resolveLoading,
    isDeletingMessage: deleteMessageLoading,
    isWarning: warnLoading,
    error,
    setPage: setReportsPage,
    setStatusFilter: setReportsStatusFilter,
    setTypeFilter: setReportsTypeFilter,
    selectReport: setSelectedReport,
    resolveReport,
    deleteReportedMessage,
    warnReportedUser,
    refetch,
  };
}

// ============================================================================
// useActivityLogs - Fetch activity logs
// ============================================================================

export function useActivityLogs() {
  const {
    activityLogs,
    isLoadingActivity,
    setActivityLogs,
    addActivityLog,
    setLoadingActivity,
  } = useAdminStore();

  const { loading, error, refetch } = useQuery(GET_ACTIVITY_LOGS, {
    variables: {
      limit: 50,
    },
    fetchPolicy: "cache-and-network",
    onCompleted: (data) => {
      const transformedLogs = data.nchat_activity_logs.map((log: any) => ({
        id: log.id,
        type: log.type,
        description: log.description,
        metadata: log.metadata,
        createdAt: log.created_at,
        actor: {
          id: log.actor.id,
          username: log.actor.username,
          displayName: log.actor.display_name,
          avatarUrl: log.actor.avatar_url,
        },
      }));
      setActivityLogs(transformedLogs);
    },
  });

  useEffect(() => {
    setLoadingActivity(loading);
  }, [loading, setLoadingActivity]);

  // Subscribe to new activity
  useSubscription(ACTIVITY_LOGS_SUBSCRIPTION, {
    onData: ({ data }) => {
      if (data.data?.nchat_activity_logs) {
        const newLogs = data.data.nchat_activity_logs.map((log: any) => ({
          id: log.id,
          type: log.type,
          description: log.description,
          metadata: log.metadata,
          createdAt: log.created_at,
          actor: {
            id: log.actor.id,
            username: log.actor.username,
            displayName: log.actor.display_name,
            avatarUrl: log.actor.avatar_url,
          },
        }));
        setActivityLogs(newLogs);
      }
    },
  });

  return {
    logs: activityLogs,
    isLoading: isLoadingActivity,
    error,
    refetch,
  };
}

// ============================================================================
// useRoles - Fetch available roles
// ============================================================================

export function useRoles() {
  const { roles, isLoadingRoles, setRoles, setLoadingRoles } = useAdminStore();

  const { loading, error, refetch } = useQuery(GET_ROLES, {
    fetchPolicy: "cache-first",
    onCompleted: (data) => {
      const transformedRoles = data.nchat_roles.map((role: any) => ({
        id: role.id,
        name: role.name,
        description: role.description,
        permissions: role.permissions,
        isDefault: role.is_default,
      }));
      setRoles(transformedRoles);
    },
  });

  useEffect(() => {
    setLoadingRoles(loading);
  }, [loading, setLoadingRoles]);

  return {
    roles,
    isLoading: isLoadingRoles,
    error,
    refetch,
  };
}

// ============================================================================
// useAnalytics - Fetch analytics data
// ============================================================================

export function useAnalytics(dateRange?: AnalyticsDateRange) {
  const defaultRange = {
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    endDate: new Date(),
  };

  const range = dateRange ?? defaultRange;

  const { data, loading, error, refetch } = useQuery(GET_ANALYTICS_DATA, {
    variables: {
      startDate: range.startDate.toISOString(),
      endDate: range.endDate.toISOString(),
    },
    fetchPolicy: "cache-and-network",
  });

  // Process data for charts
  const processedData = {
    userSignups: data?.user_signups ?? [],
    messages: data?.messages ?? [],
    activeChannels: data?.active_channels ?? [],
    roleDistribution: data?.role_distribution ?? [],
  };

  return {
    data: processedData,
    isLoading: loading,
    error,
    refetch,
  };
}

// ============================================================================
// useAdminAccess - Check admin access
// ============================================================================

export function useAdminAccess() {
  const { user } = useAuth();

  const isAdmin = user?.role === "admin" || user?.role === "owner";
  const isOwner = user?.role === "owner";
  const isModerator = user?.role === "moderator" || isAdmin;

  const canManageUsers = isAdmin;
  const canManageChannels = isAdmin;
  const canModerate = isModerator;
  const canViewAnalytics = isAdmin;
  const canManageSettings = isOwner;
  const canManageRoles = isOwner;

  return {
    isAdmin,
    isOwner,
    isModerator,
    canManageUsers,
    canManageChannels,
    canModerate,
    canViewAnalytics,
    canManageSettings,
    canManageRoles,
  };
}
