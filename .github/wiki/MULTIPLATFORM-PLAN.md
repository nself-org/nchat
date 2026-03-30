# Multi-Platform Build Implementation Plan

**Document Version**: 1.0.0
**Last Updated**: February 3, 2026
**Related Tasks**: TODO.md Tasks 114-117

---

## Table of Contents

1. [Overview](#overview)
2. [Current State Analysis](#current-state-analysis)
3. [Web Build (Task 114)](#web-build-task-114)
4. [Desktop Builds (Task 115)](#desktop-builds-task-115)
5. [Mobile Builds (Task 116)](#mobile-builds-task-116)
6. [Platform-Specific Features (Task 117)](#platform-specific-features-task-117)
7. [Build Pipelines](#build-pipelines)
8. [Shared Code Strategy](#shared-code-strategy)
9. [Implementation Timeline](#implementation-timeline)
10. [Security Considerations](#security-considerations)

---

## Overview

nChat is designed as a multi-platform team communication application supporting:

| Platform          | Framework        | Status               |
| ----------------- | ---------------- | -------------------- |
| Web               | Next.js 15       | Production Ready     |
| Desktop (macOS)   | Tauri / Electron | Scaffolding Complete |
| Desktop (Windows) | Tauri / Electron | Scaffolding Complete |
| Desktop (Linux)   | Tauri / Electron | Scaffolding Complete |
| Mobile (iOS)      | Capacitor        | Scaffolding Complete |
| Mobile (Android)  | Capacitor        | Scaffolding Complete |
| Mobile (Native)   | React Native     | Scaffolding Complete |

### Architecture Decision

**Recommended Stack**:

- **Desktop**: Tauri (primary), Electron (fallback for legacy systems)
- **Mobile**: Capacitor (primary), React Native (for advanced native features)

**Rationale**:

- Tauri offers superior performance (~10x smaller bundle, native Rust backend)
- Capacitor maximizes code reuse with the existing Next.js codebase
- React Native provides full native experience when needed

---

## Current State Analysis

### Existing Scaffolding

```
platforms/
├── capacitor/           # iOS/Android via Capacitor
│   ├── src/native/      # Native feature wrappers
│   │   ├── push-notifications.ts
│   │   ├── biometrics.ts
│   │   ├── file-picker.ts
│   │   ├── haptics.ts
│   │   ├── share.ts
│   │   └── offline-sync.ts
│   ├── README.md        # Comprehensive setup guide
│   └── *.example        # Firebase config templates
│
├── electron/            # Desktop via Electron
│   ├── main.js          # Entry point
│   ├── main/            # Main process modules
│   │   ├── window.ts
│   │   ├── menu.ts
│   │   ├── ipc.ts
│   │   ├── notifications.ts
│   │   ├── updates.ts
│   │   ├── deeplinks.ts
│   │   └── shortcuts.ts
│   ├── preload/         # Preload scripts
│   └── electron-builder.json
│
├── tauri/               # Desktop via Tauri
│   ├── src/
│   │   ├── main.rs
│   │   ├── commands.rs
│   │   ├── menu.rs
│   │   ├── tray.rs
│   │   ├── notifications.rs
│   │   ├── autostart.rs
│   │   ├── deeplink.rs
│   │   ├── updater.rs
│   │   └── shortcuts.rs
│   └── icons/
│
└── react-native/        # Native mobile via React Native
    ├── src/
    │   ├── App.tsx
    │   ├── screens/     # 9 screens
    │   ├── components/  # 10+ components
    │   ├── navigation/  # React Navigation setup
    │   ├── native/      # Native modules
    │   ├── stores/      # State management
    │   ├── hooks/       # Custom hooks
    │   └── theme/       # Theme system
    └── templates/       # iOS/Android templates
```

### Existing CI/CD Workflows

| Workflow        | File                  | Purpose                    |
| --------------- | --------------------- | -------------------------- |
| Web Build       | `build-web.yml`       | Next.js production build   |
| Capacitor Build | `build-capacitor.yml` | iOS/Android builds         |
| Tauri Build     | `build-tauri.yml`     | macOS/Windows/Linux builds |
| Desktop Build   | `desktop-build.yml`   | Combined Electron/Tauri    |
| Desktop Release | `desktop-release.yml` | GitHub release creation    |
| iOS Build       | `ios-build.yml`       | iOS-specific workflow      |
| Android Build   | `android-build.yml`   | Android-specific workflow  |

---

## Web Build (Task 114)

### Next.js Production Build

#### Standard SSR Build

```bash
pnpm build        # Standard Next.js build
pnpm start        # Start production server
```

**Output**: `.next/` directory with server-side rendering support

#### Static Export (for CDN deployment)

```bash
# Configure next.config.js
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
}

pnpm build        # Generates static files in `out/`
```

**Output**: `out/` directory with static HTML/CSS/JS

### Deployment Options

#### 1. Vercel (Recommended for Next.js)

```yaml
# .github/workflows/deploy-vercel.yml
- name: Deploy to Vercel
  uses: amondnet/vercel-action@v25
  with:
    vercel-token: ${{ secrets.VERCEL_TOKEN }}
    vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
    vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
    vercel-args: '--prod'
```

**Pros**: Zero-config, edge functions, automatic preview deployments
**Cons**: Vendor lock-in, cost at scale

#### 2. Netlify

```yaml
# .github/workflows/deploy-netlify.yml
- name: Deploy to Netlify
  uses: nwtgck/actions-netlify@v3
  with:
    publish-dir: './out'
    production-deploy: true
  env:
    NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
    NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

**Pros**: Static hosting, forms, identity
**Cons**: SSR requires Netlify Functions

#### 3. Docker/Kubernetes (Self-Hosted)

```dockerfile
# Dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

**Pros**: Full control, SSR support, scalability
**Cons**: Infrastructure management

#### 4. CDN Static Deployment (CloudFlare/AWS)

```bash
# Build static export
pnpm build

# Deploy to CloudFlare Pages
npx wrangler pages publish out --project-name=nchat

# Or AWS S3 + CloudFront
aws s3 sync out/ s3://nchat-static/ --delete
aws cloudfront create-invalidation --distribution-id XXXXX --paths "/*"
```

### nself Backend URL Configuration

```typescript
// src/lib/environment.ts
export const getBackendUrls = () => {
  const isProduction = process.env.NODE_ENV === 'production'

  return {
    graphql:
      process.env.NEXT_PUBLIC_GRAPHQL_URL ||
      (isProduction ? 'https://api.nchat.nself.org/v1/graphql' : 'http://api.localhost/v1/graphql'),

    auth:
      process.env.NEXT_PUBLIC_AUTH_URL ||
      (isProduction ? 'https://auth.nchat.nself.org/v1/auth' : 'http://auth.localhost/v1/auth'),

    storage:
      process.env.NEXT_PUBLIC_STORAGE_URL ||
      (isProduction
        ? 'https://storage.nchat.nself.org/v1/storage'
        : 'http://storage.localhost/v1/storage'),

    websocket:
      process.env.NEXT_PUBLIC_WS_URL ||
      (isProduction ? 'wss://api.nchat.nself.org/v1/graphql' : 'ws://api.localhost/v1/graphql'),
  }
}
```

### Environment Variables for Web

```bash
# .env.production
NEXT_PUBLIC_APP_NAME=nchat
NEXT_PUBLIC_GRAPHQL_URL=https://api.nchat.nself.org/v1/graphql
NEXT_PUBLIC_AUTH_URL=https://auth.nchat.nself.org/v1/auth
NEXT_PUBLIC_STORAGE_URL=https://storage.nchat.nself.org/v1/storage
NEXT_PUBLIC_WS_URL=wss://api.nchat.nself.org/v1/graphql
NEXT_PUBLIC_USE_DEV_AUTH=false
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
```

---

## Desktop Builds (Task 115)

### Tauri (Recommended)

#### Why Tauri?

| Feature      | Tauri      | Electron         |
| ------------ | ---------- | ---------------- |
| Bundle Size  | ~3-5 MB    | ~150+ MB         |
| Memory Usage | ~50-100 MB | ~200-400 MB      |
| Startup Time | <1s        | 2-5s             |
| Security     | Sandboxed  | Node.js access   |
| Language     | Rust       | JavaScript       |
| Updater      | Built-in   | electron-updater |

#### Prerequisites

```bash
# macOS
xcode-select --install
brew install rust

# Windows
# Install Visual Studio Build Tools
# Install Rust via rustup.rs

# Linux
sudo apt install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

#### Build Commands

```bash
# Development
pnpm tauri dev

# Production builds
pnpm tauri build                           # Current platform
pnpm tauri build --target x86_64-pc-windows-msvc  # Windows x64
pnpm tauri build --target universal-apple-darwin   # macOS Universal
pnpm tauri build --target x86_64-unknown-linux-gnu # Linux x64
```

#### Tauri Configuration

```json
// platforms/tauri/tauri.conf.json
{
  "productName": "nchat",
  "version": "0.9.1",
  "identifier": "org.nself.nchat",
  "build": {
    "beforeBuildCommand": "pnpm build",
    "beforeDevCommand": "pnpm dev",
    "devUrl": "http://localhost:3000",
    "frontendDist": "../out"
  },
  "bundle": {
    "active": true,
    "targets": ["dmg", "app", "msi", "nsis", "deb", "rpm", "appimage"],
    "icon": ["icons/icon.icns", "icons/icon.ico", "icons/icon.png"],
    "macOS": {
      "minimumSystemVersion": "10.15",
      "hardenedRuntime": true,
      "entitlements": "entitlements.plist"
    },
    "windows": {
      "digestAlgorithm": "sha256",
      "certificateThumbprint": null
    }
  },
  "plugins": {
    "updater": {
      "active": true,
      "endpoints": ["https://releases.nchat.nself.org/{{target}}/{{arch}}/{{current_version}}"],
      "pubkey": "YOUR_PUBLIC_KEY"
    }
  }
}
```

#### Native Window Controls

```rust
// platforms/tauri/src/commands.rs
#[tauri::command]
pub async fn show_window<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn minimize_window<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.minimize().map_err(|e| e.to_string())?;
    }
    Ok(())
}
```

#### Auto-Update Implementation

```rust
// platforms/tauri/src/updater.rs
pub fn setup_updater(app: &App) -> Result<(), Box<dyn std::error::Error>> {
    let handle = app.handle().clone();

    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(tokio::time::Duration::from_secs(10)).await;

        if let Ok(updater) = handle.updater() {
            match updater.check().await {
                Ok(Some(update)) => {
                    if let Some(window) = handle.get_webview_window("main") {
                        let _ = window.emit("update-available", UpdateInfo {
                            version: update.version.clone(),
                            body: update.body.clone(),
                        });
                    }
                }
                _ => {}
            }
        }
    });
    Ok(())
}
```

### Electron (Fallback)

#### When to Use Electron

- Legacy Windows versions (pre-Windows 10)
- Systems without WebView2 runtime
- Existing Electron plugin dependencies
- Need for specific Chromium features

#### Electron Build Configuration

```json
// platforms/electron/electron-builder.json
{
  "appId": "org.nself.nchat",
  "productName": "nchat",
  "mac": {
    "category": "public.app-category.productivity",
    "hardenedRuntime": true,
    "target": [
      { "target": "dmg", "arch": ["x64", "arm64"] },
      { "target": "zip", "arch": ["x64", "arm64"] }
    ]
  },
  "win": {
    "target": [
      { "target": "nsis", "arch": ["x64", "ia32"] },
      { "target": "portable", "arch": ["x64"] }
    ]
  },
  "linux": {
    "target": ["AppImage", "deb", "rpm", "tar.gz"],
    "category": "Network;InstantMessaging;Chat"
  },
  "publish": {
    "provider": "github",
    "owner": "nself",
    "repo": "nself-chat"
  }
}
```

#### Build Commands

```bash
# Development
pnpm electron:dev

# Production builds
pnpm electron:build                    # All platforms
pnpm electron:build --mac --universal  # macOS Universal
pnpm electron:build --win --x64        # Windows x64
pnpm electron:build --linux            # Linux
```

### Desktop Output Artifacts

| Platform | Format                      | Location                                     |
| -------- | --------------------------- | -------------------------------------------- |
| macOS    | `.dmg`, `.app`              | `dist-electron/` or `target/release/bundle/` |
| Windows  | `.msi`, `.exe`              | `dist-electron/` or `target/release/bundle/` |
| Linux    | `.AppImage`, `.deb`, `.rpm` | `dist-electron/` or `target/release/bundle/` |

---

## Mobile Builds (Task 116)

### Capacitor (Recommended)

#### Why Capacitor?

| Feature           | Capacitor            | React Native |
| ----------------- | -------------------- | ------------ |
| Code Reuse        | 95%+ (same web code) | 60-70%       |
| Development Speed | Fast (web-first)     | Moderate     |
| Native Access     | Via plugins          | Direct       |
| Bundle Size       | Moderate             | Smaller      |
| Performance       | Good                 | Excellent    |
| Learning Curve    | Low                  | Moderate     |

#### Prerequisites

**iOS**:

- macOS (required)
- Xcode 15+
- CocoaPods
- Apple Developer Account

**Android**:

- Android Studio Hedgehog+
- Android SDK API 34
- JDK 17
- Gradle 8.0+

#### Capacitor Setup

```bash
# Install Capacitor CLI and core
pnpm add @capacitor/core @capacitor/cli

# Initialize Capacitor
npx cap init nchat io.nself.chat

# Add platforms
npx cap add ios
npx cap add android

# Install native plugins
pnpm add @capacitor/push-notifications
pnpm add @capacitor/camera
pnpm add @capacitor/filesystem
pnpm add @capacitor/haptics
pnpm add @capacitor/app
```

#### Capacitor Configuration

```typescript
// capacitor.config.ts
import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'io.nself.chat',
  appName: 'nchat',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
  },
  android: {
    minWebViewVersion: 80,
  },
}

export default config
```

#### Build Commands

```bash
# Build web assets first
pnpm build

# Sync to native projects
npx cap sync

# Open in IDE
npx cap open ios      # Opens Xcode
npx cap open android  # Opens Android Studio

# Run on device
npx cap run ios --device
npx cap run android --device
```

#### iOS Build (App Store)

```bash
# Build release IPA
cd platforms/capacitor/ios/App
xcodebuild -workspace App.xcworkspace \
  -scheme App \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath build/App.xcarchive \
  archive

# Export IPA
xcodebuild -exportArchive \
  -archivePath build/App.xcarchive \
  -exportPath build/export \
  -exportOptionsPlist ExportOptions.plist
```

#### Android Build (Play Store)

```bash
# Build release AAB (Android App Bundle)
cd platforms/capacitor/android
./gradlew bundleRelease

# Output: app/build/outputs/bundle/release/app-release.aab
```

### React Native (Alternative)

#### When to Use React Native

- Need for true native UI components
- Complex animations requiring 60fps
- Heavy native integrations (AR, ML)
- Platform-specific UI patterns

#### Current React Native Structure

```
platforms/react-native/
├── src/
│   ├── App.tsx              # Root component
│   ├── screens/
│   │   ├── HomeScreen.tsx
│   │   ├── ChatScreen.tsx
│   │   ├── ChannelScreen.tsx
│   │   └── ...
│   ├── components/
│   │   ├── ChatList.tsx
│   │   ├── MessageBubble.tsx
│   │   └── ...
│   ├── navigation/
│   │   ├── RootNavigator.tsx
│   │   ├── TabNavigator.tsx
│   │   └── AuthNavigator.tsx
│   └── native/
│       ├── push-notifications.ts
│       ├── biometrics.ts
│       └── ...
```

#### React Native Build Commands

```bash
# iOS
cd platforms/react-native
npx react-native run-ios
npx react-native build-ios --mode Release

# Android
npx react-native run-android
cd android && ./gradlew assembleRelease
```

---

## Platform-Specific Features (Task 117)

### 1. Push Notifications

#### iOS (APNs)

**Setup**:

1. Enable Push Notifications capability in Xcode
2. Create APNs Key in Apple Developer Portal
3. Download `.p8` key file
4. Configure server with Key ID, Team ID

**Implementation** (Capacitor):

```typescript
// platforms/capacitor/src/native/push-notifications.ts
import { PushNotifications } from '@capacitor/push-notifications'

class PushNotificationService {
  async initialize(): Promise<void> {
    const permission = await PushNotifications.requestPermissions()
    if (permission.receive === 'granted') {
      await PushNotifications.register()
      this.setupListeners()
    }
  }

  private setupListeners(): void {
    PushNotifications.addListener('registration', (token) => {
      // Send token to backend
      this.sendTokenToServer(token.value)
    })

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      this.handleForegroundNotification(notification)
    })

    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      this.handleNotificationTapped(action.notification)
    })
  }
}
```

**Server Requirements**:

- APNs provider library (node-apn, PyAPNs2)
- Device token storage per user
- Payload formatting for iOS

#### Android (FCM)

**Setup**:

1. Create Firebase project
2. Add Android app with package name
3. Download `google-services.json`
4. Add Firebase SDK to project

**Implementation**:

```typescript
// Same Capacitor code works for both platforms
// FCM token is automatically retrieved on Android
```

**Server Requirements**:

- Firebase Admin SDK
- FCM API access
- Device token storage per user

#### Desktop (Native Notifications)

**Tauri**:

```rust
// platforms/tauri/src/notifications.rs
use tauri::notification::NotificationBuilder;

