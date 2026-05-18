/**
 * Community Service - WhatsApp-style communities
 * Phase 6: Task 63
 */

import type {
  Community,
  CreateCommunityInput,
  CommunityWithGroups,
  AddCommunityGroupInput,
} from "@/types/advanced-channels";

const DEFAULT_WORKSPACE_ID = "ffffffff-ffff-ffff-ffff-ffffffffffff";

export class CommunityService {
  private workspaceId: string;

  constructor(workspaceId: string = DEFAULT_WORKSPACE_ID) {
    this.workspaceId = workspaceId;
  }

  async createCommunity(input: CreateCommunityInput): Promise<Community> {
    const response = await fetch("/api/channels/communities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...input,
        workspaceId: input.workspaceId || this.workspaceId,
      }),
    });
    if (!response.ok) throw new Error("Failed to create community");
    return response.json();
  }

  async getCommunities(): Promise<Community[]> {
    const response = await fetch(
      `/api/channels/communities?workspaceId=${this.workspaceId}`,
    );
    if (!response.ok) throw new Error("Failed to fetch communities");
    return response.json();
  }

  async getCommunity(communityId: string): Promise<CommunityWithGroups> {
    const response = await fetch(`/api/channels/communities/${communityId}`);
    if (!response.ok) throw new Error("Failed to fetch community");
    return response.json();
  }

  async addGroup(input: AddCommunityGroupInput): Promise<void> {
    const response = await fetch(
      `/api/channels/communities/${input.communityId}/groups`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      },
    );
    if (!response.ok) throw new Error("Failed to add group to community");
  }

  async removeGroup(communityId: string, channelId: string): Promise<void> {
    const response = await fetch(
      `/api/channels/communities/${communityId}/groups/${channelId}`,
      {
        method: "DELETE",
      },
    );
    if (!response.ok) throw new Error("Failed to remove group from community");
  }

  async deleteCommunity(communityId: string): Promise<void> {
    const response = await fetch(`/api/channels/communities/${communityId}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete community");
  }
}

export const communityService = new CommunityService();
