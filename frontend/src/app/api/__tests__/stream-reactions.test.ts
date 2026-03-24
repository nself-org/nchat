/**
 * @jest-environment node
 */

/**
 * Stream Reactions API Route Tests
 *
 * Tests for /api/streams/[id]/reactions endpoint
 * Verifies schema compatibility and backward compatibility
 */

import { NextRequest } from 'next/server'

// Mock UUID for testing
const MOCK_STREAM_ID = '123e4567-e89b-12d3-a456-426614174000'
const MOCK_USER_ID = '987fcdeb-51a2-3bc4-d567-890123456789'
const MOCK_REACTION_ID = 'abc12345-6789-0def-1234-567890abcdef'

// Mock Nhost
jest.mock('@/lib/nhost.server', () => ({
  nhost: {
    graphql: {
      request: jest.fn(),
    },
    auth: {
      getSession: jest.fn(),
    },
  },
}))

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}))

// Import after mocks are set up
import { GET, POST } from '../streams/[id]/reactions/route'

// Get the mocked nhost module
const { nhost } = require('@/lib/nhost.server')

// Use the actual mocked functions from the module
const mockGraphqlRequestFn = nhost.graphql.request as jest.Mock
const mockGetSessionFn = nhost.auth.getSession as jest.Mock

describe('/api/streams/[id]/reactions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset mock implementations to clear any unconsumed mockResolvedValueOnce queue
    // entries from previous tests that may not have consumed all their mocked responses.
    mockGraphqlRequestFn.mockReset()
    mockGetSessionFn.mockReset()
  })

  describe('POST /api/streams/[id]/reactions', () => {
    beforeEach(() => {
      // Default: authenticated user
      mockGetSessionFn.mockResolvedValue({
        user: { id: MOCK_USER_ID },
      })
    })

    it('should return 401 when not authenticated', async () => {
      mockGetSessionFn.mockResolvedValue(null)

      const request = new NextRequest(
        `http://localhost:3000/api/streams/${MOCK_STREAM_ID}/reactions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reaction_type: 'heart' }),
        }
      )

      const response = await POST(request, { params: Promise.resolve({ id: MOCK_STREAM_ID }) })
      expect(response.status).toBe(401)
    })

    it('should return 400 for invalid stream ID', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/streams/invalid-id/reactions',
        {
          method: 'POST',
          body: JSON.stringify({ reaction_type: 'heart' }),
        }
      )

      const response = await POST(request, { params: Promise.resolve({ id: 'invalid-id' }) })
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid stream ID')
    })

    it('should return 400 when neither reaction_type nor emoji is provided', async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/streams/${MOCK_STREAM_ID}/reactions`,
        {
          method: 'POST',
          body: JSON.stringify({}),
        }
      )

      const response = await POST(request, { params: Promise.resolve({ id: MOCK_STREAM_ID }) })
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid request body')
    })

    it('should accept reaction_type field and store as emoji', async () => {
      // Mock stream check
      mockGraphqlRequestFn.mockResolvedValueOnce({
        data: {
          nchat_streams_by_pk: {
            status: 'live',
            enable_reactions: true,
          },
        },
      })

      // Mock insert reaction
      mockGraphqlRequestFn.mockResolvedValueOnce({
        data: {
          insert_nchat_stream_reactions_one: {
            id: MOCK_REACTION_ID,
            stream_id: MOCK_STREAM_ID,
            user_id: MOCK_USER_ID,
            emoji: '\u2764\uFE0F', // heart emoji stored in DB
            position_x: null,
            position_y: null,
            created_at: '2026-02-07T12:00:00Z',
          },
        },
      })

      const request = new NextRequest(
        `http://localhost:3000/api/streams/${MOCK_STREAM_ID}/reactions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reaction_type: 'heart' }),
        }
      )

      const response = await POST(request, { params: Promise.resolve({ id: MOCK_STREAM_ID }) })
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.id).toBe(MOCK_REACTION_ID)
      expect(data.reaction_type).toBe('heart') // Backward compatible field
      expect(data.emoji).toBe('\u2764\uFE0F') // Database emoji field
    })

    it('should accept emoji field and normalize to reaction_type', async () => {
      mockGraphqlRequestFn.mockResolvedValueOnce({
        data: {
          nchat_streams_by_pk: {
            status: 'live',
            enable_reactions: true,
          },
        },
      })

      mockGraphqlRequestFn.mockResolvedValueOnce({
        data: {
          insert_nchat_stream_reactions_one: {
            id: MOCK_REACTION_ID,
            stream_id: MOCK_STREAM_ID,
            user_id: MOCK_USER_ID,
            emoji: '\uD83D\uDD25', // fire emoji
            position_x: null,
            position_y: null,
            created_at: '2026-02-07T12:00:00Z',
          },
        },
      })

      const request = new NextRequest(
        `http://localhost:3000/api/streams/${MOCK_STREAM_ID}/reactions`,
        {
          method: 'POST',
          body: JSON.stringify({ emoji: 'fire' }),
        }
      )

      const response = await POST(request, { params: Promise.resolve({ id: MOCK_STREAM_ID }) })
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.reaction_type).toBe('fire')
    })

    it('should accept Unicode emoji and map to reaction_type', async () => {
      mockGraphqlRequestFn.mockResolvedValueOnce({
        data: {
          nchat_streams_by_pk: {
            status: 'live',
            enable_reactions: true,
          },
        },
      })

      mockGraphqlRequestFn.mockResolvedValueOnce({
        data: {
          insert_nchat_stream_reactions_one: {
            id: MOCK_REACTION_ID,
            stream_id: MOCK_STREAM_ID,
            user_id: MOCK_USER_ID,
            emoji: '\uD83D\uDC4D', // thumbs up
            position_x: null,
            position_y: null,
            created_at: '2026-02-07T12:00:00Z',
          },
        },
      })

      const request = new NextRequest(
        `http://localhost:3000/api/streams/${MOCK_STREAM_ID}/reactions`,
        {
          method: 'POST',
          body: JSON.stringify({ emoji: '\uD83D\uDC4D' }),
        }
      )

      const response = await POST(request, { params: Promise.resolve({ id: MOCK_STREAM_ID }) })
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.reaction_type).toBe('like')
    })

    it('should store position coordinates correctly', async () => {
      mockGraphqlRequestFn.mockResolvedValueOnce({
        data: {
          nchat_streams_by_pk: {
            status: 'live',
            enable_reactions: true,
          },
        },
      })

      mockGraphqlRequestFn.mockResolvedValueOnce({
        data: {
          insert_nchat_stream_reactions_one: {
            id: MOCK_REACTION_ID,
            stream_id: MOCK_STREAM_ID,
            user_id: MOCK_USER_ID,
            emoji: '\uD83D\uDC4F', // clap
            position_x: 50,
            position_y: 75,
            created_at: '2026-02-07T12:00:00Z',
          },
        },
      })

      const request = new NextRequest(
        `http://localhost:3000/api/streams/${MOCK_STREAM_ID}/reactions`,
        {
          method: 'POST',
          body: JSON.stringify({
            reaction_type: 'clap',
            positionX: 50,
            positionY: 75,
          }),
        }
      )

      const response = await POST(request, { params: Promise.resolve({ id: MOCK_STREAM_ID }) })
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.position_x).toBe(50)
      expect(data.position_y).toBe(75)
    })

    it('should return 404 when stream not found', async () => {
      mockGraphqlRequestFn.mockResolvedValueOnce({
        data: {
          nchat_streams_by_pk: null,
        },
      })

      const request = new NextRequest(
        `http://localhost:3000/api/streams/${MOCK_STREAM_ID}/reactions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reaction_type: 'heart' }),
        }
      )

      const response = await POST(request, { params: Promise.resolve({ id: MOCK_STREAM_ID }) })
      expect(response.status).toBe(404)
    })

    it('should return 403 when reactions are disabled', async () => {
      mockGraphqlRequestFn.mockResolvedValueOnce({
        data: {
          nchat_streams_by_pk: {
            status: 'live',
            enable_reactions: false,
          },
        },
      })

      const request = new NextRequest(
        `http://localhost:3000/api/streams/${MOCK_STREAM_ID}/reactions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reaction_type: 'heart' }),
        }
      )

      const response = await POST(request, { params: Promise.resolve({ id: MOCK_STREAM_ID }) })
      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toBe('Reactions are disabled for this stream')
    })

    it('should return 400 when stream is not live', async () => {
      mockGraphqlRequestFn.mockResolvedValueOnce({
        data: {
          nchat_streams_by_pk: {
            status: 'ended',
            enable_reactions: true,
          },
        },
      })

      const request = new NextRequest(
        `http://localhost:3000/api/streams/${MOCK_STREAM_ID}/reactions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reaction_type: 'heart' }),
        }
      )

      const response = await POST(request, { params: Promise.resolve({ id: MOCK_STREAM_ID }) })
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Stream is not live')
    })

    it('should return 400 for invalid reaction type', async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/streams/${MOCK_STREAM_ID}/reactions`,
        {
          method: 'POST',
          body: JSON.stringify({ emoji: 'invalid_emoji_that_does_not_exist' }),
        }
      )

      // Note: no graphql mock needed here because the route returns 400
      // before reaching the stream check (normalizeReactionType returns null first).

      const response = await POST(request, { params: Promise.resolve({ id: MOCK_STREAM_ID }) })
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid reaction type')
      expect(data.validTypes).toContain('heart')
    })
  })

  describe('GET /api/streams/[id]/reactions', () => {
    it('should return 400 for invalid stream ID', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/streams/invalid-id/reactions'
      )

      const response = await GET(request, { params: Promise.resolve({ id: 'invalid-id' }) })
      expect(response.status).toBe(400)
    })

    it('should return reactions with both emoji and reaction_type fields', async () => {
      mockGraphqlRequestFn.mockResolvedValueOnce({
        data: {
          nchat_stream_reactions: [
            {
              id: MOCK_REACTION_ID,
              stream_id: MOCK_STREAM_ID,
              user_id: MOCK_USER_ID,
              emoji: '\u2764\uFE0F', // heart
              position_x: 25,
              position_y: 50,
              created_at: '2026-02-07T12:00:00Z',
            },
            {
              id: 'reaction-2',
              stream_id: MOCK_STREAM_ID,
              user_id: MOCK_USER_ID,
              emoji: '\uD83D\uDD25', // fire
              position_x: null,
              position_y: null,
              created_at: '2026-02-07T12:01:00Z',
            },
          ],
          reaction_counts: {
            aggregate: {
              count: 2,
            },
          },
        },
      })

      const request = new NextRequest(
        `http://localhost:3000/api/streams/${MOCK_STREAM_ID}/reactions`
      )

      const response = await GET(request, { params: Promise.resolve({ id: MOCK_STREAM_ID }) })
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.reactions).toHaveLength(2)
      expect(data.total).toBe(2)

      // First reaction
      expect(data.reactions[0].emoji).toBe('\u2764\uFE0F')
      expect(data.reactions[0].reaction_type).toBe('heart')
      expect(data.reactions[0].position_x).toBe(25)
      expect(data.reactions[0].position_y).toBe(50)

      // Second reaction
      expect(data.reactions[1].emoji).toBe('\uD83D\uDD25')
      expect(data.reactions[1].reaction_type).toBe('fire')
    })

    it('should respect limit parameter', async () => {
      mockGraphqlRequestFn.mockResolvedValueOnce({
        data: {
          nchat_stream_reactions: [],
          reaction_counts: {
            aggregate: {
              count: 0,
            },
          },
        },
      })

      const request = new NextRequest(
        `http://localhost:3000/api/streams/${MOCK_STREAM_ID}/reactions?limit=10`
      )

      await GET(request, { params: Promise.resolve({ id: MOCK_STREAM_ID }) })

      // Verify limit was passed to GraphQL
      expect(mockGraphqlRequestFn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ limit: 10 })
      )
    })

    it('should cap limit at 100', async () => {
      mockGraphqlRequestFn.mockResolvedValueOnce({
        data: {
          nchat_stream_reactions: [],
          reaction_counts: {
            aggregate: {
              count: 0,
            },
          },
        },
      })

      const request = new NextRequest(
        `http://localhost:3000/api/streams/${MOCK_STREAM_ID}/reactions?limit=500`
      )

      await GET(request, { params: Promise.resolve({ id: MOCK_STREAM_ID }) })

      // Verify limit was capped at 100
      expect(mockGraphqlRequestFn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ limit: 100 })
      )
    })

    it('should filter by since parameter', async () => {
      const since = '2026-02-07T10:00:00Z'
      mockGraphqlRequestFn.mockResolvedValueOnce({
        data: {
          nchat_stream_reactions: [],
          reaction_counts: {
            aggregate: {
              count: 0,
            },
          },
        },
      })

      const request = new NextRequest(
        `http://localhost:3000/api/streams/${MOCK_STREAM_ID}/reactions?since=${since}`
      )

      await GET(request, { params: Promise.resolve({ id: MOCK_STREAM_ID }) })

      // Verify since was passed
      expect(mockGraphqlRequestFn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ since })
      )
    })

    it('should return empty array when no reactions exist', async () => {
      mockGraphqlRequestFn.mockResolvedValueOnce({
        data: {
          nchat_stream_reactions: [],
          reaction_counts: {
            aggregate: {
              count: 0,
            },
          },
        },
      })

      const request = new NextRequest(
        `http://localhost:3000/api/streams/${MOCK_STREAM_ID}/reactions`
      )

      const response = await GET(request, { params: Promise.resolve({ id: MOCK_STREAM_ID }) })
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.reactions).toEqual([])
      expect(data.total).toBe(0)
    })

    it('should handle GraphQL errors gracefully', async () => {
      mockGraphqlRequestFn.mockResolvedValueOnce({
        error: [{ message: 'Database error' }],
        data: null,
      })

      const request = new NextRequest(
        `http://localhost:3000/api/streams/${MOCK_STREAM_ID}/reactions`
      )

      const response = await GET(request, { params: Promise.resolve({ id: MOCK_STREAM_ID }) })
      expect(response.status).toBe(500)
    })
  })

  describe('Schema compatibility', () => {
    beforeEach(() => {
      // Default: authenticated user for schema tests
      mockGetSessionFn.mockResolvedValue({
        user: { id: MOCK_USER_ID },
      })
    })

    it('should use emoji field in GraphQL mutation (not reaction_type)', async () => {
      mockGraphqlRequestFn
        .mockResolvedValueOnce({
          data: {
            nchat_streams_by_pk: {
              status: 'live',
              enable_reactions: true,
            },
          },
        })
        .mockResolvedValueOnce({
          data: {
            insert_nchat_stream_reactions_one: {
              id: MOCK_REACTION_ID,
              stream_id: MOCK_STREAM_ID,
              user_id: MOCK_USER_ID,
              emoji: '\uD83D\uDE02',
              position_x: null,
              position_y: null,
              created_at: '2026-02-07T12:00:00Z',
            },
          },
        })

      const request = new NextRequest(
        `http://localhost:3000/api/streams/${MOCK_STREAM_ID}/reactions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reaction_type: 'laugh' }),
        }
      )

      await POST(request, { params: Promise.resolve({ id: MOCK_STREAM_ID }) })

      // Verify the mutation uses 'emoji' field, not 'reaction_type'
      expect(mockGraphqlRequestFn).toHaveBeenCalledTimes(2)
      const insertCall = mockGraphqlRequestFn.mock.calls[1]
      expect(insertCall[0]).toContain('emoji')
      expect(insertCall[1].object.emoji).toBe('\uD83D\uDE02') // laugh emoji
    })

    it('should use position_x and position_y directly (not in metadata)', async () => {
      mockGraphqlRequestFn
        .mockResolvedValueOnce({
          data: {
            nchat_streams_by_pk: {
              status: 'live',
              enable_reactions: true,
            },
          },
        })
        .mockResolvedValueOnce({
          data: {
            insert_nchat_stream_reactions_one: {
              id: MOCK_REACTION_ID,
              stream_id: MOCK_STREAM_ID,
              user_id: MOCK_USER_ID,
              emoji: '\u2764\uFE0F',
              position_x: 30,
              position_y: 60,
              created_at: '2026-02-07T12:00:00Z',
            },
          },
        })

      const request = new NextRequest(
        `http://localhost:3000/api/streams/${MOCK_STREAM_ID}/reactions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reaction_type: 'heart',
            positionX: 30,
            positionY: 60,
          }),
        }
      )

      await POST(request, { params: Promise.resolve({ id: MOCK_STREAM_ID }) })

      // Verify position is stored directly, not in metadata
      expect(mockGraphqlRequestFn).toHaveBeenCalledTimes(2)
      const insertCall = mockGraphqlRequestFn.mock.calls[1]
      expect(insertCall[1].object.position_x).toBe(30)
      expect(insertCall[1].object.position_y).toBe(60)
      expect(insertCall[1].object.metadata).toBeUndefined()
    })
  })
})
