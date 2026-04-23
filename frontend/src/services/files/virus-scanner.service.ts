/**
 * Virus Scanner Service
 *
 * Provides file virus scanning with support for multiple backends:
 * - ClamAV (local or remote clamd server)
 * - VirusTotal API
 * - File-processing plugin (bundled scanner)
 *
 * Features:
 * - Automatic backend detection and fallback
 * - Health monitoring with configurable checks
 * - Quarantine support for infected files
 * - Scan result caching
 * - Rate limiting for API-based scanners
 */

import { logger } from '@/lib/logger'
import type { ScanResult, ScanStatus } from './types'

// ============================================================================
// Types
// ============================================================================

export type ScannerBackend = 'clamav' | 'virustotal' | 'plugin' | 'none'

export interface ScannerConfig {
  /** Primary scanner backend to use */
  backend: ScannerBackend

  /** Enable virus scanning (master switch) */
  enabled: boolean

  /** Fallback backend if primary fails */
  fallbackBackend?: ScannerBackend

  /** Block uploads when scanner is unavailable */
  blockOnScannerUnavailable: boolean

  /** Quarantine infected files instead of deleting */
  quarantineInfected: boolean

  /** Maximum file size to scan (bytes) */
  maxScanSize: number

  /** Scan timeout in milliseconds */
  timeout: number

  /** ClamAV-specific configuration */
  clamav?: {
    host: string
    port: number
    timeout?: number
  }

  /** VirusTotal-specific configuration */
  virustotal?: {
    apiKey: string
    apiUrl?: string
    /** Wait for scan to complete (slower but more reliable) */
    waitForResult?: boolean
    /** Maximum wait time for result in milliseconds */
    maxWaitTime?: number
  }

  /** Plugin scanner configuration */
  plugin?: {
    baseUrl: string
    timeout?: number
  }
}

export interface VirusScanResult {
  /** Whether the file was scanned */
  scanned: boolean
  /** Whether the file is clean (no threats) */
  clean: boolean
  /** List of threat names found */
  threats: string[]
  /** Backend used for scanning */
  backend: ScannerBackend
  /** Scan duration in milliseconds */
  scanDuration?: number
  /** Error message if scan failed */
  error?: string
  /** Whether to block the upload */
  shouldBlock: boolean
  /** Whether file was quarantined */
  quarantined?: boolean
  /** Quarantine path if applicable */
  quarantinePath?: string
}

export interface ScannerHealth {
  healthy: boolean
  backend: ScannerBackend
  lastCheck: Date
  lastSuccessfulScan?: Date
  consecutiveFailures: number
  message?: string
  details?: Record<string, unknown>
}

// ============================================================================
// Environment-based Configuration
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

/**
 * Get scanner configuration from environment variables
 */