#[tauri::command]
pub fn show_notification(title: &str, body: &str) -> Result<(), String> {
    NotificationBuilder::new("nchat")
        .title(title)
        .body(body)
        .show()
        .map_err(|e| e.to_string())
}
```

**Electron**:

```typescript
// platforms/electron/main/notifications.ts
import { Notification } from 'electron'

export function showNotification(title: string, body: string): void {
  new Notification({
    title,
    body,
    icon: getAppIcon(),
    silent: !settings.notificationSound,
  }).show()
}
```

### 2. CallKit Integration (iOS)

CallKit provides native call UI for VoIP calls on iOS.

**Capabilities**:

- Native incoming call screen
- Integration with Phone app
- Call history in Recents
- Siri integration

**Setup**:

1. Add CallKit capability in Xcode
2. Implement CXProvider delegate
3. Configure audio session

**Implementation**:

```swift
// platforms/capacitor/ios/App/Plugins/CallKit/CallKitPlugin.swift
import CallKit

class CallManager: NSObject, CXProviderDelegate {
    private let provider: CXProvider
    private let callController = CXCallController()

    func reportIncomingCall(uuid: UUID, handle: String) {
        let update = CXCallUpdate()
        update.remoteHandle = CXHandle(type: .generic, value: handle)
        update.hasVideo = false

        provider.reportNewIncomingCall(with: uuid, update: update) { error in
            if let error = error {
                print("Failed to report incoming call: \(error)")
            }
        }
    }

