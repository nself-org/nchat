# Compliance & Legal Features

Complete, production-ready compliance and legal management components for nself-chat.

## Components

### ComplianceDashboard.tsx

Central compliance management interface with:

- Real-time metrics and KPIs
- Alert system for compliance issues
- Tabbed interface for different compliance areas
- Overview of retention, legal holds, GDPR requests, and ToS

**Usage:**

```tsx
import { ComplianceDashboard } from "@/components/admin/compliance/ComplianceDashboard";

export default function CompliancePage() {
  return <ComplianceDashboard />;
}
```

### DataRetention.tsx

Comprehensive data retention policy management:

- Create/edit/delete retention policies
- Auto-delete scheduler configuration
- Channel and user exclusions
- Message type filtering
- Legal hold integration
- Policy validation and warnings

**Features:**

- 10 predefined retention periods (30 days to 7 years + forever + custom)
- 10 data categories (messages, files, audit logs, etc.)
- 9 message types for exclusion
- Channel-specific overrides
- Dry-run mode for testing
- Batch processing controls
- Weekend/holiday exclusions

**Usage:**

```tsx
import { DataRetention } from "@/components/admin/compliance/DataRetention";

export default function RetentionPage() {
  return <DataRetention />;
}
```

### AuditExport.tsx

Export audit logs and compliance data:

- Multiple export types (audit logs, users, channels, etc.)
- Multiple formats (JSON, CSV, ZIP)
- Date range filtering
- Progress tracking
- Auto-expiration after 7 days
- Download management

**Usage:**

```tsx
import { AuditExport } from "@/components/admin/compliance/AuditExport";

export default function ExportPage() {
  return <AuditExport />;
}
```

## Services

### retention-policy.ts

**Key Functions:**

```typescript
// Validation
validateRetentionPolicy(policy: Partial<RetentionPolicy>): PolicyValidationResult

// Calculations
calculateDeletionDate(createdAt: Date, policy: RetentionPolicy): Date | null
getDaysFromPeriod(period: RetentionPeriod): number | null
shouldRetainItem(item, policy, now?): boolean

// Policy creation
createDefaultPolicy(category: DataCategory, overrides?): RetentionPolicy
createChannelOverride(channelId, channelName, period, ...): ChannelRetentionOverride

// Auto-delete
createDefaultAutoDeleteConfig(): AutoDeleteConfig
calculateNextRunTime(config: AutoDeleteConfig): Date

// Execution
executeRetentionJob(policies, config, legalHolds): Promise<RetentionJobStatus>
isProtectedByLegalHold(item, legalHolds): boolean

// Statistics
generatePolicySummary(policies: RetentionPolicy[]): PolicySummary
```

**Example - Create Retention Policy:**

```typescript
import {
  createDefaultPolicy,
  validateRetentionPolicy,
} from "@/lib/compliance/retention-policy";

const policy = createDefaultPolicy("messages", {
  name: "Messages - 1 Year",
  description: "Delete messages older than 1 year",
  period: "1_year",
  excludePinnedMessages: true,
  excludeStarredMessages: true,
});

const validation = validateRetentionPolicy(policy);
if (!validation.valid) {
  console.error("Validation errors:", validation.errors);
}

if (validation.warnings.length > 0) {
  console.warn("Warnings:", validation.warnings);
}
```

**Example - Auto-Delete Configuration:**

```typescript
import {
  createDefaultAutoDeleteConfig,
  calculateNextRunTime,
} from "@/lib/compliance/retention-policy";

const config = createDefaultAutoDeleteConfig();
config.enabled = true;
config.scheduleTime = "02:00"; // 2 AM
config.dryRunMode = false; // Live mode
config.notifyAdmins = true;
config.excludeWeekends = true;
config.batchSize = 1000;
config.maxDeletionsPerRun = 100000;

const nextRun = calculateNextRunTime(config);
console.log("Next deletion run:", nextRun);
```

**Example - Check Item Retention:**

```typescript
import { shouldRetainItem } from "@/lib/compliance/retention-policy";

const message = {
  createdAt: new Date("2023-01-01"),
  type: "text",
  isPinned: false,
  isStarred: false,
  channelId: "channel-123",
};

const policy = {
  period: "1_year",
  excludePinnedMessages: true,
  excludeStarredMessages: true,
  channelOverrides: [],
};

const shouldKeep = shouldRetainItem(message, policy, new Date());
console.log("Should retain:", shouldKeep);
```

