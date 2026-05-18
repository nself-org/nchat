/**
 * Workspace Service
 *
 * Core service for workspace CRUD operations using Hasura GraphQL backend.
 * Provides a clean API for workspace management with proper error handling.
 */

import { ApolloClient, NormalizedCacheObject } from "@apollo/client";
import {
  GET_WORKSPACES,
  GET_WORKSPACE,
  GET_WORKSPACE_BY_SLUG,
  GET_WORKSPACE_MEMBERS,
  GET_WORKSPACE_ADMINS,
  SEARCH_WORKSPACE_MEMBERS,
  CHECK_WORKSPACE_MEMBERSHIP,
  GET_WORKSPACE_INVITES,
  GET_INVITE_BY_CODE,
  GET_WORKSPACE_STATS,
} from "@/graphql/workspaces/queries";
import {
  INSERT_WORKSPACE,
  UPDATE_WORKSPACE,
  UPDATE_WORKSPACE_SETTINGS,
  DELETE_WORKSPACE,
  TRANSFER_WORKSPACE_OWNERSHIP,
  JOIN_WORKSPACE,
  LEAVE_WORKSPACE,
  ADD_WORKSPACE_MEMBER,
  REMOVE_WORKSPACE_MEMBER,
  UPDATE_WORKSPACE_MEMBER_ROLE,
  UPDATE_WORKSPACE_MEMBER_NICKNAME,
  ADD_WORKSPACE_MEMBERS_BULK,
  CREATE_INVITE,
  USE_INVITE,
  DELETE_INVITE,
  DELETE_EXPIRED_INVITES,
  REVOKE_ALL_INVITES,
} from "@/graphql/workspaces/mutations";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  iconUrl?: string | null;
  bannerUrl?: string | null;
  ownerId: string;
  defaultChannelId?: string | null;
  memberCount: number;
  settings?: WorkspaceSettings | null;
  createdAt: string;
  updatedAt?: string | null;
  owner?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  defaultChannel?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export interface WorkspaceSettings {
  verificationLevel?: "none" | "email" | "phone";
  defaultNotifications?: "all" | "mentions" | "none";
  explicitContentFilter?: "disabled" | "members_without_roles" | "all_members";
  require2FA?: boolean;
  discoverable?: boolean;
  allowInvites?: boolean;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: "owner" | "admin" | "moderator" | "member" | "guest";
  joinedAt: string;
  nickname?: string | null;
  user?: {
    id: string;
    username: string;
    displayName: string;
    email?: string;
    avatarUrl?: string;
    bio?: string;
    status?: string;
    createdAt?: string;
  };
}

export interface WorkspaceInvite {
  id: string;
  workspaceId: string;
  code: string;
  uses: number;
  maxUses?: number | null;
  expiresAt?: string | null;
  createdBy: string;
  createdAt: string;
  creator?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  workspace?: Workspace;
}

export interface CreateWorkspaceInput {
  name: string;
  slug?: string;
  description?: string | null;
  iconUrl?: string | null;
  bannerUrl?: string | null;
  settings?: WorkspaceSettings;
}

export interface UpdateWorkspaceInput {
  name?: string;
  description?: string | null;
  iconUrl?: string | null;
  bannerUrl?: string | null;
  defaultChannelId?: string | null;
  settings?: WorkspaceSettings;
}

export interface WorkspaceListOptions {
  limit?: number;
  offset?: number;
}

export interface MemberListOptions {
  role?: string;
  limit?: number;
  offset?: number;
}

export interface CreateInviteOptions {
  maxUses?: number | null;
  expiresAt?: string | null;
}

export interface WorkspaceListResult {
  workspaces: Array<{
    workspace: Workspace;
    role: string;
    joinedAt: string;
    nickname?: string | null;
  }>;
  total: number;
  hasMore: boolean;
}

export interface MemberListResult {
  members: WorkspaceMember[];
  total: number;
  hasMore: boolean;
}

