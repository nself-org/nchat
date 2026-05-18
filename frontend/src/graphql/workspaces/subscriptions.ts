/**
 * Workspace GraphQL Subscriptions
 *
 * Real-time subscriptions for workspace events.
 */

import { gql } from "@apollo/client";
import {
  WORKSPACE_FULL_FRAGMENT,
  WORKSPACE_MEMBER_FRAGMENT,
} from "./fragments";

// ============================================================================
// WORKSPACE SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to workspace updates
 */
export const WORKSPACE_UPDATED = gql`
  subscription WorkspaceUpdated($workspaceId: uuid!) {
    nchat_workspaces_by_pk(id: $workspaceId) {
      ...WorkspaceFull
    }
  }
  ${WORKSPACE_FULL_FRAGMENT}
`;

// Alias for backwards compatibility
export const WORKSPACE_SUBSCRIPTION = WORKSPACE_UPDATED;

/**
 * Subscribe to workspace member changes
 */
export const WORKSPACE_MEMBERS_CHANGED = gql`
  subscription WorkspaceMembersChanged($workspaceId: uuid!) {
    nchat_workspace_members(
      where: { workspace_id: { _eq: $workspaceId } }
      order_by: { joined_at: desc }
      limit: 50
    ) {
      ...WorkspaceMember
    }
  }
  ${WORKSPACE_MEMBER_FRAGMENT}
`;

/**
 * Subscribe to new workspace members (recent joins)
 */
export const NEW_WORKSPACE_MEMBER = gql`
  subscription NewWorkspaceMember($workspaceId: uuid!) {
    nchat_workspace_members(
      where: { workspace_id: { _eq: $workspaceId } }
      order_by: { joined_at: desc }
      limit: 1
    ) {
      ...WorkspaceMember
    }
  }
  ${WORKSPACE_MEMBER_FRAGMENT}
`;

/**
 * Subscribe to user's workspace memberships
 */
export const USER_WORKSPACES_CHANGED = gql`
  subscription UserWorkspacesChanged($userId: uuid!) {
    nchat_workspace_members(
      where: { user_id: { _eq: $userId } }
      order_by: { joined_at: desc }
    ) {
      workspace {
        ...WorkspaceFull
      }
      role
      joined_at
      nickname
    }
  }
  ${WORKSPACE_FULL_FRAGMENT}
`;
