# Play Store Submission — ɳChat Android

## Status

🔒 BLOCKED — requires Google Play developer account ($25 one-time fee)

## Package Name

`com.nself.chat`

## Required Before Submission

1. Google Play developer account at https://play.google.com/console
2. `google-services.json` added to `platforms/mobile/android/app/`
3. Signed release keystore:
   - Generate: `keytool -genkey -v -keystore nchat-release.jks -alias nchat -keyalg RSA -keysize 2048 -validity 10000`
   - Store in GitHub secrets:
     - `ANDROID_KEYSTORE` — base64-encoded .jks file
     - `ANDROID_KEYSTORE_PASSWORD` — keystore password
     - `ANDROID_KEY_ALIAS` — key alias (nchat)
     - `ANDROID_KEY_PASSWORD` — key password
4. Content rating questionnaire completed in Play Console
5. Screenshots in `play-store/screenshots/` (see metadata.json for sizes needed)
6. Privacy policy URL accessible at https://nself.org/privacy

## FCM Setup

1. Create Firebase project at https://console.firebase.google.com
2. Add Android app with package `com.nself.chat`
3. Download `google-services.json` → place in `platforms/mobile/android/app/`
4. Store FCM server key in nself backend: `PLUGIN_NOTIFY_FCM_SERVER_KEY`

## Release Workflow

```bash
# Trigger from GitHub Actions:
# .github/workflows/android-build.yml → build_type=release, output_format=aab, deploy_playstore=true
```

Or locally:
```bash
cd frontend/platforms/mobile
pnpm build:android       # builds + opens Android Studio
# Then from Android Studio: Build → Generate Signed Bundle/APK
```

## Internal Testing Track

Use the `deploy-playstore.sh` script:
```bash
scripts/deploy-playstore.sh --aab path/to/app-release.aab --track internal
```

Requires `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` env var (service account with release manager role).
