/**
 * Entity Validators
 *
 * Validation utilities for chat entities including:
 * - Type guards for entity type checking
 * - Limit validators
 * - Permission validators
 * - Input validators
 *
 * @module lib/entities/entity-validators
 */

import {
  ChatEntityType,
  ChatEntity,
  DirectMessageEntity,
  GroupEntity,
  SupergroupEntity,
  CommunityEntity,
  ChannelEntity,
  ENTITY_LIMITS,
  EntityMemberRole,
  CreateGroupInput,
  CreateSupergroupInput,
  CreateCommunityInput,
  CreateChannelInput,
  UpgradeToSupergroupInput,
  EntityMember,
  SupergroupAdminPermissions,
  ChannelAdminPermissions,
  EntitySettings,
} from "@/types/entities";

// =============================================================================
// VALIDATION RESULT TYPES
// =============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface DetailedValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Check if entity is a Direct Message
 */
export function isDirectMessage(
  entity: ChatEntity,
): entity is DirectMessageEntity {
  return entity.type === "dm";
}

/**
 * Check if entity is a Group
 */
export function isGroup(entity: ChatEntity): entity is GroupEntity {
  return entity.type === "group";
}

/**
 * Check if entity is a Supergroup
 */
export function isSupergroup(entity: ChatEntity): entity is SupergroupEntity {
  return entity.type === "supergroup";
}

/**
 * Check if entity is a Community
 */
export function isCommunity(entity: ChatEntity): entity is CommunityEntity {
  return entity.type === "community";
}

/**
 * Check if entity is a Channel
 */
export function isChannel(entity: ChatEntity): entity is ChannelEntity {
  return entity.type === "channel";
}

/**
 * Check if entity supports multiple members
 */
export function isMultiMemberEntity(
  entity: ChatEntity,
): entity is GroupEntity | SupergroupEntity | CommunityEntity | ChannelEntity {
  return entity.type !== "dm";
}

/**
 * Check if entity supports admin roles
 */
export function hasAdminSupport(
  entity: ChatEntity,
): entity is GroupEntity | SupergroupEntity | CommunityEntity | ChannelEntity {
  return entity.type !== "dm";
}

/**
 * Check if entity supports broadcast mode
 */
export function supportsBroadcast(
  entity: ChatEntity,
): entity is SupergroupEntity | ChannelEntity {
  return entity.type === "supergroup" || entity.type === "channel";
}

/**
 * Check if entity supports categories
 */
export function supportsCategories(
  entity: ChatEntity,
): entity is CommunityEntity {
  return entity.type === "community";
}

/**
 * Check if entity supports roles
 */
export function supportsRoles(
  entity: ChatEntity,
): entity is SupergroupEntity | CommunityEntity {
  return entity.type === "supergroup" || entity.type === "community";
}

/**
 * Check if entity can have public join link
 */
export function supportsPublicLink(
  entity: ChatEntity,
): entity is GroupEntity | SupergroupEntity | CommunityEntity | ChannelEntity {
  return entity.type !== "dm";
}

// =============================================================================
// ENTITY TYPE VALIDATION
// =============================================================================

/**
 * Validate entity type string
 */
export function isValidEntityType(type: string): type is ChatEntityType {
  return ["dm", "group", "supergroup", "community", "channel"].includes(type);
}

/**
 * Get entity limits by type
 */
export function getEntityLimits(type: ChatEntityType) {
  return ENTITY_LIMITS[type];
}

/**
 * Check if member count is within limits
 */
