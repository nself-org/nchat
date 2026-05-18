import { DocumentNode } from "@apollo/client";
import {
  MESSAGE_FIELDS,
  CHANNEL_MESSAGES_SUBSCRIPTION,
  NEW_MESSAGE_SUBSCRIPTION,
} from "../subscriptions/messages";
import {
  CHANNEL_FIELDS,
  USER_CHANNELS_SUBSCRIPTION,
  CHANNEL_DETAILS_SUBSCRIPTION,
  CHANNEL_MEMBERS_SUBSCRIPTION,
} from "../subscriptions/channels";
import {
  USER_PRESENCE_SUBSCRIPTION,
  CHANNEL_PRESENCE_SUBSCRIPTION,
} from "../subscriptions/presence";
import {
  CHANNEL_READ_STATUS_SUBSCRIPTION,
  USER_UNREAD_COUNTS_SUBSCRIPTION,
} from "../subscriptions/read-receipts";
import {
  MESSAGE_REACTIONS_SUBSCRIPTION,
  MESSAGE_REACTION_COUNTS_SUBSCRIPTION,
  CHANNEL_REACTIONS_SUBSCRIPTION,
} from "../subscriptions/reactions";

// ============================================================================
// Helper Functions
// ============================================================================

function getOperationName(doc: DocumentNode): string | undefined {
  const definition = doc.definitions.find(
    (def) => def.kind === "OperationDefinition",
  );
  if (definition && definition.kind === "OperationDefinition") {
    return definition.name?.value;
  }
  return undefined;
}

function getOperationType(doc: DocumentNode): string | undefined {
  const definition = doc.definitions.find(
    (def) => def.kind === "OperationDefinition",
  );
  if (definition && definition.kind === "OperationDefinition") {
    return definition.operation;
  }
  return undefined;
}

function getVariableNames(doc: DocumentNode): string[] {
  const definition = doc.definitions.find(
    (def) => def.kind === "OperationDefinition",
  );
  if (definition && definition.kind === "OperationDefinition") {
    return (
      definition.variableDefinitions?.map((v) => v.variable.name.value) || []
    );
  }
  return [];
}

function getVariableType(
  doc: DocumentNode,
  varName: string,
): string | undefined {
  const definition = doc.definitions.find(
    (def) => def.kind === "OperationDefinition",
  );
  if (definition && definition.kind === "OperationDefinition") {
    const varDef = definition.variableDefinitions?.find(
      (v) => v.variable.name.value === varName,
    );
    if (varDef) {
      return printType(varDef.type);
    }
  }
  return undefined;
}

function printType(type: any): string {
  if (type.kind === "NonNullType") {
    return `${printType(type.type)}!`;
  }
  if (type.kind === "ListType") {
    return `[${printType(type.type)}]`;
  }
  if (type.kind === "NamedType") {
    return type.name.value;
  }
  return "";
}

function hasFragmentDefinition(
  doc: DocumentNode,
  fragmentName: string,
): boolean {
  return doc.definitions.some(
    (def) =>
      def.kind === "FragmentDefinition" && def.name.value === fragmentName,
  );
}

function getFragmentTypeName(
  doc: DocumentNode,
  fragmentName: string,
): string | undefined {
  const definition = doc.definitions.find(
    (def) =>
      def.kind === "FragmentDefinition" && def.name.value === fragmentName,
  );
  if (definition && definition.kind === "FragmentDefinition") {
    return definition.typeCondition.name.value;
  }
  return undefined;
}

// ============================================================================
// Message Subscription Tests
// ============================================================================

