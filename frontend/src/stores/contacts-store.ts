/**
 * Contacts Store - Zustand store for contact management in nself-chat
 *
 * Manages contacts, invites, and blocked users state with persistence.
 */

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type {
  Contact,
  ContactInvite,
  BlockedContact,
  ContactRelationshipStatus,
  ContactDiscoveryMethod,
  DiscoveryResult,
  ContactUser,
} from "@/services/contacts/contact.service";

// ============================================================================
// Types
// ============================================================================

export interface ContactWithUser extends Contact {
  user: ContactUser;
}

export interface ContactInviteWithUsers extends ContactInvite {
  sender?: ContactUser;
  recipient?: ContactUser;
}

export type ContactSortField = "displayName" | "addedAt" | "lastInteraction";
export type ContactSortOrder = "asc" | "desc";

export interface ContactFilters {
  search: string;
  favorites: boolean;
  discoveryMethod?: ContactDiscoveryMethod;
}

// ============================================================================
// State Interface
// ============================================================================

export interface ContactsState {
  // Contacts list
  contacts: ContactWithUser[];
  contactsById: Map<string, ContactWithUser>;
  isLoadingContacts: boolean;
  contactsError: string | null;

  // Invites
  sentInvites: ContactInviteWithUsers[];
  receivedInvites: ContactInviteWithUsers[];
  isLoadingInvites: boolean;
  invitesError: string | null;

  // Blocked users
  blockedContacts: BlockedContact[];
  blockedUserIds: Set<string>;
  isLoadingBlocked: boolean;
  blockedError: string | null;

  // Discovery
  discoveryResults: DiscoveryResult[];
  isDiscovering: boolean;
  discoveryError: string | null;

  // Sync state
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  syncError: string | null;

  // UI state
  selectedContactId: string | null;
  filters: ContactFilters;
  sortField: ContactSortField;
  sortOrder: ContactSortOrder;

  // Modals
  isInviteModalOpen: boolean;
  isBlockModalOpen: boolean;
  isQRScannerOpen: boolean;
  modalTarget: ContactUser | null;
}

// ============================================================================
// Actions Interface
// ============================================================================

export interface ContactsActions {
  // Contacts CRUD
  setContacts: (contacts: ContactWithUser[]) => void;
  addContact: (contact: ContactWithUser) => void;
  updateContact: (id: string, updates: Partial<Contact>) => void;
  removeContact: (id: string) => void;
  toggleFavorite: (id: string) => void;
  getContactById: (id: string) => ContactWithUser | undefined;
  getContactByUserId: (userId: string) => ContactWithUser | undefined;

  // Contacts loading state
  setLoadingContacts: (loading: boolean) => void;
  setContactsError: (error: string | null) => void;

  // Invites
  setSentInvites: (invites: ContactInviteWithUsers[]) => void;
  setReceivedInvites: (invites: ContactInviteWithUsers[]) => void;
  addSentInvite: (invite: ContactInviteWithUsers) => void;
  addReceivedInvite: (invite: ContactInviteWithUsers) => void;
  updateInviteStatus: (id: string, status: ContactInvite["status"]) => void;
  removeInvite: (id: string) => void;
  setLoadingInvites: (loading: boolean) => void;
  setInvitesError: (error: string | null) => void;

  // Blocked users
  setBlockedContacts: (blocked: BlockedContact[]) => void;
  addBlockedContact: (blocked: BlockedContact) => void;
  removeBlockedContact: (blockedUserId: string) => void;
  isUserBlocked: (userId: string) => boolean;
  setLoadingBlocked: (loading: boolean) => void;
  setBlockedError: (error: string | null) => void;

  // Discovery
  setDiscoveryResults: (results: DiscoveryResult[]) => void;
  addDiscoveryResult: (result: DiscoveryResult) => void;
  clearDiscoveryResults: () => void;
  setIsDiscovering: (discovering: boolean) => void;
  setDiscoveryError: (error: string | null) => void;

  // Sync
  setIsSyncing: (syncing: boolean) => void;
  setLastSyncedAt: (date: Date | null) => void;
  setSyncError: (error: string | null) => void;

  // UI state
  setSelectedContact: (id: string | null) => void;
  setFilters: (filters: Partial<ContactFilters>) => void;
  resetFilters: () => void;
  setSort: (field: ContactSortField, order: ContactSortOrder) => void;

  // Modals
  openInviteModal: (target?: ContactUser) => void;
  closeInviteModal: () => void;
  openBlockModal: (target: ContactUser) => void;
  closeBlockModal: () => void;
  openQRScanner: () => void;
  closeQRScanner: () => void;

  // Utility
  reset: () => void;
  getRelationshipStatus: (userId: string) => ContactRelationshipStatus;
  getPendingInviteCount: () => number;
  getFilteredContacts: () => ContactWithUser[];
}

