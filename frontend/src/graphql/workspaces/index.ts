/**
 * Workspace GraphQL Operations Index
 *
 * Central export for all workspace-related GraphQL queries, mutations, and subscriptions.
 */

// Fragments
export * from "./fragments";

// Queries
export * from "./queries";

// Mutations
export * from "./mutations";

// Subscriptions
export * from "./subscriptions";

// Re-export common types
export type {
  GetWorkspacesVariables,
  GetWorkspaceVariables,
  GetWorkspaceBySlugVariables,
  GetWorkspaceMembersVariables,
  SearchWorkspaceMembersVariables,
  GetWorkspaceInvitesVariables,
  ValidateInviteVariables,
} from "./queries";

export type {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  WorkspaceSettings,
  CreateInviteInput,
  AddMemberInput,
  UpdateMemberInput,
} from "./mutations";
