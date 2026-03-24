/**
 * Configuration Types for nself-chat
 *
 * Comprehensive type definitions for application configuration, feature flags,
 * theme settings, and all white-label customization options.
 */

// ============================================================================
// Setup Configuration Types
// ============================================================================

/**
 * Setup wizard state.
 */
export interface SetupConfig {
  /** Whether setup is completed */
  isCompleted: boolean
  /** Current step index */
  currentStep: number
  /** Steps that have been visited */
  visitedSteps: number[]
  /** When setup was completed */
  completedAt?: Date
  /** Who completed setup */
  completedBy?: string
}

/**
 * Setup step definitions.
 */
export interface SetupStep {
  /** Step ID */
  id: string
  /** Step name */
  name: string
  /** Step description */
  description: string
  /** Step icon */
  icon?: string
  /** Is step optional */
  optional?: boolean
  /** Validation function */
  validate?: (config: AppConfig) => boolean
}

/**
 * Setup steps list.
 */
export const SetupSteps: SetupStep[] = [
  { id: 'welcome', name: 'Welcome', description: 'Introduction to nchat setup' },
  { id: 'owner', name: 'Owner Information', description: 'Your account details' },
  { id: 'branding', name: 'App Branding', description: 'Logo, name, and identity' },
  { id: 'theme', name: 'Theme & Colors', description: 'Visual customization' },
  { id: 'landing', name: 'Landing Page', description: 'Homepage configuration' },
  { id: 'auth', name: 'Authentication', description: 'Sign-in methods' },
  { id: 'permissions', name: 'Access Control', description: 'Who can access your app' },
  { id: 'features', name: 'Features', description: 'Enable/disable features' },
  { id: 'review', name: 'Review & Launch', description: 'Final review and launch' },
]

// ============================================================================
// Owner Configuration Types
// ============================================================================

/**
 * Owner/admin information.
 */
export interface OwnerConfig {
  /** Owner name */
  name: string
  /** Owner email */
  email: string
  /** Company/organization name */
  company?: string
  /** Owner role/title */
  role?: string
  /** Owner avatar URL */
  avatarUrl?: string
}

// ============================================================================
// Branding Configuration Types
// ============================================================================

/**
 * Branding configuration.
 */
export interface BrandingConfig {
  /** Application name */
  appName: string
  /** Short tagline */
  tagline?: string
  /** Logo URL */
  logo?: string
  /** Favicon URL */
  favicon?: string
  /** Company name */
  companyName?: string
  /** Website URL */
  websiteUrl?: string
  /** Logo scale factor (0.5 to 2.0) */
  logoScale?: number
  /** Logo position in header */
  logoPosition?: 'left' | 'center'
  /** Show app name next to logo */
  showAppName?: boolean
}

// ============================================================================
// Theme Configuration Types
// ============================================================================

/**
 * Theme preset names.
 */
export type ThemePreset =
  | 'nself'
  | 'slack'
  | 'discord'
  | 'sunset'
  | 'emerald'
  | 'rose'
  | 'purple'
  | 'ocean'
  | 'custom'

/**
 * Color scheme modes.
 */
export type ColorScheme = 'light' | 'dark' | 'system'

/**
 * Theme color configuration.
 */
export interface ThemeColors {
  /** Primary brand color */
  primaryColor: string
  /** Secondary color */
  secondaryColor: string
  /** Accent color */
  accentColor: string
  /** Background color */
  backgroundColor: string
  /** Surface/card color */
  surfaceColor: string
  /** Primary text color */
  textColor: string
  /** Muted/secondary text color */
  mutedColor: string
  /** Border color */
  borderColor: string
  /** Primary button background */
  buttonPrimaryBg: string
  /** Primary button text */
  buttonPrimaryText: string
  /** Secondary button background */
  buttonSecondaryBg: string
  /** Secondary button text */
  buttonSecondaryText: string
  /** Success color */
  successColor: string
  /** Warning color */
  warningColor: string
  /** Error color */
  errorColor: string
  /** Info color */
  infoColor: string
}

/**
 * Full theme configuration.
 */
export interface ThemeConfig extends ThemeColors {
  /** Theme preset */
  preset?: ThemePreset
  /** Color scheme mode */
  colorScheme: ColorScheme
  /** Border radius */
  borderRadius: string
  /** Font family */
  fontFamily: string
  /** Custom CSS overrides */
  customCSS?: string
  /** Custom theme JSON (for import/export) */
  customThemeJSON?: string
  /** Sidebar style */
  sidebarStyle?: 'default' | 'compact' | 'minimal'
  /** Message density */
  messageDensity?: 'comfortable' | 'compact' | 'cozy'
}

/**
 * Default theme configuration.
 */
