import { gql, DocumentNode } from "@apollo/client";
import {
  USER_BASIC_FRAGMENT,
  USER_PROFILE_FRAGMENT,
  USER_PRESENCE_FRAGMENT,
  CHANNEL_BASIC_FRAGMENT,
  CHANNEL_FULL_FRAGMENT,
  CHANNEL_MEMBER_FRAGMENT,
  ATTACHMENT_FRAGMENT,
  REACTION_FRAGMENT,
  MESSAGE_BASIC_FRAGMENT,
  MESSAGE_FULL_FRAGMENT,
  MESSAGE_WITH_THREAD_FRAGMENT,
  THREAD_FRAGMENT,
  NOTIFICATION_FRAGMENT,
  MENTION_FRAGMENT,
  BOOKMARK_FRAGMENT,
  READ_RECEIPT_FRAGMENT,
  TYPING_INDICATOR_FRAGMENT,
  SEARCH_MESSAGE_RESULT_FRAGMENT,
} from "../fragments";

// ============================================================================
// Helper Functions
// ============================================================================

function getFragmentName(fragment: DocumentNode): string | undefined {
  const definition = fragment.definitions.find(
    (def) => def.kind === "FragmentDefinition",
  );
  if (definition && definition.kind === "FragmentDefinition") {
    return definition.name.value;
  }
  return undefined;
}

function getFragmentTypeName(fragment: DocumentNode): string | undefined {
  const definition = fragment.definitions.find(
    (def) => def.kind === "FragmentDefinition",
  );
  if (definition && definition.kind === "FragmentDefinition") {
    return definition.typeCondition.name.value;
  }
  return undefined;
}

function getFragmentFields(fragment: DocumentNode): string[] {
  const definition = fragment.definitions.find(
    (def) => def.kind === "FragmentDefinition",
  );
  if (definition && definition.kind === "FragmentDefinition") {
    return definition.selectionSet.selections
      .filter(
        (sel): sel is { kind: "Field"; name: { value: string } } =>
          sel.kind === "Field",
      )
      .map((sel) => sel.name.value);
  }
  return [];
}

function hasFragmentSpread(
  fragment: DocumentNode,
  spreadName: string,
): boolean {
  const definition = fragment.definitions.find(
    (def) => def.kind === "FragmentDefinition",
  );
  if (definition && definition.kind === "FragmentDefinition") {
    return definition.selectionSet.selections.some(
      (sel) => sel.kind === "FragmentSpread" && sel.name.value === spreadName,
    );
  }
  return false;
}

function hasIncludedFragmentDefinition(
  doc: DocumentNode,
  fragmentName: string,
): boolean {
  return doc.definitions.some(
    (def) =>
      def.kind === "FragmentDefinition" && def.name.value === fragmentName,
  );
}

function hasNestedFragmentSpread(
  doc: DocumentNode,
  spreadName: string,
): boolean {
  function searchSelections(selections: any[]): boolean {
    for (const sel of selections) {
      if (sel.kind === "FragmentSpread" && sel.name.value === spreadName) {
        return true;
      }
      if (sel.kind === "Field" && sel.selectionSet) {
        if (searchSelections(sel.selectionSet.selections)) {
          return true;
        }
      }
    }
    return false;
  }

  for (const def of doc.definitions) {
    if (def.kind === "FragmentDefinition") {
      if (searchSelections(def.selectionSet.selections)) {
        return true;
      }
    }
  }
  return false;
}

// ============================================================================
// User Fragment Tests
// ============================================================================

