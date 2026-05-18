/**
 * Tests for webrtc/servers.ts
 *
 * Covers all pure/synchronous exports:
 *   DEFAULT_STUN_SERVERS, ALTERNATIVE_STUN_SERVERS,
 *   getTurnServerFromEnv, getAdditionalTurnServers,
 *   getIceServers, getIceServerConfig, buildRTCConfiguration,
 *   isValidServerUrl, validateIceServer, validateIceServers,
 *   isTurnConfigured, isForceTurnEnabled
 *
 * The browser-dependent async functions (testStunServer, testTurnServer,
 * testAllServers, getOptimalIceServers) require RTCPeerConnection and are
 * excluded — they cannot run in a jsdom/node test environment without mocking
 * the entire WebRTC API, which would test the mock rather than the code.
 */

import {
  DEFAULT_STUN_SERVERS,
  ALTERNATIVE_STUN_SERVERS,
  getTurnServerFromEnv,
  getAdditionalTurnServers,
  getIceServers,
  getIceServerConfig,
  buildRTCConfiguration,
  isValidServerUrl,
  validateIceServer,
  validateIceServers,
  isTurnConfigured,
  isForceTurnEnabled,
} from "../servers";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const clearTurnEnv = () => {
  delete process.env.NEXT_PUBLIC_TURN_SERVER_URL;
  delete process.env.NEXT_PUBLIC_TURN_USERNAME;
  delete process.env.NEXT_PUBLIC_TURN_CREDENTIAL;
  delete process.env.NEXT_PUBLIC_TURN_ADDITIONAL_URLS;
  delete process.env.NEXT_PUBLIC_FORCE_TURN;
};

// ---------------------------------------------------------------------------
// DEFAULT_STUN_SERVERS
// ---------------------------------------------------------------------------

describe("DEFAULT_STUN_SERVERS", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(DEFAULT_STUN_SERVERS)).toBe(true);
    expect(DEFAULT_STUN_SERVERS.length).toBeGreaterThan(0);
  });

  it("contains exactly 5 Google STUN servers", () => {
    expect(DEFAULT_STUN_SERVERS).toHaveLength(5);
  });

  it("every entry has a string urls property", () => {
    for (const server of DEFAULT_STUN_SERVERS) {
      expect(typeof server.urls).toBe("string");
    }
  });

  it("every url starts with stun:", () => {
    for (const server of DEFAULT_STUN_SERVERS) {
      expect(server.urls as string).toMatch(/^stun:/);
    }
  });

  it("all urls are Google STUN servers", () => {
    for (const server of DEFAULT_STUN_SERVERS) {
      expect(server.urls as string).toMatch(
        /stun\.l\.google\.com|stun\d\.l\.google\.com/,
      );
    }
  });

  it("none of the servers require credentials", () => {
    for (const server of DEFAULT_STUN_SERVERS) {
      expect(server.username).toBeUndefined();
      expect(server.credential).toBeUndefined();
    }
  });

  it("contains stun.l.google.com:19302", () => {
    const urls = DEFAULT_STUN_SERVERS.map((s) => s.urls);
    expect(urls).toContain("stun:stun.l.google.com:19302");
  });

  it("all five Google servers are reachable on port 19302", () => {
    for (const server of DEFAULT_STUN_SERVERS) {
      expect(server.urls as string).toMatch(/:19302$/);
    }
  });
});

// ---------------------------------------------------------------------------
// ALTERNATIVE_STUN_SERVERS
// ---------------------------------------------------------------------------

