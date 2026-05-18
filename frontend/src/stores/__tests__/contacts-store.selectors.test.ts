/**
 * Tests for contacts-store selectors
 *
 * All selectors are pure functions that receive the store state.
 * Tests construct minimal plain-object state and call selectors directly.
 */

import type { ContactsStore, ContactsState, ContactWithUser, ContactInviteWithUsers, ContactFilters } from "../contacts-store";
import {
  selectContacts,
  selectContactsCount,
  selectFavoriteContacts,
  selectSentInvites,
  selectReceivedInvites,
  selectPendingReceivedInvites,
  selectPendingSentInvites,
  selectBlockedContacts,
  selectBlockedUserIds,
  selectDiscoveryResults,
  selectIsLoadingContacts,
  selectContactsError,
  selectSelectedContactId,
  selectSelectedContact,
  selectFilters,
  selectIsInviteModalOpen,
  selectIsBlockModalOpen,
  selectIsQRScannerOpen,
  selectModalTarget,
} from "../contacts-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeContact(overrides?: Partial<ContactWithUser>): ContactWithUser {
  return {
    id: "c1",
    userId: "u1",
    contactUserId: "u2",
    isFavorite: false,
    relationship: "friend" as never,
    status: "active" as never,
    addedAt: "2026-01-01T00:00:00Z",
    user: { id: "u2", displayName: "Alice", username: "alice", avatarUrl: null },
    ...overrides,
  } as ContactWithUser;
}

function makeInvite(overrides?: Partial<ContactInviteWithUsers>): ContactInviteWithUsers {
  return {
    id: "inv1",
    senderId: "u1",
    recipientId: "u2",
    status: "pending" as const,
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  } as ContactInviteWithUsers;
}

function makeFilters(overrides?: Partial<ContactFilters>): ContactFilters {
  return {
    search: "",
    favorites: false,
    ...overrides,
  };
}

function makeState(overrides?: Partial<ContactsState>): ContactsStore {
  const defaultState: ContactsState = {
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
    filters: makeFilters(),
    sortField: "displayName",
    sortOrder: "asc",
    isInviteModalOpen: false,
    isBlockModalOpen: false,
    isQRScannerOpen: false,
    modalTarget: null,
  };
  return { ...defaultState, ...overrides } as unknown as ContactsStore;
}

// ---------------------------------------------------------------------------
// selectContacts
// ---------------------------------------------------------------------------

describe("selectContacts", () => {
  it("returns empty array when no contacts", () => {
    expect(selectContacts(makeState())).toEqual([]);
  });

  it("returns all contacts", () => {
    const c1 = makeContact({ id: "c1" });
    const c2 = makeContact({ id: "c2" });
    expect(selectContacts(makeState({ contacts: [c1, c2] }))).toEqual([c1, c2]);
  });
});

// ---------------------------------------------------------------------------
// selectContactsCount
// ---------------------------------------------------------------------------

