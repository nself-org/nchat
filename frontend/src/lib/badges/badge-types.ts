/**
 * Badge Type Definitions for nself-chat
 *
 * Badges are visual indicators that display user status, roles,
 * verification level, and special recognition.
 */

// Badge categories for organization
export type BadgeCategory =
  | 'role' // User role badges (owner, admin, moderator)
  | 'verification' // Verification status badges (verified, government)
  | 'achievement' // Achievement-based badges (veteran, contributor)
  | 'membership' // Membership tier badges (premium, sponsor)
  | 'status' // Status badges (online, away, busy)
  | 'special' // Special event or limited badges

// Badge priority determines display order (higher = more important)
export type BadgePriority = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10

// Badge visual style
export interface BadgeStyle {
  backgroundColor: string
  textColor: string
  borderColor?: string
  icon?: string
  iconColor?: string
  gradient?: {
    from: string
    to: string
    direction?: string
  }
  animation?: 'pulse' | 'glow' | 'shimmer' | 'none'
}

// Badge definition
export interface Badge {
  id: string
  name: string
  shortName?: string // Abbreviated name for compact display
  description: string
  category: BadgeCategory
  priority: BadgePriority
  style: BadgeStyle
  tooltip?: string
  icon: string
  visible: boolean // Whether badge is visible in lists
  stackable: boolean // Can user have multiple of this badge type
  expiresAt?: Date // Optional expiration
  metadata?: Record<string, unknown>
}

// User badge instance (assigned to a user)
export interface UserBadge extends Badge {
  assignedAt: Date
  assignedBy?: string // User ID who assigned the badge
  reason?: string
  expiresAt?: Date
}

