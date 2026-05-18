# Reporting & Flagging System

Complete production-ready reporting and moderation system for nself-chat.

## Overview

The Reporting & Flagging System provides comprehensive content and user reporting capabilities with:

- **Universal Reporting** - Report users, messages, and channels
- **Category-Based Classification** - Pre-defined report categories with priority levels
- **Evidence Collection** - Attach links, screenshots, and text evidence
- **Moderation Queue** - Admin/moderator interface for processing reports
- **Action Workflows** - Approve, dismiss, escalate, warn, mute, or ban
- **Auto-Escalation** - Automatic priority escalation for serious violations
- **Notification System** - Real-time notifications for moderators and reporters
- **Audit Trail** - Complete history of all actions and decisions

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User Interface                        │
├─────────────────────────────────────────────────────────────┤
│  ReportModal          │  ReportQueue  │  ReportMessageModal │
│  (Submit reports)     │  (Admin view) │  (Quick message)    │
└──────────────┬────────┴───────┬───────┴─────────────────────┘
               │                │
               ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Layer (/api/reports)                │
├─────────────────────────────────────────────────────────────┤
│  GET /api/reports     │  POST /api/reports                   │
│  PATCH /api/reports   │  DELETE /api/reports                 │
└──────────────┬────────┴──────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Business Logic Layer                      │
├─────────────────────────────────────────────────────────────┤
│  ReportHandler        │  ReportQueue  │  ReportSystem       │
│  (Actions/workflow)   │  (Management) │  (Core logic)       │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. ReportModal

Universal reporting modal for all content types.

```tsx
import { ReportModal } from "@/components/moderation";

function MyComponent() {
  const [showReport, setShowReport] = useState(false);

  const target = {
    type: "user",
    id: "user-123",
    name: "John Doe",
    username: "johndoe",
    avatarUrl: "/avatars/john.jpg",
  };

  return (
    <ReportModal
      open={showReport}
      onOpenChange={setShowReport}
      target={target}
      reporterId="current-user-id"
      reporterName="Current User"
      onSubmit={(reportId) => {
        console.log("Report submitted:", reportId);
        setShowReport(false);
      }}
    />
  );
}
```

**Features:**

- Support for user, message, and channel reports
- Category selection with priority indicators
- Evidence attachment (links, screenshots, text)
- Description field with validation
- Required evidence for certain categories
- Success state with auto-close
- Auto-escalation indicators

### 2. ReportQueue

Admin/moderator interface for managing reports.

```tsx
import { ReportQueue } from "@/components/admin/moderation/ReportQueue";

function ModerationPage() {
  const handleAction = async (
    reportId: string,
    action: string,
    notes?: string,
  ) => {
    // Process the action
    await fetch("/api/reports", {
      method: "PATCH",
      body: JSON.stringify({ reportId, action, notes }),
    });
  };

  const handleFetchReports = async (filter: ReportFilter) => {
    const response = await fetch("/api/reports?" + new URLSearchParams(filter));
    const data = await response.json();
    return data.reports;
  };

  return (
    <ReportQueue
      initialStatus="pending"
      onAction={handleAction}
      onFetchReports={handleFetchReports}
      moderatorId="current-moderator-id"
      moderatorName="Moderator Name"
    />
  );
}
```

**Features:**

- Filterable report list (status, priority, type)
- Bulk actions (approve all, dismiss all)
- Detailed report view with evidence
- Quick actions (approve, dismiss, escalate)
- Advanced actions (warn, mute, ban)
- Note-taking for decisions
- Assignment tracking
- Real-time stats

### 3. ReportMessageModal

Specialized modal for quick message reporting.

```tsx
import { ReportMessageModal } from "@/components/moderation";

function MessageComponent({ message }) {
  const { reportMessageModalOpen, openReportMessageModal } = useReportStore();

  const handleReport = () => {
    openReportMessageModal({
      id: message.id,
      content: message.content,
      userId: message.userId,
      user: message.user,
      channelId: message.channelId,
      channelName: message.channelName,
      createdAt: message.createdAt,
    });
  };

  return (
    <>
      <button onClick={handleReport}>Report Message</button>
      <ReportMessageModal />
    </>
  );
}
```

## Report Categories

Pre-configured categories with priority levels:

| Category              | Priority | Evidence Required | Auto-Escalate |
| --------------------- | -------- | ----------------- | ------------- |
| Spam                  | Low      | No                | No            |
| Harassment            | High     | Yes               | Yes           |
| Hate Speech           | Urgent   | Yes               | Yes           |
| Inappropriate Content | Medium   | Yes               | No            |
| Impersonation         | High     | Yes               | Yes           |
| Scam/Fraud            | Urgent   | Yes               | Yes           |
| Other                 | Low      | No                | No            |

