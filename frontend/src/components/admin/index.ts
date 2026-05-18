// Admin Layout & Navigation
export { AdminLayout } from "./admin-layout";
export { AdminSidebar } from "./admin-sidebar";
export { AdminNav } from "./admin-nav";

// Dashboard Components
export { StatsCard, InlineStat, StatsGrid } from "./stats-card";
export { ActivityChart, generateMockActivityData } from "./activity-chart";
export type { ActivityDataPoint } from "./activity-chart";

// Table Components
export { UserTable } from "./user-table";
export type { User } from "./user-table";
export { ChannelTable } from "./channel-table";
export type { Channel } from "./channel-table";
export { AuditTable } from "./audit-table";
export type { AuditLogEntry, AuditActionType } from "./audit-table";

// Moderation Components
export { ModerationItem, ModerationItemSkeleton } from "./moderation-item";
export { ActivityLog, ActivityItem, ActivityLogCompact } from "./activity-log";

// Form/Modal Components
export { RoleSelect, RoleBadge } from "./role-select";
export type { UserRole } from "./role-select";
export { BanDialog } from "./ban-dialog";
export type { BanDialogUser } from "./ban-dialog";
export { BanUserModal } from "./ban-user-modal";
export { RoleEditor } from "./role-editor";

// Existing Components
export { UsersManagement } from "./users-management";
export { ChannelsManagement } from "./channels-management";
export { SettingsManagement } from "./settings-management";

// Deployment Components
export { VercelDeployButton, DeploymentStatusChecker } from "./deployment";

// Enterprise Features (v1.0.0+)
export { SSOConfiguration } from "./sso/SSOConfiguration";
export { RoleEditor as EnterpriseRoleEditor } from "./rbac/RoleEditor";
export { AuditLogViewer } from "./audit/AuditLogViewer";
