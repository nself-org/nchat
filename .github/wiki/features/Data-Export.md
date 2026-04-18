# Data Export & Backup

Complete GDPR-compliant data export system for nself-chat.

## Overview

The Data Export & Backup system allows users to export their chat data in multiple formats for backup purposes or GDPR compliance. The system supports background processing, real-time progress tracking, and automatic expiry for security.

## Features

### Export Formats

1. **JSON** - Structured data with complete metadata
2. **CSV** - Spreadsheet-friendly flat format
3. **HTML** - Styled, printable format
4. **PDF** - Professional document format (server-side generation required)

### Export Scopes

- **All Messages**: Complete chat history
- **Direct Messages**: Private conversations only
- **Specific Channels**: Selected channels
- **User Data**: Profile and settings

### Content Options

- **Files**: Include or exclude file attachments
- **Reactions**: Include emoji reactions
- **Threads**: Include thread replies
- **Edit History**: Include message edit history
- **Anonymization**: GDPR-compliant data masking

## User Interface

### Settings Location

Navigate to: **Settings → Privacy & Security → Data Export**

### Export Configuration

1. **Select Scope**: Choose what data to export
2. **Choose Format**: Select output format (JSON, CSV, HTML, PDF)
3. **Set Date Range** (Optional): Filter by date
4. **Configure Options**: Toggle files, reactions, threads, edits
5. **Enable Anonymization** (Optional): For GDPR compliance
6. **Create Export**: Start background processing

### Export History

View all past export requests with:

- Status (Pending, Processing, Completed, Failed, Expired, Cancelled)
- Real-time progress (percentage and items processed)
- Download links for completed exports
- Cancel option for pending/processing exports
- Expiry information

## Technical Implementation

### Architecture

```
┌─────────────┐
│   User UI   │
└──────┬──────┘
       │
       ↓
┌─────────────────┐
│  API Route      │  /api/export
│  (route.ts)     │
└──────┬──────────┘
       │
       ↓
┌─────────────────┐
│ Background      │
│ Worker          │
└──────┬──────────┘
       │
       ↓
┌─────────────────┐
│ DataExporter    │  Fetch data from GraphQL
│ (data-exporter.ts)
└──────┬──────────┘
       │
       ↓
┌─────────────────┐
│ Formatters      │  Convert to JSON/CSV/HTML/PDF
│ (formatters.ts) │
└──────┬──────────┘
       │
       ↓
┌─────────────────┐
│ File Storage    │  S3/MinIO (production)
└─────────────────┘
       │
       ↓
┌─────────────────┐
│ Email           │  Notify user
│ Notification    │
└─────────────────┘
```

### Files

- `/src/lib/export/types.ts` - TypeScript types
- `/src/lib/export/data-exporter.ts` - Core export engine
- `/src/lib/export/formatters.ts` - Format converters
- `/src/lib/export/index.ts` - Public API
- `/src/app/api/export/route.ts` - API endpoint
- `/src/components/settings/DataExport.tsx` - UI component

### Data Flow

1. **Request Creation**
   - User configures export options
   - POST to `/api/export` creates request
   - Request queued for background processing

2. **Background Processing**
   - DataExporter fetches data from GraphQL
   - Processes messages, channels, users in batches
   - Updates progress in real-time
   - Applies anonymization if requested

3. **File Generation**
   - Formatter converts data to selected format
   - File stored in S3/MinIO (production) or memory (demo)
   - Download URL generated

4. **User Notification**
   - Email sent when export completes
   - User can download from Export History

5. **Automatic Cleanup**
   - Exports expire after 7 days
   - Files automatically deleted
   - Cleanup runs hourly

## GDPR Compliance

### Data Subject Rights

The export system supports these GDPR rights:

1. **Right to Access (Article 15)**
   - Users can export all their personal data
   - Includes messages, files, reactions, profile

2. **Right to Data Portability (Article 20)**
   - Machine-readable formats (JSON, CSV)
   - Structured, commonly used formats
   - Easy to transfer to other services

3. **Right to Erasure (Article 17)**
   - Users can export before requesting deletion
   - Provides backup of their data

### Anonymization

When enabled:

- User names → "User 1", "User 2", etc.
- Email addresses → anonymous@anonymized.local
- Avatar URLs → Removed
- Message content → Preserved (user's data)
- Timestamps → Preserved
- Channel names → Preserved

### Security Features

- **Authentication**: Only authenticated users can export
- **Authorization**: Users can only export their accessible data
- **Automatic Expiry**: Files deleted after 7 days
- **Rate Limiting**: Prevent abuse
- **Audit Logging**: All exports logged

## API Reference

### Create Export

```http
POST /api/export
Content-Type: application/json

{
  "options": {
    "scope": "all_messages",
    "format": "json",
    "fromDate": "2024-01-01T00:00:00.000Z",
    "toDate": "2024-12-31T23:59:59.999Z",
    "includeFiles": true,
    "includeReactions": true,
    "includeThreads": true,
    "includeEdits": false,
    "anonymize": false,
    "includeUserData": true,
    "includeChannelData": true
  },
  "userId": "user-id"
}
```

**Response:**

```json
{
  "success": true,
  "exportId": "uuid",
  "message": "Export request created. Processing in background.",
  "estimatedTime": "5-10 minutes"
}
```

### Check Status

```http
GET /api/export?id={exportId}&action=status
```

**Response:**

```json
{
  "success": true,
  "export": {
    "id": "uuid",
    "status": "processing",
    "progress": 75,
    "itemsProcessed": 750,
    "itemsTotal": 1000,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "completedAt": null,
    "expiresAt": "2024-01-08T00:00:00.000Z",
    "downloadUrl": null,
    "fileName": null,
    "fileSize": null,
    "errorMessage": null
  }
}
```

### Download Export

```http
GET /api/export?id={exportId}&action=download
```

**Response:** File download with appropriate Content-Type

### Cancel Export

```http
DELETE /api/export?id={exportId}
```

**Response:**

```json
{
  "success": true,
  "message": "Export cancelled/deleted"
}
```

## Status Values

- `pending` - Queued, not started yet
- `processing` - Currently being processed
- `completed` - Ready for download
- `failed` - Processing error occurred
- `cancelled` - User cancelled the export
- `expired` - Download link expired (7 days)

## Export Formats Comparison

| Feature                | JSON   | CSV   | HTML   | PDF   |
| ---------------------- | ------ | ----- | ------ | ----- |
| Machine Readable       | ✅     | ✅    | ⚠️     | ❌    |
| Human Readable         | ⚠️     | ⚠️    | ✅     | ✅    |
| Preserves Structure    | ✅     | ❌    | ✅     | ✅    |
| Includes Metadata      | ✅     | ❌    | ✅     | ✅    |
| Spreadsheet Compatible | ❌     | ✅    | ❌     | ❌    |
| Printable              | ❌     | ❌    | ✅     | ✅    |
| File Size              | Medium | Small | Large  | Large |
| Processing Speed       | Fast   | Fast  | Medium | Slow  |

## Usage Examples

### Export All Messages as JSON

```typescript
const options: ExportOptions = {
  scope: 'all_messages',
  format: 'json',
  includeFiles: true,
  includeReactions: true,
  includeThreads: true,
  includeUserData: true,
  includeChannelData: true,
}
```

### Export Direct Messages as CSV

```typescript
const options: ExportOptions = {
  scope: 'direct_messages',
  format: 'csv',
  includeFiles: false,
  includeReactions: false,
  includeThreads: false,
}
```

### GDPR Data Request (Anonymized)

```typescript
const options: ExportOptions = {
  scope: 'all_messages',
  format: 'json',
  includeFiles: true,
  includeReactions: true,
  includeThreads: true,
  includeEdits: true,
  anonymize: true,
  includeUserData: true,
  includeChannelData: true,
}
```

### Export Specific Date Range

```typescript
const options: ExportOptions = {
  scope: 'all_messages',
  format: 'html',
  fromDate: new Date('2024-01-01'),
  toDate: new Date('2024-12-31'),
  includeFiles: true,
  includeReactions: true,
  includeThreads: true,
}
```

## Performance Considerations

### Optimization Strategies

1. **Batching**: Fetch 100-1000 messages per batch
2. **Streaming**: Stream large exports to avoid memory limits
3. **Compression**: Gzip exports before storage
4. **Caching**: Cache frequently accessed data
5. **Indexing**: Database indexes on key fields

### Size Limits

- **Maximum Messages**: 1,000,000 per export
- **Maximum File Size**: 500 MB (configurable)
- **Maximum Files**: 10,000 attachments
- **Batch Size**: 100-1000 messages

### Estimated Times

| Data Volume             | Estimated Time |
| ----------------------- | -------------- |
| < 1,000 messages        | 1-2 minutes    |
| 1,000-10,000 messages   | 2-5 minutes    |
| 10,000-100,000 messages | 5-15 minutes   |
| > 100,000 messages      | 15-60 minutes  |

## Troubleshooting

### Export Stuck in Processing

1. Check background worker status
2. Review server logs for errors
3. Verify database connectivity
4. Check queue system health

### Download Link Expired

1. Create a new export request
2. Download within 7 days
3. Consider setting up automatic backups

### Missing Data in Export

1. Verify user has access to channels
2. Check date range filters
3. Ensure proper permissions
4. Review export scope settings

### Large File Size

1. Use CSV instead of JSON/HTML
2. Exclude file attachments
3. Use date range filters
4. Export specific channels

## Production Deployment

### Required Services

1. **Message Queue**: Bull/BullMQ
2. **File Storage**: AWS S3 or MinIO
3. **Email Service**: SendGrid or AWS SES
4. **Database**: PostgreSQL
5. **Redis**: For queue management

### Environment Variables

```bash
STORAGE_ENDPOINT=https://s3.amazonaws.com
STORAGE_BUCKET=exports
STORAGE_ACCESS_KEY=...
STORAGE_SECRET_KEY=...

REDIS_URL=redis://localhost:6379

EMAIL_FROM=noreply@example.com
SENDGRID_API_KEY=...

EXPORT_EXPIRY_DAYS=7
EXPORT_MAX_SIZE_MB=500
EXPORT_RATE_LIMIT_PER_DAY=5
```

### Monitoring

Track these metrics:

- Export request rate
- Processing duration
- File sizes
- Error rates
- Queue depth
- Storage usage
- Download rates

## Future Enhancements

- [ ] Scheduled recurring exports
- [ ] Export to cloud storage (Google Drive, Dropbox)
- [ ] Multi-format archives (ZIP with all formats)
- [ ] Incremental exports (changes since last export)
- [ ] Advanced filtering (by keyword, user, type)
- [ ] Export templates
- [ ] Webhook notifications
- [ ] Compression options

## Related Documentation

- [Privacy & Security](./Privacy-Security.md)
- [GDPR Compliance](./GDPR-Compliance.md)
- [API Documentation](../api/README.md)
- [Data Export Library](README.md)

## Support

For issues or questions:

- GitHub Issues: [nself-chat/issues](https://github.com/nself/nself-chat/issues)
- Documentation: [docs.nself.org](https://docs.nself.org)
- Email: support@nself.org