Add custom categories:

```ts
import { createReportHandler } from "@/lib/moderation/report-handler";

const handler = createReportHandler({
  escalationRules: [
    {
      categoryId: "custom-category",
      autoEscalate: true,
      escalateToPriority: "high",
      notifyRoles: ["admin", "moderator"],
    },
  ],
});
```

## API Routes

### GET /api/reports

List reports with filters.

**Query Parameters:**

- `status` - Filter by status (pending, in_review, resolved, dismissed, escalated)
- `priority` - Filter by priority (urgent, high, medium, low)
- `targetType` - Filter by type (user, message, channel)
- `categoryId` - Filter by category
- `assignedTo` - Filter by assigned moderator
- `search` - Search term
- `sortBy` - Sort field (date, priority, category)
- `sortOrder` - Sort order (asc, desc)

**Response:**

```json
{
  "success": true,
  "data": {
    "reports": [...],
    "stats": {
      "total": 150,
      "byStatus": { "pending": 10, "resolved": 140 },
      "byPriority": { "urgent": 5, "high": 15, "medium": 30, "low": 100 },
      "averageResolutionTimeMs": 3600000,
      "resolvedToday": 5,
      "pendingCount": 10
    },
    "count": 10
  }
}
```

### POST /api/reports

Submit a new report.

**Request Body:**

```json
{
  "reporterId": "user-123",
  "reporterName": "John Doe",
  "targetType": "message",
  "targetId": "msg-456",
  "targetName": "Offensive message",
  "categoryId": "harassment",
  "description": "This message contains harassing content...",
  "evidence": [
    {
      "type": "screenshot",
      "content": "https://example.com/screenshot.png",
      "description": "Screenshot of the offensive content"
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "reportId": "report-1234567890-abc123",
    "report": {...}
  },
  "message": "Report submitted successfully"
}
```

### PATCH /api/reports

Update report or process action.

**Update Request:**

```json
{
  "reportId": "report-123",
  "status": "resolved",
  "priority": "high",
  "assignedTo": "moderator-456",
  "resolution": "Content removed and user warned"
}
```

**Action Request:**

```json
{
  "reportId": "report-123",
  "moderatorId": "mod-456",
  "moderatorName": "Admin User",
  "action": "remove-content",
  "notes": "Content violated community guidelines"
}
```

**Available Actions:**

- `approve` - Approve report (no violation)
- `dismiss` - Dismiss report (invalid/duplicate)
- `escalate` - Escalate to higher priority
- `remove-content` - Delete the reported content
- `warn-user` - Send warning to user
- `mute-user` - Mute the user
- `ban-user` - Ban the user
- `assign` - Assign to moderator
- `resolve` - Mark as resolved

### DELETE /api/reports

Delete a report (admin only).

**Query Parameters:**

- `id` - Report ID

## Report Handler

Server-side report processing engine.

```ts
import {
  createReportHandler,
  createActionContext,
} from "@/lib/moderation/report-handler";

const handler = createReportHandler({
  enableAutoModeration: true,
  enableNotifications: true,
  enableEscalation: true,
  notificationChannels: ["in-app", "email"],
});

// Submit a report
const result = await handler.submitReport({
  reporterId: "user-123",
  targetType: "message",
  targetId: "msg-456",
  categoryId: "spam",
  description: "This is spam content",
});

// Process an action
const context = createActionContext("report-123", "moderator-456", "approve", {
  notes: "Reviewed and approved",
});
const actionResult = await handler.processAction(context);

// Get queue
const queue = handler.getQueue();
const pendingReports = queue.getPendingReports();
```

## Workflow

### User Submits Report

1. User clicks "Report" button
2. ReportModal opens with target context
3. User selects category (auto-sets priority)
4. User adds description (required)
5. User adds evidence (if required by category)
6. User submits report
7. System validates input
8. System checks for duplicates
9. System creates report in queue
10. System checks auto-escalation rules
11. System sends notifications to moderators
12. User sees success confirmation

### Moderator Reviews Report

1. Moderator opens Report Queue
2. Moderator filters by status/priority
3. Moderator views report details
4. Moderator reviews evidence
5. Moderator chooses action:
   - **Approve** - No violation found
   - **Dismiss** - Invalid/duplicate
   - **Escalate** - Needs higher priority
   - **Remove Content** - Delete reported content
   - **Warn User** - Send warning
   - **Mute User** - Temporarily restrict
   - **Ban User** - Permanently ban
