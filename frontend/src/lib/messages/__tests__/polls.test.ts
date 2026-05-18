/**
 * Polls Module Tests
 *
 * Comprehensive tests for poll creation, voting, and management.
 */

import {
  // Types
  type Poll,
  type PollOption,
  type PollStatus,
  type CreatePollInput,
  type UpdatePollInput,
  type VoteInput,
  type VoteResult,
  type VoteErrorCode,
  // Constants
  MIN_POLL_OPTIONS,
  MAX_POLL_OPTIONS,
  MAX_QUESTION_LENGTH,
  MAX_OPTION_LENGTH,
  DEFAULT_MAX_CHOICES,
  MIN_POLL_DURATION_MS,
  MAX_POLL_DURATION_MS,
  // ID Generation
  generatePollId,
  generateOptionId,
  // Validation
  validateCreatePollInput,
  validateVoteInput,
  // Status utilities
  isPollExpired,
  isPollActive,
  canVote,
  canClosePoll,
  canAddOption,
  // Calculations
  calculatePercentages,
  getWinningOptions,
  hasTie,
  getOptionVoteCount,
  getOptionPercentage,
  // Time utilities
  getTimeRemaining,
  formatPollDuration,
  // Poll creation
  createPoll,
  // Vote processing
  processVote,
  removeVote,
  // Poll management
  closePoll,
  addPollOption,
  updatePoll,
  // Display utilities
  getPollStatusText,
  getPollSummary,
  getOptionVoters,
  formatPollSettings,
  sortOptionsByVotes,
  hasUserVoted,
  getUserVotedOptions,
} from "../polls";

// ============================================================================
// Test Helpers
// ============================================================================

const createTestPoll = (overrides?: Partial<Poll>): Poll => ({
  id: "poll_1",
  question: "What is your favorite color?",
  options: [
    { id: "opt_1", text: "Red", votes: 0, percentage: 0, voters: [] },
    { id: "opt_2", text: "Blue", votes: 0, percentage: 0, voters: [] },
    { id: "opt_3", text: "Green", votes: 0, percentage: 0, voters: [] },
  ],
  createdBy: "user1",
  createdAt: new Date().toISOString(),
  isAnonymous: false,
  allowMultiple: false,
  totalVotes: 0,
  status: "active",
  channelId: "ch1",
  messageId: "msg1",
  ...overrides,
});

const createTestPollWithVotes = (): Poll => ({
  ...createTestPoll(),
  options: [
    {
      id: "opt_1",
      text: "Red",
      votes: 5,
      percentage: 50,
      voters: ["u1", "u2", "u3", "u4", "u5"],
    },
    {
      id: "opt_2",
      text: "Blue",
      votes: 3,
      percentage: 30,
      voters: ["u6", "u7", "u8"],
    },
    {
      id: "opt_3",
      text: "Green",
      votes: 2,
      percentage: 20,
      voters: ["u9", "u10"],
    },
  ],
  totalVotes: 10,
});

// ============================================================================
// Tests
// ============================================================================

