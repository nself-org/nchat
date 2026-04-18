# ɳChat File Processing Plugin

**Plugin Name**: `file-processing`
**Version**: 1.0.0
**Category**: Infrastructure
**Status**: Production Ready
**Priority**: HIGH

---

## Overview

The File Processing Plugin provides comprehensive file transformation and optimization capabilities for ɳChat. It handles image resizing, video thumbnail generation, document previews, EXIF metadata stripping, and optional virus scanning.

---

## Features

### Core Features

- ✅ **Image Processing** - Resize, optimize, and convert images
- ✅ **Video Thumbnails** - Generate preview thumbnails from videos
- ✅ **Document Previews** - Create previews for PDF and Office documents
- ✅ **Metadata Stripping** - Remove EXIF data for privacy
- ✅ **Format Conversion** - Convert between image formats (PNG, JPEG, WebP, AVIF)
- ✅ **Batch Processing** - Process multiple files concurrently
- ✅ **Virus Scanning** - Optional ClamAV integration
- ✅ **S3 Integration** - Store processed files in MinIO/S3

### Advanced Features

- ✅ **Smart Compression** - Automatic quality optimization
- ✅ **Responsive Images** - Generate multiple sizes
- ✅ **Watermarking** - Add branding to images
- ✅ **Text Extraction** - Extract text from PDFs/documents
- ✅ **Image Analysis** - Detect dimensions, format, quality

---

## Installation

### Prerequisites

- Docker running
- nself CLI v0.9.8+
- MinIO service (provided by nself stack)
- 512MB+ RAM available

### Install Plugin

```bash
cd /Users/admin/Sites/nself-nchat/backend
nself plugin install file-processing
```

### Configuration

Add to `backend/.env.plugins`:

```bash
# File Processing Plugin
FILE_PROCESSING_ENABLED=true
FILE_PROCESSING_PORT=3104
FILE_PROCESSING_ROUTE=files.${BASE_DOMAIN:-localhost}
FILE_PROCESSING_MEMORY=512M

# S3 Configuration
FILE_PROCESSING_S3_ENDPOINT=http://minio:9000
FILE_PROCESSING_S3_BUCKET=${S3_BUCKET:-nchat-files}
FILE_PROCESSING_S3_ACCESS_KEY=minioadmin
FILE_PROCESSING_S3_SECRET_KEY=minioadmin
FILE_PROCESSING_S3_REGION=us-east-1

# Image Processing
FILE_PROCESSING_IMAGE_MAX_WIDTH=2048
FILE_PROCESSING_IMAGE_MAX_HEIGHT=2048
FILE_PROCESSING_IMAGE_QUALITY=85
FILE_PROCESSING_THUMBNAIL_SIZE=200
FILE_PROCESSING_THUMBNAIL_QUALITY=80

# Video Processing
FILE_PROCESSING_VIDEO_THUMBNAIL_ENABLED=true
FILE_PROCESSING_VIDEO_THUMBNAIL_TIME=1
FILE_PROCESSING_VIDEO_THUMBNAIL_WIDTH=1280

# Document Processing
FILE_PROCESSING_DOCUMENT_PREVIEW_ENABLED=true
FILE_PROCESSING_DOCUMENT_PREVIEW_DPI=150
FILE_PROCESSING_PDF_MAX_PAGES=10

# Security
FILE_PROCESSING_STRIP_METADATA=true
FILE_PROCESSING_VIRUS_SCAN_ENABLED=false
FILE_PROCESSING_MAX_FILE_SIZE=104857600  # 100MB

# Performance
FILE_PROCESSING_CONCURRENCY=5
FILE_PROCESSING_QUEUE_SIZE=100
FILE_PROCESSING_TIMEOUT=30000
```

### Start Service

```bash
nself restart
```

---

## API Endpoints

### Health Check

```bash
GET /health
```

**Response:**

```json
{
  "status": "healthy",
  "service": "file-processing",
  "version": "1.0.0",
  "uptime": 86400,
  "dependencies": {
    "s3": {
      "status": "connected",
      "bucket": "nchat-files"
    }
  },
  "queue": {
    "waiting": 0,
    "processing": 2,
    "completed": 1542
  }
}
```

### Image Processing

#### Resize Image

```bash
POST /image/resize
Content-Type: multipart/form-data

file: <image-file>
width: 800
height: 600
fit: cover  # Options: cover, contain, fill, inside, outside
```