export const DefaultThemeConfig: ThemeConfig = {
  preset: 'nself',
  primaryColor: '#38BDF8',
  secondaryColor: '#0EA5E9',
  accentColor: '#0284C7',
  backgroundColor: '#0F0F1A',
  surfaceColor: '#1E293B',
  textColor: '#F8FAFC',
  mutedColor: '#94A3B8',
  borderColor: '#334155',
  buttonPrimaryBg: '#38BDF8',
  buttonPrimaryText: '#0F0F1A',
  buttonSecondaryBg: '#334155',
  buttonSecondaryText: '#F8FAFC',
  successColor: '#10B981',
  warningColor: '#F59E0B',
  errorColor: '#EF4444',
  infoColor: '#3B82F6',
  borderRadius: '12px',
  fontFamily: 'Inter, system-ui, sans-serif',
  colorScheme: 'dark',
}

// ============================================================================
// Landing Page Configuration Types
// ============================================================================

/**
 * Landing page theme templates.
 */
export type LandingTheme =
  | 'login-only'
  | 'simple-landing'
  | 'full-homepage'
  | 'corporate'
  | 'community'

/**
 * Landing page mode.
 */
export type LandingMode = 'landing' | 'redirect' | 'chat'

/**
 * Landing page sections.
 */
export interface LandingPages {
  /** Hero section */
  hero: boolean
  /** Features section */
  features: boolean
  /** Pricing section */
  pricing: boolean
  /** About section */
  about: boolean
  /** Contact section */
  contact: boolean
  /** Blog section */
  blog: boolean
  /** Documentation section */
  docs: boolean
}

/**
 * Homepage configuration.
 */
export interface HomepageConfig {
  /** Landing mode */
  mode: LandingMode
  /** Landing page sections */
  landingPages?: LandingPages
  /** Redirect target (when mode is 'redirect') */
  redirectTo?: '/login' | '/chat' | '/signup'
}

// ============================================================================
// Authentication Configuration Types
// ============================================================================

/**
 * ID.me authentication configuration.
 */
export interface IdMeConfig {
  /** Enable ID.me */
  enabled: boolean
  /** Allow military verification */
  allowMilitary: boolean
  /** Allow police verification */
  allowPolice: boolean
  /** Allow first responders */
  allowFirstResponders: boolean
  /** Allow government employees */
  allowGovernment: boolean
  /** Require verification */
  requireVerification: boolean
}

/**
 * Authentication providers configuration.
 */
export interface AuthProvidersConfig {
  /** Email/password auth */
  emailPassword: boolean
  /** Magic links auth */
  magicLinks: boolean
  /** Google OAuth */
  google: boolean
  /** Facebook OAuth */
  facebook: boolean
  /** Twitter/X OAuth */
  twitter: boolean
  /** GitHub OAuth */
  github: boolean
  /** Discord OAuth */
  discord: boolean
  /** Slack OAuth */
  slack: boolean
  /** ID.me configuration */
  idme: IdMeConfig
}

/**
 * Permission modes.
 */
export type PermissionMode =
  | 'allow-all'
  | 'verified-only'
  | 'idme-roles'
  | 'domain-restricted'
  | 'admin-only'

/**
 * ID.me role types.
 */
export type IdMeRole = 'military' | 'police' | 'first-responder' | 'government'

/**
 * Authentication permissions configuration.
 */
export interface AuthPermissionsConfig {
  /** Permission mode */
  mode: PermissionMode
  /** Require email verification */
  requireEmailVerification: boolean
  /** Allowed email domains */
  allowedDomains?: string[]
  /** Allowed ID.me roles */
  allowedIdMeRoles?: IdMeRole[]
  /** Require admin approval */
  requireApproval: boolean
  /** Auto-approve new users */
  autoApprove?: boolean
  /** Welcome new members in channel */
  welcomeNewMembers: boolean
  /** Channel for new member announcements */
  newMemberChannel?: string
}

// ============================================================================
// Feature Flags Types
// ============================================================================

/**
 * Feature flags configuration.
 */
export interface FeatureFlags {
  /** Enable public channels */
  publicChannels: boolean
  /** Enable private channels */
  privateChannels: boolean
  /** Enable direct messages */
  directMessages: boolean
  /** Enable file uploads */
  fileUploads: boolean
  /** Enable voice messages */
  voiceMessages: boolean
  /** Enable threads */
  threads: boolean
  /** Enable reactions */
  reactions: boolean
  /** Enable search */
  search: boolean
  /** Enable guest access */
  guestAccess: boolean
  /** Enable invite links */
  inviteLinks: boolean
  /** Enable channel categories */
  channelCategories: boolean
  /** Enable custom emojis */
  customEmojis: boolean
  /** Enable message scheduling */
  messageScheduling: boolean
  /** Enable video conferencing */
  videoConferencing: boolean
  /** Enable polls */
  polls: boolean
  /** Enable stickers */
  stickers: boolean
  /** Enable bots */
  bots: boolean
  /** Enable webhooks */
  webhooks: boolean
  /** Enable analytics */
  analytics: boolean
  /** Enable read receipts */
  readReceipts: boolean
  /** Enable typing indicators */
  typingIndicators: boolean
  /** Enable presence (online status) */
  presence: boolean
  /** Enable message editing */
  messageEditing: boolean
  /** Enable message deletion */
  messageDeletion: boolean
  /** Enable message pinning */
  messagePinning: boolean
  /** Enable bookmarks */
  bookmarks: boolean
}

