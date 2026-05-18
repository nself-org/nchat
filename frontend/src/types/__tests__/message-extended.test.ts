/**
 * Extended Message Types Tests
 *
 * Comprehensive tests for all extended message types, utility functions,
 * and type guards. Covers 60+ test cases across all message categories.
 */

import {
  // Type guards
  isContentMessage,
  isMediaMessage,
  isFileMessage,
  isInteractiveMessage,
  isLocationOrContactMessage,
  isSystemMessageType,
  isForwardableMessage,
  // Utility functions
  getMessageTypeLabel,
  getMessageTypeIcon,
  formatLocation,
  getGoogleMapsUrl,
  getAppleMapsUrl,
  formatContactName,
  getPrimaryPhone,
  getPrimaryEmail,
  // Types
  type ExtendedMessageType,
  type GeoLocation,
  type LocationMessageData,
  type LiveLocationData,
  type ContactCardData,
  type ContactPhone,
  type ContactEmail,
  type ForwardAttribution,
  type ForwardChainEntry,
  type ForwardDestination,
  type RichEmbed,
  type CodeBlockData,
  type MessageDeliveryStatus,
  type MessageDeliveryInfo,
  type MessageStateFlags,
  type ExtendedMessage,
  type ExportedMessage,
  type MessageExportOptions,
} from "../message-extended";

// ============================================================================
// TYPE GUARD TESTS
// ============================================================================

describe("Message Type Guards", () => {
  describe("isContentMessage", () => {
    it("returns true for text message", () => {
      expect(isContentMessage("text")).toBe(true);
    });

    it("returns true for rich_text message", () => {
      expect(isContentMessage("rich_text")).toBe(true);
    });

    it("returns true for code_block message", () => {
      expect(isContentMessage("code_block")).toBe(true);
    });

    it("returns true for markdown message", () => {
      expect(isContentMessage("markdown")).toBe(true);
    });

    it("returns false for image message", () => {
      expect(isContentMessage("image")).toBe(false);
    });

    it("returns false for poll message", () => {
      expect(isContentMessage("poll")).toBe(false);
    });

    it("returns false for system message", () => {
      expect(isContentMessage("user_joined")).toBe(false);
    });
  });

  describe("isMediaMessage", () => {
    it("returns true for image message", () => {
      expect(isMediaMessage("image")).toBe(true);
    });

    it("returns true for video message", () => {
      expect(isMediaMessage("video")).toBe(true);
    });

    it("returns true for audio message", () => {
      expect(isMediaMessage("audio")).toBe(true);
    });

    it("returns true for voice message", () => {
      expect(isMediaMessage("voice")).toBe(true);
    });

    it("returns true for gif message", () => {
      expect(isMediaMessage("gif")).toBe(true);
    });

    it("returns false for text message", () => {
      expect(isMediaMessage("text")).toBe(false);
    });

    it("returns false for file message", () => {
      expect(isMediaMessage("file")).toBe(false);
    });
  });

  describe("isFileMessage", () => {
    it("returns true for file message", () => {
      expect(isFileMessage("file")).toBe(true);
    });

    it("returns true for document message", () => {
      expect(isFileMessage("document")).toBe(true);
    });

    it("returns true for archive message", () => {
      expect(isFileMessage("archive")).toBe(true);
    });

    it("returns false for image message", () => {
      expect(isFileMessage("image")).toBe(false);
    });

    it("returns false for text message", () => {
      expect(isFileMessage("text")).toBe(false);
    });
  });

  describe("isInteractiveMessage", () => {
    it("returns true for poll message", () => {
      expect(isInteractiveMessage("poll")).toBe(true);
    });

    it("returns true for quiz message", () => {
      expect(isInteractiveMessage("quiz")).toBe(true);
    });

    it("returns true for sticker message", () => {
      expect(isInteractiveMessage("sticker")).toBe(true);
    });

    it("returns false for text message", () => {
      expect(isInteractiveMessage("text")).toBe(false);
    });

    it("returns false for image message", () => {
      expect(isInteractiveMessage("image")).toBe(false);
    });
  });

  describe("isLocationOrContactMessage", () => {
    it("returns true for location message", () => {
      expect(isLocationOrContactMessage("location")).toBe(true);
    });

    it("returns true for live_location message", () => {
      expect(isLocationOrContactMessage("live_location")).toBe(true);
    });

    it("returns true for contact message", () => {
      expect(isLocationOrContactMessage("contact")).toBe(true);
    });

    it("returns true for contact_card message", () => {
      expect(isLocationOrContactMessage("contact_card")).toBe(true);
    });

    it("returns false for text message", () => {
      expect(isLocationOrContactMessage("text")).toBe(false);
    });

    it("returns false for poll message", () => {
      expect(isLocationOrContactMessage("poll")).toBe(false);
    });
  });

  describe("isSystemMessageType", () => {
    const systemTypes: ExtendedMessageType[] = [
      "system",
      "user_joined",
      "user_left",
      "user_added",
      "user_removed",
      "user_banned",
      "user_unbanned",
      "channel_created",
      "channel_renamed",
      "message_pinned",
      "call_started",
      "call_ended",
    ];

    systemTypes.forEach((type) => {
      it(`returns true for ${type}`, () => {
        expect(isSystemMessageType(type)).toBe(true);
      });
    });

    it("returns false for text message", () => {
      expect(isSystemMessageType("text")).toBe(false);
    });

    it("returns false for poll message", () => {
      expect(isSystemMessageType("poll")).toBe(false);
    });

    it("returns false for image message", () => {
      expect(isSystemMessageType("image")).toBe(false);
    });
  });

  describe("isForwardableMessage", () => {
    it("returns true for text message", () => {
      expect(isForwardableMessage("text")).toBe(true);
    });

    it("returns true for image message", () => {
      expect(isForwardableMessage("image")).toBe(true);
    });

    it("returns true for poll message", () => {
      expect(isForwardableMessage("poll")).toBe(true);
    });

    it("returns true for forward message (re-forward)", () => {
      expect(isForwardableMessage("forward")).toBe(true);
    });

    it("returns false for user_joined system message", () => {
      expect(isForwardableMessage("user_joined")).toBe(false);
    });

    it("returns false for channel_created system message", () => {
      expect(isForwardableMessage("channel_created")).toBe(false);
    });
  });
});

