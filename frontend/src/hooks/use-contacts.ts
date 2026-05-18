/**
 * useContacts Hook - Complete contacts management for nself-chat
 *
 * Provides methods for contact management, discovery, invites, and blocking
 */

import { useCallback, useEffect, useState } from "react";
import {
  useContactsStore,
  type ContactWithUser,
  type ContactInviteWithUsers,
} from "@/stores/contacts-store";
import {
  type Contact,
  type ContactInvite,
  type BlockedContact,
  type ContactDiscoveryMethod,
  type DiscoveryResult,
  type ContactUser,
  generateInviteCode,
  generateQRCodeData,
  verifyQRCodeData,
  parseQRCodeData,
  buildInviteLink,
  DEFAULT_INVITE_EXPIRY_MS,
} from "@/services/contacts/contact.service";
import { useAuth } from "@/contexts/auth-context";

// ============================================================================
// Types
// ============================================================================

export interface UseContactsOptions {
  autoFetch?: boolean;
}

export interface AddContactOptions {
  nickname?: string;
  notes?: string;
  discoveryMethod?: ContactDiscoveryMethod;
}

export interface SendInviteOptions {
  recipientId?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  message?: string;
  expiresInMs?: number;
}

export interface UseContactsReturn {
  // State
  contacts: ContactWithUser[];
  filteredContacts: ContactWithUser[];
  sentInvites: ContactInviteWithUsers[];
  receivedInvites: ContactInviteWithUsers[];
  blockedContacts: BlockedContact[];
  discoveryResults: DiscoveryResult[];

  // Loading states
  isLoading: boolean;
  isDiscovering: boolean;
  isSyncing: boolean;

  // Errors
  error: string | null;
  discoveryError: string | null;

  // Counts
  contactsCount: number;
  pendingInvitesCount: number;
  blockedCount: number;

  // Contact operations
  addContact: (
    userId: string,
    user: ContactUser,
    options?: AddContactOptions,
  ) => Promise<void>;
  removeContact: (contactId: string) => Promise<void>;
  updateContact: (
    contactId: string,
    updates: Partial<Contact>,
  ) => Promise<void>;
  toggleFavorite: (contactId: string) => Promise<void>;
  isContact: (userId: string) => boolean;
  getContact: (userId: string) => ContactWithUser | undefined;

  // Invite operations
  sendInvite: (options: SendInviteOptions) => Promise<ContactInvite>;
  acceptInvite: (inviteId: string) => Promise<void>;
  rejectInvite: (inviteId: string) => Promise<void>;
  cancelInvite: (inviteId: string) => Promise<void>;
  getInviteLink: (inviteCode: string) => string;

  // QR code operations
  generateQRCode: () => string;
  scanQRCode: (qrData: string) => Promise<ContactUser | null>;

  // Block operations
  blockUser: (userId: string, reason?: string) => Promise<void>;
  unblockUser: (userId: string) => Promise<void>;
  isBlocked: (userId: string) => boolean;

  // Discovery operations
  discoverUsers: (
    query: string,
    method?: ContactDiscoveryMethod,
  ) => Promise<DiscoveryResult[]>;
  clearDiscoveryResults: () => void;

  // Sync operations
  syncFromDevice: (
    contacts: Array<{ name: string; phoneNumbers: string[]; emails: string[] }>,
  ) => Promise<void>;

  // Relationship status
  getRelationshipStatus: (userId: string) => string;

  // Filter/Sort
  setSearchFilter: (query: string) => void;
  setFavoritesFilter: (enabled: boolean) => void;
  resetFilters: () => void;

  // Refresh
  refresh: () => Promise<void>;
}

// ============================================================================
// Hook
// ============================================================================

