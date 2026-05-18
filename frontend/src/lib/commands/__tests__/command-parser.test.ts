/**
 * Tests for Command Parser
 *
 * Tests for slash command parsing, argument extraction, and validation.
 */

import {
  isCommandInput,
  isTypingCommand,
  extractCommandName,
  extractPartialCommand,
  parseCommand,
  parseUserMention,
  parseChannelReference,
  parseDuration,
  formatDuration,
  validateCommandContext,
  COMMAND_PREFIX,
  COMMAND_NAME_PATTERN,
  DURATION_PATTERN,
} from "../command-parser";

// Mock the commands module
jest.mock("../commands", () => ({
  getCommandByName: jest.fn((name: string) => {
    const mockCommands: Record<string, any> = {
      shrug: {
        name: "shrug",
        description: "Send a shrug",
        category: "fun",
        args: [
          {
            name: "text",
            type: "text",
            required: false,
            description: "Optional text",
          },
        ],
      },
      status: {
        name: "status",
        description: "Set your status",
        category: "status",
        args: [
          {
            name: "emoji",
            type: "emoji",
            required: false,
            description: "Status emoji",
          },
          {
            name: "text",
            type: "text",
            required: false,
            description: "Status text",
          },
        ],
      },
      mute: {
        name: "mute",
        description: "Mute channel",
        category: "channel",
        args: [
          {
            name: "duration",
            type: "duration",
            required: false,
            description: "Mute duration",
          },
        ],
        requiresChannel: true,
      },
      invite: {
        name: "invite",
        description: "Invite user",
        category: "channel",
        args: [
          {
            name: "users",
            type: "user",
            required: true,
            description: "User to invite",
          },
        ],
        requiresChannel: true,
      },
      open: {
        name: "open",
        description: "Open channel",
        category: "navigation",
        args: [
          {
            name: "channel",
            type: "channel",
            required: true,
            description: "Channel to open",
          },
        ],
      },
      poll: {
        name: "poll",
        description: "Create poll",
        category: "utility",
        args: [
          {
            name: "question",
            type: "text",
            required: true,
            description: "Poll question",
          },
          {
            name: "options",
            type: "options",
            required: true,
            description: "Poll options",
          },
        ],
      },
      kick: {
        name: "kick",
        description: "Kick user",
        category: "moderation",
        args: [
          {
            name: "user",
            type: "user",
            required: true,
            description: "User to kick",
          },
        ],
        requiresChannel: true,
        requiresPermission: "moderator",
      },
      archive: {
        name: "archive",
        description: "Archive channel",
        category: "channel",
        args: [],
        requiresChannel: true,
        requiresPermission: "admin",
        requiredFeature: "channels.archive",
      },
    };
    return mockCommands[name];
  }),
}));

describe("isCommandInput", () => {
  it("should return true for strings starting with /", () => {
    expect(isCommandInput("/shrug")).toBe(true);
    expect(isCommandInput("/status hello")).toBe(true);
    expect(isCommandInput("  /command")).toBe(true);
  });

  it("should return false for non-command strings", () => {
    expect(isCommandInput("hello world")).toBe(false);
    expect(isCommandInput("not / a command")).toBe(false);
    expect(isCommandInput("")).toBe(false);
  });
});

describe("isTypingCommand", () => {
  it("should return true for partial command input", () => {
    expect(isTypingCommand("/")).toBe(true);
    expect(isTypingCommand("/shr")).toBe(true);
    expect(isTypingCommand("/s")).toBe(true);
  });

  it("should return false for complete commands with space", () => {
    expect(isTypingCommand("/shrug hello")).toBe(false);
    expect(isTypingCommand("/status ")).toBe(false);
  });

  it("should return false for non-command input", () => {
    expect(isTypingCommand("hello")).toBe(false);
    expect(isTypingCommand("")).toBe(false);
  });
});

describe("extractCommandName", () => {
  it("should extract command name from input", () => {
    expect(extractCommandName("/shrug")).toBe("shrug");
    expect(extractCommandName("/status hello")).toBe("status");
    expect(extractCommandName("/UPPER ")).toBe("upper");
  });

  it("should return null for invalid input", () => {
    expect(extractCommandName("not a command")).toBeNull();
    expect(extractCommandName("/")).toBeNull();
    expect(extractCommandName("/123")).toBeNull();
  });
});

