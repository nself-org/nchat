/**
 * Auth Components Index
 *
 * Exports all authentication and authorization guard components.
 */

// Auth Guard - requires authentication
export {
  AuthGuard,
  GuestGuard,
  useAuthGuard,
  useGuestGuard,
  withAuthGuard,
} from "./auth-guard";

// Role Guard - requires specific roles
export {
  RoleGuard,
  AuthRoleGuard,
  AdminGuard,
  ModeratorGuard,
  OwnerGuard,
  useRoleGuard,
  withRoleGuard,
} from "./role-guard";

// Setup Guard - manages setup wizard flow
export {
  SetupGuard,
  RequireSetupComplete,
  RequireSetupIncomplete,
  useSetupStatus,
  useRequiresSetup,
} from "./setup-guard";

// Default export for convenience
export { AuthGuard as default } from "./auth-guard";
