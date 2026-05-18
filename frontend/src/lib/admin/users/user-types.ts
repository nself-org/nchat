/**
 * User Management Types
 * TypeScript types for comprehensive admin user management
 */

// ============================================================================
// Base Types
// ============================================================================

export type UserRole = "owner" | "admin" | "moderator" | "member" | "guest";

export type UserStatus =
  | "active"
  | "inactive"
  | "pending"
  | "banned"
  | "suspended";

export type InviteStatus = "pending" | "accepted" | "expired" | "revoked";

export type BanType = "temporary" | "permanent";

export type DeviceType = "desktop" | "mobile" | "tablet" | "unknown";

export type SessionStatus = "active" | "expired" | "revoked";

// ============================================================================
// User Types
// ============================================================================

export interface AdminUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  coverUrl?: string;
  bio?: string;
  location?: string;
  website?: string;
  pronouns?: string;
  role: {
    id: string;
    name: string;
    permissions: string[];
  };
  isActive: boolean;
  isBanned: boolean;
  isVerified: boolean;
  bannedAt?: string;
  bannedUntil?: string;
  banReason?: string;
  suspendedAt?: string;
  suspendedUntil?: string;
  suspendReason?: string;
  createdAt: string;
  updatedAt?: string;
  lastSeenAt?: string;
  lastLoginAt?: string;
  messagesCount: number;
  channelsCount: number;
  metadata?: Record<string, unknown>;
}

export interface UserFilterOptions {
  search?: string;
  role?: string | null;
  status?: UserStatus | null;
  isBanned?: boolean | null;
  isActive?: boolean | null;
  isVerified?: boolean | null;
  createdAfter?: string;
  createdBefore?: string;
  lastSeenAfter?: string;
  lastSeenBefore?: string;
}

export interface UserSortOptions {
  field:
    | "username"
    | "displayName"
    | "email"
    | "createdAt"
    | "lastSeenAt"
    | "messagesCount";
  direction: "asc" | "desc";
}

export interface UserPagination {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

// ============================================================================
// Invite Types
// ============================================================================

export interface UserInvite {
  id: string;
  email: string;
  role: UserRole;
  status: InviteStatus;
  inviteCode: string;
  inviteLink: string;
  message?: string;
  expiresAt: string;
  createdAt: string;
  acceptedAt?: string;
  revokedAt?: string;
  invitedBy: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  acceptedByUser?: {
    id: string;
    username: string;
    displayName: string;
  };
}

export interface InviteCreateInput {
  email: string;
  role: UserRole;
  message?: string;
  expiresInDays?: number;
  sendEmail?: boolean;
}

export interface BulkInviteInput {
  emails: string[];
  role: UserRole;
  message?: string;
  expiresInDays?: number;
  sendEmails?: boolean;
}

export interface BulkInviteResult {
  successful: string[];
  failed: { email: string; reason: string }[];
  totalSent: number;
  totalFailed: number;
}

export interface InviteLinkInput {
  role: UserRole;
  maxUses?: number;
  expiresInDays?: number;
}

export interface InviteLink {
  id: string;
  code: string;
  url: string;
  role: UserRole;
  maxUses: number | null;
  currentUses: number;
  expiresAt: string;
  createdAt: string;
  createdBy: {
    id: string;
    username: string;
    displayName: string;
  };
  isActive: boolean;
}

// ============================================================================
// Ban Types
// ============================================================================

export interface UserBan {
  id: string;
  userId: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    email: string;
    avatarUrl?: string;
  };
  type: BanType;
  reason: string;
  notes?: string;
  bannedAt: string;
  bannedUntil?: string;
  bannedBy: {
    id: string;
    username: string;
    displayName: string;
  };
  unbannedAt?: string;
  unbannedBy?: {
    id: string;
    username: string;
    displayName: string;
  };
  isActive: boolean;
}

export interface BanUserInput {
  userId: string;
  type: BanType;
  reason: string;
  notes?: string;
  duration?: string; // e.g., '1d', '7d', '30d', 'permanent'
  notifyUser?: boolean;
}

export interface UnbanUserInput {
  userId: string;
  reason?: string;
  notifyUser?: boolean;
}

// ============================================================================
// Activity & Session Types
// ============================================================================

export interface UserActivityEntry {
  id: string;
  userId: string;
  type: string;
  action: string;
  description: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  target?: {
    type: "user" | "channel" | "message" | "role" | "invite" | "other";
    id: string;
    name?: string;
  };
}