**Example - Legal Hold Protection:**

```typescript
import { isProtectedByLegalHold } from "@/lib/compliance/retention-policy";

const legalHolds = [
  {
    status: "active",
    custodians: ["user1", "user2"],
    channels: ["channel1"],
  },
];

const message = {
  userId: "user1",
  channelId: "channel1",
};

const isProtected = isProtectedByLegalHold(message, legalHolds);
if (isProtected) {
  console.log("Cannot delete - under legal hold");
}
```

### legal-hold.ts

**Key Functions:**

```typescript
// Creation and management
createLegalHold(createdBy: string, options): LegalHold
validateLegalHold(hold: Partial<LegalHold>): LegalHoldValidationResult
releaseLegalHold(hold: LegalHold, releasedBy: string): LegalHold

// Status
isHoldExpired(hold: LegalHold): boolean
getHoldStatusInfo(status): StatusInfo

// Custodians
addCustodians(hold, newCustodians): LegalHold
removeCustodians(hold, custodiansToRemove): LegalHold
isUserUnderLegalHold(userId, holds): { underHold, holds }
isChannelUnderLegalHold(channelId, holds): { underHold, holds }

// Notifications
createLegalHoldNotification(holdId, userId, type): LegalHoldNotification
acknowledgeNotification(notification): LegalHoldNotification
isReminderDue(hold, lastNotification?): boolean

// Email templates
generateLegalHoldNoticeEmail(hold, recipientName): { subject, body }
generateLegalHoldReleaseEmail(hold, recipientName): { subject, body }
generateLegalHoldReminderEmail(hold, recipientName): { subject, body }

// Statistics
calculateLegalHoldStatistics(holds): LegalHoldStatistics
```

**Example - Create Legal Hold:**

```typescript
import {
  createLegalHold,
  validateLegalHold,
} from "@/lib/compliance/legal-hold";

const hold = createLegalHold("admin-user-id", {
  name: "Discovery Hold - Smith Case",
  matterName: "Smith v. Jones",
  matterNumber: "2024-CV-12345",
  custodians: ["user1-id", "user2-id"],
  channels: ["channel1-id"],
  startDate: new Date(),
  endDate: new Date("2025-12-31"),
  preserveMessages: true,
  preserveFiles: true,
  preserveAuditLogs: true,
  notifyCustodians: true,
  notes: "Litigation hold for discovery",
});

const validation = validateLegalHold(hold);
if (!validation.valid) {
  console.error("Validation errors:", validation.errors);
}
```

**Example - Check Legal Hold Status:**

```typescript
import {
  isUserUnderLegalHold,
  isChannelUnderLegalHold,
} from "@/lib/compliance/legal-hold";

const legalHolds = [
  // ... active legal holds
];

// Check user
const userStatus = isUserUnderLegalHold("user123", legalHolds);
if (userStatus.underHold) {
  console.log(`User is under ${userStatus.holds.length} legal hold(s)`);
}

// Check channel
const channelStatus = isChannelUnderLegalHold("channel123", legalHolds);
if (channelStatus.underHold) {
  console.log("Channel is under legal hold");
}
```

**Example - Email Notifications:**

```typescript
import {
  generateLegalHoldNoticeEmail,
  generateLegalHoldReleaseEmail,
  generateLegalHoldReminderEmail,
} from "@/lib/compliance/legal-hold";

// Initiation notice
const notice = generateLegalHoldNoticeEmail(hold, "John Doe");
await sendEmail(custodian.email, notice.subject, notice.body);

// Reminder
const reminder = generateLegalHoldReminderEmail(hold, "John Doe");
await sendEmail(custodian.email, reminder.subject, reminder.body);

// Release notice
const release = generateLegalHoldReleaseEmail(hold, "John Doe");
await sendEmail(custodian.email, release.subject, release.body);
```

## Types

### compliance-types.ts

**Key Interfaces:**

```typescript
// Retention
RetentionPolicy;
RetentionPeriod;
DataCategory;
MessageType;
ChannelRetentionOverride;
AutoDeleteConfig;
RetentionJobStatus;

// Legal Holds
LegalHold;
LegalHoldNotification;

// GDPR
DataExportRequest;
ExportedUserData;
DataDeletionRequest;

// Consent
UserConsent;
ConsentConfig;
CookiePreferences;

// Privacy
PrivacySettings;

// Compliance
ComplianceReport;
ComplianceStandard;
ComplianceBadge;

// Audit
ComplianceAuditEntry;
ComplianceAction;
```