describe("Message Subscriptions", () => {
  describe("MESSAGE_FIELDS fragment", () => {
    it("should be a valid GraphQL document", () => {
      expect(MESSAGE_FIELDS).toBeDefined();
      expect(MESSAGE_FIELDS.kind).toBe("Document");
    });

    it("should define MessageFields fragment", () => {
      expect(hasFragmentDefinition(MESSAGE_FIELDS, "MessageFields")).toBe(true);
    });

    it("should target nchat_messages type", () => {
      expect(getFragmentTypeName(MESSAGE_FIELDS, "MessageFields")).toBe(
        "nchat_messages",
      );
    });
  });

  describe("CHANNEL_MESSAGES_SUBSCRIPTION", () => {
    it("should be a valid GraphQL document", () => {
      expect(CHANNEL_MESSAGES_SUBSCRIPTION).toBeDefined();
      expect(CHANNEL_MESSAGES_SUBSCRIPTION.kind).toBe("Document");
    });

    it("should be a subscription operation", () => {
      expect(getOperationType(CHANNEL_MESSAGES_SUBSCRIPTION)).toBe(
        "subscription",
      );
    });

    it("should have correct operation name", () => {
      expect(getOperationName(CHANNEL_MESSAGES_SUBSCRIPTION)).toBe(
        "ChannelMessages",
      );
    });

    it("should have required channelId variable", () => {
      const variables = getVariableNames(CHANNEL_MESSAGES_SUBSCRIPTION);
      expect(variables).toContain("channelId");
    });

    it("should have channelId as uuid! type", () => {
      expect(getVariableType(CHANNEL_MESSAGES_SUBSCRIPTION, "channelId")).toBe(
        "uuid!",
      );
    });

    it("should have optional limit variable with default value", () => {
      const variables = getVariableNames(CHANNEL_MESSAGES_SUBSCRIPTION);
      expect(variables).toContain("limit");
    });

    it("should have limit as Int type", () => {
      expect(getVariableType(CHANNEL_MESSAGES_SUBSCRIPTION, "limit")).toBe(
        "Int",
      );
    });
  });

  describe("NEW_MESSAGE_SUBSCRIPTION", () => {
    it("should be a valid GraphQL document", () => {
      expect(NEW_MESSAGE_SUBSCRIPTION).toBeDefined();
      expect(NEW_MESSAGE_SUBSCRIPTION.kind).toBe("Document");
    });

    it("should be a subscription operation", () => {
      expect(getOperationType(NEW_MESSAGE_SUBSCRIPTION)).toBe("subscription");
    });

    it("should have correct operation name", () => {
      expect(getOperationName(NEW_MESSAGE_SUBSCRIPTION)).toBe("NewMessage");
    });

    it("should have required channelId variable", () => {
      const variables = getVariableNames(NEW_MESSAGE_SUBSCRIPTION);
      expect(variables).toContain("channelId");
    });

    it("should have channelId as uuid! type", () => {
      expect(getVariableType(NEW_MESSAGE_SUBSCRIPTION, "channelId")).toBe(
        "uuid!",
      );
    });

    it("should only require channelId variable", () => {
      const variables = getVariableNames(NEW_MESSAGE_SUBSCRIPTION);
      expect(variables).toHaveLength(1);
    });
  });
});

// ============================================================================
// Channel Subscription Tests
// ============================================================================

