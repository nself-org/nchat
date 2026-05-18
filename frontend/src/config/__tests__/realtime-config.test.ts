/**
 * Tests for realtime.config.ts
 *
 * Verifies the exported constants and their structural integrity.
 * realtime.config.ts is a 327-line pure configuration file — validating
 * every exported constant gives broad coverage with minimal test code.
 *
 * Coverage intent: validate all 13 exports have the expected shape
 * and correct types, so the module is safely consumable at runtime.
 */

import {
  REALTIME_CONNECTION,
  REALTIME_FEATURES,
  PRESENCE_CONFIG,
  TYPING_CONFIG,
  DELIVERY_CONFIG,
  OFFLINE_QUEUE_CONFIG,
  SYNC_CONFIG,
  ROOMS_CONFIG,
  DEFAULT_PRESENCE_PRIVACY,
  DEFAULT_TYPING_PRIVACY,
  REALTIME_EVENTS,
  CONNECTION_QUALITY_THRESHOLDS,
  REALTIME_CONFIG,
} from "../realtime.config";

// ---------------------------------------------------------------------------
// REALTIME_CONNECTION
// ---------------------------------------------------------------------------

describe("REALTIME_CONNECTION", () => {
  it("is defined as a non-null object", () => {
    expect(REALTIME_CONNECTION).toBeDefined();
    expect(typeof REALTIME_CONNECTION).toBe("object");
    expect(REALTIME_CONNECTION).not.toBeNull();
  });

  it("has a url string", () => {
    expect(typeof REALTIME_CONNECTION.url).toBe("string");
    expect(REALTIME_CONNECTION.url.length).toBeGreaterThan(0);
  });

  it("url defaults to realtime.localhost when no env var is set", () => {
    expect(REALTIME_CONNECTION.url).toContain("realtime.localhost");
  });

  it("has transports array with websocket and polling", () => {
    expect(Array.isArray(REALTIME_CONNECTION.transports)).toBe(true);
    expect(REALTIME_CONNECTION.transports).toContain("websocket");
    expect(REALTIME_CONNECTION.transports).toContain("polling");
  });

  it("has autoReconnect true", () => {
    expect(REALTIME_CONNECTION.autoReconnect).toBe(true);
  });

  it("has maxReconnectAttempts of 10", () => {
    expect(REALTIME_CONNECTION.maxReconnectAttempts).toBe(10);
  });

  it("has reconnectDelay of 1000ms", () => {
    expect(REALTIME_CONNECTION.reconnectDelay).toBe(1000);
  });

  it("has maxReconnectDelay of 30000ms", () => {
    expect(REALTIME_CONNECTION.maxReconnectDelay).toBe(30000);
  });

  it("has timeout of 20000ms", () => {
    expect(REALTIME_CONNECTION.timeout).toBe(20000);
  });

  it("has debug as boolean", () => {
    expect(typeof REALTIME_CONNECTION.debug).toBe("boolean");
  });

  it("debug is false in test environment (NODE_ENV=test, not development)", () => {
    expect(REALTIME_CONNECTION.debug).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// REALTIME_FEATURES
// ---------------------------------------------------------------------------

describe("REALTIME_FEATURES", () => {
  it("is defined as a non-null object", () => {
    expect(REALTIME_FEATURES).toBeDefined();
    expect(typeof REALTIME_FEATURES).toBe("object");
    expect(REALTIME_FEATURES).not.toBeNull();
  });

  it("has presence as boolean", () => {
    expect(typeof REALTIME_FEATURES.presence).toBe("boolean");
  });

  it("has typing as boolean", () => {
    expect(typeof REALTIME_FEATURES.typing).toBe("boolean");
  });

  it("has deliveryReceipts as boolean", () => {
    expect(typeof REALTIME_FEATURES.deliveryReceipts).toBe("boolean");
  });

  it("has offlineQueue as boolean", () => {
    expect(typeof REALTIME_FEATURES.offlineQueue).toBe("boolean");
  });

  it("has autoSync as boolean", () => {
    expect(typeof REALTIME_FEATURES.autoSync).toBe("boolean");
  });

  it("all features default to true when env vars are not set to 'false'", () => {
    // In test env no overrides set, so != 'false' evaluates to true
    expect(REALTIME_FEATURES.presence).toBe(true);
    expect(REALTIME_FEATURES.typing).toBe(true);
    expect(REALTIME_FEATURES.deliveryReceipts).toBe(true);
    expect(REALTIME_FEATURES.offlineQueue).toBe(true);
    expect(REALTIME_FEATURES.autoSync).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// PRESENCE_CONFIG
// ---------------------------------------------------------------------------

describe("PRESENCE_CONFIG", () => {
  it("is defined as a non-null object", () => {
    expect(PRESENCE_CONFIG).toBeDefined();
    expect(typeof PRESENCE_CONFIG).toBe("object");
  });

  it("has heartbeatInterval of 30000ms", () => {
    expect(PRESENCE_CONFIG.heartbeatInterval).toBe(30000);
  });

  it("has idleTimeout of 5 minutes in ms", () => {
    expect(PRESENCE_CONFIG.idleTimeout).toBe(5 * 60 * 1000);
  });

  it("has enableIdleDetection true", () => {
    expect(PRESENCE_CONFIG.enableIdleDetection).toBe(true);
  });

  it("has enablePrivacyFiltering true", () => {
    expect(PRESENCE_CONFIG.enablePrivacyFiltering).toBe(true);
  });

  it("has graphqlEndpoint string", () => {
    expect(typeof PRESENCE_CONFIG.graphqlEndpoint).toBe("string");
    expect(PRESENCE_CONFIG.graphqlEndpoint.length).toBeGreaterThan(0);
  });

  it("has debug as boolean", () => {
    expect(typeof PRESENCE_CONFIG.debug).toBe("boolean");
  });
});

// ---------------------------------------------------------------------------
// TYPING_CONFIG
// ---------------------------------------------------------------------------

describe("TYPING_CONFIG", () => {
  it("is defined as a non-null object", () => {
    expect(TYPING_CONFIG).toBeDefined();
    expect(typeof TYPING_CONFIG).toBe("object");
  });

  it("has typingTimeout of 5000ms", () => {
    expect(TYPING_CONFIG.typingTimeout).toBe(5000);
  });

  it("has debounceInterval of 300ms", () => {
    expect(TYPING_CONFIG.debounceInterval).toBe(300);
  });

  it("has throttleInterval of 1000ms", () => {
    expect(TYPING_CONFIG.throttleInterval).toBe(1000);
  });

  it("has enablePrivacyFiltering true", () => {
    expect(TYPING_CONFIG.enablePrivacyFiltering).toBe(true);
  });

  it("has batchUpdateInterval of 500ms", () => {
    expect(TYPING_CONFIG.batchUpdateInterval).toBe(500);
  });

  it("has debug as boolean", () => {
    expect(typeof TYPING_CONFIG.debug).toBe("boolean");
  });
});

// ---------------------------------------------------------------------------
// DELIVERY_CONFIG
// ---------------------------------------------------------------------------

describe("DELIVERY_CONFIG", () => {
  it("is defined as a non-null object", () => {
    expect(DELIVERY_CONFIG).toBeDefined();
    expect(typeof DELIVERY_CONFIG).toBe("object");
  });

  it("has autoSyncOnReconnect true", () => {
    expect(DELIVERY_CONFIG.autoSyncOnReconnect).toBe(true);
  });

  it("has batchReadAck true", () => {
    expect(DELIVERY_CONFIG.batchReadAck).toBe(true);
  });

  it("has batchReadInterval of 1000ms", () => {
    expect(DELIVERY_CONFIG.batchReadInterval).toBe(1000);
  });

  it("has debug as boolean", () => {
    expect(typeof DELIVERY_CONFIG.debug).toBe("boolean");
  });
});

// ---------------------------------------------------------------------------
// OFFLINE_QUEUE_CONFIG
// ---------------------------------------------------------------------------

describe("OFFLINE_QUEUE_CONFIG", () => {
  it("is defined as a non-null object", () => {
    expect(OFFLINE_QUEUE_CONFIG).toBeDefined();
    expect(typeof OFFLINE_QUEUE_CONFIG).toBe("object");
  });

  it("has maxQueueSize of 100", () => {
    expect(OFFLINE_QUEUE_CONFIG.maxQueueSize).toBe(100);
  });

  it("has maxRetries of 5", () => {
    expect(OFFLINE_QUEUE_CONFIG.maxRetries).toBe(5);
  });

  it("has baseRetryDelay of 1000ms", () => {
    expect(OFFLINE_QUEUE_CONFIG.baseRetryDelay).toBe(1000);
  });

  it("has maxRetryDelay of 30000ms", () => {
    expect(OFFLINE_QUEUE_CONFIG.maxRetryDelay).toBe(30000);
  });

  it("has storageKey 'nchat:offline-queue'", () => {
    expect(OFFLINE_QUEUE_CONFIG.storageKey).toBe("nchat:offline-queue");
  });

  it("has debug as boolean", () => {
    expect(typeof OFFLINE_QUEUE_CONFIG.debug).toBe("boolean");
  });
});

// ---------------------------------------------------------------------------
// SYNC_CONFIG
// ---------------------------------------------------------------------------

describe("SYNC_CONFIG", () => {
  it("is defined as a non-null object", () => {
    expect(SYNC_CONFIG).toBeDefined();
    expect(typeof SYNC_CONFIG).toBe("object");
  });

  it("has maxMessagesPerChannel of 50", () => {
    expect(SYNC_CONFIG.maxMessagesPerChannel).toBe(50);
  });

  it("has autoSyncOnReconnect true", () => {
    expect(SYNC_CONFIG.autoSyncOnReconnect).toBe(true);
  });

  it("has syncTimeout of 30000ms", () => {
    expect(SYNC_CONFIG.syncTimeout).toBe(30000);
  });

  it("has storageKey 'nchat:sync-state'", () => {
    expect(SYNC_CONFIG.storageKey).toBe("nchat:sync-state");
  });

  it("has debug as boolean", () => {
    expect(typeof SYNC_CONFIG.debug).toBe("boolean");
  });
});

// ---------------------------------------------------------------------------
// ROOMS_CONFIG
// ---------------------------------------------------------------------------

describe("ROOMS_CONFIG", () => {
  it("is defined as a non-null object", () => {
    expect(ROOMS_CONFIG).toBeDefined();
    expect(typeof ROOMS_CONFIG).toBe("object");
  });

  it("has autoJoinOnNavigate true", () => {
    expect(ROOMS_CONFIG.autoJoinOnNavigate).toBe(true);
  });

  it("has autoLeaveOnNavigate false", () => {
    expect(ROOMS_CONFIG.autoLeaveOnNavigate).toBe(false);
  });

  it("has cacheRoomData true", () => {
    expect(ROOMS_CONFIG.cacheRoomData).toBe(true);
  });

  it("has debug as boolean", () => {
    expect(typeof ROOMS_CONFIG.debug).toBe("boolean");
  });
});

// ---------------------------------------------------------------------------
// DEFAULT_PRESENCE_PRIVACY
// ---------------------------------------------------------------------------

describe("DEFAULT_PRESENCE_PRIVACY", () => {
  it("is defined as a non-null object", () => {
    expect(DEFAULT_PRESENCE_PRIVACY).toBeDefined();
    expect(typeof DEFAULT_PRESENCE_PRIVACY).toBe("object");
  });

  it("has visibility 'everyone'", () => {
    expect(DEFAULT_PRESENCE_PRIVACY.visibility).toBe("everyone");
  });

  it("has showLastSeen true", () => {
    expect(DEFAULT_PRESENCE_PRIVACY.showLastSeen).toBe(true);
  });

  it("has showOnlineStatus true", () => {
    expect(DEFAULT_PRESENCE_PRIVACY.showOnlineStatus).toBe(true);
  });

  it("has allowReadReceipts true", () => {
    expect(DEFAULT_PRESENCE_PRIVACY.allowReadReceipts).toBe(true);
  });

  it("has invisibleMode false", () => {
    expect(DEFAULT_PRESENCE_PRIVACY.invisibleMode).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// DEFAULT_TYPING_PRIVACY
// ---------------------------------------------------------------------------

describe("DEFAULT_TYPING_PRIVACY", () => {
  it("is defined as a non-null object", () => {
    expect(DEFAULT_TYPING_PRIVACY).toBeDefined();
    expect(typeof DEFAULT_TYPING_PRIVACY).toBe("object");
  });

  it("has broadcastTyping true", () => {
    expect(DEFAULT_TYPING_PRIVACY.broadcastTyping).toBe(true);
  });

  it("has typingVisibility 'everyone'", () => {
    expect(DEFAULT_TYPING_PRIVACY.typingVisibility).toBe("everyone");
  });
});

// ---------------------------------------------------------------------------
// REALTIME_EVENTS
// ---------------------------------------------------------------------------

describe("REALTIME_EVENTS", () => {
  it("is defined as a non-null object", () => {
    expect(REALTIME_EVENTS).toBeDefined();
    expect(typeof REALTIME_EVENTS).toBe("object");
  });

  describe("connection events", () => {
    it("has CONNECT = 'connect'", () => {
      expect(REALTIME_EVENTS.CONNECT).toBe("connect");
    });

    it("has DISCONNECT = 'disconnect'", () => {
      expect(REALTIME_EVENTS.DISCONNECT).toBe("disconnect");
    });

    it("has RECONNECT = 'reconnect'", () => {
      expect(REALTIME_EVENTS.RECONNECT).toBe("reconnect");
    });

    it("has ERROR = 'error'", () => {
      expect(REALTIME_EVENTS.ERROR).toBe("error");
    });
  });

  describe("auth events", () => {
    it("has AUTH = 'auth'", () => {
      expect(REALTIME_EVENTS.AUTH).toBe("auth");
    });

    it("has AUTH_SUCCESS = 'auth:success'", () => {
      expect(REALTIME_EVENTS.AUTH_SUCCESS).toBe("auth:success");
    });

    it("has AUTH_ERROR = 'auth:error'", () => {
      expect(REALTIME_EVENTS.AUTH_ERROR).toBe("auth:error");
    });
  });

  describe("message events", () => {
    it("has MESSAGE_NEW = 'message:new'", () => {
      expect(REALTIME_EVENTS.MESSAGE_NEW).toBe("message:new");
    });

    it("has MESSAGE_UPDATE = 'message:update'", () => {
      expect(REALTIME_EVENTS.MESSAGE_UPDATE).toBe("message:update");
    });

    it("has MESSAGE_DELETE = 'message:delete'", () => {
      expect(REALTIME_EVENTS.MESSAGE_DELETE).toBe("message:delete");
    });

    it("has MESSAGE_DELIVERED = 'message:delivered'", () => {
      expect(REALTIME_EVENTS.MESSAGE_DELIVERED).toBe("message:delivered");
    });

    it("has MESSAGE_READ_BY = 'message:read_by'", () => {
      expect(REALTIME_EVENTS.MESSAGE_READ_BY).toBe("message:read_by");
    });
  });

  describe("presence events", () => {
    it("has PRESENCE_UPDATE = 'presence:update'", () => {
      expect(REALTIME_EVENTS.PRESENCE_UPDATE).toBe("presence:update");
    });

    it("has PRESENCE_CHANGED = 'presence:changed'", () => {
      expect(REALTIME_EVENTS.PRESENCE_CHANGED).toBe("presence:changed");
    });

    it("has PRESENCE_SUBSCRIBE = 'presence:subscribe'", () => {
      expect(REALTIME_EVENTS.PRESENCE_SUBSCRIBE).toBe("presence:subscribe");
    });

    it("has PRESENCE_BULK = 'presence:bulk'", () => {
      expect(REALTIME_EVENTS.PRESENCE_BULK).toBe("presence:bulk");
    });
  });

  describe("typing events", () => {
    it("has TYPING_START = 'typing:start'", () => {
      expect(REALTIME_EVENTS.TYPING_START).toBe("typing:start");
    });

    it("has TYPING_STOP = 'typing:stop'", () => {
      expect(REALTIME_EVENTS.TYPING_STOP).toBe("typing:stop");
    });

    it("has TYPING_BATCH = 'typing:batch'", () => {
      expect(REALTIME_EVENTS.TYPING_BATCH).toBe("typing:batch");
    });
  });

  describe("room events", () => {
    it("has ROOM_JOIN = 'room:join'", () => {
      expect(REALTIME_EVENTS.ROOM_JOIN).toBe("room:join");
    });

    it("has ROOM_LEAVE = 'room:leave'", () => {
      expect(REALTIME_EVENTS.ROOM_LEAVE).toBe("room:leave");
    });

    it("has ROOM_JOINED = 'room:joined'", () => {
      expect(REALTIME_EVENTS.ROOM_JOINED).toBe("room:joined");
    });

    it("has ROOM_LEFT = 'room:left'", () => {
      expect(REALTIME_EVENTS.ROOM_LEFT).toBe("room:left");
    });
  });

  describe("sync events", () => {
    it("has SYNC_MESSAGES = 'sync:messages'", () => {
      expect(REALTIME_EVENTS.SYNC_MESSAGES).toBe("sync:messages");
    });

    it("has SYNC_CHANNELS = 'sync:channels'", () => {
      expect(REALTIME_EVENTS.SYNC_CHANNELS).toBe("sync:channels");
    });

    it("has SYNC_PRESENCE = 'sync:presence'", () => {
      expect(REALTIME_EVENTS.SYNC_PRESENCE).toBe("sync:presence");
    });
  });

  it("all event values are non-empty strings", () => {
    for (const [key, value] of Object.entries(REALTIME_EVENTS)) {
      expect(typeof value).toBe("string", `REALTIME_EVENTS.${key} should be a string`);
      expect((value as string).length).toBeGreaterThan(0, `REALTIME_EVENTS.${key} should not be empty`);
    }
  });
});

// ---------------------------------------------------------------------------
// CONNECTION_QUALITY_THRESHOLDS
// ---------------------------------------------------------------------------

describe("CONNECTION_QUALITY_THRESHOLDS", () => {
  it("is defined as a non-null object", () => {
    expect(CONNECTION_QUALITY_THRESHOLDS).toBeDefined();
    expect(typeof CONNECTION_QUALITY_THRESHOLDS).toBe("object");
  });

  it("has excellent threshold of 100ms", () => {
    expect(CONNECTION_QUALITY_THRESHOLDS.excellent).toBe(100);
  });

  it("has good threshold of 300ms", () => {
    expect(CONNECTION_QUALITY_THRESHOLDS.good).toBe(300);
  });

  it("has fair threshold of 600ms", () => {
    expect(CONNECTION_QUALITY_THRESHOLDS.fair).toBe(600);
  });

  it("has poor threshold of Infinity", () => {
    expect(CONNECTION_QUALITY_THRESHOLDS.poor).toBe(Infinity);
  });

  it("thresholds increase monotonically", () => {
    const { excellent, good, fair, poor } = CONNECTION_QUALITY_THRESHOLDS;
    expect(excellent).toBeLessThan(good);
    expect(good).toBeLessThan(fair);
    expect(fair).toBeLessThan(poor);
  });
});

// ---------------------------------------------------------------------------
// REALTIME_CONFIG (the aggregate export)
// ---------------------------------------------------------------------------

describe("REALTIME_CONFIG", () => {
  it("is defined as a non-null object", () => {
    expect(REALTIME_CONFIG).toBeDefined();
    expect(typeof REALTIME_CONFIG).toBe("object");
  });

  it("has connection property matching REALTIME_CONNECTION", () => {
    expect(REALTIME_CONFIG.connection).toBe(REALTIME_CONNECTION);
  });

  it("has features property matching REALTIME_FEATURES", () => {
    expect(REALTIME_CONFIG.features).toBe(REALTIME_FEATURES);
  });

  it("has services with all 6 service configs", () => {
    expect(REALTIME_CONFIG.services).toHaveProperty("presence");
    expect(REALTIME_CONFIG.services).toHaveProperty("typing");
    expect(REALTIME_CONFIG.services).toHaveProperty("delivery");
    expect(REALTIME_CONFIG.services).toHaveProperty("offlineQueue");
    expect(REALTIME_CONFIG.services).toHaveProperty("sync");
    expect(REALTIME_CONFIG.services).toHaveProperty("rooms");
  });

  it("services.presence matches PRESENCE_CONFIG", () => {
    expect(REALTIME_CONFIG.services.presence).toBe(PRESENCE_CONFIG);
  });

  it("services.typing matches TYPING_CONFIG", () => {
    expect(REALTIME_CONFIG.services.typing).toBe(TYPING_CONFIG);
  });

  it("services.delivery matches DELIVERY_CONFIG", () => {
    expect(REALTIME_CONFIG.services.delivery).toBe(DELIVERY_CONFIG);
  });

  it("services.offlineQueue matches OFFLINE_QUEUE_CONFIG", () => {
    expect(REALTIME_CONFIG.services.offlineQueue).toBe(OFFLINE_QUEUE_CONFIG);
  });

  it("services.sync matches SYNC_CONFIG", () => {
    expect(REALTIME_CONFIG.services.sync).toBe(SYNC_CONFIG);
  });

  it("services.rooms matches ROOMS_CONFIG", () => {
    expect(REALTIME_CONFIG.services.rooms).toBe(ROOMS_CONFIG);
  });

  it("has privacy with presence and typing objects", () => {
    expect(REALTIME_CONFIG.privacy).toHaveProperty("presence");
    expect(REALTIME_CONFIG.privacy).toHaveProperty("typing");
  });

  it("privacy.presence matches DEFAULT_PRESENCE_PRIVACY", () => {
    expect(REALTIME_CONFIG.privacy.presence).toBe(DEFAULT_PRESENCE_PRIVACY);
  });

  it("privacy.typing matches DEFAULT_TYPING_PRIVACY", () => {
    expect(REALTIME_CONFIG.privacy.typing).toBe(DEFAULT_TYPING_PRIVACY);
  });

  it("has events property matching REALTIME_EVENTS", () => {
    expect(REALTIME_CONFIG.events).toBe(REALTIME_EVENTS);
  });

  it("has connectionQuality property matching CONNECTION_QUALITY_THRESHOLDS", () => {
    expect(REALTIME_CONFIG.connectionQuality).toBe(
      CONNECTION_QUALITY_THRESHOLDS,
    );
  });
});