describe("selectContactsCount", () => {
  it("returns 0 when no contacts", () => {
    expect(selectContactsCount(makeState())).toBe(0);
  });

  it("returns length of contacts array", () => {
    const contacts = [makeContact({ id: "c1" }), makeContact({ id: "c2" }), makeContact({ id: "c3" })];
    expect(selectContactsCount(makeState({ contacts }))).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// selectFavoriteContacts
// ---------------------------------------------------------------------------

describe("selectFavoriteContacts", () => {
  it("returns empty array when no contacts", () => {
    expect(selectFavoriteContacts(makeState())).toEqual([]);
  });

  it("returns only favorite contacts", () => {
    const fav = makeContact({ id: "c1", isFavorite: true });
    const nonFav = makeContact({ id: "c2", isFavorite: false });
    const result = selectFavoriteContacts(makeState({ contacts: [fav, nonFav] }));
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(fav);
  });

  it("returns empty array when none are favorites", () => {
    const contacts = [makeContact({ isFavorite: false }), makeContact({ id: "c2", isFavorite: false })];
    expect(selectFavoriteContacts(makeState({ contacts }))).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// selectSentInvites
// ---------------------------------------------------------------------------

describe("selectSentInvites", () => {
  it("returns empty array when no sent invites", () => {
    expect(selectSentInvites(makeState())).toEqual([]);
  });

  it("returns sent invites", () => {
    const invite = makeInvite({ id: "inv1" });
    expect(selectSentInvites(makeState({ sentInvites: [invite] }))).toEqual([invite]);
  });
});

// ---------------------------------------------------------------------------
// selectReceivedInvites
// ---------------------------------------------------------------------------

describe("selectReceivedInvites", () => {
  it("returns empty array when no received invites", () => {
    expect(selectReceivedInvites(makeState())).toEqual([]);
  });

  it("returns received invites", () => {
    const invite = makeInvite({ id: "inv2" });
    expect(selectReceivedInvites(makeState({ receivedInvites: [invite] }))).toEqual([invite]);
  });
});

// ---------------------------------------------------------------------------
// selectPendingReceivedInvites
// ---------------------------------------------------------------------------

describe("selectPendingReceivedInvites", () => {
  it("returns empty array when no received invites", () => {
    expect(selectPendingReceivedInvites(makeState())).toEqual([]);
  });

  it("returns only pending received invites", () => {
    const pending = makeInvite({ id: "inv1", status: "pending" as never });
    const accepted = makeInvite({ id: "inv2", status: "accepted" as never });
    const declined = makeInvite({ id: "inv3", status: "declined" as never });
    const result = selectPendingReceivedInvites(
      makeState({ receivedInvites: [pending, accepted, declined] }),
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(pending);
  });
});

// ---------------------------------------------------------------------------
// selectPendingSentInvites
// ---------------------------------------------------------------------------

describe("selectPendingSentInvites", () => {
  it("returns empty array when no sent invites", () => {
    expect(selectPendingSentInvites(makeState())).toEqual([]);
  });

  it("returns only pending sent invites", () => {
    const pending = makeInvite({ id: "inv1", status: "pending" as never });
    const accepted = makeInvite({ id: "inv2", status: "accepted" as never });
    const result = selectPendingSentInvites(
      makeState({ sentInvites: [pending, accepted] }),
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(pending);
  });
});

// ---------------------------------------------------------------------------
// selectBlockedContacts
// ---------------------------------------------------------------------------

describe("selectBlockedContacts", () => {
  it("returns empty array when no blocked contacts", () => {
    expect(selectBlockedContacts(makeState())).toEqual([]);
  });

  it("returns blocked contacts array", () => {
    const blocked = [{ id: "b1", blockedUserId: "u3" }] as never[];
    expect(selectBlockedContacts(makeState({ blockedContacts: blocked }))).toBe(blocked);
  });
});

// ---------------------------------------------------------------------------
// selectBlockedUserIds
// ---------------------------------------------------------------------------

describe("selectBlockedUserIds", () => {
  it("returns empty set when no blocked users", () => {
    const result = selectBlockedUserIds(makeState());
    expect(result.size).toBe(0);
  });

  it("returns the blocked user ids set", () => {
    const blockedUserIds = new Set(["u3", "u4"]);
    const result = selectBlockedUserIds(makeState({ blockedUserIds }));
    expect(result).toBe(blockedUserIds);
    expect(result.has("u3")).toBe(true);
    expect(result.has("u4")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectDiscoveryResults
// ---------------------------------------------------------------------------

describe("selectDiscoveryResults", () => {
  it("returns empty array when no results", () => {
    expect(selectDiscoveryResults(makeState())).toEqual([]);
  });

  it("returns discovery results", () => {
    const results = [{ userId: "u5", displayName: "Bob" }] as never[];
    expect(selectDiscoveryResults(makeState({ discoveryResults: results }))).toBe(results);
  });
});

// ---------------------------------------------------------------------------
// selectIsLoadingContacts
// ---------------------------------------------------------------------------

describe("selectIsLoadingContacts", () => {
  it("returns false when not loading", () => {
    expect(selectIsLoadingContacts(makeState())).toBe(false);
  });

  it("returns true when loading", () => {
    expect(selectIsLoadingContacts(makeState({ isLoadingContacts: true }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectContactsError
// ---------------------------------------------------------------------------

describe("selectContactsError", () => {
  it("returns null when no error", () => {
    expect(selectContactsError(makeState())).toBeNull();
  });

  it("returns the error string", () => {
    expect(selectContactsError(makeState({ contactsError: "Network error" }))).toBe("Network error");
  });
});

// ---------------------------------------------------------------------------
// selectSelectedContactId
// ---------------------------------------------------------------------------

describe("selectSelectedContactId", () => {
  it("returns null when no contact is selected", () => {
    expect(selectSelectedContactId(makeState())).toBeNull();
  });

  it("returns the selected contact id", () => {
    expect(selectSelectedContactId(makeState({ selectedContactId: "c1" }))).toBe("c1");
  });
});

// ---------------------------------------------------------------------------
// selectSelectedContact
// ---------------------------------------------------------------------------

describe("selectSelectedContact", () => {
  it("returns undefined when selectedContactId is null", () => {
    expect(selectSelectedContact(makeState())).toBeUndefined();
  });

  it("returns the selected contact from contactsById", () => {
    const contact = makeContact({ id: "c1" });
    const contactsById = new Map([["c1", contact]]);
    const state = makeState({ selectedContactId: "c1", contactsById });
    expect(selectSelectedContact(state)).toBe(contact);
  });

  it("returns undefined when selectedContactId is set but not in map", () => {
    const state = makeState({ selectedContactId: "missing", contactsById: new Map() });
    expect(selectSelectedContact(state)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// selectFilters
// ---------------------------------------------------------------------------

describe("selectFilters", () => {
  it("returns default filters", () => {
    const result = selectFilters(makeState());
    expect(result.search).toBe("");
    expect(result.favorites).toBe(false);
  });

  it("returns custom filters", () => {
    const filters = makeFilters({ search: "alice", favorites: true });
    expect(selectFilters(makeState({ filters }))).toBe(filters);
  });
});

// ---------------------------------------------------------------------------
// selectIsInviteModalOpen
// ---------------------------------------------------------------------------

describe("selectIsInviteModalOpen", () => {
  it("returns false when modal is closed", () => {
    expect(selectIsInviteModalOpen(makeState())).toBe(false);
  });

  it("returns true when modal is open", () => {
    expect(selectIsInviteModalOpen(makeState({ isInviteModalOpen: true }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectIsBlockModalOpen
// ---------------------------------------------------------------------------

describe("selectIsBlockModalOpen", () => {
  it("returns false when modal is closed", () => {
    expect(selectIsBlockModalOpen(makeState())).toBe(false);
  });

  it("returns true when modal is open", () => {
    expect(selectIsBlockModalOpen(makeState({ isBlockModalOpen: true }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectIsQRScannerOpen
// ---------------------------------------------------------------------------

describe("selectIsQRScannerOpen", () => {
  it("returns false when scanner is closed", () => {
    expect(selectIsQRScannerOpen(makeState())).toBe(false);
  });

  it("returns true when scanner is open", () => {
    expect(selectIsQRScannerOpen(makeState({ isQRScannerOpen: true }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectModalTarget
// ---------------------------------------------------------------------------

describe("selectModalTarget", () => {
  it("returns null when no modal target", () => {
    expect(selectModalTarget(makeState())).toBeNull();
  });

  it("returns the modal target user", () => {
    const target = { id: "u2", displayName: "Alice", username: "alice", avatarUrl: null } as never;
    expect(selectModalTarget(makeState({ modalTarget: target }))).toBe(target);
  });
});