describe("Channel Subscriptions", () => {
  describe("CHANNEL_FIELDS fragment", () => {
    it("should be a valid GraphQL document", () => {
      expect(CHANNEL_FIELDS).toBeDefined();
      expect(CHANNEL_FIELDS.kind).toBe("Document");
    });

    it("should define ChannelFields fragment", () => {
      expect(hasFragmentDefinition(CHANNEL_FIELDS, "ChannelFields")).toBe(true);
    });

    it("should target nchat_channels type", () => {
      expect(getFragmentTypeName(CHANNEL_FIELDS, "ChannelFields")).toBe(
        "nchat_channels",
      );
    });
  });

  describe("USER_CHANNELS_SUBSCRIPTION", () => {
    it("should be a valid GraphQL document", () => {
      expect(USER_CHANNELS_SUBSCRIPTION).toBeDefined();
      expect(USER_CHANNELS_SUBSCRIPTION.kind).toBe("Document");
    });

    it("should be a subscription operation", () => {
      expect(getOperationType(USER_CHANNELS_SUBSCRIPTION)).toBe("subscription");
    });

    it("should have correct operation name", () => {
      expect(getOperationName(USER_CHANNELS_SUBSCRIPTION)).toBe("UserChannels");
    });

    it("should have required userId variable", () => {
      const variables = getVariableNames(USER_CHANNELS_SUBSCRIPTION);
      expect(variables).toContain("userId");
    });

    it("should have userId as uuid! type", () => {
      expect(getVariableType(USER_CHANNELS_SUBSCRIPTION, "userId")).toBe(
        "uuid!",
      );
    });
  });

  describe("CHANNEL_DETAILS_SUBSCRIPTION", () => {
    it("should be a valid GraphQL document", () => {
      expect(CHANNEL_DETAILS_SUBSCRIPTION).toBeDefined();
      expect(CHANNEL_DETAILS_SUBSCRIPTION.kind).toBe("Document");
    });

    it("should be a subscription operation", () => {
      expect(getOperationType(CHANNEL_DETAILS_SUBSCRIPTION)).toBe(
        "subscription",
      );
    });

    it("should have correct operation name", () => {
      expect(getOperationName(CHANNEL_DETAILS_SUBSCRIPTION)).toBe(
        "ChannelDetails",
      );
    });

    it("should have required channelId variable", () => {
      const variables = getVariableNames(CHANNEL_DETAILS_SUBSCRIPTION);
      expect(variables).toContain("channelId");
    });

    it("should have channelId as uuid! type", () => {
      expect(getVariableType(CHANNEL_DETAILS_SUBSCRIPTION, "channelId")).toBe(
        "uuid!",
      );
    });
  });

  describe("CHANNEL_MEMBERS_SUBSCRIPTION", () => {
    it("should be a valid GraphQL document", () => {
      expect(CHANNEL_MEMBERS_SUBSCRIPTION).toBeDefined();
      expect(CHANNEL_MEMBERS_SUBSCRIPTION.kind).toBe("Document");
    });

    it("should be a subscription operation", () => {
      expect(getOperationType(CHANNEL_MEMBERS_SUBSCRIPTION)).toBe(
        "subscription",
      );
    });

    it("should have correct operation name", () => {
      expect(getOperationName(CHANNEL_MEMBERS_SUBSCRIPTION)).toBe(
        "ChannelMembers",
      );
    });

    it("should have required channelId variable", () => {
      const variables = getVariableNames(CHANNEL_MEMBERS_SUBSCRIPTION);
      expect(variables).toContain("channelId");
    });

    it("should have channelId as uuid! type", () => {
      expect(getVariableType(CHANNEL_MEMBERS_SUBSCRIPTION, "channelId")).toBe(
        "uuid!",
      );
    });
  });
});

// ============================================================================
// Presence Subscription Tests
// ============================================================================

