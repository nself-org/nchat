/** @nself-chat/state — Zustand v5 stores for nchat. */

export { useAuthStore } from './stores/auth';
export type { AuthState } from './stores/auth';

export { useChannelsStore } from './stores/channels';
export type { ChannelsState, Channel } from './stores/channels';

export { usePresenceStore } from './stores/presence';
export type { PresenceState, PresenceEntry, PresenceStatus } from './stores/presence';
