// Authoritative copy in frontend/src/types/ — sync in S05

/** A chat message in a channel. */
export interface Message {
  /** Unique message identifier. */
  id: string;
  /** ID of the channel this message belongs to. */
  channelId: string;
  /** ID of the user who sent this message. */
  userId: string;
  /** Plain-text content of the message. */
  content: string;
  /** ISO timestamp when the message was created. */
  createdAt: Date;
}

/** A chat channel (direct, group, or named). */
export interface Channel {
  /** Unique channel identifier. */
  id: string;
  /** Display name of the channel. */
  name: string;
  /** Optional description of the channel's purpose. */
  description?: string;
  /** Channel type discriminator. */
  type: string;
}

/** A registered user in the system. */
export interface User {
  /** Unique user identifier. */
  id: string;
  /** Unique username handle. */
  username: string;
  /** Human-readable display name. */
  displayName: string;
  /** User's email address. */
  email: string;
  /** Optional URL to the user's avatar image. */
  avatarUrl?: string;
}

/** A workspace containing channels and members. */
export interface Workspace {
  /** Unique workspace identifier. */
  id: string;
  /** Display name of the workspace. */
  name: string;
  /** URL-safe slug for the workspace. */
  slug: string;
}