// ============================================================================
// LABEL AND ICON TESTS
// ============================================================================

describe("Message Type Labels and Icons", () => {
  describe("getMessageTypeLabel", () => {
    it('returns "Text" for text type', () => {
      expect(getMessageTypeLabel("text")).toBe("Text");
    });

    it('returns "Image" for image type', () => {
      expect(getMessageTypeLabel("image")).toBe("Image");
    });

    it('returns "Poll" for poll type', () => {
      expect(getMessageTypeLabel("poll")).toBe("Poll");
    });

    it('returns "Location" for location type', () => {
      expect(getMessageTypeLabel("location")).toBe("Location");
    });

    it('returns "Contact Card" for contact_card type', () => {
      expect(getMessageTypeLabel("contact_card")).toBe("Contact Card");
    });

    it('returns "Forwarded" for forward type', () => {
      expect(getMessageTypeLabel("forward")).toBe("Forwarded");
    });

    it('returns "User Joined" for user_joined type', () => {
      expect(getMessageTypeLabel("user_joined")).toBe("User Joined");
    });

    it('returns "Voice Message" for voice type', () => {
      expect(getMessageTypeLabel("voice")).toBe("Voice Message");
    });
  });

  describe("getMessageTypeIcon", () => {
    it('returns "message-square" for text type', () => {
      expect(getMessageTypeIcon("text")).toBe("message-square");
    });

    it('returns "image" for image type', () => {
      expect(getMessageTypeIcon("image")).toBe("image");
    });

    it('returns "bar-chart-2" for poll type', () => {
      expect(getMessageTypeIcon("poll")).toBe("bar-chart-2");
    });

    it('returns "map-pin" for location type', () => {
      expect(getMessageTypeIcon("location")).toBe("map-pin");
    });

    it('returns "corner-up-right" for forward type', () => {
      expect(getMessageTypeIcon("forward")).toBe("corner-up-right");
    });

    it('returns "mic" for voice type', () => {
      expect(getMessageTypeIcon("voice")).toBe("mic");
    });

    it('returns "code" for code_block type', () => {
      expect(getMessageTypeIcon("code_block")).toBe("code");
    });
  });
});

