/**
 * File Service Configuration
 *
 * Storage and processing configuration for the file attachments system.
 * Reads from environment variables with sensible defaults.
 *
 * Environment Variables:
 * - STORAGE_ENDPOINT - S3/MinIO endpoint URL
 * - STORAGE_BUCKET - Storage bucket name
 * - STORAGE_ACCESS_KEY - AWS/MinIO access key
 * - STORAGE_SECRET_KEY - AWS/MinIO secret key
 * - STORAGE_REGION - AWS region (default: us-east-1)
 * - NEXT_PUBLIC_STORAGE_URL - Nhost storage URL (alternative)
 */

import type { StorageConfig, FileTypeConfig, StorageProvider } from './types'
import { DEFAULT_FILE_CONFIG } from './types'

// ============================================================================
// Environment Variable Readers
// ============================================================================

function getEnv(key: string, defaultValue = ''): string {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || defaultValue
  }
  return defaultValue
}

function getEnvBool(key: string, defaultValue = false): boolean {
  const value = getEnv(key)
  if (!value) return defaultValue
  return value.toLowerCase() === 'true' || value === '1'
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = getEnv(key)
  if (!value) return defaultValue
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? defaultValue : parsed
}

function getEnvArray(key: string, defaultValue: string[] = []): string[] {
  const value = getEnv(key)
  if (!value) return defaultValue
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

// ============================================================================
// Storage Configuration
// ============================================================================

/**
 * Get storage configuration from environment variables
 *
 * Supports both legacy FILE_STORAGE_* and new STORAGE_* env vars
 */
export function getStorageConfig(): StorageConfig {
  const provider = (getEnv('FILE_STORAGE_PROVIDER') ||
    getEnv('STORAGE_PROVIDER', 'minio')) as StorageProvider

  // Use new STORAGE_* vars with fallback to legacy FILE_STORAGE_* vars
  return {
    provider,
    bucket: getEnv('STORAGE_BUCKET') || getEnv('FILE_STORAGE_BUCKET', 'nchat-files'),
    endpoint:
      getEnv('STORAGE_ENDPOINT') || getEnv('FILE_STORAGE_ENDPOINT', 'http://localhost:9000'),
    region: getEnv('STORAGE_REGION') || getEnv('FILE_STORAGE_REGION', 'us-east-1'),
    accessKey: getEnv('STORAGE_ACCESS_KEY') || getEnv('FILE_STORAGE_ACCESS_KEY', 'minioadmin'),
    secretKey: getEnv('STORAGE_SECRET_KEY') || getEnv('FILE_STORAGE_SECRET_KEY', 'minioadmin'),
    publicUrlBase: getEnv('FILE_STORAGE_PUBLIC_URL') || getEnv('NEXT_PUBLIC_STORAGE_URL'),
  }
}

/**
 * Get file type configuration from environment variables
 */
export function getFileTypeConfig(): FileTypeConfig {
  return {
    maxSize: getEnvNumber('FILE_MAX_SIZE', DEFAULT_FILE_CONFIG.maxSize),
    allowedMimeTypes: getEnvArray('FILE_ALLOWED_TYPES', DEFAULT_FILE_CONFIG.allowedMimeTypes),
    blockedMimeTypes: getEnvArray('FILE_BLOCKED_TYPES', DEFAULT_FILE_CONFIG.blockedMimeTypes),
    allowedExtensions: getEnvArray(
      'FILE_ALLOWED_EXTENSIONS',
      DEFAULT_FILE_CONFIG.allowedExtensions
    ),
    blockedExtensions: getEnvArray(
      'FILE_BLOCKED_EXTENSIONS',
      DEFAULT_FILE_CONFIG.blockedExtensions
    ),
    enableVirusScan: getEnvBool('FILE_ENABLE_VIRUS_SCAN', DEFAULT_FILE_CONFIG.enableVirusScan),
    enableOptimization: getEnvBool(
      'FILE_ENABLE_OPTIMIZATION',
      DEFAULT_FILE_CONFIG.enableOptimization
    ),
    stripExif: getEnvBool('FILE_STRIP_EXIF', DEFAULT_FILE_CONFIG.stripExif),
    generateThumbnails: getEnvBool(
      'FILE_GENERATE_THUMBNAILS',
      DEFAULT_FILE_CONFIG.generateThumbnails
    ),
    thumbnailSizes: getEnvArray(
      'FILE_THUMBNAIL_SIZES',
      DEFAULT_FILE_CONFIG.thumbnailSizes.map(String)
    ).map(Number),
  }
}

// ============================================================================
// Processing Plugin Configuration
// ============================================================================

export interface ProcessingPluginConfig {
  /** Base URL of the file-processing plugin server */
  baseUrl: string
  /** Webhook URL for processing completion callbacks */
  webhookUrl: string
  /** Webhook secret for signature verification */
  webhookSecret: string
  /** Queue concurrency */
  concurrency: number
  /** Request timeout in milliseconds */
  timeout: number
}

/**
 * Get file-processing plugin configuration
 */
export function getProcessingConfig(): ProcessingPluginConfig {
  return {
    baseUrl: getEnv('FILE_PROCESSING_URL', 'http://localhost:3104'),
    webhookUrl: getEnv('FILE_PROCESSING_WEBHOOK_URL', ''),
    webhookSecret: getEnv('FILE_PROCESSING_WEBHOOK_SECRET', ''),
    concurrency: getEnvNumber('FILE_QUEUE_CONCURRENCY', 3),
    timeout: getEnvNumber('FILE_PROCESSING_TIMEOUT', 30000),
  }
}

// ============================================================================
// S3-compatible Client Configuration
// ============================================================================

export interface S3ClientConfig {
  endpoint: string
  region: string
  credentials: {
    accessKeyId: string
    secretAccessKey: string
  }
  forcePathStyle: boolean
}

/**
 * Get S3 client configuration for the storage adapter
 */
export function getS3ClientConfig(): S3ClientConfig {
  const storage = getStorageConfig()

  return {
    endpoint: storage.endpoint || 'http://localhost:9000',
    region: storage.region || 'us-east-1',
    credentials: {
      accessKeyId: storage.accessKey || '',
      secretAccessKey: storage.secretKey || '',
    },
    forcePathStyle: storage.provider === 'minio',
  }
}

// ============================================================================
// URL Generation
// ============================================================================

/**
 * Get the public URL for a file
 */
export function getPublicFileUrl(storagePath: string): string {
  const config = getStorageConfig()

  // Use Nhost storage URL if available
  const nhostStorageUrl = getEnv('NEXT_PUBLIC_STORAGE_URL')
  if (nhostStorageUrl) {
    return `${nhostStorageUrl}/files/${storagePath}`
  }

  if (config.publicUrlBase) {
    return `${config.publicUrlBase}/${storagePath}`
  }

  // Default MinIO URL pattern
  return `${config.endpoint}/${config.bucket}/${storagePath}`
}

/**
 * Get the internal storage path for a file
 * @deprecated Use generateStoragePath from upload.service instead
 */
export function generateStoragePath(
  fileId: string,
  fileName: string,
  options: {
    channelId?: string
    userId?: string
    prefix?: string
  } = {}
): string {
  const { channelId, userId, prefix = 'uploads' } = options
  const extension = fileName.split('.').pop()?.toLowerCase() || ''
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  let path = prefix

  if (channelId) {
    path += `/channels/${channelId}`
  } else if (userId) {
    path += `/users/${userId}`
  }

  path += `/${year}/${month}/${day}`
  path += `/${fileId}`

  if (extension) {
    path += `.${extension}`
  }

  return path
}

/**
 * Generate thumbnail storage path
 */
export function generateThumbnailPath(
  fileId: string,
  size: number,
  format: 'jpeg' | 'png' | 'webp' = 'jpeg'
): string {
  return `thumbnails/${fileId}/${size}.${format}`
}

// ============================================================================
// Constants
// ============================================================================

export const FILE_SERVICE_CONSTANTS = {
  /** Default URL expiration time in seconds */
  DEFAULT_URL_EXPIRY: 3600,

  /** Maximum URL expiration time in seconds */
  MAX_URL_EXPIRY: 86400, // 24 hours

  /** Chunk size for multipart uploads */
  CHUNK_SIZE: 5 * 1024 * 1024, // 5MB

  /** Maximum number of concurrent uploads */
  MAX_CONCURRENT_UPLOADS: 3,

  /** Upload retry count */
  MAX_RETRIES: 3,

  /** Retry delay in milliseconds */
  RETRY_DELAY: 1000,

  /** Default thumbnail sizes */
  THUMBNAIL_SIZES: [100, 400, 1200],

  /** Supported image formats for thumbnails */
  THUMBNAIL_FORMATS: ['jpeg', 'png', 'webp'] as const,

  /** Image MIME types that support thumbnails */
  THUMBNAIL_SUPPORTED_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/tiff',
  ],

  /** Video MIME types that support thumbnails */
  VIDEO_THUMBNAIL_SUPPORTED_TYPES: [
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-matroska',
  ],

  /** Maximum file size for regular users (25MB) */
  REGULAR_MAX_SIZE: 25 * 1024 * 1024,

  /** Maximum file size for premium users (100MB) */
  PREMIUM_MAX_SIZE: 100 * 1024 * 1024,

  /** Maximum file size for admins (500MB) */
  ADMIN_MAX_SIZE: 500 * 1024 * 1024,

  /** Virus scanner defaults */
  VIRUS_SCANNER: {
    /** Default timeout for scans in milliseconds */
    DEFAULT_TIMEOUT: 60000,
    /** Maximum file size to scan (100MB) */
    MAX_SCAN_SIZE: 100 * 1024 * 1024,
    /** ClamAV default port */
    CLAMAV_DEFAULT_PORT: 3310,
    /** VirusTotal API URL */
    VIRUSTOTAL_API_URL: 'https://www.virustotal.com/api/v3',
    /** Health check interval in milliseconds */
    HEALTH_CHECK_INTERVAL: 60000,
  },
} as const

