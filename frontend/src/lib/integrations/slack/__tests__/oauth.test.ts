/**
 * Slack OAuth — behavior tests
 */

import {
  generateOAuthState,
  storeOAuthState,
  retrieveOAuthState,
  clearOAuthState,
  buildSlackAuthUrl,
  initiateSlackOAuth,
  exchangeCodeForToken,
  handleSlackOAuthCallback,
  SlackOAuthException,
  isSlackOAuthError,
  getSlackErrorDescription,
  parseScopes,
  hasRequiredScopes,
  getMissingScopes,
  buildAddToSlackUrl,
} from '../oauth'

const fetchMock = jest.fn();
beforeEach(() => { fetchMock.mockReset(); (global as any).fetch = fetchMock; });

describe('slack/oauth', () => {
  beforeEach(() => {
    sessionStorage.clear()
    jest.restoreAllMocks()
  })

  describe('generateOAuthState', () => {
    it('returns unique 64-char hex values', () => {
      const a = generateOAuthState()
      const b = generateOAuthState()
      expect(a).toMatch(/^[0-9a-f]{64}$/)
      expect(b).toMatch(/^[0-9a-f]{64}$/)
      expect(a).not.toBe(b)
    })
  })

  describe('state lifecycle', () => {
    it('stores, retrieves, and single-uses the state', () => {
      storeOAuthState({ nonce: 'n1', workspaceId: 'ws' })
      const got = retrieveOAuthState('n1')
      expect(got?.nonce).toBe('n1')
      expect(got?.workspaceId).toBe('ws')
      expect(retrieveOAuthState('n1')).toBeNull()
    })

    it('rejects mismatched nonce', () => {
      storeOAuthState({ nonce: 'n' })
      expect(retrieveOAuthState('other')).toBeNull()
    })

    it('expires after TTL', () => {
      storeOAuthState({ nonce: 'n' })
      const raw = JSON.parse(sessionStorage.getItem('slack_oauth_state')!)
      raw.expiresAt = Date.now() - 1
      sessionStorage.setItem('slack_oauth_state', JSON.stringify(raw))
      expect(retrieveOAuthState('n')).toBeNull()
    })

    it('handles corrupt storage safely', () => {
      sessionStorage.setItem('slack_oauth_state', '{not json')
      expect(retrieveOAuthState('n')).toBeNull()
      expect(sessionStorage.getItem('slack_oauth_state')).toBeNull()
    })

    it('clearOAuthState wipes it', () => {
      storeOAuthState({ nonce: 'n' })
      clearOAuthState()
      expect(sessionStorage.getItem('slack_oauth_state')).toBeNull()
    })
  })

  describe('buildSlackAuthUrl', () => {
    const config = {
      clientId: 'cid',
      clientSecret: 's',
      redirectUri: 'https://app/cb',
    }

    it('uses comma-separated scopes (Slack convention)', () => {
      const url = new URL(buildSlackAuthUrl({ ...config, scopes: ['chat:write', 'channels:read'] }))
      expect(url.searchParams.get('scope')).toBe('chat:write,channels:read')
    })

    it('includes user_scope when set', () => {
      const url = new URL(
        buildSlackAuthUrl({ ...config, userScopes: ['identity.basic'] })
      )
      expect(url.searchParams.get('user_scope')).toBe('identity.basic')
    })

    it('passes team and state through', () => {
      const url = new URL(buildSlackAuthUrl(config, { state: 'n', team: 'T1' }))
      expect(url.searchParams.get('state')).toBe('n')
      expect(url.searchParams.get('team')).toBe('T1')
    })

    it('does not set user_scope when absent', () => {
      const url = new URL(buildSlackAuthUrl(config))
      expect(url.searchParams.get('user_scope')).toBeNull()
    })
  })

  describe('initiateSlackOAuth', () => {
    it('persists state and embeds the nonce in authUrl', () => {
      const { authUrl, state } = initiateSlackOAuth(
        { clientId: 'c', clientSecret: 's', redirectUri: 'r' },
        { returnUrl: '/x', team: 'T9' }
      )
      const url = new URL(authUrl)
      expect(url.searchParams.get('state')).toBe(state)
      expect(url.searchParams.get('team')).toBe('T9')
      expect(state).toMatch(/^[0-9a-f]{64}$/)
    })
  })

  describe('exchangeCodeForToken', () => {
    const config = { clientId: 'c', clientSecret: 's', redirectUri: 'r' }

    it('returns normalized result on ok=true', async () => {
      fetchMock.mockResolvedValueOnce({
        json: async () => ({
          ok: true,
          access_token: 'xoxb-...',
          scope: 'chat:write',
          bot_user_id: 'U1',
          app_id: 'A1',
          team: { id: 'T', name: 'My Team' },
        }),
      } as Response)
      const r = await exchangeCodeForToken(config, 'code')
      expect(r.accessToken).toBe('xoxb-...')
      expect(r.botUserId).toBe('U1')
      expect(r.appId).toBe('A1')
      expect(r.team.id).toBe('T')
      expect(r.team.name).toBe('My Team')
    })

    it('maps authed_user and incoming_webhook when present', async () => {
      fetchMock.mockResolvedValueOnce({
        json: async () => ({
          ok: true,
          access_token: 'a',
          app_id: 'A',
          team: { id: 'T', name: 'N' },
          authed_user: { id: 'U', scope: 'identity', access_token: 'xoxp', token_type: 'user' },
          incoming_webhook: {
            channel: '#c',
            channel_id: 'C1',
            configuration_url: 'https://x',
            url: 'https://hook',
          },
        }),
      } as Response)
      const r = await exchangeCodeForToken(config, 'code')
      expect(r.authedUser?.id).toBe('U')
      expect(r.authedUser?.accessToken).toBe('xoxp')
      expect(r.incomingWebhook?.url).toBe('https://hook')
      expect(r.incomingWebhook?.channelId).toBe('C1')
    })

    it('throws when ok=false', async () => {
      fetchMock
        .mockResolvedValueOnce({ json: async () => ({ ok: false, error: 'invalid_code' }) } as Response)
      await expect(exchangeCodeForToken(config, 'c')).rejects.toBeInstanceOf(SlackOAuthException)
    })

    it('throws when ok=true but access_token missing', async () => {
      fetchMock
        .mockResolvedValueOnce({ json: async () => ({ ok: true, team: { id: 'T', name: 'N' }, app_id: 'A' }) } as Response)
      await expect(exchangeCodeForToken(config, 'c')).rejects.toThrow(SlackOAuthException)
    })
  })

  describe('handleSlackOAuthCallback', () => {
    const config = { clientId: 'c', clientSecret: 's', redirectUri: 'r' }

    it('propagates callback error', async () => {
      await expect(handleSlackOAuthCallback(config, { error: 'access_denied' })).rejects.toThrow(
        SlackOAuthException
      )
    })

    it('rejects missing code/state', async () => {
      await expect(handleSlackOAuthCallback(config, { state: 's' })).rejects.toThrow(/code/i)
      await expect(handleSlackOAuthCallback(config, { code: 'c' })).rejects.toThrow(/state/i)
    })

    it('rejects unknown state nonce', async () => {
      await expect(
        handleSlackOAuthCallback(config, { code: 'c', state: 'nope' })
      ).rejects.toThrow(/invalid/i)
    })

    it('succeeds when state valid', async () => {
      const { state } = initiateSlackOAuth(config)
      fetchMock.mockResolvedValueOnce({
        json: async () => ({
          ok: true,
          access_token: 'x',
          app_id: 'A',
          team: { id: 'T', name: 'N' },
        }),
      } as Response)
      const res = await handleSlackOAuthCallback(config, { code: 'c', state })
      expect(res.result.accessToken).toBe('x')
      expect(res.state.nonce).toBe(state)
    })
  })

  describe('SlackOAuthException', () => {
    it('serializes via toJSON', () => {
      const e = new SlackOAuthException('bad', 'desc')
      expect(e.error).toBe('bad')
      expect(e.message).toBe('desc')
      expect(e.name).toBe('SlackOAuthException')
      expect(e.toJSON()).toEqual({ error: 'bad', errorDescription: 'desc' })
    })

    it('isSlackOAuthError narrows', () => {
      expect(isSlackOAuthError(new SlackOAuthException('x'))).toBe(true)
      expect(isSlackOAuthError(new Error('x'))).toBe(false)
      expect(isSlackOAuthError(undefined)).toBe(false)
    })
  })

  describe('getSlackErrorDescription', () => {
    it('returns friendly text for known codes', () => {
      expect(getSlackErrorDescription('access_denied')).toMatch(/denied/i)
      expect(getSlackErrorDescription('invalid_client')).toMatch(/client/i)
      expect(getSlackErrorDescription('token_revoked')).toMatch(/revoked/i)
    })

    it('falls back to generic string for unknown code', () => {
      expect(getSlackErrorDescription('weird_error')).toMatch(/weird_error/)
    })
  })

  describe('scope utilities', () => {
    it('parseScopes splits on comma and whitespace', () => {
      expect(parseScopes('chat:write,channels:read users:read')).toEqual([
        'chat:write',
        'channels:read',
        'users:read',
      ])
    })

    it('hasRequiredScopes checks all present', () => {
      expect(hasRequiredScopes('a,b,c', ['a', 'c'])).toBe(true)
      expect(hasRequiredScopes('a,b', ['a', 'c'])).toBe(false)
    })

    it('getMissingScopes lists absent ones', () => {
      expect(getMissingScopes('a', ['a', 'b'])).toEqual(['b'])
    })
  })

  describe('buildAddToSlackUrl', () => {
    it('returns the auth URL with client_id', () => {
      const u = new URL(buildAddToSlackUrl({ clientId: 'c', clientSecret: 's', redirectUri: 'r' }))
      expect(u.searchParams.get('client_id')).toBe('c')
      expect(u.searchParams.get('redirect_uri')).toBe('r')
    })
  })
})
