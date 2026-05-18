/**
 * Permission Service - Bitfield-based permission system
 * Phase 6: Task 65
 */

import type {
  ChannelPermissionOverride,
  CreatePermissionOverrideInput,
  PermissionContext,
  ChannelPermission,
} from "@/types/advanced-channels";
import { CHANNEL_PERMISSIONS } from "@/types/advanced-channels";

export class PermissionService {
  /**
   * Create or update a permission override
   */
  async createOverride(
    input: CreatePermissionOverrideInput,
  ): Promise<ChannelPermissionOverride> {
    const response = await fetch("/api/channels/permissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error("Failed to create permission override");
    return response.json();
  }

  /**
   * Get all permission overrides for a channel
   */
  async getChannelOverrides(
    channelId: string,
  ): Promise<ChannelPermissionOverride[]> {
    const response = await fetch(`/api/channels/${channelId}/permissions`);
    if (!response.ok) throw new Error("Failed to fetch permissions");
    return response.json();
  }

  /**
   * Delete a permission override
   */
  async deleteOverride(overrideId: string): Promise<void> {
    const response = await fetch(`/api/channels/permissions/${overrideId}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete permission override");
  }

  /**
   * Calculate effective permissions for a user in a channel
   */
  async calculatePermissions(
    channelId: string,
    userId: string,
  ): Promise<Record<ChannelPermission, boolean>> {
    const response = await fetch(
      `/api/channels/${channelId}/permissions/calculate?userId=${userId}`,
    );
    if (!response.ok) throw new Error("Failed to calculate permissions");
    return response.json();
  }

  /**
   * Check if user has specific permission in channel
   */
  async hasPermission(
    channelId: string,
    userId: string,
    permission: ChannelPermission,
  ): Promise<boolean> {
    const permissions = await this.calculatePermissions(channelId, userId);
    return permissions[permission] || false;
  }

  /**
   * Create permission bitfield from permission names
   */
  createBitfield(permissions: ChannelPermission[]): bigint {
    return permissions.reduce(
      (acc, perm) => acc | CHANNEL_PERMISSIONS[perm],
      0n,
    );
  }

  /**
   * Parse bitfield into permission names
   */
  parseBitfield(bitfield: bigint): ChannelPermission[] {
    const permissions: ChannelPermission[] = [];
    for (const [name, value] of Object.entries(CHANNEL_PERMISSIONS)) {
      if ((bitfield & value) === value) {
        permissions.push(name as ChannelPermission);
      }
    }
    return permissions;
  }

  /**
   * Check if bitfield has specific permission
   */
  hasPermissionInBitfield(
    bitfield: bigint,
    permission: ChannelPermission,
  ): boolean {
    return (
      (bitfield & CHANNEL_PERMISSIONS[permission]) ===
      CHANNEL_PERMISSIONS[permission]
    );
  }
}

export const permissionService = new PermissionService();
