/**
 * Broadcast Service - Broadcast lists with delivery tracking
 * Phase 6: Task 64
 */

import type {
  BroadcastList,
  CreateBroadcastListInput,
  SendBroadcastInput,
  BroadcastMessage,
  BulkSubscribersInput,
} from "@/types/advanced-channels";

const DEFAULT_WORKSPACE_ID = "ffffffff-ffff-ffff-ffff-ffffffffffff";

export class BroadcastService {
  private workspaceId: string;

  constructor(workspaceId: string = DEFAULT_WORKSPACE_ID) {
    this.workspaceId = workspaceId;
  }

  async createBroadcastList(
    input: CreateBroadcastListInput,
  ): Promise<BroadcastList> {
    const response = await fetch("/api/channels/broadcasts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...input,
        workspaceId: input.workspaceId || this.workspaceId,
      }),
    });
    if (!response.ok) throw new Error("Failed to create broadcast list");
    return response.json();
  }

  async getBroadcastLists(): Promise<BroadcastList[]> {
    const response = await fetch(
      `/api/channels/broadcasts?workspaceId=${this.workspaceId}`,
    );
    if (!response.ok) throw new Error("Failed to fetch broadcast lists");
    return response.json();
  }

  async sendBroadcast(input: SendBroadcastInput): Promise<BroadcastMessage> {
    const response = await fetch(
      `/api/channels/broadcasts/${input.broadcastListId}/send`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      },
    );
    if (!response.ok) throw new Error("Failed to send broadcast");
    return response.json();
  }

  async subscribe(broadcastListId: string, userId: string): Promise<void> {
    const response = await fetch(
      `/api/channels/broadcasts/${broadcastListId}/subscribe`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      },
    );
    if (!response.ok) throw new Error("Failed to subscribe");
  }

  async unsubscribe(broadcastListId: string, userId: string): Promise<void> {
    const response = await fetch(
      `/api/channels/broadcasts/${broadcastListId}/unsubscribe`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      },
    );
    if (!response.ok) throw new Error("Failed to unsubscribe");
  }

  async bulkSubscribe(input: BulkSubscribersInput): Promise<void> {
    const response = await fetch(
      `/api/channels/broadcasts/${input.broadcastListId}/bulk-subscribe`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: input.userIds }),
      },
    );
    if (!response.ok) throw new Error("Failed to bulk subscribe");
  }

  async deleteBroadcastList(broadcastListId: string): Promise<void> {
    const response = await fetch(
      `/api/channels/broadcasts/${broadcastListId}`,
      {
        method: "DELETE",
      },
    );
    if (!response.ok) throw new Error("Failed to delete broadcast list");
  }
}

export const broadcastService = new BroadcastService();
