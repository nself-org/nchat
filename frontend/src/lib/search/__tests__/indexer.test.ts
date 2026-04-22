/**
 * Tests for search indexer.
 */

const addDocuments = jest.fn().mockResolvedValue(undefined)
const updateDocuments = jest.fn().mockResolvedValue(undefined)
const deleteDocument = jest.fn().mockResolvedValue(undefined)
const deleteDocuments = jest.fn().mockResolvedValue(undefined)

jest.mock('../meilisearch-client', () => ({
  getIndex: jest.fn(() => ({ addDocuments, updateDocuments, deleteDocument, deleteDocuments })),
  INDEX_NAMES: { MESSAGES: 'messages', FILES: 'files', USERS: 'users', CHANNELS: 'channels' },
}))

jest.mock('@/lib/logger', () => ({ logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() } }))

import {
  indexMessage,
  indexMessages,
  updateMessage,
  indexFile,
  indexFiles,
  indexUser,
  indexUsers,
  indexChannel,
  indexChannels,
  deleteFromIndex,
  deleteMultipleFromIndex,
  reindexAllMessages,
  reindexAllFiles,
  reindexAllUsers,
  reindexAllChannels,
  getFileType,
  hasLinks,
} from '../indexer'

beforeEach(() => {
  addDocuments.mockClear()
  updateDocuments.mockClear()
  deleteDocument.mockClear()
  deleteDocuments.mockClear()
})

const msg = {
  id: 'm1',
  content: 'hi',
  author_id: 'u1',
  author_name: 'Alice',
  channel_id: 'c1',
  channel_name: 'gen',
  created_at: '2024-01-01',
  has_link: false,
  has_file: false,
  has_image: false,
  is_pinned: false,
  is_starred: false,
}

describe('message indexing', () => {
  it('indexMessage calls addDocuments', async () => {
    await indexMessage(msg)
    expect(addDocuments).toHaveBeenCalledWith([msg], { primaryKey: 'id' })
  })
  it('indexMessages skips empty', async () => {
    await indexMessages([])
    expect(addDocuments).not.toHaveBeenCalled()
  })
  it('indexMessages calls addDocuments with array', async () => {
    await indexMessages([msg, { ...msg, id: 'm2' }])
    expect(addDocuments).toHaveBeenCalled()
    expect(addDocuments.mock.calls[0][0]).toHaveLength(2)
  })
  it('updateMessage calls updateDocuments', async () => {
    await updateMessage({ id: 'm1', content: 'new' })
    expect(updateDocuments).toHaveBeenCalled()
  })
  it('indexMessage propagates errors', async () => {
    addDocuments.mockRejectedValueOnce(new Error('fail'))
    await expect(indexMessage(msg)).rejects.toThrow('fail')
  })
})

describe('file indexing', () => {
  const file = {
    id: 'f1',
    name: 'doc.pdf',
    original_name: 'doc.pdf',
    uploader_id: 'u1',
    uploader_name: 'Alice',
    mime_type: 'application/pdf',
    file_type: 'document',
    size: 1000,
    url: 'http://x/f1',
    created_at: '2024-01-01',
  }
  it('indexFile calls addDocuments', async () => {
    await indexFile(file)
    expect(addDocuments).toHaveBeenCalled()
  })
  it('indexFiles skips empty', async () => {
    await indexFiles([])
    expect(addDocuments).not.toHaveBeenCalled()
  })
  it('indexFiles bulk call', async () => {
    await indexFiles([file])
    expect(addDocuments).toHaveBeenCalled()
  })
})

describe('user and channel indexing', () => {
  const user = {
    id: 'u1',
    display_name: 'Alice',
    username: 'alice',
    email: 'a@x',
    role: 'member',
    is_active: true,
    created_at: '2024-01-01',
  }
  const ch = {
    id: 'c1',
    name: 'gen',
    is_private: false,
    is_archived: false,
    created_by: 'u1',
    created_at: '2024-01-01',
  }
  it('indexUser', async () => {
    await indexUser(user)
    expect(addDocuments).toHaveBeenCalled()
  })
  it('indexUsers skips empty', async () => {
    await indexUsers([])
    expect(addDocuments).not.toHaveBeenCalled()
  })
  it('indexUsers bulk', async () => {
    await indexUsers([user])
    expect(addDocuments).toHaveBeenCalled()
  })
  it('indexChannel', async () => {
    await indexChannel(ch)
    expect(addDocuments).toHaveBeenCalled()
  })
  it('indexChannels skips empty', async () => {
    await indexChannels([])
    expect(addDocuments).not.toHaveBeenCalled()
  })
  it('indexChannels bulk', async () => {
    await indexChannels([ch])
    expect(addDocuments).toHaveBeenCalled()
  })
})

describe('delete ops', () => {
  it('deleteFromIndex', async () => {
    await deleteFromIndex('messages' as any, 'm1')
    expect(deleteDocument).toHaveBeenCalledWith('m1')
  })
  it('deleteMultipleFromIndex skips empty', async () => {
    await deleteMultipleFromIndex('messages' as any, [])
    expect(deleteDocuments).not.toHaveBeenCalled()
  })
  it('deleteMultipleFromIndex with ids', async () => {
    await deleteMultipleFromIndex('messages' as any, ['a', 'b'])
    expect(deleteDocuments).toHaveBeenCalledWith(['a', 'b'])
  })
})

describe('reindex wrappers', () => {
  it('reindexAllMessages', async () => {
    const fetch = jest.fn().mockResolvedValue([msg])
    await reindexAllMessages(fetch)
    expect(fetch).toHaveBeenCalled()
    expect(addDocuments).toHaveBeenCalled()
  })
  it('reindexAllFiles', async () => {
    const fetch = jest.fn().mockResolvedValue([])
    await reindexAllFiles(fetch)
    expect(fetch).toHaveBeenCalled()
  })
  it('reindexAllUsers', async () => {
    const fetch = jest.fn().mockResolvedValue([])
    await reindexAllUsers(fetch)
    expect(fetch).toHaveBeenCalled()
  })
  it('reindexAllChannels', async () => {
    const fetch = jest.fn().mockResolvedValue([])
    await reindexAllChannels(fetch)
    expect(fetch).toHaveBeenCalled()
  })
})

describe('getFileType', () => {
  it('images', () => {
    expect(getFileType('image/png')).toBe('image')
  })
  it('video', () => {
    expect(getFileType('video/mp4')).toBe('video')
  })
  it('audio', () => {
    expect(getFileType('audio/mpeg')).toBe('audio')
  })
  it('pdf document', () => {
    expect(getFileType('application/pdf')).toBe('document')
  })
  it('spreadsheet document', () => {
    expect(getFileType('application/vnd.ms-excel-spreadsheet')).toBe('document')
  })
  it('text document', () => {
    expect(getFileType('text/plain')).toBe('document')
  })
  it('other', () => {
    expect(getFileType('application/octet-stream')).toBe('other')
  })
})

describe('hasLinks', () => {
  it('true for http url', () => {
    expect(hasLinks('see https://example.com')).toBe(true)
  })
  it('true for https url', () => {
    expect(hasLinks('http://x')).toBe(true)
  })
  it('false for plain text', () => {
    expect(hasLinks('no url here')).toBe(false)
  })
})
