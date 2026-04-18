# Installation Guide - ɳChat v0.8.0

Complete installation instructions for all platforms: Web, iOS, Android, and Desktop.

---

## Table of Contents

- [Web Application](#web-application)
- [Mobile Apps (iOS & Android)](#mobile-apps)
  - [iOS Installation](#ios-installation)
  - [Android Installation](#android-installation)
- [Desktop Apps](#desktop-apps)
  - [Electron (Windows, macOS, Linux)](#electron)
  - [Tauri (Alternative)](#tauri)
- [Backend Setup](#backend-setup)
- [Troubleshooting](#troubleshooting)

---

## Web Application

### Prerequisites

- Node.js 20.0.0 or higher
- pnpm 9.15.4 or higher
- Docker (optional, for backend services)

### Installation Steps

1. **Clone the repository:**

   ```bash
   git clone https://github.com/nself-org/nchat.git
   cd nself-chat
   ```

2. **Install dependencies:**

   ```bash
   pnpm install
   ```

3. **Configure environment variables:**

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` with your configuration:

   ```bash
   # Backend URLs (if using nself CLI backend)
   NEXT_PUBLIC_GRAPHQL_URL=http://api.localhost/v1/graphql
   NEXT_PUBLIC_AUTH_URL=http://auth.localhost/v1/auth
   NEXT_PUBLIC_STORAGE_URL=http://storage.localhost/v1/storage

   # Development mode with test users
   NEXT_PUBLIC_USE_DEV_AUTH=true
   NEXT_PUBLIC_ENV=development

   # Optional: Sentry error tracking
   NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
   ```

4. **Start the development server:**

   ```bash
   pnpm dev
   ```

5. **Open your browser:**
   Navigate to http://localhost:3000

6. **Complete the setup wizard:**
   Follow the 12-step guided setup to configure your instance.

### Production Build

```bash
# Build for production
pnpm build

# Start production server
pnpm start
```

### Docker Deployment

```bash
# Build Docker image
docker build -t nself-chat:latest .

# Run container
docker run -p 3000:3000 nself-chat:latest
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment guides.

---

## Mobile Apps

### Prerequisites

**General Requirements:**

- Node.js 20.0.0+
- pnpm 9.15.4+
- Capacitor CLI 6.x

**iOS Requirements:**

- macOS (required for iOS development)
- Xcode 15.0 or later
- CocoaPods 1.10 or later
- iOS 14.0+ deployment target
- Apple Developer account (for device testing and App Store)

**Android Requirements:**

- Android Studio Hedgehog (2023.1.1) or later
- Android SDK API 34
- Java JDK 17
- Gradle 8.0+

### Initial Setup

1. **Build the web application:**

   ```bash
   pnpm build
   ```

2. **Navigate to Capacitor directory:**

   ```bash
   cd platforms/capacitor
   ```

3. **Install Capacitor dependencies:**
   ```bash
   pnpm install
   ```

---

## iOS Installation

### 1. Add iOS Platform

```bash
cd platforms/capacitor
npx cap add ios
```

### 2. Configure iOS Project

1. **Open the project in Xcode:**

   ```bash
   pnpm run open:ios
   ```

2. **Configure signing:**
   - Select the `App` target
   - Go to "Signing & Capabilities"
   - Select your development team
   - Enable "Automatically manage signing"

3. **Set Bundle ID:**
   - Change Bundle Identifier to your unique ID (e.g., `com.yourcompany.nchat`)
   - Must match your Apple Developer account

### 3. Enable Capabilities

In Xcode, add the following capabilities:

1. **Push Notifications:**
   - Click "+ Capability"
   - Add "Push Notifications"

2. **Background Modes:**
   - Add "Background Modes"
   - Enable:
     - Remote notifications
     - Background fetch
     - Voice over IP (for calls)
     - Audio (for voice messages)

3. **Associated Domains** (for deep linking):
   - Add "Associated Domains"
   - Add: `applinks:nchat.yourdomain.com`

### 4. Configure Firebase (Optional but Recommended)

1. **Create Firebase project:**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Create a new project

2. **Add iOS app:**
   - Bundle ID: Your iOS bundle identifier
   - Download `GoogleService-Info.plist`

3. **Add to Xcode:**

   ```bash
   cp GoogleService-Info.plist platforms/capacitor/ios/App/App/
   ```

4. **Install pods:**
   ```bash
   cd platforms/capacitor/ios/App
   pod install
   ```

### 5. Configure Push Notifications (APNs)

1. **Create APNs Key:**
   - Go to [Apple Developer Portal](https://developer.apple.com)
   - Certificates, Identifiers & Profiles → Keys
   - Create new key with "Apple Push Notifications service (APNs)"
   - Download `.p8` file
   - Note the Key ID and Team ID

2. **Upload to Firebase:**
   - In Firebase Console, go to Project Settings → Cloud Messaging
   - Upload APNs key (.p8 file)
   - Enter Key ID and Team ID

### 6. Generate App Icons

```bash
cd platforms/capacitor
npx @capacitor/assets generate --ios
```

Or manually add icons to `ios/App/App/Assets.xcassets/AppIcon.appiconset/`

### 7. Build and Run

**Run on Simulator:**

```bash
pnpm run run:ios
```

**Run on Device:**

```bash
pnpm run run:ios -- --device
```

**Build for Release:**

```bash
pnpm run build:ios
```

### 8. App Store Submission

See [platforms/capacitor/fastlane/README.md](./INSTALL.md) for automated build and deployment with Fastlane.

---

## Android Installation

### 1. Add Android Platform

```bash
cd platforms/capacitor
npx cap add android
```

### 2. Configure Android Project

1. **Open the project in Android Studio:**

   ```bash
   pnpm run open:android
   ```

2. **Wait for Gradle sync to complete**

3. **Update package name** (if needed):
   - In `android/app/build.gradle`:
     ```gradle
     defaultConfig {
         applicationId "com.yourcompany.nchat"
         // ...
     }
     ```

### 3. Configure Firebase (Required for Push Notifications)

1. **Create Firebase project** (if not already done)

2. **Add Android app:**
   - Package name: `com.yourcompany.nchat` (or your package name)
   - Download `google-services.json`

3. **Add to project:**

   ```bash
   cp google-services.json platforms/capacitor/android/app/
   ```

4. **Sync Gradle:**
   ```bash
   cd platforms/capacitor/android
   ./gradlew clean build
   ```

### 4. Configure Deep Linking

1. **Create `assetlinks.json`** on your server:

   ```
   https://nchat.yourdomain.com/.well-known/assetlinks.json
   ```

   Content:

   ```json
   [
     {
       "relation": ["delegate_permission/common.handle_all_urls"],
       "target": {
         "namespace": "android_app",
         "package_name": "com.yourcompany.nchat",
         "sha256_cert_fingerprints": ["YOUR_SHA256_FINGERPRINT"]
       }
     }
   ]
   ```

2. **Get SHA256 fingerprint:**
   ```bash
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
   ```

### 5. Configure Signing (for Release Builds)

1. **Generate keystore:**

   ```bash
   keytool -genkey -v -keystore nchat-release.keystore -alias nchat -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **Create `keystore.properties`:**

   ```bash
   cd platforms/capacitor/android
   nano keystore.properties
   ```

   Content:

   ```properties
   storeFile=/path/to/nchat-release.keystore
   storePassword=YOUR_STORE_PASSWORD
   keyAlias=nchat
   keyPassword=YOUR_KEY_PASSWORD
   ```

### 6. Generate App Icons

```bash
cd platforms/capacitor
npx @capacitor/assets generate --android
```

Or manually add icons to `android/app/src/main/res/mipmap-*/`

### 7. Build and Run

**Run on Emulator/Device:**

```bash
pnpm run run:android
```

**Build Debug APK:**

```bash
cd platforms/capacitor/android
./gradlew assembleDebug
```

**Build Release APK:**

```bash
./gradlew assembleRelease
```

**Build Release Bundle (for Play Store):**

```bash
pnpm run build:android:bundle
```

### 8. Play Store Submission

See [platforms/capacitor/fastlane/README.md](./INSTALL.md) for automated build and deployment with Fastlane.

---

## Desktop Apps

### Electron

Electron apps work on Windows, macOS, and Linux.

#### Prerequisites

- Node.js 20.0.0+
- pnpm 9.15.4+
- Platform-specific build tools:
  - **Windows**: Visual Studio Build Tools
  - **macOS**: Xcode Command Line Tools
  - **Linux**: `build-essential` package

#### Installation

1. **Install dependencies:**

   ```bash
   pnpm install
   ```

2. **Build web assets:**

   ```bash
   pnpm build
   ```

3. **Start Electron in development:**
   ```bash
   pnpm electron:dev
   ```

#### Building for Distribution

**Build for current platform:**

```bash
pnpm electron:build
```

**Build for all platforms:**

```bash
pnpm build:electron
```

**Build for specific platform:**

```bash
# Windows
pnpm electron:build --win

# macOS
pnpm electron:build --mac

# Linux
pnpm electron:build --linux
```

#### Distribution

Built apps will be in `dist/electron/`:

- **Windows**: `.exe` installer
- **macOS**: `.dmg` installer
- **Linux**: `.AppImage`, `.deb`, or `.rpm`

---

### Tauri

Tauri is a lightweight alternative to Electron using Rust and native webviews.

#### Prerequisites

- Node.js 20.0.0+
- pnpm 9.15.4+
- Rust 1.70+ (`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`)
- Platform-specific build tools:
  - **Windows**: Microsoft Visual Studio C++ Build Tools
  - **macOS**: Xcode Command Line Tools
  - **Linux**: `libwebkit2gtk-4.0-dev`, `build-essential`, `curl`, `wget`, `libssl-dev`, `libgtk-3-dev`

#### Installation

1. **Install dependencies:**

   ```bash
   pnpm install
   ```

2. **Build web assets:**

   ```bash
   pnpm build
   ```

3. **Start Tauri in development:**
   ```bash
   pnpm tauri:dev
   ```

#### Building for Distribution

**Build for current platform:**

```bash
pnpm tauri:build
```

Built apps will be in `src-tauri/target/release/bundle/`:

- **Windows**: `.msi` installer
- **macOS**: `.dmg` or `.app`
- **Linux**: `.deb`, `.AppImage`

---

## Backend Setup

ɳChat requires a backend powered by nself CLI.

### Option 1: Use Development Mode (Quickest)

Set `NEXT_PUBLIC_USE_DEV_AUTH=true` in `.env.local` to use the built-in development authentication with 8 test users.

No backend required for basic testing!

### Option 2: nself CLI Backend (Recommended)

1. **Install nself CLI:**

   ```bash
   npm install -g @nself/cli
   ```

2. **Initialize backend:**

   ```bash
   cd .backend
   nself init --demo
   ```

3. **Start services:**

   ```bash
   nself start
   ```

4. **Verify services:**

   ```bash
   nself status
   nself urls
   ```

5. **Update `.env.local`:**
   ```bash
   NEXT_PUBLIC_GRAPHQL_URL=http://api.localhost/v1/graphql
   NEXT_PUBLIC_AUTH_URL=http://auth.localhost/v1/auth
   NEXT_PUBLIC_STORAGE_URL=http://storage.localhost/v1/storage
   NEXT_PUBLIC_USE_DEV_AUTH=false
   ```

See [nself CLI documentation](https://nself.org/docs) for advanced configuration.

---

## Troubleshooting

### Web App

**Issue: Port 3000 already in use**

```bash
# Use a different port
pnpm dev -- -p 3001
```

**Issue: Module not found errors**

```bash
# Clear cache and reinstall
rm -rf node_modules .next
pnpm install
```

### iOS

**Issue: CocoaPods errors**

```bash
cd platforms/capacitor/ios/App
pod deintegrate
pod install --repo-update
```

**Issue: Build fails in Xcode**

- Clean build folder: Product → Clean Build Folder
- Update signing certificates
- Check Xcode version (15.0+)

**Issue: App crashes on launch**

- Check Firebase configuration
- Verify GoogleService-Info.plist is added
- Check console logs in Xcode

### Android

**Issue: Gradle sync failed**

```bash
cd platforms/capacitor/android
./gradlew clean
./gradlew --stop
./gradlew build
```

**Issue: Build fails**

- Update Android SDK to API 34
- Check Java version (should be 17)
- Invalidate caches: File → Invalidate Caches / Restart

**Issue: App crashes on launch**

- Check Firebase configuration
- Verify google-services.json is added
- Check Logcat for errors

### Desktop (Electron)

**Issue: Electron fails to start**

```bash
# Rebuild native modules
pnpm rebuild
```

**Issue: Build fails**

- Check platform-specific build tools are installed
- Try building for current platform only first

### Desktop (Tauri)

**Issue: Rust compilation errors**

```bash
# Update Rust
rustup update

# Clean build
cd src-tauri
cargo clean
```

**Issue: Missing system dependencies (Linux)**

```bash
# Ubuntu/Debian
sudo apt-get install libwebkit2gtk-4.0-dev build-essential curl wget libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev

# Fedora
sudo dnf install webkit2gtk3-devel openssl-devel curl wget gtk3-devel libappindicator-gtk3-devel librsvg2-devel
```

### Backend (nself CLI)

**Issue: Services won't start**

```bash
# Check Docker is running
docker ps

# Check logs
nself logs

# Restart services
nself stop
nself start
```

**Issue: Port conflicts**

- Check if ports 3000, 4000, 5432, 8080 are available
- Modify ports in `.backend/.env`

---

## Platform-Specific Notes

### iOS

- **Minimum iOS version**: 14.0
- **Requires macOS**: iOS development only possible on macOS
- **Code signing**: Required for device testing and App Store
- **Push notifications**: Requires APNs certificate and Firebase setup
- **App Store review**: Can take 1-3 days

### Android

- **Minimum Android version**: API 24 (Android 7.0)
- **Works on all platforms**: Windows, macOS, Linux
- **Play Store review**: Usually 1-7 days
- **Testing**: Use Firebase Test Lab for device testing

### Desktop

- **Electron**:
  - Larger app size (100-200MB)
  - Includes Chromium
  - Better compatibility

- **Tauri**:
  - Smaller app size (5-15MB)
  - Uses system webview
  - Faster startup
  - Requires more setup

---

## Next Steps

After installation:

1. **Web**: Complete the setup wizard at http://localhost:3000
2. **Mobile**: Test on simulators/emulators before devices
3. **Desktop**: Test app on target platforms
4. **Backend**: Configure production backend with nself CLI
5. **Deploy**: Follow [DEPLOYMENT.md](DEPLOYMENT.md) for production deployment

---

## Support

Need help?

- **Documentation**: https://github.com/nself-org/nchat/tree/main/docs
- **Issues**: https://github.com/nself-org/nchat/issues
- **Discussions**: https://github.com/nself-org/nchat/discussions
- **nself CLI Docs**: https://nself.org/docs

---

**Version**: 0.8.0
**Last Updated**: February 1, 2026
