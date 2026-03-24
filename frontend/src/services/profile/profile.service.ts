/**
 * Profile Service
 *
 * Comprehensive service for user profile management including:
 * - Profile CRUD operations
 * - Photo/video upload and management
 * - Username validation and change
 * - Privacy settings
 * - Profile discovery (search, QR code)
 *
 * @module services/profile
 * @version 0.9.1
 */

import { logger } from '@/lib/logger'
import {
  type UserProfileFull,
  type UpdateProfileInput,
  type UpdateProfileResult,
  type ProfilePhoto,
  type ProfileVideo,
  type ProfilePrivacySettings,
  type UsernameValidation,
  type ProfileQRCode,
  type ProfileSearchResult,
  type PhotoUploadOptions,
  USERNAME_RULES,
  PROFILE_LIMITS,
  DEFAULT_PRIVACY_SETTINGS,
} from '@/types/profile'

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate username format and rules
 */
export function validateUsername(username: string): UsernameValidation {
  const errors: string[] = []

  // Normalize to lowercase
  const normalizedUsername = username.toLowerCase().trim()

  // Check length
  if (normalizedUsername.length < USERNAME_RULES.minLength) {
    errors.push(`Username must be at least ${USERNAME_RULES.minLength} characters`)
  }
  if (normalizedUsername.length > USERNAME_RULES.maxLength) {
    errors.push(`Username must be at most ${USERNAME_RULES.maxLength} characters`)
  }

  // Check pattern
  if (!USERNAME_RULES.pattern.test(normalizedUsername)) {
    errors.push('Username can only contain lowercase letters, numbers, and underscores')
  }

  // Check starts with letter
  if (USERNAME_RULES.mustStartWithLetter && !/^[a-z]/.test(normalizedUsername)) {
    errors.push('Username must start with a letter')
  }

  // Check ends with underscore
  if (USERNAME_RULES.cannotEndWithUnderscore && normalizedUsername.endsWith('_')) {
    errors.push('Username cannot end with an underscore')
  }

  // Check consecutive underscores
  const consecutiveUnderscores = normalizedUsername.match(/_+/g)
  if (consecutiveUnderscores) {
    const maxConsecutive = Math.max(...consecutiveUnderscores.map((m) => m.length))
    if (maxConsecutive > USERNAME_RULES.maxConsecutiveUnderscores) {
      errors.push('Username cannot have consecutive underscores')
    }
  }

  // Check reserved
  if ((USERNAME_RULES.reserved as readonly string[]).includes(normalizedUsername)) {
    errors.push('This username is reserved and cannot be used')
  }

  return {
    valid: errors.length === 0,
    error: errors.length > 0 ? errors.join('. ') : undefined,
  }
}

/**
 * Validate display name
 */
export function validateDisplayName(displayName: string): { valid: boolean; error?: string } {
  const trimmed = displayName.trim()

  if (trimmed.length < PROFILE_LIMITS.displayName.min) {
    return { valid: false, error: 'Display name is required' }
  }

  if (trimmed.length > PROFILE_LIMITS.displayName.max) {
    return {
      valid: false,
      error: `Display name must be at most ${PROFILE_LIMITS.displayName.max} characters`,
    }
  }

  // Check for prohibited characters (control characters, excessive spaces)
  if (/[\x00-\x1F\x7F]/.test(trimmed)) {
    return { valid: false, error: 'Display name contains invalid characters' }
  }

  return { valid: true }
}

/**
 * Validate bio text
 */
export function validateBio(bio: string): { valid: boolean; error?: string } {
  if (bio.length > PROFILE_LIMITS.bio) {
    return {
      valid: false,
      error: `Bio must be at most ${PROFILE_LIMITS.bio} characters`,
    }
  }

  return { valid: true }
}

/**
 * Validate website URL
 */
export function validateWebsite(website: string): { valid: boolean; error?: string } {
  if (!website) return { valid: true }

  if (website.length > PROFILE_LIMITS.website) {
    return {
      valid: false,
      error: `Website URL must be at most ${PROFILE_LIMITS.website} characters`,
    }
  }

  try {
    const url = new URL(website)
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { valid: false, error: 'Website must use http or https protocol' }
    }
    return { valid: true }
  } catch {
    return { valid: false, error: 'Invalid website URL format' }
  }
}

/**
 * Validate phone number format
 */
export function validatePhone(phone: string): { valid: boolean; error?: string } {
  if (!phone) return { valid: true }

  // Remove spaces and dashes for validation
  const cleaned = phone.replace(/[\s\-()]/g, '')

  if (cleaned.length > PROFILE_LIMITS.phone) {
    return { valid: false, error: `Phone number is too long` }
  }

  // Basic phone pattern: optional +, then digits
  if (!/^\+?\d{7,15}$/.test(cleaned)) {
    return { valid: false, error: 'Invalid phone number format' }
  }

  return { valid: true }
}