## Best Practices

### 1. Retention Policies

✅ **DO:**

- Set audit logs to 7 years for compliance
- Exclude pinned and starred messages
- Use channel overrides for sensitive channels
- Test with dry-run mode first
- Monitor retention job failures
- Document policy reasons

❌ **DON'T:**

- Set audit logs to less than 1 year
- Delete all message types indiscriminately
- Run live mode without testing
- Ignore legal holds
- Delete during business hours

### 2. Legal Holds

✅ **DO:**

- Document the legal matter thoroughly
- Notify custodians immediately
- Send regular reminders
- Verify acknowledgments
- Keep detailed notes
- Release promptly when appropriate

❌ **DON'T:**

- Create holds without legal justification
- Forget to notify custodians
- Release holds without legal approval
- Modify data under hold
- Delete hold records

### 3. GDPR Compliance

✅ **DO:**

- Respond within 30 days
- Verify user identity
- Export all requested data
- Use secure download links
- Auto-expire exports after 7 days
- Log all requests

❌ **DON'T:**

- Ignore GDPR requests
- Export without verification
- Keep exports indefinitely
- Share download links
- Delete data under legal hold

### 4. Audit Exports

✅ **DO:**

- Use appropriate format for purpose
- Filter by date range when possible
- Limit export scope
- Secure export files
- Track downloads
- Auto-delete expired exports

❌ **DON'T:**

- Export everything always
- Use insecure storage
- Share export links publicly
- Keep exports forever

## Security Considerations

### Access Control

- ✅ Only admins can manage policies
- ✅ Only admins can create legal holds
- ✅ Users can only export their own data
- ✅ All actions are audited
- ✅ Rate limiting on exports
- ✅ Identity verification required

### Data Protection

- ✅ Encrypt exports at rest and in transit
- ✅ Auto-delete after expiration
- ✅ Limit download attempts
- ✅ Secure file storage
- ✅ No permanent deletion under legal hold

### Audit Trail

- ✅ Log all policy changes
- ✅ Log all legal hold actions
- ✅ Log all export requests
- ✅ Log all deletion requests
- ✅ Tamper-proof audit logs

## Testing

Run tests:

```bash
# Unit tests
pnpm test src/lib/compliance/__tests__/retention-policy.test.ts

# Component tests
pnpm test src/components/admin/compliance

# Integration tests
pnpm test:integration compliance
```

## API Integration

### Required Endpoints

```typescript
// Retention Policies
POST   /api/admin/compliance/retention-policies
GET    /api/admin/compliance/retention-policies
GET    /api/admin/compliance/retention-policies/:id
PATCH  /api/admin/compliance/retention-policies/:id
DELETE /api/admin/compliance/retention-policies/:id
POST   /api/admin/compliance/retention-jobs/execute

// Legal Holds
POST   /api/admin/compliance/legal-holds
GET    /api/admin/compliance/legal-holds
GET    /api/admin/compliance/legal-holds/:id
PATCH  /api/admin/compliance/legal-holds/:id
POST   /api/admin/compliance/legal-holds/:id/release

// GDPR
POST   /api/compliance/export
GET    /api/compliance/export/:id
GET    /api/compliance/export/:id/download
POST   /api/compliance/deletion

// Audit
POST   /api/admin/compliance/audit-export
GET    /api/admin/compliance/audit-export/:id
GET    /api/admin/compliance/audit-export/:id/download
```

## Troubleshooting

### Common Issues

**Q: Retention job fails silently**

- Check legal holds aren't blocking deletion
- Verify policy is enabled
- Check batch size isn't too large
- Review error logs

**Q: Users not receiving legal hold notices**

- Verify email service is configured
- Check custodian email addresses
- Review notification settings
- Check spam filters

**Q: Export requests timing out**

- Reduce date range
- Limit data categories
- Check server resources
- Use ZIP format for large exports

**Q: Policies not being applied**

- Verify policy is enabled
- Check data category matches
- Verify no channel overrides
- Review exclusion settings

## Support

For issues or questions:

- Check documentation: `/docs/compliance/`
- Review tests: `/src/lib/compliance/__tests__/`
- See implementation: `COMPLIANCE-IMPLEMENTATION.md`