    func providerDidReset(_ provider: CXProvider) {
        // Handle provider reset
    }
}
```

### 3. Biometric Authentication

#### Face ID / Touch ID (iOS)

```typescript
// platforms/capacitor/src/native/biometrics.ts
import { BiometricAuth } from '@aparajita/capacitor-biometric-auth'

export async function authenticate(): Promise<boolean> {
  const result = await BiometricAuth.checkBiometry()

  if (!result.isAvailable) {
    return false
  }

  try {
    await BiometricAuth.authenticate({
      reason: 'Verify your identity',
      cancelTitle: 'Cancel',
      iosFallbackTitle: 'Use Passcode',
    })
    return true
  } catch {
    return false
  }
}
```

#### Fingerprint (Android)

```typescript
// Same code works via Capacitor plugin
// Plugin handles platform detection automatically
```

#### Desktop (Windows Hello / Touch ID)

**Tauri** (via system keyring):

```rust
use keyring::Entry;

#[tauri::command]
pub fn store_credential(service: &str, user: &str, password: &str) -> Result<(), String> {
    let entry = Entry::new(service, user).map_err(|e| e.to_string())?;
    entry.set_password(password).map_err(|e| e.to_string())
}
```

### 4. Secure Storage

#### iOS (Keychain)

```typescript
// Using Capacitor Secure Storage
import { SecureStorage } from '@aparajita/capacitor-secure-storage'

