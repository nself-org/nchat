/**
 * GitHub OAuth — behavior tests
 */

import {
  generateOAuthState,
  storeOAuthState,
  retrieveOAuthState,
  clearOAuthState,
  buildGitHubAuthUrl,
  initiateGitHubOAuth,
  exchangeCodeForToken,
  handleGitHubOAuthCallback,
  GitHubOAuthException,
  isGitHubOAuthError,
  parseScopes,
  hasRequiredScopes,
  getMissingScopes,
} from '../oauth'

const fetchMock = jest.fn();
beforeEach(() => { fetchMock.mockReset(); (global as any).fetch = fetchMock; });

describe('github/oauth', () => {
  beforeEach(() => {
    sessionStorage.clear()
    jest.restoreAllMocks()
  })

  describe('generateOAuthState', () => {
    it('produces a 64-char lowercase hex string', () => {
      const s = generateOAuthState()
      expect(typeof s).toBe('string')
      expect(s.length).toBe(64)
      expect(s).toMatch(/^[0-9a-f]{64}$/)
    })

    it('returns unique values on successive calls', () => {
      const values = new Set([
        generateOAuthState(),
        generateOAuthState(),
        generateOAuthState(),
        generateOAuthState(),
      ])
      expect(values.size).toBe(4)
    })
  })

  describe('store / retrieve / clear OAuthState', () => {
    it('stores and retrieves state by nonce', () => {
      storeOAuthState({ nonce: 'abc', returnUrl: '/home', workspaceId: 'w1', userId: 'u1' })
      const retrieved = retrieveOAuthState('abc')
      expect(retrieved).not.toBeNull()
      expect(retrieved?.nonce).toBe('abc')
      expect(retrieved?.returnUrl).toBe('/home')
      expect(retrieved?.workspaceId).toBe('w1')
      expect(retrieved?.userId).toBe('u1')
    })

    it('single-use — retrieving consumes the state', () => {
      storeOAuthState({ nonce: 'xxx' })
      expect(retrieveOAuthState('xxx')).not.toBeNull()
      expect(retrieveOAuthState('xxx')).toBeNull()
    })

    it('returns null when nonce does not match', () => {
      storeOAuthState({ nonce: 'aaa' })
      expect(retrieveOAuthState('bbb')).toBeNull()
    })

    it('returns null when nothing stored', () => {
      expect(retrieveOAuthState('missing')).toBeNull()
    })

    it('returns null when stored state is expired', () => {
      storeOAuthState({ nonce: 'old' })
      const raw = JSON.parse(sessionStorage.getItem('github_oauth_state')!)
      raw.expiresAt = Date.now() - 1000
      sessionStorage.setItem('github_oauth_state', JSON.stringify(raw))
      expect(retrieveOAuthState('old')).toBeNull()
    })

    it('returns null on malformed JSON and clears it', () => {
      sessionStorage.setItem('github_oauth_state', 'not-json')
      expect(retrieveOAuthState('x')).toBeNull()
      expect(sessionStorage.getItem('github_oauth_state')).toBeNull()
    })

    it('clearOAuthState removes the stored state', () => {
      storeOAuthState({ nonce: 'zzz' })
      clearOAuthState()
      expect(sessionStorage.getItem('github_oauth_state')).toBeNull()
    })
  })

  describe('buildGitHubAuthUrl', () => {
    const config = {
      clientId: 'cid',
      clientSecret: 'secret',
      redirectUri: 'https://app.example.com/cb',
    }

    it('includes required params and default scopes', () => {
      const url = new URL(buildGitHubAuthUrl(config))
      expect(url.searchParams.get('client_id')).toBe('cid')
      expect(url.searchParams.get('redirect_uri')).toBe('https://app.example.com/cb')
      expect(url.searchParams.get('scope')?.length).toBeGreaterThan(0)
      expect(url.searchParams.get('allow_signup')).toBe('true')
    })

    it('honors custom scopes', () => {
      const url = new URL(buildGitHubAuthUrl({ ...config, scopes: ['repo', 'read:user'] }))
      expect(url.searchParams.get('scope')).toBe('repo read:user')
    })

    it('passes state and login options', () => {
      const url = new URL(buildGitHubAuthUrl(config, { state: 'nn', login: 'alice' }))
      expect(url.searchParams.get('state')).toBe('nn')
      expect(url.searchParams.get('login')).toBe('alice')
    })

    it('disables signup when allowSignup=false', () => {
      const url = new URL(buildGitHubAuthUrl(config, { allowSignup: false }))
      expect(url.searchParams.get('allow_signup')).toBe('false')
    })
  })

  describe('initiateGitHubOAuth', () => {
    it('stores state and returns matching nonce in authUrl', () => {
      const { authUrl, state } = initiateGitHubOAuth(
        { clientId: 'c', clientSecret: 's', redirectUri: 'https://x/cb' },
        { returnUrl: '/back', workspaceId: 'w', userId: 'u' }
      )
      expect(state).toMatch(/^[0-9a-f]{64}$/)
      const url = new URL(authUrl)
      expect(url.searchParams.get('state')).toBe(state)
      // stored state should contain the context fields
      const stored = JSON.parse(sessionStorage.getItem('github_oauth_state')!)
      expect(stored.nonce).toBe(state)
      expect(stored.returnUrl).toBe('/back')
      expect(stored.workspaceId).toBe('w')
      expect(stored.userId).toBe('u')
    })
  })

  describe('exchangeCodeForToken (fetch wrapper)', () => {
    const config = { clientId: 'c', clientSecret: 's', redirectUri: 'https://x/cb' }

    it('maps successful response', async () => {
      const fetchSpy = fetchMock.mockResolvedValueOnce({
        json: async () => ({ access_token: 'tok', token_type: 'bearer', scope: 'repo user' }),
      } as Response)
      const result = await exchangeCodeForToken(config, 'code-1')
      expect(fetchSpy).toHaveBeenCalledTimes(1)
      expect(result.accessToken).toBe('tok')
      expect(result.tokenType).toBe('bearer')
      expect(result.scope).toBe('repo user')
    })

    it('throws GitHubOAuthException on error payload', async () => {
      fetchMock.mockResolvedValueOnce({
        json: async () => ({ error: 'bad_verification_code', error_description: 'nope' }),
      } as Response)
      await expect(exchangeCodeForToken(config, 'x')).rejects.toBeInstanceOf(GitHubOAuthException)
    })

    it('throws when access_token missing', async () => {
      fetchMock.mockResolvedValueOnce({
        json: async () => ({}),
      } as Response)
      await expect(exchangeCodeForToken(config, 'x')).rejects.toThrow(GitHubOAuthException)
    })

    it('defaults tokenType to Bearer and scope to empty', async () => {
      fetchMock.mockResolvedValueOnce({
        json: async () => ({ access_token: 't' }),
      } as Response)
      const r = await exchangeCodeForToken(config, 'x')
      expect(r.tokenType).toBe('Bearer')
      expect(r.scope).toBe('')
    })
  })

  describe('handleGitHubOAuthCallback', () => {
    const config = { clientId: 'c', clientSecret: 's', redirectUri: 'https://x/cb' }

    it('rejects when callback has error', async () => {
      await expect(handleGitHubOAuthCallback(config, { error: 'access_denied' })).rejects.toThrow(
        GitHubOAuthException
      )
    })

    it('rejects when missing code', async () => {
      await expect(handleGitHubOAuthCallback(config, { state: 's' })).rejects.toThrow(/missing/i)
    })

    it('rejects when missing state', async () => {
      await expect(handleGitHubOAuthCallback(config, { code: 'c' })).rejects.toThrow(/state/i)
    })

    it('rejects when stored state does not match', async () => {
      await expect(
        handleGitHubOAuthCallback(config, { code: 'c', state: 'nonexistent' })
      ).rejects.toThrow(/invalid/i)
    })

    it('succeeds when state valid and token exchange succeeds', async () => {
      const { state } = initiateGitHubOAuth(config)
      fetchMock.mockResolvedValueOnce({
        json: async () => ({ access_token: 't', scope: 'repo' }),
      } as Response)
      const res = await handleGitHubOAuthCallback(config, { code: 'code', state })
      expect(res.result.accessToken).toBe('t')
      expect(res.state.nonce).toBe(state)
    })
  })

  describe('GitHubOAuthException', () => {
    it('preserves error/description/uri and toJSON', () => {
      const e = new GitHubOAuthException('bad', 'desc', 'http://uri')
      expect(e.name).toBe('GitHubOAuthException')
      expect(e.error).toBe('bad')
      expect(e.message).toBe('desc')
      expect(e.errorUri).toBe('http://uri')
      expect(e.toJSON()).toEqual({ error: 'bad', errorDescription: 'desc', errorUri: 'http://uri' })
    })

    it('falls back to error for message when no description', () => {
      expect(new GitHubOAuthException('boom').message).toBe('boom')
    })

    it('isGitHubOAuthError narrows the type', () => {
      expect(isGitHubOAuthError(new GitHubOAuthException('x'))).toBe(true)
      expect(isGitHubOAuthError(new Error('x'))).toBe(false)
      expect(isGitHubOAuthError('literal')).toBe(false)
      expect(isGitHubOAuthError(null)).toBe(false)
    })
  })

  describe('scope utilities', () => {
    it('parseScopes splits on comma and whitespace', () => {
      expect(parseScopes('repo, user   admin:org')).toEqual(['repo', 'user', 'admin:org'])
    })

    it('parseScopes on empty string returns []', () => {
      expect(parseScopes('')).toEqual([])
    })

    it('hasRequiredScopes true when all present', () => {
      expect(hasRequiredScopes('repo user', ['repo', 'user'])).toBe(true)
    })

    it('hasRequiredScopes false when one missing', () => {
      expect(hasRequiredScopes('repo', ['repo', 'user'])).toBe(false)
    })

    it('getMissingScopes lists only the absent ones', () => {
      expect(getMissingScopes('repo', ['repo', 'user', 'gist'])).toEqual(['user', 'gist'])
    })

    it('getMissingScopes returns [] when all present', () => {
      expect(getMissingScopes('a b c', ['a', 'b'])).toEqual([])
    })
  })
})
