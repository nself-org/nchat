# 2FA Library

Production-ready Two-Factor Authentication utilities for nchat.

## Quick Start

```typescript
import {
  generateTOTPSecret,
  generateQRCode,
  verifyTOTP,
  formatSecretForDisplay,
  getRemainingSeconds,
} from "@/lib/2fa/totp";

import {
  generateBackupCodes,
  hashBackupCode,
  verifyBackupCode,
  formatBackupCodesForDownload,
} from "@/lib/2fa/backup-codes";

import {
  getDeviceInfo,
  generateDeviceFingerprint,
  createDeviceRecord,
  getDeviceTrustExpiry,
} from "@/lib/2fa/device-fingerprint";
```

## TOTP (Time-based One-Time Password)

### Generate Secret

```typescript
const { secret, base32, otpauthUrl } = generateTOTPSecret({
  name: "user@example.com",
  issuer: "nchat",
});

// secret: ASCII encoded secret
// base32: Base32 encoded secret (for manual entry)
// otpauthUrl: otpauth:// URL for QR code
```

### Generate QR Code

```typescript
const qrCodeDataUrl = await generateQRCode(otpauthUrl);

// Returns: data:image/png;base64,iVBORw0KGgoAAAANS...
// Use in <img src={qrCodeDataUrl} />
```

### Verify TOTP Code

```typescript
const isValid = verifyTOTP("123456", secret);

// Returns: boolean
// Allows ±30 second time drift by default
```

### Generate Test Token

```typescript
// For testing only - generates current valid token
const token = generateTOTPToken(secret);
// Returns: "123456"
```

### Utility Functions

```typescript
// Format secret for display: "ABCD EFGH IJKL MNOP"
const displaySecret = formatSecretForDisplay(base32);

// Get seconds until next code refresh
const remaining = getRemainingSeconds(); // 0-30

// Validate secret format
const isValid = isValidTOTPSecret("JBSWY3DPEHPK3PXP");

// Get current time step (for debugging)
const timeStep = getCurrentTimeStep();
```

## Backup Codes

### Generate Codes

```typescript
const codes = generateBackupCodes(10);
// Returns: ["XXXX-XXXX", "YYYY-YYYY", ...]
```

### Hash Codes

```typescript
const hash = await hashBackupCode("XXXX-XXXX");
// Returns bcrypt hash: "$2a$10$..."
```

### Verify Codes

```typescript
const isValid = await verifyBackupCode("XXXX-XXXX", hash);
// Returns: boolean
```

### Generate and Hash

```typescript
const codes = await generateAndHashBackupCodes(10);
// Returns: [{ code: "XXXX-XXXX", hash: "$2a$10$..." }, ...]
```

### Format for Download

```typescript
const text = formatBackupCodesForDownload(codes, "user@example.com");

// Creates formatted text file content:
// nchat Backup Codes for user@example.com
// ========================================
// Generated: 2026-02-01
// ...
```

### Format for Print

```typescript
const html = formatBackupCodesForPrint(codes, "user@example.com");

// Creates printable HTML page
// Open in new window and trigger print dialog
```

### Utility Functions

```typescript
// Validate format
const isValid = isValidBackupCodeFormat("XXXX-XXXX");

// Format code
const formatted = formatBackupCode("XXXXXXXX"); // -> "XXXX-XXXX"

// Mask code
const masked = maskBackupCode("ABCD-1234"); // -> "****-1234"

// Count remaining codes
const remaining = countRemainingCodes(backupCodesFromDB);

// Check if regeneration needed
const shouldRegen = shouldRegenerateCodes(3); // true if <= 3
```

## Device Fingerprinting

### Get Device Info

```typescript
const info = getDeviceInfo()

// Returns:
{
  userAgent: "Mozilla/5.0...",
  platform: "MacIntel",
  language: "en-US",
  screenResolution: "1920x1080",
  timezone: "America/New_York",
  colorDepth: 24,
  deviceMemory: 8,
  hardwareConcurrency: 8,
  vendor: "Google Inc."
}
```

### Generate Fingerprint

```typescript
const deviceId = generateDeviceFingerprint(deviceInfo);
// Returns SHA-256 hash: "a1b2c3d4..."

// Or get current device
const currentDeviceId = getCurrentDeviceFingerprint();
```

### Get Device Name

```typescript
const name = getDeviceName();
// Returns: "Chrome on macOS 14.2"

const name = getDeviceName(customUserAgent);
// Custom user agent
```

### Get Device Type

```typescript
const type = getDeviceType();
// Returns: "desktop" | "mobile" | "tablet"
```

### Create Device Record

```typescript
const record = createDeviceRecord()

// Returns:
{
  deviceId: "a1b2c3d4...",
  deviceName: "Chrome on macOS 14.2",
  deviceType: "desktop",
  deviceInfo: { ... }
}
```

### Trust Management

```typescript
// Calculate expiry (30 days from now)
const expiryDate = getDeviceTrustExpiry(30);
// Returns ISO timestamp

// Check if expired
const isExpired = isDeviceTrustExpired(trustedUntil);

// Get days until expiry
const daysLeft = getDaysUntilExpiry(trustedUntil);
```

### Local Storage

```typescript
// Get or create local device ID
const deviceId = getLocalDeviceId();

// Check if device is trusted locally
const isTrusted = isDeviceTrustedLocally();

// Mark as trusted
markDeviceAsTrusted();

// Clear trust
clearDeviceTrust();
```

## Common Patterns

### Complete Setup Flow

