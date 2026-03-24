export interface AppConfig {
  // Setup State
  setup: {
    isCompleted: boolean
    currentStep: number
    visitedSteps: number[]
    completedAt?: Date
  }

  // Owner Information
  owner: {
    name: string
    email: string
    company?: string
    role?: string
  }

  // App Identity
  branding: {
    appName: string
    tagline?: string
    logo?: string
    favicon?: string
    companyName?: string
    websiteUrl?: string
    logoScale?: number // Scale factor for logo display (0.5 to 2.0, default 1.0)
  }

  // Landing Theme Templates
  landingTheme: 'login-only' | 'simple-landing' | 'full-homepage' | 'corporate' | 'community'

  // Homepage Configuration
  homepage: {
    mode: 'landing' | 'redirect' | 'chat'
    landingPages?: {
      hero: boolean
      features: boolean
      pricing: boolean
      about: boolean
      contact: boolean
      blog: boolean
      docs: boolean
    }
    redirectTo?: '/login' | '/chat' | '/signup'
  }

  // Authentication Providers
  authProviders: {
    emailPassword: boolean
    magicLinks: boolean
    google: boolean
    facebook: boolean
    twitter: boolean
    github: boolean
    discord: boolean
    slack: boolean
    idme: {
      enabled: boolean
      allowMilitary: boolean
      allowPolice: boolean
      allowFirstResponders: boolean
      allowGovernment: boolean
      requireVerification: boolean
    }
  }

  // Authentication Permissions
  authPermissions: {
    mode: 'allow-all' | 'verified-only' | 'idme-roles' | 'domain-restricted' | 'admin-only'
    requireEmailVerification: boolean
    allowedDomains?: string[]
    allowedIdMeRoles?: ('military' | 'police' | 'first-responder' | 'government')[]
    requireApproval: boolean
    autoApprove?: boolean
    welcomeNewMembers: boolean
    newMemberChannel?: string
  }

  // Features & Permissions
  features: {
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
    gifs: boolean
    stickers: boolean
    messageScheduling: boolean
    videoConferencing: boolean
    endToEndEncryption: boolean
    // Voice & Video Calls
    voiceCalls: boolean
    videoCalls: boolean
    groupCalls: boolean
    screenSharing: boolean
    callRecording: boolean
    maxCallParticipants: number
    // Live Streaming
    liveStreaming: boolean
    streamRecording: boolean
    streamChat: boolean
    streamReactions: boolean
    streamScheduling: boolean
    maxStreamDuration: number // minutes, 0 = unlimited
  }

  // Integrations
  integrations: {
    slack: {
      enabled: boolean
      importChannels: boolean
      syncMessages: boolean
    }
    github: {
      enabled: boolean
      notifications: boolean
      linkPullRequests: boolean
    }
    jira: {
      enabled: boolean
      ticketNotifications: boolean
    }
    googleDrive: {
      enabled: boolean
      fileSharing: boolean
    }
    webhooks: {
      enabled: boolean
      customEndpoints: string[]
    }
  }

  // Moderation & Safety (v0.5.0 - AI-Powered)
  moderation: {
    // Basic Settings
    autoModeration: boolean
    profanityFilter: boolean
    spamDetection: boolean
    requireMessageApproval: boolean
    moderatorRoles: string[]
    reportingSystem: boolean

    // AI Detection (v0.5.0)
    aiModeration: {
      enabled: boolean
      toxicityDetection: boolean
      nsfwDetection: boolean
      spamDetection: boolean
      profanityFilter: boolean
    }

    // Detection Thresholds (0-1)
    thresholds: {
      toxic: number
      nsfw: number
      spam: number
      profanity: number
    }

    // Automated Actions
    autoActions: {
      autoFlag: boolean
      autoHide: boolean
      autoWarn: boolean
      autoMute: boolean
    }

    // Custom Word Lists
    customWords: {
      blocked: string[]
      allowed: string[]
    }
  }

  // End-to-End Encryption (E2EE)
  encryption: {
    enabled: boolean
    enforceForPrivateChannels: boolean
    enforceForDirectMessages: boolean
    allowUnencryptedPublicChannels: boolean
    enableSafetyNumbers: boolean
    requireDeviceVerification: boolean
    automaticKeyRotation: boolean
    keyRotationDays: number
  }

  // Theme & Customization
  theme: {
    preset?: 'nself' | 'slack' | 'discord' | 'sunset' | 'emerald' | 'rose' | 'purple' | 'custom'
    primaryColor: string
    secondaryColor: string
    accentColor: string
    backgroundColor: string
    surfaceColor: string
    textColor: string
    mutedColor: string
    borderColor: string
    // Button colors
    buttonPrimaryBg: string
    buttonPrimaryText: string
    buttonSecondaryBg: string
    buttonSecondaryText: string
    // Status colors
    successColor: string
    warningColor: string
    errorColor: string
    infoColor: string
    // UI settings
    borderRadius: string
    fontFamily: string
    customCSS?: string
    colorScheme: 'light' | 'dark' | 'system'
    // Import/Export
    customThemeJSON?: string
  }

  // SEO & Meta
  seo: {
    title: string
    description: string
    keywords: string[]
    ogImage?: string
    twitterHandle?: string
  }

  // Legal & Compliance
  legal: {
    privacyPolicyUrl?: string
    termsOfServiceUrl?: string
    cookiePolicyUrl?: string
    supportEmail: string
  }

  // Social Links
  social: {
    twitter?: string
    linkedin?: string
    github?: string
    discord?: string
    slack?: string
    website?: string
  }

  // Enterprise Features
  enterprise: {
    // SSO/SAML
    sso: {
      enabled: boolean
      allowedProviders: (
        | 'okta'
        | 'azure-ad'
        | 'google-workspace'
        | 'onelogin'
        | 'auth0'
        | 'ping-identity'
        | 'jumpcloud'
        | 'generic-saml'
      )[]
      enforceSSO: boolean // Require SSO for all logins
      jitProvisioning: boolean
      defaultRole: 'member' | 'moderator' | 'admin'
    }

    // Advanced RBAC
    rbac: {
      customRolesEnabled: boolean
      maxCustomRoles: number
      roleInheritance: boolean
      timeLimitedRoles: boolean
      roleTemplatesEnabled: boolean
    }

    // Audit Logging
    audit: {
      enabled: boolean
      tamperProof: boolean // Enable cryptographic hash chains
      retentionDays: number
      exportFormats: ('json' | 'csv' | 'syslog' | 'cef' | 'leef')[]
      autoVerifyIntegrity: boolean
      verificationSchedule: 'hourly' | 'daily' | 'weekly'
    }

    // Compliance
    compliance: {
      mode: 'none' | 'soc2' | 'gdpr' | 'hipaa' | 'pci-dss' | 'custom'
      requireMFA: boolean
      sessionTimeout: number // minutes
      passwordPolicy: {
        minLength: number
        requireUppercase: boolean
        requireLowercase: boolean
        requireNumbers: boolean
        requireSymbols: boolean
        expiryDays: number
      }
    }

    // Advanced Security
    security: {
      ipWhitelisting: boolean
      allowedIPs?: string[]
      geoBlocking: boolean
      blockedCountries?: string[]
      rateLimiting: boolean
      maxRequestsPerMinute: number
      suspiciousActivityDetection: boolean
    }
  }
}