export async function storeSecurely(key: string, value: string): Promise<void> {
  await SecureStorage.set(key, value)
}

export async function retrieveSecurely(key: string): Promise<string | null> {
  return SecureStorage.get(key)
}
```

**Options**:

- `kSecAttrAccessibleWhenUnlocked`
- `kSecAttrAccessibleAfterFirstUnlock`
- `kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly`

#### Android (Keystore)

```typescript
// Same Capacitor API works on Android
// Backed by Android Keystore system
```

#### Desktop

**Tauri**:

```rust
// Using system keyring (Keychain on macOS, Credential Manager on Windows)
use keyring::Entry;

pub fn get_auth_token(user_id: &str) -> Result<String, String> {
    let entry = Entry::new("nchat", user_id).map_err(|e| e.to_string())?;
    entry.get_password().map_err(|e| e.to_string())
}
```

**Electron**:

```typescript
import keytar from 'keytar'

export async function getAuthToken(userId: string): Promise<string | null> {
  return keytar.getPassword('nchat', userId)
}
```

### 5. Background Sync

#### iOS (Background App Refresh)

```typescript
// Configure in Info.plist
// UIBackgroundModes: fetch, remote-notification

import { App } from '@capacitor/app'

App.addListener('appStateChange', ({ isActive }) => {
  if (!isActive) {
    // App went to background - schedule sync
    schedulePendingMessages()
  }
})
```

**Silent Push** (for immediate sync):

```json
{
  "aps": {
    "content-available": 1
  },
  "action": "sync_messages"
}
```

#### Android (WorkManager)

```typescript
// Configure via Capacitor Background Task plugin
import { BackgroundTask } from '@capawesome/capacitor-background-task'