/**
 * Default feature flags.
 */
export const DefaultFeatureFlags: FeatureFlags = {
  publicChannels: true,
  privateChannels: true,
  directMessages: true,
  fileUploads: true,
  voiceMessages: false,
  threads: true,
  reactions: true,
  search: true,
  guestAccess: false,
  inviteLinks: true,
  channelCategories: false,
  customEmojis: false,
  messageScheduling: false,
  videoConferencing: false,
  polls: false,
  stickers: false,
  bots: false,
  webhooks: false,
  analytics: false,
  readReceipts: true,
  typingIndicators: true,
  presence: true,
  messageEditing: true,
  messageDeletion: true,
  messagePinning: true,
  bookmarks: true,
}

// ============================================================================
// Integration Configuration Types
// ============================================================================

/**
 * Slack integration configuration.
 */
export interface SlackIntegration {
  enabled: boolean
  importChannels: boolean
  syncMessages: boolean
}

/**
 * GitHub integration configuration.
 */
export interface GitHubIntegration {
  enabled: boolean
  notifications: boolean
  linkPullRequests: boolean
}

/**
 * Jira integration configuration.
 */
export interface JiraIntegration {
  enabled: boolean
  ticketNotifications: boolean
}

/**
 * Google Drive integration configuration.
 */
export interface GoogleDriveIntegration {
  enabled: boolean
  fileSharing: boolean
}

/**
 * Webhook integration configuration.
 */
export interface WebhookIntegration {
  enabled: boolean
  customEndpoints: string[]
}

/**
 * All integrations configuration.
 */
export interface IntegrationsConfig {
  slack: SlackIntegration
  github: GitHubIntegration
  jira: JiraIntegration
  googleDrive: GoogleDriveIntegration
  webhooks: WebhookIntegration
}

// ============================================================================
// Moderation Configuration Types
// ============================================================================

/**
 * Moderation configuration.
 */
export interface ModerationConfig {
  /** Enable auto-moderation */
  autoModeration: boolean
  /** Enable profanity filter */
  profanityFilter: boolean
  /** Enable spam detection */
  spamDetection: boolean
  /** Require message approval */
  requireMessageApproval: boolean
  /** Roles that can moderate */
  moderatorRoles: string[]
  /** Enable reporting system */
  reportingSystem: boolean
  /** Custom blocked words */
  blockedWords?: string[]
  /** Link filtering */
  linkFiltering?: 'allow' | 'warn' | 'block'
}

// ============================================================================
// SEO Configuration Types
// ============================================================================

/**
 * SEO configuration.
 */
export interface SEOConfig {
  /** Page title */
  title: string
  /** Meta description */
  description: string
  /** Meta keywords */
  keywords: string[]
  /** Open Graph image */
  ogImage?: string
  /** Twitter handle */
  twitterHandle?: string
  /** Robots directives */
  robots?: string
  /** Canonical URL */
  canonicalUrl?: string
}

// ============================================================================
// Legal Configuration Types
// ============================================================================

/**
 * Legal configuration.
 */
export interface LegalConfig {
  /** Privacy policy URL */
  privacyPolicyUrl?: string
  /** Terms of service URL */
  termsOfServiceUrl?: string
  /** Cookie policy URL */
  cookiePolicyUrl?: string
  /** Support email */
  supportEmail: string
  /** GDPR compliance */
  gdprCompliance?: boolean
  /** Data retention days */
  dataRetentionDays?: number
}

// ============================================================================
// Social Links Configuration Types
// ============================================================================

/**
 * Social links configuration.
 */
export interface SocialLinksConfig {
  twitter?: string
  linkedin?: string
  github?: string
  discord?: string
  slack?: string
  website?: string
  instagram?: string
  facebook?: string
  youtube?: string
}

// ============================================================================
// Main AppConfig Interface
// ============================================================================

/**
 * Complete application configuration.
 */