describe("Polls Module", () => {
  // ==========================================================================
  // ID Generation Tests
  // ==========================================================================

  describe("generatePollId", () => {
    it("should generate unique IDs", () => {
      const id1 = generatePollId();
      const id2 = generatePollId();
      expect(id1).not.toBe(id2);
    });

    it('should start with "poll_"', () => {
      expect(generatePollId().startsWith("poll_")).toBe(true);
    });
  });

  describe("generateOptionId", () => {
    it("should generate unique IDs", () => {
      const id1 = generateOptionId();
      const id2 = generateOptionId();
      expect(id1).not.toBe(id2);
    });

    it('should start with "opt_"', () => {
      expect(generateOptionId().startsWith("opt_")).toBe(true);
    });
  });

  // ==========================================================================
  // Validation Tests
  // ==========================================================================

  describe("validateCreatePollInput", () => {
    it("should validate correct input", () => {
      const input: CreatePollInput = {
        question: "What is your favorite color?",
        options: ["Red", "Blue", "Green"],
        channelId: "ch1",
      };
      const result = validateCreatePollInput(input);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject empty question", () => {
      const input: CreatePollInput = {
        question: "",
        options: ["Red", "Blue"],
        channelId: "ch1",
      };
      const result = validateCreatePollInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Question is required");
    });

    it("should reject long question", () => {
      const input: CreatePollInput = {
        question: "a".repeat(MAX_QUESTION_LENGTH + 1),
        options: ["Red", "Blue"],
        channelId: "ch1",
      };
      const result = validateCreatePollInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("maximum length"))).toBe(
        true,
      );
    });

    it("should reject too few options", () => {
      const input: CreatePollInput = {
        question: "Test?",
        options: ["Only one"],
        channelId: "ch1",
      };
      const result = validateCreatePollInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("At least"))).toBe(true);
    });

    it("should reject too many options", () => {
      const input: CreatePollInput = {
        question: "Test?",
        options: Array.from(
          { length: MAX_POLL_OPTIONS + 1 },
          (_, i) => `Option ${i}`,
        ),
        channelId: "ch1",
      };
      const result = validateCreatePollInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("more than"))).toBe(true);
    });

    it("should reject empty options", () => {
      const input: CreatePollInput = {
        question: "Test?",
        options: ["Red", "", "Blue"],
        channelId: "ch1",
      };
      const result = validateCreatePollInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Options cannot be empty");
    });

    it("should reject long options", () => {
      const input: CreatePollInput = {
        question: "Test?",
        options: ["Red", "a".repeat(MAX_OPTION_LENGTH + 1)],
        channelId: "ch1",
      };
      const result = validateCreatePollInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("Options exceed"))).toBe(
        true,
      );
    });

    it("should reject duplicate options", () => {
      const input: CreatePollInput = {
        question: "Test?",
        options: ["Red", "Blue", "RED"],
        channelId: "ch1",
      };
      const result = validateCreatePollInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Options must be unique");
    });

    it("should reject expiration too soon", () => {
      const input: CreatePollInput = {
        question: "Test?",
        options: ["Red", "Blue"],
        channelId: "ch1",
        expiresAt: new Date(Date.now() + 1000), // 1 second
      };
      const result = validateCreatePollInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("5 minutes"))).toBe(true);
    });

    it("should reject expiration too far", () => {
      const input: CreatePollInput = {
        question: "Test?",
        options: ["Red", "Blue"],
        channelId: "ch1",
        expiresAt: new Date(Date.now() + MAX_POLL_DURATION_MS + 1000000),
      };
      const result = validateCreatePollInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("30 days"))).toBe(true);
    });

    it("should reject invalid max choices", () => {
      const input: CreatePollInput = {
        question: "Test?",
        options: ["Red", "Blue"],
        channelId: "ch1",
        maxChoices: 0,
      };
      const result = validateCreatePollInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("at least 1"))).toBe(true);
    });
  });

  describe("validateVoteInput", () => {
    it("should validate correct vote", () => {
      const poll = createTestPoll();
      const input: VoteInput = {
        pollId: poll.id,
        optionIds: ["opt_1"],
        userId: "user1",
      };
      const result = validateVoteInput(poll, input);
      expect(result.valid).toBe(true);
    });

    it("should reject vote on closed poll", () => {
      const poll = createTestPoll({ status: "closed" });
      const input: VoteInput = {
        pollId: poll.id,
        optionIds: ["opt_1"],
        userId: "user1",
      };
      const result = validateVoteInput(poll, input);
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe("POLL_CLOSED");
    });

    it("should reject vote on expired poll", () => {
      const poll = createTestPoll({
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      });
      const input: VoteInput = {
        pollId: poll.id,
        optionIds: ["opt_1"],
        userId: "user1",
      };
      const result = validateVoteInput(poll, input);
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe("POLL_EXPIRED");
    });

    it("should reject invalid option", () => {
      const poll = createTestPoll();
      const input: VoteInput = {
        pollId: poll.id,
        optionIds: ["invalid_option"],
        userId: "user1",
      };
      const result = validateVoteInput(poll, input);
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe("OPTION_NOT_FOUND");
    });

    it("should reject multiple votes when not allowed", () => {
      const poll = createTestPoll({ allowMultiple: false });
      const input: VoteInput = {
        pollId: poll.id,
        optionIds: ["opt_1", "opt_2"],
        userId: "user1",
      };
      const result = validateVoteInput(poll, input);
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe("MULTIPLE_NOT_ALLOWED");
    });

    it("should reject too many choices", () => {
      const poll = createTestPoll({ allowMultiple: true, maxChoices: 2 });
      const input: VoteInput = {
        pollId: poll.id,
        optionIds: ["opt_1", "opt_2", "opt_3"],
        userId: "user1",
      };
      const result = validateVoteInput(poll, input);
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe("TOO_MANY_CHOICES");
    });
  });

  // ==========================================================================
  // Status Utility Tests
  // ==========================================================================

  describe("isPollExpired", () => {
    it("should return false for active poll without expiration", () => {
      const poll = createTestPoll();
      expect(isPollExpired(poll)).toBe(false);
    });

    it("should return false for active poll with future expiration", () => {
      const poll = createTestPoll({
        expiresAt: new Date(Date.now() + 60000).toISOString(),
      });
      expect(isPollExpired(poll)).toBe(false);
    });

    it("should return true for poll with past expiration", () => {
      const poll = createTestPoll({
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      });
      expect(isPollExpired(poll)).toBe(true);
    });

    it("should return true for closed poll", () => {
      const poll = createTestPoll({ status: "closed" });
      expect(isPollExpired(poll)).toBe(true);
    });
  });

  describe("isPollActive", () => {
    it("should return true for active non-expired poll", () => {
      const poll = createTestPoll();
      expect(isPollActive(poll)).toBe(true);
    });

    it("should return false for closed poll", () => {
      const poll = createTestPoll({ status: "closed" });
      expect(isPollActive(poll)).toBe(false);
    });

    it("should return false for expired poll", () => {
      const poll = createTestPoll({
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      });
      expect(isPollActive(poll)).toBe(false);
    });
  });

  describe("canVote", () => {
    it("should return true for active poll", () => {
      const poll = createTestPoll();
      expect(canVote(poll, "user1")).toBe(true);
    });

    it("should return false for closed poll", () => {
      const poll = createTestPoll({ status: "closed" });
      expect(canVote(poll, "user1")).toBe(false);
    });
  });

  describe("canClosePoll", () => {
    it("should return true for poll creator", () => {
      const poll = createTestPoll({ createdBy: "user1" });
      expect(canClosePoll(poll, "user1")).toBe(true);
    });

    it("should return false for non-creator", () => {
      const poll = createTestPoll({ createdBy: "user1" });
      expect(canClosePoll(poll, "user2")).toBe(false);
    });

    it("should return false for already closed poll", () => {
      const poll = createTestPoll({ createdBy: "user1", status: "closed" });
      expect(canClosePoll(poll, "user1")).toBe(false);
    });
  });

  describe("canAddOption", () => {
    it("should return true when allowed and under limit", () => {
      const poll = createTestPoll({ allowAddOptions: true });
      expect(canAddOption(poll)).toBe(true);
    });

    it("should return false when not allowed", () => {
      const poll = createTestPoll({ allowAddOptions: false });
      expect(canAddOption(poll)).toBe(false);
    });

    it("should return false when at max options", () => {
      const poll = createTestPoll({
        allowAddOptions: true,
        options: Array.from({ length: MAX_POLL_OPTIONS }, (_, i) => ({
          id: `opt_${i}`,
          text: `Option ${i}`,
          votes: 0,
          percentage: 0,
        })),
      });
      expect(canAddOption(poll)).toBe(false);
    });

    it("should return false for closed poll", () => {
      const poll = createTestPoll({ allowAddOptions: true, status: "closed" });
      expect(canAddOption(poll)).toBe(false);
    });
  });

  // ==========================================================================
  // Calculation Tests
  // ==========================================================================

  describe("calculatePercentages", () => {
    it("should calculate correct percentages", () => {
      const options: PollOption[] = [
        { id: "1", text: "A", votes: 5, percentage: 0 },
        { id: "2", text: "B", votes: 3, percentage: 0 },
        { id: "3", text: "C", votes: 2, percentage: 0 },
      ];
      const result = calculatePercentages(options, 10);
      expect(result[0].percentage).toBe(50);
      expect(result[1].percentage).toBe(30);
      expect(result[2].percentage).toBe(20);
    });

    it("should return 0 for all when no votes", () => {
      const options: PollOption[] = [
        { id: "1", text: "A", votes: 0, percentage: 0 },
        { id: "2", text: "B", votes: 0, percentage: 0 },
      ];
      const result = calculatePercentages(options, 0);
      expect(result[0].percentage).toBe(0);
      expect(result[1].percentage).toBe(0);
    });

    it("should round percentages", () => {
      const options: PollOption[] = [
        { id: "1", text: "A", votes: 1, percentage: 0 },
        { id: "2", text: "B", votes: 2, percentage: 0 },
      ];
      const result = calculatePercentages(options, 3);
      expect(result[0].percentage).toBe(33);
      expect(result[1].percentage).toBe(67);
    });
  });

  describe("getWinningOptions", () => {
    it("should return single winner", () => {
      const poll = createTestPollWithVotes();
      const winners = getWinningOptions(poll);
      expect(winners).toHaveLength(1);
      expect(winners[0].id).toBe("opt_1");
    });

    it("should return multiple winners on tie", () => {
      const poll = createTestPoll({
        options: [
          { id: "opt_1", text: "A", votes: 5, percentage: 50 },
          { id: "opt_2", text: "B", votes: 5, percentage: 50 },
        ],
        totalVotes: 10,
      });
      const winners = getWinningOptions(poll);
      expect(winners).toHaveLength(2);
    });

    it("should return empty array when no votes", () => {
      const poll = createTestPoll();
      const winners = getWinningOptions(poll);
      expect(winners).toHaveLength(0);
    });
  });

  describe("hasTie", () => {
    it("should return false for clear winner", () => {
      const poll = createTestPollWithVotes();
      expect(hasTie(poll)).toBe(false);
    });

    it("should return true for tie", () => {
      const poll = createTestPoll({
        options: [
          { id: "opt_1", text: "A", votes: 5, percentage: 50 },
          { id: "opt_2", text: "B", votes: 5, percentage: 50 },
        ],
        totalVotes: 10,
      });
      expect(hasTie(poll)).toBe(true);
    });
  });

  describe("getOptionVoteCount", () => {
    it("should return vote count for option", () => {
      const poll = createTestPollWithVotes();
      expect(getOptionVoteCount(poll, "opt_1")).toBe(5);
    });

    it("should return 0 for invalid option", () => {
      const poll = createTestPollWithVotes();
      expect(getOptionVoteCount(poll, "invalid")).toBe(0);
    });
  });

  describe("getOptionPercentage", () => {
    it("should return percentage for option", () => {
      const poll = createTestPollWithVotes();
      expect(getOptionPercentage(poll, "opt_1")).toBe(50);
    });

    it("should return 0 for invalid option", () => {
      const poll = createTestPollWithVotes();
      expect(getOptionPercentage(poll, "invalid")).toBe(0);
    });

    it("should return 0 when no votes", () => {
      const poll = createTestPoll();
      expect(getOptionPercentage(poll, "opt_1")).toBe(0);
    });
  });

  // ==========================================================================
  // Time Utility Tests
  // ==========================================================================

  describe("getTimeRemaining", () => {
    it("should return correct time for future expiration", () => {
      const poll = createTestPoll({
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours
      });
      const result = getTimeRemaining(poll);
      expect(result.expired).toBe(false);
      // Hours may be 1 or 2 depending on rounding method
      expect(result.hours).toBeGreaterThanOrEqual(1);
      expect(result.hours).toBeLessThanOrEqual(2);
      expect(result.text).toContain("remaining");
    });

    it("should return expired for past expiration", () => {
      const poll = createTestPoll({
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      });
      const result = getTimeRemaining(poll);
      expect(result.expired).toBe(true);
      expect(result.text).toBe("Poll expired");
    });

    it("should handle closed poll", () => {
      const poll = createTestPoll({ status: "closed" });
      const result = getTimeRemaining(poll);
      expect(result.expired).toBe(true);
      expect(result.text).toBe("Poll closed");
    });

    it("should handle poll without expiration", () => {
      const poll = createTestPoll();
      const result = getTimeRemaining(poll);
      expect(result.expired).toBe(false);
      expect(result.text).toBe("No expiration");
    });
  });

  describe("formatPollDuration", () => {
    it("should format days", () => {
      // Add 1-hour buffer so Math.floor doesn't round down to 2 days due to ms elapsed
      const future = new Date(
        Date.now() + 3 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000,
      );
      expect(formatPollDuration(future)).toBe("3 days");
    });

    it("should format hours", () => {
      // Add 5-minute buffer so Math.floor doesn't round down to 4 hours
      const future = new Date(Date.now() + 5 * 60 * 60 * 1000 + 5 * 60 * 1000);
      expect(formatPollDuration(future)).toBe("5 hours");
    });

    it("should format minutes", () => {
      // Add 30-second buffer so Math.floor doesn't round down to 29 minutes
      const future = new Date(Date.now() + 30 * 60 * 1000 + 30 * 1000);
      expect(formatPollDuration(future)).toBe("30 minutes");
    });

    it("should return Expired for past date", () => {
      const past = new Date(Date.now() - 1000);
      expect(formatPollDuration(past)).toBe("Expired");
    });

    it("should use singular for 1 day", () => {
      // Add 1-hour buffer so Math.floor doesn't round down to 0 days
      const future = new Date(
        Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000,
      );
      expect(formatPollDuration(future)).toBe("1 day");
    });
  });

  // ==========================================================================
  // Poll Creation Tests
  // ==========================================================================

  describe("createPoll", () => {
    it("should create a poll with correct structure", () => {
      const input: CreatePollInput = {
        question: "What is your favorite color?",
        options: ["Red", "Blue", "Green"],
        channelId: "ch1",
      };
      const poll = createPoll(input, "user1", "msg1");

      expect(poll.id).toBeDefined();
      expect(poll.question).toBe("What is your favorite color?");
      expect(poll.options).toHaveLength(3);
      expect(poll.createdBy).toBe("user1");
      expect(poll.messageId).toBe("msg1");
      expect(poll.status).toBe("active");
      expect(poll.totalVotes).toBe(0);
    });

    it("should trim question and options", () => {
      const input: CreatePollInput = {
        question: "  Question?  ",
        options: ["  Red  ", "  Blue  "],
        channelId: "ch1",
      };
      const poll = createPoll(input, "user1", "msg1");

      expect(poll.question).toBe("Question?");
      expect(poll.options[0].text).toBe("Red");
      expect(poll.options[1].text).toBe("Blue");
    });

    it("should set anonymous correctly", () => {
      const input: CreatePollInput = {
        question: "Test?",
        options: ["A", "B"],
        channelId: "ch1",
        isAnonymous: true,
      };
      const poll = createPoll(input, "user1", "msg1");

      expect(poll.isAnonymous).toBe(true);
      expect(poll.options[0].voters).toBeUndefined();
    });

    it("should set multiple choice correctly", () => {
      const input: CreatePollInput = {
        question: "Test?",
        options: ["A", "B"],
        channelId: "ch1",
        allowMultiple: true,
        maxChoices: 2,
      };
      const poll = createPoll(input, "user1", "msg1");

      expect(poll.allowMultiple).toBe(true);
      expect(poll.maxChoices).toBe(2);
    });
  });

  // ==========================================================================
  // Vote Processing Tests
  // ==========================================================================

  describe("processVote", () => {
    it("should add a vote", () => {
      const poll = createTestPoll();
      const updated = processVote(poll, ["opt_1"], "user1");

      expect(updated.options[0].votes).toBe(1);
      expect(updated.options[0].voters).toContain("user1");
      expect(updated.totalVotes).toBe(1);
    });

    it("should update percentages", () => {
      const poll = createTestPoll();
      const updated = processVote(poll, ["opt_1"], "user1");

      expect(updated.options[0].percentage).toBe(100);
      expect(updated.options[1].percentage).toBe(0);
    });

    it("should handle vote change", () => {
      let poll = createTestPoll();
      poll = processVote(poll, ["opt_1"], "user1");
      poll = processVote(poll, ["opt_2"], "user1", ["opt_1"]);

      expect(poll.options[0].votes).toBe(0);
      expect(poll.options[1].votes).toBe(1);
      expect(poll.totalVotes).toBe(1);
    });

    it("should handle multiple choice vote", () => {
      let poll = createTestPoll({ allowMultiple: true, maxChoices: 2 });
      poll = processVote(poll, ["opt_1", "opt_2"], "user1");

      expect(poll.options[0].votes).toBe(1);
      expect(poll.options[1].votes).toBe(1);
      expect(poll.totalVotes).toBe(2);
    });
  });

  describe("removeVote", () => {
    it("should remove a vote", () => {
      let poll = createTestPoll();
      poll = processVote(poll, ["opt_1"], "user1");
      poll = removeVote(poll, ["opt_1"], "user1");

      expect(poll.options[0].votes).toBe(0);
      expect(poll.totalVotes).toBe(0);
    });
  });

  // ==========================================================================
  // Poll Management Tests
  // ==========================================================================

  describe("closePoll", () => {
    it("should close a poll", () => {
      const poll = createTestPoll();
      const closed = closePoll(poll, "user1");

      expect(closed.status).toBe("closed");
      expect(closed.closedBy).toBe("user1");
      expect(closed.closedAt).toBeDefined();
    });
  });

  describe("addPollOption", () => {
    it("should add an option", () => {
      const poll = createTestPoll({ allowAddOptions: true });
      const updated = addPollOption(poll, "Yellow");

      expect(updated.options).toHaveLength(4);
      expect(updated.options[3].text).toBe("Yellow");
    });

    it("should not add when not allowed", () => {
      const poll = createTestPoll({ allowAddOptions: false });
      const updated = addPollOption(poll, "Yellow");

      expect(updated.options).toHaveLength(3);
    });
  });

  describe("updatePoll", () => {
    it("should update question", () => {
      const poll = createTestPoll();
      const updated = updatePoll(poll, { question: "New question?" });

      expect(updated.question).toBe("New question?");
    });

    it("should update expiration", () => {
      const poll = createTestPoll();
      const newExpiration = new Date(Date.now() + 60000).toISOString();
      const updated = updatePoll(poll, { expiresAt: newExpiration });

      expect(updated.expiresAt).toBe(newExpiration);
    });

    it("should remove expiration with null", () => {
      const poll = createTestPoll({
        expiresAt: new Date().toISOString(),
      });
      const updated = updatePoll(poll, { expiresAt: null });

      expect(updated.expiresAt).toBeUndefined();
    });
  });

  // ==========================================================================
  // Display Utility Tests
  // ==========================================================================

  describe("getPollStatusText", () => {
    it('should return "Active" for active poll', () => {
      expect(getPollStatusText(createTestPoll())).toBe("Active");
    });

    it('should return "Closed" for closed poll', () => {
      expect(getPollStatusText(createTestPoll({ status: "closed" }))).toBe(
        "Closed",
      );
    });

    it('should return "Expired" for expired poll', () => {
      expect(
        getPollStatusText(
          createTestPoll({
            expiresAt: new Date(Date.now() - 1000).toISOString(),
          }),
        ),
      ).toBe("Expired");
    });
  });

  describe("getPollSummary", () => {
    it("should return correct summary", () => {
      const poll = createTestPollWithVotes();
      expect(getPollSummary(poll)).toBe("10 votes - active");
    });

    it("should use singular for 1 vote", () => {
      const poll = createTestPoll({
        options: [
          { id: "opt_1", text: "A", votes: 1, percentage: 100 },
          { id: "opt_2", text: "B", votes: 0, percentage: 0 },
        ],
        totalVotes: 1,
      });
      expect(getPollSummary(poll)).toBe("1 vote - active");
    });
  });

  describe("getOptionVoters", () => {
    it("should return voters for non-anonymous poll", () => {
      const poll = createTestPollWithVotes();
      const voters = getOptionVoters(poll, "opt_1");
      expect(voters).toEqual(["u1", "u2", "u3", "u4", "u5"]);
    });

    it("should return empty for anonymous poll", () => {
      const poll = createTestPoll({ isAnonymous: true });
      const voters = getOptionVoters(poll, "opt_1");
      expect(voters).toEqual([]);
    });
  });

  describe("formatPollSettings", () => {
    it("should format anonymous setting", () => {
      const poll = createTestPoll({ isAnonymous: true });
      const settings = formatPollSettings(poll);
      expect(settings).toContain("Anonymous voting");
    });

    it("should format multiple choice setting", () => {
      const poll = createTestPoll({ allowMultiple: true, maxChoices: 3 });
      const settings = formatPollSettings(poll);
      expect(settings.some((s) => s.includes("Multiple choice"))).toBe(true);
    });

    it("should format add options setting", () => {
      const poll = createTestPoll({ allowAddOptions: true });
      const settings = formatPollSettings(poll);
      expect(settings).toContain("Users can add options");
    });
  });

  describe("sortOptionsByVotes", () => {
    it("should sort by votes descending", () => {
      const poll = createTestPollWithVotes();
      const sorted = sortOptionsByVotes(poll.options);
      expect(sorted[0].votes).toBe(5);
      expect(sorted[1].votes).toBe(3);
      expect(sorted[2].votes).toBe(2);
    });

    it("should not mutate original", () => {
      const poll = createTestPollWithVotes();
      const original = [...poll.options];
      sortOptionsByVotes(poll.options);
      expect(poll.options).toEqual(original);
    });
  });

  describe("hasUserVoted", () => {
    it("should return true if user voted", () => {
      const poll = createTestPollWithVotes();
      expect(hasUserVoted(poll, "u1")).toBe(true);
    });

    it("should return false if user not voted", () => {
      const poll = createTestPollWithVotes();
      expect(hasUserVoted(poll, "u99")).toBe(false);
    });

    it("should return false for anonymous poll", () => {
      const poll = createTestPoll({ isAnonymous: true });
      expect(hasUserVoted(poll, "u1")).toBe(false);
    });
  });

  describe("getUserVotedOptions", () => {
    it("should return voted option IDs", () => {
      const poll = createTestPollWithVotes();
      expect(getUserVotedOptions(poll, "u1")).toEqual(["opt_1"]);
    });

    it("should return empty for non-voter", () => {
      const poll = createTestPollWithVotes();
      expect(getUserVotedOptions(poll, "u99")).toEqual([]);
    });
  });

  // ==========================================================================
  // Constants Tests
  // ==========================================================================

  describe("Constants", () => {
    it("should have valid MIN_POLL_OPTIONS", () => {
      expect(MIN_POLL_OPTIONS).toBe(2);
    });

    it("should have valid MAX_POLL_OPTIONS", () => {
      expect(MAX_POLL_OPTIONS).toBe(10);
    });

    it("should have valid MAX_QUESTION_LENGTH", () => {
      expect(MAX_QUESTION_LENGTH).toBe(300);
    });

    it("should have valid MAX_OPTION_LENGTH", () => {
      expect(MAX_OPTION_LENGTH).toBe(100);
    });

    it("should have valid DEFAULT_MAX_CHOICES", () => {
      expect(DEFAULT_MAX_CHOICES).toBe(3);
    });
  });
});