describe("Presence Subscriptions", () => {
  describe("USER_PRESENCE_SUBSCRIPTION", () => {
    it("should be a valid GraphQL document", () => {
      expect(USER_PRESENCE_SUBSCRIPTION).toBeDefined();
      expect(USER_PRESENCE_SUBSCRIPTION.kind).toBe("Document");
    });

    it("should be a subscription operation", () => {
      expect(getOperationType(USER_PRESENCE_SUBSCRIPTION)).toBe("subscription");
    });

    it("should have correct operation name", () => {
      expect(getOperationName(USER_PRESENCE_SUBSCRIPTION)).toBe("UserPresence");
    });

    it("should have required userIds variable", () => {
      const variables = getVariableNames(USER_PRESENCE_SUBSCRIPTION);
      expect(variables).toContain("userIds");
    });

    it("should have userIds as [uuid!]! type", () => {
      expect(getVariableType(USER_PRESENCE_SUBSCRIPTION, "userIds")).toBe(
        "[uuid!]!",
      );
    });
  });

  describe("CHANNEL_PRESENCE_SUBSCRIPTION", () => {
    it("should be a valid GraphQL document", () => {
      expect(CHANNEL_PRESENCE_SUBSCRIPTION).toBeDefined();
      expect(CHANNEL_PRESENCE_SUBSCRIPTION.kind).toBe("Document");
    });

    it("should be a subscription operation", () => {
      expect(getOperationType(CHANNEL_PRESENCE_SUBSCRIPTION)).toBe(
        "subscription",
      );
    });

    it("should have correct operation name", () => {
      expect(getOperationName(CHANNEL_PRESENCE_SUBSCRIPTION)).toBe(
        "ChannelPresence",
      );
    });

    it("should have required channelId variable", () => {
      const variables = getVariableNames(CHANNEL_PRESENCE_SUBSCRIPTION);
      expect(variables).toContain("channelId");
    });

    it("should have channelId as uuid! type", () => {
      expect(getVariableType(CHANNEL_PRESENCE_SUBSCRIPTION, "channelId")).toBe(
        "uuid!",
      );
    });
  });
});

// ============================================================================
// Read Receipt Subscription Tests
// ============================================================================

describe("Read Receipt Subscriptions", () => {
  describe("CHANNEL_READ_STATUS_SUBSCRIPTION", () => {
    it("should be a valid GraphQL document", () => {
      expect(CHANNEL_READ_STATUS_SUBSCRIPTION).toBeDefined();
      expect(CHANNEL_READ_STATUS_SUBSCRIPTION.kind).toBe("Document");
    });

    it("should be a subscription operation", () => {
      expect(getOperationType(CHANNEL_READ_STATUS_SUBSCRIPTION)).toBe(
        "subscription",
      );
    });

    it("should have correct operation name", () => {
      expect(getOperationName(CHANNEL_READ_STATUS_SUBSCRIPTION)).toBe(
        "ChannelReadStatus",
      );
    });

    it("should have required channelId variable", () => {
      const variables = getVariableNames(CHANNEL_READ_STATUS_SUBSCRIPTION);
      expect(variables).toContain("channelId");
    });

    it("should have channelId as uuid! type", () => {
      expect(
        getVariableType(CHANNEL_READ_STATUS_SUBSCRIPTION, "channelId"),
      ).toBe("uuid!");
    });
  });

  describe("USER_UNREAD_COUNTS_SUBSCRIPTION", () => {
    it("should be a valid GraphQL document", () => {
      expect(USER_UNREAD_COUNTS_SUBSCRIPTION).toBeDefined();
      expect(USER_UNREAD_COUNTS_SUBSCRIPTION.kind).toBe("Document");
    });

    it("should be a subscription operation", () => {
      expect(getOperationType(USER_UNREAD_COUNTS_SUBSCRIPTION)).toBe(
        "subscription",
      );
    });

    it("should have correct operation name", () => {
      expect(getOperationName(USER_UNREAD_COUNTS_SUBSCRIPTION)).toBe(
        "UserUnreadCounts",
      );
    });

    it("should have required userId variable", () => {
      const variables = getVariableNames(USER_UNREAD_COUNTS_SUBSCRIPTION);
      expect(variables).toContain("userId");
    });

    it("should have userId as uuid! type", () => {
      expect(getVariableType(USER_UNREAD_COUNTS_SUBSCRIPTION, "userId")).toBe(
        "uuid!",
      );
    });
  });
});

// ============================================================================
// Reaction Subscription Tests
// ============================================================================

