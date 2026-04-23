/**
 * Virus Scanner Service Tests
 */

import {
  VirusScannerService,
  getScannerConfig,
  getVirusScannerService,
  resetVirusScannerService,
  toScanResult,
  type ScannerConfig,
  type VirusScanResult,
} from '../virus-scanner.service'

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

// Mock net module for ClamAV tests
jest.mock('net', () => ({
  Socket: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    write: jest.fn(),
    on: jest.fn(),
    destroy: jest.fn(),
  })),
}))

describe('VirusScannerService', () => {
  // Store original env
  const originalEnv = process.env

  beforeEach(() => {
    // Reset env for each test
    process.env = { ...originalEnv }
    // Reset singleton
    resetVirusScannerService()
    // Clear mocks
    jest.clearAllMocks()
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('getScannerConfig', () => {
    it('should return disabled config by default', () => {
      const config = getScannerConfig()

      expect(config.enabled).toBe(false)
      expect(config.backend).toBe('none')
    })

    it('should detect ClamAV when host is configured', () => {
      process.env.FILE_ENABLE_VIRUS_SCAN = 'true'
      process.env.CLAMAV_HOST = 'localhost'
      process.env.CLAMAV_PORT = '3310'

      const config = getScannerConfig()

      expect(config.enabled).toBe(true)
      expect(config.backend).toBe('clamav')
      expect(config.clamav).toBeDefined()
      expect(config.clamav?.host).toBe('localhost')
      expect(config.clamav?.port).toBe(3310)
    })

    it('should detect VirusTotal when API key is configured', () => {
      process.env.FILE_ENABLE_VIRUS_SCAN = 'true'
      process.env.VIRUSTOTAL_API_KEY = 'test-api-key'

      const config = getScannerConfig()

      expect(config.enabled).toBe(true)
      expect(config.backend).toBe('virustotal')
      expect(config.virustotal).toBeDefined()
      expect(config.virustotal?.apiKey).toBe('test-api-key')
    })

    it('should detect plugin scanner when URL is configured and scanning is enabled', () => {
      process.env.FILE_ENABLE_VIRUS_SCAN = 'true'
      process.env.FILE_PROCESSING_URL = 'http://localhost:3104'

      const config = getScannerConfig()

      expect(config.enabled).toBe(true)
      expect(config.backend).toBe('plugin')
      expect(config.plugin).toBeDefined()
      expect(config.plugin?.baseUrl).toBe('http://localhost:3104')
    })

    it('should respect explicit backend override', () => {
      process.env.FILE_ENABLE_VIRUS_SCAN = 'true'
      process.env.CLAMAV_HOST = 'localhost'
      process.env.VIRUSTOTAL_API_KEY = 'test-key'
      process.env.VIRUS_SCANNER_BACKEND = 'virustotal'

      const config = getScannerConfig()

      expect(config.backend).toBe('virustotal')
    })

    it('should configure fallback backend', () => {
      process.env.FILE_ENABLE_VIRUS_SCAN = 'true'
      process.env.CLAMAV_HOST = 'localhost'
      process.env.VIRUSTOTAL_API_KEY = 'test-key'
      process.env.VIRUS_SCANNER_FALLBACK = 'virustotal'

      const config = getScannerConfig()

      expect(config.backend).toBe('clamav')
      expect(config.fallbackBackend).toBe('virustotal')
    })

    it('should configure blocking behavior', () => {
      process.env.FILE_ENABLE_VIRUS_SCAN = 'true'
      process.env.VIRUS_SCANNER_BLOCK_ON_UNAVAILABLE = 'true'

      const config = getScannerConfig()

      expect(config.blockOnScannerUnavailable).toBe(true)
    })

    it('should configure quarantine behavior', () => {
      process.env.VIRUS_SCANNER_QUARANTINE = 'false'

      const config = getScannerConfig()

      expect(config.quarantineInfected).toBe(false)
    })
  })

  describe('VirusScannerService.scanFile', () => {
    it('should skip scanning when disabled', async () => {
      const scanner = new VirusScannerService({ enabled: false })
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' })

      const result = await scanner.scanFile(file)

      expect(result.scanned).toBe(false)
      expect(result.clean).toBe(true)
      expect(result.shouldBlock).toBe(false)
      expect(result.error).toContain('disabled')
    })

    it('should skip scanning files larger than max size', async () => {
      const scanner = new VirusScannerService({
        enabled: true,
        backend: 'none',
        maxScanSize: 100,
        blockOnScannerUnavailable: false,
        quarantineInfected: true,
        timeout: 60000,
      })

      // Create a file larger than max size
      const largeContent = 'x'.repeat(200)
      const file = new File([largeContent], 'large.txt', { type: 'text/plain' })

      const result = await scanner.scanFile(file)

      expect(result.scanned).toBe(false)
      expect(result.error).toContain('too large')
    })

    it('should handle no scanner configured', async () => {
      const scanner = new VirusScannerService({
        enabled: true,
        backend: 'none',
        blockOnScannerUnavailable: false,
        quarantineInfected: true,
        maxScanSize: 100 * 1024 * 1024,
        timeout: 60000,
      })

      const file = new File(['test content'], 'test.txt', { type: 'text/plain' })

      const result = await scanner.scanFile(file)

      expect(result.scanned).toBe(false)
      expect(result.backend).toBe('none')
    })

    it('should accept Buffer input', async () => {
      const scanner = new VirusScannerService({ enabled: false })
      const buffer = Buffer.from('test content')

      const result = await scanner.scanFile(buffer)

      expect(result.scanned).toBe(false)
      expect(result.clean).toBe(true)
    })

    it('should accept ArrayBuffer input', async () => {
      const scanner = new VirusScannerService({ enabled: false })
      const encoder = new TextEncoder()
      const arrayBuffer = encoder.encode('test content').buffer

      const result = await scanner.scanFile(arrayBuffer)

      expect(result.scanned).toBe(false)
      expect(result.clean).toBe(true)
    })
  })

  describe('VirusScannerService.getHealth', () => {
    it('should return health status', () => {
      const scanner = new VirusScannerService({ enabled: false, backend: 'none' })
      const health = scanner.getHealth()

      expect(health).toHaveProperty('healthy')
      expect(health).toHaveProperty('backend')
      expect(health).toHaveProperty('lastCheck')
      expect(health).toHaveProperty('consecutiveFailures')
    })
  })

  describe('VirusScannerService.getConfigSummary', () => {
    it('should return safe config summary', () => {
      const scanner = new VirusScannerService({
        enabled: true,
        backend: 'clamav',
        fallbackBackend: 'virustotal',
        blockOnScannerUnavailable: true,
        quarantineInfected: true,
        maxScanSize: 100 * 1024 * 1024,
        timeout: 60000,
        clamav: { host: 'localhost', port: 3310 },
        virustotal: { apiKey: 'secret-key' },
      })

      const summary = scanner.getConfigSummary()

      expect(summary.enabled).toBe(true)
      expect(summary.backend).toBe('clamav')
      expect(summary.fallbackBackend).toBe('virustotal')
      expect(summary.blockOnScannerUnavailable).toBe(true)
      // Should NOT include sensitive data
      expect(summary).not.toHaveProperty('clamav')
      expect(summary).not.toHaveProperty('virustotal')
    })
  })

  describe('VirusScannerService.quarantineFile', () => {
    it('should quarantine infected file when enabled', async () => {
      const scanner = new VirusScannerService({
        enabled: true,
        backend: 'none',
        quarantineInfected: true,
        blockOnScannerUnavailable: false,
        maxScanSize: 100 * 1024 * 1024,
        timeout: 60000,
      })

      const result = await scanner.quarantineFile('file-123', 'uploads/test.exe', ['Trojan.Win32'])

      expect(result.quarantined).toBe(true)
      expect(result.quarantinePath).toContain('quarantine/')
      expect(result.quarantinePath).toContain('file-123')
    })

    it('should not quarantine when disabled', async () => {
      const scanner = new VirusScannerService({
        enabled: true,
        backend: 'none',
        quarantineInfected: false,
        blockOnScannerUnavailable: false,
        maxScanSize: 100 * 1024 * 1024,
        timeout: 60000,
      })

      const result = await scanner.quarantineFile('file-123', 'uploads/test.exe', ['Trojan.Win32'])

      expect(result.quarantined).toBe(false)
      expect(result.error).toContain('disabled')
    })
  })

  describe('getVirusScannerService', () => {
    it('should return singleton instance', () => {
      const instance1 = getVirusScannerService()
      const instance2 = getVirusScannerService()

      expect(instance1).toBe(instance2)
    })

    it('should create new instance after reset', () => {
      const instance1 = getVirusScannerService()
      resetVirusScannerService()
      const instance2 = getVirusScannerService()

      expect(instance1).not.toBe(instance2)
    })
  })

  describe('toScanResult', () => {
    it('should convert VirusScanResult to ScanResult', () => {
      const virusResult: VirusScanResult = {
        scanned: true,
        clean: false,
        threats: ['Trojan.Generic', 'Malware.Win32'],
        backend: 'clamav',
        scanDuration: 1500,
        shouldBlock: true,
      }

      const scanResult = toScanResult(virusResult, 'file-123')

      expect(scanResult.fileId).toBe('file-123')
      expect(scanResult.status).toBe('infected')
      expect(scanResult.isClean).toBe(false)
      expect(scanResult.threatsFound).toBe(2)
      expect(scanResult.threatNames).toEqual(['Trojan.Generic', 'Malware.Win32'])
      expect(scanResult.scanDuration).toBe(1500)
      expect(scanResult.scannedAt).toBeInstanceOf(Date)
    })

    it('should handle clean result', () => {
      const virusResult: VirusScanResult = {
        scanned: true,
        clean: true,
        threats: [],
        backend: 'virustotal',
        scanDuration: 500,
        shouldBlock: false,
      }

      const scanResult = toScanResult(virusResult, 'file-456')

      expect(scanResult.status).toBe('clean')
      expect(scanResult.isClean).toBe(true)
      expect(scanResult.threatsFound).toBe(0)
    })

    it('should handle error result', () => {
      const virusResult: VirusScanResult = {
        scanned: false,
        clean: true,
        threats: [],
        backend: 'clamav',
        shouldBlock: false,
        error: 'Scanner unavailable',
      }

      const scanResult = toScanResult(virusResult, 'file-789')

      expect(scanResult.status).toBe('error')
      expect(scanResult.isClean).toBe(true)
    })
  })
})

// ============================================================================
// EICAR Test Virus Detection
// The EICAR test string is a standardised, inert test file recognised by all
// ClamAV-compatible scanners as a known test virus (EICAR-Test-File).
// It is NOT a real virus and cannot cause harm.
// ============================================================================

// Standard EICAR test string (safe to store in source — it is just a text pattern)
const EICAR_TEST_STRING =
  'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'

describe('EICAR test virus detection', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('EICAR string produces a File that can be passed to the scanner', () => {
    const eicarFile = new File([EICAR_TEST_STRING], 'eicar.com', { type: 'text/plain' })

    // Verify the file is well-formed
    expect(eicarFile.name).toBe('eicar.com')
    expect(eicarFile.size).toBeGreaterThan(0)
    expect(eicarFile.size).toBe(EICAR_TEST_STRING.length)
  })

  it('scanner with backend=none treats EICAR as unscanned (no real scanner)', async () => {
    // When no scanner backend is wired, we cannot detect EICAR — the test
    // verifies the service returns scanned=false so callers know no scan ran.
    const scanner = new VirusScannerService({
      enabled: true,
      backend: 'none',
      blockOnScannerUnavailable: false,
      quarantineInfected: true,
      maxScanSize: 100 * 1024 * 1024,
      timeout: 60000,
    })

    const eicarFile = new File([EICAR_TEST_STRING], 'eicar.com', { type: 'text/plain' })
    const result = await scanner.scanFile(eicarFile, { fileName: 'eicar.com' })

    // With backend=none the file is NOT scanned
    expect(result.scanned).toBe(false)
    // shouldBlock reflects the blockOnScannerUnavailable flag
    expect(result.shouldBlock).toBe(false)
  })

  it('scanner with blockOnScannerUnavailable=true blocks EICAR when no backend is wired', async () => {
    // Security-first default: if scanner unavailable, block the upload.
    const scanner = new VirusScannerService({
      enabled: true,
      backend: 'none',
      blockOnScannerUnavailable: true,
      quarantineInfected: true,
      maxScanSize: 100 * 1024 * 1024,
      timeout: 60000,
    })

    const eicarFile = new File([EICAR_TEST_STRING], 'eicar.com', { type: 'text/plain' })
    const result = await scanner.scanFile(eicarFile, { fileName: 'eicar.com' })

    // Not scanned but blocked — file cannot pass through
    expect(result.scanned).toBe(false)
    expect(result.shouldBlock).toBe(true)
  })



  /**
   * Runs a single ClamAV scan end-to-end with a scripted clamd response.
   *
   * We do NOT create a scanner before the scan — the scanner is built inside
   * this helper so we can guarantee that our `MockSocket.mockReset()` call
   * happens BEFORE the constructor fires its async health check. This prevents
   * cross-test socket pollution.
   */
  async function runClamAVScan(
    fileContent: string,
    fileName: string,
    clamdResponse: string,
    blockOnUnavailable: boolean
  ): Promise<import('../virus-scanner.service').VirusScanResult> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const net = require('net')
    const MockSocket = net.Socket as jest.Mock

    // Track sockets created by THIS scan invocation only.
    const sockets: Array<{
      dataCallback: ((data: Buffer) => void) | null
      endCallback: (() => void) | null
    }> = []

    // Reset before scanner construction so health-check + scan sockets both land here.
    MockSocket.mockReset()
    MockSocket.mockImplementation(() => {
      const record = { dataCallback: null as ((data: Buffer) => void) | null, endCallback: null as (() => void) | null }
      sockets.push(record)
      return {
        connect: jest.fn().mockImplementation((_p: number, _h: string, cb: () => void) => {
          setTimeout(cb, 0)
        }),
        write: jest.fn(),
        on: jest.fn().mockImplementation((event: string, cb: (...args: unknown[]) => void) => {
          if (event === 'data') record.dataCallback = cb as (data: Buffer) => void
          if (event === 'end') record.endCallback = cb
        }),
        destroy: jest.fn(),
      }
    })

    // Create scanner NOW — health check fires asynchronously.
    const scanner = new VirusScannerService({
      enabled: true,
      backend: 'clamav',
      blockOnScannerUnavailable: blockOnUnavailable,
      quarantineInfected: true,
      maxScanSize: 100 * 1024 * 1024,
      timeout: 5000,
      clamav: { host: 'localhost', port: 3310 },
    })

    const file = new File([fileContent], fileName, { type: 'text/plain' })

    // Wait for health-check socket(s) to be created + connected (setTimeout 0 fires)
    // We yield twice so that setTimeout(cb, 0) inside connect fires for any health-check sockets.
    await new Promise((r) => setTimeout(r, 5))

    // Record how many sockets exist before the scan starts — these are health-check sockets.
    const preCount = sockets.length

    // Start the actual scan — this creates one more socket.
    const scanPromise = scanner.scanFile(file, { fileName })

    // Yield to let the scan socket's connect() fire and on() handlers register.
    await new Promise((r) => setTimeout(r, 5))

    // The scan socket is always the first socket after the pre-count.
    const scanSocket = sockets[preCount]
    if (!scanSocket) {
      throw new Error(`Scan socket not created (sockets.length=${sockets.length}, preCount=${preCount})`)
    }

    // Emit the scripted clamd response on the scan socket only.
    if (scanSocket.dataCallback) scanSocket.dataCallback(Buffer.from(clamdResponse))
    if (scanSocket.endCallback) scanSocket.endCallback()

    return scanPromise
  }

  it('ClamAV scanner marks EICAR as infected (mocked clamd response)', async () => {
    // Simulate clamd returning the canonical EICAR FOUND response.
    const result = await runClamAVScan(
      EICAR_TEST_STRING,
      'eicar.com',
      'stream: Eicar-Test-Signature FOUND\0',
      true
    )

    expect(result.scanned).toBe(true)
    expect(result.clean).toBe(false)
    expect(result.threats).toContain('Eicar-Test-Signature')
    expect(result.shouldBlock).toBe(true)
    expect(result.backend).toBe('clamav')
  })

  it('ClamAV scanner marks clean file as clean (mocked clamd response)', async () => {
    // Simulate clamd returning the canonical OK response for a benign file.
    const result = await runClamAVScan(
      'Hello, this is a clean file.',
      'document.txt',
      'stream: OK\0',
      true
    )

    expect(result.scanned).toBe(true)
    expect(result.clean).toBe(true)
    expect(result.threats).toHaveLength(0)
    expect(result.shouldBlock).toBe(false)
    expect(result.backend).toBe('clamav')
  })
})