// ============================================================================
// Virus Scanner Configuration
// ============================================================================

export interface VirusScannerConfig {
  /** Enable virus scanning */
  enabled: boolean
  /** Primary scanner backend: 'clamav' | 'virustotal' | 'plugin' | 'none' */
  backend: 'clamav' | 'virustotal' | 'plugin' | 'none'
  /** Fallback backend if primary fails */
  fallbackBackend?: 'clamav' | 'virustotal' | 'plugin' | 'none'
  /** Block uploads when scanner is unavailable */
  blockOnScannerUnavailable: boolean
  /** Quarantine infected files instead of deleting */
  quarantineInfected: boolean
  /** Maximum file size to scan in bytes */
  maxScanSize: number
  /** Scan timeout in milliseconds */
  timeout: number
  /** ClamAV configuration */
  clamav?: {
    host: string
    port: number
    timeout?: number
  }
  /** VirusTotal configuration */
  virustotal?: {
    apiKey: string
    apiUrl?: string
    waitForResult?: boolean
    maxWaitTime?: number
  }
  /** Plugin scanner configuration */
  plugin?: {
    baseUrl: string
    timeout?: number
  }
}

/**
 * Get virus scanner configuration from environment variables
 *
 * Environment variables:
 * - FILE_ENABLE_VIRUS_SCAN: Enable/disable scanning (default: false)
 * - VIRUS_SCANNER_BACKEND: Explicit backend override
 * - VIRUS_SCANNER_FALLBACK: Fallback backend
 * - VIRUS_SCANNER_BLOCK_ON_UNAVAILABLE: Block if scanner unavailable
 * - VIRUS_SCANNER_QUARANTINE: Quarantine infected files
 * - VIRUS_SCANNER_MAX_SIZE: Max file size to scan
 * - VIRUS_SCANNER_TIMEOUT: Scan timeout
 * - CLAMAV_HOST, CLAMAV_PORT, CLAMAV_TIMEOUT: ClamAV config
 * - VIRUSTOTAL_API_KEY, VIRUSTOTAL_API_URL: VirusTotal config
 * - FILE_PROCESSING_URL: Plugin scanner URL
 */
