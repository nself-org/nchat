/**
 * Shared Mock Store for Bot Data
 *
 * This provides a shared in-memory store for bot data that can be
 * used across different route handlers during development/testing.
 *
 * In production, this would be replaced with actual database queries.
 */

export interface Bot {
  id: string;
  name: string;
  description: string;
  code: string;
  version: string;
  template_id?: string;
  config: Record<string, unknown>;
  enabled: boolean;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  sandbox_enabled: boolean;
  rate_limit_per_minute: number;
  timeout_ms: number;
}

// Shared mock data store
const mockBots: Bot[] = [];

/**
 * Get all bots from the mock store
 */
export function getAllBots(): Bot[] {
  return mockBots;
}

/**
 * Get a bot by ID
 */
export function getBotById(id: string): Bot | undefined {
  return mockBots.find((b) => b.id === id);
}

/**
 * Get bot index by ID
 */
export function getBotIndexById(id: string): number {
  return mockBots.findIndex((b) => b.id === id);
}

/**
 * Add a bot to the store
 */
export function addBot(bot: Bot): void {
  mockBots.push(bot);
}

/**
 * Update a bot in the store
 */
export function updateBot(index: number, bot: Bot): void {
  mockBots[index] = bot;
}

/**
 * Remove a bot from the store by index
 */
export function removeBotByIndex(index: number): void {
  mockBots.splice(index, 1);
}

/**
 * Clear all bots (useful for testing)
 */
export function clearBots(): void {
  mockBots.length = 0;
}

/**
 * Get filtered bots
 */
export function getFilteredBots(filters: {
  enabled?: boolean;
  template_id?: string;
  created_by?: string;
}): Bot[] {
  let bots = mockBots;

  if (filters.enabled !== undefined) {
    bots = bots.filter((b) => b.enabled === filters.enabled);
  }

  if (filters.template_id) {
    bots = bots.filter((b) => b.template_id === filters.template_id);
  }

  if (filters.created_by) {
    bots = bots.filter((b) => b.created_by === filters.created_by);
  }

  return bots;
}
