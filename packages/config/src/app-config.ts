// Duplicate of frontend/src/types/config.ts — authoritative until S05 migration

export interface SetupConfig {
  instanceName: string
  instanceUrl: string
  adminEmail: string
  allowRegistration: boolean
  requireEmailVerification: boolean
  requireAdminApproval: boolean
  maxUsersPerInstance: number | null
  maintenanceMode: boolean
  maintenanceMessage: string
}

export interface OwnerConfig {
  name: string
  email: string
  website: string | null
  organization: string | null
}

export interface BrandingConfig {
  appName: string
  tagline: string
  logoUrl: string | null
  faviconUrl: string | null
  primaryColor: string
  accentColor: string
  darkMode: boolean
  customCss: string | null
}

export type LandingTheme = 'default' | 'minimal' | 'corporate' | 'community'

export interface HomepageConfig {
  showHero: boolean
  heroTitle: string
  heroSubtitle: string
  heroCtaText: string
  showFeatures: boolean
  showTestimonials: boolean
  showPricing: boolean
  customSections: unknown[]
}

export interface AuthProvidersConfig {
  emailPassword: boolean
  google: boolean
  github: boolean
  discord: boolean
  apple: boolean
  saml: boolean
  ldap: boolean
}

export interface AuthPermissionsConfig {
  allowGuestAccess: boolean
  guestChannels: string[]
  defaultRole: string
  requireMfa: boolean
  sessionDuration: number
  maxSessions: number
}

export interface FeatureFlags {
  publicChannels: boolean
  privateChannels: boolean
  directMessages: boolean
  fileUploads: boolean
  voiceMessages: boolean
  threads: boolean
  reactions: boolean
  search: boolean
  guestAccess: boolean
  inviteLinks: boolean
  channelCategories: boolean
  customEmojis: boolean
  messageScheduling: boolean
  videoConferencing: boolean
  polls: boolean
  stickers: boolean
  bots: boolean
  webhooks: boolean
  analytics: boolean
  readReceipts: boolean
  typingIndicators: boolean
  presence: boolean
  messageEditing: boolean
  messageDeletion: boolean
  messagePinning: boolean
  bookmarks: boolean
}

export interface IntegrationsConfig {
  livekit: {
    enabled: boolean
    serverUrl: string | null
    apiKey: string | null
  }
  storage: {
    provider: 'local' | 's3' | 'gcs' | 'azure'
    maxFileSizeMb: number
    allowedMimeTypes: string[]
  }
  email: {
    provider: 'smtp' | 'sendgrid' | 'ses' | null
    fromAddress: string | null
    fromName: string | null
  }
  push: {
    enabled: boolean
    provider: 'fcm' | 'apns' | null
  }
  ai: {
    enabled: boolean
    provider: 'openai' | 'anthropic' | 'custom' | null
    model: string | null
  }
}

export interface ModerationConfig {
  autoModeration: boolean
  wordFilter: boolean
  blockedWords: string[]
  spamProtection: boolean
  maxMessagesPerMinute: number
  requirePhoneVerification: boolean
}

export interface ThemeConfig {
  borderRadius: 'none' | 'small' | 'medium' | 'large' | 'full'
  fontFamily: string
  fontSize: 'small' | 'medium' | 'large'
  density: 'compact' | 'comfortable' | 'spacious'
}

export interface SEOConfig {
  metaTitle: string
  metaDescription: string
  ogImage: string | null
  robotsTxt: string | null
  sitemapEnabled: boolean
}

export interface LegalConfig {
  termsOfServiceUrl: string | null
  privacyPolicyUrl: string | null
  cookiePolicyUrl: string | null
  gdprEnabled: boolean
  dataRetentionDays: number | null
}

export interface SocialLinksConfig {
  twitter: string | null
  github: string | null
  discord: string | null
  linkedin: string | null
  website: string | null
}

export interface AppConfig {
  setup: SetupConfig
  owner: OwnerConfig
  branding: BrandingConfig
  landingTheme: LandingTheme
  homepage: HomepageConfig
  authProviders: AuthProvidersConfig
  authPermissions: AuthPermissionsConfig
  features: FeatureFlags
  integrations: IntegrationsConfig
  moderation: ModerationConfig
  theme: ThemeConfig
  seo: SEOConfig
  legal: LegalConfig
  social: SocialLinksConfig
  // Feature-flag convenience fields — used by hasVideoCall/hasAI helpers
  enableVideoCall?: boolean
  enableAI?: boolean
}
