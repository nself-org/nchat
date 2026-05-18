/**
 * Invite Store - Manages invite state for nself-chat
 *
 * Handles invite creation, validation, and acceptance state using Zustand.
 */

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type {
  InviteType,
  InviteInfo,
  InviteValidationError,
} from "./invite-service";

// ============================================================================
// Types
// ============================================================================

export interface CreateInviteOptions {
  type: InviteType;
  channelId?: string | null;
  channelName?: string;
  maxUses?: number | null;
  expirationOption?: string;
  expiresAt?: Date | null;
}

export interface InvitePreview {
  code: string;
  invite: InviteInfo | null;
  isLoading: boolean;
  error: InviteValidationError | null;
}

export interface CreatedInvite {
  id: string;
  code: string;
  type: InviteType;
  channelId: string | null;
  channelName: string | null;
  link: string;
  maxUses: number | null;
  expiresAt: Date | null;
  createdAt: Date;
}

export interface InviteState {
  // Create modal state
  isCreateModalOpen: boolean;
  createModalOptions: CreateInviteOptions | null;

  // Current invite being created
  isCreating: boolean;
  createdInvite: CreatedInvite | null;
  createError: string | null;

  // Invite preview (for accepting)
  invitePreview: InvitePreview | null;

  // Accept state
  isAccepting: boolean;
  acceptError: string | null;
  acceptSuccess: boolean;

  // Recently created invites (for quick access)
  recentInvites: CreatedInvite[];

  // List of active invites for a channel/workspace
  activeInvites: InviteInfo[];
  isLoadingInvites: boolean;
  invitesError: string | null;
}

export interface InviteActions {
  // Create modal
  openCreateModal: (options?: CreateInviteOptions) => void;
  closeCreateModal: () => void;
  setCreateModalOptions: (options: Partial<CreateInviteOptions>) => void;

  // Create invite
  setIsCreating: (isCreating: boolean) => void;
  setCreatedInvite: (invite: CreatedInvite | null) => void;
  setCreateError: (error: string | null) => void;
  clearCreatedInvite: () => void;

  // Invite preview
  setInvitePreview: (preview: InvitePreview | null) => void;
  updateInvitePreview: (update: Partial<InvitePreview>) => void;
  clearInvitePreview: () => void;

  // Accept
  setIsAccepting: (isAccepting: boolean) => void;
  setAcceptError: (error: string | null) => void;
  setAcceptSuccess: (success: boolean) => void;
  resetAcceptState: () => void;

  // Recent invites
  addRecentInvite: (invite: CreatedInvite) => void;
  removeRecentInvite: (code: string) => void;
  clearRecentInvites: () => void;

  // Active invites list
  setActiveInvites: (invites: InviteInfo[]) => void;
  addActiveInvite: (invite: InviteInfo) => void;
  removeActiveInvite: (id: string) => void;
  updateActiveInvite: (id: string, update: Partial<InviteInfo>) => void;
  setIsLoadingInvites: (isLoading: boolean) => void;
  setInvitesError: (error: string | null) => void;

  // Utility
  reset: () => void;
}

export type InviteStore = InviteState & InviteActions;

// ============================================================================
// Constants
// ============================================================================

const MAX_RECENT_INVITES = 10;

// ============================================================================
// Initial State
// ============================================================================

const initialState: InviteState = {
  isCreateModalOpen: false,
  createModalOptions: null,
  isCreating: false,
  createdInvite: null,
  createError: null,
  invitePreview: null,
  isAccepting: false,
  acceptError: null,
  acceptSuccess: false,
  recentInvites: [],
  activeInvites: [],
  isLoadingInvites: false,
  invitesError: null,
};

// ============================================================================
// Store
// ============================================================================

