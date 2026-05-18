/**
 * Permissions Service - Complete Role/Permission Engine
 *
 * Exports the full permission engine with:
 * - Hierarchical roles (Owner > Admin > Moderator > Member > Guest + Custom)
 * - Multi-level inheritance (Workspace > Category > Channel > Role > User)
 * - Override system with allow/deny at all levels
 * - Policy simulation for "what-if" testing
 * - Platform presets (Discord, Slack, Telegram)
 * - Permission caching and audit logging
 *
 * @module services/permissions
 */

// Main permission engine
export {
  PermissionEngine,
  createPermissionEngine,
  createHighPerformanceEngine,
  createRealtimeEngine,
} from "./permission-engine";

// Core types
export type {
  PermissionId,
  BuiltInRoleId,
  OverrideAction,
  InheritanceLevel,
  PlatformPreset,
  PermissionState,
} from "./permission-engine";

// Role types
export type { Role, RoleComparison } from "./permission-engine";

// Override types
export type {
  PermissionOverride,
  WorkspacePermissions,
  CategoryPermissions,
  ChannelPermissions,
} from "./permission-engine";

// Context and result types
export type {
  PermissionContext,
  PermissionResult,
  PermissionChainLink,
  EffectivePermissions,
} from "./permission-engine";

// Simulation types
export type {
  PolicySimulationRequest,
  HypotheticalChange,
  PolicySimulationResult,
  PermissionDiff,
} from "./permission-engine";

// Audit types
export type { PermissionAuditEntry } from "./permission-engine";
