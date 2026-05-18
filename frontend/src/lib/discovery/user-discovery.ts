/**
 * User Discovery
 *
 * Provides functionality for discovering users, including search by name/email,
 * online users, recent contacts, and suggested connections.
 */

// ============================================================================
// Types
// ============================================================================

export type UserStatus = "online" | "away" | "busy" | "offline";

export type UserRole = "owner" | "admin" | "moderator" | "member" | "guest";

export interface UserInfo {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  avatar: string | null;
  role: UserRole;
  status: UserStatus;
  statusMessage: string | null;
  bio: string | null;
  department: string | null;
  title: string | null;
  timezone: string | null;
  lastSeenAt: Date | null;
  createdAt: Date;
  isActive: boolean;
}

export interface DiscoverableUser extends UserInfo {
  matchScore: number;
  isContact: boolean;
  isSuggested: boolean;
  mutualChannels: number;
  mutualContacts: number;
}

export interface UserDiscoveryOptions {
  excludeSelf?: string;
  statuses?: UserStatus[];
  roles?: UserRole[];
  departments?: string[];
  limit?: number;
  offset?: number;
  sortBy?: UserSortOption;
}

export type UserSortOption = "name" | "recent" | "status" | "relevance";

export interface UserConnectionContext {
  userId: string;
  contacts: string[];
  channelMemberships: string[];
  recentInteractions: { userId: string; timestamp: Date }[];
}

export interface UserDiscoveryResult {
  users: DiscoverableUser[];
  totalCount: number;
  hasMore: boolean;
  nextOffset: number | null;
}

export interface ContactInfo {
  userId: string;
  lastInteractionAt: Date;
  interactionCount: number;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const STATUS_PRIORITY: Record<UserStatus, number> = {
  online: 4,
  away: 3,
  busy: 2,
  offline: 1,
};

// ============================================================================
// User Discovery Service
// ============================================================================

export class UserDiscoveryService {
  private users: Map<string, UserInfo> = new Map();
  private statusCache: Map<string, UserStatus> = new Map();
  private contacts: Map<string, Set<string>> = new Map(); // userId -> contactUserIds
  private channelMemberships: Map<string, Set<string>> = new Map(); // channelId -> userIds
  private recentInteractions: Map<string, ContactInfo[]> = new Map(); // userId -> contacts

  /**
   * Sets user data
   */
  setUsers(users: UserInfo[]): void {
    this.users.clear();
    for (const user of users) {
      this.users.set(user.id, user);
    }
  }

  /**
   * Adds or updates a user
   */
  addUser(user: UserInfo): void {
    this.users.set(user.id, user);
  }

  /**
   * Removes a user
   */
  removeUser(userId: string): void {
    this.users.delete(userId);
    this.statusCache.delete(userId);
  }

  /**
   * Updates user status
   */
  updateStatus(userId: string, status: UserStatus): void {
    this.statusCache.set(userId, status);
    const user = this.users.get(userId);
    if (user) {
      user.status = status;
      if (status !== "offline") {
        user.lastSeenAt = new Date();
      }
    }
  }

  /**
   * Sets user contacts
   */
  setContacts(userId: string, contactIds: string[]): void {
    this.contacts.set(userId, new Set(contactIds));
  }

  /**
   * Sets channel memberships
   */
  setChannelMembers(channelId: string, userIds: string[]): void {
    this.channelMemberships.set(channelId, new Set(userIds));
  }

  /**
   * Adds recent interaction
   */
  addRecentInteraction(userId: string, contactUserId: string): void {
    const interactions = this.recentInteractions.get(userId) ?? [];
    const existing = interactions.find((i) => i.userId === contactUserId);

    if (existing) {
      existing.lastInteractionAt = new Date();
      existing.interactionCount++;
    } else {
      interactions.unshift({
        userId: contactUserId,
        lastInteractionAt: new Date(),
        interactionCount: 1,
      });
    }

    // Keep only last 50 interactions
    this.recentInteractions.set(userId, interactions.slice(0, 50));
  }