export type ContactsStore = ContactsState & ContactsActions;

// ============================================================================
// Initial State
// ============================================================================

const defaultFilters: ContactFilters = {
  search: "",
  favorites: false,
  discoveryMethod: undefined,
};

const initialState: ContactsState = {
  contacts: [],
  contactsById: new Map(),
  isLoadingContacts: false,
  contactsError: null,

  sentInvites: [],
  receivedInvites: [],
  isLoadingInvites: false,
  invitesError: null,

  blockedContacts: [],
  blockedUserIds: new Set(),
  isLoadingBlocked: false,
  blockedError: null,

  discoveryResults: [],
  isDiscovering: false,
  discoveryError: null,

  isSyncing: false,
  lastSyncedAt: null,
  syncError: null,

  selectedContactId: null,
  filters: defaultFilters,
  sortField: "displayName",
  sortOrder: "asc",

  isInviteModalOpen: false,
  isBlockModalOpen: false,
  isQRScannerOpen: false,
  modalTarget: null,
};

// ============================================================================
// Store
// ============================================================================

export const useContactsStore = create<ContactsStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        // Contacts CRUD
        setContacts: (contacts) =>
          set(
            (state) => {
              state.contacts = contacts;
              state.contactsById = new Map(contacts.map((c) => [c.id, c]));
              state.contactsError = null;
            },
            false,
            "contacts/setContacts",
          ),

        addContact: (contact) =>
          set(
            (state) => {
              // Check if already exists
              const existingIndex = state.contacts.findIndex(
                (c) => c.id === contact.id,
              );
              if (existingIndex >= 0) {
                state.contacts[existingIndex] = contact;
              } else {
                state.contacts.push(contact);
              }
              state.contactsById.set(contact.id, contact);
            },
            false,
            "contacts/addContact",
          ),

        updateContact: (id, updates) =>
          set(
            (state) => {
              const index = state.contacts.findIndex((c) => c.id === id);
              if (index >= 0) {
                state.contacts[index] = {
                  ...state.contacts[index],
                  ...updates,
                  updatedAt: new Date(),
                };
                state.contactsById.set(id, state.contacts[index]);
              }
            },
            false,
            "contacts/updateContact",
          ),

        removeContact: (id) =>
          set(
            (state) => {
              state.contacts = state.contacts.filter((c) => c.id !== id);
              state.contactsById.delete(id);
            },
            false,
            "contacts/removeContact",
          ),

        toggleFavorite: (id) =>
          set(
            (state) => {
              const index = state.contacts.findIndex((c) => c.id === id);
              if (index >= 0) {
                state.contacts[index].isFavorite =
                  !state.contacts[index].isFavorite;
                state.contactsById.set(id, state.contacts[index]);
              }
            },
            false,
            "contacts/toggleFavorite",
          ),

        getContactById: (id) => get().contactsById.get(id),

        getContactByUserId: (userId) =>
          get().contacts.find((c) => c.contactUserId === userId),

        setLoadingContacts: (loading) =>
          set(
            (state) => {
              state.isLoadingContacts = loading;
            },
            false,
            "contacts/setLoadingContacts",
          ),

        setContactsError: (error) =>
          set(
            (state) => {
              state.contactsError = error;
            },
            false,
            "contacts/setContactsError",
          ),

        // Invites
        setSentInvites: (invites) =>
          set(
            (state) => {
              state.sentInvites = invites;
            },
            false,
            "contacts/setSentInvites",
          ),

        setReceivedInvites: (invites) =>
          set(
            (state) => {
              state.receivedInvites = invites;
            },
            false,
            "contacts/setReceivedInvites",
          ),

        addSentInvite: (invite) =>
          set(
            (state) => {
              state.sentInvites.unshift(invite);
            },
            false,
            "contacts/addSentInvite",
          ),

        addReceivedInvite: (invite) =>
          set(
            (state) => {
              state.receivedInvites.unshift(invite);
            },
            false,
            "contacts/addReceivedInvite",
          ),

        updateInviteStatus: (id, status) =>
          set(
            (state) => {
              const sentIndex = state.sentInvites.findIndex((i) => i.id === id);
              if (sentIndex >= 0) {
                state.sentInvites[sentIndex].status = status;
                state.sentInvites[sentIndex].respondedAt = new Date();
              }
              const receivedIndex = state.receivedInvites.findIndex(
                (i) => i.id === id,
              );
              if (receivedIndex >= 0) {
                state.receivedInvites[receivedIndex].status = status;
                state.receivedInvites[receivedIndex].respondedAt = new Date();
              }
            },
            false,
            "contacts/updateInviteStatus",
          ),

        removeInvite: (id) =>
          set(
            (state) => {
              state.sentInvites = state.sentInvites.filter((i) => i.id !== id);
              state.receivedInvites = state.receivedInvites.filter(
                (i) => i.id !== id,
              );
            },
            false,
            "contacts/removeInvite",
          ),

        setLoadingInvites: (loading) =>
          set(
            (state) => {
              state.isLoadingInvites = loading;
            },
            false,
            "contacts/setLoadingInvites",
          ),

        setInvitesError: (error) =>
          set(
            (state) => {
              state.invitesError = error;
            },
            false,
            "contacts/setInvitesError",
          ),

        // Blocked users
        setBlockedContacts: (blocked) =>
          set(
            (state) => {
              state.blockedContacts = blocked;
              state.blockedUserIds = new Set(
                blocked.map((b) => b.blockedUserId),
              );
            },
            false,
            "contacts/setBlockedContacts",
          ),

        addBlockedContact: (blocked) =>
          set(
            (state) => {
              if (!state.blockedUserIds.has(blocked.blockedUserId)) {
                state.blockedContacts.push(blocked);
                state.blockedUserIds.add(blocked.blockedUserId);
              }
            },
            false,
            "contacts/addBlockedContact",
          ),

        removeBlockedContact: (blockedUserId) =>
          set(
            (state) => {
              state.blockedContacts = state.blockedContacts.filter(
                (b) => b.blockedUserId !== blockedUserId,
              );
              state.blockedUserIds.delete(blockedUserId);
            },
            false,
            "contacts/removeBlockedContact",
          ),

        isUserBlocked: (userId) => get().blockedUserIds.has(userId),

        setLoadingBlocked: (loading) =>
          set(
            (state) => {
              state.isLoadingBlocked = loading;
            },
            false,
            "contacts/setLoadingBlocked",
          ),

        setBlockedError: (error) =>
          set(
            (state) => {
              state.blockedError = error;
            },
            false,
            "contacts/setBlockedError",
          ),

        // Discovery
        setDiscoveryResults: (results) =>
          set(
            (state) => {
              state.discoveryResults = results;
            },
            false,
            "contacts/setDiscoveryResults",
          ),

        addDiscoveryResult: (result) =>
          set(
            (state) => {
              const exists = state.discoveryResults.some(
                (r) => r.userId === result.userId,
              );
              if (!exists) {
                state.discoveryResults.push(result);
              }
            },
            false,
            "contacts/addDiscoveryResult",
          ),

        clearDiscoveryResults: () =>
          set(
            (state) => {
              state.discoveryResults = [];
            },
            false,
            "contacts/clearDiscoveryResults",
          ),

        setIsDiscovering: (discovering) =>
          set(
            (state) => {
              state.isDiscovering = discovering;
            },
            false,
            "contacts/setIsDiscovering",
          ),

        setDiscoveryError: (error) =>
          set(
            (state) => {
              state.discoveryError = error;
            },
            false,
            "contacts/setDiscoveryError",
          ),

        // Sync
        setIsSyncing: (syncing) =>
          set(
            (state) => {
              state.isSyncing = syncing;
            },
            false,
            "contacts/setIsSyncing",
          ),

        setLastSyncedAt: (date) =>
          set(
            (state) => {
              state.lastSyncedAt = date;
            },
            false,
            "contacts/setLastSyncedAt",
          ),

        setSyncError: (error) =>
          set(
            (state) => {
              state.syncError = error;
            },
            false,
            "contacts/setSyncError",
          ),

        // UI state
        setSelectedContact: (id) =>
          set(
            (state) => {
              state.selectedContactId = id;
            },
            false,
            "contacts/setSelectedContact",
          ),

        setFilters: (filters) =>
          set(
            (state) => {
              state.filters = { ...state.filters, ...filters };
            },
            false,
            "contacts/setFilters",
          ),

        resetFilters: () =>
          set(
            (state) => {
              state.filters = defaultFilters;
            },
            false,
            "contacts/resetFilters",
          ),

        setSort: (field, order) =>
          set(
            (state) => {
              state.sortField = field;
              state.sortOrder = order;
            },
            false,
            "contacts/setSort",
          ),

        // Modals
        openInviteModal: (target) =>
          set(
            (state) => {
              state.isInviteModalOpen = true;
              state.modalTarget = target || null;
            },
            false,
            "contacts/openInviteModal",
          ),

        closeInviteModal: () =>
          set(
            (state) => {
              state.isInviteModalOpen = false;
              state.modalTarget = null;
            },
            false,
            "contacts/closeInviteModal",
          ),

        openBlockModal: (target) =>
          set(
            (state) => {
              state.isBlockModalOpen = true;
              state.modalTarget = target;
            },
            false,
            "contacts/openBlockModal",
          ),

        closeBlockModal: () =>
          set(
            (state) => {
              state.isBlockModalOpen = false;
              state.modalTarget = null;
            },
            false,
            "contacts/closeBlockModal",
          ),

        openQRScanner: () =>
          set(
            (state) => {
              state.isQRScannerOpen = true;
            },
            false,
            "contacts/openQRScanner",
          ),

        closeQRScanner: () =>
          set(
            (state) => {
              state.isQRScannerOpen = false;
            },
            false,
            "contacts/closeQRScanner",
          ),

        // Utility
        reset: () =>
          set(
            () => ({
              ...initialState,
              contactsById: new Map(),
              blockedUserIds: new Set(),
            }),
            false,
            "contacts/reset",
          ),

        getRelationshipStatus: (userId) => {
          const state = get();

          // Check if blocked
          if (state.blockedUserIds.has(userId)) {
            return "blocked";
          }

          // Check if already a contact
          const isContact = state.contacts.some(
            (c) => c.contactUserId === userId,
          );
          if (isContact) {
            return "accepted";
          }

          // Check for pending sent invite
          const hasPendingSent = state.sentInvites.some(
            (i) => i.recipientId === userId && i.status === "pending",
          );
          if (hasPendingSent) {
            return "pending_sent";
          }

          // Check for pending received invite
          const hasPendingReceived = state.receivedInvites.some(
            (i) => i.senderId === userId && i.status === "pending",
          );
          if (hasPendingReceived) {
            return "pending_received";
          }

          return "none";
        },

        getPendingInviteCount: () => {
          return get().receivedInvites.filter((i) => i.status === "pending")
            .length;
        },

        getFilteredContacts: () => {
          const state = get();
          let filtered = [...state.contacts];

          // Apply search filter
          if (state.filters.search) {
            const searchLower = state.filters.search.toLowerCase();
            filtered = filtered.filter(
              (c) =>
                c.user.displayName.toLowerCase().includes(searchLower) ||
                c.user.username.toLowerCase().includes(searchLower) ||
                c.nickname?.toLowerCase().includes(searchLower),
            );
          }

          // Apply favorites filter
          if (state.filters.favorites) {
            filtered = filtered.filter((c) => c.isFavorite);
          }

          // Apply discovery method filter
          if (state.filters.discoveryMethod) {
            filtered = filtered.filter(
              (c) => c.discoveryMethod === state.filters.discoveryMethod,
            );
          }

          // Apply sorting
          filtered.sort((a, b) => {
            let compareValue = 0;
            switch (state.sortField) {
              case "displayName":
                compareValue = a.user.displayName.localeCompare(
                  b.user.displayName,
                );
                break;
              case "addedAt":
                compareValue =
                  new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime();
                break;
              case "lastInteraction":
                // Would need last interaction data
                compareValue = 0;
                break;
            }
            return state.sortOrder === "asc" ? compareValue : -compareValue;
          });

          return filtered;
        },
      })),
      {
        name: "nchat-contacts-store",
        partialize: (state) => ({
          sortField: state.sortField,
          sortOrder: state.sortOrder,
          lastSyncedAt: state.lastSyncedAt,
        }),
      },
    ),
    { name: "contacts-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

export const selectContacts = (state: ContactsStore) => state.contacts;

export const selectContactsCount = (state: ContactsStore) =>
  state.contacts.length;

export const selectFavoriteContacts = (state: ContactsStore) =>
  state.contacts.filter((c) => c.isFavorite);

export const selectSentInvites = (state: ContactsStore) => state.sentInvites;

export const selectReceivedInvites = (state: ContactsStore) =>
  state.receivedInvites;

export const selectPendingReceivedInvites = (state: ContactsStore) =>
  state.receivedInvites.filter((i) => i.status === "pending");

export const selectPendingSentInvites = (state: ContactsStore) =>
  state.sentInvites.filter((i) => i.status === "pending");

export const selectBlockedContacts = (state: ContactsStore) =>
  state.blockedContacts;

export const selectBlockedUserIds = (state: ContactsStore) =>
  state.blockedUserIds;

export const selectDiscoveryResults = (state: ContactsStore) =>
  state.discoveryResults;

export const selectIsLoadingContacts = (state: ContactsStore) =>
  state.isLoadingContacts;

export const selectContactsError = (state: ContactsStore) =>
  state.contactsError;

export const selectSelectedContactId = (state: ContactsStore) =>
  state.selectedContactId;

export const selectSelectedContact = (state: ContactsStore) =>
  state.selectedContactId
    ? state.contactsById.get(state.selectedContactId)
    : undefined;

export const selectFilters = (state: ContactsStore) => state.filters;

export const selectIsInviteModalOpen = (state: ContactsStore) =>
  state.isInviteModalOpen;

export const selectIsBlockModalOpen = (state: ContactsStore) =>
  state.isBlockModalOpen;

export const selectIsQRScannerOpen = (state: ContactsStore) =>
  state.isQRScannerOpen;

export const selectModalTarget = (state: ContactsStore) => state.modalTarget;
