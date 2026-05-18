import { DocumentNode } from "@apollo/client";
import {
  SEND_MESSAGE,
  UPDATE_MESSAGE,
  DELETE_MESSAGE,
} from "../mutations/messages";
import {
  CREATE_CHANNEL,
  UPDATE_CHANNEL,
  JOIN_CHANNEL,
  LEAVE_CHANNEL,
} from "../mutations/channels";
import { UPDATE_PRESENCE, HEARTBEAT } from "../mutations/presence";
import {
  MARK_CHANNEL_READ,
  UPDATE_LAST_READ,
} from "../mutations/read-receipts";
import {
  ADD_REACTION,
  REMOVE_REACTION,
  TOGGLE_REACTION,
} from "../mutations/reactions";

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

function isVariableRequired(doc: DocumentNode, varName: string): boolean {
  const varType = getVariableType(doc, varName);
  return varType ? varType.endsWith("!") : false;
}

function getSelectionFields(doc: DocumentNode): string[] {
  const definition = doc.definitions.find(
    (def) => def.kind === "OperationDefinition",
  );
  if (definition && definition.kind === "OperationDefinition") {
    const firstSelection = definition.selectionSet.selections[0];
    if (
      firstSelection &&
      firstSelection.kind === "Field" &&
      firstSelection.selectionSet
    ) {
      return firstSelection.selectionSet.selections
        .filter(
          (sel): sel is { kind: "Field"; name: { value: string } } =>
            sel.kind === "Field",
        )
        .map((sel) => sel.name.value);
    }
  }
  return [];
}

// ============================================================================
// Message Mutation Tests
// ============================================================================

describe("Message Mutations", () => {
  describe("SEND_MESSAGE", () => {
    it("should be a valid GraphQL document", () => {
      expect(SEND_MESSAGE).toBeDefined();
      expect(SEND_MESSAGE.kind).toBe("Document");
    });

    it("should be a mutation operation", () => {
      expect(getOperationType(SEND_MESSAGE)).toBe("mutation");
    });

    it("should have correct operation name", () => {
      expect(getOperationName(SEND_MESSAGE)).toBe("SendMessage");
    });

    it("should have required channelId variable", () => {
      expect(getVariableNames(SEND_MESSAGE)).toContain("channelId");
      expect(isVariableRequired(SEND_MESSAGE, "channelId")).toBe(true);
    });

    it("should have required content variable", () => {
      expect(getVariableNames(SEND_MESSAGE)).toContain("content");
      expect(isVariableRequired(SEND_MESSAGE, "content")).toBe(true);
    });

    it("should have optional replyToId variable", () => {
      expect(getVariableNames(SEND_MESSAGE)).toContain("replyToId");
      expect(isVariableRequired(SEND_MESSAGE, "replyToId")).toBe(false);
    });

    it("should have correct variable types", () => {
      expect(getVariableType(SEND_MESSAGE, "channelId")).toBe("uuid!");
      expect(getVariableType(SEND_MESSAGE, "content")).toBe("String!");
      expect(getVariableType(SEND_MESSAGE, "replyToId")).toBe("uuid");
    });

    it("should return message fields", () => {
      const fields = getSelectionFields(SEND_MESSAGE);
      expect(fields).toContain("id");
      expect(fields).toContain("content");
      expect(fields).toContain("created_at");
      expect(fields).toContain("channel_id");
    });
  });

  describe("UPDATE_MESSAGE", () => {
    it("should be a valid GraphQL document", () => {
      expect(UPDATE_MESSAGE).toBeDefined();
      expect(UPDATE_MESSAGE.kind).toBe("Document");
    });

    it("should be a mutation operation", () => {
      expect(getOperationType(UPDATE_MESSAGE)).toBe("mutation");
    });

    it("should have correct operation name", () => {
      expect(getOperationName(UPDATE_MESSAGE)).toBe("UpdateMessage");
    });

    it("should have required messageId variable", () => {
      expect(getVariableNames(UPDATE_MESSAGE)).toContain("messageId");
      expect(isVariableRequired(UPDATE_MESSAGE, "messageId")).toBe(true);
    });

    it("should have required content variable", () => {
      expect(getVariableNames(UPDATE_MESSAGE)).toContain("content");
      expect(isVariableRequired(UPDATE_MESSAGE, "content")).toBe(true);
    });

    it("should have correct variable types", () => {
      expect(getVariableType(UPDATE_MESSAGE, "messageId")).toBe("uuid!");
      expect(getVariableType(UPDATE_MESSAGE, "content")).toBe("String!");
    });

    it("should return updated message fields", () => {
      const fields = getSelectionFields(UPDATE_MESSAGE);
      expect(fields).toContain("id");
      expect(fields).toContain("content");
      expect(fields).toContain("updated_at");
    });
  });

  describe("DELETE_MESSAGE", () => {
    it("should be a valid GraphQL document", () => {
      expect(DELETE_MESSAGE).toBeDefined();
      expect(DELETE_MESSAGE.kind).toBe("Document");
    });

    it("should be a mutation operation", () => {
      expect(getOperationType(DELETE_MESSAGE)).toBe("mutation");
    });

    it("should have correct operation name", () => {
      expect(getOperationName(DELETE_MESSAGE)).toBe("DeleteMessage");
    });

    it("should have required messageId variable", () => {
      expect(getVariableNames(DELETE_MESSAGE)).toContain("messageId");
      expect(isVariableRequired(DELETE_MESSAGE, "messageId")).toBe(true);
    });

    it("should have only one required variable", () => {
      const variables = getVariableNames(DELETE_MESSAGE);
      expect(variables).toHaveLength(1);
    });

    it("should have correct variable type", () => {
      expect(getVariableType(DELETE_MESSAGE, "messageId")).toBe("uuid!");
    });

    it("should return deleted message id", () => {
      const fields = getSelectionFields(DELETE_MESSAGE);
      expect(fields).toContain("id");
    });
  });
});