export function useContacts(
  options: UseContactsOptions = {},
): UseContactsReturn {
  const { autoFetch = true } = options;
  const { user } = useAuth();
  const userId = user?.id;

  // Local state for QR secret
  const [qrSecret] = useState(() => Math.random().toString(36).substring(2));

  // Store state and actions
  const store = useContactsStore();

  // Fetch contacts on mount
  useEffect(() => {
    if (autoFetch && userId) {
      fetchContacts();
      fetchInvites();
      fetchBlocked();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFetch, userId]);

  // ============================================================================
  // API Calls
  // ============================================================================

  const fetchContacts = useCallback(async () => {
    if (!userId) return;

    store.setLoadingContacts(true);
    store.setContactsError(null);

    try {
      const response = await fetch(`/api/contacts?userId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch contacts");

      const data = await response.json();
      store.setContacts(data.contacts);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch contacts";
      store.setContactsError(message);
    } finally {
      store.setLoadingContacts(false);
    }
  }, [userId, store]);

  const fetchInvites = useCallback(async () => {
    if (!userId) return;

    store.setLoadingInvites(true);
    store.setInvitesError(null);

    try {
      // Fetch sent invites
      const sentResponse = await fetch(
        `/api/contacts/invites?userId=${userId}&type=sent`,
      );
      if (sentResponse.ok) {
        const sentData = await sentResponse.json();
        store.setSentInvites(sentData.invites);
      }

      // Fetch received invites
      const receivedResponse = await fetch(
        `/api/contacts/invites?userId=${userId}&type=received`,
      );
      if (receivedResponse.ok) {
        const receivedData = await receivedResponse.json();
        store.setReceivedInvites(receivedData.invites);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch invites";
      store.setInvitesError(message);
    } finally {
      store.setLoadingInvites(false);
    }
  }, [userId, store]);

  const fetchBlocked = useCallback(async () => {
    if (!userId) return;

    store.setLoadingBlocked(true);
    store.setBlockedError(null);

    try {
      const response = await fetch(`/api/contacts/blocked?userId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch blocked users");

      const data = await response.json();
      store.setBlockedContacts(data.blocked);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch blocked users";
      store.setBlockedError(message);
    } finally {
      store.setLoadingBlocked(false);
    }
  }, [userId, store]);

  // ============================================================================
  // Contact Operations
  // ============================================================================

  const addContact = useCallback(
    async (
      contactUserId: string,
      contactUser: ContactUser,
      opts: AddContactOptions = {},
    ) => {
      if (!userId) throw new Error("Not authenticated");

      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          contactUserId,
          discoveryMethod: opts.discoveryMethod || "username",
          nickname: opts.nickname,
          notes: opts.notes,
          contactUser,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add contact");
      }

      const data = await response.json();
      store.addContact(data.contact);
    },
    [userId, store],
  );

  const removeContact = useCallback(
    async (contactId: string) => {
      if (!userId) throw new Error("Not authenticated");

      const response = await fetch(
        `/api/contacts?userId=${userId}&contactId=${contactId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to remove contact");
      }

      store.removeContact(contactId);
    },
    [userId, store],
  );

  const updateContact = useCallback(
    async (contactId: string, updates: Partial<Contact>) => {
      if (!userId) throw new Error("Not authenticated");

      const response = await fetch("/api/contacts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          contactId,
          ...updates,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update contact");
      }

      store.updateContact(contactId, updates);
    },
    [userId, store],
  );

  const toggleFavorite = useCallback(
    async (contactId: string) => {
      const contact = store.getContactById(contactId);
      if (!contact) throw new Error("Contact not found");

      await updateContact(contactId, { isFavorite: !contact.isFavorite });
    },
    [store, updateContact],
  );

  const isContact = useCallback(
    (targetUserId: string) => {
      return store.contacts.some((c) => c.contactUserId === targetUserId);
    },
    [store.contacts],
  );

  const getContact = useCallback(
    (targetUserId: string) => {
      return store.contacts.find((c) => c.contactUserId === targetUserId);
    },
    [store.contacts],
  );

  // ============================================================================
  // Invite Operations
  // ============================================================================

  const sendInvite = useCallback(
    async (opts: SendInviteOptions) => {
      if (!userId) throw new Error("Not authenticated");

      const response = await fetch("/api/contacts/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: userId,
          recipientId: opts.recipientId,
          recipientEmail: opts.recipientEmail,
          recipientPhone: opts.recipientPhone,
          message: opts.message,
          expiresInMs: opts.expiresInMs || DEFAULT_INVITE_EXPIRY_MS,
          senderInfo: {
            id: userId,
            username: user?.username || "unknown",
            displayName: user?.displayName || "Unknown",
            avatarUrl: user?.avatarUrl,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send invite");
      }

      const data = await response.json();
      store.addSentInvite(data.invite);
      return data.invite;
    },
    [userId, user, store],
  );

  const acceptInvite = useCallback(
    async (inviteId: string) => {
      if (!userId) throw new Error("Not authenticated");

      const response = await fetch("/api/contacts/invites", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteId,
          userId,
          action: "accept",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to accept invite");
      }

      const data = await response.json();

      // Update invite status
      store.updateInviteStatus(inviteId, "accepted");

      // Add sender as contact
      if (data.invite.sender) {
        await addContact(data.invite.senderId, data.invite.sender, {
          discoveryMethod: "invite_link",
        });
      }
    },
    [userId, store, addContact],
  );

  const rejectInvite = useCallback(
    async (inviteId: string) => {
      if (!userId) throw new Error("Not authenticated");

      const response = await fetch("/api/contacts/invites", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteId,
          userId,
          action: "reject",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to reject invite");
      }

      store.updateInviteStatus(inviteId, "rejected");
    },
    [userId, store],
  );

  const cancelInvite = useCallback(
    async (inviteId: string) => {
      if (!userId) throw new Error("Not authenticated");

      const response = await fetch("/api/contacts/invites", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteId,
          userId,
          action: "cancel",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to cancel invite");
      }

      store.updateInviteStatus(inviteId, "cancelled");
    },
    [userId, store],
  );

  const getInviteLink = useCallback((inviteCode: string) => {
    return buildInviteLink(inviteCode);
  }, []);

  // ============================================================================
  // QR Code Operations
  // ============================================================================

  const generateQRCode = useCallback(() => {
    if (!userId || !user) throw new Error("Not authenticated");

    const qrData = generateQRCodeData(
      userId,
      user.username || "unknown",
      user.displayName || "Unknown User",
      qrSecret,
    );

    return JSON.stringify(qrData);
  }, [userId, user, qrSecret]);

  const scanQRCode = useCallback(
    async (qrString: string): Promise<ContactUser | null> => {
      const qrData = parseQRCodeData(qrString);
      if (!qrData) {
        throw new Error("Invalid QR code format");
      }

      // Note: In real implementation, we'd verify against the server
      // Here we're just doing basic expiry check
      if (Date.now() > qrData.expiresAt) {
        throw new Error("QR code has expired");
      }

      return {
        id: qrData.userId,
        username: qrData.username,
        displayName: qrData.displayName,
      };
    },
    [],
  );

  // ============================================================================
  // Block Operations
  // ============================================================================

  const blockUser = useCallback(
    async (targetUserId: string, reason?: string) => {
      if (!userId) throw new Error("Not authenticated");

      const response = await fetch("/api/contacts/blocked", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          blockedUserId: targetUserId,
          reason,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to block user");
      }

      const data = await response.json();
      store.addBlockedContact(data.block);

      // Remove from contacts if exists
      const contact = getContact(targetUserId);
      if (contact) {
        store.removeContact(contact.id);
      }
    },
    [userId, store, getContact],
  );

  const unblockUser = useCallback(
    async (targetUserId: string) => {
      if (!userId) throw new Error("Not authenticated");

      const response = await fetch(
        `/api/contacts/blocked?userId=${userId}&blockedUserId=${targetUserId}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to unblock user");
      }

      store.removeBlockedContact(targetUserId);
    },
    [userId, store],
  );

  const isBlocked = useCallback(
    (targetUserId: string) => {
      return store.isUserBlocked(targetUserId);
    },
    [store],
  );

  // ============================================================================
  // Discovery Operations
  // ============================================================================

  const discoverUsers = useCallback(
    async (
      query: string,
      method: ContactDiscoveryMethod = "username",
    ): Promise<DiscoveryResult[]> => {
      if (!userId) throw new Error("Not authenticated");

      store.setIsDiscovering(true);
      store.setDiscoveryError(null);

      try {
        const response = await fetch(
          `/api/contacts/discover?userId=${userId}&query=${encodeURIComponent(query)}&method=${method}`,
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Discovery failed");
        }

        const data = await response.json();
        store.setDiscoveryResults(data.results);
        return data.results;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Discovery failed";
        store.setDiscoveryError(message);
        throw err;
      } finally {
        store.setIsDiscovering(false);
      }
    },
    [userId, store],
  );

  const clearDiscoveryResults = useCallback(() => {
    store.clearDiscoveryResults();
  }, [store]);

  // ============================================================================
  // Sync Operations
  // ============================================================================

  const syncFromDevice = useCallback(
    async (
      deviceContacts: Array<{
        name: string;
        phoneNumbers: string[];
        emails: string[];
      }>,
    ) => {
      if (!userId) throw new Error("Not authenticated");

      store.setIsSyncing(true);
      store.setSyncError(null);

      try {
        const response = await fetch("/api/contacts/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            contacts: deviceContacts,
            existingContactUserIds: store.contacts.map((c) => c.contactUserId),
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Sync failed");
        }

        const data = await response.json();

        // Add matched contacts
        for (const match of data.matched) {
          await addContact(
            match.userId,
            {
              id: match.userId,
              username: match.username,
              displayName: match.displayName,
              avatarUrl: match.avatarUrl,
            },
            {
              discoveryMethod: match.matchedBy === "phone" ? "phone" : "email",
            },
          );
        }

        store.setLastSyncedAt(new Date());
      } catch (err) {
        const message = err instanceof Error ? err.message : "Sync failed";
        store.setSyncError(message);
        throw err;
      } finally {
        store.setIsSyncing(false);
      }
    },
    [userId, store, addContact],
  );

  // ============================================================================
  // Relationship Status
  // ============================================================================

  const getRelationshipStatus = useCallback(
    (targetUserId: string) => {
      return store.getRelationshipStatus(targetUserId);
    },
    [store],
  );

  // ============================================================================
  // Filters
  // ============================================================================

  const setSearchFilter = useCallback(
    (query: string) => {
      store.setFilters({ search: query });
    },
    [store],
  );

  const setFavoritesFilter = useCallback(
    (enabled: boolean) => {
      store.setFilters({ favorites: enabled });
    },
    [store],
  );

  const resetFilters = useCallback(() => {
    store.resetFilters();
  }, [store]);

  // ============================================================================
  // Refresh
  // ============================================================================

  const refresh = useCallback(async () => {
    await Promise.all([fetchContacts(), fetchInvites(), fetchBlocked()]);
  }, [fetchContacts, fetchInvites, fetchBlocked]);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // State
    contacts: store.contacts,
    filteredContacts: store.getFilteredContacts(),
    sentInvites: store.sentInvites,
    receivedInvites: store.receivedInvites,
    blockedContacts: store.blockedContacts,
    discoveryResults: store.discoveryResults,

    // Loading states
    isLoading:
      store.isLoadingContacts ||
      store.isLoadingInvites ||
      store.isLoadingBlocked,
    isDiscovering: store.isDiscovering,
    isSyncing: store.isSyncing,

    // Errors
    error: store.contactsError || store.invitesError || store.blockedError,
    discoveryError: store.discoveryError,

    // Counts
    contactsCount: store.contacts.length,
    pendingInvitesCount: store.getPendingInviteCount(),
    blockedCount: store.blockedContacts.length,

    // Contact operations
    addContact,
    removeContact,
    updateContact,
    toggleFavorite,
    isContact,
    getContact,

    // Invite operations
    sendInvite,
    acceptInvite,
    rejectInvite,
    cancelInvite,
    getInviteLink,

    // QR code operations
    generateQRCode,
    scanQRCode,

    // Block operations
    blockUser,
    unblockUser,
    isBlocked,

    // Discovery operations
    discoverUsers,
    clearDiscoveryResults,

    // Sync operations
    syncFromDevice,

    // Relationship status
    getRelationshipStatus,

    // Filters
    setSearchFilter,
    setFavoritesFilter,
    resetFilters,

    // Refresh
    refresh,
  };
}

export default useContacts;