describe("User Fragments", () => {
  describe("USER_BASIC_FRAGMENT", () => {
    it("should be a valid GraphQL document", () => {
      expect(USER_BASIC_FRAGMENT).toBeDefined();
      expect(USER_BASIC_FRAGMENT.kind).toBe("Document");
    });

    it("should have correct fragment name", () => {
      expect(getFragmentName(USER_BASIC_FRAGMENT)).toBe("UserBasic");
    });

    it("should target nchat_users type", () => {
      expect(getFragmentTypeName(USER_BASIC_FRAGMENT)).toBe("nchat_users");
    });

    it("should include required user fields", () => {
      const fields = getFragmentFields(USER_BASIC_FRAGMENT);
      expect(fields).toContain("id");
      expect(fields).toContain("username");
      expect(fields).toContain("display_name");
      expect(fields).toContain("avatar_url");
    });
  });

  describe("USER_PROFILE_FRAGMENT", () => {
    it("should be a valid GraphQL document", () => {
      expect(USER_PROFILE_FRAGMENT).toBeDefined();
      expect(USER_PROFILE_FRAGMENT.kind).toBe("Document");
    });

    it("should have correct fragment name", () => {
      expect(getFragmentName(USER_PROFILE_FRAGMENT)).toBe("UserProfile");
    });

    it("should target nchat_users type", () => {
      expect(getFragmentTypeName(USER_PROFILE_FRAGMENT)).toBe("nchat_users");
    });

    it("should include profile-specific fields", () => {
      const fields = getFragmentFields(USER_PROFILE_FRAGMENT);
      expect(fields).toContain("id");
      expect(fields).toContain("email");
      expect(fields).toContain("bio");
      expect(fields).toContain("status");
      expect(fields).toContain("timezone");
      expect(fields).toContain("locale");
    });
  });

  describe("USER_PRESENCE_FRAGMENT", () => {
    it("should be a valid GraphQL document", () => {
      expect(USER_PRESENCE_FRAGMENT).toBeDefined();
    });

    it("should have correct fragment name", () => {
      expect(getFragmentName(USER_PRESENCE_FRAGMENT)).toBe("UserPresence");
    });

    it("should target nchat_user_presence type", () => {
      expect(getFragmentTypeName(USER_PRESENCE_FRAGMENT)).toBe(
        "nchat_user_presence",
      );
    });

    it("should include UserBasic fragment definition", () => {
      expect(
        hasIncludedFragmentDefinition(USER_PRESENCE_FRAGMENT, "UserBasic"),
      ).toBe(true);
    });

    it("should use UserBasic fragment spread in nested selection", () => {
      expect(hasNestedFragmentSpread(USER_PRESENCE_FRAGMENT, "UserBasic")).toBe(
        true,
      );
    });
  });
});

// ============================================================================
// Channel Fragment Tests
// ============================================================================

describe("Channel Fragments", () => {
  describe("CHANNEL_BASIC_FRAGMENT", () => {
    it("should be a valid GraphQL document", () => {
      expect(CHANNEL_BASIC_FRAGMENT).toBeDefined();
      expect(CHANNEL_BASIC_FRAGMENT.kind).toBe("Document");
    });

    it("should have correct fragment name", () => {
      expect(getFragmentName(CHANNEL_BASIC_FRAGMENT)).toBe("ChannelBasic");
    });

    it("should target nchat_channels type", () => {
      expect(getFragmentTypeName(CHANNEL_BASIC_FRAGMENT)).toBe(
        "nchat_channels",
      );
    });

    it("should include required channel fields", () => {
      const fields = getFragmentFields(CHANNEL_BASIC_FRAGMENT);
      expect(fields).toContain("id");
      expect(fields).toContain("name");
      expect(fields).toContain("slug");
      expect(fields).toContain("type");
      expect(fields).toContain("is_private");
    });
  });

  describe("CHANNEL_FULL_FRAGMENT", () => {
    it("should be a valid GraphQL document", () => {
      expect(CHANNEL_FULL_FRAGMENT).toBeDefined();
    });

    it("should have correct fragment name", () => {
      expect(getFragmentName(CHANNEL_FULL_FRAGMENT)).toBe("ChannelFull");
    });

    it("should include UserBasic fragment definition", () => {
      expect(
        hasIncludedFragmentDefinition(CHANNEL_FULL_FRAGMENT, "UserBasic"),
      ).toBe(true);
    });

    it("should use UserBasic fragment spread in creator field", () => {
      expect(hasNestedFragmentSpread(CHANNEL_FULL_FRAGMENT, "UserBasic")).toBe(
        true,
      );
    });

    it("should include all channel fields", () => {
      const fields = getFragmentFields(CHANNEL_FULL_FRAGMENT);
      expect(fields).toContain("id");
      expect(fields).toContain("topic");
      expect(fields).toContain("icon");
      expect(fields).toContain("position");
      expect(fields).toContain("settings");
    });
  });

  describe("CHANNEL_MEMBER_FRAGMENT", () => {
    it("should be a valid GraphQL document", () => {
      expect(CHANNEL_MEMBER_FRAGMENT).toBeDefined();
    });

    it("should have correct fragment name", () => {
      expect(getFragmentName(CHANNEL_MEMBER_FRAGMENT)).toBe("ChannelMember");
    });

    it("should target nchat_channel_members type", () => {
      expect(getFragmentTypeName(CHANNEL_MEMBER_FRAGMENT)).toBe(
        "nchat_channel_members",
      );
    });

    it("should include UserProfile fragment definition", () => {
      expect(
        hasIncludedFragmentDefinition(CHANNEL_MEMBER_FRAGMENT, "UserProfile"),
      ).toBe(true);
    });

    it("should use UserProfile fragment spread in user field", () => {
      expect(
        hasNestedFragmentSpread(CHANNEL_MEMBER_FRAGMENT, "UserProfile"),
      ).toBe(true);
    });
  });
});

