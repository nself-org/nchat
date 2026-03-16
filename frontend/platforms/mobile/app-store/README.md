# App Store Submission — ɳChat iOS

## Status

🔒 BLOCKED — requires Apple Developer account ($99/yr) + signed certificates

## Bundle ID

`com.nself.chat`

## Required Before Submission

1. Apple Developer account at https://developer.apple.com
2. App ID created in Developer Portal with:
   - Push Notifications capability
   - Background Modes: Voice over IP
3. Distribution certificate (`.p12`) + provisioning profile
4. Store secrets in GitHub:
   - `IOS_DIST_CERT` — base64 p12
   - `IOS_DIST_CERT_PASSWORD` — p12 password
   - `PROVISIONING_PROFILE` — base64 provisioning profile
   - `APPLE_TEAM_ID` — 10-character team ID
   - `APPSTORE_ISSUER_ID` — App Store Connect API issuer
   - `APPSTORE_KEY_ID` — API key ID
   - `APPSTORE_PRIVATE_KEY` — API private key (.p8 content)
5. Screenshots in `app-store/screenshots/` (see metadata.json for sizes needed)

## Metadata

See `metadata.json` for:
- App description (en-US)
- Keywords
- Age rating answers
- Review notes (demo account + backend URL for reviewer)
- Screenshot file names

## Release Workflow

```bash
# Trigger from GitHub Actions:
# .github/workflows/ios-build.yml → build_type=release, deploy_testflight=true
```

Or locally:
```bash
cd frontend/platforms/mobile
pnpm build:ios          # builds + opens Xcode
# Then from Xcode: Product → Archive → Distribute App → App Store Connect
```

## TestFlight

Use the `deploy-testflight.sh` script (triggered by ios-build.yml):
```bash
scripts/deploy-testflight.sh --ipa path/to/App.ipa
```

Requires `APPLE_ID`, `APPLE_PASSWORD` (app-specific password), `APPLE_TEAM_ID` env vars.
