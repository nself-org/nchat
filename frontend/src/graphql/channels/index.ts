/**
 * Channel GraphQL Operations Index
 *
 * Central export for all channel-related GraphQL queries, mutations, and subscriptions.
 */

// Queries
export * from "./queries";

// Mutations
export * from "./mutations";

// Subscriptions
export * from "./subscriptions";

// Categories
export * from "./categories";

// Re-export common types
export type {
  GetChannelsVariables,
  GetChannelByIdVariables,
  GetChannelBySlugVariables,
  GetChannelMembersVariables,
  GetUserChannelsVariables,
  CheckMembershipVariables,
  SearchChannelsVariables,
} from "./queries";

export type {
  CreateChannelInput,
  UpdateChannelInput,
  AddMemberInput,
  UpdateMemberInput,
} from "./mutations";

export type {
  Category,
  GetCategoriesVariables,
  GetCategoryVariables,
  CreateCategoryInput,
  UpdateCategoryInput,
  CategoryPositionUpdate,
  MoveChannelInput,
} from "./categories";