describe("extractPartialCommand", () => {
  it("should extract partial command being typed", () => {
    expect(extractPartialCommand("/shr")).toBe("shr");
    expect(extractPartialCommand("/s")).toBe("s");
    expect(extractPartialCommand("/")).toBe("");
  });

  it("should return empty string for non-partial input", () => {
    expect(extractPartialCommand("/shrug hello")).toBe("");
    expect(extractPartialCommand("hello")).toBe("");
  });
});

describe("parseCommand", () => {
  describe("basic parsing", () => {
    it("should parse valid command", () => {
      const result = parseCommand("/shrug");

      expect(result.valid).toBe(true);
      expect(result.commandName).toBe("shrug");
      expect(result.commandString).toBe("/shrug");
      expect(result.command).toBeDefined();
      expect(result.errors).toHaveLength(0);
    });

    it("should return invalid for non-command input", () => {
      const result = parseCommand("hello world");

      expect(result.valid).toBe(false);
      expect(result.commandName).toBe("");
    });

    it("should return error for unknown command", () => {
      const result = parseCommand("/unknowncommand");

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: "unknown_command",
          message: expect.stringContaining("unknowncommand"),
        }),
      );
    });
  });

  describe("argument parsing", () => {
    it("should parse text arguments", () => {
      const result = parseCommand("/shrug hello world");

      expect(result.valid).toBe(true);
      expect(result.args[0]?.value).toBe("hello world");
    });

    it("should parse quoted arguments", () => {
      const result = parseCommand('/shrug "hello world"');

      expect(result.valid).toBe(true);
      expect(result.args[0]?.value).toBe("hello world");
    });

    it("should parse single-quoted arguments", () => {
      const result = parseCommand("/shrug 'hello world'");

      expect(result.valid).toBe(true);
      expect(result.args[0]?.value).toBe("hello world");
    });

    it("should validate required arguments", () => {
      const result = parseCommand("/invite");

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: "missing_required",
          argName: "users",
        }),
      );
    });
  });

  describe("user mention parsing", () => {
    it("should parse @username format", () => {
      const result = parseCommand("/invite @john");

      expect(result.valid).toBe(true);
      expect(result.namedArgs.users?.value).toBe("john");
    });

    it("should fail on invalid user format", () => {
      const result = parseCommand("/invite 123invalid");

      expect(result.args[0]?.valid).toBe(false);
      expect(result.args[0]?.error).toContain("Invalid user mention");
    });
  });

  describe("channel reference parsing", () => {
    it("should parse #channel format", () => {
      const result = parseCommand("/open #general");

      expect(result.valid).toBe(true);
      expect(result.namedArgs.channel?.value).toBe("general");
    });

    it("should fail on invalid channel format", () => {
      const result = parseCommand("/open 123invalid");

      expect(result.args[0]?.valid).toBe(false);
      expect(result.args[0]?.error).toContain("Invalid channel");
    });
  });

  describe("duration parsing", () => {
    it("should parse duration arguments", () => {
      const result = parseCommand("/mute 30m");

      expect(result.valid).toBe(true);
      expect(result.namedArgs.duration?.valid).toBe(true);
    });

    it("should fail on invalid duration", () => {
      const result = parseCommand("/mute notaduration");

      expect(result.args[0]?.valid).toBe(false);
      expect(result.args[0]?.error).toContain("Invalid duration");
    });
  });

  describe("options parsing", () => {
    it("should parse multiple options for poll", () => {
      const result = parseCommand(
        '/poll "Question?" "Option 1" "Option 2" "Option 3"',
      );

      expect(result.valid).toBe(true);
      expect(result.namedArgs.options?.value).toEqual([
        "Option 1",
        "Option 2",
        "Option 3",
      ]);
    });

    it("should require at least 2 options", () => {
      const result = parseCommand('/poll "Question?" "Only one"');

      expect(result.namedArgs.options?.valid).toBe(false);
      expect(result.namedArgs.options?.error).toContain("at least 2 options");
    });
  });

  describe("isComplete flag", () => {
    it("should be true when all required args are valid", () => {
      const result = parseCommand("/shrug hello");

      expect(result.isComplete).toBe(true);
    });

    it("should be false when required args are missing", () => {
      const result = parseCommand("/invite");

      expect(result.isComplete).toBe(false);
    });
  });
});