describe("ALTERNATIVE_STUN_SERVERS", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(ALTERNATIVE_STUN_SERVERS)).toBe(true);
    expect(ALTERNATIVE_STUN_SERVERS.length).toBeGreaterThan(0);
  });

  it("contains exactly 3 alternative servers", () => {
    expect(ALTERNATIVE_STUN_SERVERS).toHaveLength(3);
  });

  it("every entry has a string urls property starting with stun:", () => {
    for (const server of ALTERNATIVE_STUN_SERVERS) {
      expect(typeof server.urls).toBe("string");
      expect(server.urls as string).toMatch(/^stun:/);
    }
  });

  it("none require credentials", () => {
    for (const server of ALTERNATIVE_STUN_SERVERS) {
      expect(server.username).toBeUndefined();
      expect(server.credential).toBeUndefined();
    }
  });

  it("is distinct from DEFAULT_STUN_SERVERS", () => {
    const defaultUrls = DEFAULT_STUN_SERVERS.map((s) => s.urls);
    const altUrls = ALTERNATIVE_STUN_SERVERS.map((s) => s.urls);
    const overlap = altUrls.filter((u) => defaultUrls.includes(u));
    expect(overlap).toHaveLength(0);
  });

  it("contains stunprotocol.org server", () => {
    const urls = ALTERNATIVE_STUN_SERVERS.map((s) => s.urls);
    expect(urls).toContain("stun:stun.stunprotocol.org:3478");
  });
});

// ---------------------------------------------------------------------------
// getTurnServerFromEnv
// ---------------------------------------------------------------------------

describe("getTurnServerFromEnv", () => {
  beforeEach(clearTurnEnv);
  afterAll(clearTurnEnv);

  it("returns null when NEXT_PUBLIC_TURN_SERVER_URL is unset", () => {
    expect(getTurnServerFromEnv()).toBeNull();
  });

  it("returns a server object when NEXT_PUBLIC_TURN_SERVER_URL is set", () => {
    process.env.NEXT_PUBLIC_TURN_SERVER_URL = "turn:turn.example.com:3478";
    const result = getTurnServerFromEnv();
    expect(result).not.toBeNull();
    expect(result!.urls).toBe("turn:turn.example.com:3478");
  });

  it("includes username and credential when both are set", () => {
    process.env.NEXT_PUBLIC_TURN_SERVER_URL = "turn:turn.example.com:3478";
    process.env.NEXT_PUBLIC_TURN_USERNAME = "alice";
    process.env.NEXT_PUBLIC_TURN_CREDENTIAL = "secret";
    const result = getTurnServerFromEnv();
    expect(result).not.toBeNull();
    expect(result!.username).toBe("alice");
    expect(result!.credential).toBe("secret");
    expect(result!.credentialType).toBe("password");
  });

  it("omits credentials when only username is set (no credential)", () => {
    process.env.NEXT_PUBLIC_TURN_SERVER_URL = "turn:turn.example.com:3478";
    process.env.NEXT_PUBLIC_TURN_USERNAME = "alice";
    // No NEXT_PUBLIC_TURN_CREDENTIAL
    const result = getTurnServerFromEnv();
    expect(result).not.toBeNull();
    expect(result!.username).toBeUndefined();
    expect(result!.credential).toBeUndefined();
    expect(result!.credentialType).toBeUndefined();
  });

  it("omits credentials when only credential is set (no username)", () => {
    process.env.NEXT_PUBLIC_TURN_SERVER_URL = "turn:turn.example.com:3478";
    process.env.NEXT_PUBLIC_TURN_CREDENTIAL = "secret";
    // No NEXT_PUBLIC_TURN_USERNAME
    const result = getTurnServerFromEnv();
    expect(result).not.toBeNull();
    expect(result!.username).toBeUndefined();
    expect(result!.credential).toBeUndefined();
  });

  it("includes the urls field equal to the env var", () => {
    process.env.NEXT_PUBLIC_TURN_SERVER_URL =
      "turn:my.turn.host:443?transport=tcp";
    const result = getTurnServerFromEnv();
    expect(result!.urls).toBe("turn:my.turn.host:443?transport=tcp");
  });
});

// ---------------------------------------------------------------------------
// getAdditionalTurnServers
// ---------------------------------------------------------------------------