// ============================================================================
// Message Fragment Tests
// ============================================================================

describe("Message Fragments", () => {
  describe("ATTACHMENT_FRAGMENT", () => {
    it("should be a valid GraphQL document", () => {
      expect(ATTACHMENT_FRAGMENT).toBeDefined();
    });

    it("should have correct fragment name", () => {
      expect(getFragmentName(ATTACHMENT_FRAGMENT)).toBe("Attachment");
    });

    it("should target nchat_attachments type", () => {
      expect(getFragmentTypeName(ATTACHMENT_FRAGMENT)).toBe(
        "nchat_attachments",
      );
    });

    it("should include file-related fields", () => {
      const fields = getFragmentFields(ATTACHMENT_FRAGMENT);
      expect(fields).toContain("id");
      expect(fields).toContain("file_name");
      expect(fields).toContain("file_type");
      expect(fields).toContain("file_size");
      expect(fields).toContain("file_url");
    });
  });

  describe("REACTION_FRAGMENT", () => {
    it("should be a valid GraphQL document", () => {
      expect(REACTION_FRAGMENT).toBeDefined();
    });

    it("should have correct fragment name", () => {
      expect(getFragmentName(REACTION_FRAGMENT)).toBe("Reaction");
    });

    it("should target nchat_reactions type", () => {
      expect(getFragmentTypeName(REACTION_FRAGMENT)).toBe("nchat_reactions");
    });

    it("should include emoji field", () => {
      const fields = getFragmentFields(REACTION_FRAGMENT);
      expect(fields).toContain("emoji");
    });
  });

  describe("MESSAGE_BASIC_FRAGMENT", () => {
    it("should be a valid GraphQL document", () => {
      expect(MESSAGE_BASIC_FRAGMENT).toBeDefined();
    });

    it("should have correct fragment name", () => {
      expect(getFragmentName(MESSAGE_BASIC_FRAGMENT)).toBe("MessageBasic");
    });

    it("should target nchat_messages type", () => {
      expect(getFragmentTypeName(MESSAGE_BASIC_FRAGMENT)).toBe(
        "nchat_messages",
      );
    });

    it("should include essential message fields", () => {
      const fields = getFragmentFields(MESSAGE_BASIC_FRAGMENT);
      expect(fields).toContain("id");
      expect(fields).toContain("content");
      expect(fields).toContain("type");
      expect(fields).toContain("created_at");
    });
  });

  describe("MESSAGE_FULL_FRAGMENT", () => {
    it("should be a valid GraphQL document", () => {
      expect(MESSAGE_FULL_FRAGMENT).toBeDefined();
    });

    it("should have correct fragment name", () => {
      expect(getFragmentName(MESSAGE_FULL_FRAGMENT)).toBe("MessageFull");
    });

    it("should include nested fragment definitions", () => {
      expect(
        hasIncludedFragmentDefinition(MESSAGE_FULL_FRAGMENT, "UserProfile"),
      ).toBe(true);
      expect(
        hasIncludedFragmentDefinition(MESSAGE_FULL_FRAGMENT, "Attachment"),
      ).toBe(true);
      expect(
        hasIncludedFragmentDefinition(MESSAGE_FULL_FRAGMENT, "Reaction"),
      ).toBe(true);
    });

    it("should use fragment spreads in nested selections", () => {
      expect(
        hasNestedFragmentSpread(MESSAGE_FULL_FRAGMENT, "UserProfile"),
      ).toBe(true);
      expect(hasNestedFragmentSpread(MESSAGE_FULL_FRAGMENT, "Attachment")).toBe(
        true,
      );
      expect(hasNestedFragmentSpread(MESSAGE_FULL_FRAGMENT, "Reaction")).toBe(
        true,
      );
    });

    it("should include thread and parent fields", () => {
      const fields = getFragmentFields(MESSAGE_FULL_FRAGMENT);
      expect(fields).toContain("thread_id");
      expect(fields).toContain("parent_id");
    });
  });

  describe("MESSAGE_WITH_THREAD_FRAGMENT", () => {
    it("should be a valid GraphQL document", () => {
      expect(MESSAGE_WITH_THREAD_FRAGMENT).toBeDefined();
    });

    it("should have correct fragment name", () => {
      expect(getFragmentName(MESSAGE_WITH_THREAD_FRAGMENT)).toBe(
        "MessageWithThread",
      );
    });

    it("should include MessageFull fragment", () => {
      expect(
        hasFragmentSpread(MESSAGE_WITH_THREAD_FRAGMENT, "MessageFull"),
      ).toBe(true);
    });

    it("should include MessageFull fragment definition", () => {
      expect(
        hasIncludedFragmentDefinition(
          MESSAGE_WITH_THREAD_FRAGMENT,
          "MessageFull",
        ),
      ).toBe(true);
    });
  });
});

