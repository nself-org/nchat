/**
 * Users Resource
 *
 * API methods for managing users.
 */

import { BaseResource } from "./base";
import type { User, PaginatedResult, ListOptions, UUID } from "../types";

/**
 * Update User Options
 */
export interface UpdateUserOptions {
  displayName?: string;
  avatarUrl?: string;
  status?: string;
}

/**
 * Users Resource Class
 *
 * @example
 * ```typescript
 * // Get current user
 * const user = await client.users.me()
 *
 * // Get a user by ID
 * const user = await client.users.get('user-123')
 *
 * // Update current user
 * await client.users.update({ displayName: 'John Doe' })
 * ```
 */
export class UsersResource extends BaseResource {
  /**
   * Get the current authenticated user
   */
  async me(): Promise<User> {
    return this._get<User>("/api/users/me");
  }

  /**
   * Get a user by ID
   */
  async get(userId: UUID): Promise<User> {
    return this._get<User>(`/api/users/${userId}`);
  }

  /**
   * List all users
   */
  async list(options?: ListOptions): Promise<PaginatedResult<User>> {
    return this._get<PaginatedResult<User>>("/api/users", options);
  }

  /**
   * Update current user profile
   */
  async update(options: UpdateUserOptions): Promise<User> {
    return this._patch<User>("/api/users/me", options);
  }

  /**
   * Search users
   */
  async search(
    query: string,
    options?: ListOptions,
  ): Promise<PaginatedResult<User>> {
    return this._get<PaginatedResult<User>>("/api/users/search", {
      q: query,
      ...options,
    });
  }

  /**
   * Get user presence status
   */
  async getPresence(
    userId: UUID,
  ): Promise<{ isOnline: boolean; lastSeenAt?: string }> {
    return this._get<{ isOnline: boolean; lastSeenAt?: string }>(
      `/api/users/${userId}/presence`,
    );
  }

  /**
   * Update user presence
   */
  async updatePresence(status: "online" | "away" | "offline"): Promise<void> {
    return this._post<void>("/api/users/me/presence", { status });
  }

  /**
   * Block a user
   */
  async block(userId: UUID): Promise<void> {
    return this._post<void>(`/api/users/${userId}/block`);
  }

  /**
   * Unblock a user
   */
  async unblock(userId: UUID): Promise<void> {
    return this._delete<void>(`/api/users/${userId}/block`);
  }

  /**
   * Get blocked users
   */
  async getBlocked(options?: ListOptions): Promise<PaginatedResult<User>> {
    return this._get<PaginatedResult<User>>("/api/users/me/blocked", options);
  }
}