BackgroundTask.beforeExit(async () => {
  // Sync pending messages
  await syncPendingMessages()
  BackgroundTask.finish({ taskId })
})
```

---

## Build Pipelines

### GitHub Actions Matrix

```yaml
# .github/workflows/build-all-platforms.yml
name: Build All Platforms

on:
  release:
    types: [created]
  workflow_dispatch:

jobs:
  build-web:
    uses: ./.github/workflows/build-web.yml
    with:
      environment: production

  build-desktop:
    needs: [build-web]
    strategy:
      matrix:
        include:
          - platform: macos
            runner: macos-14
            framework: tauri
          - platform: windows
            runner: windows-latest
            framework: tauri
          - platform: linux
            runner: ubuntu-22.04
            framework: tauri
    runs-on: ${{ matrix.runner }}
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: dtolnay/rust-toolchain@stable
      - run: pnpm install --frozen-lockfile
      - run: pnpm tauri build

  build-mobile:
    needs: [build-web]
    strategy:
      matrix:
        include:
          - platform: ios
            runner: macos-14
          - platform: android
            runner: ubuntu-latest
    runs-on: ${{ matrix.runner }}
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: npx cap sync ${{ matrix.platform }}
      - name: Build iOS
        if: matrix.platform == 'ios'
        run: |
          cd platforms/capacitor/ios/App
          xcodebuild -workspace App.xcworkspace -scheme App archive
      - name: Build Android
        if: matrix.platform == 'android'
        run: |
          cd platforms/capacitor/android
          ./gradlew assembleRelease bundleRelease