```typescript
// 1. Generate secret and QR code
const { secret, base32, otpauthUrl } = generateTOTPSecret({
  name: email,
  issuer: "nchat",
});

const qrCodeDataUrl = await generateQRCode(otpauthUrl);
const manualEntryCode = formatSecretForDisplay(base32);

// 2. Generate backup codes
const backupCodes = generateBackupCodes(10);

// 3. Show QR code and backup codes to user
// ...

// 4. User enters TOTP code from their app
const userCode = "123456";
const isValid = verifyTOTP(userCode, secret);

if (isValid) {
  // 5. Hash backup codes for storage
  const hashedCodes = await Promise.all(
    backupCodes.map((code) => hashBackupCode(code)),
  );

  // 6. Save to database
  await saveToDatabase({
    userId,
    secret,
    backupCodes: hashedCodes,
  });
}
```

### Login Verification

```typescript
// 1. Check if device is trusted
const deviceId = getCurrentDeviceFingerprint();
const isTrusted = await checkDeviceTrust(userId, deviceId);

if (isTrusted) {
  // Skip 2FA
  return { success: true };
}

// 2. Get user's secret from database
const { secret, backupCodes } = await getUser2FASettings(userId);

// 3. Verify TOTP code
const userCode = "123456";
let isValid = verifyTOTP(userCode, secret);

// 4. If TOTP fails, try backup codes
if (!isValid && /^[A-F0-9]{4}-[A-F0-9]{4}$/i.test(userCode)) {
  for (const storedCode of backupCodes) {
    if (await verifyBackupCode(userCode, storedCode.hash)) {
      isValid = true;
      // Mark backup code as used
      await markBackupCodeAsUsed(storedCode.id);
      break;
    }
  }
}

// 5. If "remember device" was checked
if (isValid && rememberDevice) {
  const device = createDeviceRecord();
  await saveTrustedDevice({
    userId,
    deviceId: device.deviceId,
    deviceName: device.deviceName,
    trustedUntil: getDeviceTrustExpiry(30),
  });

  markDeviceAsTrusted();
}

return { success: isValid };
```

### Backup Code Management

```typescript
// Check if regeneration needed
const status = await get2FAStatus(userId);
if (shouldRegenerateCodes(status.backupCodes.unused)) {
  // Show warning: "Only X codes remaining"
}

// Regenerate codes
const newCodes = generateBackupCodes(10);
const hashedCodes = await Promise.all(
  newCodes.map((code) => hashBackupCode(code)),
);

// Delete old codes and insert new ones
await deleteAllBackupCodes(userId);
await insertBackupCodes(userId, hashedCodes);

// Show codes to user (one-time only)
const downloadText = formatBackupCodesForDownload(newCodes, email);
```

## Error Handling

```typescript
try {
  const isValid = verifyTOTP(code, secret);
  if (!isValid) {
    throw new Error("Invalid verification code");
  }
} catch (error) {
  // Common errors:
  // - Invalid code format
  // - Code expired (clock drift)
  // - Wrong secret
  console.error("TOTP verification failed:", error);
}

try {
  const hash = await hashBackupCode(code);
} catch (error) {
  // Bcrypt errors (rare)
  console.error("Hashing failed:", error);
}

try {
  const device = getDeviceInfo();
} catch (error) {
  // Browser API not available (SSR, old browser)
  console.error("Device info unavailable:", error);
}
```

## Security Notes

### TOTP

- ✅ Uses industry-standard RFC 6238
- ✅ 32-byte secret (256 bits of entropy)
- ✅ 30-second time window
- ✅ ±1 step time drift tolerance (±30 seconds)
- ⚠️ Requires accurate system clock
- ⚠️ Secret must be transmitted securely (HTTPS)

### Backup Codes

- ✅ Bcrypt hashing (10 rounds)
- ✅ Single-use (invalidated after use)
- ✅ 8-character hex codes (16^8 combinations)
- ⚠️ User responsible for secure storage
- ⚠️ Generate new codes if < 3 remaining

### Device Fingerprinting

- ✅ Multiple signals for uniqueness
- ✅ SHA-256 hashing
- ⚠️ Can be spoofed by determined attacker
- ⚠️ Changes if browser/OS updates
- ⚠️ Not suitable as sole security measure

## Performance

| Operation             | Time            |
| --------------------- | --------------- |
| Generate TOTP secret  | <1ms            |
| Generate QR code      | ~50ms           |
| Verify TOTP code      | <1ms            |
| Generate backup codes | <1ms            |
| Hash backup code      | ~100ms (bcrypt) |
| Verify backup code    | ~100ms (bcrypt) |
| Generate fingerprint  | <10ms           |

## Testing

```typescript
import { generateTestTOTPSetup, generateTOTPToken } from "@/lib/2fa/totp";

// Generate complete test setup
const setup = await generateTestTOTPSetup("test@example.com");
// Returns: { secret, qrCode, currentToken, ... }

// Generate valid token for testing
const validToken = generateTOTPToken(secret);

// Test verification
expect(verifyTOTP(validToken, secret)).toBe(true);
```

## Dependencies

```json
{
  "speakeasy": "^2.0.0", // TOTP implementation
  "qrcode": "^1.5.4", // QR code generation
  "bcryptjs": "^2.4.3", // Hashing (isomorphic)
  "crypto": "built-in" // Node.js crypto module
}
```

## See Also

- [2FA Implementation Guide](/docs/2FA-Implementation.md)
- [API Documentation](/docs/API.md#2fa-endpoints)
- [Security Best Practices](/docs/Security.md)
