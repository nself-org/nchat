import { create } from 'zustand';
/**
 * Zustand v5 channels store.
 * Holds channel list + active selection.
 * TODO: wire selectors and actions in S05.
 */
export const useChannelsStore = create(() => ({
    channels: [],
    activeChannelId: null,
}));
