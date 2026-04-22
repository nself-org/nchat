/**
 * Jira OAuth — behavior tests
 */

import {
  generateOAuthState,
  storeOAuthState,
  retrieveOAuthState,
  clearOAuthState,
  buildJiraAuthUrl,
  initiateJiraOAuth,
  exchangeCodeForToken,
  refreshAccessToken,
  getAccessibleResources,
  handleJiraOAuthCallback,
  JiraOAuthException,
  isJiraOAuthError,
  parseScopes,
  hasRequiredScopes,
  calculateTokenExpiry,
  isTokenExpired,
} from '../oauth'

const fetchMock = jest.fn();
beforeEach(() => { fetchMock.mockReset(); (global as any).fetch = fetchMock; });

describe('jira/oauth', () => {
  beforeEach(() => {
    sessionStorage.clear()
    jest.restoreAllMocks()
  })

  describe('state lifecycle', () => {
    it('generates unique nonces', () => {
      expect(generateOAuthState()).not.toBe(generateOAuthState())
    })

    it('stores and single-uses state', () => {
      storeOAuthState({ nonce: 'n' })
      expect(retrieveOAuthState('n')?.nonce).toBe('n')
      expect(retrieveOAuthState('n')).toBeNull()
    })

    it('rejects mismatched nonce', () => {
      storeOAuthState({ nonce: 'a' })
      expect(retrieveOAuthState('b')).toBeNull()
    })

    it('expires stale state', () => {
      storeOAuthState({ nonce: 'n' })
      const raw = JSON.parse(sessionStorage.getItem('jira_oauth_state')!)
      raw.expiresAt = Date.now() - 10
      sessionStorage.setItem('jira_oauth_state', JSON.stringify(raw))
      expect(retrieveOAuthState('n')).toBeNull()
    })

    it('clearOAuthState removes it', () => {
      storeOAuthState({ nonce: 'n' })
      clearOAuthState()
      expect(sessionStorage.getItem('jira_oauth_state')).toBeNull()
    })
  })

  describe('buildJiraAuthUrl', () => {
    const c = { clientId: 'cid', clientSecret: 's', redirectUri: 'https://x/cb' }

    it('sets Atlassian audience + response_type=code', () => {
      const u = new URL(buildJiraAuthUrl(c))
      expect(u.searchParams.get('audience')).toBe('api.atlassian.com')
      expect(u.searchParams.get('response_type')).toBe('code')
      expect(u.searchParams.get('prompt')).toBe('consent')
    })

    it('allows prompt=none', () => {
      const u = new URL(buildJiraAuthUrl(c, { prompt: 'none' }))
      expect(u.searchParams.get('prompt')).toBe('none')
    })

    it('space-joins scopes', () => {
      const u = new URL(buildJiraAuthUrl({ ...c, scopes: ['read:jira-work', 'write:jira-work'] }))
      expect(u.searchParams.get('scope')).toBe('read:jira-work write:jira-work')
    })

    it('passes state', () => {
      const u = new URL(buildJiraAuthUrl(c, { state: 'nn' }))
      expect(u.searchParams.get('state')).toBe('nn')
    })
  })

  describe('initiateJiraOAuth', () => {
    it('returns an authUrl with the same nonce as stored state', () => {
      const { authUrl, state } = initiateJiraOAuth({
        clientId: 'c',
        clientSecret: 's',
        redirectUri: 'r',
      })
      expect(new URL(authUrl).searchParams.get('state')).toBe(state)
    })
  })

  describe('exchangeCodeForToken', () => {
    const c = { clientId: 'c', clientSecret: 's', redirectUri: 'r' }

    it('returns normalized token', async () => {
      fetchMock.mockResolvedValueOnce({
        json: async () => ({
          access_token: 'a',
          refresh_token: 'r',
          expires_in: 3600,
          scope: 'read:jira-work',
        }),
      } as Response)
      const t = await exchangeCodeForToken(c, 'code')
      expect(t.accessToken).toBe('a')
      expect(t.refreshToken).toBe('r')
      expect(t.expiresIn).toBe(3600)
      expect(t.tokenType).toBe('Bearer')
    })

    it('throws on error field', async () => {
      fetchMock
        .mockResolvedValueOnce({ json: async () => ({ error: 'invalid_grant' }) } as Response)
      await expect(exchangeCodeForToken(c, 'x')).rejects.toBeInstanceOf(JiraOAuthException)
    })

    it('throws when access_token missing', async () => {
      fetchMock.mockResolvedValueOnce({ json: async () => ({}) } as Response)
      await expect(exchangeCodeForToken(c, 'x')).rejects.toThrow(JiraOAuthException)
    })
  })

  describe('refreshAccessToken', () => {
    const c = { clientId: 'c', clientSecret: 's', redirectUri: 'r' }

    it('returns new token but keeps old refresh token when API omits it', async () => {
      fetchMock.mockResolvedValueOnce({
        json: async () => ({ access_token: 'new', expires_in: 60, scope: 'x' }),
      } as Response)
      const r = await refreshAccessToken(c, 'old-refresh')
      expect(r.accessToken).toBe('new')
      expect(r.refreshToken).toBe('old-refresh')
    })

    it('uses new refresh token when API returns one', async () => {
      fetchMock.mockResolvedValueOnce({
        json: async () => ({ access_token: 'a', refresh_token: 'rotated', expires_in: 60 }),
      } as Response)
      const r = await refreshAccessToken(c, 'old')
      expect(r.refreshToken).toBe('rotated')
    })

    it('throws on error', async () => {
      fetchMock
        .mockResolvedValueOnce({ json: async () => ({ error: 'invalid_grant' }) } as Response)
      await expect(refreshAccessToken(c, 'x')).rejects.toThrow(JiraOAuthException)
    })
  })

  describe('getAccessibleResources', () => {
    it('returns resource list on ok', async () => {
      const resources = [{ id: '1', url: 'https://x', name: 'n', scopes: [], avatarUrl: '' }]
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => resources,
      } as Response)
      const r = await getAccessibleResources('tok')
      expect(r).toEqual(resources)
    })

    it('throws when response not ok', async () => {
      fetchMock.mockResolvedValueOnce({ ok: false } as Response)
      await expect(getAccessibleResources('tok')).rejects.toThrow(JiraOAuthException)
    })
  })

  describe('handleJiraOAuthCallback', () => {
    const c = { clientId: 'c', clientSecret: 's', redirectUri: 'r' }

    it('rejects on callback error', async () => {
      await expect(handleJiraOAuthCallback(c, { error: 'access_denied' })).rejects.toThrow(
        JiraOAuthException
      )
    })

    it('rejects missing code/state', async () => {
      await expect(handleJiraOAuthCallback(c, { state: 's' })).rejects.toThrow(/code/i)
      await expect(handleJiraOAuthCallback(c, { code: 'c' })).rejects.toThrow(/state/i)
    })

    it('rejects unknown state', async () => {
      await expect(handleJiraOAuthCallback(c, { code: 'c', state: 'nope' })).rejects.toThrow(
        /invalid/i
      )
    })

    it('full flow success with resources', async () => {
      const { state } = initiateJiraOAuth(c)
      const fetchSpy = fetchMock
        .mockResolvedValueOnce({
          json: async () => ({ access_token: 'a', refresh_token: 'r', expires_in: 1 }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: '1', url: 'u', name: 'n', scopes: [], avatarUrl: '' }],
        } as Response)
      const res = await handleJiraOAuthCallback(c, { code: 'c', state })
      expect(fetchSpy).toHaveBeenCalledTimes(2)
      expect(res.result.accessToken).toBe('a')
      expect(res.resources).toHaveLength(1)
    })
  })

  describe('utilities', () => {
    it('JiraOAuthException toJSON', () => {
      const e = new JiraOAuthException('err', 'dd')
      expect(e.toJSON()).toEqual({ error: 'err', errorDescription: 'dd' })
      expect(e.name).toBe('JiraOAuthException')
    })

    it('isJiraOAuthError', () => {
      expect(isJiraOAuthError(new JiraOAuthException('x'))).toBe(true)
      expect(isJiraOAuthError(new Error('x'))).toBe(false)
    })

    it('parseScopes splits on comma/space', () => {
      expect(parseScopes('a,b c')).toEqual(['a', 'b', 'c'])
    })

    it('hasRequiredScopes', () => {
      expect(hasRequiredScopes('a b c', ['a', 'b'])).toBe(true)
      expect(hasRequiredScopes('a', ['a', 'b'])).toBe(false)
    })

    it('calculateTokenExpiry returns a future Date', () => {
      const d = calculateTokenExpiry(3600)
      expect(d.getTime()).toBeGreaterThan(Date.now())
    })

    it('isTokenExpired true when past expiry (with buffer)', () => {
      const past = new Date(Date.now() - 10_000)
      expect(isTokenExpired(past, 300)).toBe(true)
    })

    it('isTokenExpired false when far in future', () => {
      const future = new Date(Date.now() + 3600_000)
      expect(isTokenExpired(future, 60)).toBe(false)
    })

    it('isTokenExpired true when within buffer window', () => {
      const soon = new Date(Date.now() + 60_000)
      expect(isTokenExpired(soon, 120)).toBe(true)
    })
  })
})