  /**
   * Searches users by name or email
   */
  searchUsers(
    query: string,
    options: UserDiscoveryOptions = {},
  ): UserDiscoveryResult {
    const normalizedQuery = query.toLowerCase().trim();

    if (!normalizedQuery) {
      return this.discover(options);
    }

    const {
      excludeSelf,
      statuses,
      roles,
      departments,
      limit = DEFAULT_LIMIT,
    } = options;

    const effectiveLimit = Math.min(limit, MAX_LIMIT);
    const matched: DiscoverableUser[] = [];

    for (const user of this.users.values()) {
      if (!user.isActive) continue;
      if (excludeSelf && user.id === options.excludeSelf) continue;
      if (statuses && !statuses.includes(this.getStatus(user.id))) continue;
      if (roles && !roles.includes(user.role)) continue;
      if (
        departments &&
        user.department &&
        !departments.includes(user.department)
      )
        continue;

      const matchScore = this.calculateSearchMatchScore(user, normalizedQuery);

      if (matchScore > 0) {
        matched.push({
          ...user,
          status: this.getStatus(user.id),
          matchScore,
          isContact: false,
          isSuggested: false,
          mutualChannels: 0,
          mutualContacts: 0,
        });
      }
    }

    // Sort by match score
    matched.sort((a, b) => b.matchScore - a.matchScore);

    const paginated = matched.slice(0, effectiveLimit);

    return {
      users: paginated,
      totalCount: matched.length,
      hasMore: matched.length > effectiveLimit,
      nextOffset: null,
    };
  }

  /**
   * Discovers users based on options
   */
  discover(
    options: UserDiscoveryOptions & { currentUserId?: string } = {},
  ): UserDiscoveryResult {
    const {
      excludeSelf,
      statuses,
      roles,
      departments,
      sortBy = "name",
      limit = DEFAULT_LIMIT,
      offset = 0,
      currentUserId,
    } = options;

    const effectiveLimit = Math.min(limit, MAX_LIMIT);
    const userContacts = currentUserId
      ? (this.contacts.get(currentUserId) ?? new Set())
      : new Set<string>();

    let filtered: DiscoverableUser[] = [];

    for (const user of this.users.values()) {
      if (!user.isActive) continue;
      if (excludeSelf && currentUserId && user.id === currentUserId) continue;
      if (statuses && !statuses.includes(this.getStatus(user.id))) continue;
      if (roles && !roles.includes(user.role)) continue;
      if (
        departments &&
        user.department &&
        !departments.includes(user.department)
      )
        continue;

      filtered.push({
        ...user,
        status: this.getStatus(user.id),
        matchScore: 0,
        isContact: userContacts.has(user.id),
        isSuggested: false,
        mutualChannels: currentUserId
          ? this.countMutualChannels(currentUserId, user.id)
          : 0,
        mutualContacts: currentUserId
          ? this.countMutualContacts(currentUserId, user.id)
          : 0,
      });
    }

    // Sort
    filtered = this.sortUsers(filtered, sortBy);

    // Paginate
    const totalCount = filtered.length;
    const hasMore = offset + effectiveLimit < totalCount;
    const paginated = filtered.slice(offset, offset + effectiveLimit);

    return {
      users: paginated,
      totalCount,
      hasMore,
      nextOffset: hasMore ? offset + effectiveLimit : null,
    };
  }

  /**
   * Gets online users
   */
  getOnlineUsers(options: UserDiscoveryOptions = {}): DiscoverableUser[] {
    const result = this.discover({
      ...options,
      statuses: ["online"],
    });
    return result.users;
  }

  /**
   * Gets away users (includes away and busy)
   */
  getAwayUsers(options: UserDiscoveryOptions = {}): DiscoverableUser[] {
    const result = this.discover({
      ...options,
      statuses: ["away", "busy"],
    });
    return result.users;
  }

