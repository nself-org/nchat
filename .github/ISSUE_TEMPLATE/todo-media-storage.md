---
name: File Upload and Storage Integration
about: Implement MinIO/storage service for file uploads
title: '[TODO-MEDIA-001] File Upload and Storage Integration'
labels: enhancement, backend, high-priority
assignees: ''
---

## Description

Integrate MinIO (or Nhost Storage) for handling file uploads including avatars, attachments, and media files.

## Affected Components

### Avatar Management

- [ ] `src/app/settings/profile/page.tsx:81` - Avatar upload
- [ ] `src/app/settings/profile/page.tsx:87` - Avatar removal
- [ ] `src/hooks/use-settings-mutations.ts:96` - Upload to storage service

### Message Attachments

- [ ] `src/hooks/use-thread.ts:267` - File uploads in threads
- [ ] File uploads in messages
- [ ] File uploads in DMs

### File Preview and Download

- [ ] `src/app/people/[id]/page.tsx:220` - File preview/download
- [ ] Image viewer component
- [ ] Video player component
- [ ] Document preview

## Technical Requirements

### Storage Service Setup

1. **MinIO Configuration:**

   ```yaml
   # docker-compose.yml
   minio:
     image: quay.io/minio/minio:latest
     ports:
       - '9000:9000'
       - '9001:9001'
     environment:
       MINIO_ROOT_USER: ${MINIO_ROOT_USER}
       MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
     volumes:
       - minio_data:/data
     command: server /data --console-address ":9001"
   ```

2. **Storage Buckets:**
   - `nchat-avatars` - User profile images
   - `nchat-attachments` - Message attachments
   - `nchat-media` - Images, videos, audio
   - `nchat-exports` - Data exports

3. **Access Control:**
   - Private buckets by default
   - Signed URLs for downloads (1 hour expiry)
   - Upload size limits per file type
   - Virus scanning on upload (optional)

### File Upload Implementation

1. **Client-Side:**

   ```typescript
   // useFileUpload hook
   const { uploadFile, progress, error } = useFileUpload()

   const handleUpload = async (file: File) => {
     const url = await uploadFile(file, {
       bucket: 'nchat-attachments',
       onProgress: (p) => setProgress(p),
     })
     return url
   }
   ```

2. **Server-Side:**

   ```typescript
   // /api/upload/route.ts
   export async function POST(request: NextRequest) {
     const formData = await request.formData()
     const file = formData.get('file') as File

     // Validate file
     // Upload to MinIO
     // Return URL
   }
   ```

3. **GraphQL Mutations:**

   ```graphql
   mutation UploadAvatar($file: Upload!) {
     uploadAvatar(file: $file) {
       url
       filename
       size
       mimeType
     }
   }

   mutation AttachFileToMessage($messageId: uuid!, $file: Upload!) {
     attachFile(messageId: $messageId, file: $file) {
       id
       url
       filename
       size
       mimeType
     }
   }
   ```

### File Types and Validation

1. **Supported Types:**
   - **Images:** jpg, png, gif, webp, svg (max 10MB)
   - **Videos:** mp4, webm, mov (max 100MB)
   - **Audio:** mp3, wav, ogg (max 20MB)
   - **Documents:** pdf, doc, docx, txt, md (max 25MB)
   - **Archives:** zip, tar, gz (max 50MB)

2. **Validation:**

   ```typescript
   const validateFile = (file: File) => {
     const maxSizes = {
       'image/*': 10 * 1024 * 1024, // 10MB
       'video/*': 100 * 1024 * 1024, // 100MB
       'audio/*': 20 * 1024 * 1024, // 20MB
       'application/pdf': 25 * 1024 * 1024, // 25MB
     }
     // Validate size, type, extension
   }
   ```

3. **Image Processing:**
   - Generate thumbnails (200x200, 800x800)
   - Compress images (quality 85%)
   - Strip EXIF data (privacy)
   - Convert to WebP (optional)

### Database Schema

```sql
CREATE TABLE nchat_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES nchat_users(id),
  filename text NOT NULL,
  original_filename text NOT NULL,
  mime_type text NOT NULL,
  size bigint NOT NULL,
  storage_path text NOT NULL,
  storage_bucket text NOT NULL,
  thumbnail_url text,
  uploaded_at timestamp with time zone DEFAULT now(),
  CONSTRAINT valid_size CHECK (size > 0 AND size <= 104857600) -- 100MB max
);

CREATE TABLE nchat_message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES nchat_messages(id) ON DELETE CASCADE,
  file_id uuid NOT NULL REFERENCES nchat_files(id) ON DELETE CASCADE,
  attached_at timestamp with time zone DEFAULT now()
);
```

## Security Checklist

- [ ] Validate file types (magic numbers, not just extension)
- [ ] Scan for malware (ClamAV integration)
- [ ] Limit upload size per file and total per user
- [ ] Rate limit uploads (e.g., 10 files/minute)
- [ ] Signed URLs for downloads (expire in 1 hour)
- [ ] CDN integration for public files (optional)
- [ ] Image processing on upload (thumbnails, compression)
- [ ] CORS configuration for MinIO
- [ ] Backup strategy for uploaded files

## Testing Checklist

### Avatar Upload

- [ ] Upload JPG avatar
- [ ] Upload PNG avatar
- [ ] Upload oversized image (should fail)
- [ ] Upload invalid file type (should fail)
- [ ] Remove avatar
- [ ] View avatar in profile

### Message Attachments

- [ ] Attach image to message
- [ ] Attach PDF to message
- [ ] Attach video to message
- [ ] Multiple attachments per message
- [ ] Download attachment
- [ ] Preview attachment inline

### Performance

- [ ] Upload progress indicator
- [ ] Chunked upload for large files
- [ ] Resume interrupted uploads
- [ ] Parallel uploads (multiple files)
- [ ] CDN caching (if configured)

## Acceptance Criteria

- Avatar upload/removal works seamlessly
- Message attachments supported for all file types
- File previews work for images, videos, PDFs
- Download links are secure (signed URLs)
- Upload progress shows accurately
- File size limits enforced
- Proper error messages for upload failures
- Images automatically compressed and thumbnailed

## Dependencies

- MinIO or Nhost Storage service
- `multer` or `formidable` for file parsing
- `sharp` for image processing
- `qrcode` for QR code generation (optional)
- CDN service (optional, e.g., CloudFlare)

## Priority: High

Essential for production use. Should be completed before v1.0.0 release.