// ============================================================================
// LOCATION UTILITY TESTS
// ============================================================================

describe("Location Utilities", () => {
  const testLocation: GeoLocation = {
    latitude: 40.7128,
    longitude: -74.006,
    accuracy: 10,
  };

  describe("formatLocation", () => {
    it("returns name if provided", () => {
      expect(formatLocation(testLocation, "Times Square", "123 Broadway")).toBe(
        "Times Square",
      );
    });

    it("returns address if name not provided", () => {
      expect(formatLocation(testLocation, undefined, "123 Broadway")).toBe(
        "123 Broadway",
      );
    });

    it("returns formatted coordinates if no name or address", () => {
      const result = formatLocation(testLocation);
      expect(result).toBe("40.712800, -74.006000");
    });

    it("formats coordinates with 6 decimal places", () => {
      const location: GeoLocation = {
        latitude: 1.23456789,
        longitude: 9.87654321,
      };
      const result = formatLocation(location);
      expect(result).toContain("1.234568");
      expect(result).toContain("9.876543");
    });
  });

  describe("getGoogleMapsUrl", () => {
    it("generates correct Google Maps URL", () => {
      const url = getGoogleMapsUrl(testLocation);
      expect(url).toBe("https://www.google.com/maps?q=40.7128,-74.006");
    });

    it("handles negative coordinates", () => {
      const location: GeoLocation = { latitude: -33.8688, longitude: 151.2093 };
      const url = getGoogleMapsUrl(location);
      expect(url).toBe("https://www.google.com/maps?q=-33.8688,151.2093");
    });
  });

  describe("getAppleMapsUrl", () => {
    it("generates correct Apple Maps URL", () => {
      const url = getAppleMapsUrl(testLocation);
      expect(url).toBe("https://maps.apple.com/?ll=40.7128,-74.006");
    });

    it("handles negative coordinates", () => {
      const location: GeoLocation = { latitude: -33.8688, longitude: 151.2093 };
      const url = getAppleMapsUrl(location);
      expect(url).toBe("https://maps.apple.com/?ll=-33.8688,151.2093");
    });
  });
});

// ============================================================================
// CONTACT UTILITY TESTS
// ============================================================================

