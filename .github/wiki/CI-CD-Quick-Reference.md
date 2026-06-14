# CI/CD Quick Reference

Quick commands and cheatsheet for nself-chat CI/CD system.

## Common Commands

### Release Management

```bash
# Create a new release
gh workflow run release-v080.yml -f version=0.8.0 -f version_type=minor

# Or use tag
git tag v0.8.0 && git push origin v0.8.0

# Generate changelog manually
./scripts/generate-changelog.sh 0.8.0

# Bump version manually
./scripts/version-bump.sh 0.8.0
```

### Platform Builds

```bash
# iOS
gh workflow run ios-build.yml -f build_type=release -f deploy_testflight=true

# Android
gh workflow run android-build.yml -f build_type=release -f output_format=aab -f deploy_playstore=true

# Desktop (all platforms)
gh workflow run desktop-build.yml -f platform=all -f framework=electron

# Desktop (macOS only)
gh workflow run desktop-build.yml -f platform=macos -f framework=electron
```

### Testing

```bash
# Run all checks locally
pnpm lint && pnpm type-check && pnpm test && pnpm build

# Run specific checks
pnpm lint              # ESLint
pnpm lint:fix          # Auto-fix lint issues
pnpm format            # Format code
pnpm format:check      # Check formatting
pnpm type-check        # TypeScript
pnpm test              # Unit tests
pnpm test:coverage     # With coverage
pnpm test:e2e          # E2E tests
```

### Monitoring

```bash
# Watch workflow run
gh run watch

# List recent runs
gh run list

# View workflow status
gh workflow view release-v080.yml

# Download artifacts
gh run download <run-id>
```

---

## Required Secrets

### iOS/macOS

```
APPLE_ID
APPLE_PASSWORD / APPLE_APP_SPECIFIC_PASSWORD
APPLE_TEAM_ID
CERTIFICATES_P12
CERTIFICATES_PASSWORD
PROVISIONING_PROFILE
MAC_CERTS
MAC_CERTS_PASSWORD
```

### Android

```
KEYSTORE_FILE
KEYSTORE_PASSWORD
KEY_ALIAS
KEY_PASSWORD
PLAY_STORE_JSON_KEY
```

### Desktop

```
WIN_CERTS (Windows)
WIN_CSC_KEY_PASSWORD (Windows)
GPG_PRIVATE_KEY (Linux)
GPG_PASSPHRASE (Linux)
```

### Notifications

```
SLACK_WEBHOOK_URL
SENDGRID_API_KEY (optional)
RELEASE_EMAIL_TO (optional)
```

---

## Workflows Trigger Matrix

| Workflow      | Push (main) | Push (develop) | PR  | Tag | Manual |
| ------------- | ----------- | -------------- | --- | --- | ------ |
| PR Checks     | ❌          | ❌             | ✅  | ❌  | ❌     |
| iOS Build     | ✅          | ✅             | ✅  | ❌  | ✅     |
| Android Build | ✅          | ✅             | ✅  | ❌  | ✅     |
| Desktop Build | ✅          | ✅             | ✅  | ❌  | ✅     |
| Release       | ❌          | ❌             | ❌  | ✅  | ✅     |

---

## Build Caching

### Cache Keys

```yaml
# pnpm
${{ runner.os }}-pnpm-${{ hashFiles('**/pnpm-lock.yaml') }}

# Gradle
${{ runner.os }}-gradle-${{ hashFiles('**/*.gradle*') }}

# CocoaPods
${{ runner.os }}-pods-${{ hashFiles('**/Podfile.lock') }}

# Electron
${{ runner.os }}-electron-${{ hashFiles('platforms/electron/package.json') }}

# Rust/Tauri
rust-cache (automatic via Swatinem/rust-cache)
```

### Clear Cache

```bash
# List caches
gh cache list

# Delete specific cache
gh cache delete <cache-key>

# Delete all caches
gh cache list | awk '{print $2}' | xargs -I {} gh cache delete {}
```

---

## Conventional Commits

Format: `<type>(<scope>): <description>`

### Types

| Type       | Description             | Changelog Section |
| ---------- | ----------------------- | ----------------- |
| `feat`     | New feature             | ✨ Features       |
| `fix`      | Bug fix                 | 🐛 Bug Fixes      |
| `perf`     | Performance improvement | ⚡ Performance    |
| `security` | Security fix            | 🔒 Security       |
| `docs`     | Documentation           | 📚 Documentation  |
| `refactor` | Code refactoring        | ♻️ Refactoring    |
| `test`     | Test changes            | 🧪 Tests          |
| `build`    | Build system            | 🔨 Build          |
| `ci`       | CI/CD changes           | 👷 CI/CD          |
| `chore`    | Maintenance             | (Other)           |