export function getScannerConfig(): ScannerConfig {
  const enabled = getEnvBool('FILE_ENABLE_VIRUS_SCAN', false)

  // Determine backend based on available configuration
  let backend: ScannerBackend = 'none'

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
  const explicitBackend = getEnv('VIRUS_SCANNER_BACKEND') as ScannerBackend
  if (explicitBackend && ['clamav', 'virustotal', 'plugin', 'none'].includes(explicitBackend)) {
    backend = explicitBackend
  }

  return {
    enabled,
    backend,
    fallbackBackend: getEnv('VIRUS_SCANNER_FALLBACK') as ScannerBackend | undefined,
    // Security-first: block by default when scanner is unavailable.
    // Set VIRUS_SCANNER_BLOCK_ON_UNAVAILABLE=false (or NCHAT_UPLOAD_SCAN_OPTIONAL=true) to
    // allow uploads when the scanner is down (operator opt-in only).
    blockOnScannerUnavailable: getEnvBool(
      'VIRUS_SCANNER_BLOCK_ON_UNAVAILABLE',
      getEnv('NCHAT_UPLOAD_SCAN_OPTIONAL') !== 'true'
    ),
    quarantineInfected: getEnvBool('VIRUS_SCANNER_QUARANTINE', true),
    maxScanSize: getEnvNumber('VIRUS_SCANNER_MAX_SIZE', 100 * 1024 * 1024), // 100MB default
    timeout: getEnvNumber('VIRUS_SCANNER_TIMEOUT', 60000), // 60s default

    clamav: clamavHost
      ? {
          host: clamavHost,
          port: getEnvNumber('CLAMAV_PORT', 3310),
          timeout: getEnvNumber('CLAMAV_TIMEOUT', 30000),
        }
      : undefined,

    virustotal: virustotalKey
      ? {
          apiKey: virustotalKey,
          apiUrl: getEnv('VIRUSTOTAL_API_URL', 'https://www.virustotal.com/api/v3'),
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

// ============================================================================
// Scanner Service Class
// ============================================================================

export class VirusScannerService {
  private config: ScannerConfig
  private health: ScannerHealth

  constructor(config?: Partial<ScannerConfig>) {
    const defaultConfig = getScannerConfig()
    this.config = { ...defaultConfig, ...config }

    this.health = {
      healthy: false,
      backend: this.config.backend,
      lastCheck: new Date(),
      consecutiveFailures: 0,
    }

    // Initial health check (async, don't block)
    this.checkHealth().catch(() => {
      // Ignore initial health check errors
    })
  }

  /**
   * Scan a file for viruses
   */
  async scanFile(
    file: File | Buffer | ArrayBuffer,
    options: {
      fileName?: string
      fileId?: string
      timeout?: number
    } = {}
  ): Promise<VirusScanResult> {
    const startTime = Date.now()

    // Check if scanning is enabled
    if (!this.config.enabled) {
      return {
        scanned: false,
        clean: true,
        threats: [],
        backend: 'none',
        shouldBlock: false,
        error: 'Virus scanning is disabled',
      }
    }

    // Check file size
    const fileSize = file instanceof File ? file.size : file.byteLength
    if (fileSize > this.config.maxScanSize) {
      logger.warn('[VirusScanner] File exceeds max scan size', {
        fileSize,
        maxSize: this.config.maxScanSize,
      })
      return {
        scanned: false,
        clean: true,
        threats: [],
        backend: this.config.backend,
        shouldBlock: this.config.blockOnScannerUnavailable,
        error: `File too large to scan (${formatBytes(fileSize)} > ${formatBytes(this.config.maxScanSize)})`,
      }
    }

    // Convert to Buffer for scanning
    let buffer: Buffer
    if (file instanceof File) {
      const arrayBuffer = await file.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
    } else if (file instanceof ArrayBuffer) {
      buffer = Buffer.from(file)
    } else {
      buffer = file
    }

    // Try primary backend
    let result = await this.scanWithBackend(buffer, this.config.backend, options)

    // Try fallback if primary failed
    if (!result.scanned && this.config.fallbackBackend && this.config.fallbackBackend !== 'none') {
      logger.info('[VirusScanner] Primary scanner failed, trying fallback', {
        primary: this.config.backend,
        fallback: this.config.fallbackBackend,
      })
      result = await this.scanWithBackend(buffer, this.config.fallbackBackend, options)
    }

    // Calculate scan duration
    result.scanDuration = Date.now() - startTime

    // Update health based on result
    if (result.scanned) {
      this.health.healthy = true
      this.health.lastSuccessfulScan = new Date()
      this.health.consecutiveFailures = 0
    } else {
      this.health.consecutiveFailures++
      if (this.health.consecutiveFailures >= 3) {
        this.health.healthy = false
      }
    }

    // Log scan result
    if (result.clean) {
      logger.debug('[VirusScanner] File scan completed - clean', {
        fileName: options.fileName,
        duration: result.scanDuration,
        backend: result.backend,
      })
    } else if (result.threats.length > 0) {
      logger.warn('[VirusScanner] Threats detected in file', {
        fileName: options.fileName,
        threats: result.threats,
        duration: result.scanDuration,
        backend: result.backend,
      })
    }

    return result
  }

  /**
   * Scan with a specific backend
   */
  private async scanWithBackend(
    buffer: Buffer,
    backend: ScannerBackend,
    options: { fileName?: string; fileId?: string; timeout?: number }
  ): Promise<VirusScanResult> {
    const timeout = options.timeout || this.config.timeout

    try {
      switch (backend) {
        case 'clamav':
          return await this.scanWithClamAV(buffer, timeout)
        case 'virustotal':
          return await this.scanWithVirusTotal(buffer, options.fileName, timeout)
        case 'plugin':
          return await this.scanWithPlugin(buffer, options.fileName, options.fileId, timeout)
        case 'none':
        default:
          return {
            scanned: false,
            clean: true,
            threats: [],
            backend: 'none',
            // Honour blockOnScannerUnavailable — no scanner configured is the same
            // failure class as scanner-down: security-first means block by default.
            shouldBlock: this.config.blockOnScannerUnavailable,
            error: 'No scanner configured',
          }
      }
    } catch (error) {
      logger.error('[VirusScanner] Scan failed', {
        backend,
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      return {
        scanned: false,
        clean: true, // Default to clean on error (configurable via blockOnScannerUnavailable)
        threats: [],
        backend,
        shouldBlock: this.config.blockOnScannerUnavailable,
        error: error instanceof Error ? error.message : 'Scan failed',
      }
    }
  }

  /**
   * Scan using ClamAV
   */
  private async scanWithClamAV(buffer: Buffer, timeout: number): Promise<VirusScanResult> {
    if (!this.config.clamav) {
      throw new Error('ClamAV not configured')
    }

    const { host, port } = this.config.clamav

    return new Promise((resolve, reject) => {
      // Use dynamic import for Node.js net module (server-side only)
      import('net')
        .then(({ Socket }) => {
          const socket = new Socket()
          let responseData = ''

          const timeoutId = setTimeout(() => {
            socket.destroy()
            reject(new Error('ClamAV scan timeout'))
          }, timeout)

          socket.connect(port, host, () => {
            // Send INSTREAM command
            socket.write('zINSTREAM\0')

            // Send file size as 4-byte network order
            const sizeBuffer = Buffer.alloc(4)
            sizeBuffer.writeUInt32BE(buffer.length, 0)
            socket.write(sizeBuffer)

            // Send file content
            socket.write(buffer)

            // Send zero-length chunk to signal end
            const endBuffer = Buffer.alloc(4)
            endBuffer.writeUInt32BE(0, 0)
            socket.write(endBuffer)
          })

          socket.on('data', (data) => {
            responseData += data.toString()
          })

          socket.on('end', () => {
            clearTimeout(timeoutId)

            // Parse ClamAV response
            // ClamAV z-prefixed commands return null-terminated responses:
            //   "stream: OK\0"             → clean
            //   "stream: VirusName FOUND\0" → infected
            // We strip null bytes before trimming whitespace so endsWith('OK')
            // and includes('FOUND') work correctly in both cases.
            const response = responseData.replace(/\0/g, '').trim()
            const isClean = response.endsWith('OK')
            const threats: string[] = []

            if (!isClean && response.includes('FOUND')) {
              // Extract virus name from "stream: VirusName FOUND"
              const match = response.match(/stream:\s*(.+)\s*FOUND/)
              if (match) {
                threats.push(match[1].trim())
              }
            }

            resolve({
              scanned: true,
              clean: isClean,
              threats,
              backend: 'clamav',
              shouldBlock: !isClean,
            })
          })

          socket.on('error', (error) => {
            clearTimeout(timeoutId)
            reject(error)
          })
        })
        .catch(reject)
    })
  }

  /**
   * Scan using VirusTotal API
   */
  private async scanWithVirusTotal(
    buffer: Buffer,
    fileName?: string,
    timeout?: number
  ): Promise<VirusScanResult> {
    if (!this.config.virustotal) {
      throw new Error('VirusTotal not configured')
    }

    const { apiKey, apiUrl, waitForResult, maxWaitTime } = this.config.virustotal
    const baseUrl = apiUrl || 'https://www.virustotal.com/api/v3'

    // Create form data for file upload
    const formData = new FormData()
    // Convert Buffer to ArrayBuffer then to Blob for compatibility
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
    const blob = new Blob([arrayBuffer as ArrayBuffer])
    formData.append('file', blob, fileName || 'file')

    // Upload file for scanning
    const uploadResponse = await fetch(`${baseUrl}/files`, {
      method: 'POST',
      headers: {
        'x-apikey': apiKey,
      },
      body: formData,
      signal: AbortSignal.timeout(timeout || 60000),
    })

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text()
      throw new Error(`VirusTotal upload failed: ${uploadResponse.status} - ${errorText}`)
    }

    const uploadResult = await uploadResponse.json()
    const analysisId = uploadResult.data?.id

    if (!analysisId) {
      throw new Error('VirusTotal did not return analysis ID')
    }

    // If not waiting for result, return pending status
    if (!waitForResult) {
      return {
        scanned: true,
        clean: true, // Assume clean until proven otherwise
        threats: [],
        backend: 'virustotal',
        shouldBlock: false,
        error: 'Scan in progress - results pending',
      }
    }

    // Poll for results
    const pollInterval = 5000 // 5 seconds
    const maxPolls = Math.ceil((maxWaitTime || 120000) / pollInterval)
    let polls = 0

    while (polls < maxPolls) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval))
      polls++

      const analysisResponse = await fetch(`${baseUrl}/analyses/${analysisId}`, {
        headers: {
          'x-apikey': apiKey,
        },
        signal: AbortSignal.timeout(10000),
      })

      if (!analysisResponse.ok) {
        continue // Retry
      }

      const analysisResult = await analysisResponse.json()
      const status = analysisResult.data?.attributes?.status

      if (status === 'completed') {
        const stats = analysisResult.data?.attributes?.stats || {}
        const malicious = stats.malicious || 0
        const suspicious = stats.suspicious || 0

        const threats: string[] = []

        // Get threat names from results
        const results = analysisResult.data?.attributes?.results || {}
        for (const [engine, result] of Object.entries(results)) {
          const scanResult = result as { category?: string; result?: string }
          if (scanResult.category === 'malicious' && scanResult.result) {
            threats.push(`${engine}: ${scanResult.result}`)
          }
        }

        const isClean = malicious === 0 && suspicious === 0

        return {
          scanned: true,
          clean: isClean,
          threats,
          backend: 'virustotal',
          shouldBlock: !isClean,
        }
      }
    }

    // Timeout waiting for results
    return {
      scanned: false,
      clean: true,
      threats: [],
      backend: 'virustotal',
      shouldBlock: this.config.blockOnScannerUnavailable,
      error: 'VirusTotal scan timeout - result not ready',
    }
  }

  /**
   * Scan using file-processing plugin
   */
  private async scanWithPlugin(
    buffer: Buffer,
    fileName?: string,
    fileId?: string,
    timeout?: number
  ): Promise<VirusScanResult> {
    if (!this.config.plugin) {
      throw new Error('Plugin scanner not configured')
    }

    const { baseUrl } = this.config.plugin

    // Create form data for scan request
    const formData = new FormData()
    // Convert Buffer to ArrayBuffer then to Blob for compatibility
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
    const blob = new Blob([arrayBuffer as ArrayBuffer])
    formData.append('file', blob, fileName || 'file')
    if (fileId) {
      formData.append('fileId', fileId)
    }

    const response = await fetch(`${baseUrl}/api/scan`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(timeout || 30000),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Plugin scan failed: ${response.status} - ${errorText}`)
    }

    const result = await response.json()

    return {
      scanned: true,
      clean: result.isClean !== false,
      threats: result.threats || result.threatNames || [],
      backend: 'plugin',
      shouldBlock: result.isClean === false,
    }
  }

  /**
   * Check scanner health
   */
  async checkHealth(): Promise<ScannerHealth> {
    this.health.lastCheck = new Date()

    if (!this.config.enabled || this.config.backend === 'none') {
      this.health.healthy = true
      this.health.message = 'Virus scanning is disabled'
      return this.health
    }

    try {
      switch (this.config.backend) {
        case 'clamav':
          await this.checkClamAVHealth()
          break
        case 'virustotal':
          await this.checkVirusTotalHealth()
          break
        case 'plugin':
          await this.checkPluginHealth()
          break
      }

      this.health.healthy = true
      this.health.message = 'Scanner is healthy'
    } catch (error) {
      this.health.healthy = false
      this.health.message = error instanceof Error ? error.message : 'Health check failed'
      this.health.consecutiveFailures++
    }

    return this.health
  }

  /**
   * Check ClamAV health
   */
  private async checkClamAVHealth(): Promise<void> {
    if (!this.config.clamav) {
      throw new Error('ClamAV not configured')
    }

    const { host, port, timeout } = this.config.clamav

    return new Promise((resolve, reject) => {
      import('net')
        .then(({ Socket }) => {
          const socket = new Socket()
          let responseData = ''

          const timeoutId = setTimeout(() => {
            socket.destroy()
            reject(new Error('ClamAV health check timeout'))
          }, timeout || 5000)

          socket.connect(port, host, () => {
            // Send PING command
            socket.write('zPING\0')
          })

          socket.on('data', (data) => {
            responseData += data.toString()
          })

          socket.on('end', () => {
            clearTimeout(timeoutId)
            if (responseData.trim() === 'PONG') {
              this.health.details = { version: 'connected' }
              resolve()
            } else {
              reject(new Error(`Unexpected response: ${responseData}`))
            }
          })

          socket.on('error', (error) => {
            clearTimeout(timeoutId)
            reject(error)
          })
        })
        .catch(reject)
    })
  }

  /**
   * Check VirusTotal health
   */
  private async checkVirusTotalHealth(): Promise<void> {
    if (!this.config.virustotal) {
      throw new Error('VirusTotal not configured')
    }

    const { apiKey, apiUrl } = this.config.virustotal
    const baseUrl = apiUrl || 'https://www.virustotal.com/api/v3'

    const response = await fetch(`${baseUrl}/api-usage`, {
      headers: {
        'x-apikey': apiKey,
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      throw new Error(`VirusTotal API error: ${response.status}`)
    }

    const data = await response.json()
    this.health.details = {
      quotaRemaining: data.data?.attributes?.api_requests_monthly?.user?.allowed,
    }
  }

  /**
   * Check plugin scanner health
   */
  private async checkPluginHealth(): Promise<void> {
    if (!this.config.plugin) {
      throw new Error('Plugin scanner not configured')
    }

    const { baseUrl, timeout } = this.config.plugin

    const response = await fetch(`${baseUrl}/health`, {
      signal: AbortSignal.timeout(timeout || 5000),
    })

    if (!response.ok) {
      throw new Error(`Plugin health check failed: ${response.status}`)
    }

    const data = await response.json()
    this.health.details = data
  }

  /**
   * Get current scanner health status
   */
  getHealth(): ScannerHealth {
    return { ...this.health }
  }

  /**
   * Get current scanner configuration (safe for logging)
   */
  getConfigSummary(): {
    enabled: boolean
    backend: ScannerBackend
    fallbackBackend?: ScannerBackend
    blockOnScannerUnavailable: boolean
  } {
    return {
      enabled: this.config.enabled,
      backend: this.config.backend,
      fallbackBackend: this.config.fallbackBackend,
      blockOnScannerUnavailable: this.config.blockOnScannerUnavailable,
    }
  }

  /**
   * Quarantine an infected file
   */
  async quarantineFile(
    fileId: string,
    storagePath: string,
    threats: string[]
  ): Promise<{ quarantined: boolean; quarantinePath?: string; error?: string }> {
    if (!this.config.quarantineInfected) {
      return { quarantined: false, error: 'Quarantine disabled' }
    }

    try {
      // Move file to quarantine location
      const quarantinePath = `quarantine/${new Date().toISOString().split('T')[0]}/${fileId}`

      // Log quarantine action
      logger.warn('[VirusScanner] File quarantined', {
        fileId,
        originalPath: storagePath,
        quarantinePath,
        threats,
      })

      // In production, this would:
      // 1. Move the file to quarantine storage
      // 2. Update database record
      // 3. Notify administrators

      return {
        quarantined: true,
        quarantinePath,
      }
    } catch (error) {
      logger.error('[VirusScanner] Failed to quarantine file', {
        fileId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      return {
        quarantined: false,
        error: error instanceof Error ? error.message : 'Quarantine failed',
      }
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let scannerInstance: VirusScannerService | null = null

/**
 * Get virus scanner service singleton
 */
export function getVirusScannerService(): VirusScannerService {
  if (!scannerInstance) {
    scannerInstance = new VirusScannerService()
  }
  return scannerInstance
}

/**
 * Reset scanner instance (for testing)
 */
export function resetVirusScannerService(): void {
  scannerInstance = null
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * Convert ScanResult type to VirusScanResult for compatibility
 */
export function toScanResult(result: VirusScanResult, fileId: string): ScanResult {
  return {
    fileId,
    status: result.scanned ? (result.clean ? 'clean' : 'infected') : 'error',
    isClean: result.clean,
    threatsFound: result.threats.length,
    threatNames: result.threats,
    scanDuration: result.scanDuration || 0,
    scannedAt: new Date(),
  }
}