**Response:**

```json
{
  "success": true,
  "url": "https://storage.nchat.local/processed/image-123-800x600.jpg",
  "width": 800,
  "height": 600,
  "format": "jpeg",
  "size": 45678
}
```

#### Optimize Image

```bash
POST /image/optimize
Content-Type: multipart/form-data

file: <image-file>
quality: 85  # 1-100
progressive: true
stripMetadata: true
```

#### Generate Thumbnail

```bash
POST /image/thumbnail
Content-Type: multipart/form-data

file: <image-file>
size: 200  # px
crop: true
```

#### Convert Format

```bash
POST /image/convert
Content-Type: multipart/form-data

file: <image-file>
format: webp  # Options: jpeg, png, webp, avif, tiff
quality: 85
```

#### Strip Metadata

```bash
POST /image/strip-metadata
Content-Type: multipart/form-data

file: <image-file>
```

#### Get Image Info

```bash
POST /image/info
Content-Type: multipart/form-data

file: <image-file>
```

**Response:**

```json
{
  "width": 1920,
  "height": 1080,
  "format": "jpeg",
  "size": 234567,
  "hasAlpha": false,
  "exif": {
    "Make": "Canon",
    "Model": "EOS 5D Mark IV",
    "DateTime": "2026:02:03 12:00:00"
  }
}
```

### Video Processing

#### Generate Video Thumbnail

```bash
POST /video/thumbnail
Content-Type: multipart/form-data

file: <video-file>
time: 1  # seconds into video
width: 1280
format: jpeg
```

**Response:**

```json
{
  "success": true,
  "url": "https://storage.nchat.local/thumbnails/video-123.jpg",
  "width": 1280,
  "height": 720,
  "timestamp": 1
}
```

#### Extract Video Metadata

```bash
POST /video/metadata
Content-Type: multipart/form-data

file: <video-file>
```

**Response:**

```json
{
  "duration": 120.5,
  "width": 1920,
  "height": 1080,
  "codec": "h264",
  "fps": 30,
  "bitrate": 5000000,
  "size": 75600000
}
```

### Document Processing

#### Generate PDF Preview

```bash
POST /document/preview
Content-Type: multipart/form-data

file: <pdf-file>
page: 1  # optional, defaults to first page
dpi: 150
format: png
```

#### Extract Document Text

```bash
POST /document/extract-text
Content-Type: multipart/form-data

file: <document-file>
pages: 1-5  # optional, all pages by default
```

**Response:**

```json
{
  "text": "Extracted text content...",
  "pages": 5,
  "wordCount": 1234
}
```

### Virus Scanning

```bash
POST /scan
Content-Type: multipart/form-data

file: <any-file>
```

**Response:**

```json
{
  "clean": true,
  "scanner": "clamav",
  "signature": "2026-02-03",
  "scanTime": 123
}
```

### Batch Processing

```bash
POST /batch/optimize
Content-Type: multipart/form-data

files: <multiple-image-files>
quality: 85
format: webp
```

**Response:**

```json
{
  "processed": 10,
  "failed": 0,
  "results": [
    {
      "filename": "image1.jpg",
      "url": "https://storage.nchat.local/processed/image1.webp",
      "originalSize": 1234567,
      "processedSize": 456789,
      "savings": "63%"
    }
  ]
}
```

---

## Frontend Integration

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_FILE_PROCESSING_URL=http://files.localhost:3104
NEXT_PUBLIC_FILE_PROCESSING_ENABLED=true
NEXT_PUBLIC_MAX_FILE_SIZE=104857600  # 100MB
```

### React Hook

```typescript
import { useFileProcessing } from '@/hooks/use-file-processing'

function FileUpload() {
  const { uploadAndProcess, isProcessing, progress } = useFileProcessing()

  const handleUpload = async (file: File) => {
    const result = await uploadAndProcess(file, {
      resize: true,
      maxWidth: 2048,
      maxHeight: 2048,
      optimize: true,
      quality: 85,
      thumbnail: true,
      stripMetadata: true,
    })

    console.log('Processed file:', result.url)
  }

  return (
    <div>
      <input type="file" onChange={(e) => handleUpload(e.target.files[0])} />
      {isProcessing && <ProgressBar value={progress} />}
    </div>
  )
}
```

### Service Layer

```typescript
import { FileUploadService } from '@/services/files'