```

### App Signing

#### iOS Code Signing

```yaml
# Required Secrets
# IOS_DIST_CERT: Base64 encoded .p12 certificate
# IOS_DIST_CERT_PASSWORD: Certificate password
# APPSTORE_ISSUER_ID: App Store Connect API issuer ID
# APPSTORE_KEY_ID: API key ID
# APPSTORE_PRIVATE_KEY: API private key

- name: Install Certificates
  uses: apple-actions/import-codesign-certs@v3
  with:
    p12-file-base64: ${{ secrets.IOS_DIST_CERT }}
    p12-password: ${{ secrets.IOS_DIST_CERT_PASSWORD }}

- name: Install Provisioning Profile
  uses: apple-actions/download-provisioning-profiles@v3
  with:
    bundle-id: 'io.nself.chat'
    issuer-id: ${{ secrets.APPSTORE_ISSUER_ID }}
    api-key-id: ${{ secrets.APPSTORE_KEY_ID }}
    api-private-key: ${{ secrets.APPSTORE_PRIVATE_KEY }}
```

#### Android Code Signing

```yaml
# Required Secrets
# ANDROID_KEYSTORE: Base64 encoded keystore file
# ANDROID_KEYSTORE_PASSWORD: Keystore password
# ANDROID_KEY_ALIAS: Key alias
# ANDROID_KEY_PASSWORD: Key password

- name: Decode Keystore
  run: |
    echo "${{ secrets.ANDROID_KEYSTORE }}" | base64 -d > release.keystore

- name: Build Release
  run: ./gradlew bundleRelease
  env:
    KEYSTORE_FILE: release.keystore
    KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
    KEY_ALIAS: ${{ secrets.ANDROID_KEY_ALIAS }}
    KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD }}
```

#### macOS Notarization

```yaml
- name: Notarize macOS App
  env:
    APPLE_ID: ${{ secrets.APPLE_ID }}
    APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_SPECIFIC_PASSWORD }}
    APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
  run: |
    xcrun notarytool submit nchat.dmg \
      --apple-id "$APPLE_ID" \
      --password "$APPLE_APP_SPECIFIC_PASSWORD" \
      --team-id "$APPLE_TEAM_ID" \
      --wait

    xcrun stapler staple nchat.dmg
