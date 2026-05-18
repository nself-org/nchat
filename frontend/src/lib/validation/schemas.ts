/**
 * Input Validation Schemas
 *
 * Centralized Zod schemas for validating API request bodies.
 * Prevents injection attacks and ensures data integrity.
 *
 * @module lib/validation/schemas
 */

import { z } from "zod";

// ============================================================================
// Common Validators
// ============================================================================

/**
 * Email validation with strict RFC-compliant regex
 */
export const emailSchema = z
  .string()
  .email("Invalid email format")
  .min(3, "Email must be at least 3 characters")
  .max(255, "Email must not exceed 255 characters")
  .toLowerCase()
  .trim();

/**
 * Password validation with security requirements
 */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must not exceed 128 characters")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(
    /[^a-zA-Z0-9]/,
    "Password must contain at least one special character",
  );

/**
 * Username validation (alphanumeric, underscores, hyphens)
 */
export const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(32, "Username must not exceed 32 characters")
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    "Username can only contain letters, numbers, underscores, and hyphens",
  )
  .trim();

/**
 * Display name validation
 */
export const displayNameSchema = z
  .string()
  .min(1, "Display name is required")
  .max(100, "Display name must not exceed 100 characters")
  .trim();

/**
 * URL validation
 */
export const urlSchema = z
  .string()
  .url("Invalid URL format")
  .max(2048, "URL must not exceed 2048 characters");

/**
 * UUID validation
 */
export const uuidSchema = z.string().uuid("Invalid UUID format");

/**
 * Hex color validation
 */
export const hexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color format (e.g., #FF0000)");

/**
 * Safe text content (prevents XSS)
 */
export const safeTextSchema = z
  .string()
  .max(10000, "Text must not exceed 10000 characters")
  .transform((val) => {
    // Strip dangerous HTML tags and attributes
    return val
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
      .replace(/on\w+="[^"]*"/gi, "")
      .replace(/on\w+='[^']*'/gi, "");
  });

/**
 * Safe text content with minimum length requirement (prevents XSS)
 */
export const safeTextRequiredSchema = z
  .string()
  .min(1, "Content is required")
  .max(10000, "Text must not exceed 10000 characters")
  .transform((val) => {
    // Strip dangerous HTML tags and attributes
    return val
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
      .replace(/on\w+="[^"]*"/gi, "")
      .replace(/on\w+='[^']*'/gi, "");
  });

// ============================================================================
// Authentication Schemas
// ============================================================================

/**
 * Sign-in request validation
 */
export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

/**
 * Sign-up request validation
 */
export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  username: usernameSchema,
  displayName: displayNameSchema.optional(),
});

/**
 * Change password request validation
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/**
 * Reset password request validation
 */
export const resetPasswordSchema = z.object({
  email: emailSchema,
});

/**
 * OAuth callback validation
 */
export const oauthCallbackSchema = z.object({
  code: z.string().min(1, "Authorization code is required"),
  state: z.string().min(1, "State parameter is required"),
  provider: z.enum([
    "google",
    "github",
    "idme",
    "linkedin",
    "twitter",
    "instagram",
  ]),
});

// ============================================================================
// User Management Schemas
// ============================================================================

/**
 * User profile update validation
 */
export const updateProfileSchema = z.object({
  displayName: displayNameSchema.optional(),
  bio: z.string().max(500, "Bio must not exceed 500 characters").optional(),
  avatarUrl: urlSchema.optional(),
  timezone: z.string().max(100).optional(),
  language: z.string().length(2, "Language must be a 2-letter code").optional(),
});

/**
 * User settings update validation
 */
export const updateSettingsSchema = z.object({
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  desktopNotifications: z.boolean().optional(),
  soundEnabled: z.boolean().optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
  compactMode: z.boolean().optional(),
});

// ============================================================================
// Channel Schemas
// ============================================================================

/**
 * Create channel validation
 */
