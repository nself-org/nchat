/**
 * Realtime Services Index
 *
 * Re-exports all realtime-related services for convenient importing.
 * Integrates with the nself-plugins realtime server (Socket.io).
 *
 * @module services/realtime
 * @version 1.0.0
 */

// Core client and connection
export * from "./realtime-client";

// Room and presence management
export * from "./presence.service";
export * from "./typing.service";
export * from "./rooms.service";
export * from "./room-manager.service";

// Message delivery and sync
export * from "./delivery";
export * from "./offline-queue";
export * from "./sync.service";

// Event types and utilities
export * from "./events.types";

// Event dispatching and broadcasting
export * from "./event-dispatcher.service";
export * from "./subscription-bridge.service";
export * from "./api-event-broadcaster";

// Authentication
export * from "./auth-middleware.service";
