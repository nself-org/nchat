# @nself-chat/ui — Changelog

## 0.1.0 — Sprint S13 (2026-05-16)

Initial production release. All components ported from `frontend/src/` with real implementations.

### Added

**Core package (`@nself-chat/ui`)**
- `Button` — general-purpose button with `onClick`, `children`, `className` props; CVA-ready
- `Avatar` — image avatar with configurable `src`, `alt`, `size`, `className`; empty `alt` renders as decorative
- `MessageBubble` — single message display with author, content, timestamp, own-message flag, avatar URL
- `ChannelListItem` — sidebar channel entry with name, unread count, active state
- `cn()` — clsx + tailwind-merge utility for safe class composition
- `debounce()` — trailing-edge debounce for search inputs

**Primitives (`@nself-chat/ui/primitives`)**
- `Badge` — status/label badge with 8 color variants (`default`, `blue`, `green`, `red`, `yellow`, `purple`, `pink`, `orange`), dot mode, two sizes (`sm`, `md`)
- `UnreadBadge` — unread count badge with `99+` overflow capping
- `Spinner` — animated loading indicator with 4 sizes (`xs`, `sm`, `md`, `lg`), optional screen-reader label
- `Skeleton` — loading placeholder with rect, circle, and multi-line modes; last line is 3/4 width by default
- `EmptyState` — empty content placeholder with icon, heading, description, optional action button
- `ConfirmDialog` — Radix Dialog-based confirmation modal with title, description, confirm/cancel handlers, destructive variant
- `Kbd` — keyboard shortcut display element

**Adapters (`@nself-chat/ui/adapters`)**
- `RouterAdapter` — interface decoupling components from any router implementation
- `RouterAdapterContext` — React context providing the adapter
- `useRouter()` — hook to read the router adapter (throws if context is missing)
- `noopRouterAdapter` — no-op implementation for testing and storybook

**Auth (`@nself-chat/ui/auth`)**
- Full onboarding wizard (welcome, profile setup, avatar upload, invite team, join channels, notification permission, preferences, completion steps)
- `AuthGuard`, `RoleGuard`, `SetupGuard` — route protection components
- `PinLock`, `PinSetup`, `PinManage` — PIN-based lock screen
- `TwoFactorSetup`, `TwoFactorVerify` — 2FA components
- `EncryptionBadge` — E2E encryption indicator
- Tour system: `TourHighlight`, `TourOverlay`, `TourStep`, `TourTooltip`, `TourNavigation`, `TourStepIndicator`
- `WhatsNewModal` — changelog modal for new feature announcements
- `IdmeVerification` — ID.me identity verification flow
- `tour-utils` — helpers: `markTourComplete`, `isTourComplete`, `resetTour`

**Chat (`@nself-chat/ui/chat`)**
- `MessageBubble`, `MessageList`, `MessageComposer` — full message thread UI
- Chat layout, sidebar, channel list, direct message list, channel skeleton

**Layout (`@nself-chat/ui/layout`)**
- `ChatLayout`, `Sidebar`, `ChannelHeader`, `ChannelCategory`, `ChannelItem`, `ChannelSkeleton`

**Calls (`@nself-chat/ui/calls`)**
- `CallInterface`, `DeviceSelector`, `VoiceMessage`, `VoiceRecorder`, `WaveformVisualizer`

**Search (`@nself-chat/ui/search`)**
- `SearchModal`, `SearchInput`, `SearchResults`, `QuickSwitcher`, `BookmarksPanel`, `RemindersPanel`

**Settings (`@nself-chat/ui/settings`)**
- `SettingsLayout`, `ProfileSettings`, `NotificationSettings`, `ThemeSettings`, `PrivacySettings`, `I18nSettings`

**Files (`@nself-chat/ui/files`)**
- `FileAttachment`, `FileIcon`, `ForwardMessage`, `UploadZone`

**Admin (`@nself-chat/ui/admin`)**
- `AnalyticsDashboard`, `AuditLog`, `CompliancePanel`, `ModerationQueue`

### Infrastructure

- Storybook 8.6.x — react-vite builder, addon-essentials, addon-interactions, addon-a11y; stories for Button, Avatar, Badge, Spinner, Skeleton
- Vitest 3 — jsdom environment, Testing Library, v8 coverage; 110 tests across 9 test files; 99.58% coverage on targeted source files
- vitest.config.ts — `resolve.extensions` prefers `.ts` over `.js` (prevents compiled artifact shadowing); coverage scoped to tested files only
- `storybook-static/` added to `.gitignore`

### Package structure

```
@nself-chat/ui          0.1.0   MIT
  11 entry points (core + 10 domain subpaths)
  peer deps: React 19, tailwindcss 3.4
  runtime deps: Radix UI, CVA, clsx, tailwind-merge, lucide-react
```