export const createChannelSchema = z.object({
  name: z
    .string()
    .min(1, "Channel name is required")
    .max(80, "Channel name must not exceed 80 characters")
    .regex(
      /^[a-z0-9-]+$/,
      "Channel name can only contain lowercase letters, numbers, and hyphens",
    )
    .trim(),
  displayName: z
    .string()
    .min(1, "Display name is required")
    .max(80, "Display name must not exceed 80 characters")
    .trim(),
  description: z
    .string()
    .max(500, "Description must not exceed 500 characters")
    .optional(),
  isPrivate: z.boolean().default(false),
  isArchived: z.boolean().default(false),
});

/**
 * Update channel validation
 */
export const updateChannelSchema = z.object({
  displayName: z
    .string()
    .min(1, "Display name is required")
    .max(80, "Display name must not exceed 80 characters")
    .trim()
    .optional(),
  description: z
    .string()
    .max(500, "Description must not exceed 500 characters")
    .optional(),
  isPrivate: z.boolean().optional(),
  isArchived: z.boolean().optional(),
});

// ============================================================================
// Message Schemas
// ============================================================================

/**
 * Send message validation
 */
export const sendMessageSchema = z.object({
  channelId: uuidSchema,
  content: safeTextRequiredSchema,
  parentId: uuidSchema.optional(), // For threaded replies
  attachments: z.array(uuidSchema).max(10, "Maximum 10 attachments").optional(),
  mentions: z.array(uuidSchema).max(50, "Maximum 50 mentions").optional(),
});

/**
 * Update message validation
 */
export const updateMessageSchema = z.object({
  content: safeTextRequiredSchema,
});

/**
 * Add reaction validation
 */
export const addReactionSchema = z.object({
  messageId: uuidSchema,
  emoji: z
    .string()
    .min(1, "Emoji is required")
    .max(100, "Emoji must not exceed 100 characters"),
});

// ============================================================================
// File Upload Schemas
// ============================================================================

/**
 * File upload initialization validation
 */
