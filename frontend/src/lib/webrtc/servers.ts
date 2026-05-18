/**
 * STUN/TURN Server Configuration
 *
 * Manages ICE server configuration for WebRTC peer connections.
 * Supports environment-based configuration for TURN servers.
 */

import type { IceServer, IceServerConfig } from "@/types/calls";

// =============================================================================
// Constants
// =============================================================================

/**
 * Default public STUN servers (Google)
 */
export const DEFAULT_STUN_SERVERS: IceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" },
];

/**
 * Alternative STUN servers
 */
export const ALTERNATIVE_STUN_SERVERS: IceServer[] = [
  { urls: "stun:stun.stunprotocol.org:3478" },
  { urls: "stun:stun.voip.blackberry.com:3478" },
  { urls: "stun:stun.nextcloud.com:443" },
];

// =============================================================================
// Configuration Functions
// =============================================================================

/**
 * Get TURN server configuration from environment variables
 */
export function getTurnServerFromEnv(): IceServer | null {
  const turnUrl = process.env.NEXT_PUBLIC_TURN_SERVER_URL;
  const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME;
  const turnCredential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;

  if (!turnUrl) {
    return null;
  }

  const server: IceServer = { urls: turnUrl };

  if (turnUsername && turnCredential) {
    server.username = turnUsername;
    server.credential = turnCredential;
    server.credentialType = "password";
  }

  return server;
}

/**
 * Get additional TURN servers from environment (comma-separated)
 */
export function getAdditionalTurnServers(): IceServer[] {
  const additionalUrls = process.env.NEXT_PUBLIC_TURN_ADDITIONAL_URLS;

  if (!additionalUrls) {
    return [];
  }

  const username = process.env.NEXT_PUBLIC_TURN_USERNAME;
  const credential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;

  return additionalUrls.split(",").map((url) => ({
    urls: url.trim(),
    username,
    credential,
    credentialType: "password" as const,
  }));
}

/**
 * Get all configured ICE servers
 */
export function getIceServers(): IceServer[] {
  const servers: IceServer[] = [...DEFAULT_STUN_SERVERS];

  // Add TURN server from environment
  const turnServer = getTurnServerFromEnv();
  if (turnServer) {
    servers.push(turnServer);
  }

  // Add additional TURN servers
  const additionalServers = getAdditionalTurnServers();
  servers.push(...additionalServers);

  return servers;
}

/**
 * Get full ICE server configuration
 */
export function getIceServerConfig(): IceServerConfig {
  const turnServer = getTurnServerFromEnv();
  const additionalTurn = getAdditionalTurnServers();

  // Determine transport policy based on TURN availability
  const iceTransportPolicy: RTCIceTransportPolicy =
    process.env.NEXT_PUBLIC_FORCE_TURN === "true" ? "relay" : "all";

  return {
    stunServers: DEFAULT_STUN_SERVERS,
    turnServers: turnServer ? [turnServer, ...additionalTurn] : additionalTurn,
    iceTransportPolicy,
  };
}

/**
 * Build RTCConfiguration from ICE servers
 */
export function buildRTCConfiguration(
  servers?: IceServer[],
  options?: Partial<RTCConfiguration>,
): RTCConfiguration {
  const iceServers = servers || getIceServers();

  return {
    iceServers: iceServers.map((server) => ({
      urls: server.urls,
      username: server.username,
      credential: server.credential,
      credentialType: server.credentialType,
    })),
    iceTransportPolicy: options?.iceTransportPolicy ?? "all",
    bundlePolicy: options?.bundlePolicy ?? "max-bundle",
    rtcpMuxPolicy: options?.rtcpMuxPolicy ?? "require",
    iceCandidatePoolSize: options?.iceCandidatePoolSize ?? 10,
  };
}

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Validate STUN/TURN server URL format
 */
export function isValidServerUrl(url: string): boolean {
  const stunPattern = /^stun:[a-zA-Z0-9.-]+:\d+$/;
  const turnPattern = /^turn(s)?:[a-zA-Z0-9.-]+:\d+(\?transport=(udp|tcp))?$/;

  return stunPattern.test(url) || turnPattern.test(url);
}

/**
 * Validate an ICE server configuration
 */