describe("parseUserMention", () => {
  it("should parse @username format", () => {
    expect(parseUserMention("@john")).toBe("john");
    expect(parseUserMention("@user123")).toBe("user123");
    expect(parseUserMention("@john.doe")).toBe("john.doe");
  });

  it("should parse username without @", () => {
    expect(parseUserMention("john")).toBe("john");
  });

  it("should return empty string for invalid format", () => {
    expect(parseUserMention("123invalid")).toBe("");
    expect(parseUserMention("@")).toBe("");
    expect(parseUserMention("")).toBe("");
  });
});

describe("parseChannelReference", () => {
  it("should parse #channel format", () => {
    expect(parseChannelReference("#general")).toBe("general");
    expect(parseChannelReference("#random-channel")).toBe("random-channel");
  });

  it("should parse channel name without #", () => {
    expect(parseChannelReference("general")).toBe("general");
  });

  it("should return empty string for invalid format", () => {
    expect(parseChannelReference("123invalid")).toBe("");
    expect(parseChannelReference("#")).toBe("");
    expect(parseChannelReference("")).toBe("");
  });
});

describe("parseDuration", () => {
  it("should parse seconds", () => {
    expect(parseDuration("30s").valid).toBe(true);
    expect(parseDuration("30s").milliseconds).toBe(30000);
    expect(parseDuration("30sec").milliseconds).toBe(30000);
    expect(parseDuration("30seconds").milliseconds).toBe(30000);
  });

  it("should parse minutes", () => {
    expect(parseDuration("5m").valid).toBe(true);
    expect(parseDuration("5m").milliseconds).toBe(5 * 60 * 1000);
    expect(parseDuration("5min").milliseconds).toBe(5 * 60 * 1000);
    expect(parseDuration("5minutes").milliseconds).toBe(5 * 60 * 1000);
  });

  it("should parse hours", () => {
    expect(parseDuration("2h").valid).toBe(true);
    expect(parseDuration("2h").milliseconds).toBe(2 * 60 * 60 * 1000);
    expect(parseDuration("2hr").milliseconds).toBe(2 * 60 * 60 * 1000);
    expect(parseDuration("2hours").milliseconds).toBe(2 * 60 * 60 * 1000);
  });

  it("should parse days", () => {
    expect(parseDuration("1d").valid).toBe(true);
    expect(parseDuration("1d").milliseconds).toBe(24 * 60 * 60 * 1000);
    expect(parseDuration("1day").milliseconds).toBe(24 * 60 * 60 * 1000);
  });

  it("should parse weeks", () => {
    expect(parseDuration("1w").valid).toBe(true);
    expect(parseDuration("1w").milliseconds).toBe(7 * 24 * 60 * 60 * 1000);
    expect(parseDuration("1week").milliseconds).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it("should be case insensitive", () => {
    expect(parseDuration("30M").valid).toBe(true);
    expect(parseDuration("2H").valid).toBe(true);
  });

  it('should parse natural language "in X minutes"', () => {
    expect(parseDuration("in 30 minutes").valid).toBe(true);
    expect(parseDuration("in 2 hours").valid).toBe(true);
  });

  it('should parse "tomorrow"', () => {
    const result = parseDuration("tomorrow");
    expect(result.valid).toBe(true);
    expect(result.milliseconds).toBe(24 * 60 * 60 * 1000);
  });

  it("should return invalid for unrecognized format", () => {
    expect(parseDuration("invalid").valid).toBe(false);
    expect(parseDuration("").valid).toBe(false);
  });
});

describe("formatDuration", () => {
  it("should format seconds", () => {
    expect(formatDuration(5000)).toBe("5 seconds");
    expect(formatDuration(1000)).toBe("1 second");
  });

  it("should format minutes", () => {
    expect(formatDuration(60000)).toBe("1 minute");
    expect(formatDuration(120000)).toBe("2 minutes");
  });

  it("should format hours", () => {
    expect(formatDuration(3600000)).toBe("1 hour");
    expect(formatDuration(7200000)).toBe("2 hours");
  });

  it("should format days", () => {
    expect(formatDuration(86400000)).toBe("1 day");
    expect(formatDuration(172800000)).toBe("2 days");
  });

  it("should format weeks", () => {
    expect(formatDuration(604800000)).toBe("1 week");
    expect(formatDuration(1209600000)).toBe("2 weeks");
  });
});

describe("validateCommandContext", () => {
  it("should validate channel requirement", () => {
    const command = { requiresChannel: true } as any;

    const resultNoChannel = validateCommandContext(command, {});
    expect(resultNoChannel.valid).toBe(false);
    expect(resultNoChannel.errors).toContain(
      "This command requires a channel context.",
    );

    const resultWithChannel = validateCommandContext(command, {
      channelId: "channel-123",
    });
    expect(resultWithChannel.valid).toBe(true);
  });

  it("should validate permission requirements", () => {
    const command = { requiresPermission: "moderator" } as any;

    const guestResult = validateCommandContext(command, { userRole: "guest" });
    expect(guestResult.valid).toBe(false);
    expect(guestResult.errors).toContain(
      "This command requires moderator permissions.",
    );

    const memberResult = validateCommandContext(command, {
      userRole: "member",
    });
    expect(memberResult.valid).toBe(false);

    const modResult = validateCommandContext(command, {
      userRole: "moderator",
    });
    expect(modResult.valid).toBe(true);

    const adminResult = validateCommandContext(command, { userRole: "admin" });
    expect(adminResult.valid).toBe(true);
  });

  it("should validate admin permission", () => {
    const command = { requiresPermission: "admin" } as any;

    const modResult = validateCommandContext(command, {
      userRole: "moderator",
    });
    expect(modResult.valid).toBe(false);

    const adminResult = validateCommandContext(command, { userRole: "admin" });
    expect(adminResult.valid).toBe(true);
  });

  it("should validate feature requirements", () => {
    const command = { requiredFeature: "channels.archive" } as any;

    const disabledResult = validateCommandContext(command, {
      enabledFeatures: ["channels.mute"],
    });
    expect(disabledResult.valid).toBe(false);
    expect(disabledResult.errors).toContain(
      "This command requires a feature that is not enabled.",
    );

    const enabledResult = validateCommandContext(command, {
      enabledFeatures: ["channels.archive"],
    });
    expect(enabledResult.valid).toBe(true);
  });

  it("should validate multiple requirements", () => {
    const command = {
      requiresChannel: true,
      requiresPermission: "admin",
    } as any;

    const partialResult = validateCommandContext(command, {
      channelId: "channel-123",
      userRole: "member",
    });
    expect(partialResult.valid).toBe(false);
    expect(partialResult.errors).toHaveLength(1);

    const fullResult = validateCommandContext(command, {
      channelId: "channel-123",
      userRole: "admin",
    });
    expect(fullResult.valid).toBe(true);
  });
});

describe("Pattern constants", () => {
  it("should have COMMAND_PREFIX defined", () => {
    expect(COMMAND_PREFIX).toBe("/");
  });

  it("should have COMMAND_NAME_PATTERN that matches valid commands", () => {
    expect("/shrug".match(COMMAND_NAME_PATTERN)).toBeTruthy();
    expect("/my-command".match(COMMAND_NAME_PATTERN)).toBeTruthy();
    expect("/cmd_123".match(COMMAND_NAME_PATTERN)).toBeTruthy();
    expect("/123invalid".match(COMMAND_NAME_PATTERN)).toBeFalsy();
  });

  it("should have DURATION_PATTERN that matches valid durations", () => {
    expect("30m".match(DURATION_PATTERN)).toBeTruthy();
    expect("2h".match(DURATION_PATTERN)).toBeTruthy();
    expect("1day".match(DURATION_PATTERN)).toBeTruthy();
    expect("invalid".match(DURATION_PATTERN)).toBeFalsy();
  });
});