describe("Contact Utilities", () => {
  describe("formatContactName", () => {
    it("returns displayName if available", () => {
      const contact: ContactCardData = {
        firstName: "John",
        lastName: "Doe",
        displayName: "Johnny D",
      };
      expect(formatContactName(contact)).toBe("Johnny D");
    });

    it("combines firstName and lastName if no displayName", () => {
      const contact: ContactCardData = {
        firstName: "John",
        lastName: "Doe",
        displayName: "",
      };
      // formatContactName falls back to firstName + lastName combination
      expect(formatContactName(contact)).toBe("John Doe");
    });

    it("returns firstName only if lastName missing", () => {
      const contact: ContactCardData = {
        firstName: "John",
        displayName: "John",
      };
      expect(formatContactName(contact)).toBe("John");
    });

    it('returns "Unknown Contact" for empty contact', () => {
      const contact: ContactCardData = {
        firstName: "",
        displayName: "",
      };
      expect(formatContactName(contact)).toBe("Unknown Contact");
    });
  });

  describe("getPrimaryPhone", () => {
    it("returns primary phone number", () => {
      const contact: ContactCardData = {
        firstName: "John",
        displayName: "John",
        phones: [
          { type: "work", number: "555-1111" },
          { type: "mobile", number: "555-2222", isPrimary: true },
          { type: "home", number: "555-3333" },
        ],
      };
      expect(getPrimaryPhone(contact)).toBe("555-2222");
    });

    it("returns first phone if no primary set", () => {
      const contact: ContactCardData = {
        firstName: "John",
        displayName: "John",
        phones: [
          { type: "work", number: "555-1111" },
          { type: "mobile", number: "555-2222" },
        ],
      };
      expect(getPrimaryPhone(contact)).toBe("555-1111");
    });

    it("returns undefined if no phones", () => {
      const contact: ContactCardData = {
        firstName: "John",
        displayName: "John",
      };
      expect(getPrimaryPhone(contact)).toBeUndefined();
    });
  });

  describe("getPrimaryEmail", () => {
    it("returns primary email", () => {
      const contact: ContactCardData = {
        firstName: "John",
        displayName: "John",
        emails: [
          { type: "work", email: "work@example.com" },
          { type: "personal", email: "personal@example.com", isPrimary: true },
        ],
      };
      expect(getPrimaryEmail(contact)).toBe("personal@example.com");
    });

    it("returns first email if no primary set", () => {
      const contact: ContactCardData = {
        firstName: "John",
        displayName: "John",
        emails: [{ type: "work", email: "work@example.com" }],
      };
      expect(getPrimaryEmail(contact)).toBe("work@example.com");
    });

    it("returns undefined if no emails", () => {
      const contact: ContactCardData = {
        firstName: "John",
        displayName: "John",
      };
      expect(getPrimaryEmail(contact)).toBeUndefined();
    });
  });
});

// ============================================================================
// TYPE STRUCTURE TESTS
// ============================================================================