// ============================================================================
// Thread Fragment Tests
// ============================================================================

describe("Thread Fragments", () => {
  describe("THREAD_FRAGMENT", () => {
    it("should be a valid GraphQL document", () => {
      expect(THREAD_FRAGMENT).toBeDefined();
    });

    it("should have correct fragment name", () => {
      expect(getFragmentName(THREAD_FRAGMENT)).toBe("Thread");
    });

    it("should target nchat_threads type", () => {
      expect(getFragmentTypeName(THREAD_FRAGMENT)).toBe("nchat_threads");
    });

    it("should include thread-specific fields", () => {
      const fields = getFragmentFields(THREAD_FRAGMENT);
      expect(fields).toContain("id");
      expect(fields).toContain("channel_id");
      expect(fields).toContain("message_count");
      expect(fields).toContain("last_reply_at");
    });

    it("should include MessageBasic fragment definition", () => {
      expect(
        hasIncludedFragmentDefinition(THREAD_FRAGMENT, "MessageBasic"),
      ).toBe(true);
    });

    it("should use MessageBasic fragment spread in parent_message field", () => {
      expect(hasNestedFragmentSpread(THREAD_FRAGMENT, "MessageBasic")).toBe(
        true,
      );
    });
  });
});

// ============================================================================
// Notification Fragment Tests
// ============================================================================

describe("Notification Fragments", () => {
  describe("NOTIFICATION_FRAGMENT", () => {
    it("should be a valid GraphQL document", () => {
      expect(NOTIFICATION_FRAGMENT).toBeDefined();
    });

    it("should have correct fragment name", () => {
      expect(getFragmentName(NOTIFICATION_FRAGMENT)).toBe("Notification");
    });

    it("should target nchat_notifications type", () => {
      expect(getFragmentTypeName(NOTIFICATION_FRAGMENT)).toBe(
        "nchat_notifications",
      );
    });

    it("should include notification fields", () => {
      const fields = getFragmentFields(NOTIFICATION_FRAGMENT);
      expect(fields).toContain("id");
      expect(fields).toContain("type");
      expect(fields).toContain("title");
      expect(fields).toContain("body");
      expect(fields).toContain("is_read");
    });

    it("should include UserBasic and ChannelBasic fragment definitions", () => {
      expect(
        hasIncludedFragmentDefinition(NOTIFICATION_FRAGMENT, "UserBasic"),
      ).toBe(true);
      expect(
        hasIncludedFragmentDefinition(NOTIFICATION_FRAGMENT, "ChannelBasic"),
      ).toBe(true);
    });

    it("should use fragment spreads in nested selections", () => {
      expect(hasNestedFragmentSpread(NOTIFICATION_FRAGMENT, "UserBasic")).toBe(
        true,
      );
      expect(
        hasNestedFragmentSpread(NOTIFICATION_FRAGMENT, "ChannelBasic"),
      ).toBe(true);
    });
  });
});

