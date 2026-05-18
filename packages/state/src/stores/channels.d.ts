/** A chat channel entry. */
export interface Channel {
    id: string;
    name: string;
    type: 'text' | 'voice' | 'dm';
}
/** Channels state shape for the @nself-chat/state channels store. */
export interface ChannelsState {
    /** List of channels the current user is a member of. */
    channels: Channel[];
    /** ID of the currently active (selected) channel, or null. */
    activeChannelId: string | null;
}
/**
 * Zustand v5 channels store.
 * Holds channel list + active selection.
 * TODO: wire selectors and actions in S05.
 */
export declare const useChannelsStore: import("zustand").UseBoundStore<import("zustand").StoreApi<ChannelsState>>;
//# sourceMappingURL=channels.d.ts.map