export function validateIceServer(server: IceServer): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check URLs
  const urls = Array.isArray(server.urls) ? server.urls : [server.urls];

  if (urls.length === 0) {
    errors.push("ICE server must have at least one URL");
  }

  urls.forEach((url) => {
    if (!isValidServerUrl(url)) {
      errors.push(`Invalid ICE server URL: ${url}`);
    }
  });

  // TURN servers require credentials
  const isTurn = urls.some((url) => url.startsWith("turn"));
  if (isTurn && (!server.username || !server.credential)) {
    errors.push("TURN servers require username and credential");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate all configured ICE servers
 */
export function validateIceServers(servers: IceServer[]): {
  valid: boolean;
  errors: string[];
  validServers: IceServer[];
} {
  const allErrors: string[] = [];
  const validServers: IceServer[] = [];

  servers.forEach((server, index) => {
    const result = validateIceServer(server);
    if (result.valid) {
      validServers.push(server);
    } else {
      result.errors.forEach((error) => {
        allErrors.push(`Server ${index}: ${error}`);
      });
    }
  });

  return {
    valid: validServers.length > 0,
    errors: allErrors,
    validServers,
  };
}

// =============================================================================
// Connectivity Testing
// =============================================================================

/**
 * Test connectivity to a STUN server
 */
export async function testStunServer(
  serverUrl: string,
  timeoutMs: number = 5000,
): Promise<{
  success: boolean;
  latencyMs?: number;
  error?: string;
}> {
  return new Promise((resolve) => {
    const startTime = Date.now();

    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: serverUrl }],
      });

      let resolved = false;

      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          pc.close();
          resolve({ success: false, error: "Connection timeout" });
        }
      }, timeoutMs);

      pc.onicecandidate = (event) => {
        if (event.candidate && event.candidate.type === "srflx") {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            const latencyMs = Date.now() - startTime;
            pc.close();
            resolve({ success: true, latencyMs });
          }
        }
      };

      pc.onicecandidateerror = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          pc.close();
          resolve({ success: false, error: "ICE candidate error" });
        }
      };

      // Create data channel to trigger ICE gathering
      pc.createDataChannel("test");
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .catch((error) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            pc.close();
            resolve({ success: false, error: error.message });
          }
        });
    } catch (error) {
      resolve({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
}

/**
 * Test connectivity to a TURN server
 */
export async function testTurnServer(
  server: IceServer,
  timeoutMs: number = 10000,
): Promise<{
  success: boolean;
  latencyMs?: number;
  error?: string;
}> {
  return new Promise((resolve) => {
    const startTime = Date.now();

    try {
      const pc = new RTCPeerConnection({
        iceServers: [server],
        iceTransportPolicy: "relay",
      });

      let resolved = false;

      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          pc.close();
          resolve({ success: false, error: "Connection timeout" });
        }
      }, timeoutMs);

      pc.onicecandidate = (event) => {
        if (event.candidate && event.candidate.type === "relay") {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            const latencyMs = Date.now() - startTime;
            pc.close();
            resolve({ success: true, latencyMs });
          }
        }
      };

      pc.onicecandidateerror = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          pc.close();
          resolve({ success: false, error: "TURN authentication failed" });
        }
      };

      // Create data channel to trigger ICE gathering
      pc.createDataChannel("test");
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .catch((error) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            pc.close();
            resolve({ success: false, error: error.message });
          }
        });
    } catch (error) {
      resolve({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
}

/**
 * Test all configured ICE servers
 */
export async function testAllServers(servers?: IceServer[]): Promise<{
  stunResults: Map<
    string,
    { success: boolean; latencyMs?: number; error?: string }
  >;
  turnResults: Map<
    string,
    { success: boolean; latencyMs?: number; error?: string }
  >;
  summary: {
    stunAvailable: boolean;
    turnAvailable: boolean;
    fastestStun?: string;
    fastestTurn?: string;
  };
}> {
  const iceServers = servers || getIceServers();
  const stunResults = new Map<
    string,
    { success: boolean; latencyMs?: number; error?: string }
  >();
  const turnResults = new Map<
    string,
    { success: boolean; latencyMs?: number; error?: string }
  >();

  // Test STUN servers in parallel
  const stunTests = iceServers
    .filter((s) => {
      const urls = Array.isArray(s.urls) ? s.urls : [s.urls];
      return urls.some((url) => url.startsWith("stun:"));
    })
    .map(async (server) => {
      const url = Array.isArray(server.urls) ? server.urls[0] : server.urls;
      const result = await testStunServer(url);
      stunResults.set(url, result);
    });

  // Test TURN servers in parallel
  const turnTests = iceServers
    .filter((s) => {
      const urls = Array.isArray(s.urls) ? s.urls : [s.urls];
      return urls.some((url) => url.startsWith("turn"));
    })
    .map(async (server) => {
      const url = Array.isArray(server.urls) ? server.urls[0] : server.urls;
      const result = await testTurnServer(server);
      turnResults.set(url, result);
    });

  await Promise.all([...stunTests, ...turnTests]);

  // Find fastest servers
  let fastestStun: string | undefined;
  let fastestStunLatency = Infinity;
  stunResults.forEach((result, url) => {
    if (
      result.success &&
      result.latencyMs &&
      result.latencyMs < fastestStunLatency
    ) {
      fastestStun = url;
      fastestStunLatency = result.latencyMs;
    }
  });

  let fastestTurn: string | undefined;
  let fastestTurnLatency = Infinity;
  turnResults.forEach((result, url) => {
    if (
      result.success &&
      result.latencyMs &&
      result.latencyMs < fastestTurnLatency
    ) {
      fastestTurn = url;
      fastestTurnLatency = result.latencyMs;
    }
  });

  return {
    stunResults,
    turnResults,
    summary: {
      stunAvailable: Array.from(stunResults.values()).some((r) => r.success),
      turnAvailable: Array.from(turnResults.values()).some((r) => r.success),
      fastestStun,
      fastestTurn,
    },
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get optimal ICE servers based on connectivity test
 */
export async function getOptimalIceServers(): Promise<IceServer[]> {
  const results = await testAllServers();
  const optimalServers: IceServer[] = [];

  // Add fastest STUN server
  if (results.summary.fastestStun) {
    optimalServers.push({ urls: results.summary.fastestStun });
  } else {
    // Fallback to first default STUN
    optimalServers.push(DEFAULT_STUN_SERVERS[0]);
  }

  // Add working TURN server if available
  if (results.summary.fastestTurn) {
    const turnServer = getTurnServerFromEnv();
    if (turnServer) {
      optimalServers.push(turnServer);
    }
  }

  return optimalServers;
}

/**
 * Check if TURN is configured
 */
export function isTurnConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_TURN_SERVER_URL;
}

/**
 * Check if force TURN mode is enabled
 */
export function isForceTurnEnabled(): boolean {
  return process.env.NEXT_PUBLIC_FORCE_TURN === "true";
}