// ============================================================================
// Mention Fragment Tests
// ============================================================================

describe("Mention Fragments", () => {
  describe("MENTION_FRAGMENT", () => {
    it("should be a valid GraphQL document", () => {
      expect(MENTION_FRAGMENT).toBeDefined();
    });

    it("should have correct fragment name", () => {
      expect(getFragmentName(MENTION_FRAGMENT)).toBe("Mention");
    });

    it("should target nchat_mentions type", () => {
      expect(getFragmentTypeName(MENTION_FRAGMENT)).toBe("nchat_mentions");
    });

    it("should include mention fields", () => {
      const fields = getFragmentFields(MENTION_FRAGMENT);
      expect(fields).toContain("id");
      expect(fields).toContain("message_id");
      expect(fields).toContain("user_id");
      expect(fields).toContain("type");
    });
  });
});

// ============================================================================
// Bookmark Fragment Tests
// ============================================================================

describe("Bookmark Fragments", () => {
  describe("BOOKMARK_FRAGMENT", () => {
    it("should be a valid GraphQL document", () => {
      expect(BOOKMARK_FRAGMENT).toBeDefined();
    });

    it("should have correct fragment name", () => {
      expect(getFragmentName(BOOKMARK_FRAGMENT)).toBe("Bookmark");
    });

    it("should target nchat_bookmarks type", () => {
      expect(getFragmentTypeName(BOOKMARK_FRAGMENT)).toBe("nchat_bookmarks");
    });

    it("should include bookmark fields", () => {
      const fields = getFragmentFields(BOOKMARK_FRAGMENT);
      expect(fields).toContain("id");
      expect(fields).toContain("user_id");
      expect(fields).toContain("message_id");
      expect(fields).toContain("note");
    });

    it("should include MessageFull fragment definition", () => {
      expect(
        hasIncludedFragmentDefinition(BOOKMARK_FRAGMENT, "MessageFull"),
      ).toBe(true);
    });

    it("should use MessageFull fragment spread in message field", () => {
      expect(hasNestedFragmentSpread(BOOKMARK_FRAGMENT, "MessageFull")).toBe(
        true,
      );
    });
  });
});

// ============================================================================
// Read Receipt Fragment Tests
// ============================================================================

describe("Read Receipt Fragments", () => {
  describe("READ_RECEIPT_FRAGMENT", () => {
    it("should be a valid GraphQL document", () => {
      expect(READ_RECEIPT_FRAGMENT).toBeDefined();
    });

    it("should have correct fragment name", () => {
      expect(getFragmentName(READ_RECEIPT_FRAGMENT)).toBe("ReadReceipt");
    });

    it("should target nchat_read_receipts type", () => {
      expect(getFragmentTypeName(READ_RECEIPT_FRAGMENT)).toBe(
        "nchat_read_receipts",
      );
    });

    it("should include read receipt fields", () => {
      const fields = getFragmentFields(READ_RECEIPT_FRAGMENT);
      expect(fields).toContain("id");
      expect(fields).toContain("user_id");
      expect(fields).toContain("channel_id");
      expect(fields).toContain("message_id");
      expect(fields).toContain("read_at");
    });

    it("should include UserBasic fragment definition", () => {
      expect(
        hasIncludedFragmentDefinition(READ_RECEIPT_FRAGMENT, "UserBasic"),
      ).toBe(true);
    });

    it("should use UserBasic fragment spread in user field", () => {
      expect(hasNestedFragmentSpread(READ_RECEIPT_FRAGMENT, "UserBasic")).toBe(
        true,
      );
    });
  });
});

// ============================================================================
// Typing Indicator Fragment Tests
// ============================================================================

