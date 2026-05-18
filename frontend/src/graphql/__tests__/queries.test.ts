import { DocumentNode } from "@apollo/client";
import {
  GET_CHANNELS,
  GET_CHANNEL_BY_SLUG,
  GET_USER_CHANNELS,
} from "../queries/channels";
import { GET_MESSAGES, MESSAGE_SUBSCRIPTION } from "../queries/messages";

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

function hasDefaultValue(doc: DocumentNode, varName: string): boolean {
  const definition = doc.definitions.find(
    (def) => def.kind === "OperationDefinition",
  );
  if (definition && definition.kind === "OperationDefinition") {
    const varDef = definition.variableDefinitions?.find(
      (v) => v.variable.name.value === varName,
    );
    return varDef?.defaultValue !== undefined;
  }
  return false;
}

function getDefaultValue(doc: DocumentNode, varName: string): any {
  const definition = doc.definitions.find(
    (def) => def.kind === "OperationDefinition",
  );
  if (definition && definition.kind === "OperationDefinition") {
    const varDef = definition.variableDefinitions?.find(
      (v) => v.variable.name.value === varName,
    );
    if (varDef?.defaultValue) {
      if (varDef.defaultValue.kind === "IntValue") {
        return parseInt(varDef.defaultValue.value, 10);
      }
      if (varDef.defaultValue.kind === "StringValue") {
        return varDef.defaultValue.value;
      }
      if (varDef.defaultValue.kind === "BooleanValue") {
        return varDef.defaultValue.value;
      }
    }
  }
  return undefined;
}

function getSelectionFieldNames(doc: DocumentNode): string[] {
  const definition = doc.definitions.find(
    (def) => def.kind === "OperationDefinition",
  );
  if (definition && definition.kind === "OperationDefinition") {
    return definition.selectionSet.selections
      .filter(
        (sel): sel is { kind: "Field"; name: { value: string } } =>
          sel.kind === "Field",
      )
      .map((sel) => sel.name.value);
  }
  return [];
}