// ============================================================================
// Channel Mutation Tests
// ============================================================================

describe("Channel Mutations", () => {
  describe("CREATE_CHANNEL", () => {
    it("should be a valid GraphQL document", () => {
      expect(CREATE_CHANNEL).toBeDefined();
      expect(CREATE_CHANNEL.kind).toBe("Document");
    });

    it("should be a mutation operation", () => {
      expect(getOperationType(CREATE_CHANNEL)).toBe("mutation");
    });

    it("should have correct operation name", () => {
      expect(getOperationName(CREATE_CHANNEL)).toBe("CreateChannel");
    });

    it("should have required name variable", () => {
      expect(getVariableNames(CREATE_CHANNEL)).toContain("name");
      expect(isVariableRequired(CREATE_CHANNEL, "name")).toBe(true);
    });

    it("should have optional description variable", () => {
      expect(getVariableNames(CREATE_CHANNEL)).toContain("description");
      expect(isVariableRequired(CREATE_CHANNEL, "description")).toBe(false);
    });

    it("should have required type variable", () => {
      expect(getVariableNames(CREATE_CHANNEL)).toContain("type");
      expect(isVariableRequired(CREATE_CHANNEL, "type")).toBe(true);
    });

    it("should have required isPrivate variable", () => {
      expect(getVariableNames(CREATE_CHANNEL)).toContain("isPrivate");
      expect(isVariableRequired(CREATE_CHANNEL, "isPrivate")).toBe(true);
    });

    it("should have correct variable types", () => {
      expect(getVariableType(CREATE_CHANNEL, "name")).toBe("String!");
      expect(getVariableType(CREATE_CHANNEL, "description")).toBe("String");
      expect(getVariableType(CREATE_CHANNEL, "type")).toBe("String!");
      expect(getVariableType(CREATE_CHANNEL, "isPrivate")).toBe("Boolean!");
    });

    it("should return channel fields", () => {
      const fields = getSelectionFields(CREATE_CHANNEL);
      expect(fields).toContain("id");
      expect(fields).toContain("name");
      expect(fields).toContain("type");
    });
  });

  describe("UPDATE_CHANNEL", () => {
    it("should be a valid GraphQL document", () => {
      expect(UPDATE_CHANNEL).toBeDefined();
      expect(UPDATE_CHANNEL.kind).toBe("Document");
    });

    it("should be a mutation operation", () => {
      expect(getOperationType(UPDATE_CHANNEL)).toBe("mutation");
    });

    it("should have correct operation name", () => {
      expect(getOperationName(UPDATE_CHANNEL)).toBe("UpdateChannel");
    });

    it("should have required channelId variable", () => {
      expect(getVariableNames(UPDATE_CHANNEL)).toContain("channelId");
      expect(isVariableRequired(UPDATE_CHANNEL, "channelId")).toBe(true);
    });

    it("should have optional update fields", () => {
      const variables = getVariableNames(UPDATE_CHANNEL);
      expect(variables).toContain("name");
      expect(variables).toContain("description");
      expect(variables).toContain("topic");
      expect(isVariableRequired(UPDATE_CHANNEL, "name")).toBe(false);
      expect(isVariableRequired(UPDATE_CHANNEL, "description")).toBe(false);
      expect(isVariableRequired(UPDATE_CHANNEL, "topic")).toBe(false);
    });

    it("should return updated channel fields", () => {
      const fields = getSelectionFields(UPDATE_CHANNEL);
      expect(fields).toContain("id");
      expect(fields).toContain("name");
      expect(fields).toContain("description");
      expect(fields).toContain("topic");
    });
  });

  describe("JOIN_CHANNEL", () => {
    it("should be a valid GraphQL document", () => {
      expect(JOIN_CHANNEL).toBeDefined();
      expect(JOIN_CHANNEL.kind).toBe("Document");
    });

    it("should be a mutation operation", () => {
      expect(getOperationType(JOIN_CHANNEL)).toBe("mutation");
    });

    it("should have correct operation name", () => {
      expect(getOperationName(JOIN_CHANNEL)).toBe("JoinChannel");
    });

    it("should have required channelId variable", () => {
      expect(getVariableNames(JOIN_CHANNEL)).toContain("channelId");
      expect(isVariableRequired(JOIN_CHANNEL, "channelId")).toBe(true);
    });

    it("should have required userId variable", () => {
      expect(getVariableNames(JOIN_CHANNEL)).toContain("userId");
      expect(isVariableRequired(JOIN_CHANNEL, "userId")).toBe(true);
    });

    it("should have correct variable types", () => {
      expect(getVariableType(JOIN_CHANNEL, "channelId")).toBe("uuid!");
      expect(getVariableType(JOIN_CHANNEL, "userId")).toBe("uuid!");
    });

    it("should return membership fields", () => {
      const fields = getSelectionFields(JOIN_CHANNEL);
      expect(fields).toContain("channel_id");
      expect(fields).toContain("user_id");
    });
  });

  describe("LEAVE_CHANNEL", () => {
    it("should be a valid GraphQL document", () => {
      expect(LEAVE_CHANNEL).toBeDefined();
      expect(LEAVE_CHANNEL.kind).toBe("Document");
    });

    it("should be a mutation operation", () => {
      expect(getOperationType(LEAVE_CHANNEL)).toBe("mutation");
    });

    it("should have correct operation name", () => {
      expect(getOperationName(LEAVE_CHANNEL)).toBe("LeaveChannel");
    });

    it("should have required channelId variable", () => {
      expect(getVariableNames(LEAVE_CHANNEL)).toContain("channelId");
      expect(isVariableRequired(LEAVE_CHANNEL, "channelId")).toBe(true);
    });

    it("should have required userId variable", () => {
      expect(getVariableNames(LEAVE_CHANNEL)).toContain("userId");
      expect(isVariableRequired(LEAVE_CHANNEL, "userId")).toBe(true);
    });

    it("should return affected_rows", () => {
      const fields = getSelectionFields(LEAVE_CHANNEL);
      expect(fields).toContain("affected_rows");
    });
  });
});

