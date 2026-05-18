/**
 * nChat SDK - TypeScript Client Library
 *
 * A comprehensive SDK for building applications on top of nChat.
 * Provides type-safe access to all nChat APIs including GraphQL and REST endpoints.
 *
 * @packageDocumentation
 * @module @nchat/sdk
 * @version 1.0.0
 *
 * @example
 * ```typescript
 * import { NChatClient } from '@nchat/sdk'
 *
 * const client = new NChatClient({
 *   apiUrl: 'https://api.nchat.example.com',
 * // sast-ignore: HARDCODED_CREDENTIAL -- JSDoc example with placeholder values, not real credentials
 *   apiKey: 'your-api-key'
 * })
 *
 * // Send a message
 * const message = await client.messages.send({
 *   channelId: 'channel-123',
 *   content: 'Hello, world!'
 * })
 * ```
 */

export * from "./client";
export * from "./types";
export * from "./errors";
export * from "./resources";

// Re-export main client
export { NChatClient } from "./client";
export type { NChatConfig, NChatOptions } from "./client";

// Version
export const SDK_VERSION = "1.0.0";
