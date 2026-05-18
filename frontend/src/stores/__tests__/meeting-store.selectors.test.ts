/**
 * Tests for meeting-store selectors
 *
 * All selectors are pure functions that receive the store state and return
 * derived data. Tests construct a minimal plain-object state and call each
 * selector directly — no Zustand context needed.
 */

import type { MeetingStore, MeetingState } from "../meeting-store";
import {
  selectActiveMeeting,
  selectActiveHuddle,
  selectMeetingList,
  selectUpcomingMeetings,
  selectPastMeetings,
  selectLiveMeetings,
  selectMeetingsByDate,
  selectMeetingsForChannel,
  selectActiveHuddles,
  selectRoomState,
  selectLocalUser,
  selectRemoteParticipants,
  selectIsInMeeting,
  selectSelectedMeetingCount,
  selectHasFilters,
  selectFilteredMeetings,
} from "../meeting-store";

import type { Meeting, MeetingFilters, Huddle } from "@/lib/meetings/meeting-types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMeeting(overrides?: Partial<Meeting>): Meeting {
  return {
    id: "m1",
    code: "ABC123",
    title: "Test Meeting",
    description: "A test meeting",
    type: "scheduled",
    status: "upcoming",
    hostId: "u1",
    channelId: "c1",
    participantCount: 2,
    scheduledStartAt: "2099-01-15T10:00:00Z",
    scheduledEndAt: "2099-01-15T11:00:00Z",
    createdAt: "2026-01-10T09:00:00Z",
    updatedAt: "2026-01-10T09:00:00Z",
    ...overrides,
  } as Meeting;
}

function makeHuddle(overrides?: Partial<Huddle>): Huddle {
  return {
    id: "h1",
    channelId: "c1",
    status: "active",
    ...overrides,
  } as Huddle;
}

function makeFilters(overrides?: Partial<MeetingFilters>): MeetingFilters {
  return {
    status: [],
    type: [],
    channelId: undefined,
    hostId: undefined,
    search: undefined,
    dateRange: undefined,
    ...overrides,
  } as MeetingFilters;
}

function makeState(overrides?: Partial<MeetingState>): MeetingStore {
  const defaultState: MeetingState = {
    meetings: new Map(),
    meetingsByCode: new Map(),
    activeMeetingId: null,
    activeHuddleId: null,
    huddles: new Map(),
    channelHuddles: new Map(),
    roomState: null,
    filters: makeFilters(),
    sortBy: "scheduledStartAt",
    sortOrder: "asc",
    selectedMeetingIds: new Set(),
    calendarViewDate: new Date("2026-01-01"),
    calendarViewMode: "month",
    isSchedulerOpen: false,
    editingMeetingId: null,
    isJoinModalOpen: false,
    joinMeetingCode: "",
    isLoading: false,
    isLoadingMeeting: null,
    isJoining: false,
    isCreating: false,
    error: null,
    hasMore: false,
    cursor: null,
  };
  return { ...defaultState, ...overrides } as unknown as MeetingStore;
}

// ---------------------------------------------------------------------------
// selectActiveMeeting
// ---------------------------------------------------------------------------