```

### Store Submission

#### App Store (iOS)

```yaml
- name: Upload to App Store
  uses: apple-actions/upload-testflight-build@v1
  with:
    app-path: App.ipa
    issuer-id: ${{ secrets.APPSTORE_ISSUER_ID }}
    api-key-id: ${{ secrets.APPSTORE_KEY_ID }}
    api-private-key: ${{ secrets.APPSTORE_PRIVATE_KEY }}
```

#### Play Store (Android)

```yaml
- name: Upload to Play Store
  uses: r0adkll/upload-google-play@v1
  with:
    serviceAccountJsonPlainText: ${{ secrets.PLAY_SERVICE_ACCOUNT }}
    packageName: io.nself.chat
    releaseFiles: app/build/outputs/bundle/release/app-release.aab
    track: internal # internal, alpha, beta, production
```

---

## Shared Code Strategy

### Core Logic Sharing

```
src/
├── shared/                    # Shared across all platforms
│   ├── api/                   # GraphQL queries/mutations
│   │   ├── client.ts          # Apollo client factory
│   │   ├── queries/           # GraphQL queries
│   │   └── mutations/         # GraphQL mutations
│   ├── stores/                # Zustand stores
│   │   ├── auth-store.ts
│   │   ├── channel-store.ts
│   │   └── message-store.ts
│   ├── hooks/                 # Platform-agnostic hooks
│   │   ├── use-auth.ts
│   │   ├── use-channels.ts
│   │   └── use-messages.ts
│   ├── utils/                 # Utility functions
│   │   ├── date.ts
│   │   ├── format.ts
│   │   └── validation.ts
│   └── types/                 # TypeScript types
│       ├── user.ts
│       ├── channel.ts
│       └── message.ts
│
├── web/                       # Web-specific (Next.js)
│   ├── components/
│   ├── pages/
│   └── styles/
│
└── native/                    # Native-specific
    ├── capacitor/
    └── react-native/
```

### Platform Abstractions

```typescript
// src/shared/platform/index.ts
export interface PlatformService {
  // Storage
  getSecureItem(key: string): Promise<string | null>
  setSecureItem(key: string, value: string): Promise<void>
  removeSecureItem(key: string): Promise<void>

  // Notifications
  requestNotificationPermission(): Promise<boolean>
  showNotification(title: string, body: string, data?: any): Promise<void>

  // Biometrics
  isBiometricsAvailable(): Promise<boolean>
  authenticateWithBiometrics(): Promise<boolean>

  // Platform info
  getPlatform(): 'web' | 'ios' | 'android' | 'macos' | 'windows' | 'linux'
  getVersion(): string
}

// src/shared/platform/web.ts
export const webPlatform: PlatformService = {
  getPlatform: () => 'web',
  getSecureItem: async (key) => localStorage.getItem(key),
  setSecureItem: async (key, value) => localStorage.setItem(key, value),
  // ... web implementations
}

// src/shared/platform/capacitor.ts
export const capacitorPlatform: PlatformService = {
  getPlatform: () => Capacitor.getPlatform() as any,
  getSecureItem: async (key) => SecureStorage.get(key),
  setSecureItem: async (key, value) => SecureStorage.set(key, value),
  // ... native implementations
}
```

### Conditional Imports

```typescript
// src/shared/platform/factory.ts
import { PlatformService } from './index'

let platform: PlatformService