export const useInviteStore = create<InviteStore>()(
  devtools(
    persist(
      immer((set) => ({
        ...initialState,

        // Create modal
        openCreateModal: (options) =>
          set(
            (state) => {
              state.isCreateModalOpen = true;
              state.createModalOptions = options || {
                type: "channel",
                maxUses: null,
                expirationOption: "7d",
              };
              state.createdInvite = null;
              state.createError = null;
            },
            false,
            "invite/openCreateModal",
          ),

        closeCreateModal: () =>
          set(
            (state) => {
              state.isCreateModalOpen = false;
              // Don't clear createdInvite immediately - let user copy the link
            },
            false,
            "invite/closeCreateModal",
          ),

        setCreateModalOptions: (options) =>
          set(
            (state) => {
              if (state.createModalOptions) {
                state.createModalOptions = {
                  ...state.createModalOptions,
                  ...options,
                };
              } else {
                state.createModalOptions = {
                  type: "channel",
                  ...options,
                };
              }
            },
            false,
            "invite/setCreateModalOptions",
          ),

        // Create invite
        setIsCreating: (isCreating) =>
          set(
            (state) => {
              state.isCreating = isCreating;
            },
            false,
            "invite/setIsCreating",
          ),

        setCreatedInvite: (invite) =>
          set(
            (state) => {
              state.createdInvite = invite;
              state.createError = null;
            },
            false,
            "invite/setCreatedInvite",
          ),

        setCreateError: (error) =>
          set(
            (state) => {
              state.createError = error;
              state.createdInvite = null;
            },
            false,
            "invite/setCreateError",
          ),

        clearCreatedInvite: () =>
          set(
            (state) => {
              state.createdInvite = null;
              state.createError = null;
            },
            false,
            "invite/clearCreatedInvite",
          ),

        // Invite preview
        setInvitePreview: (preview) =>
          set(
            (state) => {
              state.invitePreview = preview;
            },
            false,
            "invite/setInvitePreview",
          ),

        updateInvitePreview: (update) =>
          set(
            (state) => {
              if (state.invitePreview) {
                state.invitePreview = {
                  ...state.invitePreview,
                  ...update,
                };
              }
            },
            false,
            "invite/updateInvitePreview",
          ),

        clearInvitePreview: () =>
          set(
            (state) => {
              state.invitePreview = null;
            },
            false,
            "invite/clearInvitePreview",
          ),

        // Accept
        setIsAccepting: (isAccepting) =>
          set(
            (state) => {
              state.isAccepting = isAccepting;
            },
            false,
            "invite/setIsAccepting",
          ),

        setAcceptError: (error) =>
          set(
            (state) => {
              state.acceptError = error;
              state.acceptSuccess = false;
            },
            false,
            "invite/setAcceptError",
          ),

        setAcceptSuccess: (success) =>
          set(
            (state) => {
              state.acceptSuccess = success;
              if (success) {
                state.acceptError = null;
              }
            },
            false,
            "invite/setAcceptSuccess",
          ),

        resetAcceptState: () =>
          set(
            (state) => {
              state.isAccepting = false;
              state.acceptError = null;
              state.acceptSuccess = false;
            },
            false,
            "invite/resetAcceptState",
          ),

        // Recent invites
        addRecentInvite: (invite) =>
          set(
            (state) => {
              // Remove if already exists
              const index = state.recentInvites.findIndex(
                (i) => i.code === invite.code,
              );
              if (index >= 0) {
                state.recentInvites.splice(index, 1);
              }
              // Add to front
              state.recentInvites.unshift(invite);
              // Trim to max
              if (state.recentInvites.length > MAX_RECENT_INVITES) {
                state.recentInvites = state.recentInvites.slice(
                  0,
                  MAX_RECENT_INVITES,
                );
              }
            },
            false,
            "invite/addRecentInvite",
          ),

        removeRecentInvite: (code) =>
          set(
            (state) => {
              const index = state.recentInvites.findIndex(
                (i) => i.code === code,
              );
              if (index >= 0) {
                state.recentInvites.splice(index, 1);
              }
            },
            false,
            "invite/removeRecentInvite",
          ),

        clearRecentInvites: () =>
          set(
            (state) => {
              state.recentInvites = [];
            },
            false,
            "invite/clearRecentInvites",
          ),

        // Active invites list
        setActiveInvites: (invites) =>
          set(
            (state) => {
              state.activeInvites = invites;
              state.invitesError = null;
            },
            false,
            "invite/setActiveInvites",
          ),

        addActiveInvite: (invite) =>
          set(
            (state) => {
              const exists = state.activeInvites.some(
                (i) => i.id === invite.id,
              );
              if (!exists) {
                state.activeInvites.unshift(invite);
              }
            },
            false,
            "invite/addActiveInvite",
          ),

        removeActiveInvite: (id) =>
          set(
            (state) => {
              const index = state.activeInvites.findIndex((i) => i.id === id);
              if (index >= 0) {
                state.activeInvites.splice(index, 1);
              }
            },
            false,
            "invite/removeActiveInvite",
          ),

        updateActiveInvite: (id, update) =>
          set(
            (state) => {
              const index = state.activeInvites.findIndex((i) => i.id === id);
              if (index >= 0) {
                state.activeInvites[index] = {
                  ...state.activeInvites[index],
                  ...update,
                };
              }
            },
            false,
            "invite/updateActiveInvite",
          ),

        setIsLoadingInvites: (isLoading) =>
          set(
            (state) => {
              state.isLoadingInvites = isLoading;
            },
            false,
            "invite/setIsLoadingInvites",
          ),

        setInvitesError: (error) =>
          set(
            (state) => {
              state.invitesError = error;
            },
            false,
            "invite/setInvitesError",
          ),

        // Utility
        reset: () =>
          set(
            (state) => {
              // Reset everything except recentInvites (persisted)
              state.isCreateModalOpen = false;
              state.createModalOptions = null;
              state.isCreating = false;
              state.createdInvite = null;
              state.createError = null;
              state.invitePreview = null;
              state.isAccepting = false;
              state.acceptError = null;
              state.acceptSuccess = false;
              state.activeInvites = [];
              state.isLoadingInvites = false;
              state.invitesError = null;
            },
            false,
            "invite/reset",
          ),
      })),
      {
        name: "nchat-invite-store",
        // Only persist recentInvites
        partialize: (state) => ({
          recentInvites: state.recentInvites,
        }),
      },
    ),
    { name: "invite-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

export const selectIsCreateModalOpen = (state: InviteStore) =>
  state.isCreateModalOpen;

export const selectCreateModalOptions = (state: InviteStore) =>
  state.createModalOptions;

export const selectIsCreating = (state: InviteStore) => state.isCreating;

export const selectCreatedInvite = (state: InviteStore) => state.createdInvite;

export const selectCreateError = (state: InviteStore) => state.createError;

export const selectInvitePreview = (state: InviteStore) => state.invitePreview;

export const selectIsAccepting = (state: InviteStore) => state.isAccepting;

export const selectAcceptError = (state: InviteStore) => state.acceptError;

export const selectAcceptSuccess = (state: InviteStore) => state.acceptSuccess;

export const selectRecentInvites = (state: InviteStore) => state.recentInvites;

export const selectActiveInvites = (state: InviteStore) => state.activeInvites;

export const selectIsLoadingInvites = (state: InviteStore) =>
  state.isLoadingInvites;

export const selectInvitesError = (state: InviteStore) => state.invitesError;

export const selectHasCreatedInvite = (state: InviteStore) =>
  state.createdInvite !== null;

export const selectCanAccept = (state: InviteStore) =>
  state.invitePreview?.invite !== null &&
  !state.invitePreview?.error &&
  !state.isAccepting;