  /**
   * Gets recent contacts for a user
   */
  getRecentContacts(userId: string, limit = 10): DiscoverableUser[] {
    const interactions = this.recentInteractions.get(userId) ?? [];
    const contacts: DiscoverableUser[] = [];

    for (const interaction of interactions.slice(0, limit)) {
      const user = this.users.get(interaction.userId);
      if (!user || !user.isActive) continue;

      contacts.push({
        ...user,
        status: this.getStatus(user.id),
        matchScore: interaction.interactionCount,
        isContact: this.contacts.get(userId)?.has(user.id) ?? false,
        isSuggested: false,
        mutualChannels: this.countMutualChannels(userId, user.id),
        mutualContacts: this.countMutualContacts(userId, user.id),
      });
    }

    return contacts;
  }

  /**
   * Gets suggested connections for a user
   */
  getSuggestedConnections(
    context: UserConnectionContext,
    limit = 10,
  ): DiscoverableUser[] {
    const userContacts = new Set(context.contacts);
    const suggestions: DiscoverableUser[] = [];

    for (const user of this.users.values()) {
      if (!user.isActive) continue;
      if (user.id === context.userId) continue;
      if (userContacts.has(user.id)) continue;

      const score = this.calculateSuggestionScore(user, context);

      if (score > 0) {
        suggestions.push({
          ...user,
          status: this.getStatus(user.id),
          matchScore: score,
          isContact: false,
          isSuggested: true,
          mutualChannels: this.countMutualChannels(context.userId, user.id),
          mutualContacts: this.countMutualContacts(context.userId, user.id),
        });
      }
    }

    // Sort by score
    suggestions.sort((a, b) => b.matchScore - a.matchScore);

    return suggestions.slice(0, limit);
  }

  /**
   * Gets users by channel membership
   */
  getChannelMembers(
    channelId: string,
    options: UserDiscoveryOptions = {},
  ): DiscoverableUser[] {
    const memberIds = this.channelMemberships.get(channelId);
    if (!memberIds) return [];

    const members: DiscoverableUser[] = [];

    for (const userId of memberIds) {
      const user = this.users.get(userId);
      if (!user || !user.isActive) continue;

      if (
        options.statuses &&
        !options.statuses.includes(this.getStatus(userId))
      )
        continue;
      if (options.roles && !options.roles.includes(user.role)) continue;

      members.push({
        ...user,
        status: this.getStatus(userId),
        matchScore: 0,
        isContact: false,
        isSuggested: false,
        mutualChannels: 0,
        mutualContacts: 0,
      });
    }

    // Sort by status priority (online first)
    members.sort(
      (a, b) => STATUS_PRIORITY[b.status] - STATUS_PRIORITY[a.status],
    );

    const limit = options.limit ?? DEFAULT_LIMIT;
    return members.slice(0, limit);
  }

  /**
   * Gets users by department
   */
  getUsersByDepartment(
    department: string,
    options: UserDiscoveryOptions = {},
  ): UserDiscoveryResult {
    return this.discover({
      ...options,
      departments: [department],
    });
  }

  /**
   * Gets users by role
   */
  getUsersByRole(
    role: UserRole,
    options: UserDiscoveryOptions = {},
  ): UserDiscoveryResult {
    return this.discover({
      ...options,
      roles: [role],
    });
  }

  /**
   * Gets all departments
   */
  getDepartments(): string[] {
    const departments = new Set<string>();

    for (const user of this.users.values()) {
      if (user.department && user.isActive) {
        departments.add(user.department);
      }
    }

    return Array.from(departments).sort();
  }

  /**
   * Gets user by ID
   */
  getUser(userId: string): UserInfo | undefined {
    return this.users.get(userId);
  }

  /**
   * Gets user status
   */
  getStatus(userId: string): UserStatus {
    return (
      this.statusCache.get(userId) ??
      this.users.get(userId)?.status ??
      "offline"
    );
  }

  /**
   * Checks if user is a contact
   */
  isContact(userId: string, contactId: string): boolean {
    return this.contacts.get(userId)?.has(contactId) ?? false;
  }

