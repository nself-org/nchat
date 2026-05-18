/**
 * useAttachments Hook Tests
 */

import { renderHook, act } from '@testing-library/react'
import { useAttachments } from '../use-attachments'

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock XMLHttpRequest
const mockXHR = {
  open: jest.fn(),
  send: jest.fn(),
  upload: { addEventListener: jest.fn() },
  addEventListener: jest.fn(),
  abort: jest.fn(),
  status: 200,
  responseText: '{}',
}
// @ts-expect-error - Mocking XMLHttpRequest
global.XMLHttpRequest = jest.fn(() => mockXHR)

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:test-url')
global.URL.revokeObjectURL = jest.fn()

// Mock crypto.randomUUID — save original so it can be restored after this file's tests
// to prevent bleed into other test files (e.g. crypto.test.ts which tests real UUID generation)
const _originalRandomUUID = global.crypto.randomUUID
global.crypto.randomUUID = jest.fn(() => 'test-uuid' as `${string}-${string}-${string}-${string}-${string}`)

afterAll(() => {
  global.crypto.randomUUID = _originalRandomUUID
})

// Mock useAuth
jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'user-123' },
  }),
}))

// Mock download service
jest.mock('@/services/files', () => ({
  getDownloadService: () => ({
    getThumbnails: jest.fn().mockResolvedValue({}),
  }),
  formatFileSize: (bytes: number) => `${bytes} B`,
  getFileIcon: () => 'file',
}))

// Mock useFileUpload
jest.mock('@/hooks/use-file-upload', () => ({
  useFileUpload: () => ({
    files: [],
    isUploading: false,
    addFiles: jest.fn(() => ['test-uuid']),
    removeFile: jest.fn(),
    clearFiles: jest.fn(),
    startUpload: jest.fn(),
    retryUpload: jest.fn(),
    validateFile: jest.fn(() => ({ valid: true })),
  }),
}))

// Skipped: Memory issue during module resolution - needs investigation
describe.skip('useAttachments', () => {
  const createMockFile = (name: string, size: number, type: string): File => {
    const blob = new Blob(['test'], { type })
    return new File([blob], name, { type })
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with empty attachments', () => {
      const { result } = renderHook(() => useAttachments())

      expect(result.current.attachments).toHaveLength(0)
      expect(result.current.isUploading).toBe(false)
      expect(result.current.totalSize).toBe(0)
    })

    it('should initialize with correct remaining size', () => {
      const { result } = renderHook(() => useAttachments({ maxTotalSize: 25 * 1024 * 1024 }))

      expect(result.current.remainingSize).toBe(25 * 1024 * 1024)
    })
  })

  describe('addFiles', () => {
    it('should add valid files to attachments', () => {
      const { result } = renderHook(() => useAttachments())

      const file = createMockFile('test.jpg', 1024, 'image/jpeg')

      act(() => {
        result.current.addFiles([file])
      })

      expect(result.current.attachments).toHaveLength(1)
      expect(result.current.attachments[0].name).toBe('test.jpg')
      expect(result.current.attachments[0].type).toBe('image')
    })

    it('should create preview URL for images', () => {
      const { result } = renderHook(() => useAttachments())

      const file = createMockFile('test.jpg', 1024, 'image/jpeg')

      act(() => {
        result.current.addFiles([file])
      })

      expect(result.current.attachments[0].previewUrl).toBe('blob:test-url')
      expect(URL.createObjectURL).toHaveBeenCalledWith(file)
    })

    it('should not create preview URL for non-images', () => {
      const { result } = renderHook(() => useAttachments())

      const file = createMockFile('test.pdf', 1024, 'application/pdf')

      act(() => {
        result.current.addFiles([file])
      })

      expect(result.current.attachments[0].previewUrl).toBeUndefined()
    })
  })

  describe('removeAttachment', () => {
    it('should remove an attachment', () => {
      const { result } = renderHook(() => useAttachments())

      const file = createMockFile('test.jpg', 1024, 'image/jpeg')

      act(() => {
        result.current.addFiles([file])
      })

      const attachmentId = result.current.attachments[0].id

      act(() => {
        result.current.removeAttachment(attachmentId)
      })

      expect(result.current.attachments).toHaveLength(0)
    })

    it('should revoke preview URL when removing', () => {
      const { result } = renderHook(() => useAttachments())

      const file = createMockFile('test.jpg', 1024, 'image/jpeg')

      act(() => {
        result.current.addFiles([file])
      })

      const attachmentId = result.current.attachments[0].id

      act(() => {
        result.current.removeAttachment(attachmentId)
      })

      expect(URL.revokeObjectURL).toHaveBeenCalled()
    })
  })

  describe('clearAttachments', () => {
    it('should clear all attachments', () => {
      const { result } = renderHook(() => useAttachments())

      const files = [
        createMockFile('test1.jpg', 1024, 'image/jpeg'),
        createMockFile('test2.png', 2048, 'image/png'),
      ]

      act(() => {
        result.current.addFiles(files)
      })

      act(() => {
        result.current.clearAttachments()
      })

      expect(result.current.attachments).toHaveLength(0)
    })
  })

  describe('canAddFile', () => {
    it('should allow valid files', () => {
      const { result } = renderHook(() => useAttachments())

      const file = createMockFile('test.jpg', 1024, 'image/jpeg')
      const canAdd = result.current.canAddFile(file)

      expect(canAdd.allowed).toBe(true)
    })

    it('should reject when at max attachments', () => {
      const { result } = renderHook(() => useAttachments({ maxAttachments: 1 }))

      const file1 = createMockFile('test1.jpg', 1024, 'image/jpeg')
      const file2 = createMockFile('test2.jpg', 1024, 'image/jpeg')

      act(() => {
        result.current.addFiles([file1])
      })

      const canAdd = result.current.canAddFile(file2)

      expect(canAdd.allowed).toBe(false)
      expect(canAdd.reason).toContain('Maximum')
    })

    it('should reject when exceeding max total size', () => {
      const { result } = renderHook(() => useAttachments({ maxTotalSize: 2000 }))

      const file1 = createMockFile('test1.jpg', 1500, 'image/jpeg')
      const file2 = createMockFile('test2.jpg', 1000, 'image/jpeg')

      act(() => {
        result.current.addFiles([file1])
      })

      const canAdd = result.current.canAddFile(file2)

      expect(canAdd.allowed).toBe(false)
      expect(canAdd.reason).toContain('exceed')
    })
  })

  describe('getMessageAttachments', () => {
    it('should return empty array when no ready attachments', () => {
      const { result } = renderHook(() => useAttachments())

      const attachments = result.current.getMessageAttachments()

      expect(attachments).toHaveLength(0)
    })
  })

  describe('callbacks', () => {
    it('should call onChange when attachments change', () => {
      const onChange = jest.fn()
      const { result } = renderHook(() => useAttachments({ onChange }))

      const file = createMockFile('test.jpg', 1024, 'image/jpeg')

      act(() => {
        result.current.addFiles([file])
      })

      expect(onChange).toHaveBeenCalled()
    })
  })

  describe('totalSize', () => {
    it('should calculate total size correctly', () => {
      const { result } = renderHook(() => useAttachments())

      const files = [
        createMockFile('test1.jpg', 1000, 'image/jpeg'),
        createMockFile('test2.jpg', 2000, 'image/jpeg'),
        createMockFile('test3.jpg', 3000, 'image/jpeg'),
      ]

      act(() => {
        result.current.addFiles(files)
      })

      expect(result.current.totalSize).toBe(6000)
    })
  })
})