// ============================================================================
// Presence Mutation Tests
// ============================================================================

describe("Presence Mutations", () => {
  describe("UPDATE_PRESENCE", () => {
    it("should be a valid GraphQL document", () => {
      expect(UPDATE_PRESENCE).toBeDefined();
      expect(UPDATE_PRESENCE.kind).toBe("Document");
    });

    it("should be a mutation operation", () => {
      expect(getOperationType(UPDATE_PRESENCE)).toBe("mutation");
    });

    it("should have correct operation name", () => {
      expect(getOperationName(UPDATE_PRESENCE)).toBe("UpdatePresence");
    });

    it("should have required userId variable", () => {
      expect(getVariableNames(UPDATE_PRESENCE)).toContain("userId");
      expect(isVariableRequired(UPDATE_PRESENCE, "userId")).toBe(true);
    });

    it("should have required status variable", () => {
      expect(getVariableNames(UPDATE_PRESENCE)).toContain("status");
      expect(isVariableRequired(UPDATE_PRESENCE, "status")).toBe(true);
    });

    it("should have optional customStatus variable", () => {
      expect(getVariableNames(UPDATE_PRESENCE)).toContain("customStatus");
      expect(isVariableRequired(UPDATE_PRESENCE, "customStatus")).toBe(false);
    });

    it("should have optional customStatusEmoji variable", () => {
      expect(getVariableNames(UPDATE_PRESENCE)).toContain("customStatusEmoji");
      expect(isVariableRequired(UPDATE_PRESENCE, "customStatusEmoji")).toBe(
        false,
      );
    });

    it("should have correct variable types", () => {
      expect(getVariableType(UPDATE_PRESENCE, "userId")).toBe("uuid!");
      expect(getVariableType(UPDATE_PRESENCE, "status")).toBe("String!");
      expect(getVariableType(UPDATE_PRESENCE, "customStatus")).toBe("String");
      expect(getVariableType(UPDATE_PRESENCE, "customStatusEmoji")).toBe(
        "String",
      );
    });

    it("should return presence fields", () => {
      const fields = getSelectionFields(UPDATE_PRESENCE);
      expect(fields).toContain("user_id");
      expect(fields).toContain("status");
      expect(fields).toContain("last_seen");
    });
  });

  describe("HEARTBEAT", () => {
    it("should be a valid GraphQL document", () => {
      expect(HEARTBEAT).toBeDefined();
      expect(HEARTBEAT.kind).toBe("Document");
    });

    it("should be a mutation operation", () => {
      expect(getOperationType(HEARTBEAT)).toBe("mutation");
    });

    it("should have correct operation name", () => {
      expect(getOperationName(HEARTBEAT)).toBe("Heartbeat");
    });

    it("should have only userId variable", () => {
      const variables = getVariableNames(HEARTBEAT);
      expect(variables).toHaveLength(1);
      expect(variables).toContain("userId");
    });

    it("should have required userId variable", () => {
      expect(isVariableRequired(HEARTBEAT, "userId")).toBe(true);
    });

    it("should have correct variable type", () => {
      expect(getVariableType(HEARTBEAT, "userId")).toBe("uuid!");
    });

    it("should return heartbeat fields", () => {
      const fields = getSelectionFields(HEARTBEAT);
      expect(fields).toContain("user_id");
      expect(fields).toContain("last_seen");
    });
  });
});