export function validateMemberCount(
  type: ChatEntityType,
  count: number,
): ValidationResult {
  const limits = ENTITY_LIMITS[type];
  const errors: string[] = [];

  if (count < limits.minMembers) {
    errors.push(`${type} requires at least ${limits.minMembers} member(s)`);
  }

  if (count > limits.maxMembers) {
    errors.push(`${type} cannot have more than ${limits.maxMembers} members`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Check if admin count is within limits
 */
export function validateAdminCount(
  type: ChatEntityType,
  count: number,
): ValidationResult {
  const limits = ENTITY_LIMITS[type];
  const errors: string[] = [];

  if (count > limits.maxAdmins) {
    errors.push(`${type} cannot have more than ${limits.maxAdmins} admins`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Check if pinned message count is within limits
 */
export function validatePinnedMessageCount(
  type: ChatEntityType,
  count: number,
): ValidationResult {
  const limits = ENTITY_LIMITS[type];
  const errors: string[] = [];

  if (count > limits.maxPinnedMessages) {
    errors.push(
      `${type} cannot have more than ${limits.maxPinnedMessages} pinned messages`,
    );
  }

  return { valid: errors.length === 0, errors };
}

// =============================================================================
// NAME AND DESCRIPTION VALIDATION
// =============================================================================

/**
 * Validate entity name
 */
export function validateEntityName(
  name: string,
  type: ChatEntityType,
): ValidationResult {
  const errors: string[] = [];

  if (!name || name.trim().length === 0) {
    errors.push("Name is required");
    return { valid: false, errors };
  }

  const trimmedName = name.trim();

  if (trimmedName.length < 1) {
    errors.push("Name must be at least 1 character");
  }

  const maxLength = type === "dm" ? 50 : 100;
  if (trimmedName.length > maxLength) {
    errors.push(`Name must be ${maxLength} characters or less`);
  }

  // Check for invalid characters
  const invalidChars = /[\x00-\x1f]/;
  if (invalidChars.test(trimmedName)) {
    errors.push("Name contains invalid control characters");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate entity description
 */
export function validateEntityDescription(
  description: string | undefined | null,
): ValidationResult {
  const errors: string[] = [];

  if (!description) {
    return { valid: true, errors };
  }

  if (description.length > 2000) {
    errors.push("Description must be 2000 characters or less");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate slug format
 */
export function validateSlug(slug: string): ValidationResult {
  const errors: string[] = [];

  if (!slug || slug.trim().length === 0) {
    errors.push("Slug is required");
    return { valid: false, errors };
  }

  if (slug.length < 2) {
    errors.push("Slug must be at least 2 characters");
  }

  if (slug.length > 50) {
    errors.push("Slug must be 50 characters or less");
  }

  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(slug)) {
    errors.push(
      "Slug must contain only lowercase letters, numbers, and hyphens, and cannot start or end with a hyphen",
    );
  }

  if (/--/.test(slug)) {
    errors.push("Slug cannot contain consecutive hyphens");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate username (for public entities)
 */
export function validateUsername(username: string): ValidationResult {
  const errors: string[] = [];

  if (!username || username.trim().length === 0) {
    return { valid: true, errors }; // Username is optional
  }

  if (username.length < 5) {
    errors.push("Username must be at least 5 characters");
  }

  if (username.length > 32) {
    errors.push("Username must be 32 characters or less");
  }

  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(username)) {
    errors.push(
      "Username must start with a letter and contain only letters, numbers, and underscores",
    );
  }

  // Reserved usernames
  const reserved = [
    "admin",
    "administrator",
    "support",
    "help",
    "system",
    "bot",
    "official",
    "nchat",
  ];
  if (reserved.includes(username.toLowerCase())) {
    errors.push("This username is reserved");
  }

  return { valid: errors.length === 0, errors };
}

// =============================================================================
// PERMISSION VALIDATION
// =============================================================================

/**
 * Check if a role can perform an action
 */
export function canPerformAction(
  role: EntityMemberRole,
  action:
    | "send_message"
    | "manage_members"
    | "manage_settings"
    | "delete_entity"
    | "pin_message"
    | "ban_member",
): boolean {
  const permissions: Record<EntityMemberRole, Set<string>> = {
    owner: new Set([
      "send_message",
      "manage_members",
      "manage_settings",
      "delete_entity",
      "pin_message",
      "ban_member",
    ]),
    admin: new Set([
      "send_message",
      "manage_members",
      "manage_settings",
      "pin_message",
      "ban_member",
    ]),
    moderator: new Set(["send_message", "pin_message", "ban_member"]),
    member: new Set(["send_message"]),
    subscriber: new Set([]),
    guest: new Set([]),
  };

  return permissions[role]?.has(action) ?? false;
}

/**
 * Check if user can add members to entity
 */
export function canAddMembers(
  entity: ChatEntity,
  userRole: EntityMemberRole,
  currentMemberCount: number,
): ValidationResult {
  const errors: string[] = [];
  const limits = ENTITY_LIMITS[entity.type];

  if (entity.type === "dm") {
    errors.push("Cannot add members to a direct message");
    return { valid: false, errors };
  }

  if (currentMemberCount >= limits.maxMembers) {
    errors.push(
      `${entity.type} has reached maximum member limit of ${limits.maxMembers}`,
    );
    return { valid: false, errors };
  }

  if (!canPerformAction(userRole, "manage_members")) {
    errors.push("You do not have permission to add members");
    return { valid: false, errors };
  }

  return { valid: true, errors };
}

/**
 * Check if user can remove a member
 */
export function canRemoveMember(
  actorRole: EntityMemberRole,
  targetRole: EntityMemberRole,
  isSelf: boolean,
): ValidationResult {
  const errors: string[] = [];

  // Can always leave yourself (except owner without transferring)
  if (isSelf && actorRole !== "owner") {
    return { valid: true, errors };
  }

  if (isSelf && actorRole === "owner") {
    errors.push("Owner must transfer ownership before leaving");
    return { valid: false, errors };
  }

  // Cannot remove owner
  if (targetRole === "owner") {
    errors.push("Cannot remove the owner");
    return { valid: false, errors };
  }

  // Only owner can remove admins
  if (targetRole === "admin" && actorRole !== "owner") {
    errors.push("Only the owner can remove admins");
    return { valid: false, errors };
  }

  // Admins and owners can remove lower roles
  if (actorRole === "owner" || actorRole === "admin") {
    return { valid: true, errors };
  }

  // Moderators can remove members, subscribers, guests
  if (
    actorRole === "moderator" &&
    ["member", "subscriber", "guest"].includes(targetRole)
  ) {
    return { valid: true, errors };
  }

  errors.push("You do not have permission to remove this member");
  return { valid: false, errors };
}

/**
 * Check if role can be assigned
 */
export function canAssignRole(
  actorRole: EntityMemberRole,
  targetCurrentRole: EntityMemberRole,
  newRole: EntityMemberRole,
): ValidationResult {
  const errors: string[] = [];

  // Only owner can change roles to/from admin
  if (
    (targetCurrentRole === "admin" || newRole === "admin") &&
    actorRole !== "owner"
  ) {
    errors.push("Only the owner can manage admin roles");
    return { valid: false, errors };
  }

  // Cannot change owner role
  if (targetCurrentRole === "owner" || newRole === "owner") {
    errors.push(
      "Cannot assign or remove owner role directly. Use ownership transfer.",
    );
    return { valid: false, errors };
  }

  // Admins can change moderator, member, subscriber, guest roles
  if (actorRole === "admin" || actorRole === "owner") {
    return { valid: true, errors };
  }

  errors.push("You do not have permission to change roles");
  return { valid: false, errors };
}

// =============================================================================
// INPUT VALIDATION
// =============================================================================

/**
 * Validate create group input
 */
export function validateCreateGroupInput(
  input: CreateGroupInput,
): DetailedValidationResult {
  const errors: ValidationError[] = [];

  // Name validation
  const nameResult = validateEntityName(input.name, "group");
  if (!nameResult.valid) {
    errors.push(
      ...nameResult.errors.map((msg) => ({
        field: "name",
        message: msg,
        code: "INVALID_NAME",
      })),
    );
  }

  // Description validation
  const descResult = validateEntityDescription(input.description);
  if (!descResult.valid) {
    errors.push(
      ...descResult.errors.map((msg) => ({
        field: "description",
        message: msg,
        code: "INVALID_DESCRIPTION",
      })),
    );
  }

  // Participant validation
  if (!input.participantIds || input.participantIds.length < 1) {
    errors.push({
      field: "participantIds",
      message: "At least 1 participant is required",
      code: "MIN_PARTICIPANTS",
    });
  }

  if (
    input.participantIds &&
    input.participantIds.length > ENTITY_LIMITS.group.maxMembers - 1
  ) {
    errors.push({
      field: "participantIds",
      message: `Cannot add more than ${ENTITY_LIMITS.group.maxMembers - 1} participants (plus you)`,
      code: "MAX_PARTICIPANTS",
    });
  }

  // Check for duplicates
  if (input.participantIds) {
    const uniqueIds = new Set(input.participantIds);
    if (uniqueIds.size !== input.participantIds.length) {
      errors.push({
        field: "participantIds",
        message: "Duplicate participants not allowed",
        code: "DUPLICATE_PARTICIPANTS",
      });
    }
  }

  // Avatar URL validation
  if (input.avatarUrl && !isValidUrl(input.avatarUrl)) {
    errors.push({
      field: "avatarUrl",
      message: "Invalid avatar URL",
      code: "INVALID_URL",
    });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate create supergroup input
 */
export function validateCreateSupergroupInput(
  input: CreateSupergroupInput,
): DetailedValidationResult {
  const errors: ValidationError[] = [];

  // Name validation
  const nameResult = validateEntityName(input.name, "supergroup");
  if (!nameResult.valid) {
    errors.push(
      ...nameResult.errors.map((msg) => ({
        field: "name",
        message: msg,
        code: "INVALID_NAME",
      })),
    );
  }

  // Description validation
  const descResult = validateEntityDescription(input.description);
  if (!descResult.valid) {
    errors.push(
      ...descResult.errors.map((msg) => ({
        field: "description",
        message: msg,
        code: "INVALID_DESCRIPTION",
      })),
    );
  }

  // Username validation
  if (input.username) {
    const usernameResult = validateUsername(input.username);
    if (!usernameResult.valid) {
      errors.push(
        ...usernameResult.errors.map((msg) => ({
          field: "username",
          message: msg,
          code: "INVALID_USERNAME",
        })),
      );
    }
  }

  // URL validations
  if (input.avatarUrl && !isValidUrl(input.avatarUrl)) {
    errors.push({
      field: "avatarUrl",
      message: "Invalid avatar URL",
      code: "INVALID_URL",
    });
  }

  if (input.bannerUrl && !isValidUrl(input.bannerUrl)) {
    errors.push({
      field: "bannerUrl",
      message: "Invalid banner URL",
      code: "INVALID_URL",
    });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate create community input
 */
export function validateCreateCommunityInput(
  input: CreateCommunityInput,
): DetailedValidationResult {
  const errors: ValidationError[] = [];

  // Name validation
  const nameResult = validateEntityName(input.name, "community");
  if (!nameResult.valid) {
    errors.push(
      ...nameResult.errors.map((msg) => ({
        field: "name",
        message: msg,
        code: "INVALID_NAME",
      })),
    );
  }

  // Description validation
  const descResult = validateEntityDescription(input.description);
  if (!descResult.valid) {
    errors.push(
      ...descResult.errors.map((msg) => ({
        field: "description",
        message: msg,
        code: "INVALID_DESCRIPTION",
      })),
    );
  }

  // Vanity URL validation
  if (input.vanityUrl) {
    const vanityResult = validateSlug(input.vanityUrl);
    if (!vanityResult.valid) {
      errors.push(
        ...vanityResult.errors.map((msg) => ({
          field: "vanityUrl",
          message: msg,
          code: "INVALID_VANITY_URL",
        })),
      );
    }
  }

  // Template validation
  const validTemplates = ["blank", "default", "community", "gaming", "study"];
  if (input.template && !validTemplates.includes(input.template)) {
    errors.push({
      field: "template",
      message: "Invalid template",
      code: "INVALID_TEMPLATE",
    });
  }

  // URL validations
  if (input.avatarUrl && !isValidUrl(input.avatarUrl)) {
    errors.push({
      field: "avatarUrl",
      message: "Invalid avatar URL",
      code: "INVALID_URL",
    });
  }

  if (input.bannerUrl && !isValidUrl(input.bannerUrl)) {
    errors.push({
      field: "bannerUrl",
      message: "Invalid banner URL",
      code: "INVALID_URL",
    });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate create channel input
 */
export function validateCreateChannelInput(
  input: CreateChannelInput,
): DetailedValidationResult {
  const errors: ValidationError[] = [];

  // Name validation
  const nameResult = validateEntityName(input.name, "channel");
  if (!nameResult.valid) {
    errors.push(
      ...nameResult.errors.map((msg) => ({
        field: "name",
        message: msg,
        code: "INVALID_NAME",
      })),
    );
  }

  // Description validation
  const descResult = validateEntityDescription(input.description);
  if (!descResult.valid) {
    errors.push(
      ...descResult.errors.map((msg) => ({
        field: "description",
        message: msg,
        code: "INVALID_DESCRIPTION",
      })),
    );
  }

  // Username validation
  if (input.username) {
    const usernameResult = validateUsername(input.username);
    if (!usernameResult.valid) {
      errors.push(
        ...usernameResult.errors.map((msg) => ({
          field: "username",
          message: msg,
          code: "INVALID_USERNAME",
        })),
      );
    }
  }

  // Avatar URL validation
  if (input.avatarUrl && !isValidUrl(input.avatarUrl)) {
    errors.push({
      field: "avatarUrl",
      message: "Invalid avatar URL",
      code: "INVALID_URL",
    });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate upgrade to supergroup input
 */
export function validateUpgradeToSupergroupInput(
  input: UpgradeToSupergroupInput,
): DetailedValidationResult {
  const errors: ValidationError[] = [];

  if (!input.groupId || input.groupId.trim().length === 0) {
    errors.push({
      field: "groupId",
      message: "Group ID is required",
      code: "REQUIRED",
    });
  }

  if (input.reason && input.reason.length > 500) {
    errors.push({
      field: "reason",
      message: "Reason must be 500 characters or less",
      code: "TOO_LONG",
    });
  }

  return { valid: errors.length === 0, errors };
}

// =============================================================================
// CONVERSION VALIDATION
// =============================================================================

/**
 * Check if a group can be upgraded to supergroup
 */
export function canUpgradeToSupergroup(group: GroupEntity): ValidationResult {
  const errors: string[] = [];

  if (group.type !== "group") {
    errors.push("Only groups can be upgraded to supergroups");
  }

  if (group.status !== "active") {
    errors.push("Only active groups can be upgraded");
  }

  // Already near max? Upgrade suggested
  // No minimum requirement, but typically done when approaching limit

  return { valid: errors.length === 0, errors };
}

/**
 * Check if a supergroup can be downgraded to group
 */
export function canDowngradeToGroup(
  supergroup: SupergroupEntity,
): ValidationResult {
  const errors: string[] = [];

  if (supergroup.type !== "supergroup") {
    errors.push("Only supergroups can be downgraded to groups");
  }

  if (supergroup.memberCount > ENTITY_LIMITS.group.maxMembers) {
    errors.push(
      `Cannot downgrade: member count (${supergroup.memberCount}) exceeds group limit (${ENTITY_LIMITS.group.maxMembers})`,
    );
  }

  if (supergroup.supergroupSettings.forumMode) {
    errors.push("Cannot downgrade: forum mode is enabled");
  }

  return { valid: errors.length === 0, errors };
}

// =============================================================================
// SETTINGS VALIDATION
// =============================================================================

/**
 * Validate entity settings
 */
export function validateEntitySettings(
  settings: Partial<EntitySettings>,
): ValidationResult {
  const errors: string[] = [];

  if (settings.slowModeSeconds !== undefined) {
    const validSlowModes = [
      0, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600,
    ];
    if (!validSlowModes.includes(settings.slowModeSeconds)) {
      errors.push(
        `Invalid slow mode. Valid values: ${validSlowModes.join(", ")} seconds`,
      );
    }
  }

  if (settings.minAccountAgeDays !== undefined) {
    if (settings.minAccountAgeDays < 0 || settings.minAccountAgeDays > 365) {
      errors.push("Minimum account age must be between 0 and 365 days");
    }
  }

  if (settings.messageRetentionDays !== undefined) {
    if (settings.messageRetentionDays < 0) {
      errors.push("Message retention days cannot be negative");
    }
  }

  return { valid: errors.length === 0, errors };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if string is a valid URL
 */
function isValidUrl(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate slug from name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 50);
}

/**
 * Get role hierarchy level (higher = more power)
 */
export function getRoleLevel(role: EntityMemberRole): number {
  const levels: Record<EntityMemberRole, number> = {
    owner: 100,
    admin: 80,
    moderator: 60,
    member: 40,
    subscriber: 20,
    guest: 10,
  };
  return levels[role] ?? 0;
}

/**
 * Compare two roles
 * Returns positive if role1 > role2, negative if role1 < role2, 0 if equal
 */
export function compareRoles(
  role1: EntityMemberRole,
  role2: EntityMemberRole,
): number {
  return getRoleLevel(role1) - getRoleLevel(role2);
}

/**
 * Check if role1 outranks role2
 */
export function outranks(
  role1: EntityMemberRole,
  role2: EntityMemberRole,
): boolean {
  return compareRoles(role1, role2) > 0;
}
