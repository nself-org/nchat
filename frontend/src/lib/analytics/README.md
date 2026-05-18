# Analytics Module

**Version**: 0.8.0
**Platform Support**: Web, iOS, Android, Electron, Tauri

## Overview

Comprehensive analytics and monitoring system with Firebase Analytics, Sentry error tracking, and GDPR-compliant privacy controls.

## Features

- ✅ Firebase Analytics (iOS, Android, Web)
- ✅ Sentry Error Tracking (All platforms)
- ✅ Custom event tracking
- ✅ Screen view tracking
- ✅ Performance monitoring
- ✅ Crash reporting
- ✅ User properties and segmentation
- ✅ GDPR-compliant consent management
- ✅ Privacy controls (opt-out, data export, deletion)
- ✅ Session tracking
- ✅ Cross-platform support

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment

Create `.env.local`:

```bash
# Firebase (Web)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Sentry (All platforms)
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
SENTRY_AUTH_TOKEN=your_auth_token

# Control
NEXT_PUBLIC_ANALYTICS_ENABLED=true
NEXT_PUBLIC_RELEASE_VERSION=0.8.0
```

### 3. Add Firebase Config Files

**iOS**: Add `GoogleService-Info.plist` to `platforms/capacitor/ios/App/App/`

**Android**: Add `google-services.json` to `platforms/capacitor/android/app/`

### 4. Initialize Analytics

```typescript
import { initializeAnalytics } from "@/lib/analytics";

await initializeAnalytics();
```

## Usage

### Track Events

```typescript
import { analytics } from "@/lib/analytics/events";

// Message sent
await analytics.trackMessageSent({
  channel_id: "channel-123",
  channel_type: "public",
  message_length: 50,
  has_attachment: false,
  has_mention: true,
  has_emoji: false,
  is_thread: false,
});

// Screen view
await analytics.trackScreenView("channel_list", "ChannelListScreen");

// Error
await analytics.trackError({
  error_type: "NetworkError",
  error_message: "Failed to load",
  fatal: false,
  context: "/chat",
});
```

### Use React Hook

```typescript
import { useAnalytics } from '@/hooks/use-analytics'

function MyComponent() {
  const analytics = useAnalytics()

  const handleAction = async () => {
    await analytics.trackMessageSent({ ... })
  }

  return <button onClick={handleAction}>Send</button>
}
```

### Manage Consent

```typescript
import { analyticsPrivacy } from "@/lib/analytics/privacy";

// Accept all
await analyticsPrivacy.acceptAll();

// Reject all
await analyticsPrivacy.rejectAll();

// Granular control
await analyticsPrivacy.setConsent({
  analytics: true,
  performance: true,
  errorTracking: false,
  crashReporting: false,
});

// Export data
const data = await analyticsPrivacy.exportUserData();

// Clear data
await analyticsPrivacy.clearAllData();
```

## Module Structure

```
src/lib/analytics/
├── types.ts              # TypeScript types and interfaces
├── firebase.ts           # Firebase Analytics implementation
├── sentry-mobile.ts      # Sentry mobile SDK integration
├── events.ts             # Event tracking API (main API)
├── privacy.ts            # Privacy controls and consent
├── config.ts             # Platform-specific configuration
├── index.ts              # Main exports
└── README.md             # This file

Legacy (v0.7.0 and earlier):
├── analytics-types.ts    # Legacy types
├── analytics-client.ts   # Legacy client
├── analytics-collector.ts
├── analytics-processor.ts
├── analytics-aggregator.ts
└── ... (other legacy files)
```

## Architecture

### Platform Detection

The module automatically detects the current platform and loads the appropriate SDK:

- **Web**: Firebase Web SDK + Sentry Browser
- **iOS**: Firebase iOS SDK + Sentry Capacitor
- **Android**: Firebase Android SDK + Sentry Capacitor
- **Electron**: Sentry Electron
- **Tauri**: Sentry Browser (future)

### Event Flow

```
User Action
    ↓
analytics.trackXXX()
    ↓
Check consent ──→ (if denied) → Drop event
    ↓
firebaseAnalytics.logEvent()
sentryMobile.addBreadcrumb()
    ↓
Platform SDK
    ↓
Firebase/Sentry Backend
```

### Privacy Flow

```
First Launch
    ↓
Show ConsentBanner
    ↓
User Choice:
├─ Accept All → Enable all tracking
├─ Reject All → Disable all tracking
└─ Customize → Show AnalyticsSettings
    ↓
Save to localStorage
    ↓
Initialize analytics with consent
```