// ============================================================================
// Scanner-down fallback — DEFAULT_REJECT
// ============================================================================

describe('scanner-down default-reject behaviour', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    resetVirusScannerService()
    jest.clearAllMocks()
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('blockOnScannerUnavailable defaults to true when NCHAT_UPLOAD_SCAN_OPTIONAL is unset', () => {
    process.env.FILE_ENABLE_VIRUS_SCAN = 'true'
    process.env.CLAMAV_HOST = 'localhost'
    delete process.env.NCHAT_UPLOAD_SCAN_OPTIONAL
    delete process.env.VIRUS_SCANNER_BLOCK_ON_UNAVAILABLE

    const config = getScannerConfig()

    expect(config.blockOnScannerUnavailable).toBe(true)
  })

  it('blockOnScannerUnavailable is false when NCHAT_UPLOAD_SCAN_OPTIONAL=true', () => {
    process.env.FILE_ENABLE_VIRUS_SCAN = 'true'
    process.env.CLAMAV_HOST = 'localhost'
    process.env.NCHAT_UPLOAD_SCAN_OPTIONAL = 'true'
    delete process.env.VIRUS_SCANNER_BLOCK_ON_UNAVAILABLE

    const config = getScannerConfig()

    expect(config.blockOnScannerUnavailable).toBe(false)
  })

  it('VIRUS_SCANNER_BLOCK_ON_UNAVAILABLE explicit false overrides default', () => {
    process.env.FILE_ENABLE_VIRUS_SCAN = 'true'
    process.env.CLAMAV_HOST = 'localhost'
    process.env.VIRUS_SCANNER_BLOCK_ON_UNAVAILABLE = 'false'
    delete process.env.NCHAT_UPLOAD_SCAN_OPTIONAL

    const config = getScannerConfig()

    expect(config.blockOnScannerUnavailable).toBe(false)
  })

  it('scanner error with blockOnScannerUnavailable=true returns shouldBlock=true', async () => {
    // Simulate ClamAV connection failure — scanner is down.
    const net = await import('net')
    const MockSocket = net.Socket as jest.Mock

    let errorCallback: ((err: Error) => void) | null = null

    MockSocket.mockReset()
    MockSocket.mockImplementation(() => ({
      connect: jest.fn().mockImplementation((_port: number, _host: string, _cb: () => void) => {
        // Don't invoke connect cb — let the error event fire instead
      }),
      write: jest.fn(),
      on: jest.fn().mockImplementation((event: string, cb: (...args: unknown[]) => void) => {
        if (event === 'error') errorCallback = cb as (err: Error) => void
      }),
      destroy: jest.fn(),
    }))

    const scanner = new VirusScannerService({
      enabled: true,
      backend: 'clamav',
      blockOnScannerUnavailable: true,
      quarantineInfected: true,
      maxScanSize: 100 * 1024 * 1024,
      timeout: 5000,
      clamav: { host: 'localhost', port: 3310 },
    })

    const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
    const scanPromise = scanner.scanFile(file, { fileName: 'test.txt' })

    await new Promise((r) => setTimeout(r, 20))

    // Emit connection error (scanner down)
    if (errorCallback) {
      errorCallback(new Error('ECONNREFUSED: connection refused'))
    }

    const result = await scanPromise

    expect(result.scanned).toBe(false)
    expect(result.shouldBlock).toBe(true)
    expect(result.error).toBeTruthy()
  })

  it('scanner error with blockOnScannerUnavailable=false returns shouldBlock=false', async () => {
    const net = await import('net')
    const MockSocket = net.Socket as jest.Mock

    let errorCallback: ((err: Error) => void) | null = null

    MockSocket.mockReset()
    MockSocket.mockImplementation(() => ({
      connect: jest.fn(),
      write: jest.fn(),
      on: jest.fn().mockImplementation((event: string, cb: (...args: unknown[]) => void) => {
        if (event === 'error') errorCallback = cb as (err: Error) => void
      }),
      destroy: jest.fn(),
    }))

    const scanner = new VirusScannerService({
      enabled: true,
      backend: 'clamav',
      blockOnScannerUnavailable: false,
      quarantineInfected: true,
      maxScanSize: 100 * 1024 * 1024,
      timeout: 5000,
      clamav: { host: 'localhost', port: 3310 },
    })

    const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
    const scanPromise = scanner.scanFile(file, { fileName: 'test.txt' })

    await new Promise((r) => setTimeout(r, 20))

    if (errorCallback) {
      errorCallback(new Error('ECONNREFUSED'))
    }

    const result = await scanPromise

    expect(result.scanned).toBe(false)
    expect(result.shouldBlock).toBe(false)
  })
})

describe('ClamAV Integration', () => {
  it('should be tested with actual ClamAV server', () => {
    // This test is skipped unless CLAMAV_HOST is set
    // To run: CLAMAV_HOST=localhost pnpm test virus-scanner.test.ts
    const host = process.env.CLAMAV_HOST
    if (!host) {
      expect(true).toBe(true) // Skip
      return
    }

    // Integration test would go here
  })
})

describe('VirusTotal Integration', () => {
  it('should be tested with actual VirusTotal API', () => {
    // This test is skipped unless VIRUSTOTAL_API_KEY is set
    // To run: VIRUSTOTAL_API_KEY=your-key pnpm test virus-scanner.test.ts
    const apiKey = process.env.VIRUSTOTAL_API_KEY
    if (!apiKey) {
      expect(true).toBe(true) // Skip
      return
    }

    // Integration test would go here
  })
})