function getNestedSelectionFields(
  doc: DocumentNode,
  rootField: string,
): string[] {
  const definition = doc.definitions.find(
    (def) => def.kind === "OperationDefinition",
  );
  if (definition && definition.kind === "OperationDefinition") {
    const rootSelection = definition.selectionSet.selections.find(
      (sel) => sel.kind === "Field" && sel.name.value === rootField,
    );
    if (
      rootSelection &&
      rootSelection.kind === "Field" &&
      rootSelection.selectionSet
    ) {
      return rootSelection.selectionSet.selections
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
// Channel Query Tests
// ============================================================================

describe("Channel Queries", () => {
  describe("GET_CHANNELS", () => {
    it("should be a valid GraphQL document", () => {
      expect(GET_CHANNELS).toBeDefined();
      expect(GET_CHANNELS.kind).toBe("Document");
    });

    it("should be a query operation", () => {
      expect(getOperationType(GET_CHANNELS)).toBe("query");
    });

    it("should have correct operation name", () => {
      expect(getOperationName(GET_CHANNELS)).toBe("GetChannels");
    });

    it("should have no required variables", () => {
      const variables = getVariableNames(GET_CHANNELS);
      expect(variables).toHaveLength(0);
    });

    it("should query nchat_channels", () => {
      const rootFields = getSelectionFieldNames(GET_CHANNELS);
      expect(rootFields).toContain("nchat_channels");
    });

    it("should select required channel fields", () => {
      const fields = getNestedSelectionFields(GET_CHANNELS, "nchat_channels");
      expect(fields).toContain("id");
      expect(fields).toContain("name");
      expect(fields).toContain("slug");
      expect(fields).toContain("description");
      expect(fields).toContain("type");
    });

    it("should include creator relationship", () => {
      const fields = getNestedSelectionFields(GET_CHANNELS, "nchat_channels");
      expect(fields).toContain("creator");
    });

    it("should include members_aggregate", () => {
      const fields = getNestedSelectionFields(GET_CHANNELS, "nchat_channels");
      expect(fields).toContain("members_aggregate");
    });
  });

  describe("GET_CHANNEL_BY_SLUG", () => {
    it("should be a valid GraphQL document", () => {
      expect(GET_CHANNEL_BY_SLUG).toBeDefined();
      expect(GET_CHANNEL_BY_SLUG.kind).toBe("Document");
    });

    it("should be a query operation", () => {
      expect(getOperationType(GET_CHANNEL_BY_SLUG)).toBe("query");
    });

    it("should have correct operation name", () => {
      expect(getOperationName(GET_CHANNEL_BY_SLUG)).toBe("GetChannelBySlug");
    });

    it("should have required slug variable", () => {
      expect(getVariableNames(GET_CHANNEL_BY_SLUG)).toContain("slug");
      expect(isVariableRequired(GET_CHANNEL_BY_SLUG, "slug")).toBe(true);
    });

    it("should have slug as String! type", () => {
      expect(getVariableType(GET_CHANNEL_BY_SLUG, "slug")).toBe("String!");
    });

    it("should query nchat_channels", () => {
      const rootFields = getSelectionFieldNames(GET_CHANNEL_BY_SLUG);
      expect(rootFields).toContain("nchat_channels");
    });

    it("should include members relationship", () => {
      const fields = getNestedSelectionFields(
        GET_CHANNEL_BY_SLUG,
        "nchat_channels",
      );
      expect(fields).toContain("members");
    });

    it("should include creator relationship", () => {
      const fields = getNestedSelectionFields(
        GET_CHANNEL_BY_SLUG,
        "nchat_channels",
      );
      expect(fields).toContain("creator");
    });
  });

  describe("GET_USER_CHANNELS", () => {
    it("should be a valid GraphQL document", () => {
      expect(GET_USER_CHANNELS).toBeDefined();
      expect(GET_USER_CHANNELS.kind).toBe("Document");
    });

    it("should be a query operation", () => {
      expect(getOperationType(GET_USER_CHANNELS)).toBe("query");
    });

    it("should have correct operation name", () => {
      expect(getOperationName(GET_USER_CHANNELS)).toBe("GetUserChannels");
    });

    it("should have required userId variable", () => {
      expect(getVariableNames(GET_USER_CHANNELS)).toContain("userId");
      expect(isVariableRequired(GET_USER_CHANNELS, "userId")).toBe(true);
    });

    it("should have userId as uuid! type", () => {
      expect(getVariableType(GET_USER_CHANNELS, "userId")).toBe("uuid!");
    });

    it("should query nchat_channel_members", () => {
      const rootFields = getSelectionFieldNames(GET_USER_CHANNELS);
      expect(rootFields).toContain("nchat_channel_members");
    });

    it("should include channel relationship", () => {
      const fields = getNestedSelectionFields(
        GET_USER_CHANNELS,
        "nchat_channel_members",
      );
      expect(fields).toContain("channel");
    });

    it("should include membership fields", () => {
      const fields = getNestedSelectionFields(
        GET_USER_CHANNELS,
        "nchat_channel_members",
      );
      expect(fields).toContain("joined_at");
      expect(fields).toContain("last_read_at");
    });
  });
});

// ============================================================================
// Message Query Tests
// ============================================================================

describe("Message Queries", () => {
  describe("GET_MESSAGES", () => {
    it("should be a valid GraphQL document", () => {
      expect(GET_MESSAGES).toBeDefined();
      expect(GET_MESSAGES.kind).toBe("Document");
    });

    it("should be a query operation", () => {
      expect(getOperationType(GET_MESSAGES)).toBe("query");
    });

    it("should have correct operation name", () => {
      expect(getOperationName(GET_MESSAGES)).toBe("GetMessages");
    });

    it("should have required channelId variable", () => {
      expect(getVariableNames(GET_MESSAGES)).toContain("channelId");
      expect(isVariableRequired(GET_MESSAGES, "channelId")).toBe(true);
    });

    it("should have channelId as uuid! type", () => {
      expect(getVariableType(GET_MESSAGES, "channelId")).toBe("uuid!");
    });

    it("should have optional limit variable with default", () => {
      expect(getVariableNames(GET_MESSAGES)).toContain("limit");
      expect(hasDefaultValue(GET_MESSAGES, "limit")).toBe(true);
      expect(getDefaultValue(GET_MESSAGES, "limit")).toBe(50);
    });

    it("should have optional offset variable with default", () => {
      expect(getVariableNames(GET_MESSAGES)).toContain("offset");
      expect(hasDefaultValue(GET_MESSAGES, "offset")).toBe(true);
      expect(getDefaultValue(GET_MESSAGES, "offset")).toBe(0);
    });

    it("should have limit as Int type", () => {
      expect(getVariableType(GET_MESSAGES, "limit")).toBe("Int");
    });

    it("should have offset as Int type", () => {
      expect(getVariableType(GET_MESSAGES, "offset")).toBe("Int");
    });

    it("should query nchat_messages", () => {
      const rootFields = getSelectionFieldNames(GET_MESSAGES);
      expect(rootFields).toContain("nchat_messages");
    });

    it("should select essential message fields", () => {
      const fields = getNestedSelectionFields(GET_MESSAGES, "nchat_messages");
      expect(fields).toContain("id");
      expect(fields).toContain("content");
      expect(fields).toContain("type");
      expect(fields).toContain("created_at");
    });

    it("should include user relationship", () => {
      const fields = getNestedSelectionFields(GET_MESSAGES, "nchat_messages");
      expect(fields).toContain("user");
    });

    it("should include reactions", () => {
      const fields = getNestedSelectionFields(GET_MESSAGES, "nchat_messages");
      expect(fields).toContain("reactions");
      expect(fields).toContain("reactions_aggregate");
    });

    it("should include attachments", () => {
      const fields = getNestedSelectionFields(GET_MESSAGES, "nchat_messages");
      expect(fields).toContain("attachments");
    });

    it("should include parent for replies", () => {
      const fields = getNestedSelectionFields(GET_MESSAGES, "nchat_messages");
      expect(fields).toContain("parent");
    });
  });

  describe("MESSAGE_SUBSCRIPTION", () => {
    it("should be a valid GraphQL document", () => {
      expect(MESSAGE_SUBSCRIPTION).toBeDefined();
      expect(MESSAGE_SUBSCRIPTION.kind).toBe("Document");
    });

    it("should be a subscription operation", () => {
      expect(getOperationType(MESSAGE_SUBSCRIPTION)).toBe("subscription");
    });

    it("should have correct operation name", () => {
      expect(getOperationName(MESSAGE_SUBSCRIPTION)).toBe(
        "MessageSubscription",
      );
    });

    it("should have required channelId variable", () => {
      expect(getVariableNames(MESSAGE_SUBSCRIPTION)).toContain("channelId");
      expect(isVariableRequired(MESSAGE_SUBSCRIPTION, "channelId")).toBe(true);
    });

    it("should have channelId as uuid! type", () => {
      expect(getVariableType(MESSAGE_SUBSCRIPTION, "channelId")).toBe("uuid!");
    });

    it("should subscribe to nchat_messages", () => {
      const rootFields = getSelectionFieldNames(MESSAGE_SUBSCRIPTION);
      expect(rootFields).toContain("nchat_messages");
    });

    it("should select essential message fields", () => {
      const fields = getNestedSelectionFields(
        MESSAGE_SUBSCRIPTION,
        "nchat_messages",
      );
      expect(fields).toContain("id");
      expect(fields).toContain("content");
      expect(fields).toContain("type");
      expect(fields).toContain("created_at");
    });

    it("should include user relationship", () => {
      const fields = getNestedSelectionFields(
        MESSAGE_SUBSCRIPTION,
        "nchat_messages",
      );
      expect(fields).toContain("user");
    });

    it("should include reactions", () => {
      const fields = getNestedSelectionFields(
        MESSAGE_SUBSCRIPTION,
        "nchat_messages",
      );
      expect(fields).toContain("reactions");
    });

    it("should include attachments", () => {
      const fields = getNestedSelectionFields(
        MESSAGE_SUBSCRIPTION,
        "nchat_messages",
      );
      expect(fields).toContain("attachments");
    });
  });
});

// ============================================================================
// Query Document Structure Tests
// ============================================================================

describe("Query Document Structure", () => {
  const allQueries = [
    { name: "GET_CHANNELS", doc: GET_CHANNELS, type: "query" },
    { name: "GET_CHANNEL_BY_SLUG", doc: GET_CHANNEL_BY_SLUG, type: "query" },
    { name: "GET_USER_CHANNELS", doc: GET_USER_CHANNELS, type: "query" },
    { name: "GET_MESSAGES", doc: GET_MESSAGES, type: "query" },
    {
      name: "MESSAGE_SUBSCRIPTION",
      doc: MESSAGE_SUBSCRIPTION,
      type: "subscription",
    },
  ];

  allQueries.forEach(({ name, doc, type }) => {
    it(`${name} should have at least one definition`, () => {
      expect(doc.definitions.length).toBeGreaterThan(0);
    });

    it(`${name} should have exactly one operation definition`, () => {
      const operationDefs = doc.definitions.filter(
        (def) => def.kind === "OperationDefinition",
      );
      expect(operationDefs).toHaveLength(1);
    });

    it(`${name} should be a ${type} type`, () => {
      expect(getOperationType(doc)).toBe(type);
    });

    it(`${name} should have a named operation`, () => {
      expect(getOperationName(doc)).toBeDefined();
    });
  });
});

// ============================================================================
// Query Variable Type Tests
// ============================================================================

describe("Query Variable Types", () => {
  it("all channel queries should use proper id types", () => {
    expect(getVariableType(GET_USER_CHANNELS, "userId")).toBe("uuid!");
  });

  it("all message queries should use proper id types", () => {
    expect(getVariableType(GET_MESSAGES, "channelId")).toBe("uuid!");
    expect(getVariableType(MESSAGE_SUBSCRIPTION, "channelId")).toBe("uuid!");
  });

  it("slug parameter should be String type", () => {
    expect(getVariableType(GET_CHANNEL_BY_SLUG, "slug")).toBe("String!");
  });

  it("pagination parameters should be Int type", () => {
    expect(getVariableType(GET_MESSAGES, "limit")).toBe("Int");
    expect(getVariableType(GET_MESSAGES, "offset")).toBe("Int");
  });
});

// ============================================================================
// Query Default Values Tests
// ============================================================================

describe("Query Default Values", () => {
  it("GET_MESSAGES should have default limit of 50", () => {
    expect(getDefaultValue(GET_MESSAGES, "limit")).toBe(50);
  });

  it("GET_MESSAGES should have default offset of 0", () => {
    expect(getDefaultValue(GET_MESSAGES, "offset")).toBe(0);
  });

  it("queries without pagination should not have limit/offset", () => {
    expect(getVariableNames(GET_CHANNELS)).not.toContain("limit");
    expect(getVariableNames(GET_CHANNELS)).not.toContain("offset");
  });
});

// ============================================================================
// Query Relationship Tests
// ============================================================================

describe("Query Relationships", () => {
  it("GET_CHANNELS should include creator and members_aggregate", () => {
    const fields = getNestedSelectionFields(GET_CHANNELS, "nchat_channels");
    expect(fields).toContain("creator");
    expect(fields).toContain("members_aggregate");
  });

  it("GET_CHANNEL_BY_SLUG should include creator and members", () => {
    const fields = getNestedSelectionFields(
      GET_CHANNEL_BY_SLUG,
      "nchat_channels",
    );
    expect(fields).toContain("creator");
    expect(fields).toContain("members");
  });

  it("GET_USER_CHANNELS should include channel relationship", () => {
    const fields = getNestedSelectionFields(
      GET_USER_CHANNELS,
      "nchat_channel_members",
    );
    expect(fields).toContain("channel");
  });

  it("GET_MESSAGES should include user, parent, reactions, and attachments", () => {
    const fields = getNestedSelectionFields(GET_MESSAGES, "nchat_messages");
    expect(fields).toContain("user");
    expect(fields).toContain("parent");
    expect(fields).toContain("reactions");
    expect(fields).toContain("attachments");
  });
});
