/**
 * User Factory
 *
 * Factory functions for creating user test data with sensible defaults
 */

import type { TestUser } from "../render";

// ============================================================================
// Counter for unique IDs
// ============================================================================

let userIdCounter = 0;

function generateUserId(): string {
  return `user-${++userIdCounter}-${Date.now()}`;
}

// ============================================================================
// User Factory
// ============================================================================

export interface UserFactoryOptions extends Partial<TestUser> {}

/**
 * Create a test user with default values
 */
export function createUser(options: UserFactoryOptions = {}): TestUser {
  const id = options.id || generateUserId();
  const username = options.username || `user${userIdCounter}`;

  return {
    id,
    username,
    displayName:
      options.displayName ||
      username.charAt(0).toUpperCase() + username.slice(1),
    email: options.email || `${username}@test.example.com`,
    avatarUrl: options.avatarUrl,
    role: options.role || "member",
    status: options.status || "online",
  };
}

/**
 * Create multiple test users
 */
export function createUsers(
  count: number,
  options: UserFactoryOptions = {},
): TestUser[] {
  return Array.from({ length: count }, (_, i) =>
    createUser({
      ...options,
      username: options.username ? `${options.username}${i + 1}` : undefined,
    }),
  );
}

/**
 * Create an owner user
 */
export function createOwner(
  options: Omit<UserFactoryOptions, "role"> = {},
): TestUser {
  return createUser({
    username: "owner",
    displayName: "System Owner",
    email: "owner@example.com",
    ...options,
    role: "owner",
  });
}

/**
 * Create an admin user
 */
export function createAdmin(
  options: Omit<UserFactoryOptions, "role"> = {},
): TestUser {
  return createUser({
    username: "admin",
    displayName: "Admin User",
    email: "admin@example.com",
    ...options,
    role: "admin",
  });
}

/**
 * Create a moderator user
 */
export function createModerator(
  options: Omit<UserFactoryOptions, "role"> = {},
): TestUser {
  return createUser({
    username: "moderator",
    displayName: "Moderator User",
    email: "moderator@example.com",
    ...options,
    role: "moderator",
  });
}

/**
 * Create a member user
 */
export function createMember(
  options: Omit<UserFactoryOptions, "role"> = {},
): TestUser {
  return createUser({
    ...options,
    role: "member",
  });
}

/**
 * Create a guest user
 */
export function createGuest(
  options: Omit<UserFactoryOptions, "role"> = {},
): TestUser {
  return createUser({
    username: "guest",
    displayName: "Guest User",
    email: "guest@example.com",
    ...options,
    role: "guest",
  });
}

/**
 * Create a user with specific status
 */
export function createUserWithStatus(
  status: "online" | "offline" | "away" | "busy",
  options: Omit<UserFactoryOptions, "status"> = {},
): TestUser {
  return createUser({
    ...options,
    status,
  });
}

/**
 * Create an offline user
 */
export function createOfflineUser(
  options: Omit<UserFactoryOptions, "status"> = {},
): TestUser {
  return createUserWithStatus("offline", options);
}

/**
 * Create an away user
 */
export function createAwayUser(
  options: Omit<UserFactoryOptions, "status"> = {},
): TestUser {
  return createUserWithStatus("away", options);
}

/**
 * Create a busy user
 */
export function createBusyUser(
  options: Omit<UserFactoryOptions, "status"> = {},
): TestUser {
  return createUserWithStatus("busy", options);
}

// ============================================================================
// Pre-defined Users
// ============================================================================

export const predefinedUsers = {
  alice: createUser({
    id: "user-alice",
    username: "alice",
    displayName: "Alice Smith",
    email: "alice@example.com",
  }),
  bob: createUser({
    id: "user-bob",
    username: "bob",
    displayName: "Bob Jones",
    email: "bob@example.com",
    status: "away",
  }),
  charlie: createUser({
    id: "user-charlie",
    username: "charlie",
    displayName: "Charlie Brown",
    email: "charlie@example.com",
    status: "offline",
  }),
  owner: createOwner({
    id: "user-owner",
  }),
  admin: createAdmin({
    id: "user-admin",
  }),
  moderator: createModerator({
    id: "user-moderator",
  }),
  guest: createGuest({
    id: "user-guest",
  }),
};

// ============================================================================
// Reset Counter
// ============================================================================

export function resetUserIdCounter() {
  userIdCounter = 0;
}