export function getVirusScannerConfig(): VirusScannerConfig {
  const enabled = getEnvBool('FILE_ENABLE_VIRUS_SCAN', false)

  // Determine backend based on available configuration
  let backend: VirusScannerConfig['backend'] = 'none'

  const clamavHost = getEnv('CLAMAV_HOST')
  const virustotalKey = getEnv('VIRUSTOTAL_API_KEY')
  const pluginUrl = getEnv('FILE_PROCESSING_URL')

  // Priority: ClamAV > VirusTotal > Plugin > None
  if (clamavHost) {
    backend = 'clamav'
  } else if (virustotalKey) {
    backend = 'virustotal'
  } else if (pluginUrl && enabled) {
    backend = 'plugin'
  }

  // Allow explicit backend override
  const explicitBackend = getEnv('VIRUS_SCANNER_BACKEND')
  if (explicitBackend && ['clamav', 'virustotal', 'plugin', 'none'].includes(explicitBackend)) {
    backend = explicitBackend as VirusScannerConfig['backend']
  }

  return {
    enabled,
    backend,
    fallbackBackend: getEnv('VIRUS_SCANNER_FALLBACK') as VirusScannerConfig['fallbackBackend'],
    // Security-first: block by default when scanner is unavailable.
    // Operators may opt out via VIRUS_SCANNER_BLOCK_ON_UNAVAILABLE=false
    // or the alias NCHAT_UPLOAD_SCAN_OPTIONAL=true.
    blockOnScannerUnavailable: getEnvBool(
      'VIRUS_SCANNER_BLOCK_ON_UNAVAILABLE',
      getEnv('NCHAT_UPLOAD_SCAN_OPTIONAL') !== 'true'
    ),
    quarantineInfected: getEnvBool('VIRUS_SCANNER_QUARANTINE', true),
    maxScanSize: getEnvNumber(
      'VIRUS_SCANNER_MAX_SIZE',
      FILE_SERVICE_CONSTANTS.VIRUS_SCANNER.MAX_SCAN_SIZE
    ),
    timeout: getEnvNumber(
      'VIRUS_SCANNER_TIMEOUT',
      FILE_SERVICE_CONSTANTS.VIRUS_SCANNER.DEFAULT_TIMEOUT
    ),

    clamav: clamavHost
      ? {
          host: clamavHost,
          port: getEnvNumber('CLAMAV_PORT', FILE_SERVICE_CONSTANTS.VIRUS_SCANNER.CLAMAV_DEFAULT_PORT),
          timeout: getEnvNumber('CLAMAV_TIMEOUT', 30000),
        }
      : undefined,

    virustotal: virustotalKey
      ? {
          apiKey: virustotalKey,
          apiUrl: getEnv(
            'VIRUSTOTAL_API_URL',
            FILE_SERVICE_CONSTANTS.VIRUS_SCANNER.VIRUSTOTAL_API_URL
          ),
          waitForResult: getEnvBool('VIRUSTOTAL_WAIT_FOR_RESULT', true),
          maxWaitTime: getEnvNumber('VIRUSTOTAL_MAX_WAIT_TIME', 120000),
        }
      : undefined,

    plugin: pluginUrl
      ? {
          baseUrl: pluginUrl,
          timeout: getEnvNumber('FILE_PROCESSING_TIMEOUT', 30000),
        }
      : undefined,
  }
}