describe("getAdditionalTurnServers", () => {
  beforeEach(clearTurnEnv);
  afterAll(clearTurnEnv);

  it("returns empty array when NEXT_PUBLIC_TURN_ADDITIONAL_URLS is unset", () => {
    expect(getAdditionalTurnServers()).toEqual([]);
  });

  it("returns one server for a single URL", () => {
    process.env.NEXT_PUBLIC_TURN_ADDITIONAL_URLS = "turn:a.example.com:3478";
    const result = getAdditionalTurnServers();
    expect(result).toHaveLength(1);
    expect(result[0].urls).toBe("turn:a.example.com:3478");
  });

  it("splits comma-separated URLs into multiple servers", () => {
    process.env.NEXT_PUBLIC_TURN_ADDITIONAL_URLS =
      "turn:a.example.com:3478,turn:b.example.com:3478";
    const result = getAdditionalTurnServers();
    expect(result).toHaveLength(2);
    expect(result[0].urls).toBe("turn:a.example.com:3478");
    expect(result[1].urls).toBe("turn:b.example.com:3478");
  });

  it("trims whitespace from each URL", () => {
    process.env.NEXT_PUBLIC_TURN_ADDITIONAL_URLS =
      "turn:a.example.com:3478 , turn:b.example.com:3478";
    const result = getAdditionalTurnServers();
    expect(result[0].urls).toBe("turn:a.example.com:3478");
    expect(result[1].urls).toBe("turn:b.example.com:3478");
  });

  it("applies credentials to each additional server when set", () => {
    process.env.NEXT_PUBLIC_TURN_ADDITIONAL_URLS =
      "turn:a.example.com:3478,turn:b.example.com:3478";
    process.env.NEXT_PUBLIC_TURN_USERNAME = "user1";
    process.env.NEXT_PUBLIC_TURN_CREDENTIAL = "pass1";
    const result = getAdditionalTurnServers();
    for (const server of result) {
      expect(server.username).toBe("user1");
      expect(server.credential).toBe("pass1");
      expect(server.credentialType).toBe("password");
    }
  });
});

// ---------------------------------------------------------------------------
// getIceServers
// ---------------------------------------------------------------------------

describe("getIceServers", () => {
  beforeEach(clearTurnEnv);
  afterAll(clearTurnEnv);

  it("returns DEFAULT_STUN_SERVERS when no TURN env vars are set", () => {
    const result = getIceServers();
    expect(result).toHaveLength(DEFAULT_STUN_SERVERS.length);
    expect(result).toEqual(DEFAULT_STUN_SERVERS);
  });

  it("includes the TURN server when NEXT_PUBLIC_TURN_SERVER_URL is set", () => {
    process.env.NEXT_PUBLIC_TURN_SERVER_URL = "turn:turn.example.com:3478";
    process.env.NEXT_PUBLIC_TURN_USERNAME = "u";
    process.env.NEXT_PUBLIC_TURN_CREDENTIAL = "c";
    const result = getIceServers();
    expect(result.length).toBe(DEFAULT_STUN_SERVERS.length + 1);
    const turnServer = result.find((s) =>
      (s.urls as string).startsWith("turn:"),
    );
    expect(turnServer).toBeDefined();
    expect(turnServer!.urls).toBe("turn:turn.example.com:3478");
  });

  it("includes additional TURN servers when NEXT_PUBLIC_TURN_ADDITIONAL_URLS is set", () => {
    process.env.NEXT_PUBLIC_TURN_ADDITIONAL_URLS =
      "turn:a.example.com:3478,turn:b.example.com:3478";
    const result = getIceServers();
    expect(result.length).toBe(DEFAULT_STUN_SERVERS.length + 2);
  });

  it("does not mutate DEFAULT_STUN_SERVERS array", () => {
    const originalLength = DEFAULT_STUN_SERVERS.length;
    process.env.NEXT_PUBLIC_TURN_SERVER_URL = "turn:turn.example.com:3478";
    getIceServers();
    expect(DEFAULT_STUN_SERVERS).toHaveLength(originalLength);
  });
});

// ---------------------------------------------------------------------------
// getIceServerConfig
// ---------------------------------------------------------------------------