describe("selectActiveMeeting", () => {
  it("returns undefined when no meeting is active", () => {
    expect(selectActiveMeeting(makeState())).toBeUndefined();
  });

  it("returns the active meeting object", () => {
    const m = makeMeeting({ id: "m1" });
    const meetings = new Map([["m1", m]]);
    const state = makeState({ activeMeetingId: "m1", meetings });
    expect(selectActiveMeeting(state)).toBe(m);
  });

  it("returns undefined when activeMeetingId is set but meeting not in map", () => {
    const state = makeState({ activeMeetingId: "missing" });
    expect(selectActiveMeeting(state)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// selectActiveHuddle
// ---------------------------------------------------------------------------

describe("selectActiveHuddle", () => {
  it("returns undefined when no huddle is active", () => {
    expect(selectActiveHuddle(makeState())).toBeUndefined();
  });

  it("returns the active huddle object", () => {
    const h = makeHuddle({ id: "h1" });
    const huddles = new Map([["h1", h]]);
    const state = makeState({ activeHuddleId: "h1", huddles });
    expect(selectActiveHuddle(state)).toBe(h);
  });
});

// ---------------------------------------------------------------------------
// selectMeetingList
// ---------------------------------------------------------------------------

describe("selectMeetingList", () => {
  it("returns empty array when no meetings", () => {
    expect(selectMeetingList(makeState())).toEqual([]);
  });

  it("returns all meetings as an array", () => {
    const m1 = makeMeeting({ id: "m1" });
    const m2 = makeMeeting({ id: "m2" });
    const meetings = new Map([
      ["m1", m1],
      ["m2", m2],
    ]);
    const result = selectMeetingList(makeState({ meetings }));
    expect(result).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// selectUpcomingMeetings
// ---------------------------------------------------------------------------

describe("selectUpcomingMeetings", () => {
  it("returns empty array when no meetings", () => {
    expect(selectUpcomingMeetings(makeState())).toEqual([]);
  });

  it("returns only scheduled meetings in the future", () => {
    const future = makeMeeting({
      id: "m1",
      status: "scheduled",
      scheduledStartAt: "2099-01-15T10:00:00Z",
    });
    const past = makeMeeting({
      id: "m2",
      status: "scheduled",
      scheduledStartAt: "2020-01-15T10:00:00Z",
    });
    const meetings = new Map([
      ["m1", future],
      ["m2", past],
    ]);
    const result = selectUpcomingMeetings(makeState({ meetings }));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("m1");
  });
});

// ---------------------------------------------------------------------------
// selectPastMeetings
// ---------------------------------------------------------------------------

describe("selectPastMeetings", () => {
  it("returns empty array when no meetings", () => {
    expect(selectPastMeetings(makeState())).toEqual([]);
  });

  it("returns meetings with ended status", () => {
    const ended = makeMeeting({
      id: "m1",
      status: "ended",
      scheduledStartAt: "2020-01-10T10:00:00Z",
    });
    const meetings = new Map([["m1", ended]]);
    const result = selectPastMeetings(makeState({ meetings }));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("m1");
  });
});

// ---------------------------------------------------------------------------
// selectLiveMeetings
// ---------------------------------------------------------------------------

describe("selectLiveMeetings", () => {
  it("returns empty array when no meetings", () => {
    expect(selectLiveMeetings(makeState())).toEqual([]);
  });

  it("returns only live meetings", () => {
    const live = makeMeeting({ id: "m1", status: "live" as never });
    const upcoming = makeMeeting({ id: "m2", status: "upcoming" });
    const meetings = new Map([
      ["m1", live],
      ["m2", upcoming],
    ]);
    const result = selectLiveMeetings(makeState({ meetings }));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("m1");
  });
});

// ---------------------------------------------------------------------------
// selectMeetingsByDate
// ---------------------------------------------------------------------------

describe("selectMeetingsByDate", () => {
  it("returns empty array when no meetings match date", () => {
    const selector = selectMeetingsByDate("2026-01-15");
    expect(selector(makeState())).toEqual([]);
  });

  it("returns meetings matching the given date", () => {
    // Use the same ISO timestamp as the meeting's scheduledStartAt so
    // toDateString() comparison is unambiguous regardless of test runner TZ.
    const isoDate = "2026-01-15T10:00:00Z";
    const m1 = makeMeeting({ id: "m1", scheduledStartAt: isoDate });
    const m2 = makeMeeting({
      id: "m2",
      scheduledStartAt: "2026-01-16T10:00:00Z",
    });
    const meetings = new Map([
      ["m1", m1],
      ["m2", m2],
    ]);
    // Pass the same ISO string so the selector's toDateString() values align.
    const selector = selectMeetingsByDate(isoDate);
    const result = selector(makeState({ meetings }));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("m1");
  });
});

// ---------------------------------------------------------------------------
// selectMeetingsForChannel
// ---------------------------------------------------------------------------

describe("selectMeetingsForChannel", () => {
  it("returns empty array when no meetings in channel", () => {
    const selector = selectMeetingsForChannel("c1");
    expect(selector(makeState())).toEqual([]);
  });

  it("returns only meetings for the given channel", () => {
    const m1 = makeMeeting({ id: "m1", channelId: "c1" });
    const m2 = makeMeeting({ id: "m2", channelId: "c2" });
    const meetings = new Map([
      ["m1", m1],
      ["m2", m2],
    ]);
    const selector = selectMeetingsForChannel("c1");
    const result = selector(makeState({ meetings }));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("m1");
  });
});

// ---------------------------------------------------------------------------
// selectActiveHuddles
// ---------------------------------------------------------------------------

describe("selectActiveHuddles", () => {
  it("returns empty array when no huddles", () => {
    expect(selectActiveHuddles(makeState())).toEqual([]);
  });

  it("returns only active huddles", () => {
    const active = makeHuddle({ id: "h1", status: "active" });
    const ended = makeHuddle({ id: "h2", status: "ended" as never });
    const huddles = new Map([
      ["h1", active],
      ["h2", ended],
    ]);
    const result = selectActiveHuddles(makeState({ huddles }));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("h1");
  });
});

// ---------------------------------------------------------------------------
// selectRoomState
// ---------------------------------------------------------------------------

describe("selectRoomState", () => {
  it("returns null when not in a room", () => {
    expect(selectRoomState(makeState())).toBeNull();
  });

  it("returns room state when present", () => {
    const roomState = { localUser: { userId: "u1" } } as never;
    expect(selectRoomState(makeState({ roomState }))).toBe(roomState);
  });
});

// ---------------------------------------------------------------------------
// selectLocalUser
// ---------------------------------------------------------------------------

describe("selectLocalUser", () => {
  it("returns undefined when room state is null", () => {
    expect(selectLocalUser(makeState())).toBeUndefined();
  });

  it("returns local user from room state", () => {
    const localUser = { userId: "u1", displayName: "Alice" } as never;
    const roomState = { localUser } as never;
    expect(selectLocalUser(makeState({ roomState }))).toBe(localUser);
  });
});

// ---------------------------------------------------------------------------
// selectRemoteParticipants
// ---------------------------------------------------------------------------

describe("selectRemoteParticipants", () => {
  it("returns empty array when room state is null", () => {
    expect(selectRemoteParticipants(makeState())).toEqual([]);
  });

  it("returns remote participants from room state", () => {
    const remoteParticipants = [
      { userId: "u2" },
      { userId: "u3" },
    ] as never[];
    const roomState = { remoteParticipants } as never;
    expect(selectRemoteParticipants(makeState({ roomState }))).toBe(
      remoteParticipants,
    );
  });

  it("returns empty array when remoteParticipants is undefined in room state", () => {
    const roomState = { remoteParticipants: undefined } as never;
    expect(selectRemoteParticipants(makeState({ roomState }))).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// selectIsInMeeting
// ---------------------------------------------------------------------------

describe("selectIsInMeeting", () => {
  it("returns false when both activeMeetingId and activeHuddleId are null", () => {
    expect(selectIsInMeeting(makeState())).toBe(false);
  });

  it("returns true when activeMeetingId is set", () => {
    expect(selectIsInMeeting(makeState({ activeMeetingId: "m1" }))).toBe(true);
  });

  it("returns true when activeHuddleId is set", () => {
    expect(selectIsInMeeting(makeState({ activeHuddleId: "h1" }))).toBe(true);
  });

  it("returns true when both are set", () => {
    expect(
      selectIsInMeeting(
        makeState({ activeMeetingId: "m1", activeHuddleId: "h1" }),
      ),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectSelectedMeetingCount
// ---------------------------------------------------------------------------

describe("selectSelectedMeetingCount", () => {
  it("returns 0 when no meetings are selected", () => {
    expect(selectSelectedMeetingCount(makeState())).toBe(0);
  });

  it("returns the number of selected meetings", () => {
    const selectedMeetingIds = new Set(["m1", "m2", "m3"]);
    expect(
      selectSelectedMeetingCount(makeState({ selectedMeetingIds })),
    ).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// selectHasFilters
// ---------------------------------------------------------------------------

describe("selectHasFilters", () => {
  it("returns false when no filters are set", () => {
    expect(selectHasFilters(makeState())).toBe(false);
  });

  it("returns false when filters have empty arrays", () => {
    const filters = makeFilters({ status: [], type: [] });
    expect(selectHasFilters(makeState({ filters }))).toBe(false);
  });

  it("returns true when status filter has values", () => {
    const filters = makeFilters({ status: ["upcoming"] as never[] });
    expect(selectHasFilters(makeState({ filters }))).toBe(true);
  });

  it("returns true when type filter has values", () => {
    const filters = makeFilters({ type: ["scheduled"] as never[] });
    expect(selectHasFilters(makeState({ filters }))).toBe(true);
  });

  it("returns true when channelId filter is set", () => {
    const filters = makeFilters({ channelId: "c1" });
    expect(selectHasFilters(makeState({ filters }))).toBe(true);
  });

  it("returns true when hostId filter is set", () => {
    const filters = makeFilters({ hostId: "u1" });
    expect(selectHasFilters(makeState({ filters }))).toBe(true);
  });

  it("returns true when search filter is set", () => {
    const filters = makeFilters({ search: "standup" });
    expect(selectHasFilters(makeState({ filters }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectFilteredMeetings
// ---------------------------------------------------------------------------

describe("selectFilteredMeetings", () => {
  it("returns empty array when no meetings exist", () => {
    expect(selectFilteredMeetings(makeState())).toEqual([]);
  });

  it("returns all meetings when no filters are active", () => {
    const m1 = makeMeeting({ id: "m1", title: "Alpha" });
    const m2 = makeMeeting({ id: "m2", title: "Beta" });
    const meetings = new Map([
      ["m1", m1],
      ["m2", m2],
    ]);
    const result = selectFilteredMeetings(makeState({ meetings }));
    expect(result).toHaveLength(2);
  });

  it("filters by status", () => {
    const m1 = makeMeeting({ id: "m1", status: "upcoming" });
    const m2 = makeMeeting({ id: "m2", status: "ended" as never });
    const meetings = new Map([
      ["m1", m1],
      ["m2", m2],
    ]);
    const filters = makeFilters({ status: ["upcoming"] as never[] });
    const result = selectFilteredMeetings(makeState({ meetings, filters }));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("m1");
  });

  it("filters by channelId", () => {
    const m1 = makeMeeting({ id: "m1", channelId: "c1" });
    const m2 = makeMeeting({ id: "m2", channelId: "c2" });
    const meetings = new Map([
      ["m1", m1],
      ["m2", m2],
    ]);
    const filters = makeFilters({ channelId: "c1" });
    const result = selectFilteredMeetings(makeState({ meetings, filters }));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("m1");
  });

  it("filters by hostId", () => {
    const m1 = makeMeeting({ id: "m1", hostId: "u1" });
    const m2 = makeMeeting({ id: "m2", hostId: "u2" });
    const meetings = new Map([
      ["m1", m1],
      ["m2", m2],
    ]);
    const filters = makeFilters({ hostId: "u1" });
    const result = selectFilteredMeetings(makeState({ meetings, filters }));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("m1");
  });

  it("filters by search term in title", () => {
    const m1 = makeMeeting({ id: "m1", title: "Daily Standup" });
    const m2 = makeMeeting({ id: "m2", title: "Sprint Review" });
    const meetings = new Map([
      ["m1", m1],
      ["m2", m2],
    ]);
    const filters = makeFilters({ search: "standup" });
    const result = selectFilteredMeetings(makeState({ meetings, filters }));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("m1");
  });

  it("filters by search term in description", () => {
    const m1 = makeMeeting({
      id: "m1",
      title: "Meeting A",
      description: "planning session",
    });
    const m2 = makeMeeting({
      id: "m2",
      title: "Meeting B",
      description: "review items",
    });
    const meetings = new Map([
      ["m1", m1],
      ["m2", m2],
    ]);
    const filters = makeFilters({ search: "planning" });
    const result = selectFilteredMeetings(makeState({ meetings, filters }));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("m1");
  });

  it("filters by date range", () => {
    const m1 = makeMeeting({
      id: "m1",
      scheduledStartAt: "2026-01-15T10:00:00Z",
    });
    const m2 = makeMeeting({
      id: "m2",
      scheduledStartAt: "2026-02-15T10:00:00Z",
    });
    const meetings = new Map([
      ["m1", m1],
      ["m2", m2],
    ]);
    const filters = makeFilters({
      dateRange: {
        start: "2026-01-01T00:00:00Z",
        end: "2026-01-31T23:59:59Z",
      } as never,
    });
    const result = selectFilteredMeetings(makeState({ meetings, filters }));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("m1");
  });

  it("sorts by title ascending", () => {
    const m1 = makeMeeting({ id: "m1", title: "Zebra" });
    const m2 = makeMeeting({ id: "m2", title: "Apple" });
    const meetings = new Map([
      ["m1", m1],
      ["m2", m2],
    ]);
    const result = selectFilteredMeetings(
      makeState({ meetings, sortBy: "title", sortOrder: "asc" }),
    );
    expect(result[0].id).toBe("m2");
    expect(result[1].id).toBe("m1");
  });

  it("sorts by title descending", () => {
    const m1 = makeMeeting({ id: "m1", title: "Zebra" });
    const m2 = makeMeeting({ id: "m2", title: "Apple" });
    const meetings = new Map([
      ["m1", m1],
      ["m2", m2],
    ]);
    const result = selectFilteredMeetings(
      makeState({ meetings, sortBy: "title", sortOrder: "desc" }),
    );
    expect(result[0].id).toBe("m1");
    expect(result[1].id).toBe("m2");
  });

  it("sorts by participantCount ascending", () => {
    const m1 = makeMeeting({ id: "m1", participantCount: 5 });
    const m2 = makeMeeting({ id: "m2", participantCount: 2 });
    const meetings = new Map([
      ["m1", m1],
      ["m2", m2],
    ]);
    const result = selectFilteredMeetings(
      makeState({ meetings, sortBy: "participantCount", sortOrder: "asc" }),
    );
    expect(result[0].id).toBe("m2");
    expect(result[1].id).toBe("m1");
  });

  it("sorts by createdAt ascending", () => {
    const m1 = makeMeeting({ id: "m1", createdAt: "2026-01-20T00:00:00Z" });
    const m2 = makeMeeting({ id: "m2", createdAt: "2026-01-10T00:00:00Z" });
    const meetings = new Map([
      ["m1", m1],
      ["m2", m2],
    ]);
    const result = selectFilteredMeetings(
      makeState({ meetings, sortBy: "createdAt", sortOrder: "asc" }),
    );
    expect(result[0].id).toBe("m2");
    expect(result[1].id).toBe("m1");
  });
});
