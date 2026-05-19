/**
 * Tests for poll-store selectors
 *
 * All selectors are pure functions that receive the store state.
 * Tests construct minimal plain-object state and call selectors directly.
 */

import type { PollStore, PollCreatorState, PollSettings } from "../poll-store";
import {
  selectPoll,
  selectPollsByChannel,
  selectUserVotes,
  selectHasUserVoted,
  selectIsLoadingPoll,
  selectIsVotingPoll,
  selectCreatorState,
  selectIsCreatorOpen,
  selectViewingResultsFor,
  selectViewingVotersFor,
} from "../poll-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const defaultSettings: PollSettings = {
  allowMultipleVotes: false,
  isAnonymous: false,
  allowAddOptions: false,
  showResultsBeforeVoting: false,
};

const defaultCreator: PollCreatorState = {
  isOpen: false,
  channelId: null,
  question: "",
  options: [],
  settings: defaultSettings,
  endsAt: null,
  step: "create",
};

function makeState(overrides?: Partial<Record<string, unknown>>): PollStore {
  const defaultState = {
    polls: new Map<string, never>(),
    pollsByChannel: new Map<string, string[]>(),
    userVotes: new Map<string, Set<string>>(),
    loadingPolls: new Set<string>(),
    votingPolls: new Set<string>(),
    creator: { ...defaultCreator },
    viewingResultsFor: null,
    viewingVotersFor: null,
    // stub actions used by selectors
    getPollsForChannel: () => [],
    hasUserVoted: () => false,
    // remaining stubs
    setPoll: () => undefined,
    setPolls: () => undefined,
    removePoll: () => undefined,
    updatePollStatus: () => undefined,
    setUserVotes: () => undefined,
    addUserVote: () => undefined,
    removeUserVote: () => undefined,
    clearUserVotes: () => undefined,
    getUserVotedOptions: () => [],
    setLoadingPoll: () => undefined,
    setVotingPoll: () => undefined,
    openCreator: () => undefined,
    closeCreator: () => undefined,
    setCreatorQuestion: () => undefined,
    setCreatorOptions: () => undefined,
    addCreatorOption: () => undefined,
    removeCreatorOption: () => undefined,
    updateCreatorOption: () => undefined,
    setCreatorSettings: () => undefined,
    setCreatorEndsAt: () => undefined,
    setCreatorStep: () => undefined,
    resetCreator: () => undefined,
    openResultsModal: () => undefined,
    closeResultsModal: () => undefined,
    openVotersModal: () => undefined,
    closeVotersModal: () => undefined,
    optimisticVote: () => undefined,
    optimisticUnvote: () => undefined,
    revertVote: () => undefined,
    addPollToChannel: () => undefined,
    reset: () => undefined,
  };
  return { ...defaultState, ...overrides } as unknown as PollStore;
}

function makePoll(overrides?: Partial<Record<string, unknown>>) {
  return {
    id: "p1",
    channel_id: "c1",
    message_id: "msg1",
    creator_id: "u1",
    question: "What is your favourite colour?",
    options: [],
    settings: defaultSettings,
    status: "active",
    ends_at: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    closed_at: null,
    creator: {
      id: "u1",
      username: "alice",
      display_name: "Alice",
      avatar_url: null,
    },
    total_votes: 0,
    ...overrides,
  } as never;
}

// ---------------------------------------------------------------------------
// selectPoll
// ---------------------------------------------------------------------------

describe("selectPoll", () => {
  it("returns undefined when the poll does not exist", () => {
    expect(selectPoll("missing")(makeState())).toBeUndefined();
  });

  it("returns the poll when it exists in the map", () => {
    const poll = makePoll({ id: "p1" });
    const polls = new Map([["p1", poll]]);
    expect(selectPoll("p1")(makeState({ polls }))).toBe(poll);
  });
});

// ---------------------------------------------------------------------------
// selectPollsByChannel
// ---------------------------------------------------------------------------

