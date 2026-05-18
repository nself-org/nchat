/**
 * Test Data Factories
 *
 * Export all factories for creating test data
 */

export * from "./user.factory";
export * from "./channel.factory";
export * from "./message.factory";

// ============================================================================
// Reset All Counters
// ============================================================================

import { resetUserIdCounter } from "./user.factory";
import { resetChannelIdCounter } from "./channel.factory";
import { resetMessageIdCounter } from "./message.factory";

/**
 * Reset all factory counters
 * Call this in beforeEach to ensure deterministic IDs
 */
export function resetAllFactories() {
  resetUserIdCounter();
  resetChannelIdCounter();
  resetMessageIdCounter();
}