const fileService = new FileUploadService()

// Upload and process image
const result = await fileService.uploadAndProcess(file, {
  resize: true,
  optimize: true,
  thumbnail: true,
  stripMetadata: true,
})

// Generate thumbnail
const thumbnail = await fileService.generateThumbnail(file, 200)

// Convert format
const webp = await fileService.convertFormat(file, 'webp', 85)
```

---

## Supported File Types

### Images

- JPEG/JPG
- PNG
- WebP
- AVIF
- TIFF
- GIF
- BMP
- SVG

### Videos

- MP4
- WebM
- MOV
- AVI
- MKV

### Documents

- PDF
- DOCX
- XLSX
- PPTX
- TXT
- Markdown

---

## Performance

### Metrics

- **Processing Speed**: 10-50ms per image (typical)
- **Concurrent Jobs**: Up to 5 simultaneous
- **Throughput**: 100+ images/minute
- **Memory Usage**: ~512MB baseline
- **CPU Usage**: ~1 core per job

### Optimization Tips

1. **Batch Processing**: Use batch endpoints for multiple files
2. **Quality Settings**: Use quality 85 for good compression with minimal loss
3. **Format Selection**: WebP offers best compression, AVIF for cutting-edge
4. **Caching**: Enable CDN caching for processed files
5. **Lazy Processing**: Process on-demand vs. upload time

---

## Testing

### Health Check Test

```bash
curl http://files.localhost:3104/health
```

### Integration Test

```typescript
describe('File Processing Plugin', () => {
  it('should process image', async () => {
    const formData = new FormData()
    formData.append('file', imageFile)
    formData.append('width', '800')

    const response = await fetch('http://files.localhost:3104/image/resize', {
      method: 'POST',
      body: formData,
    })

    expect(response.ok).toBe(true)
    const data = await response.json()
    expect(data).toHaveProperty('url')
  })
})
```

---

## Troubleshooting

### High Memory Usage

**Problem**: Service using too much RAM

**Solutions:**

1. Reduce `FILE_PROCESSING_CONCURRENCY`
2. Lower `FILE_PROCESSING_IMAGE_MAX_WIDTH/HEIGHT`
3. Increase service memory limit
4. Enable image streaming for large files

### Slow Processing

**Problem**: Files taking too long to process

**Solutions:**

1. Check S3 latency
2. Reduce quality settings
3. Increase concurrency
4. Use batch processing

### Format Errors

**Problem**: Unsupported file format errors

**Solutions:**

1. Check file extension matches content type
2. Verify file isn't corrupted
3. Update supported formats list
4. Use format detection endpoint first

---

## Security

### Best Practices

1. **Virus Scanning**: Enable for user uploads
2. **Metadata Stripping**: Always strip EXIF for privacy
3. **File Size Limits**: Enforce max upload size
4. **Format Validation**: Verify file types
5. **S3 Permissions**: Use bucket policies

### Malware Protection

```bash
# Enable ClamAV
FILE_PROCESSING_VIRUS_SCAN_ENABLED=true
FILE_PROCESSING_CLAMAV_HOST=clamav
FILE_PROCESSING_CLAMAV_PORT=3310
```

---

## Monitoring

### Metrics Endpoint

```bash
curl http://files.localhost:3104/metrics
```

**Key Metrics:**

- `file_processing_jobs_total` - Total jobs processed
- `file_processing_duration_ms` - Processing duration histogram
- `file_processing_errors_total` - Error count
- `file_processing_queue_size` - Current queue size

### Logs

```bash
nself logs file-processing --follow
```

---

## Changelog

### Version 1.0.0 (2026-02-03)

- Initial release
- Image processing (resize, optimize, convert)
- Video thumbnail generation
- Document preview generation
- EXIF metadata stripping
- S3 storage integration
- Batch processing support
- ClamAV virus scanning

---

## Support

- **Documentation**: https://nself.org/docs/plugins/file-processing
- **Issues**: https://github.com/nself-org/plugins/issues
- **Discord**: https://discord.gg/nself

---

## Related Documentation

- [Installation Guide](./INSTALLATION-GUIDE.md)
- [Integration Guide](./INTEGRATION-GUIDE.md)
- [Plugin System Overview](./README.md)
- [Realtime Plugin](./REALTIME-PLUGIN.md)
- [Notifications Plugin](./NOTIFICATIONS-PLUGIN.md)