  /**
   * Gets user count
   */
  getUserCount(status?: UserStatus): number {
    if (!status) {
      return this.users.size;
    }

    let count = 0;
    for (const user of this.users.values()) {
      if (this.getStatus(user.id) === status && user.isActive) {
        count++;
      }
    }
    return count;
  }

  /**
   * Clears all data
   */
  clear(): void {
    this.users.clear();
    this.statusCache.clear();
    this.contacts.clear();
    this.channelMemberships.clear();
    this.recentInteractions.clear();
  }

  /**
   * Calculates search match score
   */
  private calculateSearchMatchScore(user: UserInfo, query: string): number {
    let score = 0;

    const username = user.username.toLowerCase();
    const displayName = user.displayName.toLowerCase();
    const email = user.email?.toLowerCase() ?? "";

    // Exact matches
    if (username === query) score += 100;
    if (displayName === query) score += 100;
    if (email === query) score += 100;

    // Starts with
    if (username.startsWith(query)) score += 50;
    if (displayName.startsWith(query)) score += 50;

    // Contains
    if (username.includes(query)) score += 20;
    if (displayName.includes(query)) score += 20;
    if (email.includes(query)) score += 10;

    // Word boundary matches
    const displayNameWords = displayName.split(/\s+/);
    for (const word of displayNameWords) {
      if (word === query) score += 30;
      if (word.startsWith(query)) score += 15;
    }

    return score;
  }

  /**
   * Calculates suggestion score for a potential connection
   */
  private calculateSuggestionScore(
    user: UserInfo,
    context: UserConnectionContext,
  ): number {
    let score = 0;

    // Mutual channels
    const mutualChannels = this.countMutualChannels(context.userId, user.id);
    score += mutualChannels * 5;

    // Mutual contacts
    const mutualContacts = this.countMutualContacts(context.userId, user.id);
    score += mutualContacts * 3;

    // Recent interactions with user's contacts
    for (const interaction of context.recentInteractions) {
      if (this.contacts.get(interaction.userId)?.has(user.id)) {
        score += 2;
      }
    }

    // Bonus for online status
    if (this.getStatus(user.id) === "online") {
      score += 1;
    }

    return score;
  }

  /**
   * Counts mutual channels between two users
   */
  private countMutualChannels(userId1: string, userId2: string): number {
    let count = 0;

    for (const members of this.channelMemberships.values()) {
      if (members.has(userId1) && members.has(userId2)) {
        count++;
      }
    }

    return count;
  }

  /**
   * Counts mutual contacts between two users
   */
  private countMutualContacts(userId1: string, userId2: string): number {
    const contacts1 = this.contacts.get(userId1);
    const contacts2 = this.contacts.get(userId2);

    if (!contacts1 || !contacts2) return 0;

    let count = 0;
    for (const contactId of contacts1) {
      if (contacts2.has(contactId)) {
        count++;
      }
    }

    return count;
  }

  /**
   * Sorts users by the specified option
   */
  private sortUsers(
    users: DiscoverableUser[],
    sortBy: UserSortOption,
  ): DiscoverableUser[] {
    switch (sortBy) {
      case "name":
        return users.sort((a, b) => a.displayName.localeCompare(b.displayName));
      case "recent":
        return users.sort((a, b) => {
          const aTime = a.lastSeenAt?.getTime() ?? 0;
          const bTime = b.lastSeenAt?.getTime() ?? 0;
          return bTime - aTime;
        });
      case "status":
        return users.sort(
          (a, b) => STATUS_PRIORITY[b.status] - STATUS_PRIORITY[a.status],
        );
      case "relevance":
        return users.sort((a, b) => b.matchScore - a.matchScore);
      default:
        return users;
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

let defaultService: UserDiscoveryService | null = null;

/**
 * Gets or creates the default user discovery service
 */
export function getUserDiscoveryService(): UserDiscoveryService {
  if (!defaultService) {
    defaultService = new UserDiscoveryService();
  }
  return defaultService;
}

/**
 * Creates a new user discovery service instance
 */
export function createUserDiscoveryService(): UserDiscoveryService {
  return new UserDiscoveryService();
}

export default UserDiscoveryService;