export interface InviteListResult {
  invites: WorkspaceInvite[];
  total: number;
  hasMore: boolean;
}

export interface WorkspaceStats {
  memberCount: number;
  channelCount: number;
  onlineMembers: number;
  createdAt: string;
}

// ============================================================================
// WORKSPACE SERVICE CLASS
// ============================================================================

export class WorkspaceService {
  private client: ApolloClient<NormalizedCacheObject>;

  constructor(client: ApolloClient<NormalizedCacheObject>) {
    this.client = client;
  }

  // ==========================================================================
  // WORKSPACE CRUD OPERATIONS
  // ==========================================================================

  /**
   * Create a new workspace with default channel
   */
  async createWorkspace(
    input: CreateWorkspaceInput,
    ownerId: string,
  ): Promise<Workspace> {
    const slug = input.slug || this.generateSlug(input.name);

    const defaultSettings: WorkspaceSettings = {
      verificationLevel: "none",
      defaultNotifications: "all",
      explicitContentFilter: "disabled",
      require2FA: false,
      discoverable: false,
      allowInvites: true,
      ...input.settings,
    };

    const { data } = await this.client.mutate({
      mutation: INSERT_WORKSPACE,
      variables: {
        name: input.name,
        slug,
        description: input.description,
        iconUrl: input.iconUrl,
        bannerUrl: input.bannerUrl,
        ownerId,
        settings: defaultSettings,
      },
    });

    const workspace = this.transformWorkspace(data.insert_nchat_workspaces_one);

    // Set the default channel ID if channels were created
    if (data.insert_nchat_workspaces_one.channels?.length > 0) {
      const defaultChannel = data.insert_nchat_workspaces_one.channels.find(
        (c: { is_default: boolean }) => c.is_default,
      );
      if (defaultChannel) {
        await this.client.mutate({
          mutation: UPDATE_WORKSPACE,
          variables: {
            workspaceId: workspace.id,
            defaultChannelId: defaultChannel.id,
          },
        });
        workspace.defaultChannelId = defaultChannel.id;
        workspace.defaultChannel = {
          id: defaultChannel.id,
          name: defaultChannel.name,
          slug: defaultChannel.slug,
        };
      }
    }

    return workspace;
  }

  /**
   * Get a single workspace by ID
   */
  async getWorkspace(id: string): Promise<Workspace | null> {
    const { data } = await this.client.query({
      query: GET_WORKSPACE,
      variables: { id },
      fetchPolicy: "network-only",
    });

    if (!data.nchat_workspaces_by_pk) {
      return null;
    }

    return this.transformWorkspace(data.nchat_workspaces_by_pk);
  }

  /**
   * Get a single workspace by slug
   */
  async getWorkspaceBySlug(slug: string): Promise<Workspace | null> {
    const { data } = await this.client.query({
      query: GET_WORKSPACE_BY_SLUG,
      variables: { slug },
      fetchPolicy: "network-only",
    });

    if (!data.nchat_workspaces || data.nchat_workspaces.length === 0) {
      return null;
    }

    return this.transformWorkspace(data.nchat_workspaces[0]);
  }