describe("Typing Indicator Fragments", () => {
  describe("TYPING_INDICATOR_FRAGMENT", () => {
    it("should be a valid GraphQL document", () => {
      expect(TYPING_INDICATOR_FRAGMENT).toBeDefined();
    });

    it("should have correct fragment name", () => {
      expect(getFragmentName(TYPING_INDICATOR_FRAGMENT)).toBe(
        "TypingIndicator",
      );
    });

    it("should target nchat_typing_indicators type", () => {
      expect(getFragmentTypeName(TYPING_INDICATOR_FRAGMENT)).toBe(
        "nchat_typing_indicators",
      );
    });

    it("should include typing indicator fields", () => {
      const fields = getFragmentFields(TYPING_INDICATOR_FRAGMENT);
      expect(fields).toContain("id");
      expect(fields).toContain("user_id");
      expect(fields).toContain("channel_id");
      expect(fields).toContain("started_at");
      expect(fields).toContain("expires_at");
    });

    it("should include UserBasic fragment definition", () => {
      expect(
        hasIncludedFragmentDefinition(TYPING_INDICATOR_FRAGMENT, "UserBasic"),
      ).toBe(true);
    });

    it("should use UserBasic fragment spread in user field", () => {
      expect(
        hasNestedFragmentSpread(TYPING_INDICATOR_FRAGMENT, "UserBasic"),
      ).toBe(true);
    });
  });
});

// ============================================================================
// Search Result Fragment Tests
// ============================================================================

describe("Search Result Fragments", () => {
  describe("SEARCH_MESSAGE_RESULT_FRAGMENT", () => {
    it("should be a valid GraphQL document", () => {
      expect(SEARCH_MESSAGE_RESULT_FRAGMENT).toBeDefined();
    });

    it("should have correct fragment name", () => {
      expect(getFragmentName(SEARCH_MESSAGE_RESULT_FRAGMENT)).toBe(
        "SearchMessageResult",
      );
    });

    it("should target nchat_messages type", () => {
      expect(getFragmentTypeName(SEARCH_MESSAGE_RESULT_FRAGMENT)).toBe(
        "nchat_messages",
      );
    });

    it("should include search result fields", () => {
      const fields = getFragmentFields(SEARCH_MESSAGE_RESULT_FRAGMENT);
      expect(fields).toContain("id");
      expect(fields).toContain("content");
      expect(fields).toContain("type");
      expect(fields).toContain("created_at");
    });

    it("should include UserBasic and ChannelBasic fragment definitions", () => {
      expect(
        hasIncludedFragmentDefinition(
          SEARCH_MESSAGE_RESULT_FRAGMENT,
          "UserBasic",
        ),
      ).toBe(true);
      expect(
        hasIncludedFragmentDefinition(
          SEARCH_MESSAGE_RESULT_FRAGMENT,
          "ChannelBasic",
        ),
      ).toBe(true);
    });

    it("should use fragment spreads in nested selections", () => {
      expect(
        hasNestedFragmentSpread(SEARCH_MESSAGE_RESULT_FRAGMENT, "UserBasic"),
      ).toBe(true);
      expect(
        hasNestedFragmentSpread(SEARCH_MESSAGE_RESULT_FRAGMENT, "ChannelBasic"),
      ).toBe(true);
    });
  });
});

// ============================================================================
// Fragment Composition Tests
// ============================================================================

describe("Fragment Composition", () => {
  it("should allow fragments to be composed in queries", () => {
    const testQuery = gql`
      ${USER_BASIC_FRAGMENT}
      query TestQuery {
        nchat_users {
          ...UserBasic
        }
      }
    `;
    expect(testQuery).toBeDefined();
    expect(testQuery.kind).toBe("Document");
  });

  it("should allow nested fragments to be composed", () => {
    const testQuery = gql`
      ${MESSAGE_FULL_FRAGMENT}
      query TestQuery {
        nchat_messages {
          ...MessageFull
        }
      }
    `;
    expect(testQuery).toBeDefined();
    expect(testQuery.kind).toBe("Document");
  });

  it("should allow multiple fragments in a single query", () => {
    const testQuery = gql`
      ${USER_BASIC_FRAGMENT}
      ${CHANNEL_BASIC_FRAGMENT}
      query TestQuery {
        nchat_users {
          ...UserBasic
        }
        nchat_channels {
          ...ChannelBasic
        }
      }
    `;
    expect(testQuery).toBeDefined();
    expect(testQuery.kind).toBe("Document");
  });
});