6. Moderator adds notes
7. System executes action
8. System updates report status
9. System logs action in audit trail
10. System sends notifications (reporter, reported user)

## Notifications

### Reporter Notifications

- **Report Received** - Confirmation when report is submitted
- **Report In Review** - When moderator starts reviewing
- **Report Resolved** - When report is resolved with outcome
- **Report Dismissed** - When report is dismissed with reason

### Moderator Notifications

- **New Report** - When any report is submitted
- **High Priority Report** - Immediate notification for urgent reports
- **Report Assigned** - When report is assigned to them
- **Report Escalated** - When report is escalated

### Admin Notifications

- **Auto-Escalated Report** - When report auto-escalates
- **Multiple Reports** - When same target has multiple reports
- **Daily Summary** - End-of-day report statistics

## Auto-Escalation Rules

Configure automatic escalation for serious violations:

```ts
const handler = createReportHandler({
  escalationRules: [
    {
      categoryId: "hate-speech",
      autoEscalate: true,
      escalateToPriority: "urgent",
      notifyRoles: ["admin", "moderator"],
    },
  ],
});
```

When a report matches an escalation rule:

1. Priority is automatically elevated
2. Status changes to "escalated"
3. Designated roles are notified
4. Report appears at top of queue

## Best Practices

### For Developers

1. **Always validate input** - Check required fields and data types
2. **Check permissions** - Verify user can submit/view reports
3. **Handle duplicates** - Prevent spam reporting
4. **Log all actions** - Maintain complete audit trail
5. **Send notifications** - Keep users informed
6. **Provide context** - Show relevant evidence and history
7. **Enable filtering** - Help moderators prioritize

### For Moderators

1. **Review evidence** - Check all attached evidence
2. **Add notes** - Document your decision
3. **Be consistent** - Apply rules uniformly
4. **Act quickly** - Address urgent reports first
5. **Escalate when needed** - Don't hesitate to ask for help
6. **Follow up** - Check if action was effective

### For Users

1. **Be specific** - Describe the issue clearly
2. **Add evidence** - Screenshots and links help
3. **Choose right category** - Helps prioritize correctly
4. **Don't spam** - Multiple reports don't help
5. **Be patient** - Give moderators time to review

## Testing

### Unit Tests

```bash
pnpm test src/lib/moderation/report-system.test.ts
pnpm test src/lib/moderation/report-handler.test.ts
```

### Integration Tests

```bash
pnpm test:e2e -- --grep "reporting"
```

### Manual Testing

1. Submit a report for each category
2. Test evidence attachment (all types)
3. Test duplicate detection
4. Test auto-escalation
5. Test all moderator actions
6. Test bulk actions
7. Test filtering and search
8. Test notifications

## Security Considerations

1. **Authentication** - Verify user identity before accepting reports
2. **Authorization** - Check permissions for viewing/acting on reports
3. **Rate Limiting** - Prevent report spam
4. **Input Validation** - Sanitize all user input
5. **Evidence Validation** - Verify URLs and file types
6. **Audit Logging** - Track all actions for accountability
7. **Privacy** - Protect reporter identity when appropriate
8. **GDPR Compliance** - Allow data deletion/export

## Troubleshooting

### Reports Not Showing

- Check filter settings (status, priority, type)
- Verify user has moderator role
- Check API response for errors
- Verify reports exist in queue

### Actions Failing

- Check user permissions
- Verify report exists and is actionable
- Check network connectivity
- Review server logs for errors

### Notifications Not Sent

- Verify notification channels enabled
- Check recipient configuration
- Review notification queue
- Check email/webhook settings

### Evidence Not Loading

- Verify URL is accessible
- Check CORS settings for external images
- Verify file upload permissions
- Check storage configuration

## Future Enhancements

- [ ] AI-powered content analysis
- [ ] Pattern detection (repeat offenders)
- [ ] Automated actions for clear violations
- [ ] Appeal system for disputed reports
- [ ] Batch report processing
- [ ] Advanced analytics and trends
- [ ] Integration with external moderation services
- [ ] Machine learning for priority calculation
- [ ] Custom workflows per category
- [ ] Report templates for common issues

## Support

For questions or issues:

- Documentation: `/docs/moderation/`
- GitHub Issues: `https://github.com/your-org/nself-chat/issues`
- Discord: `#moderation-support`