// Default configuration (before setup)
export const defaultAppConfig: AppConfig = {
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
    appName: 'nChat',
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

  features: {
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
    gifs: true,
    stickers: true,
    messageScheduling: false,
    videoConferencing: false,
    endToEndEncryption: false,
    voiceCalls: true,
    videoCalls: true,
    groupCalls: true,
    screenSharing: true,
    callRecording: false,
    maxCallParticipants: 50,
    // Live Streaming
    liveStreaming: true,
    streamRecording: true,
    streamChat: true,
    streamReactions: true,
    streamScheduling: true,
    maxStreamDuration: 0, // unlimited
  },

  integrations: {
    slack: {
      enabled: false,
      importChannels: false,
      syncMessages: false,
    },
    github: {
      enabled: false,
      notifications: false,
      linkPullRequests: false,
    },
    jira: {
      enabled: false,
      ticketNotifications: false,
    },
    googleDrive: {
      enabled: false,
      fileSharing: false,
    },
    webhooks: {
      enabled: false,
      customEndpoints: [],
    },
  },

  moderation: {
    autoModeration: false,
    profanityFilter: false,
    spamDetection: true,
    requireMessageApproval: false,
    moderatorRoles: ['admin', 'moderator'],
    reportingSystem: true,

    // AI Detection (v0.5.0)
    aiModeration: {
      enabled: true,
      toxicityDetection: true,
      nsfwDetection: true,
      spamDetection: true,
      profanityFilter: true,
    },

    // Detection Thresholds (0-1)
    thresholds: {
      toxic: 0.7,
      nsfw: 0.7,
      spam: 0.6,
      profanity: 0.5,
    },

    // Automated Actions
    autoActions: {
      autoFlag: true,
      autoHide: false,
      autoWarn: false,
      autoMute: false,
    },

    // Custom Word Lists
    customWords: {
      blocked: [],
      allowed: [],
    },
  },

  encryption: {
    enabled: false,
    enforceForPrivateChannels: false,
    enforceForDirectMessages: true,
    allowUnencryptedPublicChannels: true,
    enableSafetyNumbers: true,
    requireDeviceVerification: false,
    automaticKeyRotation: true,
    keyRotationDays: 7,
  },

  theme: {
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
  },

  seo: {
    title: 'nChat - Team Communication Platform',
    description: 'Modern team communication and collaboration platform',
    keywords: ['chat', 'team', 'communication', 'collaboration', 'messaging'],
  },

  legal: {
    supportEmail: 'support@example.com',
  },

  social: {},

  enterprise: {
    sso: {
      enabled: false,
      allowedProviders: [],
      enforceSSO: false,
      jitProvisioning: true,
      defaultRole: 'member',
    },

    rbac: {
      customRolesEnabled: true,
      maxCustomRoles: 50,
      roleInheritance: true,
      timeLimitedRoles: true,
      roleTemplatesEnabled: true,
    },

    audit: {
      enabled: true,
      tamperProof: true,
      retentionDays: 365,
      exportFormats: ['json', 'csv', 'syslog', 'cef'],
      autoVerifyIntegrity: true,
      verificationSchedule: 'daily',
    },

    compliance: {
      mode: 'none',
      requireMFA: false,
      sessionTimeout: 480, // 8 hours
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSymbols: false,
        expiryDays: 0, // Never expire
      },
    },

    security: {
      ipWhitelisting: false,
      geoBlocking: false,
      rateLimiting: true,
      maxRequestsPerMinute: 60,
      suspiciousActivityDetection: true,
    },
  },
}