// ============================================================================
// Read Receipt Mutation Tests
// ============================================================================

describe("Read Receipt Mutations", () => {
  describe("MARK_CHANNEL_READ", () => {
    it("should be a valid GraphQL document", () => {
      expect(MARK_CHANNEL_READ).toBeDefined();
      expect(MARK_CHANNEL_READ.kind).toBe("Document");
    });

    it("should be a mutation operation", () => {
      expect(getOperationType(MARK_CHANNEL_READ)).toBe("mutation");
    });

    it("should have correct operation name", () => {
      expect(getOperationName(MARK_CHANNEL_READ)).toBe("MarkChannelRead");
    });

    it("should have required channelId variable", () => {
      expect(getVariableNames(MARK_CHANNEL_READ)).toContain("channelId");
      expect(isVariableRequired(MARK_CHANNEL_READ, "channelId")).toBe(true);
    });

    it("should have required userId variable", () => {
      expect(getVariableNames(MARK_CHANNEL_READ)).toContain("userId");
      expect(isVariableRequired(MARK_CHANNEL_READ, "userId")).toBe(true);
    });

    it("should have required messageId variable", () => {
      expect(getVariableNames(MARK_CHANNEL_READ)).toContain("messageId");
      expect(isVariableRequired(MARK_CHANNEL_READ, "messageId")).toBe(true);
    });

    it("should have correct variable types", () => {
      expect(getVariableType(MARK_CHANNEL_READ, "channelId")).toBe("uuid!");
      expect(getVariableType(MARK_CHANNEL_READ, "userId")).toBe("uuid!");
      expect(getVariableType(MARK_CHANNEL_READ, "messageId")).toBe("uuid!");
    });

    it("should return read status fields", () => {
      const fields = getSelectionFields(MARK_CHANNEL_READ);
      expect(fields).toContain("channel_id");
      expect(fields).toContain("last_read_at");
    });
  });

  describe("UPDATE_LAST_READ", () => {
    it("should be a valid GraphQL document", () => {
      expect(UPDATE_LAST_READ).toBeDefined();
      expect(UPDATE_LAST_READ.kind).toBe("Document");
    });

    it("should be a mutation operation", () => {
      expect(getOperationType(UPDATE_LAST_READ)).toBe("mutation");
    });

    it("should have correct operation name", () => {
      expect(getOperationName(UPDATE_LAST_READ)).toBe("UpdateLastRead");
    });

    it("should have required channelId variable", () => {
      expect(getVariableNames(UPDATE_LAST_READ)).toContain("channelId");
      expect(isVariableRequired(UPDATE_LAST_READ, "channelId")).toBe(true);
    });

    it("should have required userId variable", () => {
      expect(getVariableNames(UPDATE_LAST_READ)).toContain("userId");
      expect(isVariableRequired(UPDATE_LAST_READ, "userId")).toBe(true);
    });

    it("should return affected_rows", () => {
      const fields = getSelectionFields(UPDATE_LAST_READ);
      expect(fields).toContain("affected_rows");
    });
  });
});

