/**
 * App Directory Types - Type definitions for the nchat app marketplace
 *
 * This module defines all TypeScript types for apps, permissions, ratings, and related data
 */

// ============================================================================
// Core App Types
// ============================================================================

export type AppType = "bot" | "integration" | "plugin" | "workflow" | "theme";

export type AppStatus = "active" | "pending" | "deprecated" | "disabled";

export type AppVisibility = "public" | "private" | "unlisted";

export type AppPricing = "free" | "freemium" | "paid" | "enterprise";

export interface AppDeveloper {
  id: string;
  name: string;
  email: string;
  website?: string;
  verified: boolean;
  avatarUrl?: string;
}

export interface AppVersion {
  version: string;
  releaseDate: string;
  changelog: string;
  minPlatformVersion?: string;
  deprecated?: boolean;
}

export interface AppScreenshot {
  id: string;
  url: string;
  caption?: string;
  order: number;
}

export interface AppCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  appCount: number;
}

export interface AppTag {
  id: string;
  name: string;
  slug: string;
}

export interface AppStats {
  installs: number;
  activeInstalls: number;
  rating: number;
  ratingCount: number;
  reviewCount: number;
}

export interface AppLinks {
  website?: string;
  documentation?: string;
  support?: string;
  privacyPolicy?: string;
  termsOfService?: string;
  github?: string;
}

export interface AppRequirements {
  minPlatformVersion?: string;
  requiredFeatures?: string[];
  incompatibleWith?: string[]; // App IDs that conflict
}

// ============================================================================
// Main App Interface
// ============================================================================

export interface App {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  longDescription: string;
  type: AppType;
  status: AppStatus;
  visibility: AppVisibility;
  pricing: AppPricing;
  price?: number; // In cents, if paid
  icon: string;
  banner?: string;
  developer: AppDeveloper;
  categories: AppCategory[];
  tags: AppTag[];
  permissions: AppPermission[];
  screenshots: AppScreenshot[];
  currentVersion: string;
  versions: AppVersion[];
  stats: AppStats;
  links: AppLinks;
  requirements: AppRequirements;
  features: string[];
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  featured: boolean;
  verified: boolean;
  builtIn: boolean; // nchat built-in apps
}

// ============================================================================
// Permission Types
// ============================================================================

export type PermissionScope =
  | "channels:read"
  | "channels:write"
  | "channels:history"
  | "messages:read"
  | "messages:write"
  | "messages:delete"
  | "users:read"
  | "users:write"
  | "users:presence"
  | "files:read"
  | "files:write"
  | "reactions:read"
  | "reactions:write"
  | "threads:read"
  | "threads:write"
  | "notifications:send"
  | "webhooks:receive"
  | "webhooks:send"
  | "commands:register"
  | "admin:read"
  | "admin:write"
  | "identity:read"
  | "identity:email"
  | "team:read";

export type PermissionLevel = "required" | "optional";

export interface AppPermission {
  scope: PermissionScope;
  level: PermissionLevel;
  description: string;
  reason?: string; // Why the app needs this permission
}

export interface PermissionGroup {
  id: string;
  name: string;
  description: string;
  permissions: PermissionScope[];
  icon: string;
  riskLevel: "low" | "medium" | "high";
}

// ============================================================================
// Installation Types
// ============================================================================

export type InstallationStatus =
  | "active"
  | "paused"
  | "pending"
  | "failed"
  | "uninstalled";

export interface AppInstallation {
  id: string;
  appId: string;
  app: App;
  userId: string;
  workspaceId?: string;
  installedVersion: string;
  status: InstallationStatus;
  grantedPermissions: PermissionScope[];
  settings: Record<string, unknown>;
  installedAt: string;
  updatedAt: string;
  lastUsedAt?: string;
}

export interface InstallationConfig {
  appId: string;
  permissions: PermissionScope[];
  settings?: Record<string, unknown>;
  channels?: string[]; // Limit to specific channels
}

// ============================================================================
// Rating & Review Types
// ============================================================================

