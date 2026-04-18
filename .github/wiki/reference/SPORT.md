# SPORT - Single Point of Reference/Truth

> **nself-chat (nchat)** - White-Label Team Communication Platform
>
> Version: 1.0.9 | Last Updated: April 18, 2026

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Feature Reference](#feature-reference)
4. [Authentication System](#authentication-system)
5. [Theme System](#theme-system)
6. [AppConfig Interface](#appconfig-interface)
7. [Component Inventory](#component-inventory)
8. [Hooks Inventory](#hooks-inventory)
9. [Contexts & Providers](#contexts--providers)
10. [API Routes](#api-routes)
11. [GraphQL Operations](#graphql-operations)
12. [Database Overview](#database-overview)
13. [Real-Time Architecture](#real-time-architecture)
14. [White-Label Customization](#white-label-customization)
15. [Platform Builds](#platform-builds)
16. [Internationalization](#internationalization)
17. [Bot System](#bot-system)

---

## Project Overview

### Identity

| Attribute        | Value                                                                 |
| ---------------- | --------------------------------------------------------------------- |
| **Full Name**    | nself-chat                                                            |
| **Short Name**   | nchat                                                                 |
| **Package Name** | nself-chat                                                            |
| **Description**  | Slack-like team chat with Telegram features, white-label customizable |
| **Type**         | Demo project showcasing nself CLI stack                               |
| **License**      | MIT                                                                   |

### Project Purpose

nself-chat serves as:

1. A production-ready team communication platform
2. A demonstration of the nself CLI backend infrastructure (v1.0.9)
3. A white-label solution that can be customized for any organization
4. A reference implementation for building apps on the nself stack

### Key Design Principles

1. **Config-First**: All behavior controlled via AppConfig for white-label flexibility
2. **Dual Auth**: FauxAuthService (dev) + NhostAuthService (prod)
3. **LocalStorage First**: Config loads locally, syncs to database async
4. **Progressive Setup**: New users guided through 9-step wizard
5. **GraphQL-First**: All data access through Hasura (no REST for data)
6. **Template System**: Multiple UI templates (default, slack, discord, telegram, whatsapp)

---

## Technology Stack

### Frontend Core

| Technology   | Version | Purpose                         |
| ------------ | ------- | ------------------------------- |
| Next.js      | 15.x    | React framework with App Router |
| React        | 19.x    | UI library                      |
| TypeScript   | 5.x     | Type safety                     |
| Tailwind CSS | 3.4.x   | Utility-first CSS               |

### State Management

| Technology    | Purpose                |
| ------------- | ---------------------- |
| Zustand       | Global state stores    |
| Apollo Client | GraphQL state & cache  |
| React Context | Auth, Theme, AppConfig |

### UI Components

| Library         | Purpose                                |
| --------------- | -------------------------------------- |
| Radix UI        | Accessible primitives (20+ components) |
| TipTap          | Rich text editor                       |
| Framer Motion   | Animations                             |
| cmdk            | Command palette                        |
| react-hot-toast | Toast notifications                    |
| react-dropzone  | File uploads                           |
| lowlight        | Syntax highlighting                    |

### Backend (via nself CLI v0.4.2)

| Service     | Port      | Purpose                           |
| ----------- | --------- | --------------------------------- |
| PostgreSQL  | 5432      | Primary database (60+ extensions) |
| Hasura      | 8080      | GraphQL Engine                    |
| Nhost Auth  | 4000      | Authentication service            |
| Nginx       | 80/443    | Reverse proxy + SSL               |
| MinIO       | 9000/9001 | S3-compatible storage             |
| Redis       | 6379      | Cache/sessions                    |
| MeiliSearch | 7700      | Full-text search                  |

### Real-Time

| Technology            | Purpose                      |
| --------------------- | ---------------------------- |
| GraphQL Subscriptions | Live data updates via Hasura |
| Socket.io             | Presence, typing indicators  |

### Testing

| Tool                  | Purpose           |
| --------------------- | ----------------- |
| Jest                  | Unit testing      |
| React Testing Library | Component testing |
| Playwright            | E2E testing       |

---

## Feature Reference

### Total Feature Count: 78+ Configurable Features

### Core Messaging Features (14)

| Feature            | Config Key                             | Default | Status          |
| ------------------ | -------------------------------------- | ------- | --------------- |
| Public Channels    | `features.publicChannels`              | true    | Implemented     |
| Private Channels   | `features.privateChannels`             | true    | Implemented     |
| Direct Messages    | `features.directMessages`              | true    | Implemented     |
| Group DMs          | `NEXT_PUBLIC_FEATURE_GROUP_DMS`        | true    | Implemented     |
| Threaded Replies   | `features.threads`                     | true    | Partial         |
| Message Reactions  | `features.reactions`                   | true    | Partial         |
| User @Mentions     | `NEXT_PUBLIC_FEATURE_MENTIONS`         | true    | Implemented     |
| Channel #Mentions  | `NEXT_PUBLIC_FEATURE_CHANNEL_MENTIONS` | true    | Implemented     |
| Message Editing    | UI Only                                | true    | Implemented     |
| Message Deleting   | UI Only                                | true    | Implemented     |
| Pinned Messages    | `NEXT_PUBLIC_FEATURE_MESSAGE_PINS`     | true    | Partial         |
| Message Bookmarks  | `NEXT_PUBLIC_FEATURE_BOOKMARKS`        | true    | Partial         |
| Message Scheduling | `features.messageScheduling`           | false   | Not Implemented |
| Voice Messages     | `features.voiceMessages`               | false   | Not Implemented |

### Rich Content Features (10)

| Feature          | Config Key                          | Default | Status          |
| ---------------- | ----------------------------------- | ------- | --------------- |
| File Uploads     | `features.fileUploads`              | true    | Implemented     |
| Code Blocks      | `NEXT_PUBLIC_FEATURE_CODE_BLOCKS`   | true    | Implemented     |
| Markdown Support | `NEXT_PUBLIC_FEATURE_MARKDOWN`      | true    | Implemented     |
| Link Previews    | `NEXT_PUBLIC_FEATURE_LINK_PREVIEWS` | true    | Partial         |
| Custom Emojis    | `features.customEmojis`             | false   | Not Implemented |
| GIF Picker       | `NEXT_PUBLIC_FEATURE_GIF_PICKER`    | true    | Implemented     |
| Video Calls      | `NEXT_PUBLIC_FEATURE_VIDEO_CALLS`   | false   | Not Implemented |
| Screen Sharing   | `NEXT_PUBLIC_FEATURE_SCREEN_SHARE`  | false   | Not Implemented |
| Stickers         | Component exists                    | false   | Partial         |
| Polls            | Component exists                    | false   | Partial         |

### Organization Features (10)

| Feature            | Config Key                              | Default | Status      |
| ------------------ | --------------------------------------- | ------- | ----------- |
| Message Search     | `features.search`                       | true    | Implemented |
| User Presence      | `NEXT_PUBLIC_FEATURE_USER_PRESENCE`     | true    | Implemented |
| Typing Indicators  | `NEXT_PUBLIC_FEATURE_TYPING_INDICATORS` | true    | Implemented |
| Read Receipts      | `NEXT_PUBLIC_FEATURE_READ_RECEIPTS`     | true    | Partial     |
| Channel Categories | `features.channelCategories`            | false   | Partial     |
| User Directory     | UI Only                                 | true    | Implemented |
| User Profiles      | UI Only                                 | true    | Implemented |
| Unread Indicators  | UI Only                                 | true    | Implemented |
| Saved Messages     | UI Only                                 | true    | Partial     |
| User Status        | UI Only                                 | true    | Implemented |

### User Management Features (6)

| Feature         | Config Key             | Default | Status      |
| --------------- | ---------------------- | ------- | ----------- |
| Guest Access    | `features.guestAccess` | false   | Partial     |
| Invite Links    | `features.inviteLinks` | true    | Implemented |
| Role Management | Database + UI          | true    | Implemented |
| User Banning    | Admin UI               | true    | Partial     |
| User Blocking   | UI Only                | true    | Partial     |
| Data Export     | Admin UI               | true    | Partial     |

### Integration Features (10)

| Feature             | Config Key                           | Default | Status          |
| ------------------- | ------------------------------------ | ------- | --------------- |
| Slack Integration   | `integrations.slack.enabled`         | false   | Not Implemented |
| GitHub Integration  | `integrations.github.enabled`        | false   | Not Implemented |
| Jira Integration    | `integrations.jira.enabled`          | false   | Not Implemented |
| Google Drive        | `integrations.googleDrive.enabled`   | false   | Not Implemented |
| Webhooks (Incoming) | `integrations.webhooks.enabled`      | false   | Partial         |
| Webhooks (Outgoing) | `integrations.webhooks.enabled`      | false   | Partial         |
| Slash Commands      | `NEXT_PUBLIC_FEATURE_SLASH_COMMANDS` | true    | Partial         |
| Bots                | `NEXT_PUBLIC_FEATURE_BOTS`           | true    | Implemented     |
| API Access          | Always on                            | true    | Implemented     |
| App Directory       | UI exists                            | false   | Partial         |

### Moderation Features (10)

| Feature            | Config Key                          | Default | Status          |
| ------------------ | ----------------------------------- | ------- | --------------- |
| Auto Moderation    | `moderation.autoModeration`         | false   | Not Implemented |
| Profanity Filter   | `moderation.profanityFilter`        | false   | Not Implemented |
| Spam Detection     | `moderation.spamDetection`          | true    | Not Implemented |
| Content Reporting  | `moderation.reportingSystem`        | true    | Partial         |
| Message Approval   | `moderation.requireMessageApproval` | false   | Not Implemented |
| Audit Logs         | `NEXT_PUBLIC_FEATURE_AUDIT_LOGS`    | true    | Implemented     |
| User Moderation    | Admin UI                            | true    | Partial         |
| Channel Moderation | Admin UI                            | true    | Partial         |
| Compliance Reports | Admin UI                            | true    | Partial         |
| Data Retention     | Admin UI                            | true    | Partial         |

### Advanced Features (8)

| Feature               | Config Key                   | Default | Status          |
| --------------------- | ---------------------------- | ------- | --------------- |
| Video Conferencing    | `features.videoConferencing` | false   | Not Implemented |
| Meetings              | UI exists                    | false   | Partial         |
| Workflows             | UI exists                    | false   | Partial         |
| Reminders             | Bot exists                   | false   | Partial         |
| Disappearing Messages | UI exists                    | false   | Partial         |
| Location Sharing      | UI exists                    | false   | Not Implemented |
| PWA Support           | Always on                    | true    | Implemented     |
| Desktop Apps          | platforms/                   | true    | Partial         |

---

## Authentication System

### Authentication Methods (11 Total)

#### Basic Authentication (2)

| Method         | Config Key                    | Status      |
| -------------- | ----------------------------- | ----------- |
| Email/Password | `authProviders.emailPassword` | Implemented |
| Magic Links    | `authProviders.magicLinks`    | Partial     |

#### Social OAuth Providers (8)

| Provider  | Config Key                   | Status          |
| --------- | ---------------------------- | --------------- |
| Google    | `authProviders.google`       | Partial         |
| Facebook  | `authProviders.facebook`     | Not Implemented |
| Twitter/X | `authProviders.twitter`      | Not Implemented |
| GitHub    | `authProviders.github`       | Partial         |
| Discord   | `authProviders.discord`      | Not Implemented |
| Slack     | `authProviders.slack`        | Not Implemented |
| Microsoft | `NEXT_PUBLIC_AUTH_MICROSOFT` | Not Implemented |
| Apple     | `NEXT_PUBLIC_AUTH_APPLE`     | Not Implemented |

#### Special Authentication (1)

| Provider | Config Key                   | Status  |
| -------- | ---------------------------- | ------- |
| ID.me    | `authProviders.idme.enabled` | Partial |

ID.me sub-options:

- `allowMilitary`: Military personnel verification
- `allowPolice`: Law enforcement verification
- `allowFirstResponders`: First responder verification
- `allowGovernment`: Government employee verification
- `requireVerification`: Require ID.me verification for access

### Access Permission Modes (5)

| Mode              | Config Key                                  | Description                  |
| ----------------- | ------------------------------------------- | ---------------------------- |
| Allow All         | `authPermissions.mode: 'allow-all'`         | Open registration            |
| Verified Only     | `authPermissions.mode: 'verified-only'`     | Email verification required  |
| ID.me Roles       | `authPermissions.mode: 'idme-roles'`        | Specific verified roles only |
| Domain Restricted | `authPermissions.mode: 'domain-restricted'` | Specific email domains       |
| Admin Only        | `authPermissions.mode: 'admin-only'`        | Manual approval required     |

### User Roles (5)

| Role        | Level | Description                     |
| ----------- | ----- | ------------------------------- |
| `owner`     | 0     | System owner, cannot be changed |
| `admin`     | 1     | Full administrative access      |
| `moderator` | 2     | Content moderation              |
| `member`    | 3     | Standard user                   |
| `guest`     | 4     | Limited read-only access        |

### Dev Mode Test Users (8)

Located in `/src/config/auth.config.ts`:

| Email               | Role      | ID                                   |
| ------------------- | --------- | ------------------------------------ |
| owner@nself.org     | owner     | b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11 |
| admin@nself.org     | admin     | b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12 |
| moderator@nself.org | moderator | b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13 |
| member@nself.org    | member    | b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14 |
| guest@nself.org     | guest     | b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15 |
| alice@nself.org     | member    | b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16 |
| bob@nself.org       | member    | b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17 |
| charlie@nself.org   | member    | b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a18 |

**Password for all dev users**: `password123`

### Auth Service Architecture

```
src/services/auth/
├── faux-auth.service.ts      # Dev mode (test users, localStorage)
├── nhost-auth.service.ts     # Production (Nhost Auth)
├── database-auth.service.ts  # Direct database auth
├── real-auth.service.ts      # Real auth wrapper
└── providers/                # OAuth provider configs
```

---

## Theme System

### Theme Presets (25 Total)

Located in `/src/lib/theme-presets.ts`:

#### Brand Themes (6)

| Preset     | Description                               | Primary Color |
| ---------- | ----------------------------------------- | ------------- |
| `nself`    | Default nself theme with Protocol styling | #00D4FF       |
| `slack`    | Slack's 2024 design system                | #4A154B       |
| `discord`  | Discord's current design                  | #5865F2       |
| `ocean`    | Deep ocean blues and teals                | #0891B2       |
| `sunset`   | Warm oranges, reds, purples               | #F97316       |
| `midnight` | Deep purples and indigos                  | #6366F1       |

#### Tailwind Color Themes (19)

| Preset    | Primary Color (Light) |
| --------- | --------------------- |
| `slate`   | #64748B               |
| `gray`    | #6B7280               |
| `zinc`    | #71717A               |
| `stone`   | #78716C               |
| `red`     | #EF4444               |
| `orange`  | #F97316               |
| `amber`   | #F59E0B               |
| `yellow`  | #EAB308               |
| `lime`    | #84CC16               |
| `green`   | #22C55E               |
| `emerald` | #10B981               |
| `teal`    | #14B8A6               |
| `cyan`    | #06B6D4               |
| `sky`     | #0EA5E9               |
| `blue`    | #3B82F6               |
| `indigo`  | #6366F1               |
| `violet`  | #8B5CF6               |
| `purple`  | #A855F7               |
| `fuchsia` | #D946EF               |
| `pink`    | #EC4899               |
| `rose`    | #F43F5E               |

### Theme Color Properties (16)

Each theme preset contains both light and dark mode variants with these colors:

| Property              | Purpose                     |
| --------------------- | --------------------------- |
| `primaryColor`        | Main brand color            |
| `secondaryColor`      | Secondary brand color       |
| `accentColor`         | Accent/highlight color      |
| `backgroundColor`     | Main background             |
| `surfaceColor`        | Card/panel background       |
| `textColor`           | Primary text                |
| `mutedColor`          | Secondary text              |
| `borderColor`         | Border colors               |
| `buttonPrimaryBg`     | Primary button background   |
| `buttonPrimaryText`   | Primary button text         |
| `buttonSecondaryBg`   | Secondary button background |
| `buttonSecondaryText` | Secondary button text       |
| `successColor`        | Success state               |
| `warningColor`        | Warning state               |
| `errorColor`          | Error state                 |
| `infoColor`           | Info state                  |

### Landing Theme Templates (5)

| Template         | Description                      |
| ---------------- | -------------------------------- |
| `login-only`     | Direct to login page, no landing |
| `simple-landing` | Basic landing with hero and CTA  |
| `full-homepage`  | Complete marketing site          |
| `corporate`      | Professional business layout     |
| `community`      | Open community platform feel     |

---

## AppConfig Interface

Located in `/src/config/app-config.ts` (419 lines)

### Complete Interface Structure

```typescript
interface AppConfig {
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
    logoScale?: number // 0.5 to 2.0, default 1.0
  }

  // Landing Theme
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
    messageScheduling: boolean
    videoConferencing: boolean
  }

  // Integrations
  integrations: {
    slack: { enabled: boolean; importChannels: boolean; syncMessages: boolean }
    github: { enabled: boolean; notifications: boolean; linkPullRequests: boolean }
    jira: { enabled: boolean; ticketNotifications: boolean }
    googleDrive: { enabled: boolean; fileSharing: boolean }
    webhooks: { enabled: boolean; customEndpoints: string[] }
  }

  // Moderation & Safety
  moderation: {
    autoModeration: boolean
    profanityFilter: boolean
    spamDetection: boolean
    requireMessageApproval: boolean
    moderatorRoles: string[]
    reportingSystem: boolean
  }

  // Theme & Customization
  theme: {
    preset?: string
    primaryColor: string
    secondaryColor: string
    accentColor: string
    backgroundColor: string
    surfaceColor: string
    textColor: string
    mutedColor: string
    borderColor: string
    buttonPrimaryBg: string
    buttonPrimaryText: string
    buttonSecondaryBg: string
    buttonSecondaryText: string
    successColor: string
    warningColor: string
    errorColor: string
    infoColor: string
    borderRadius: string
    fontFamily: string
    customCSS?: string
    colorScheme: 'light' | 'dark' | 'system'
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
}
```

### Setup Wizard Steps (9)

Located in `/src/components/setup/steps/`:

| Step | File                          | Description         |
| ---- | ----------------------------- | ------------------- |
| 0    | `welcome-step.tsx`            | Introduction        |
| 1    | `owner-info-step.tsx`         | Owner details       |
| 2    | `branding-step.tsx`           | App branding        |
| 3    | `theme-step.tsx`              | Theme & colors      |
| 4    | `landing-page-step.tsx`       | Landing page config |
| 5    | `auth-methods-step.tsx`       | Auth providers      |
| 6    | `access-permissions-step.tsx` | Access control      |
| 7    | `features-step.tsx`           | Feature toggles     |
| 8    | `review-step.tsx`             | Review & confirm    |

---

## Component Inventory

### Total: 89 Component Directories

### UI Components (24)

Location: `/src/components/ui/`

| Component     | File                 | Based On     |
| ------------- | -------------------- | ------------ |
| Alert         | `alert.tsx`          | Radix        |
| AlertDialog   | `alert-dialog.tsx`   | Radix        |
| Avatar        | `avatar.tsx`         | Radix        |
| Badge         | `badge.tsx`          | Custom       |
| Button        | `button.tsx`         | Custom + CVA |
| Card          | `card.tsx`           | Custom       |
| Dialog        | `dialog.tsx`         | Radix        |
| DropdownMenu  | `dropdown-menu.tsx`  | Radix        |
| EnhancedInput | `enhanced-input.tsx` | Custom       |
| Input         | `input.tsx`          | Custom       |
| Label         | `label.tsx`          | Radix        |
| Popover       | `popover.tsx`        | Radix        |
| Progress      | `progress.tsx`       | Radix        |
| RadioGroup    | `radio-group.tsx`    | Radix        |
| ScrollArea    | `scroll-area.tsx`    | Radix        |
| Select        | `select.tsx`         | Radix        |
| Separator     | `separator.tsx`      | Radix        |
| Skeleton      | `skeleton.tsx`       | Custom       |
| Switch        | `switch.tsx`         | Radix        |
| Tabs          | `tabs.tsx`           | Radix        |
| Textarea      | `textarea.tsx`       | Custom       |
| Tooltip       | `tooltip.tsx`        | Radix        |

### Layout Components (5)

Location: `/src/components/layout/`

- `header.tsx` - App header
- `sidebar.tsx` - Main sidebar
- `chat-layout.tsx` - Chat container

### Chat Components (10+)

Location: `/src/components/chat/`

- `message-skeleton.tsx` - Loading state
- `message-empty.tsx` - Empty state
- `message-system.tsx` - System messages
- `message-reactions.tsx` - Reaction display
- `message-thread-preview.tsx` - Thread preview
- `typing-indicator.tsx` - Typing indicator

### Channel Components (6)

Location: `/src/components/channel/`

- `channel-item.tsx` - Channel list item
- `channel-category.tsx` - Category wrapper
- `channel-list.tsx` - Channel listing
- `channel-header.tsx` - Channel header
- `channel-info-panel.tsx` - Info sidebar

### User Components (6)

Location: `/src/components/user/`

- `user-avatar.tsx` - Avatar component
- `user-presence-dot.tsx` - Online indicator
- `user-status.tsx` - Status display
- `user-profile-card.tsx` - Profile card
- `user-profile-modal.tsx` - Profile modal
- `role-badge.tsx` - Role indicator

### Admin Components (10+)

Location: `/src/components/admin/`

- `admin-nav.tsx` - Admin navigation
- `users-management.tsx` - User admin
- `channels-management.tsx` - Channel admin
- `settings-management.tsx` - Settings admin
- `roles/` - Role management components

### Other Major Component Groups

| Directory                    | Count | Purpose             |
| ---------------------------- | ----- | ------------------- |
| `/components/setup/`         | 12+   | Setup wizard        |
| `/components/landing/`       | 6     | Landing page        |
| `/components/search/`        | 4+    | Search UI           |
| `/components/notifications/` | 5+    | Notifications       |
| `/components/settings/`      | 8+    | User settings       |
| `/components/emoji/`         | 4+    | Emoji picker        |
| `/components/files/`         | 4+    | File handling       |
| `/components/editor/`        | 4+    | Rich text editor    |
| `/components/modals/`        | 3+    | Modal dialogs       |
| `/components/thread/`        | 3+    | Thread view         |
| `/components/dm/`            | 4+    | Direct messages     |
| `/components/analytics/`     | 10+   | Analytics dashboard |
| `/components/audit/`         | 3+    | Audit logs          |
| `/components/bots/`          | 4+    | Bot management      |
| `/components/webhooks/`      | 3+    | Webhook config      |
| `/components/compliance/`    | 4+    | Compliance tools    |
| `/components/polls/`         | 3+    | Poll creation       |
| `/components/stickers/`      | 3+    | Sticker picker      |
| `/components/voice/`         | 3+    | Voice messages      |
| `/components/meetings/`      | 4+    | Video meetings      |
| `/components/workflows/`     | 4+    | Workflow builder    |

---

## Hooks Inventory

### Total: 76 Custom Hooks

Location: `/src/hooks/`

### Core Hooks (18)

| Hook                    | File                           | Purpose                |
| ----------------------- | ------------------------------ | ---------------------- |
| useChannels             | `use-channels.ts`              | Channel operations     |
| useMessages             | `use-messages.ts`              | Message operations     |
| useThread               | `use-thread.ts`                | Thread operations      |
| useNotifications        | `use-notifications.ts`         | Notification handling  |
| useUnreadCounts         | `use-unread-counts.ts`         | Unread message counts  |
| useToast                | `use-toast.tsx`                | Toast notifications    |
| useRole                 | `use-role.ts`                  | User role access       |
| usePermissions          | `use-permissions.ts`           | Permission checking    |
| useDemo                 | `use-demo.ts`                  | Demo mode utilities    |
| useChatInit             | `use-chat-init.ts`             | Chat initialization    |
| useChannelInit          | `use-channel-init.ts`          | Channel initialization |
| useAppInit              | `use-app-init.tsx`             | App initialization     |
| usePwa                  | `use-pwa.ts`                   | PWA utilities          |
| useDisappearingMessages | `use-disappearing-messages.ts` | Ephemeral messages     |

### Utility Hooks (12)

| Hook                    | Purpose                 |
| ----------------------- | ----------------------- |
| useMediaQuery           | Responsive breakpoints  |
| useDebounce             | Debounced values        |
| useLocalStorage         | localStorage sync       |
| useClickOutside         | Outside click detection |
| useScrollPosition       | Scroll tracking         |
| useIntersectionObserver | Viewport visibility     |
| useClipboard            | Clipboard operations    |
| useOnlineStatus         | Network status          |
| useWindowFocus          | Window focus state      |
| usePrevious             | Previous value tracking |
| useMounted              | Mount state             |
| useHotkey               | Keyboard shortcuts      |

### Keyboard Shortcut Hooks (4)

| Hook                | Purpose                    |
| ------------------- | -------------------------- |
| useGlobalShortcuts  | Global keyboard shortcuts  |
| useMessageShortcuts | Message-specific shortcuts |
| useEditorShortcuts  | Editor shortcuts           |
| useHotkey           | Single hotkey binding      |

### GraphQL Hooks (7)

Location: `/src/hooks/graphql/`

| Hook             | Purpose                      |
| ---------------- | ---------------------------- |
| useChannels      | GraphQL channel queries      |
| useMessages      | GraphQL message queries      |
| useThreads       | GraphQL thread queries       |
| useReactions     | GraphQL reaction mutations   |
| useUsers         | GraphQL user queries         |
| useSearch        | GraphQL search queries       |
| useNotifications | GraphQL notification queries |

### Feature Hooks (20+)

| Hook                   | Purpose                 |
| ---------------------- | ----------------------- |
| useDraft               | Message drafts          |
| useDrafts              | All drafts management   |
| useAutosave            | Auto-save functionality |
| useConnectionStatus    | Connection state        |
| useOfflineQueue        | Offline message queue   |
| useOfflineCache        | Offline data cache      |
| useMediaGallery        | Media gallery state     |
| useMediaViewer         | Media viewer state      |
| useCommandPalette      | Command palette state   |
| useQuickSwitch         | Quick switcher          |
| useLinkPreview         | URL unfurling           |
| useUnfurl              | Link unfurling          |
| useEditHistory         | Message edit history    |
| useMessageVersions     | Message versions        |
| useActivity            | Activity tracking       |
| useActivityFeed        | Activity feed           |
| useUnreadActivity      | Unread activity         |
| useEmojiAutocomplete   | Emoji suggestions       |
| useEmojiSearch         | Emoji search            |
| useRecentEmojis        | Recent emoji tracking   |
| useMentionAutocomplete | @mention suggestions    |
| useUnreadMentions      | Unread mention tracking |

### Onboarding Hooks (3)

| Hook                | Purpose            |
| ------------------- | ------------------ |
| useOnboarding       | Onboarding state   |
| useTour             | Product tour       |
| useFeatureDiscovery | Feature highlights |

### Desktop App Hooks (10)

| Hook                     | Purpose               |
| ------------------------ | --------------------- |
| useTauri                 | Tauri desktop APIs    |
| useElectron              | Electron desktop APIs |
| useElectronWindow        | Window management     |
| useElectronMenu          | Native menus          |
| useElectronStore         | Persistent storage    |
| useElectronNotifications | Native notifications  |
| useElectronUpdater       | Auto-updates          |
| useNativeMenu            | Native menu bar       |
| useSystemTray            | System tray           |
| useNativeNotifications   | Native notifications  |

### Meetings Hooks (2)

| Hook        | Purpose            |
| ----------- | ------------------ |
| useMeetings | Meeting scheduling |
| useHuddle   | Quick huddles      |

---

## Contexts & Providers

### React Contexts (5)

Location: `/src/contexts/`

| Context          | File                     | Purpose              |
| ---------------- | ------------------------ | -------------------- |
| AuthContext      | `auth-context.tsx`       | Authentication state |
| AppConfigContext | `app-config-context.tsx` | App configuration    |
| ThemeContext     | `theme-context.tsx`      | Theme state          |

### Providers (4)

Location: `/src/providers/`

| Provider       | File                  | Purpose               |
| -------------- | --------------------- | --------------------- |
| NhostProvider  | `nhost-provider.tsx`  | Nhost client          |
| ApolloProvider | `apollo-provider.tsx` | Apollo GraphQL client |

### Provider Stack (Root Layout)

```
NhostProvider
  -> AppConfigProvider
    -> ThemeProvider
      -> ApolloProvider
        -> AuthProvider
          -> {children}
```

---

## API Routes

Location: `/src/app/api/`

### Authentication Routes

| Route              | Method | Purpose           |
| ------------------ | ------ | ----------------- |
| `/api/auth/signin` | POST   | User sign in      |
| `/api/auth/signup` | POST   | User registration |

### Configuration Routes

| Route         | Method | Purpose         |
| ------------- | ------ | --------------- |
| `/api/config` | GET    | Fetch AppConfig |
| `/api/config` | POST   | Save AppConfig  |

### Utility Routes

| Route          | Method | Purpose            |
| -------------- | ------ | ------------------ |
| `/api/health`  | GET    | Health check       |
| `/api/ready`   | GET    | Readiness check    |
| `/api/metrics` | GET    | Prometheus metrics |

### Content Routes

| Route                  | Method | Purpose               |
| ---------------------- | ------ | --------------------- |
| `/api/search`          | GET    | Search messages/files |
| `/api/upload`          | POST   | File upload           |
| `/api/upload/complete` | POST   | Finalize upload       |
| `/api/gif`             | GET    | GIF search            |
| `/api/unfurl`          | GET    | URL unfurling         |
| `/api/save-svg`        | POST   | SVG generation        |

### Webhook Routes

| Route               | Method  | Purpose          |
| ------------------- | ------- | ---------------- |
| `/api/webhook`      | POST    | Incoming webhook |
| `/api/webhook/[id]` | Various | Specific webhook |

### Export/Import Routes

| Route         | Method | Purpose     |
| ------------- | ------ | ----------- |
| `/api/export` | GET    | Data export |
| `/api/import` | POST   | Data import |

### Compliance Routes

| Route                    | Method | Purpose       |
| ------------------------ | ------ | ------------- |
| `/api/compliance/export` | GET    | GDPR export   |
| `/api/compliance/delete` | DELETE | GDPR deletion |

### Audit Routes

| Route               | Method | Purpose          |
| ------------------- | ------ | ---------------- |
| `/api/audit/export` | GET    | Audit log export |

---

## GraphQL Operations

Location: `/src/graphql/`

### Query Files

| Directory        | Purpose                 |
| ---------------- | ----------------------- |
| `queries/`       | Base queries            |
| `channels/`      | Channel queries         |
| `messages/`      | Message queries         |
| `users/`         | User queries            |
| `dm/`            | Direct message queries  |
| `notifications/` | Notification queries    |
| `analytics/`     | Analytics queries       |
| `audit/`         | Audit log queries       |
| `apps/`          | App directory queries   |
| `commands/`      | Slash command queries   |
| `meetings/`      | Meeting queries         |
| `presence/`      | Presence queries        |
| `saved/`         | Saved items queries     |
| `pinned/`        | Pinned messages queries |
| `location/`      | Location queries        |
| `media/`         | Media queries           |
| `compliance/`    | Compliance queries      |
| `activity/`      | Activity queries        |
| `settings/`      | Settings queries        |
| `onboarding/`    | Onboarding queries      |
| `disappearing/`  | Ephemeral messages      |

### Mutation Files

| File                    | Purpose           |
| ----------------------- | ----------------- |
| `mutations/messages.ts` | Message mutations |
| Various in subdirs      | Domain mutations  |

### Fragments

| File            | Purpose                    |
| --------------- | -------------------------- |
| `fragments.ts`  | Reusable GraphQL fragments |
| `app-config.ts` | AppConfig operations       |

---

## Database Overview

### Schema: `nchat`

All tables prefixed with `nchat_` in the `nchat` schema.

### Core Tables (17)

| Table                       | Purpose                    |
| --------------------------- | -------------------------- |
| `nchat_users`               | App-specific user profiles |
| `nchat_channels`            | Chat channels              |
| `nchat_channel_members`     | Channel membership         |
| `nchat_messages`            | Messages                   |
| `nchat_reactions`           | Message reactions          |
| `nchat_attachments`         | File attachments           |
| `nchat_mentions`            | @mentions                  |
| `nchat_threads`             | Thread metadata            |
| `nchat_thread_participants` | Thread membership          |
| `nchat_bookmarks`           | Saved messages             |
| `nchat_notifications`       | User notifications         |
| `nchat_read_receipts`       | Read state                 |
| `nchat_typing_indicators`   | Typing state               |
| `nchat_presence`            | User presence              |
| `nchat_invites`             | Invite codes               |
| `nchat_settings`            | App settings               |
| `nchat_audit_log`           | Audit trail                |

### RBAC Tables (from migration 004)

| Table                    | Purpose               |
| ------------------------ | --------------------- |
| `nchat_roles`            | Role definitions      |
| `nchat_role_permissions` | Permission matrix     |
| `nchat_user_roles`       | User-role assignments |

### Additional Tables (from migration 009-010)

Extended features for polls, bots, webhooks, scheduled messages, etc.

---

## Real-Time Architecture

### GraphQL Subscriptions

Via Hasura's WebSocket endpoint.

| Subscription           | Purpose           |
| ---------------------- | ----------------- |
| Message created        | New messages      |
| Message updated        | Edits/deletes     |
| Reaction added/removed | Reactions         |
| Presence updated       | Online status     |
| Channel updated        | Channel changes   |
| Notification created   | New notifications |

### Socket.io Events

For low-latency ephemeral state.

| Event             | Direction        | Purpose            |
| ----------------- | ---------------- | ------------------ |
| `typing:start`    | Client -> Server | Start typing       |
| `typing:stop`     | Client -> Server | Stop typing        |
| `typing:update`   | Server -> Client | Typing users       |
| `presence:update` | Bidirectional    | Presence changes   |
| `join:channel`    | Client -> Server | Join channel room  |
| `leave:channel`   | Client -> Server | Leave channel room |

### Socket Client

Location: `/src/lib/socket/client.ts`

---

## White-Label Customization

### Branding Options

| Option       | Location               | Description         |
| ------------ | ---------------------- | ------------------- |
| App Name     | `branding.appName`     | Displayed name      |
| Logo         | `branding.logo`        | Logo URL            |
| Favicon      | `branding.favicon`     | Favicon URL         |
| Tagline      | `branding.tagline`     | App tagline         |
| Company Name | `branding.companyName` | Footer company      |
| Logo Scale   | `branding.logoScale`   | Logo size (0.5-2.0) |

### Theme Customization

| Option        | Description             |
| ------------- | ----------------------- |
| Preset themes | 25 built-in themes      |
| Custom colors | All 16 color properties |
| Color scheme  | Light/dark/system       |
| Border radius | UI element roundness    |
| Font family   | Typography              |
| Custom CSS    | Injected styles         |

### Landing Page Modes

| Mode       | Description       |
| ---------- | ----------------- |
| `landing`  | Show landing page |
| `redirect` | Redirect to path  |
| `chat`     | Direct to chat    |

### Legal Customization

| Option               | Description     |
| -------------------- | --------------- |
| Privacy Policy URL   | Link to policy  |
| Terms of Service URL | Link to ToS     |
| Cookie Policy URL    | Link to cookies |
| Support Email        | Contact email   |

---

## Platform Builds

Location: `/platforms/`

### Available Platforms (4)

| Platform     | Directory                 | Technology   |
| ------------ | ------------------------- | ------------ |
| Electron     | `platforms/electron/`     | Electron     |
| Tauri        | `platforms/tauri/`        | Tauri (Rust) |
| React Native | `platforms/react-native/` | React Native |
| Capacitor    | `platforms/capacitor/`    | Capacitor    |

### Deployment Configs

Location: `/deploy/`

Contains deployment configurations for various hosting platforms.

---

## Internationalization

### Supported Languages (9)

Location: `/src/locales/`

| Code | Language   |
| ---- | ---------- |
| `en` | English    |
| `es` | Spanish    |
| `fr` | French     |
| `de` | German     |
| `pt` | Portuguese |
| `ja` | Japanese   |
| `zh` | Chinese    |
| `ru` | Russian    |
| `ar` | Arabic     |

---

## Bot System

### Built-in Bots (4)

Location: `/src/bots/`

| Bot          | Directory       | Purpose              |
| ------------ | --------------- | -------------------- |
| Hello Bot    | `hello-bot/`    | Example greeting bot |
| Welcome Bot  | `welcome-bot/`  | New member welcome   |
| Reminder Bot | `reminder-bot/` | Reminder scheduling  |
| Poll Bot     | `poll-bot/`     | Poll creation        |

### Bot Library

Location: `/src/lib/bots/`

Contains bot SDK and example implementations.

---

## Quick Reference Commands

### Development

```bash
# Start frontend (port 3000)
pnpm dev

# Start backend (first time)
cd .backend && nself init && nself build && nself start

# Start backend (subsequent)
cd .backend && nself start

# Run tests
pnpm test

# Type check
pnpm type-check

# Lint
pnpm lint
```

### Testing Different Roles

```typescript
// Browser console or component
import { useAuth } from '@/contexts/auth-context'
const { switchUser } = useAuth()
await switchUser('admin@nself.org')
await switchUser('guest@nself.org')
```

---

## Related Documentation

| Document                                               | Description             |
| ------------------------------------------------------ | ----------------------- |
| [Project-Structure.md](./Project-Structure.md)         | Complete file structure |
| [Environment-Variables.md](./Environment-Variables.md) | All env vars            |
| [Database-Schema.md](./Database-Schema.md)             | Full database docs      |
| [Types.md](./Types.md)                                 | TypeScript types        |
| [Roadmap.md](../about/Roadmap.md)                             | Development phases      |
| [Features-Complete.md](../features/Features-Complete.md)         | Feature details         |

---

_This document is the Single Point of Reference/Truth (SPORT) for nself-chat. Keep it updated as the project evolves._
