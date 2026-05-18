# Data Export & Backup System

Complete GDPR-compliant data export system with streaming support for large exports, background processing, and multiple format options.

## Features

- **Multiple Export Formats**: JSON, CSV, HTML, PDF
- **Flexible Scope**: Export all messages, direct messages, specific channels, or user data
- **Date Range Filtering**: Export data within custom date ranges
- **Content Filters**: Include/exclude files, reactions, threads, edit history
- **GDPR Compliance**: Anonymization option for personally identifiable information
- **Background Processing**: Asynchronous export with progress tracking
- **Email Notifications**: Get notified when exports are ready
- **Automatic Expiry**: Exports expire after 7 days for security
- **Streaming Support**: Efficient handling of large datasets
- **Export History**: Track all past exports with status monitoring

## Architecture

### Components

1. **DataExporter** (`data-exporter.ts`)
   - Core export engine
   - Fetches data from GraphQL
   - Processes messages, channels, users
   - Handles anonymization for GDPR

2. **Formatters** (`formatters.ts`)
   - JSON: Structured JSON with metadata
   - CSV: Flat spreadsheet format
   - HTML: Styled, printable format
   - PDF: Server-side generation (placeholder)

3. **API Route** (`/api/export/route.ts`)
   - POST: Create export request
   - GET: Check status or download file
   - DELETE: Cancel or delete export

4. **UI Component** (`DataExport.tsx`)
   - Export configuration form
   - Real-time progress tracking
   - Export history with download links

### Data Flow

```
User Request → API Route → Background Worker → DataExporter
                                ↓
                           Formatters → File Storage
                                ↓
                         Email Notification
                                ↓
                          User Downloads
```

## Usage

### Creating an Export

```typescript
import { DataExporter } from "@/lib/export";
import { ApolloClient } from "@apollo/client";

const exporter = new DataExporter(apolloClient);

const options: ExportOptions = {
  scope: "all_messages",
  format: "json",
  fromDate: new Date("2024-01-01"),
  toDate: new Date("2024-12-31"),
  includeFiles: true,
  includeReactions: true,
  includeThreads: true,
  includeEdits: false,
  anonymize: false,
  includeUserData: true,
  includeChannelData: true,
};

const data = await exporter.export(
  options,
  userId,
  (progress, processed, total) => {
    console.log(`Progress: ${progress}% (${processed}/${total} items)`);
  },
);

console.log(data.metadata);
```

### API Endpoints

#### Create Export Request

```bash
POST /api/export

{
  "options": {
    "scope": "all_messages",
    "format": "json",
    "fromDate": "2024-01-01T00:00:00.000Z",
    "toDate": "2024-12-31T23:59:59.999Z",
    "includeFiles": true,
    "includeReactions": true,
    "includeThreads": true
  },
  "userId": "user-id-here"
}

Response:
{
  "success": true,
  "exportId": "uuid",
  "message": "Export request created. Processing in background.",
  "estimatedTime": "5-10 minutes"
}
```

#### Check Export Status

```bash
GET /api/export?id=<exportId>&action=status

Response:
{
  "success": true,
  "export": {
    "id": "uuid",
    "status": "processing",
    "progress": 75,
    "itemsProcessed": 750,
    "itemsTotal": 1000,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "expiresAt": "2024-01-08T00:00:00.000Z"
  }
}
```

#### Download Export

```bash
GET /api/export?id=<exportId>&action=download

Response: File download with appropriate Content-Type
```

#### Cancel Export

```bash
DELETE /api/export?id=<exportId>

Response:
{
  "success": true,
  "message": "Export cancelled/deleted"
}
```

## Export Formats

### JSON

Structured JSON with complete metadata:

```json
{
  "metadata": {
    "exportId": "...",
    "exportedAt": "2024-01-01T00:00:00.000Z",
    "exportedBy": {
      "id": "...",
      "email": "...",
      "username": "..."
    },
    "scope": "all_messages",
    "format": "json",
    "stats": {
      "totalMessages": 1000,
      "totalFiles": 50,
      "totalUsers": 25,
      "totalChannels": 10
    }
  },
  "messages": [...],
  "channels": [...],
  "users": [...]
}
```

### CSV

Flat format for spreadsheets:

```csv
message_id,channel_name,username,content,created_at,is_edited,has_attachments
1,general,user1,"Hello world",2024-01-01T12:00:00.000Z,No,No
2,general,user2,"Hi there!",2024-01-01T12:01:00.000Z,No,Yes
```

### HTML

Styled, printable format with:

- Metadata header
- Message cards with user info
- Attachments and reactions
- Thread replies
- Light/dark theme support
- Print optimization