/**
 * Validate complete profile update input
 */
export function validateProfileInput(input: UpdateProfileInput): {
  valid: boolean
  errors: Record<string, string>
} {
  const errors: Record<string, string> = {}

  if (input.displayName !== undefined) {
    const result = validateDisplayName(input.displayName)
    if (!result.valid && result.error) {
      errors.displayName = result.error
    }
  }

  if (input.username !== undefined) {
    const result = validateUsername(input.username)
    if (!result.valid && result.error) {
      errors.username = result.error
    }
  }

  if (input.bio !== undefined) {
    const result = validateBio(input.bio)
    if (!result.valid && result.error) {
      errors.bio = result.error
    }
  }

  if (input.website !== undefined) {
    const result = validateWebsite(input.website)
    if (!result.valid && result.error) {
      errors.website = result.error
    }
  }

  if (input.phone !== undefined) {
    const result = validatePhone(input.phone)
    if (!result.valid && result.error) {
      errors.phone = result.error
    }
  }

  if (input.location !== undefined && input.location.length > PROFILE_LIMITS.location) {
    errors.location = `Location must be at most ${PROFILE_LIMITS.location} characters`
  }

  if (input.jobTitle !== undefined && input.jobTitle.length > PROFILE_LIMITS.jobTitle) {
    errors.jobTitle = `Job title must be at most ${PROFILE_LIMITS.jobTitle} characters`
  }

  if (input.organization !== undefined && input.organization.length > PROFILE_LIMITS.organization) {
    errors.organization = `Organization must be at most ${PROFILE_LIMITS.organization} characters`
  }

  if (input.pronouns !== undefined && input.pronouns.length > PROFILE_LIMITS.pronouns) {
    errors.pronouns = `Pronouns must be at most ${PROFILE_LIMITS.pronouns} characters`
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

// ============================================================================
// Profile Service Class
// ============================================================================

export class ProfileService {
  private graphqlUrl: string
  private adminSecret?: string

  constructor(options: { graphqlUrl?: string; adminSecret?: string } = {}) {
    this.graphqlUrl = options.graphqlUrl || process.env.NEXT_PUBLIC_GRAPHQL_URL || ''
    this.adminSecret = options.adminSecret || process.env.HASURA_ADMIN_SECRET
  }

  /**
   * Execute GraphQL request
   */
  private async executeGraphQL<T>(
    query: string,
    variables: Record<string, unknown>,
    authToken?: string
  ): Promise<{ data?: T; errors?: Array<{ message: string }> }> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`
    }

    if (this.adminSecret) {
      headers['x-hasura-admin-secret'] = this.adminSecret
    }

    const response = await fetch(this.graphqlUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
    })

    if (!response.ok) {
      throw new Error(`GraphQL request failed: ${response.status}`)
    }

    return response.json()
  }

  // ============================================================================
  // Profile CRUD
  // ============================================================================

  /**
   * Get user profile by ID
   */
  async getProfile(userId: string): Promise<UserProfileFull | null> {
    try {
      const query = `
        query GetUserProfile($userId: uuid!) {
          nchat_users_by_pk(id: $userId) {
            id
            username
            display_name
            email
            email_verified
            phone
            avatar_url
            bio
            status
            status_emoji
            status_expires_at
            location
            website
            job_title
            department
            organization
            pronouns
            timezone
            locale
            role {
              name
            }
            is_active
            is_bot
            created_at
            updated_at
            last_seen_at
            last_username_change
            privacy_settings
            social_links
            banner_url
          }
        }
      `

      const result = await this.executeGraphQL<{
        nchat_users_by_pk: Record<string, unknown> | null
      }>(query, { userId })

      if (result.errors?.length) {
        logger.error('[ProfileService] GraphQL errors:', result.errors)
        return null
      }

      const user = result.data?.nchat_users_by_pk
      if (!user) return null

      return this.mapDbToProfile(user)
    } catch (error) {
      logger.error('[ProfileService] Error getting profile:', error)
      throw error
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    input: UpdateProfileInput
  ): Promise<UpdateProfileResult> {
    try {
      // Validate input
      const validation = validateProfileInput(input)
      if (!validation.valid) {
        return {
          success: false,
          error: 'Validation failed',
          fieldErrors: validation.errors,
        }
      }

      const mutation = `
        mutation UpdateProfile(
          $userId: uuid!
          $displayName: String
          $bio: String
          $location: String
          $website: String
          $phone: String
          $jobTitle: String
          $department: String
          $organization: String
          $pronouns: String
          $timezone: String
          $locale: String
          $socialLinks: jsonb
        ) {
          update_nchat_users_by_pk(
            pk_columns: { id: $userId }
            _set: {
              display_name: $displayName
              bio: $bio
              location: $location
              website: $website
              phone: $phone
              job_title: $jobTitle
              department: $department
              organization: $organization
              pronouns: $pronouns
              timezone: $timezone
              locale: $locale
              social_links: $socialLinks
              updated_at: "now()"
            }
          ) {
            id
            username
            display_name
            email
            bio
            location
            website
            updated_at
          }
        }
      `

      const result = await this.executeGraphQL<{
        update_nchat_users_by_pk: Record<string, unknown> | null
      }>(mutation, {
        userId,
        displayName: input.displayName,
        bio: input.bio,
        location: input.location,
        website: input.website,
        phone: input.phone,
        jobTitle: input.jobTitle,
        department: input.department,
        organization: input.organization,
        pronouns: input.pronouns,
        timezone: input.timezone,
        locale: input.language,
        socialLinks: input.socialLinks,
      })

      if (result.errors?.length) {
        logger.error('[ProfileService] GraphQL errors:', result.errors)
        return { success: false, error: 'Failed to update profile' }
      }

      const updatedUser = result.data?.update_nchat_users_by_pk
      if (!updatedUser) {
        return { success: false, error: 'User not found' }
      }

      return {
        success: true,
        profile: this.mapDbToProfile(updatedUser) as UserProfileFull,
      }
    } catch (error) {
      logger.error('[ProfileService] Error updating profile:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  // ============================================================================
  // Username Management
  // ============================================================================

  /**
   * Check if username is available
   */
  async checkUsernameAvailability(
    username: string,
    currentUserId?: string
  ): Promise<UsernameValidation> {
    // First validate format
    const formatValidation = validateUsername(username)
    if (!formatValidation.valid) {
      return formatValidation
    }

    try {
      const query = `
        query CheckUsername($username: String!, $currentUserId: uuid) {
          nchat_users(
            where: {
              username: { _eq: $username }
              ${currentUserId ? 'id: { _neq: $currentUserId }' : ''}
            }
            limit: 1
          ) {
            id
          }
        }
      `

      const result = await this.executeGraphQL<{
        nchat_users: Array<{ id: string }>
      }>(query, { username: username.toLowerCase(), currentUserId })

      if (result.errors?.length) {
        return { valid: true, available: undefined, error: 'Could not check availability' }
      }

      const exists = (result.data?.nchat_users?.length ?? 0) > 0

      if (exists) {
        // Generate suggestions
        const suggestions = this.generateUsernameSuggestions(username)
        return {
          valid: true,
          available: false,
          error: 'This username is already taken',
          suggestions,
        }
      }

      return { valid: true, available: true }
    } catch (error) {
      logger.error('[ProfileService] Error checking username:', error)
      return { valid: true, available: undefined, error: 'Could not check availability' }
    }
  }

  /**
   * Change username with rate limiting
   */
  async changeUsername(
    userId: string,
    newUsername: string
  ): Promise<{ success: boolean; error?: string; cooldownEndsAt?: Date }> {
    try {
      // Check availability
      const availability = await this.checkUsernameAvailability(newUsername, userId)
      if (!availability.valid || !availability.available) {
        return { success: false, error: availability.error || 'Username not available' }
      }

      // Check cooldown
      const profile = await this.getProfile(userId)
      if (profile?.lastUsernameChange) {
        const cooldownEnd = new Date(profile.lastUsernameChange)
        cooldownEnd.setDate(cooldownEnd.getDate() + USERNAME_RULES.changeCooldownDays)

        if (cooldownEnd > new Date()) {
          return {
            success: false,
            error: `You can change your username again after ${cooldownEnd.toLocaleDateString()}`,
            cooldownEndsAt: cooldownEnd,
          }
        }
      }

      // Update username
      const mutation = `
        mutation ChangeUsername($userId: uuid!, $username: String!) {
          update_nchat_users_by_pk(
            pk_columns: { id: $userId }
            _set: {
              username: $username
              last_username_change: "now()"
              updated_at: "now()"
            }
          ) {
            id
            username
            last_username_change
          }
        }
      `

      const result = await this.executeGraphQL<{
        update_nchat_users_by_pk: { id: string; username: string } | null
      }>(mutation, { userId, username: newUsername.toLowerCase() })

      if (result.errors?.length) {
        return { success: false, error: 'Failed to change username' }
      }

      return { success: true }
    } catch (error) {
      logger.error('[ProfileService] Error changing username:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Generate username suggestions when taken
   */
  private generateUsernameSuggestions(base: string): string[] {
    const suggestions: string[] = []
    const cleanBase = base.toLowerCase().replace(/\d+$/, '')

    // Add numbers
    for (let i = 1; i <= 3; i++) {
      const num = Math.floor(Math.random() * 1000)
      suggestions.push(`${cleanBase}${num}`)
    }

    // Add underscores
    suggestions.push(`${cleanBase}_`)
    suggestions.push(`_${cleanBase}`)

    return suggestions.filter(
      (s) => s.length <= USERNAME_RULES.maxLength && validateUsername(s).valid
    )
  }

  // ============================================================================
  // Photo Management
  // ============================================================================

  /**
   * Upload profile photo
   */
  async uploadPhoto(
    userId: string,
    options: PhotoUploadOptions
  ): Promise<{ success: boolean; photo?: ProfilePhoto; error?: string }> {
    try {
      const { file, crop, rotation } = options

      // Validate file
      if (!file.type.startsWith('image/')) {
        return { success: false, error: 'File must be an image' }
      }

      const maxSize = 10 * 1024 * 1024 // 10MB
      if (file.size > maxSize) {
        return { success: false, error: 'Image must be less than 10MB' }
      }

      // In a real implementation, we would:
      // 1. Upload to storage service (MinIO/S3)
      // 2. Apply crop and rotation
      // 3. Generate thumbnails
      // 4. Update database with URLs

      // For now, simulate the operation
      const photo: ProfilePhoto = {
        id: `photo_${Date.now()}`,
        url: `/api/storage/avatars/${userId}/full.jpg`,
        thumbnailUrl: `/api/storage/avatars/${userId}/thumb.jpg`,
        mediumUrl: `/api/storage/avatars/${userId}/medium.jpg`,
        originalFilename: file.name,
        size: file.size,
        dimensions: { width: 512, height: 512 },
        createdAt: new Date(),
        isCurrent: true,
      }

      // Update database
      const mutation = `
        mutation UpdateAvatar($userId: uuid!, $avatarUrl: String!) {
          update_nchat_users_by_pk(
            pk_columns: { id: $userId }
            _set: { avatar_url: $avatarUrl, updated_at: "now()" }
          ) {
            id
            avatar_url
          }
        }
      `

      await this.executeGraphQL(mutation, { userId, avatarUrl: photo.url })

      return { success: true, photo }
    } catch (error) {
      logger.error('[ProfileService] Error uploading photo:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload photo',
      }
    }
  }

  /**
   * Delete profile photo
   */
  async deletePhoto(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const mutation = `
        mutation DeleteAvatar($userId: uuid!) {
          update_nchat_users_by_pk(
            pk_columns: { id: $userId }
            _set: { avatar_url: null, updated_at: "now()" }
          ) {
            id
            avatar_url
          }
        }
      `

      await this.executeGraphQL(mutation, { userId })

      return { success: true }
    } catch (error) {
      logger.error('[ProfileService] Error deleting photo:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete photo',
      }
    }
  }

  // ============================================================================
  // Privacy Settings
  // ============================================================================

  /**
   * Get privacy settings
   */
  async getPrivacySettings(userId: string): Promise<ProfilePrivacySettings> {
    try {
      const profile = await this.getProfile(userId)
      return profile?.privacySettings || DEFAULT_PRIVACY_SETTINGS
    } catch (error) {
      logger.error('[ProfileService] Error getting privacy settings:', error)
      return DEFAULT_PRIVACY_SETTINGS
    }
  }

  /**
   * Update privacy settings
   */
  async updatePrivacySettings(
    userId: string,
    settings: Partial<ProfilePrivacySettings>
  ): Promise<{ success: boolean; settings?: ProfilePrivacySettings; error?: string }> {
    try {
      // Merge with current settings
      const current = await this.getPrivacySettings(userId)
      const merged = { ...current, ...settings }

      const mutation = `
        mutation UpdatePrivacySettings($userId: uuid!, $settings: jsonb!) {
          update_nchat_users_by_pk(
            pk_columns: { id: $userId }
            _set: { privacy_settings: $settings, updated_at: "now()" }
          ) {
            id
            privacy_settings
          }
        }
      `

      await this.executeGraphQL(mutation, { userId, settings: merged })

      return { success: true, settings: merged }
    } catch (error) {
      logger.error('[ProfileService] Error updating privacy settings:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update settings',
      }
    }
  }

  // ============================================================================
  // Profile Discovery
  // ============================================================================

  /**
   * Search for profiles
   */
  async searchProfiles(
    query: string,
    options: { limit?: number; offset?: number; viewerId?: string } = {}
  ): Promise<ProfileSearchResult[]> {
    const { limit = 20, offset = 0, viewerId } = options

    try {
      const gqlQuery = `
        query SearchProfiles($search: String!, $limit: Int!, $offset: Int!) {
          nchat_users(
            where: {
              _and: [
                { is_active: { _eq: true } }
                {
                  _or: [
                    { username: { _ilike: $search } }
                    { display_name: { _ilike: $search } }
                  ]
                }
              ]
            }
            order_by: { display_name: asc }
            limit: $limit
            offset: $offset
          ) {
            id
            username
            display_name
            avatar_url
            bio
            privacy_settings
          }
        }
      `

      const result = await this.executeGraphQL<{
        nchat_users: Array<{
          id: string
          username: string
          display_name: string
          avatar_url?: string
          bio?: string
          privacy_settings?: ProfilePrivacySettings
        }>
      }>(gqlQuery, { search: `%${query}%`, limit, offset })

      if (result.errors?.length) {
        return []
      }

      return (result.data?.nchat_users || []).map((user) => ({
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        bioSnippet: user.bio?.substring(0, 50),
      }))
    } catch (error) {
      logger.error('[ProfileService] Error searching profiles:', error)
      return []
    }
  }

  /**
   * Generate QR code for profile sharing
   */
  async generateQRCode(
    userId: string,
    style: 'default' | 'minimal' | 'branded' = 'default'
  ): Promise<ProfileQRCode | null> {
    try {
      const profile = await this.getProfile(userId)
      if (!profile) return null

      // Generate deep link
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nchat.app'
      const deepLink = `${baseUrl}/u/${profile.username}`

      // Returns an SVG placeholder. Use a QR code library (e.g., qrcode) for production.
      return {
        dataUrl: `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="white" width="200" height="200"/><text x="100" y="100" text-anchor="middle">QR</text></svg>`,
        deepLink,
        style,
      }
    } catch (error) {
      logger.error('[ProfileService] Error generating QR code:', error)
      return null
    }
  }

  // ============================================================================
  // Helper Functions
  // ============================================================================

  /**
   * Map database user to profile type
   */
  private mapDbToProfile(dbUser: Record<string, unknown>): UserProfileFull {
    return {
      id: dbUser.id as string,
      username: dbUser.username as string,
      displayName: dbUser.display_name as string,
      email: dbUser.email as string,
      emailVerified: dbUser.email_verified as boolean,
      phone: dbUser.phone as string | undefined,
      phoneVerified: dbUser.phone_verified as boolean | undefined,
      photo: dbUser.avatar_url
        ? {
            id: 'current',
            url: dbUser.avatar_url as string,
            thumbnailUrl: dbUser.avatar_url as string,
            mediumUrl: dbUser.avatar_url as string,
            size: 0,
            dimensions: { width: 0, height: 0 },
            createdAt: new Date(),
            isCurrent: true,
          }
        : undefined,
      bio: dbUser.bio as string | undefined,
      status: dbUser.status as string | undefined,
      statusEmoji: dbUser.status_emoji as string | undefined,
      statusExpiresAt: dbUser.status_expires_at
        ? new Date(dbUser.status_expires_at as string)
        : undefined,
      location: dbUser.location as string | undefined,
      website: dbUser.website as string | undefined,
      jobTitle: dbUser.job_title as string | undefined,
      department: dbUser.department as string | undefined,
      organization: dbUser.organization as string | undefined,
      pronouns: dbUser.pronouns as string | undefined,
      timezone: dbUser.timezone as string | undefined,
      language: dbUser.locale as string | undefined,
      role: ((dbUser.role as { name: string })?.name || 'member') as UserProfileFull['role'],
      isBot: dbUser.is_bot as boolean | undefined,
      createdAt: new Date(dbUser.created_at as string),
      updatedAt: new Date(dbUser.updated_at as string),
      lastSeenAt: dbUser.last_seen_at ? new Date(dbUser.last_seen_at as string) : undefined,
      lastUsernameChange: dbUser.last_username_change
        ? new Date(dbUser.last_username_change as string)
        : undefined,
      privacySettings: (dbUser.privacy_settings as ProfilePrivacySettings) || undefined,
      socialLinks: dbUser.social_links as UserProfileFull['socialLinks'],
      bannerUrl: dbUser.banner_url as string | undefined,
    }
  }
}

// Export singleton instance
export const profileService = new ProfileService()