export interface UserSession {
  id: string;
  userId: string;
  status: SessionStatus;
  deviceType: DeviceType;
  deviceName?: string;
  browser?: string;
  os?: string;
  ipAddress: string;
  location?: {
    city?: string;
    region?: string;
    country?: string;
  };
  createdAt: string;
  lastActiveAt: string;
  expiresAt?: string;
  isCurrent?: boolean;
}

export interface UserDevice {
  id: string;
  userId: string;
  deviceType: DeviceType;
  deviceName: string;
  deviceId?: string;
  browser?: string;
  os?: string;
  lastIpAddress?: string;
  lastLocation?: {
    city?: string;
    region?: string;
    country?: string;
  };
  firstSeenAt: string;
  lastSeenAt: string;
  isVerified: boolean;
  isTrusted: boolean;
}

// ============================================================================
// Import/Export Types
// ============================================================================

export interface UserImportRow {
  email: string;
  username?: string;
  displayName?: string;
  role?: UserRole;
  password?: string;
  sendInvite?: boolean;
}

export interface UserImportResult {
  successful: number;
  failed: number;
  errors: { row: number; email: string; reason: string }[];
  createdUsers: { id: string; email: string; username: string }[];
}

export interface UserExportOptions {
  format: "csv" | "json" | "xlsx";
  fields?: (keyof AdminUser)[];
  filters?: UserFilterOptions;
  includeActivity?: boolean;
  includeSessions?: boolean;
}

export interface UserExportResult {
  url: string;
  filename: string;
  recordCount: number;
  fileSize: number;
  expiresAt: string;
}

// ============================================================================
// Impersonation Types
// ============================================================================

export interface ImpersonationSession {
  id: string;
  adminId: string;
  adminUser: {
    id: string;
    username: string;
    displayName: string;
  };
  targetUserId: string;
  targetUser: {
    id: string;
    username: string;
    displayName: string;
  };
  reason: string;
  startedAt: string;
  endedAt?: string;
  isActive: boolean;
}

export interface ImpersonateUserInput {
  userId: string;
  reason: string;
}

// ============================================================================
// Statistics Types
// ============================================================================

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  bannedUsers: number;
  pendingUsers: number;
  verifiedUsers: number;
  usersByRole: Record<UserRole, number>;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  averageSessionDuration: number;
  retentionRate: number;
}

export interface UserGrowthData {
  date: string;
  newUsers: number;
  totalUsers: number;
  activeUsers: number;
  churnedUsers: number;
}

export interface ActiveUsersData {
  period: "daily" | "weekly" | "monthly";
  date: string;
  activeUsers: number;
  returningUsers: number;
  newUsers: number;
}

export interface UserRetentionData {
  cohort: string; // e.g., '2024-01' for January 2024 cohort
  initialUsers: number;
  retention: Record<string, number>; // e.g., { 'week1': 85, 'week2': 72, ... }
}

// ============================================================================
// Action Types
// ============================================================================

export type UserAction =
  | "view"
  | "edit"
  | "changeRole"
  | "resetPassword"
  | "deactivate"
  | "reactivate"
  | "delete"
  | "ban"
  | "unban"
  | "suspend"
  | "unsuspend"
  | "impersonate"
  | "viewActivity"
  | "viewSessions"
  | "revokeSessions"
  | "sendInvite"
  | "export";

export interface UserActionPermission {
  action: UserAction;
  allowed: boolean;
  reason?: string;
}

export interface UserActionResult {
  success: boolean;
  message: string;
  data?: unknown;
  error?: string;
}

// ============================================================================
// Modal/Dialog Types
// ============================================================================

export interface UserModalState {
  isOpen: boolean;
  user: AdminUser | null;
  mode?: "view" | "edit" | "create";
}

export interface BanModalState {
  isOpen: boolean;
  user: AdminUser | null;
  isBanning: boolean; // true for ban, false for unban
}

export interface InviteModalState {
  isOpen: boolean;
  mode: "single" | "bulk" | "link";
}

export interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  variant: "default" | "destructive";
  onConfirm: () => void | Promise<void>;
}

// ============================================================================
// Form Types
// ============================================================================

export interface UserEditForm {
  username: string;
  displayName: string;
  email: string;
  bio?: string;
  location?: string;
  website?: string;
  pronouns?: string;
  roleId: string;
}

export interface UserCreateForm {
  username: string;
  displayName: string;
  email: string;
  password?: string;
  roleId: string;
  sendWelcomeEmail?: boolean;
}

export interface ResetPasswordForm {
  sendEmail: boolean;
  requireChange: boolean;
  temporaryPassword?: string;
}