### PDF

Server-side generated PDF (requires puppeteer or similar):

- Based on HTML formatter
- Professional layout
- Page breaks for messages
- Table of contents

## GDPR Compliance

### Anonymization

When `anonymize: true` is set:

1. **User Names**: Replaced with "User 1", "User 2", etc.
2. **Email Addresses**: Replaced with anonymous@anonymized.local
3. **Avatar URLs**: Removed
4. **Message Content**: Preserved (contains the data subject's messages)
5. **Metadata**: Preserved (timestamps, channel info)

### Data Subject Rights

The export system supports GDPR data subject rights:

- **Right to Access**: Users can export all their data
- **Right to Portability**: Multiple machine-readable formats (JSON, CSV)
- **Right to Erasure**: Users can request deletion after export

### Compliance Features

- **Automatic Expiry**: Exports expire after 7 days
- **Secure Storage**: Files stored with access controls
- **Audit Trail**: All export requests logged
- **Consent**: Users explicitly request exports
- **Scope Control**: Users choose what data to export

## Production Deployment

### Required Infrastructure

1. **Message Queue**: Bull/BullMQ for background processing
2. **File Storage**: S3/MinIO for export files
3. **Email Service**: SendGrid/AWS SES for notifications
4. **Database**: Store export requests (replace in-memory Map)
5. **Cron Job**: Cleanup expired exports

### Environment Variables

```bash
# Storage
STORAGE_ENDPOINT=https://storage.example.com
STORAGE_ACCESS_KEY=...
STORAGE_SECRET_KEY=...
STORAGE_BUCKET=exports

# Queue
REDIS_URL=redis://localhost:6379

# Email
EMAIL_FROM=noreply@example.com
SENDGRID_API_KEY=...

# Export Settings
EXPORT_MAX_SIZE_MB=500
EXPORT_EXPIRY_DAYS=7
EXPORT_RATE_LIMIT=5 # per user per day
```

### Performance Optimization

1. **Batching**: Fetch messages in batches of 100-1000
2. **Streaming**: Stream large exports to avoid memory limits
3. **Compression**: Gzip exports before storage
4. **Pagination**: Use cursor-based pagination for GraphQL
5. **Caching**: Cache channel/user data
6. **Indexing**: Database indexes on created_at, channel_id

### Monitoring

Track these metrics:

- Export request rate
- Processing time
- File sizes
- Error rates
- Queue depth
- Storage usage

## Testing

### Unit Tests

```typescript
import { DataExporter } from "@/lib/export";

describe("DataExporter", () => {
  it("should export messages with filters", async () => {
    const exporter = new DataExporter(mockClient);
    const data = await exporter.export(options, userId);
    expect(data.messages).toHaveLength(100);
  });

  it("should anonymize data when requested", async () => {
    const options = { ...baseOptions, anonymize: true };
    const data = await exporter.export(options, userId);
    expect(data.messages[0].username).toMatch(/^User \d+$/);
  });
});
```

### Integration Tests

```typescript
describe("Export API", () => {
  it("should create export request", async () => {
    const response = await fetch("/api/export", {
      method: "POST",
      body: JSON.stringify({ options, userId }),
    });
    expect(response.status).toBe(200);
  });

  it("should download completed export", async () => {
    const response = await fetch(`/api/export?id=${exportId}&action=download`);
    expect(response.headers.get("Content-Type")).toBe("application/json");
  });
});
```

## Troubleshooting

### Export Taking Too Long

- Check queue depth
- Increase worker concurrency
- Optimize GraphQL queries
- Add database indexes

### Out of Memory

- Enable streaming
- Reduce batch size
- Increase server memory
- Process in chunks

### Missing Data

- Verify user permissions
- Check date range filters
- Ensure GraphQL schema includes all fields
- Review channel access rights

## Future Enhancements

- [ ] Incremental exports (since last export)
- [ ] Export templates (pre-configured options)
- [ ] Scheduled recurring exports
- [ ] Export to third-party services (Google Drive, Dropbox)
- [ ] Differential exports (only changes)
- [ ] Multi-format archives (ZIP with all formats)
- [ ] Advanced filtering (by user, by keyword)
- [ ] Export verification (checksums)

## Security Considerations

1. **Authentication**: Verify user owns the data
2. **Authorization**: Check channel access rights
3. **Rate Limiting**: Prevent abuse
4. **File Scanning**: Scan for malware before download
5. **Encryption**: Encrypt exports at rest
6. **Audit Logging**: Log all export operations
7. **TTL**: Auto-delete expired exports

## License

See project LICENSE file.