## API Reference

### initializeAnalytics(config?)

Initialize analytics with optional configuration.

```typescript
await initializeAnalytics({
  enabled: true,
  providers: ["firebase", "sentry"],
  firebase: {
    measurementId: "G-XXXXXXXXXX",
    appId: "1:XXXX:web:XXXX",
    apiKey: "XXXX",
  },
  sentry: {
    dsn: "https://xxx@sentry.io/xxx",
    tracesSampleRate: 0.1,
    replaysSampleRate: 0.1,
  },
  consent: {
    analytics: true,
    performance: true,
    errorTracking: true,
    crashReporting: true,
  },
  debugMode: false,
});
```

### analytics.trackXXX(event)

Track specific events. See [types.ts](./types.ts) for all available methods.

**Authentication:**

- `trackLogin(method, userId)`
- `trackLogout()`
- `trackSignup(method, userId)`

**Messaging:**

- `trackMessageSent(event: MessageSentEvent)`
- `trackMessageEdited(channelId)`
- `trackMessageDeleted(channelId)`

**Channels:**

- `trackChannelCreated(event: ChannelEvent)`
- `trackChannelJoined(event: ChannelEvent)`
- `trackChannelLeft(channelId)`

**Search:**

- `trackSearch(event: SearchEvent)`
- `trackSearchResultClicked(resultId, position)`

**Files:**

- `trackFileUploaded(event: FileEvent)`
- `trackFileDownloaded(fileType, fileSize)`

**Calls:**

- `trackCallStarted(event: CallEvent)`
- `trackCallEnded(event: CallEvent)`

**Performance:**

- `trackScreenLoadTime(screenName, durationMs)`
- `trackApiCall(endpoint, method, durationMs, status)`

**Errors:**

- `trackError(event: ErrorEvent)`

**Generic:**

- `trackScreenView(screenName, screenClass?)`

### analyticsPrivacy

Privacy control API.

**Consent Management:**

- `getConsent(): ConsentStatus`
- `setConsent(consent: Partial<ConsentStatus>): Promise<void>`
- `acceptAll(): Promise<void>`
- `rejectAll(): Promise<void>`
- `hasProvidedConsent(): boolean`

**Privacy Settings:**

- `getPrivacySettings(): PrivacySettings`
- `setPrivacySettings(settings: Partial<PrivacySettings>): Promise<void>`

**Data Management:**

- `exportUserData(): Promise<any>`
- `clearAllData(): Promise<void>`

**Utilities:**

- `shouldEnableAnalytics(): boolean`
- `anonymizeUserId(userId: string): string`
- `getConsentBannerMessage(): string`
- `getPrivacyPolicySummary(): object`

### firebaseAnalytics

Firebase Analytics client (low-level API).

- `initialize(config: AnalyticsConfig): Promise<void>`
- `logEvent(eventName: string, params?: EventParams): Promise<void>`
- `logScreenView(screenName: string, screenClass?: string): Promise<void>`
- `setUserProperties(properties: Partial<UserProperties>): Promise<void>`
- `setUserId(userId: string | null): Promise<void>`
- `setConsent(consent: object): Promise<void>`
- `reset(): Promise<void>`
- `isInitialized(): boolean`
- `getPlatform(): 'web' | 'ios' | 'android' | 'electron'`

### sentryMobile

Sentry error tracking client (low-level API).

- `initialize(config: AnalyticsConfig): Promise<void>`
- `setUser(user: Partial<UserProperties> | null): Promise<void>`
- `captureError(error: Error, context?): Promise<void>`
- `captureMessage(message: string, level?, context?): Promise<void>`
- `addBreadcrumb(category, message, data?, level?): Promise<void>`
- `setContext(name: string, context: object): Promise<void>`
- `setTag(key: string, value: string): Promise<void>`
- `startTransaction(name: string, operation: string): Promise<any>`
- `isInitialized(): boolean`
- `close(): Promise<void>`

## Types

See [types.ts](./types.ts) for all type definitions:

- `AnalyticsConfig` - Main configuration
- `ConsentStatus` - User consent state
- `UserProperties` - User profile data
- `StandardEvents` - Standard event names
- `MessageSentEvent` - Message event data
- `SearchEvent` - Search event data
- `ChannelEvent` - Channel event data
- `FileEvent` - File event data
- `CallEvent` - Call event data
- `ErrorEvent` - Error event data
- `PrivacySettings` - Privacy preferences

## Components

### ConsentBanner

GDPR-compliant consent banner shown on first launch.