// ============================================================================
// Reaction Mutation Tests
// ============================================================================

describe("Reaction Mutations", () => {
  describe("ADD_REACTION", () => {
    it("should be a valid GraphQL document", () => {
      expect(ADD_REACTION).toBeDefined();
      expect(ADD_REACTION.kind).toBe("Document");
    });

    it("should be a mutation operation", () => {
      expect(getOperationType(ADD_REACTION)).toBe("mutation");
    });

    it("should have correct operation name", () => {
      expect(getOperationName(ADD_REACTION)).toBe("AddReaction");
    });

    it("should have required messageId variable", () => {
      expect(getVariableNames(ADD_REACTION)).toContain("messageId");
      expect(isVariableRequired(ADD_REACTION, "messageId")).toBe(true);
    });

    it("should have required emoji variable", () => {
      expect(getVariableNames(ADD_REACTION)).toContain("emoji");
      expect(isVariableRequired(ADD_REACTION, "emoji")).toBe(true);
    });

    it("should have correct variable types", () => {
      expect(getVariableType(ADD_REACTION, "messageId")).toBe("uuid!");
      expect(getVariableType(ADD_REACTION, "emoji")).toBe("String!");
    });

    it("should return reaction fields", () => {
      const fields = getSelectionFields(ADD_REACTION);
      expect(fields).toContain("id");
      expect(fields).toContain("emoji");
      expect(fields).toContain("message_id");
    });
  });

  describe("REMOVE_REACTION", () => {
    it("should be a valid GraphQL document", () => {
      expect(REMOVE_REACTION).toBeDefined();
      expect(REMOVE_REACTION.kind).toBe("Document");
    });

    it("should be a mutation operation", () => {
      expect(getOperationType(REMOVE_REACTION)).toBe("mutation");
    });

    it("should have correct operation name", () => {
      expect(getOperationName(REMOVE_REACTION)).toBe("RemoveReaction");
    });

    it("should have required messageId variable", () => {
      expect(getVariableNames(REMOVE_REACTION)).toContain("messageId");
      expect(isVariableRequired(REMOVE_REACTION, "messageId")).toBe(true);
    });

    it("should have required emoji variable", () => {
      expect(getVariableNames(REMOVE_REACTION)).toContain("emoji");
      expect(isVariableRequired(REMOVE_REACTION, "emoji")).toBe(true);
    });

    it("should have correct variable types", () => {
      expect(getVariableType(REMOVE_REACTION, "messageId")).toBe("uuid!");
      expect(getVariableType(REMOVE_REACTION, "emoji")).toBe("String!");
    });

    it("should return affected_rows", () => {
      const fields = getSelectionFields(REMOVE_REACTION);
      expect(fields).toContain("affected_rows");
    });
  });

  describe("TOGGLE_REACTION", () => {
    it("should be a valid GraphQL document", () => {
      expect(TOGGLE_REACTION).toBeDefined();
      expect(TOGGLE_REACTION.kind).toBe("Document");
    });

    it("should be a mutation operation", () => {
      expect(getOperationType(TOGGLE_REACTION)).toBe("mutation");
    });

    it("should have correct operation name", () => {
      expect(getOperationName(TOGGLE_REACTION)).toBe("ToggleReaction");
    });

    it("should have required messageId variable", () => {
      expect(getVariableNames(TOGGLE_REACTION)).toContain("messageId");
      expect(isVariableRequired(TOGGLE_REACTION, "messageId")).toBe(true);
    });

    it("should have required emoji variable", () => {
      expect(getVariableNames(TOGGLE_REACTION)).toContain("emoji");
      expect(isVariableRequired(TOGGLE_REACTION, "emoji")).toBe(true);
    });

    it("should have required userId variable", () => {
      expect(getVariableNames(TOGGLE_REACTION)).toContain("userId");
      expect(isVariableRequired(TOGGLE_REACTION, "userId")).toBe(true);
    });

    it("should have correct variable types", () => {
      expect(getVariableType(TOGGLE_REACTION, "messageId")).toBe("uuid!");
      expect(getVariableType(TOGGLE_REACTION, "emoji")).toBe("String!");
      expect(getVariableType(TOGGLE_REACTION, "userId")).toBe("uuid!");
    });
  });
});