// Core badge definitions
export const BADGE_DEFINITIONS: Record<string, Badge> = {
  // Role badges
  owner: {
    id: 'owner',
    name: 'Owner',
    shortName: 'OWN',
    description: 'Workspace owner with full administrative access',
    category: 'role',
    priority: 10,
    icon: 'crown',
    visible: true,
    stackable: false,
    style: {
      backgroundColor: '#FFD700',
      textColor: '#000000',
      borderColor: '#B8860B',
      iconColor: '#B8860B',
      gradient: {
        from: '#FFD700',
        to: '#FFA500',
        direction: '135deg',
      },
      animation: 'shimmer',
    },
    tooltip: 'This user is the owner of this workspace',
  },

  admin: {
    id: 'admin',
    name: 'Admin',
    shortName: 'ADM',
    description: 'Administrator with elevated privileges',
    category: 'role',
    priority: 9,
    icon: 'shield',
    visible: true,
    stackable: false,
    style: {
      backgroundColor: '#DC2626',
      textColor: '#FFFFFF',
      borderColor: '#B91C1C',
      iconColor: '#FFFFFF',
    },
    tooltip: 'This user is an administrator',
  },

  moderator: {
    id: 'moderator',
    name: 'Moderator',
    shortName: 'MOD',
    description: 'Community moderator who helps maintain order',
    category: 'role',
    priority: 8,
    icon: 'gavel',
    visible: true,
    stackable: false,
    style: {
      backgroundColor: '#7C3AED',
      textColor: '#FFFFFF',
      borderColor: '#6D28D9',
      iconColor: '#FFFFFF',
    },
    tooltip: 'This user is a moderator',
  },

  // Verification badges
  verified: {
    id: 'verified',
    name: 'Verified',
    description: 'User has verified their email address',
    category: 'verification',
    priority: 5,
    icon: 'check-circle',
    visible: true,
    stackable: false,
    style: {
      backgroundColor: '#10B981',
      textColor: '#FFFFFF',
      borderColor: '#059669',
      iconColor: '#FFFFFF',
    },
    tooltip: 'Email verified',
  },

  government: {
    id: 'government',
    name: 'Government',
    shortName: 'GOV',
    description: 'Verified government employee via ID.me',
    category: 'verification',
    priority: 9,
    icon: 'building-columns',
    visible: true,
    stackable: false,
    style: {
      backgroundColor: '#1E40AF',
      textColor: '#FFFFFF',
      borderColor: '#1E3A8A',
      iconColor: '#FFFFFF',
      gradient: {
        from: '#1E40AF',
        to: '#3B82F6',
        direction: '135deg',
      },
    },
    tooltip: 'Verified government employee',
  },

  military: {
    id: 'military',
    name: 'Military',
    shortName: 'MIL',
    description: 'Verified active military member via ID.me',
    category: 'verification',
    priority: 9,
    icon: 'military-dog-tags',
    visible: true,
    stackable: false,
    style: {
      backgroundColor: '#14532D',
      textColor: '#FFFFFF',
      borderColor: '#166534',
      iconColor: '#FFFFFF',
      gradient: {
        from: '#14532D',
        to: '#22C55E',
        direction: '135deg',
      },
    },
    tooltip: 'Verified active military',
  },

  veteran: {
    id: 'veteran',
    name: 'Veteran',
    shortName: 'VET',
    description: 'Verified military veteran via ID.me',
    category: 'verification',
    priority: 9,
    icon: 'medal',
    visible: true,
    stackable: false,
    style: {
      backgroundColor: '#7F1D1D',
      textColor: '#FFFFFF',
      borderColor: '#991B1B',
      iconColor: '#FFD700',
      gradient: {
        from: '#7F1D1D',
        to: '#DC2626',
        direction: '135deg',
      },
    },
    tooltip: 'Verified military veteran',
  },

  firstResponder: {
    id: 'first-responder',
    name: 'First Responder',
    shortName: 'FR',
    description: 'Verified first responder via ID.me',
    category: 'verification',
    priority: 8,
    icon: 'ambulance',
    visible: true,
    stackable: false,
    style: {
      backgroundColor: '#EA580C',
      textColor: '#FFFFFF',
      borderColor: '#C2410C',
      iconColor: '#FFFFFF',
    },
    tooltip: 'Verified first responder',
  },

  nurse: {
    id: 'nurse',
    name: 'Healthcare',
    shortName: 'HC',
    description: 'Verified healthcare worker via ID.me',
    category: 'verification',
    priority: 8,
    icon: 'stethoscope',
    visible: true,
    stackable: false,
    style: {
      backgroundColor: '#0891B2',
      textColor: '#FFFFFF',
      borderColor: '#0E7490',
      iconColor: '#FFFFFF',
    },
    tooltip: 'Verified healthcare worker',
  },

  teacher: {
    id: 'teacher',
    name: 'Educator',
    shortName: 'EDU',
    description: 'Verified teacher/educator via ID.me',
    category: 'verification',
    priority: 7,
    icon: 'graduation-cap',
    visible: true,
    stackable: false,
    style: {
      backgroundColor: '#4F46E5',
      textColor: '#FFFFFF',
      borderColor: '#4338CA',
      iconColor: '#FFFFFF',
    },
    tooltip: 'Verified educator',
  },

  student: {
    id: 'student',
    name: 'Student',
    shortName: 'STU',
    description: 'Verified student via ID.me',
    category: 'verification',
    priority: 6,
    icon: 'book-open',
    visible: true,
    stackable: false,
    style: {
      backgroundColor: '#7C3AED',
      textColor: '#FFFFFF',
      borderColor: '#6D28D9',
      iconColor: '#FFFFFF',
    },
    tooltip: 'Verified student',
  },

  // Achievement badges
  earlyAdopter: {
    id: 'early-adopter',
    name: 'Early Adopter',
    description: 'Joined during the early access period',
    category: 'achievement',
    priority: 4,
    icon: 'rocket',
    visible: true,
    stackable: false,
    style: {
      backgroundColor: '#8B5CF6',
      textColor: '#FFFFFF',
      borderColor: '#7C3AED',
      iconColor: '#FFFFFF',
      animation: 'glow',
    },
    tooltip: 'Early adopter of the platform',
  },

  contributor: {
    id: 'contributor',
    name: 'Contributor',
    description: 'Active contributor to the community',
    category: 'achievement',
    priority: 5,
    icon: 'heart',
    visible: true,
    stackable: false,
    style: {
      backgroundColor: '#EC4899',
      textColor: '#FFFFFF',
      borderColor: '#DB2777',
      iconColor: '#FFFFFF',
    },
    tooltip: 'Community contributor',
  },

  topContributor: {
    id: 'top-contributor',
    name: 'Top Contributor',
    description: 'One of the most active community members',
    category: 'achievement',
    priority: 6,
    icon: 'star',
    visible: true,
    stackable: false,
    style: {
      backgroundColor: '#F59E0B',
      textColor: '#000000',
      borderColor: '#D97706',
      iconColor: '#000000',
      animation: 'shimmer',
    },
    tooltip: 'Top community contributor',
  },

  // Membership badges
  premium: {
    id: 'premium',
    name: 'Premium',
    shortName: 'PRO',
    description: 'Premium subscription member',
    category: 'membership',
    priority: 6,
    icon: 'gem',
    visible: true,
    stackable: false,
    style: {
      backgroundColor: '#0EA5E9',
      textColor: '#FFFFFF',
      borderColor: '#0284C7',
      iconColor: '#FFFFFF',
      gradient: {
        from: '#0EA5E9',
        to: '#6366F1',
        direction: '135deg',
      },
      animation: 'glow',
    },
    tooltip: 'Premium member',
  },

  sponsor: {
    id: 'sponsor',
    name: 'Sponsor',
    description: 'Financial supporter of the platform',
    category: 'membership',
    priority: 7,
    icon: 'hand-holding-heart',
    visible: true,
    stackable: false,
    style: {
      backgroundColor: '#EC4899',
      textColor: '#FFFFFF',
      borderColor: '#DB2777',
      iconColor: '#FFFFFF',
      gradient: {
        from: '#EC4899',
        to: '#8B5CF6',
        direction: '135deg',
      },
      animation: 'pulse',
    },
    tooltip: 'Platform sponsor',
  },

  // Status badges (usually shown inline, not as badges)
  bot: {
    id: 'bot',
    name: 'Bot',
    description: 'Automated bot account',
    category: 'status',
    priority: 3,
    icon: 'robot',
    visible: true,
    stackable: false,
    style: {
      backgroundColor: '#6B7280',
      textColor: '#FFFFFF',
      borderColor: '#4B5563',
      iconColor: '#FFFFFF',
    },
    tooltip: 'This is a bot',
  },

  // Special badges
  staff: {
    id: 'staff',
    name: 'Staff',
    description: 'Official platform staff member',
    category: 'special',
    priority: 10,
    icon: 'badge-check',
    visible: true,
    stackable: false,
    style: {
      backgroundColor: '#38BDF8',
      textColor: '#0F0F1A',
      borderColor: '#0EA5E9',
      iconColor: '#0F0F1A',
      gradient: {
        from: '#38BDF8',
        to: '#0EA5E9',
        direction: '135deg',
      },
      animation: 'shimmer',
    },
    tooltip: 'Official staff member',
  },

  developer: {
    id: 'developer',
    name: 'Developer',
    shortName: 'DEV',
    description: 'Platform developer',
    category: 'special',
    priority: 9,
    icon: 'code',
    visible: true,
    stackable: false,
    style: {
      backgroundColor: '#10B981',
      textColor: '#FFFFFF',
      borderColor: '#059669',
      iconColor: '#FFFFFF',
    },
    tooltip: 'Platform developer',
  },
}

// Badge IDs as a union type
export type BadgeId = keyof typeof BADGE_DEFINITIONS

// Get badge by ID
export function getBadge(id: string): Badge | undefined {
  return BADGE_DEFINITIONS[id]
}

// Get badges by category
export function getBadgesByCategory(category: BadgeCategory): Badge[] {
  return Object.values(BADGE_DEFINITIONS).filter((b) => b.category === category)
}

// Get badges sorted by priority
export function getBadgesSortedByPriority(badges: Badge[]): Badge[] {
  return [...badges].sort((a, b) => b.priority - a.priority)
}

// Role to badge mapping
export const roleToBadge: Record<string, BadgeId> = {
  owner: 'owner',
  admin: 'admin',
  moderator: 'moderator',
}

// ID.me group to badge mapping
export const idmeGroupToBadge: Record<string, BadgeId> = {
  military: 'military',
  veteran: 'veteran',
  'military-family': 'military',
  'first-responder': 'firstResponder',
  nurse: 'nurse',
  hospital: 'nurse',
  government: 'government',
  teacher: 'teacher',
  student: 'student',
}

export default BADGE_DEFINITIONS