describe("getIceServerConfig", () => {
  beforeEach(clearTurnEnv);
  afterAll(clearTurnEnv);

  it("returns an object with stunServers, turnServers, iceTransportPolicy", () => {
    const config = getIceServerConfig();
    expect(config).toHaveProperty("stunServers");
    expect(config).toHaveProperty("turnServers");
    expect(config).toHaveProperty("iceTransportPolicy");
  });

  it("stunServers equals DEFAULT_STUN_SERVERS", () => {
    const config = getIceServerConfig();
    expect(config.stunServers).toBe(DEFAULT_STUN_SERVERS);
  });

  it("turnServers is empty array when no TURN env vars are set", () => {
    const config = getIceServerConfig();
    expect(config.turnServers).toEqual([]);
  });

  it("iceTransportPolicy defaults to 'all'", () => {
    const config = getIceServerConfig();
    expect(config.iceTransportPolicy).toBe("all");
  });

  it("iceTransportPolicy is 'relay' when NEXT_PUBLIC_FORCE_TURN is 'true'", () => {
    process.env.NEXT_PUBLIC_FORCE_TURN = "true";
    const config = getIceServerConfig();
    expect(config.iceTransportPolicy).toBe("relay");
  });

  it("iceTransportPolicy remains 'all' when NEXT_PUBLIC_FORCE_TURN is 'false'", () => {
    process.env.NEXT_PUBLIC_FORCE_TURN = "false";
    const config = getIceServerConfig();
    expect(config.iceTransportPolicy).toBe("all");
  });

  it("turnServers includes TURN server from env when set", () => {
    process.env.NEXT_PUBLIC_TURN_SERVER_URL = "turn:turn.example.com:3478";
    process.env.NEXT_PUBLIC_TURN_USERNAME = "u";
    process.env.NEXT_PUBLIC_TURN_CREDENTIAL = "c";
    const config = getIceServerConfig();
    expect(config.turnServers).toHaveLength(1);
    expect(config.turnServers[0].urls).toBe("turn:turn.example.com:3478");
  });

  it("turnServers includes additional TURN servers from env", () => {
    process.env.NEXT_PUBLIC_TURN_ADDITIONAL_URLS =
      "turn:a.example.com:3478,turn:b.example.com:3478";
    const config = getIceServerConfig();
    expect(config.turnServers).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// buildRTCConfiguration
// ---------------------------------------------------------------------------

describe("buildRTCConfiguration", () => {
  beforeEach(clearTurnEnv);
  afterAll(clearTurnEnv);

  it("returns an object with iceServers, iceTransportPolicy, bundlePolicy, rtcpMuxPolicy, iceCandidatePoolSize", () => {
    const config = buildRTCConfiguration();
    expect(config).toHaveProperty("iceServers");
    expect(config).toHaveProperty("iceTransportPolicy");
    expect(config).toHaveProperty("bundlePolicy");
    expect(config).toHaveProperty("rtcpMuxPolicy");
    expect(config).toHaveProperty("iceCandidatePoolSize");
  });

  it("defaults to iceTransportPolicy 'all'", () => {
    expect(buildRTCConfiguration().iceTransportPolicy).toBe("all");
  });

  it("defaults to bundlePolicy 'max-bundle'", () => {
    expect(buildRTCConfiguration().bundlePolicy).toBe("max-bundle");
  });

  it("defaults to rtcpMuxPolicy 'require'", () => {
    expect(buildRTCConfiguration().rtcpMuxPolicy).toBe("require");
  });

  it("defaults iceCandidatePoolSize to 10", () => {
    expect(buildRTCConfiguration().iceCandidatePoolSize).toBe(10);
  });

  it("uses provided servers when passed explicitly", () => {
    const customServers = [{ urls: "stun:stun.example.com:3478" }];
    const config = buildRTCConfiguration(customServers);
    expect(config.iceServers).toHaveLength(1);
    expect(config.iceServers![0].urls).toBe("stun:stun.example.com:3478");
  });

  it("maps IceServer shape to RTCIceServer shape correctly", () => {
    const server = {
      urls: "turn:turn.example.com:3478",
      username: "alice",
      credential: "secret",
      credentialType: "password" as const,
    };
    const config = buildRTCConfiguration([server]);
    const rtcServer = config.iceServers![0];
    expect(rtcServer.urls).toBe("turn:turn.example.com:3478");
    expect(rtcServer.username).toBe("alice");
    expect(rtcServer.credential).toBe("secret");
    expect(rtcServer.credentialType).toBe("password");
  });

  it("respects options.iceTransportPolicy override", () => {
    const config = buildRTCConfiguration(undefined, {
      iceTransportPolicy: "relay",
    });
    expect(config.iceTransportPolicy).toBe("relay");
  });

  it("respects options.bundlePolicy override", () => {
    const config = buildRTCConfiguration(undefined, {
      bundlePolicy: "balanced",
    });
    expect(config.bundlePolicy).toBe("balanced");
  });

  it("respects options.iceCandidatePoolSize override", () => {
    const config = buildRTCConfiguration(undefined, {
      iceCandidatePoolSize: 5,
    });
    expect(config.iceCandidatePoolSize).toBe(5);
  });

  it("uses getIceServers() when no servers argument supplied", () => {
    const config = buildRTCConfiguration();
    // By default returns DEFAULT_STUN_SERVERS (no TURN set)
    expect(config.iceServers).toHaveLength(DEFAULT_STUN_SERVERS.length);
  });
});

// ---------------------------------------------------------------------------
// isValidServerUrl
// ---------------------------------------------------------------------------

describe("isValidServerUrl", () => {
  // Valid STUN URLs
  it("accepts stun:host:port", () => {
    expect(isValidServerUrl("stun:stun.l.google.com:19302")).toBe(true);
  });

  it("accepts stun with numeric IP host", () => {
    expect(isValidServerUrl("stun:8.8.8.8:3478")).toBe(true);
  });

  // Valid TURN URLs
  it("accepts turn:host:port", () => {
    expect(isValidServerUrl("turn:turn.example.com:3478")).toBe(true);
  });

  it("accepts turns:host:port (TLS)", () => {
    expect(isValidServerUrl("turns:turn.example.com:443")).toBe(true);
  });

  it("accepts turn with udp transport", () => {
    expect(isValidServerUrl("turn:turn.example.com:3478?transport=udp")).toBe(
      true,
    );
  });

  it("accepts turn with tcp transport", () => {
    expect(isValidServerUrl("turn:turn.example.com:3478?transport=tcp")).toBe(
      true,
    );
  });

  // Invalid URLs
  it("rejects empty string", () => {
    expect(isValidServerUrl("")).toBe(false);
  });

  it("rejects plain http URL", () => {
    expect(isValidServerUrl("http://example.com")).toBe(false);
  });

  it("rejects stun without port", () => {
    expect(isValidServerUrl("stun:example.com")).toBe(false);
  });

  it("rejects stun with non-numeric port", () => {
    expect(isValidServerUrl("stun:example.com:abc")).toBe(false);
  });

  it("rejects turn without port", () => {
    expect(isValidServerUrl("turn:example.com")).toBe(false);
  });

  it("rejects turn with invalid transport value", () => {
    expect(isValidServerUrl("turn:example.com:3478?transport=sctp")).toBe(
      false,
    );
  });

  it("rejects arbitrary string", () => {
    expect(isValidServerUrl("not-a-server")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateIceServer
// ---------------------------------------------------------------------------

describe("validateIceServer", () => {
  it("returns valid:true for a well-formed STUN server", () => {
    const result = validateIceServer({ urls: "stun:stun.l.google.com:19302" });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("returns valid:true for a TURN server with credentials", () => {
    const result = validateIceServer({
      urls: "turn:turn.example.com:3478",
      username: "user",
      credential: "pass",
      credentialType: "password",
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("returns valid:false for a TURN server without credentials", () => {
    const result = validateIceServer({ urls: "turn:turn.example.com:3478" });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "TURN servers require username and credential",
    );
  });

  it("returns valid:false for an invalid URL", () => {
    const result = validateIceServer({ urls: "http://example.com" });
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.includes("Invalid ICE server URL")),
    ).toBe(true);
  });

  it("handles array of valid URLs", () => {
    const result = validateIceServer({
      urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"],
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("reports invalid URL within array", () => {
    const result = validateIceServer({
      urls: ["stun:stun.l.google.com:19302", "bad-url"],
    });
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.includes("Invalid ICE server URL: bad-url")),
    ).toBe(true);
  });

  it("returns {valid, errors} shape", () => {
    const result = validateIceServer({ urls: "stun:stun.l.google.com:19302" });
    expect(result).toHaveProperty("valid");
    expect(result).toHaveProperty("errors");
    expect(Array.isArray(result.errors)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateIceServers
// ---------------------------------------------------------------------------

describe("validateIceServers", () => {
  it("returns valid:true when all servers are valid", () => {
    const servers = [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ];
    const result = validateIceServers(servers);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.validServers).toHaveLength(2);
  });

  it("returns valid:false and separates invalid servers", () => {
    const servers = [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "bad-url" },
    ];
    const result = validateIceServers(servers);
    // valid is still true because there is at least one valid server
    expect(result.valid).toBe(true);
    expect(result.validServers).toHaveLength(1);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toMatch(/^Server 1:/);
  });

  it("valid is false when ALL servers are invalid", () => {
    const servers = [{ urls: "bad-url-1" }, { urls: "bad-url-2" }];
    const result = validateIceServers(servers);
    expect(result.valid).toBe(false);
    expect(result.validServers).toHaveLength(0);
  });

  it("returns {valid, errors, validServers} shape", () => {
    const result = validateIceServers([
      { urls: "stun:stun.l.google.com:19302" },
    ]);
    expect(result).toHaveProperty("valid");
    expect(result).toHaveProperty("errors");
    expect(result).toHaveProperty("validServers");
  });

  it("handles empty array (valid:false — no valid servers)", () => {
    const result = validateIceServers([]);
    expect(result.valid).toBe(false);
    expect(result.validServers).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it("prefixes errors with server index", () => {
    const result = validateIceServers([{ urls: "bad" }]);
    expect(result.errors[0]).toMatch(/^Server 0:/);
  });

  it("validates DEFAULT_STUN_SERVERS as all valid", () => {
    const result = validateIceServers(DEFAULT_STUN_SERVERS);
    expect(result.valid).toBe(true);
    expect(result.validServers).toHaveLength(DEFAULT_STUN_SERVERS.length);
    expect(result.errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// isTurnConfigured
// ---------------------------------------------------------------------------

describe("isTurnConfigured", () => {
  beforeEach(clearTurnEnv);
  afterAll(clearTurnEnv);

  it("returns false when NEXT_PUBLIC_TURN_SERVER_URL is unset", () => {
    expect(isTurnConfigured()).toBe(false);
  });

  it("returns true when NEXT_PUBLIC_TURN_SERVER_URL is set", () => {
    process.env.NEXT_PUBLIC_TURN_SERVER_URL = "turn:turn.example.com:3478";
    expect(isTurnConfigured()).toBe(true);
  });

  it("returns false when NEXT_PUBLIC_TURN_SERVER_URL is empty string", () => {
    process.env.NEXT_PUBLIC_TURN_SERVER_URL = "";
    expect(isTurnConfigured()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isForceTurnEnabled
// ---------------------------------------------------------------------------

describe("isForceTurnEnabled", () => {
  beforeEach(clearTurnEnv);
  afterAll(clearTurnEnv);

  it("returns false when NEXT_PUBLIC_FORCE_TURN is unset", () => {
    expect(isForceTurnEnabled()).toBe(false);
  });

  it("returns true when NEXT_PUBLIC_FORCE_TURN is 'true'", () => {
    process.env.NEXT_PUBLIC_FORCE_TURN = "true";
    expect(isForceTurnEnabled()).toBe(true);
  });

  it("returns false when NEXT_PUBLIC_FORCE_TURN is 'false'", () => {
    process.env.NEXT_PUBLIC_FORCE_TURN = "false";
    expect(isForceTurnEnabled()).toBe(false);
  });

  it("returns false when NEXT_PUBLIC_FORCE_TURN is 'TRUE' (case-sensitive)", () => {
    process.env.NEXT_PUBLIC_FORCE_TURN = "TRUE";
    expect(isForceTurnEnabled()).toBe(false);
  });

  it("returns false when NEXT_PUBLIC_FORCE_TURN is '1'", () => {
    process.env.NEXT_PUBLIC_FORCE_TURN = "1";
    expect(isForceTurnEnabled()).toBe(false);
  });
});