describe("Reaction Subscriptions", () => {
  describe("MESSAGE_REACTIONS_SUBSCRIPTION", () => {
    it("should be a valid GraphQL document", () => {
      expect(MESSAGE_REACTIONS_SUBSCRIPTION).toBeDefined();
      expect(MESSAGE_REACTIONS_SUBSCRIPTION.kind).toBe("Document");
    });

    it("should be a subscription operation", () => {
      expect(getOperationType(MESSAGE_REACTIONS_SUBSCRIPTION)).toBe(
        "subscription",
      );
    });

    it("should have correct operation name", () => {
      expect(getOperationName(MESSAGE_REACTIONS_SUBSCRIPTION)).toBe(
        "MessageReactions",
      );
    });

    it("should have required messageId variable", () => {
      const variables = getVariableNames(MESSAGE_REACTIONS_SUBSCRIPTION);
      expect(variables).toContain("messageId");
    });

    it("should have messageId as uuid! type", () => {
      expect(getVariableType(MESSAGE_REACTIONS_SUBSCRIPTION, "messageId")).toBe(
        "uuid!",
      );
    });
  });

  describe("MESSAGE_REACTION_COUNTS_SUBSCRIPTION", () => {
    it("should be a valid GraphQL document", () => {
      expect(MESSAGE_REACTION_COUNTS_SUBSCRIPTION).toBeDefined();
      expect(MESSAGE_REACTION_COUNTS_SUBSCRIPTION.kind).toBe("Document");
    });

    it("should be a subscription operation", () => {
      expect(getOperationType(MESSAGE_REACTION_COUNTS_SUBSCRIPTION)).toBe(
        "subscription",
      );
    });

    it("should have correct operation name", () => {
      expect(getOperationName(MESSAGE_REACTION_COUNTS_SUBSCRIPTION)).toBe(
        "MessageReactionCounts",
      );
    });

    it("should have required messageId variable", () => {
      const variables = getVariableNames(MESSAGE_REACTION_COUNTS_SUBSCRIPTION);
      expect(variables).toContain("messageId");
    });

    it("should have messageId as uuid! type", () => {
      expect(
        getVariableType(MESSAGE_REACTION_COUNTS_SUBSCRIPTION, "messageId"),
      ).toBe("uuid!");
    });
  });

  describe("CHANNEL_REACTIONS_SUBSCRIPTION", () => {
    it("should be a valid GraphQL document", () => {
      expect(CHANNEL_REACTIONS_SUBSCRIPTION).toBeDefined();
      expect(CHANNEL_REACTIONS_SUBSCRIPTION.kind).toBe("Document");
    });

    it("should be a subscription operation", () => {
      expect(getOperationType(CHANNEL_REACTIONS_SUBSCRIPTION)).toBe(
        "subscription",
      );
    });

    it("should have correct operation name", () => {
      expect(getOperationName(CHANNEL_REACTIONS_SUBSCRIPTION)).toBe(
        "ChannelReactions",
      );
    });

    it("should have required channelId variable", () => {
      const variables = getVariableNames(CHANNEL_REACTIONS_SUBSCRIPTION);
      expect(variables).toContain("channelId");
    });

    it("should have required messageIds variable", () => {
      const variables = getVariableNames(CHANNEL_REACTIONS_SUBSCRIPTION);
      expect(variables).toContain("messageIds");
    });

    it("should have channelId as uuid! type", () => {
      expect(getVariableType(CHANNEL_REACTIONS_SUBSCRIPTION, "channelId")).toBe(
        "uuid!",
      );
    });

    it("should have messageIds as [uuid!]! type", () => {
      expect(
        getVariableType(CHANNEL_REACTIONS_SUBSCRIPTION, "messageIds"),
      ).toBe("[uuid!]!");
    });
  });
});

// ============================================================================
// Subscription Variable Validation Tests
// ============================================================================