// ============================================================================
// Mutation Document Structure Tests
// ============================================================================

describe("Mutation Document Structure", () => {
  const allMutations = [
    { name: "SEND_MESSAGE", doc: SEND_MESSAGE },
    { name: "UPDATE_MESSAGE", doc: UPDATE_MESSAGE },
    { name: "DELETE_MESSAGE", doc: DELETE_MESSAGE },
    { name: "CREATE_CHANNEL", doc: CREATE_CHANNEL },
    { name: "UPDATE_CHANNEL", doc: UPDATE_CHANNEL },
    { name: "JOIN_CHANNEL", doc: JOIN_CHANNEL },
    { name: "LEAVE_CHANNEL", doc: LEAVE_CHANNEL },
    { name: "UPDATE_PRESENCE", doc: UPDATE_PRESENCE },
    { name: "HEARTBEAT", doc: HEARTBEAT },
    { name: "MARK_CHANNEL_READ", doc: MARK_CHANNEL_READ },
    { name: "UPDATE_LAST_READ", doc: UPDATE_LAST_READ },
    { name: "ADD_REACTION", doc: ADD_REACTION },
    { name: "REMOVE_REACTION", doc: REMOVE_REACTION },
    { name: "TOGGLE_REACTION", doc: TOGGLE_REACTION },
  ];

  allMutations.forEach(({ name, doc }) => {
    it(`${name} should have at least one definition`, () => {
      expect(doc.definitions.length).toBeGreaterThan(0);
    });

    it(`${name} should have exactly one operation definition`, () => {
      const operationDefs = doc.definitions.filter(
        (def) => def.kind === "OperationDefinition",
      );
      expect(operationDefs).toHaveLength(1);
    });

    it(`${name} should be a mutation type`, () => {
      expect(getOperationType(doc)).toBe("mutation");
    });

    it(`${name} should have a named operation`, () => {
      expect(getOperationName(doc)).toBeDefined();
    });
  });
});

// ============================================================================
// Mutation Variable Consistency Tests
// ============================================================================

describe("Mutation Variable Consistency", () => {
  it("all message mutations should use uuid type for messageId", () => {
    expect(getVariableType(UPDATE_MESSAGE, "messageId")).toBe("uuid!");
    expect(getVariableType(DELETE_MESSAGE, "messageId")).toBe("uuid!");
  });

  it("all channel mutations should use uuid type for channelId", () => {
    expect(getVariableType(UPDATE_CHANNEL, "channelId")).toBe("uuid!");
    expect(getVariableType(JOIN_CHANNEL, "channelId")).toBe("uuid!");
    expect(getVariableType(LEAVE_CHANNEL, "channelId")).toBe("uuid!");
  });

  it("all user-related mutations should use uuid type for userId", () => {
    expect(getVariableType(JOIN_CHANNEL, "userId")).toBe("uuid!");
    expect(getVariableType(LEAVE_CHANNEL, "userId")).toBe("uuid!");
    expect(getVariableType(UPDATE_PRESENCE, "userId")).toBe("uuid!");
    expect(getVariableType(HEARTBEAT, "userId")).toBe("uuid!");
    expect(getVariableType(MARK_CHANNEL_READ, "userId")).toBe("uuid!");
    expect(getVariableType(UPDATE_LAST_READ, "userId")).toBe("uuid!");
    expect(getVariableType(TOGGLE_REACTION, "userId")).toBe("uuid!");
  });

  it("all reaction mutations should use String type for emoji", () => {
    expect(getVariableType(ADD_REACTION, "emoji")).toBe("String!");
    expect(getVariableType(REMOVE_REACTION, "emoji")).toBe("String!");
    expect(getVariableType(TOGGLE_REACTION, "emoji")).toBe("String!");
  });
});
