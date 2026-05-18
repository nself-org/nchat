/**
 * User Profile Management
 *
 * Functions for managing user profiles including validation,
 * formatting, and profile updates.
 */

import { type UserProfile } from "@/stores/user-store";
import {
  type ExtendedUserProfile,
  type SocialLink,
} from "@/components/users/UserCard";
import { type EditProfileData } from "@/components/users/EditProfile";

// ============================================================================
// Types
// ============================================================================

export interface ProfileValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export interface ProfileFieldConfig {
  key: string;
  label: string;
  required: boolean;
  maxLength?: number;
  pattern?: RegExp;
  validate?: (value: string) => string | null;
}

// ============================================================================
// Constants
// ============================================================================

const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;
const URL_PATTERN = /^https?:\/\/.+/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/;

export const PROFILE_FIELD_CONFIGS: ProfileFieldConfig[] = [
  {
    key: "displayName",
    label: "Display Name",
    required: true,
    maxLength: 50,
  },
  {
    key: "username",
    label: "Username",
    required: true,
    maxLength: 30,
    pattern: USERNAME_PATTERN,
    validate: (value) =>
      USERNAME_PATTERN.test(value)
        ? null
        : "Username can only contain letters, numbers, and underscores",
  },
  {
    key: "bio",
    label: "Bio",
    required: false,
    maxLength: 500,
  },
  {
    key: "website",
    label: "Website",
    required: false,
    pattern: URL_PATTERN,
    validate: (value) =>
      !value || URL_PATTERN.test(value)
        ? null
        : "Please enter a valid URL starting with http:// or https://",
  },
  {
    key: "phone",
    label: "Phone",
    required: false,
    validate: (value) =>
      !value || PHONE_PATTERN.test(value)
        ? null
        : "Please enter a valid phone number",
  },
];

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate a profile field value
 */
export function validateField(
  config: ProfileFieldConfig,
  value: string,
): string | null {
  // Check required
  if (config.required && !value.trim()) {
    return `${config.label} is required`;
  }

  // Check max length
  if (config.maxLength && value.length > config.maxLength) {
    return `${config.label} must be ${config.maxLength} characters or less`;
  }

  // Run custom validation
  if (config.validate && value) {
    const error = config.validate(value);
    if (error) return error;
  }

  return null;
}

/**
 * Validate entire profile data
 */
export function validateProfile(
  data: EditProfileData,
): ProfileValidationResult {
  const errors: Record<string, string> = {};

  PROFILE_FIELD_CONFIGS.forEach((config) => {
    const value = data[config.key as keyof EditProfileData] as string;
    const error = validateField(config, value || "");
    if (error) {
      errors[config.key] = error;
    }
  });

  // Validate social links
  if (data.socialLinks) {
    data.socialLinks.forEach((link, index) => {
      if (link.url && !URL_PATTERN.test(link.url)) {
        errors[`socialLinks.${index}.url`] = "Please enter a valid URL";
      }
    });
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate username format
 */
export function isValidUsername(username: string): boolean {
  if (!username || username.length < 3 || username.length > 30) {
    return false;
  }
  return USERNAME_PATTERN.test(username);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email);
}

// ============================================================================
// Formatting Functions
// ============================================================================

/**
 * Format user's full name with optional username
 */
export function formatUserName(
  user: UserProfile,
  includeUsername = false,
): string {
  if (includeUsername) {
    return `${user.displayName} (@${user.username})`;
  }
  return user.displayName;
}

/**
 * Format user's presence status for display
 */
export function formatPresenceStatus(user: UserProfile): string {
  if (user.customStatus?.text) {
    return `${user.customStatus.emoji || ""} ${user.customStatus.text}`.trim();
  }

  switch (user.presence) {
    case "online":
      return "Active now";
    case "away":
      return "Away";
    case "dnd":
      return "Do not disturb";
    case "offline":
      return user.lastSeenAt
        ? `Last seen ${formatRelativeTime(user.lastSeenAt)}`
        : "Offline";
    default:
      return "Unknown";
  }
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

  return date.toLocaleDateString();
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  // Simple formatting - could be enhanced with a library like libphonenumber
  const cleaned = phone.replace(/\D/g, "");

  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }

  return phone;
}

/**
 * Get user's initials from display name
 */
export function getInitials(displayName: string): string {
  if (!displayName) return "?";

  const names = displayName.trim().split(/\s+/);
  if (names.length === 1) {
    return names[0].charAt(0).toUpperCase();
  }

  return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
}

/**
 * Generate a default avatar URL based on user's name
 */
export function getDefaultAvatarUrl(name: string, size = 200): string {
  const initials = getInitials(name);
  // Using UI Avatars as a fallback
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=${size}&background=random`;
}

// ============================================================================
// Profile Data Functions
// ============================================================================

/**
 * Convert profile data for API submission
 */
export function prepareProfileForApi(
  data: EditProfileData,
): Record<string, unknown> {
  return {
    display_name: data.displayName,
    username: data.username,
    pronouns: data.pronouns || null,
    title: data.title || null,
    department: data.department || null,
    team: data.team || null,
    bio: data.bio || null,
    location: data.location || null,
    timezone: data.timezone || null,
    website: data.website || null,
    phone: data.phone || null,
    social_links: data.socialLinks.filter((link) => link.platform && link.url),
    custom_fields: data.customFields || {},
  };
}

/**
 * Convert API response to profile data
 */
export function parseProfileFromApi(
  apiData: Record<string, unknown>,
): Partial<ExtendedUserProfile> {
  return {
    displayName: apiData.display_name as string,
    username: apiData.username as string,
    pronouns: (apiData.pronouns as string) || undefined,
    title: (apiData.title as string) || undefined,
    department: (apiData.department as string) || undefined,
    team: (apiData.team as string) || undefined,
    bio: (apiData.bio as string) || undefined,
    location: (apiData.location as string) || undefined,
    timezone: (apiData.timezone as string) || undefined,
    website: (apiData.website as string) || undefined,
    phone: (apiData.phone as string) || undefined,
    socialLinks: (apiData.social_links as SocialLink[]) || [],
  };
}

/**
 * Check if profile has required fields filled
 */
export function isProfileComplete(user: ExtendedUserProfile): boolean {
  return Boolean(user.displayName && user.username && user.avatarUrl);
}

/**
 * Calculate profile completion percentage
 */
export function getProfileCompletionPercentage(
  user: ExtendedUserProfile,
): number {
  const fields = [
    user.displayName,
    user.username,
    user.avatarUrl,
    user.coverUrl,
    user.bio,
    user.title,
    user.department,
    user.location,
    user.timezone,
    user.website,
    user.socialLinks?.length,
  ];

  const filled = fields.filter(Boolean).length;
  return Math.round((filled / fields.length) * 100);
}

/**
 * Get suggestions for completing profile
 */
export function getProfileCompletionSuggestions(
  user: ExtendedUserProfile,
): string[] {
  const suggestions: string[] = [];

  if (!user.avatarUrl) suggestions.push("Add a profile photo");
  if (!user.coverUrl) suggestions.push("Add a cover photo");
  if (!user.bio) suggestions.push("Write a bio");
  if (!user.title) suggestions.push("Add your job title");
  if (!user.location) suggestions.push("Add your location");
  if (!user.timezone) suggestions.push("Set your timezone");
  if (!user.website && (!user.socialLinks || user.socialLinks.length === 0)) {
    suggestions.push("Add social links");
  }

  return suggestions;
}