describe("selectPollsByChannel", () => {
  it("returns empty array when no polls for the channel", () => {
    expect(selectPollsByChannel("c1")(makeState())).toEqual([]);
  });

  it("returns polls from the store getter", () => {
    const polls = [makePoll({ channel_id: "c1" })];
    const state = makeState({ getPollsForChannel: () => polls });
    expect(selectPollsByChannel("c1")(state)).toBe(polls);
  });
});

// ---------------------------------------------------------------------------
// selectUserVotes
// ---------------------------------------------------------------------------

describe("selectUserVotes", () => {
  it("returns undefined when no votes for the poll", () => {
    expect(selectUserVotes("p1")(makeState())).toBeUndefined();
  });

  it("returns the vote set for the poll", () => {
    const voteSet = new Set(["opt1", "opt2"]);
    const userVotes = new Map([["p1", voteSet]]);
    const result = selectUserVotes("p1")(makeState({ userVotes }));
    expect(result).toBe(voteSet);
  });
});

// ---------------------------------------------------------------------------
// selectHasUserVoted
// ---------------------------------------------------------------------------

describe("selectHasUserVoted", () => {
  it("returns false by default", () => {
    expect(selectHasUserVoted("p1")(makeState())).toBe(false);
  });

  it("returns true when the user has voted", () => {
    const state = makeState({ hasUserVoted: () => true });
    expect(selectHasUserVoted("p1")(state)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectIsLoadingPoll
// ---------------------------------------------------------------------------

describe("selectIsLoadingPoll", () => {
  it("returns false when the poll is not loading", () => {
    expect(selectIsLoadingPoll("p1")(makeState())).toBe(false);
  });

  it("returns true when the poll id is in loadingPolls", () => {
    const loadingPolls = new Set(["p1"]);
    expect(selectIsLoadingPoll("p1")(makeState({ loadingPolls }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectIsVotingPoll
// ---------------------------------------------------------------------------

describe("selectIsVotingPoll", () => {
  it("returns false when the poll is not in votingPolls", () => {
    expect(selectIsVotingPoll("p1")(makeState())).toBe(false);
  });

  it("returns true when the poll id is in votingPolls", () => {
    const votingPolls = new Set(["p1"]);
    expect(selectIsVotingPoll("p1")(makeState({ votingPolls }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectCreatorState
// ---------------------------------------------------------------------------

describe("selectCreatorState", () => {
  it("returns the default creator state", () => {
    const result = selectCreatorState(makeState());
    expect(result.isOpen).toBe(false);
    expect(result.channelId).toBeNull();
    expect(result.question).toBe("");
    expect(result.step).toBe("create");
  });

  it("returns the updated creator state", () => {
    const creator: PollCreatorState = {
      ...defaultCreator,
      isOpen: true,
      channelId: "c42",
      question: "Best pizza topping?",
      step: "preview",
    };
    expect(selectCreatorState(makeState({ creator }))).toBe(creator);
  });
});

// ---------------------------------------------------------------------------
// selectIsCreatorOpen
// ---------------------------------------------------------------------------

describe("selectIsCreatorOpen", () => {
  it("returns false by default", () => {
    expect(selectIsCreatorOpen(makeState())).toBe(false);
  });

  it("returns true when the creator modal is open", () => {
    const creator = { ...defaultCreator, isOpen: true };
    expect(selectIsCreatorOpen(makeState({ creator }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectViewingResultsFor
// ---------------------------------------------------------------------------

describe("selectViewingResultsFor", () => {
  it("returns null by default", () => {
    expect(selectViewingResultsFor(makeState())).toBeNull();
  });

  it("returns the poll id when viewing results", () => {
    expect(
      selectViewingResultsFor(makeState({ viewingResultsFor: "p99" })),
    ).toBe("p99");
  });
});

// ---------------------------------------------------------------------------
// selectViewingVotersFor
// ---------------------------------------------------------------------------

describe("selectViewingVotersFor", () => {
  it("returns null by default", () => {
    expect(selectViewingVotersFor(makeState())).toBeNull();
  });

  it("returns the poll and option ids when viewing voters", () => {
    const viewingVotersFor = { pollId: "p1", optionId: "opt1" };
    const result = selectViewingVotersFor(makeState({ viewingVotersFor }));
    expect(result).toBe(viewingVotersFor);
  });
});