// Landing Theme Templates
export const landingThemeTemplates = {
  'login-only': {
    name: 'Login Only',
    description: 'Direct to login page, no landing page',
    homepage: { mode: 'redirect', redirectTo: '/auth/signin' },
    features: ['Simple', 'Fast', 'Secure'],
  },
  'simple-landing': {
    name: 'Simple Landing',
    description: 'Basic landing page with hero and CTA buttons',
    homepage: {
      mode: 'landing',
      landingPages: { hero: true, features: true, contact: true },
    },
    features: ['Hero Section', 'Feature List', 'Contact Info'],
  },
  'full-homepage': {
    name: 'Full Homepage',
    description: 'Complete website with navigation, pricing, about',
    homepage: {
      mode: 'landing',
      landingPages: { hero: true, features: true, pricing: true, about: true, contact: true },
    },
    features: ['Full Navigation', 'Pricing Plans', 'About Page', 'Contact Form'],
  },
  corporate: {
    name: 'Corporate',
    description: 'Professional layout for business teams',
    homepage: {
      mode: 'landing',
      landingPages: { hero: true, features: true, about: true },
    },
    features: ['Professional Design', 'Team Features', 'Security Focus'],
  },
  community: {
    name: 'Community',
    description: 'Open community platform with public access',
    homepage: {
      mode: 'landing',
      landingPages: { hero: true, features: true, docs: true, blog: true },
    },
    features: ['Open Source Feel', 'Documentation', 'Blog Integration'],
  },
} as const

// Auth provider descriptions
export const authProviderDescriptions = {
  emailPassword: 'Traditional email and password authentication',
  magicLinks: 'Passwordless login via email links',
  google: 'Sign in with Google accounts',
  facebook: 'Sign in with Facebook accounts',
  twitter: 'Sign in with Twitter/X accounts',
  github: 'Sign in with GitHub accounts',
  discord: 'Sign in with Discord accounts',
  slack: 'Sign in with Slack workspace accounts',
  idme: 'ID.me verification for military, police, and government personnel',
} as const

// Auth permission descriptions
export const authPermissionDescriptions = {
  'allow-all': 'Anyone can join and start chatting immediately',
  'verified-only': 'Only email-verified users can access',
  'idme-roles': 'Only users with verified ID.me roles can join',
  'domain-restricted': 'Only specific email domains are allowed',
  'admin-only': 'Only admins can manually create accounts',
} as const

// Setup step titles - Expanded wizard with environment detection and deployment
export const setupSteps = [
  'Welcome',
  'Environment Detection',
  'Backend Setup',
  'Owner Information',
  'App Branding',
  'Theme & Colors',
  'Landing Page',
  'Authentication Methods',
  'Access Permissions',
  'Features & Integrations',
  'Deployment',
  'Review & Launch',
] as const

// Step phases for grouping in the wizard UI
export const setupPhases = {
  setup: { name: 'Setup', steps: [0, 1, 2], description: 'Environment and backend configuration' },
  customize: {
    name: 'Customize',
    steps: [3, 4, 5, 6, 7, 8, 9],
    description: 'Branding, theme, and features',
  },
  deploy: { name: 'Deploy', steps: [10, 11], description: 'Deployment and launch' },
} as const