export interface AppConfig {
  /** Setup state */
  setup: SetupConfig
  /** Owner information */
  owner: OwnerConfig
  /** Branding configuration */
  branding: BrandingConfig
  /** Landing page theme */
  landingTheme: LandingTheme
  /** Homepage configuration */
  homepage: HomepageConfig
  /** Authentication providers */
  authProviders: AuthProvidersConfig
  /** Authentication permissions */
  authPermissions: AuthPermissionsConfig
  /** Feature flags */
  features: FeatureFlags
  /** Integrations */
  integrations: IntegrationsConfig
  /** Moderation settings */
  moderation: ModerationConfig
  /** Theme configuration */
  theme: ThemeConfig
  /** SEO configuration */
  seo: SEOConfig
  /** Legal configuration */
  legal: LegalConfig
  /** Social links */
  social: SocialLinksConfig
}

// ============================================================================
// Default AppConfig
// ============================================================================

/**
 * Default application configuration.
 */
export const DefaultAppConfig: AppConfig = {
  setup: {
    isCompleted: false,
    currentStep: 0,
    visitedSteps: [0],
  },
  owner: {
    name: '',
    email: '',
  },
  branding: {
    appName: 'nchat',
    tagline: 'Team Communication Platform',
    logoScale: 1.0,
  },
  landingTheme: 'simple-landing',
  homepage: {
    mode: 'landing',
    landingPages: {
      hero: true,
      features: true,
      pricing: false,
      about: false,
      contact: false,
      blog: false,
      docs: false,
    },
  },
  authProviders: {
    emailPassword: true,
    magicLinks: false,
    google: false,
    facebook: false,
    twitter: false,
    github: false,
    discord: false,
    slack: false,
    idme: {
      enabled: false,
      allowMilitary: true,
      allowPolice: true,
      allowFirstResponders: true,
      allowGovernment: false,
      requireVerification: true,
    },
  },
  authPermissions: {
    mode: 'allow-all',
    requireEmailVerification: false,
    requireApproval: false,
    autoApprove: true,
    welcomeNewMembers: true,
    newMemberChannel: 'general',
  },
  features: DefaultFeatureFlags,
  integrations: {
    slack: { enabled: false, importChannels: false, syncMessages: false },
    github: { enabled: false, notifications: false, linkPullRequests: false },
    jira: { enabled: false, ticketNotifications: false },
    googleDrive: { enabled: false, fileSharing: false },
    webhooks: { enabled: false, customEndpoints: [] },
  },
  moderation: {
    autoModeration: false,
    profanityFilter: false,
    spamDetection: true,
    requireMessageApproval: false,
    moderatorRoles: ['admin', 'moderator'],
    reportingSystem: true,
  },
  theme: DefaultThemeConfig,
  seo: {
    title: 'nchat - Team Communication Platform',
    description: 'Modern team communication and collaboration platform',
    keywords: ['chat', 'team', 'communication', 'collaboration', 'messaging'],
  },
  legal: {
    supportEmail: 'support@example.com',
  },
  social: {},
}

// ============================================================================
// Config Update Types
// ============================================================================

/**
 * Partial config update input.
 */
export type ConfigUpdate = {
  [K in keyof AppConfig]?: Partial<AppConfig[K]>
}

/**
 * Config change event.
 */
export interface ConfigChangeEvent {
  /** Changed section */
  section: keyof AppConfig
  /** Previous value */
  previousValue: unknown
  /** New value */
  newValue: unknown
  /** When change occurred */
  timestamp: Date
  /** Who made the change */
  changedBy?: string
}

// ============================================================================
// Environment Configuration Types
// ============================================================================

/**
 * Environment configuration.
 */
export interface EnvironmentConfig {
  /** Environment name */
  env: 'development' | 'staging' | 'production'
  /** API base URL */
  apiUrl: string
  /** GraphQL endpoint */
  graphqlUrl: string
  /** Auth service URL */
  authUrl: string
  /** Storage service URL */
  storageUrl: string
  /** WebSocket URL */
  wsUrl: string
  /** Use development auth */
  useDevAuth: boolean
  /** Debug mode */
  debug: boolean
  /** Log level */
  logLevel: 'debug' | 'info' | 'warn' | 'error'
}

/**
 * Get environment config from env vars.
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  return {
    env: (process.env.NODE_ENV as EnvironmentConfig['env']) || 'development',
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
    graphqlUrl: process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:8080/v1/graphql',
    authUrl: process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:4000',
    storageUrl: process.env.NEXT_PUBLIC_STORAGE_URL || 'http://localhost:9000',
    wsUrl: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
    useDevAuth: process.env.NEXT_PUBLIC_USE_DEV_AUTH === 'true',
    debug: process.env.NEXT_PUBLIC_DEBUG === 'true',
    logLevel: (process.env.NEXT_PUBLIC_LOG_LEVEL as EnvironmentConfig['logLevel']) || 'info',
  }
}