export async function getPlatform(): Promise<PlatformService> {
  if (platform) return platform

  if (typeof window !== 'undefined' && (window as any).Capacitor) {
    const { capacitorPlatform } = await import('./capacitor')
    platform = capacitorPlatform
  } else if (typeof window !== 'undefined' && (window as any).__TAURI__) {
    const { tauriPlatform } = await import('./tauri')
    platform = tauriPlatform
  } else if (typeof window !== 'undefined' && (window as any).electron) {
    const { electronPlatform } = await import('./electron')
    platform = electronPlatform
  } else {
    const { webPlatform } = await import('./web')
    platform = webPlatform
  }

  return platform
}
```

---

## Implementation Timeline

### Phase 1: Web Production (Week 1-2)

- [ ] Finalize Next.js production build configuration
- [ ] Set up Vercel/Netlify deployment
- [ ] Configure CDN and caching
- [ ] Environment variable management
- [ ] Performance optimization

### Phase 2: Desktop Builds (Week 3-4)

- [ ] Complete Tauri configuration for all platforms
- [ ] Implement auto-updater
- [ ] Set up code signing (macOS, Windows)
- [ ] Create desktop-specific features (tray, shortcuts)
- [ ] CI/CD for desktop releases

### Phase 3: Mobile Builds (Week 5-6)

- [ ] Finalize Capacitor configuration
- [ ] Implement push notifications (APNs, FCM)
- [ ] Add biometric authentication
- [ ] Configure app signing
- [ ] Set up Fastlane for automation

### Phase 4: Platform Features (Week 7-8)

- [ ] CallKit integration (iOS)
- [ ] Secure storage implementation
- [ ] Background sync
- [ ] Deep linking
- [ ] App review optimization

### Phase 5: Store Submission (Week 9-10)

- [ ] App Store submission (iOS)
- [ ] Play Store submission (Android)
- [ ] Create store listings
- [ ] Screenshot automation
- [ ] Review and iterate

---

## Security Considerations

### Code Signing Requirements

| Platform | Requirement                 | Cost       |
| -------- | --------------------------- | ---------- |
| macOS    | Developer ID Certificate    | $99/year   |
| Windows  | EV Code Signing Certificate | ~$400/year |
| iOS      | Apple Developer Program     | $99/year   |
| Android  | Keystore (self-signed)      | Free       |

### Security Best Practices

1. **Never commit**:
   - Private keys or certificates
   - Keystore files
   - API tokens or secrets
   - `.p8` APNs keys

2. **Use GitHub Secrets** for:
   - All signing credentials
   - API keys
   - Service account credentials

3. **Implement certificate pinning** for API calls

4. **Enable hardened runtime** on macOS

5. **Use ProGuard/R8** on Android for obfuscation

### Privacy Compliance

- GDPR consent for push notifications
- App Tracking Transparency (iOS 14.5+)
- Data collection disclosure in app stores
- Privacy policy updates for each platform

---

## Appendix

### Required GitHub Secrets

```
# Apple (iOS/macOS)
APPLE_ID
APPLE_APP_SPECIFIC_PASSWORD
APPLE_TEAM_ID
IOS_DIST_CERT
IOS_DIST_CERT_PASSWORD
APPSTORE_ISSUER_ID
APPSTORE_KEY_ID
APPSTORE_PRIVATE_KEY
APPLE_CERTIFICATE
APPLE_CERTIFICATE_PASSWORD
APPLE_SIGNING_IDENTITY

# Android
ANDROID_KEYSTORE
ANDROID_KEYSTORE_PASSWORD
ANDROID_KEY_ALIAS
ANDROID_KEY_PASSWORD
PLAY_SERVICE_ACCOUNT

# Tauri
TAURI_SIGNING_PRIVATE_KEY
TAURI_SIGNING_PRIVATE_KEY_PASSWORD

# Windows
WIN_CERTS
WIN_CERTS_PASSWORD

# Linux
GPG_PRIVATE_KEY
GPG_PASSPHRASE
```

### Useful Commands Reference

```bash
# Web
pnpm build                    # Build for production
pnpm build:analyze            # Analyze bundle

# Desktop (Tauri)
pnpm tauri dev                # Development mode
pnpm tauri build              # Production build
pnpm tauri build --debug      # Debug build

# Desktop (Electron)
pnpm electron:dev             # Development mode
pnpm electron:build           # Production build

# Mobile (Capacitor)
npx cap sync                  # Sync web assets
npx cap run ios               # Run on iOS
npx cap run android           # Run on Android
npx cap open ios              # Open in Xcode
npx cap open android          # Open in Android Studio

# iOS-specific
pnpm ios:build:debug          # Debug build
pnpm ios:build:release        # Release build
pnpm ios:pods                 # Install CocoaPods

# React Native
npx react-native run-ios      # Run on iOS
npx react-native run-android  # Run on Android
```

---

## References

- [Tauri Documentation](https://tauri.app/v2/guides/)
- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Electron Documentation](https://www.electronjs.org/docs)
- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [Apple Developer Documentation](https://developer.apple.com/documentation/)
- [Android Developer Documentation](https://developer.android.com/docs)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