```typescript
import { ConsentBanner } from '@/components/analytics/ConsentBanner'

<ConsentBanner />
```

### AnalyticsSettings

Comprehensive privacy settings page.

```typescript
import { AnalyticsSettings } from '@/components/settings/AnalyticsSettings'

<AnalyticsSettings />
```

## Hooks

### useAnalytics()

Main React hook for analytics.

```typescript
const {
  trackMessageSent,
  trackSearch,
  trackChannelCreated,
  trackScreenView,
  isEnabled,
  getConsent,
  setConsent,
  sessionData,
  platform,
} = useAnalytics();
```

### usePerformanceTracking(screenName)

Automatically track screen load time.

```typescript
function MyScreen() {
  usePerformanceTracking('my_screen')

  return <div>My Screen</div>
}
```

### useErrorTracking()

Automatically track unhandled errors.

```typescript
function App() {
  useErrorTracking()

  return <div>App</div>
}
```

## Privacy & GDPR

### Consent Requirements

- ✅ Opt-in by default (GDPR compliant)
- ✅ Clear consent banner
- ✅ Granular controls (4 categories)
- ✅ Easy opt-out
- ✅ Data export (JSON)
- ✅ Data deletion

### What We Collect

- Usage patterns (screens, features used)
- Performance metrics (load times, API latency)
- Error reports and crashes
- Device information (platform, OS version)
- Session data (duration, frequency)

### What We DON'T Collect

- Message content
- File attachments
- Passwords or authentication tokens
- Personal conversations
- Location data
- Contacts or address book

### User Rights

- Right to access (export data)
- Right to erasure (delete data)
- Right to rectification
- Right to object (opt-out)
- Data portability

## Testing

### Development

```bash
# Enable debug mode
NEXT_PUBLIC_ANALYTICS_ENABLED=true
NODE_ENV=development

# iOS debug
-FIRDebugEnabled

# Android debug
adb shell setprop debug.firebase.analytics.app io.nself.chat
```

### Verify Events

**Firebase Console:**

1. Open Firebase Console
2. Go to Analytics → DebugView
3. Verify events appear in real-time

**Sentry Dashboard:**

1. Open Sentry dashboard
2. Go to Issues
3. Verify errors are captured

### Test Consent

```typescript
// Clear consent
localStorage.removeItem("analytics-consent");

// Reload app
window.location.reload();

// Verify banner appears
```

## Performance

### Sample Rates

- **Production**: 10% of transactions, 10% of replays
- **Staging**: 50% of transactions, 20% of replays
- **Development**: 100% of transactions, 0% of replays

### Event Batching

- Events are batched for network efficiency
- Max 500 events per batch
- Auto-flush every 30 seconds
- Manual flush on app background

### Privacy Filters

- IP addresses anonymized by default
- User IDs can be hashed
- Sensitive fields removed from errors
- No PII in event properties

## Troubleshooting

### Events not appearing

1. Check consent: `analyticsPrivacy.getConsent()`
2. Check initialization: `analytics.isEnabled()`
3. Enable debug mode
4. Check Firebase/Sentry dashboard

### Build errors (iOS)

```bash
cd platforms/capacitor/ios/App
pod deintegrate
pod install
```

### Build errors (Android)

```bash
cd platforms/capacitor/android
./gradlew clean
./gradlew build --refresh-dependencies
```

## Migration Guide

### From v0.7.0 Legacy Analytics

The legacy analytics system (analytics-client.ts, analytics-collector.ts, etc.) is still available for backward compatibility, but the new v0.8.0 system is recommended for mobile and desktop apps.

**Old (v0.7.0):**

```typescript
import { getAnalyticsClient } from '@/lib/analytics/analytics-client'

const client = getAnalyticsClient()
client.track('message_sent', { ... })
```

**New (v0.8.0):**

```typescript
import { analytics } from '@/lib/analytics/events'

await analytics.trackMessageSent({ ... })
```

Both systems can coexist. The new system is optimized for mobile/desktop with native SDK support.

## Documentation

- [Setup Guide](../../../docs/ANALYTICS-SETUP.md)
- [Implementation Summary](../../../docs/ANALYTICS-IMPLEMENTATION-SUMMARY.md)
- [Quick Reference](../../../docs/ANALYTICS-QUICK-REFERENCE.md)
- [Privacy Policy](../../../docs/privacy/analytics-privacy.md)

## Support

For issues or questions:

- Email: dev@nself.org
- GitHub: [Issues](https://github.com/nself/nchat/issues)
- Slack: #analytics channel

## License

See main project LICENSE