  /**
   * Get all workspaces a user is a member of
   */
  async getWorkspaces(
    userId: string,
    options: WorkspaceListOptions = {},
  ): Promise<WorkspaceListResult> {
    const { limit = 50, offset = 0 } = options;

    const { data } = await this.client.query({
      query: GET_WORKSPACES,
      variables: { userId, limit, offset },
      fetchPolicy: "network-only",
    });

    const workspaces = data.nchat_workspace_members.map(
      (member: Record<string, unknown>) => ({
        workspace: this.transformWorkspace(
          member.workspace as Record<string, unknown>,
        ),
        role: member.role as string,
        joinedAt: member.joined_at as string,
        nickname: member.nickname as string | null,
      }),
    );

    const total =
      data.nchat_workspace_members_aggregate?.aggregate?.count ||
      workspaces.length;

    return {
      workspaces,
      total,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Update workspace settings
   */
  async updateWorkspace(
    id: string,
    updates: UpdateWorkspaceInput,
  ): Promise<Workspace> {
    const { data } = await this.client.mutate({
      mutation: UPDATE_WORKSPACE,
      variables: {
        workspaceId: id,
        name: updates.name,
        description: updates.description,
        iconUrl: updates.iconUrl,
        bannerUrl: updates.bannerUrl,
        defaultChannelId: updates.defaultChannelId,
        settings: updates.settings,
      },
    });

    return this.transformWorkspace(data.update_nchat_workspaces_by_pk);
  }

  /**
   * Update workspace settings only
   */
  async updateWorkspaceSettings(
    id: string,
    settings: Partial<WorkspaceSettings>,
  ): Promise<void> {
    await this.client.mutate({
      mutation: UPDATE_WORKSPACE_SETTINGS,
      variables: {
        workspaceId: id,
        settings,
      },
    });
  }

  /**
   * Delete a workspace (owner only)
   */
  async deleteWorkspace(
    id: string,
  ): Promise<{ id: string; name: string; slug: string }> {
    const { data } = await this.client.mutate({
      mutation: DELETE_WORKSPACE,
      variables: { workspaceId: id },
    });

    return {
      id: data.delete_nchat_workspaces_by_pk.id,
      name: data.delete_nchat_workspaces_by_pk.name,
      slug: data.delete_nchat_workspaces_by_pk.slug,
    };
  }

  /**
   * Transfer workspace ownership to another member
   */
  async transferOwnership(
    workspaceId: string,
    currentOwnerId: string,
    newOwnerId: string,
  ): Promise<void> {
    await this.client.mutate({
      mutation: TRANSFER_WORKSPACE_OWNERSHIP,
      variables: {
        workspaceId,
        currentOwnerId,
        newOwnerId,
      },
    });
  }

  // ==========================================================================
  // MEMBERSHIP OPERATIONS
  // ==========================================================================

  /**
   * Get workspace members with pagination
   */
  async getWorkspaceMembers(
    workspaceId: string,
    options: MemberListOptions = {},
  ): Promise<MemberListResult> {
    const { role, limit = 50, offset = 0 } = options;

    const { data } = await this.client.query({
      query: GET_WORKSPACE_MEMBERS,
      variables: { workspaceId, role, limit, offset },
      fetchPolicy: "network-only",
    });

    const members = this.transformMembers(data.nchat_workspace_members);
    const total =
      data.nchat_workspace_members_aggregate?.aggregate?.count ||
      members.length;

    return {
      members,
      total,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Get workspace admins (owner, admin, moderator)
   */
  async getWorkspaceAdmins(workspaceId: string): Promise<WorkspaceMember[]> {
    const { data } = await this.client.query({
      query: GET_WORKSPACE_ADMINS,
      variables: { workspaceId },
      fetchPolicy: "network-only",
    });

    return this.transformMembers(data.nchat_workspace_members);
  }

  /**
   * Search workspace members
   */
  async searchMembers(
    workspaceId: string,
    query: string,
    limit = 20,
  ): Promise<WorkspaceMember[]> {
    const { data } = await this.client.query({
      query: SEARCH_WORKSPACE_MEMBERS,
      variables: { workspaceId, searchQuery: `%${query}%`, limit },
      fetchPolicy: "network-only",
    });

    return this.transformMembers(data.nchat_workspace_members);
  }

  /**
   * Check if user is a member of workspace
   */
  async checkMembership(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMember | null> {
    const { data } = await this.client.query({
      query: CHECK_WORKSPACE_MEMBERSHIP,
      variables: { workspaceId, userId },
      fetchPolicy: "network-only",
    });

    if (
      !data.nchat_workspace_members ||
      data.nchat_workspace_members.length === 0
    ) {
      return null;
    }

    return this.transformMember(data.nchat_workspace_members[0]);
  }

  /**
   * Join a workspace
   */
  async joinWorkspace(
    workspaceId: string,
    userId: string,
    inviteCode?: string,
  ): Promise<WorkspaceMember> {
    // If invite code provided, validate and increment usage
    if (inviteCode) {
      const invite = await this.validateInvite(inviteCode);
      if (!invite || invite.workspaceId !== workspaceId) {
        throw new Error("Invalid or expired invite code");
      }

      // Increment invite usage
      await this.client.mutate({
        mutation: USE_INVITE,
        variables: { inviteId: invite.id },
      });
    }

    const { data } = await this.client.mutate({
      mutation: JOIN_WORKSPACE,
      variables: { workspaceId, userId, role: "member" },
    });

    return this.transformMember(data.insert_nchat_workspace_members_one);
  }

  /**
   * Leave a workspace
   */
  async leaveWorkspace(workspaceId: string, userId: string): Promise<void> {
    // Check if user is the owner
    const workspace = await this.getWorkspace(workspaceId);
    if (workspace?.ownerId === userId) {
      throw new Error(
        "Workspace owner cannot leave. Transfer ownership first.",
      );
    }

    await this.client.mutate({
      mutation: LEAVE_WORKSPACE,
      variables: { workspaceId, userId },
    });
  }

  /**
   * Add a member to workspace (admin action)
   */
  async addMember(
    workspaceId: string,
    userId: string,
    role: "admin" | "moderator" | "member" | "guest" = "member",
    nickname?: string,
  ): Promise<WorkspaceMember> {
    const { data } = await this.client.mutate({
      mutation: ADD_WORKSPACE_MEMBER,
      variables: { workspaceId, userId, role, nickname },
    });

    return this.transformMember(data.insert_nchat_workspace_members_one);
  }

  /**
   * Remove a member from workspace
   */
  async removeMember(workspaceId: string, userId: string): Promise<void> {
    // Prevent removing owner
    const workspace = await this.getWorkspace(workspaceId);
    if (workspace?.ownerId === userId) {
      throw new Error("Cannot remove workspace owner");
    }

    await this.client.mutate({
      mutation: REMOVE_WORKSPACE_MEMBER,
      variables: { workspaceId, userId },
    });
  }

  /**
   * Update member role
   */
  async updateMemberRole(
    workspaceId: string,
    userId: string,
    role: "admin" | "moderator" | "member" | "guest",
  ): Promise<WorkspaceMember> {
    const { data } = await this.client.mutate({
      mutation: UPDATE_WORKSPACE_MEMBER_ROLE,
      variables: { workspaceId, userId, role },
    });

    if (!data.update_nchat_workspace_members.returning?.length) {
      throw new Error("Member not found");
    }

    return this.transformMember(
      data.update_nchat_workspace_members.returning[0],
    );
  }

  /**
   * Update member nickname
   */
  async updateMemberNickname(
    workspaceId: string,
    userId: string,
    nickname: string | null,
  ): Promise<void> {
    await this.client.mutate({
      mutation: UPDATE_WORKSPACE_MEMBER_NICKNAME,
      variables: { workspaceId, userId, nickname },
    });
  }

  /**
   * Add multiple members to workspace (bulk)
   */
  async addMembersBulk(
    workspaceId: string,
    userIds: string[],
    role: "admin" | "moderator" | "member" | "guest" = "member",
  ): Promise<number> {
    const members = userIds.map((userId) => ({
      workspace_id: workspaceId,
      user_id: userId,
      role,
    }));

    const { data } = await this.client.mutate({
      mutation: ADD_WORKSPACE_MEMBERS_BULK,
      variables: {
        members,
        workspaceId,
        memberCount: userIds.length,
      },
    });

    return data.insert_nchat_workspace_members.affected_rows;
  }

  // ==========================================================================
  // INVITE OPERATIONS
  // ==========================================================================

  /**
   * Create a workspace invite
   */
  async createInvite(
    workspaceId: string,
    createdBy: string,
    options: CreateInviteOptions = {},
  ): Promise<WorkspaceInvite> {
    const code = this.generateInviteCode();

    const { data } = await this.client.mutate({
      mutation: CREATE_INVITE,
      variables: {
        workspaceId,
        code,
        maxUses: options.maxUses,
        expiresAt: options.expiresAt,
        createdBy,
      },
    });

    return this.transformInvite(data.insert_nchat_workspace_invites_one);
  }

  /**
   * Get workspace invites
   */
  async getInvites(
    workspaceId: string,
    options: WorkspaceListOptions = {},
  ): Promise<InviteListResult> {
    const { limit = 50, offset = 0 } = options;

    const { data } = await this.client.query({
      query: GET_WORKSPACE_INVITES,
      variables: { workspaceId, limit, offset },
      fetchPolicy: "network-only",
    });

    const invites = data.nchat_workspace_invites.map(
      (inv: Record<string, unknown>) => this.transformInvite(inv),
    );
    const total =
      data.nchat_workspace_invites_aggregate?.aggregate?.count ||
      invites.length;

    return {
      invites,
      total,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Validate an invite code and get workspace info
   */
  async validateInvite(code: string): Promise<WorkspaceInvite | null> {
    const { data } = await this.client.query({
      query: GET_INVITE_BY_CODE,
      variables: { code },
      fetchPolicy: "network-only",
    });

    if (
      !data.nchat_workspace_invites ||
      data.nchat_workspace_invites.length === 0
    ) {
      return null;
    }

    const invite = data.nchat_workspace_invites[0];

    // Check if expired
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return null;
    }

    // Check if max uses exceeded
    if (invite.max_uses && invite.uses >= invite.max_uses) {
      return null;
    }

    return this.transformInvite(invite);
  }

  /**
   * Delete an invite
   */
  async deleteInvite(inviteId: string): Promise<void> {
    await this.client.mutate({
      mutation: DELETE_INVITE,
      variables: { inviteId },
    });
  }

  /**
   * Delete all expired invites for a workspace
   */
  async deleteExpiredInvites(workspaceId: string): Promise<number> {
    const { data } = await this.client.mutate({
      mutation: DELETE_EXPIRED_INVITES,
      variables: { workspaceId },
    });

    return data.delete_nchat_workspace_invites.affected_rows;
  }

  /**
   * Revoke all invites for a workspace
   */
  async revokeAllInvites(workspaceId: string): Promise<number> {
    const { data } = await this.client.mutate({
      mutation: REVOKE_ALL_INVITES,
      variables: { workspaceId },
    });

    return data.delete_nchat_workspace_invites.affected_rows;
  }

  // ==========================================================================
  // STATS OPERATIONS
  // ==========================================================================

  /**
   * Get workspace statistics
   */
  async getWorkspaceStats(workspaceId: string): Promise<WorkspaceStats | null> {
    const { data } = await this.client.query({
      query: GET_WORKSPACE_STATS,
      variables: { workspaceId },
      fetchPolicy: "network-only",
    });

    if (!data.nchat_workspaces_by_pk) {
      return null;
    }

    const workspace = data.nchat_workspaces_by_pk;
    return {
      memberCount:
        workspace.member_count ||
        workspace.members_aggregate?.aggregate?.count ||
        0,
      channelCount: workspace.channels_aggregate?.aggregate?.count || 0,
      onlineMembers: workspace.online_members?.aggregate?.count || 0,
      createdAt: workspace.created_at,
    };
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Generate a URL-safe slug from a workspace name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .substring(0, 80);
  }

  /**
   * Generate a random invite code
   */
  private generateInviteCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Transform a raw workspace from GraphQL to our interface
   */
  private transformWorkspace(raw: Record<string, unknown>): Workspace {
    return {
      id: raw.id as string,
      name: raw.name as string,
      slug: raw.slug as string,
      description: raw.description as string | null,
      iconUrl: raw.icon_url as string | null,
      bannerUrl: raw.banner_url as string | null,
      ownerId: raw.owner_id as string,
      defaultChannelId: raw.default_channel_id as string | null,
      memberCount: (raw.member_count as number) || 0,
      settings: raw.settings as WorkspaceSettings | null,
      createdAt: raw.created_at as string,
      updatedAt: raw.updated_at as string | null,
      owner: raw.owner
        ? {
            id: (raw.owner as Record<string, unknown>).id as string,
            username: (raw.owner as Record<string, unknown>).username as string,
            displayName: (raw.owner as Record<string, unknown>)
              .display_name as string,
            avatarUrl: (raw.owner as Record<string, unknown>).avatar_url as
              | string
              | undefined,
          }
        : undefined,
      defaultChannel: raw.default_channel
        ? {
            id: (raw.default_channel as Record<string, unknown>).id as string,
            name: (raw.default_channel as Record<string, unknown>)
              .name as string,
            slug: (raw.default_channel as Record<string, unknown>)
              .slug as string,
          }
        : null,
    };
  }

  /**
   * Transform a raw member from GraphQL to our interface
   */
  private transformMember(raw: Record<string, unknown>): WorkspaceMember {
    return {
      id: raw.id as string,
      workspaceId: raw.workspace_id as string,
      userId: raw.user_id as string,
      role: raw.role as "owner" | "admin" | "moderator" | "member" | "guest",
      joinedAt: raw.joined_at as string,
      nickname: raw.nickname as string | null,
      user: raw.user
        ? {
            id: (raw.user as Record<string, unknown>).id as string,
            username: (raw.user as Record<string, unknown>).username as string,
            displayName: (raw.user as Record<string, unknown>)
              .display_name as string,
            email: (raw.user as Record<string, unknown>).email as
              | string
              | undefined,
            avatarUrl: (raw.user as Record<string, unknown>).avatar_url as
              | string
              | undefined,
            bio: (raw.user as Record<string, unknown>).bio as
              | string
              | undefined,
            status: (raw.user as Record<string, unknown>).status as
              | string
              | undefined,
            createdAt: (raw.user as Record<string, unknown>).created_at as
              | string
              | undefined,
          }
        : undefined,
    };
  }

  /**
   * Transform an array of raw members
   */
  private transformMembers(
    rawMembers: Record<string, unknown>[],
  ): WorkspaceMember[] {
    return rawMembers.map((raw) => this.transformMember(raw));
  }

  /**
   * Transform a raw invite from GraphQL to our interface
   */
  private transformInvite(raw: Record<string, unknown>): WorkspaceInvite {
    return {
      id: raw.id as string,
      workspaceId: raw.workspace_id as string,
      code: raw.code as string,
      uses: (raw.uses as number) || 0,
      maxUses: raw.max_uses as number | null,
      expiresAt: raw.expires_at as string | null,
      createdBy: raw.created_by as string,
      createdAt: raw.created_at as string,
      creator: raw.creator
        ? {
            id: (raw.creator as Record<string, unknown>).id as string,
            username: (raw.creator as Record<string, unknown>)
              .username as string,
            displayName: (raw.creator as Record<string, unknown>)
              .display_name as string,
            avatarUrl: (raw.creator as Record<string, unknown>).avatar_url as
              | string
              | undefined,
          }
        : undefined,
      workspace: raw.workspace
        ? this.transformWorkspace(raw.workspace as Record<string, unknown>)
        : undefined,
    };
  }
}

// ============================================================================
// SINGLETON FACTORY
// ============================================================================

let workspaceServiceInstance: WorkspaceService | null = null;

export function getWorkspaceService(
  client: ApolloClient<NormalizedCacheObject>,
): WorkspaceService {
  if (!workspaceServiceInstance) {
    workspaceServiceInstance = new WorkspaceService(client);
  }
  return workspaceServiceInstance;
}

export function createWorkspaceService(
  client: ApolloClient<NormalizedCacheObject>,
): WorkspaceService {
  return new WorkspaceService(client);
}