describe("Type Structures", () => {
  describe("GeoLocation", () => {
    it("should have required fields", () => {
      const location: GeoLocation = {
        latitude: 40.7128,
        longitude: -74.006,
      };
      expect(location.latitude).toBeDefined();
      expect(location.longitude).toBeDefined();
    });

    it("should allow optional fields", () => {
      const location: GeoLocation = {
        latitude: 40.7128,
        longitude: -74.006,
        accuracy: 10,
        altitude: 100,
        heading: 90,
        speed: 5,
      };
      expect(location.accuracy).toBe(10);
      expect(location.altitude).toBe(100);
      expect(location.heading).toBe(90);
      expect(location.speed).toBe(5);
    });
  });

  describe("LocationMessageData", () => {
    it("should have required location field", () => {
      const data: LocationMessageData = {
        location: { latitude: 40.7128, longitude: -74.006 },
      };
      expect(data.location).toBeDefined();
    });

    it("should allow venue information", () => {
      const data: LocationMessageData = {
        location: { latitude: 40.7128, longitude: -74.006 },
        name: "Empire State Building",
        address: "350 5th Ave, New York, NY",
        venue: "Landmark",
        venueType: "attraction",
      };
      expect(data.name).toBe("Empire State Building");
      expect(data.venue).toBe("Landmark");
    });
  });

  describe("LiveLocationData", () => {
    it("should extend LocationMessageData with live fields", () => {
      const now = new Date();
      const data: LiveLocationData = {
        location: { latitude: 40.7128, longitude: -74.006 },
        startedAt: now,
        duration: 3600,
        expiresAt: new Date(now.getTime() + 3600000),
        lastUpdatedAt: now,
        isActive: true,
      };
      expect(data.isActive).toBe(true);
      expect(data.duration).toBe(3600);
    });
  });

  describe("ContactCardData", () => {
    it("should have required name fields", () => {
      const contact: ContactCardData = {
        firstName: "John",
        displayName: "John Doe",
      };
      expect(contact.firstName).toBe("John");
      expect(contact.displayName).toBe("John Doe");
    });

    it("should allow organization info", () => {
      const contact: ContactCardData = {
        firstName: "John",
        displayName: "John Doe",
        organization: "Acme Corp",
        jobTitle: "Engineer",
        department: "R&D",
      };
      expect(contact.organization).toBe("Acme Corp");
    });

    it("should allow multiple phones and emails", () => {
      const contact: ContactCardData = {
        firstName: "John",
        displayName: "John Doe",
        phones: [
          { type: "mobile", number: "555-1234", isPrimary: true },
          { type: "work", number: "555-5678" },
        ],
        emails: [
          { type: "personal", email: "john@example.com", isPrimary: true },
          { type: "work", email: "john@work.com" },
        ],
      };
      expect(contact.phones).toHaveLength(2);
      expect(contact.emails).toHaveLength(2);
    });
  });

  describe("ForwardAttribution", () => {
    it("should have required fields", () => {
      const now = new Date();
      const attribution: ForwardAttribution = {
        originalMessageId: "msg-123",
        originalChannelId: "ch-456",
        originalAuthor: {
          id: "user-789",
          username: "john",
          displayName: "John Doe",
        },
        originalSentAt: now,
        mode: "forward",
      };
      expect(attribution.originalMessageId).toBe("msg-123");
      expect(attribution.mode).toBe("forward");
    });

    it("should allow forward chain for multi-hop", () => {
      const now = new Date();
      const attribution: ForwardAttribution = {
        originalMessageId: "msg-123",
        originalChannelId: "ch-456",
        originalAuthor: {
          id: "user-789",
          username: "john",
          displayName: "John Doe",
        },
        originalSentAt: now,
        mode: "forward",
        forwardChain: [
          {
            messageId: "msg-001",
            channelId: "ch-001",
            forwardedBy: { id: "u1", username: "user1", displayName: "User 1" },
            forwardedAt: now,
          },
          {
            messageId: "msg-002",
            channelId: "ch-002",
            forwardedBy: { id: "u2", username: "user2", displayName: "User 2" },
            forwardedAt: now,
          },
        ],
      };
      expect(attribution.forwardChain).toHaveLength(2);
    });
  });

  describe("RichEmbed", () => {
    it("should have required fields", () => {
      const embed: RichEmbed = {
        type: "link_preview",
        url: "https://example.com",
      };
      expect(embed.type).toBe("link_preview");
      expect(embed.url).toBe("https://example.com");
    });

    it("should allow full embed data", () => {
      const embed: RichEmbed = {
        type: "youtube",
        url: "https://youtube.com/watch?v=123",
        title: "Video Title",
        description: "Video description",
        thumbnailUrl: "https://img.youtube.com/123.jpg",
        provider: "YouTube",
        author: "Channel Name",
        color: "#ff0000",
        videoUrl: "https://youtube.com/embed/123",
        fields: [
          { name: "Duration", value: "10:00", inline: true },
          { name: "Views", value: "1M", inline: true },
        ],
      };
      expect(embed.title).toBe("Video Title");
      expect(embed.fields).toHaveLength(2);
    });
  });

  describe("CodeBlockData", () => {
    it("should have code content", () => {
      const block: CodeBlockData = {
        code: 'console.log("Hello")',
      };
      expect(block.code).toBe('console.log("Hello")');
    });

    it("should allow language and metadata", () => {
      const block: CodeBlockData = {
        language: "typescript",
        code: "const x: number = 42",
        filename: "example.ts",
        highlightLines: [1, 3, 5],
        showLineNumbers: true,
        sourceUrl: "https://github.com/repo/file.ts",
      };
      expect(block.language).toBe("typescript");
      expect(block.filename).toBe("example.ts");
      expect(block.highlightLines).toContain(3);
    });
  });

  describe("MessageDeliveryInfo", () => {
    it("should have status", () => {
      const info: MessageDeliveryInfo = {
        status: "sent",
      };
      expect(info.status).toBe("sent");
    });

    it("should track all delivery timestamps", () => {
      const now = new Date();
      const info: MessageDeliveryInfo = {
        status: "read",
        queuedAt: now,
        sentAt: now,
        serverReceivedAt: now,
        firstDeliveredAt: now,
        allDeliveredAt: now,
        firstReadAt: now,
        allReadAt: now,
      };
      expect(info.allReadAt).toBeDefined();
    });

    it("should include error info for failed status", () => {
      const info: MessageDeliveryInfo = {
        status: "failed",
        error: {
          code: "NETWORK_ERROR",
          message: "Connection failed",
          retryable: true,
          retryCount: 2,
        },
      };
      expect(info.error?.retryable).toBe(true);
    });
  });

  describe("MessageStateFlags", () => {
    it("should have all boolean flags", () => {
      const flags: MessageStateFlags = {
        isSending: false,
        isSent: true,
        isDelivered: true,
        isRead: true,
        isFailed: false,
        isEdited: false,
        isDeleted: false,
        isPinned: false,
        isBookmarked: true,
        isHighlighted: false,
        isEphemeral: false,
        isEncrypted: true,
        isForwarded: false,
        isReply: false,
        isThreadReply: false,
        isThreadRoot: false,
      };
      expect(flags.isSent).toBe(true);
      expect(flags.isEncrypted).toBe(true);
      expect(flags.isFailed).toBe(false);
    });
  });
});