export interface AppRating {
  id: string;
  appId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number; // 1-5
  review?: string;
  helpful: number;
  reported: boolean;
  developerResponse?: {
    response: string;
    respondedAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface RatingDistribution {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

export interface RatingSummary {
  average: number;
  total: number;
  distribution: RatingDistribution;
}

// ============================================================================
// Search & Filter Types
// ============================================================================

export interface AppSearchParams {
  query?: string;
  categories?: string[];
  types?: AppType[];
  pricing?: AppPricing[];
  minRating?: number;
  sortBy?: "relevance" | "popular" | "rating" | "recent" | "name";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface AppSearchResult {
  apps: App[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  facets: {
    categories: { id: string; name: string; count: number }[];
    types: { type: AppType; count: number }[];
    pricing: { pricing: AppPricing; count: number }[];
  };
}

export interface AppFilters {
  categories: string[];
  types: AppType[];
  pricing: AppPricing[];
  minRating: number;
  verified: boolean;
  featured: boolean;
}

// ============================================================================
// Webhook & Event Types
// ============================================================================

export interface AppWebhook {
  id: string;
  appId: string;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
  createdAt: string;
}

export interface AppEvent {
  type: string;
  appId: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

// ============================================================================
// Settings Types
// ============================================================================

export type AppSettingType =
  | "text"
  | "number"
  | "boolean"
  | "select"
  | "multiselect"
  | "channel"
  | "user";

export interface AppSettingOption {
  value: string;
  label: string;
}

export interface AppSettingDefinition {
  key: string;
  label: string;
  description?: string;
  type: AppSettingType;
  defaultValue: unknown;
  required: boolean;
  options?: AppSettingOption[]; // For select/multiselect
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

export interface AppManifest {
  id: string;
  name: string;
  version: string;
  permissions: AppPermission[];
  settings: AppSettingDefinition[];
  commands?: AppCommand[];
  webhooks?: {
    events: string[];
    endpoint?: string;
  };
}

// ============================================================================
// Command Types (for bots)
// ============================================================================

export interface AppCommandOption {
  name: string;
  description: string;
  type: "string" | "number" | "boolean" | "user" | "channel";
  required: boolean;
  choices?: { name: string; value: string }[];
}

export interface AppCommand {
  name: string;
  description: string;
  usage: string;
  options?: AppCommandOption[];
  examples?: string[];
}

// ============================================================================
// Store State Types
// ============================================================================

export interface AppDirectoryState {
  // App Data
  apps: Map<string, App>;
  categories: AppCategory[];
  featuredApps: string[]; // App IDs
  popularApps: string[]; // App IDs
  recentApps: string[]; // App IDs

  // Installations
  installedApps: Map<string, AppInstallation>;

  // Search State
  searchQuery: string;
  searchResults: App[];
  searchFilters: AppFilters;

  // UI State
  selectedAppId: string | null;
  activeCategory: string | null;
  isLoading: boolean;
  isInstalling: string | null;
  error: string | null;

  // Pagination
  hasMore: boolean;
  currentPage: number;
}

export interface AppDirectoryActions {
  // App Management
  setApps: (apps: App[]) => void;
  addApp: (app: App) => void;
  updateApp: (appId: string, updates: Partial<App>) => void;
  removeApp: (appId: string) => void;
  getAppById: (appId: string) => App | undefined;
  getAppBySlug: (slug: string) => App | undefined;

  // Categories
  setCategories: (categories: AppCategory[]) => void;
  setActiveCategory: (categoryId: string | null) => void;

  // Featured/Popular
  setFeaturedApps: (appIds: string[]) => void;
  setPopularApps: (appIds: string[]) => void;
  setRecentApps: (appIds: string[]) => void;

  // Installations
  setInstalledApps: (installations: AppInstallation[]) => void;
  installApp: (appId: string, config: InstallationConfig) => Promise<void>;
  uninstallApp: (appId: string) => Promise<void>;
  updateInstallation: (
    appId: string,
    updates: Partial<AppInstallation>,
  ) => void;
  isAppInstalled: (appId: string) => boolean;
  getInstallation: (appId: string) => AppInstallation | undefined;

  // Search
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: App[]) => void;
  setSearchFilters: (filters: Partial<AppFilters>) => void;
  resetSearchFilters: () => void;
  searchApps: (params: AppSearchParams) => Promise<AppSearchResult>;

  // Selection
  selectApp: (appId: string | null) => void;

  // Loading
  setLoading: (loading: boolean) => void;
  setInstalling: (appId: string | null) => void;
  setError: (error: string | null) => void;

  // Pagination
  setHasMore: (hasMore: boolean) => void;
  setCurrentPage: (page: number) => void;
  loadMoreApps: () => Promise<void>;

  // Utility
  resetStore: () => void;
}

export type AppDirectoryStore = AppDirectoryState & AppDirectoryActions;