describe("Subscription Variable Validation", () => {
  it("all message subscriptions should require channelId", () => {
    const messageSubscriptions = [
      CHANNEL_MESSAGES_SUBSCRIPTION,
      NEW_MESSAGE_SUBSCRIPTION,
    ];

    messageSubscriptions.forEach((subscription) => {
      const variables = getVariableNames(subscription);
      expect(variables).toContain("channelId");
    });
  });

  it("all presence subscriptions should use uuid types", () => {
    const presenceSubscriptions = [
      { doc: USER_PRESENCE_SUBSCRIPTION, var: "userIds", type: "[uuid!]!" },
      { doc: CHANNEL_PRESENCE_SUBSCRIPTION, var: "channelId", type: "uuid!" },
    ];

    presenceSubscriptions.forEach(({ doc, var: varName, type }) => {
      expect(getVariableType(doc, varName)).toBe(type);
    });
  });

  it("all reaction subscriptions should use correct variable types", () => {
    expect(getVariableType(MESSAGE_REACTIONS_SUBSCRIPTION, "messageId")).toBe(
      "uuid!",
    );
    expect(
      getVariableType(MESSAGE_REACTION_COUNTS_SUBSCRIPTION, "messageId"),
    ).toBe("uuid!");
    expect(getVariableType(CHANNEL_REACTIONS_SUBSCRIPTION, "channelId")).toBe(
      "uuid!",
    );
    expect(getVariableType(CHANNEL_REACTIONS_SUBSCRIPTION, "messageIds")).toBe(
      "[uuid!]!",
    );
  });
});

// ============================================================================
// Document Structure Tests
// ============================================================================

describe("Subscription Document Structure", () => {
  const allSubscriptions = [
    {
      name: "CHANNEL_MESSAGES_SUBSCRIPTION",
      doc: CHANNEL_MESSAGES_SUBSCRIPTION,
    },
    { name: "NEW_MESSAGE_SUBSCRIPTION", doc: NEW_MESSAGE_SUBSCRIPTION },
    { name: "USER_CHANNELS_SUBSCRIPTION", doc: USER_CHANNELS_SUBSCRIPTION },
    { name: "CHANNEL_DETAILS_SUBSCRIPTION", doc: CHANNEL_DETAILS_SUBSCRIPTION },
    { name: "CHANNEL_MEMBERS_SUBSCRIPTION", doc: CHANNEL_MEMBERS_SUBSCRIPTION },
    { name: "USER_PRESENCE_SUBSCRIPTION", doc: USER_PRESENCE_SUBSCRIPTION },
    {
      name: "CHANNEL_PRESENCE_SUBSCRIPTION",
      doc: CHANNEL_PRESENCE_SUBSCRIPTION,
    },
    {
      name: "CHANNEL_READ_STATUS_SUBSCRIPTION",
      doc: CHANNEL_READ_STATUS_SUBSCRIPTION,
    },
    {
      name: "USER_UNREAD_COUNTS_SUBSCRIPTION",
      doc: USER_UNREAD_COUNTS_SUBSCRIPTION,
    },
    {
      name: "MESSAGE_REACTIONS_SUBSCRIPTION",
      doc: MESSAGE_REACTIONS_SUBSCRIPTION,
    },
    {
      name: "MESSAGE_REACTION_COUNTS_SUBSCRIPTION",
      doc: MESSAGE_REACTION_COUNTS_SUBSCRIPTION,
    },
    {
      name: "CHANNEL_REACTIONS_SUBSCRIPTION",
      doc: CHANNEL_REACTIONS_SUBSCRIPTION,
    },
  ];

  allSubscriptions.forEach(({ name, doc }) => {
    it(`${name} should have at least one definition`, () => {
      expect(doc.definitions.length).toBeGreaterThan(0);
    });

    it(`${name} should have exactly one operation definition`, () => {
      const operationDefs = doc.definitions.filter(
        (def) => def.kind === "OperationDefinition",
      );
      expect(operationDefs).toHaveLength(1);
    });

    it(`${name} should be a subscription type`, () => {
      expect(getOperationType(doc)).toBe("subscription");
    });

    it(`${name} should have a named operation`, () => {
      expect(getOperationName(doc)).toBeDefined();
    });
  });
});