// ============================================================================
// EDGE CASES AND ERROR HANDLING
// ============================================================================

describe("Edge Cases", () => {
  describe("Location with extreme coordinates", () => {
    it("handles North Pole coordinates", () => {
      const location: GeoLocation = { latitude: 90, longitude: 0 };
      const url = getGoogleMapsUrl(location);
      expect(url).toContain("90");
    });

    it("handles South Pole coordinates", () => {
      const location: GeoLocation = { latitude: -90, longitude: 0 };
      const url = getGoogleMapsUrl(location);
      expect(url).toContain("-90");
    });

    it("handles International Date Line", () => {
      const location: GeoLocation = { latitude: 0, longitude: 180 };
      const url = getGoogleMapsUrl(location);
      expect(url).toContain("180");
    });

    it("handles negative longitude", () => {
      const location: GeoLocation = { latitude: 0, longitude: -180 };
      const url = getGoogleMapsUrl(location);
      expect(url).toContain("-180");
    });
  });

  describe("Contact with special characters", () => {
    it("handles unicode in names", () => {
      const contact: ContactCardData = {
        firstName: "Jean-Pierre",
        lastName: "Müller",
        displayName: "Jean-Pierre Müller",
      };
      expect(formatContactName(contact)).toBe("Jean-Pierre Müller");
    });

    it("handles empty strings", () => {
      const contact: ContactCardData = {
        firstName: "",
        displayName: "",
      };
      expect(formatContactName(contact)).toBe("Unknown Contact");
    });
  });

  describe("All ExtendedMessageTypes coverage", () => {
    const allTypes: ExtendedMessageType[] = [
      "text",
      "rich_text",
      "code_block",
      "markdown",
      "image",
      "video",
      "audio",
      "voice",
      "gif",
      "file",
      "document",
      "archive",
      "poll",
      "quiz",
      "sticker",
      "location",
      "live_location",
      "contact",
      "contact_card",
      "forward",
      "quote",
      "system",
      "user_joined",
      "user_left",
    ];

    it("all types have labels", () => {
      allTypes.forEach((type) => {
        const label = getMessageTypeLabel(type);
        expect(label).toBeTruthy();
        expect(typeof label).toBe("string");
      });
    });

    it("all types have icons", () => {
      allTypes.forEach((type) => {
        const icon = getMessageTypeIcon(type);
        expect(icon).toBeTruthy();
        expect(typeof icon).toBe("string");
      });
    });
  });
});