export const uploadInitSchema = z.object({
  filename: z
    .string()
    .min(1, "Filename is required")
    .max(255, "Filename must not exceed 255 characters")
    .regex(/^[^<>:"/\\|?*]+$/, "Filename contains invalid characters"),
  contentType: z
    .string()
    .min(1, "Content type is required")
    .regex(/^[a-z]+\/[a-z0-9\-\+\.]+$/i, "Invalid content type format"),
  size: z
    .number()
    .int()
    .positive("File size must be positive")
    .max(100 * 1024 * 1024, "File size must not exceed 100MB"),
  channelId: uuidSchema.optional(),
  messageId: uuidSchema.optional(),
});

// ============================================================================
// Configuration Schemas
// ============================================================================

/**
 * App configuration update validation
 */
export const updateConfigSchema = z.object({
  branding: z
    .object({
      appName: z.string().min(1).max(50).optional(),
      logo: urlSchema.optional(),
      favicon: urlSchema.optional(),
      tagline: z.string().max(200).optional(),
      logoScale: z.number().min(0.5).max(2.0).optional(),
    })
    .optional(),
  theme: z
    .object({
      preset: z.string().optional(),
      colorScheme: z.enum(["light", "dark", "system"]).optional(),
      primaryColor: hexColorSchema.optional(),
      secondaryColor: hexColorSchema.optional(),
      accentColor: hexColorSchema.optional(),
      backgroundColor: hexColorSchema.optional(),
      surfaceColor: hexColorSchema.optional(),
      textColor: hexColorSchema.optional(),
      mutedColor: hexColorSchema.optional(),
      borderColor: hexColorSchema.optional(),
      customCSS: z.string().max(50000).optional(),
    })
    .optional(),
  features: z
    .object({
      publicChannels: z.boolean().optional(),
      privateChannels: z.boolean().optional(),
      directMessages: z.boolean().optional(),
      threads: z.boolean().optional(),
      reactions: z.boolean().optional(),
      fileSharing: z.boolean().optional(),
      voiceMessages: z.boolean().optional(),
      videoConferencing: z.boolean().optional(),
    })
    .optional(),
  authProviders: z
    .object({
      emailPassword: z.boolean().optional(),
      magicLinks: z.boolean().optional(),
      google: z.boolean().optional(),
      github: z.boolean().optional(),
      idme: z.boolean().optional(),
    })
    .optional(),
});

// ============================================================================
// Webhook Schemas
// ============================================================================

/**
 * Incoming webhook validation
 */
export const incomingWebhookSchema = z.object({
  text: safeTextSchema.optional(),
  username: z.string().max(100).optional(),
  iconUrl: urlSchema.optional(),
  channel: z.string().max(100).optional(),
  attachments: z
    .array(
      z.object({
        title: z.string().max(200).optional(),
        text: safeTextSchema.optional(),
        color: hexColorSchema.optional(),
        imageUrl: urlSchema.optional(),
      }),
    )
    .max(10)
    .optional(),
});

/**
 * Create webhook validation
 */
export const createWebhookSchema = z.object({
  name: z.string().min(1).max(100),
  channelId: uuidSchema,
  description: z.string().max(500).optional(),
  events: z.array(z.string()).min(1, "At least one event is required"),
});

// ============================================================================
// Admin Schemas
// ============================================================================

/**
 * Create user (admin) validation
 */
export const adminCreateUserSchema = z.object({
  email: emailSchema,
  username: usernameSchema,
  displayName: displayNameSchema,
  password: passwordSchema,
  role: z.enum(["owner", "admin", "moderator", "member", "guest"]),
});

/**
 * Update user role validation
 */
export const updateUserRoleSchema = z.object({
  userId: uuidSchema,
  role: z.enum(["owner", "admin", "moderator", "member", "guest"]),
});

/**
 * Ban user validation
 */
export const banUserSchema = z.object({
  userId: uuidSchema,
  reason: z.string().min(1).max(500),
  duration: z.number().int().positive().optional(), // Duration in seconds, undefined = permanent
});

// ============================================================================
// Search Schemas
// ============================================================================

/**
 * Search request validation
 */
export const searchSchema = z.object({
  query: z.string().min(1).max(200),
  channelId: uuidSchema.optional(),
  userId: uuidSchema.optional(),
  before: z.string().datetime().optional(),
  after: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

// ============================================================================
// Export All Schemas
// ============================================================================

export const schemas = {
  // Authentication
  signIn: signInSchema,
  signUp: signUpSchema,
  changePassword: changePasswordSchema,
  resetPassword: resetPasswordSchema,
  oauthCallback: oauthCallbackSchema,

  // User management
  updateProfile: updateProfileSchema,
  updateSettings: updateSettingsSchema,

  // Channels
  createChannel: createChannelSchema,
  updateChannel: updateChannelSchema,

  // Messages
  sendMessage: sendMessageSchema,
  updateMessage: updateMessageSchema,
  addReaction: addReactionSchema,

  // File uploads
  uploadInit: uploadInitSchema,

  // Configuration
  updateConfig: updateConfigSchema,

  // Webhooks
  incomingWebhook: incomingWebhookSchema,
  createWebhook: createWebhookSchema,

  // Admin
  adminCreateUser: adminCreateUserSchema,
  updateUserRole: updateUserRoleSchema,
  banUser: banUserSchema,

  // Search
  search: searchSchema,
} as const;

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type OAuthCallbackInput = z.infer<typeof oauthCallbackSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
export type CreateChannelInput = z.infer<typeof createChannelSchema>;
export type UpdateChannelInput = z.infer<typeof updateChannelSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type UpdateMessageInput = z.infer<typeof updateMessageSchema>;
export type AddReactionInput = z.infer<typeof addReactionSchema>;
export type UploadInitInput = z.infer<typeof uploadInitSchema>;
export type UpdateConfigInput = z.infer<typeof updateConfigSchema>;
export type IncomingWebhookInput = z.infer<typeof incomingWebhookSchema>;
export type CreateWebhookInput = z.infer<typeof createWebhookSchema>;
export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export type BanUserInput = z.infer<typeof banUserSchema>;
export type SearchInput = z.infer<typeof searchSchema>;