### Examples

```bash
git commit -m "feat(auth): add OAuth2 support"
git commit -m "fix(chat): resolve message ordering issue"
git commit -m "perf(search): optimize search algorithm"
git commit -m "security(api): add rate limiting"
git commit -m "docs(readme): update installation guide"
```

### Breaking Changes

```bash
git commit -m "feat(api): redesign authentication API

BREAKING CHANGE: Authentication endpoints now require OAuth2"
```

---

## Deployment Scripts

### iOS TestFlight

```bash
# Deploy to TestFlight
./scripts/deploy-testflight.sh \
  --ipa platforms/capacitor/ios/build/ipa/App.ipa \
  --beta-group "Internal Testers" \
  --notify

# Environment variables required
export APPLE_ID="developer@example.com"
export APPLE_PASSWORD="xxxx-xxxx-xxxx-xxxx"
```

### Android Play Store

```bash
# Deploy to Play Store
./scripts/deploy-playstore.sh \
  --track internal \
  --rollout 50 \
  --aab platforms/capacitor/android/app/build/outputs/bundle/release/app-release.aab

# Tracks: internal, alpha, beta, production
# Rollout: 1-100 (percentage)

# Environment variables required
export PLAY_STORE_JSON_KEY="<base64-encoded-json>"
```

### Desktop Signing

```bash
# Sign macOS app
./scripts/sign-desktop.sh macos dist/nchat.app
export CSC_LINK="<base64-p12>"
export CSC_KEY_PASSWORD="password"

# Notarize macOS app
./scripts/notarize-macos.sh dist/nchat.dmg
export APPLE_ID="developer@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="XXXXXXXXXX"

# Sign Windows app
./scripts/sign-desktop.sh windows dist/nchat.exe
export WIN_CSC_LINK="<base64-pfx>"
export WIN_CSC_KEY_PASSWORD="password"

# Sign Linux app
./scripts/sign-desktop.sh linux dist/nchat.AppImage
export GPG_PRIVATE_KEY="<base64-gpg-key>"
export GPG_PASSPHRASE="passphrase"
```

---

## Troubleshooting

### Build Failures

```bash
# Re-run failed jobs
gh run rerun <run-id> --failed

# View logs
gh run view <run-id> --log

# Download logs
gh run view <run-id> --log > build.log
```

### Certificate Issues

```bash
# Validate iOS certificate
security find-identity -v -p codesigning

# Check provisioning profile
security cms -D -i profile.mobileprovision

# Verify Android keystore
keytool -list -v -keystore nchat-release.jks
```

### Workflow Issues

```bash
# Validate workflow syntax
gh workflow view <workflow-name>

# List workflow runs
gh run list --workflow=<workflow-name>

# Cancel running workflow
gh run cancel <run-id>
```

---

## Performance Tips

1. **Use caching**:
   - pnpm cache: ~2 min saved
   - Gradle cache: ~3 min saved
   - CocoaPods cache: ~5 min saved
   - Electron cache: ~1 min saved

2. **Parallelize builds**:
   - iOS + Android + Desktop in parallel
   - Multiple desktop platforms in parallel
   - Separate lint/test/build jobs

3. **Skip unnecessary builds**:
   - Use path filters
   - Skip CI: `[skip ci]` in commit message
   - Skip specific workflows: `[skip ios]`, `[skip android]`

4. **Optimize dependencies**:
   - Use `--frozen-lockfile`
   - Minimize devDependencies
   - Use lighter alternatives

---

## Android Debug Build CI

The `android-build` job in `ci.yml` runs on every push to `main` or `develop` and on pull requests.

**Stack:** Capacitor + Next.js web assets compiled into an Android APK.
**Runner:** `ubuntu-latest` · **Java:** 17 (Temurin) · **No signing secrets required.**

What the job does:
1. Installs Node.js + pnpm dependencies.
2. Builds Next.js web assets (`pnpm build`) with dev-auth env vars (no real backend needed).
3. Runs `cap sync android` to generate the native Android project under `frontend/platforms/mobile/android/`.
4. Runs `./gradlew assembleDebug --no-daemon` to produce the debug APK.

**Trigger:** Automatic on `push`/`pull_request` via the top-level `ci.yml` trigger.

**Release / signed APK:** handled by `deploy-mobile-android.yml` (requires Play Store secrets, not in `ci.yml`).

## Quick Links

- [Full CI/CD Documentation](./CI-CD-Setup.md)
- [GitHub Actions](https://github.com/nself-chat/actions)
- [Releases](https://github.com/nself-chat/releases)
- [Issues](https://github.com/nself-chat/issues)

---

**Version**: 0.8.0 | **Last Updated**: 2026-01-31
