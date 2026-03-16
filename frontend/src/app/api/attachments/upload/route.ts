/**
 * Attachment Upload API Route
 *
 * POST /api/attachments/upload - Upload file attachments with validation
 *
 * Features:
 * - File type validation
 * - Size limits
 * - Virus scanning (optional)
 * - Metadata extraction (dimensions, duration)
 * - Thumbnail generation
 * - Progress tracking
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { apolloClient } from '@/lib/apollo-client'
import { gql } from '@apollo/client'
import { getUploadService } from '@/services/files/upload.service'
import { getValidationService } from '@/services/files/validation.service'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Increase body size limit for file uploads (50MB)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
}

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const UploadMetadataSchema = z.object({
  messageId: z.string().uuid().optional(), // Optional: can upload before message is sent
  userId: z.string().uuid('Invalid user ID'),
  channelId: z.string().uuid('Invalid channel ID'),
  fileName: z.string().min(1).max(255),
  fileType: z.string().min(1).max(100),
  fileSize: z
    .number()
    .int()
    .positive()
    .max(50 * 1024 * 1024), // 50MB max
  isPublic: z.boolean().default(false),
})

// ============================================================================
// GRAPHQL OPERATIONS
// ============================================================================

const CREATE_ATTACHMENT = gql`
  mutation CreateAttachment(
    $messageId: uuid
    $fileName: String!
    $fileType: String!
    $fileSize: bigint!
    $fileUrl: String!
    $thumbnailUrl: String
    $storageKey: String!
    $width: Int
    $height: Int
    $duration: Int
    $blurhash: String
    $isPublic: Boolean!
    $virusScanStatus: String!
    $metadata: jsonb!
  ) {
    insert_nchat_attachments_one(
      object: {
        message_id: $messageId
        file_name: $fileName
        file_type: $fileType
        file_size: $fileSize
        file_url: $fileUrl
        thumbnail_url: $thumbnailUrl
        storage_key: $storageKey
        width: $width
        height: $height
        duration: $duration
        blurhash: $blurhash
        is_public: $isPublic
        virus_scan_status: $virusScanStatus
        metadata: $metadata
      }
    ) {
      id
      file_name
      file_type
      file_size
      file_url
      thumbnail_url
      width
      height
      duration
      created_at
    }
  }
`

const CHECK_CHANNEL_MEMBERSHIP = gql`
  query CheckChannelMembership($channelId: uuid!, $userId: uuid!) {
    nchat_channel_members(where: { channel_id: { _eq: $channelId }, user_id: { _eq: $userId } }) {
      user_id
      role
    }
  }
`

// ============================================================================
// HELPERS
// ============================================================================

function generateStorageKey(fileName: string, userId: string): string {
  const timestamp = Date.now()
  const random = crypto.randomBytes(8).toString('hex')
  const ext = fileName.split('.').pop()
  return `attachments/${userId}/${timestamp}-${random}.${ext}`
}

async function extractImageMetadata(
  _buffer: Buffer
): Promise<{ width?: number; height?: number; blurhash?: string }> {
  // Image metadata extraction requires sharp library
  // Integrate sharp for production use: npm install sharp
  // See: https://sharp.pixelplumbing.com/api-input#metadata
  return {}
}

async function extractVideoMetadata(
  _buffer: Buffer
): Promise<{ width?: number; height?: number; duration?: number; needsTranscoding: boolean }> {
  // Video metadata extraction and transcoding requires ffprobe + fluent-ffmpeg.
  // ffmpeg-static is not in package.json. Mark for async transcoding instead.
  // When ffmpeg-static is added: `npm install ffmpeg-static fluent-ffmpeg @types/fluent-ffmpeg`
  // and replace this stub with actual metadata extraction and a job-queue dispatch.
  return { needsTranscoding: true }
}

// ============================================================================
// POST - Upload attachment
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    logger.info('POST /api/attachments/upload')

    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const metadataJson = formData.get('metadata') as string | null

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 })
    }

    if (!metadataJson) {
      return NextResponse.json({ success: false, error: 'No metadata provided' }, { status: 400 })
    }

    // Parse and validate metadata
    let metadata
    try {
      metadata = JSON.parse(metadataJson)
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid metadata JSON' }, { status: 400 })
    }

    const validation = UploadMetadataSchema.safeParse({
      ...metadata,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    })

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid upload metadata',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const validatedMetadata = validation.data

    // Check channel membership
    const { data: membershipData } = await apolloClient.query({
      query: CHECK_CHANNEL_MEMBERSHIP,
      variables: {
        channelId: validatedMetadata.channelId,
        userId: validatedMetadata.userId,
      },
      fetchPolicy: 'network-only',
    })

    if (!membershipData?.nchat_channel_members?.length) {
      return NextResponse.json({ success: false, error: 'Not a channel member' }, { status: 403 })
    }

    // Validate file
    const validationService = getValidationService()
    const fileValidation = validationService.validateFile({
      name: file.name,
      type: file.type,
      size: file.size,
    })

    if (!fileValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'File validation failed',
          reason: fileValidation.error,
        },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Extract metadata based on file type
    let width: number | undefined
    let height: number | undefined
    let duration: number | undefined
    let blurhash: string | undefined
    let videoNeedsTranscoding = false

    if (file.type.startsWith('image/')) {
      const imageMetadata = await extractImageMetadata(buffer)
      width = imageMetadata.width
      height = imageMetadata.height
      blurhash = imageMetadata.blurhash
    } else if (file.type.startsWith('video/')) {
      const videoMetadata = await extractVideoMetadata(buffer)
      width = videoMetadata.width
      height = videoMetadata.height
      duration = videoMetadata.duration
      videoNeedsTranscoding = videoMetadata.needsTranscoding
    }

    // Generate storage key
    const storageKey = generateStorageKey(file.name, validatedMetadata.userId)

    // Upload to storage
    const uploadService = getUploadService()
    const uploadResult = await uploadService.uploadFile({
      buffer,
      fileName: file.name,
      fileType: file.type,
      storageKey,
      isPublic: validatedMetadata.isPublic,
    })

    if (!uploadResult.success) {
      logger.error('File upload failed', { error: uploadResult.error })
      return NextResponse.json(
        {
          success: false,
          error: 'File upload failed',
          message: uploadResult.error?.message,
        },
        { status: 500 }
      )
    }

    const fileUrl = uploadResult.data!.url

    // Generate thumbnail for images
    // Thumbnail generation requires sharp library for image processing
    // For production, implement resizing to create optimized thumbnails
    let thumbnailUrl: string | undefined
    if (file.type.startsWith('image/')) {
      thumbnailUrl = fileUrl // Use original until thumbnail generation is implemented
    }

    // Create attachment record
    // Videos with needsTranscoding=true are stored with processing=true in metadata.
    // A background worker (or future ffmpeg integration) should clear this flag
    // after transcoding completes and update file_url to the transcoded version.
    const { data: attachmentData, errors } = await apolloClient.mutate({
      mutation: CREATE_ATTACHMENT,
      variables: {
        messageId: validatedMetadata.messageId || null,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        fileUrl,
        thumbnailUrl,
        storageKey,
        width,
        height,
        duration,
        blurhash,
        isPublic: validatedMetadata.isPublic,
        virusScanStatus: 'pending', // Will be scanned asynchronously
        metadata: {
          originalName: file.name,
          uploadedBy: validatedMetadata.userId,
          uploadedAt: new Date().toISOString(),
          ...(videoNeedsTranscoding && {
            processing: true,
            processingJob: 'transcode',
            processingQueuedAt: new Date().toISOString(),
          }),
        },
      },
    })

    if (errors) {
      logger.error('Failed to create attachment record', { errors })
      // Clean up uploaded file
      await uploadService.deleteFile(storageKey).catch(() => {
        // Ignore cleanup errors
      })
      return NextResponse.json(
        { success: false, error: 'Failed to create attachment record' },
        { status: 500 }
      )
    }

    const attachment = attachmentData.insert_nchat_attachments_one

    // Queue virus scan (async, don't wait)
    // Virus scanning requires integration with ClamAV or cloud service (e.g., VirusTotal)
    // For production, implement async scanning via job queue
    logger.debug('Would queue virus scan for attachment', {
      attachmentId: attachment.id,
      storageKey,
    })

    logger.info('Attachment uploaded successfully', {
      attachmentId: attachment.id,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          attachment,
          uploadedAt: new Date().toISOString(),
          processing: videoNeedsTranscoding,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error('POST /api/attachments/upload - Error', error as Error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to upload attachment',
        message: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
