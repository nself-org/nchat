/**
 * Google OAuth — behavior tests
 */

import {
  generateOAuthState,
  storeOAuthState,
  retrieveOAuthState,
  clearOAuthState,
  buildGoogleAuthUrl,
  initiateGoogleOAuth,
  exchangeCodeForToken,
  refreshAccessToken,
  getUserInfo,
  revokeToken,
  handleGoogleOAuthCallback,
  GoogleOAuthException,
  isGoogleOAuthError,
  getGoogleErrorDescription,
  parseScopes,
  hasRequiredScopes,
  calculateTokenExpiry,
  isTokenExpired,
  buildSignInButtonUrl,
} from '../oauth'

const fetchMock = jest.fn();
beforeEach(() => { fetchMock.mockReset(); (global as any).fetch = fetchMock; });

describe('google/oauth', () => {
  beforeEach(() => {
    sessionStorage.clear()
    jest.restoreAllMocks()
  })

  describe('state lifecycle', () => {
    it('generates unique nonces', () => {
      expect(generateOAuthState()).not.toBe(generateOAuthState())
    })

    it('stores, retrieves, and expires state', () => {
      storeOAuthState({ nonce: 'n', returnUrl: '/x' })
      expect(retrieveOAuthState('n')?.returnUrl).toBe('/x')
      expect(retrieveOAuthState('n')).toBeNull()
    })

    it('rejects wrong nonce', () => {
      storeOAuthState({ nonce: 'a' })
      expect(retrieveOAuthState('b')).toBeNull()
    })

    it('clearOAuthState wipes storage', () => {
      storeOAuthState({ nonce: 'n' })
      clearOAuthState()
      expect(sessionStorage.getItem('google_oauth_state')).toBeNull()
    })

    it('tolerates corrupt JSON', () => {
      sessionStorage.setItem('google_oauth_state', '{{{')
      expect(retrieveOAuthState('n')).toBeNull()
    })
  })

  describe('buildGoogleAuthUrl', () => {
    const c = { clientId: 'c', clientSecret: 's', redirectUri: 'r' }

    it('sets required default params (offline + consent + response_type)', () => {
      const u = new URL(buildGoogleAuthUrl(c))
      expect(u.searchParams.get('response_type')).toBe('code')
      expect(u.searchParams.get('access_type')).toBe('offline')
      expect(u.searchParams.get('prompt')).toBe('consent')
    })

    it('honors prompt and access_type overrides', () => {
      const u = new URL(
        buildGoogleAuthUrl(c, { prompt: 'select_account', accessType: 'online' })
      )
      expect(u.searchParams.get('prompt')).toBe('select_account')
      expect(u.searchParams.get('access_type')).toBe('online')
    })

    it('sets login_hint and include_granted_scopes when requested', () => {
      const u = new URL(
        buildGoogleAuthUrl(c, { loginHint: 'u@x.com', includeGrantedScopes: true })
      )
      expect(u.searchParams.get('login_hint')).toBe('u@x.com')
      expect(u.searchParams.get('include_granted_scopes')).toBe('true')
    })

    it('space-joins custom scopes', () => {
      const u = new URL(
        buildGoogleAuthUrl({ ...c, scopes: ['email', 'profile'] })
      )
      expect(u.searchParams.get('scope')).toBe('email profile')
    })
  })

  describe('initiateGoogleOAuth', () => {
    it('returns authUrl and stored nonce', () => {
      const { authUrl, state } = initiateGoogleOAuth(
        { clientId: 'c', clientSecret: 's', redirectUri: 'r' },
        { loginHint: 'x@y.com' }
      )
      const u = new URL(authUrl)
      expect(u.searchParams.get('state')).toBe(state)
      expect(u.searchParams.get('login_hint')).toBe('x@y.com')
    })
  })

  describe('token endpoints', () => {
    const c = { clientId: 'c', clientSecret: 's', redirectUri: 'r' }

    it('exchangeCodeForToken maps response', async () => {
      fetchMock.mockResolvedValueOnce({
        json: async () => ({
          access_token: 'a',
          refresh_token: 'r',
          expires_in: 3600,
          scope: 'email',
          id_token: 'idt',
        }),
      } as Response)
      const t = await exchangeCodeForToken(c, 'code')
      expect(t.accessToken).toBe('a')
      expect(t.idToken).toBe('idt')
      expect(t.expiresIn).toBe(3600)
    })

    it('exchangeCodeForToken throws on error', async () => {
      fetchMock
        .mockResolvedValueOnce({ json: async () => ({ error: 'invalid_grant' }) } as Response)
      await expect(exchangeCodeForToken(c, 'x')).rejects.toThrow(GoogleOAuthException)
    })

    it('refreshAccessToken preserves the original refresh token', async () => {
      fetchMock.mockResolvedValueOnce({
        json: async () => ({ access_token: 'new', expires_in: 60 }),
      } as Response)
      const r = await refreshAccessToken(c, 'rt')
      expect(r.accessToken).toBe('new')
      expect(r.refreshToken).toBe('rt')
    })

    it('getUserInfo returns payload on ok', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: '1', email: 'e', name: 'N' }),
      } as Response)
      const u = await getUserInfo('tok')
      expect(u.email).toBe('e')
      expect(u.id).toBe('1')
    })

    it('getUserInfo throws on non-ok', async () => {
      fetchMock.mockResolvedValueOnce({ ok: false } as Response)
      await expect(getUserInfo('tok')).rejects.toThrow(GoogleOAuthException)
    })

    it('revokeToken throws when response not ok', async () => {
      fetchMock.mockResolvedValueOnce({ ok: false } as Response)
      await expect(revokeToken('t')).rejects.toThrow(GoogleOAuthException)
    })

    it('revokeToken resolves when ok', async () => {
      fetchMock.mockResolvedValueOnce({ ok: true } as Response)
      await expect(revokeToken('t')).resolves.toBeUndefined()
    })
  })

  describe('handleGoogleOAuthCallback', () => {
    const c = { clientId: 'c', clientSecret: 's', redirectUri: 'r' }

    it('rejects callback-level error', async () => {
      await expect(handleGoogleOAuthCallback(c, { error: 'access_denied' })).rejects.toThrow(
        GoogleOAuthException
      )
    })

    it('rejects missing code or state', async () => {
      await expect(handleGoogleOAuthCallback(c, { state: 's' })).rejects.toThrow(/code/i)
      await expect(handleGoogleOAuthCallback(c, { code: 'c' })).rejects.toThrow(/state/i)
    })

    it('rejects unknown state', async () => {
      await expect(
        handleGoogleOAuthCallback(c, { code: 'c', state: 'nope' })
      ).rejects.toThrow(/invalid/i)
    })

    it('succeeds and fetches userInfo', async () => {
      const { state } = initiateGoogleOAuth(c)
      const fetchSpy = fetchMock
        .mockResolvedValueOnce({
          json: async () => ({ access_token: 'a', refresh_token: 'r', expires_in: 1 }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: '1', email: 'e', name: 'N' }),
        } as Response)
      const res = await handleGoogleOAuthCallback(c, { code: 'c', state })
      expect(fetchSpy).toHaveBeenCalledTimes(2)
      expect(res.userInfo.email).toBe('e')
      expect(res.result.accessToken).toBe('a')
    })
  })

  describe('exceptions and utilities', () => {
    it('GoogleOAuthException toJSON', () => {
      const e = new GoogleOAuthException('k', 'v')
      expect(e.toJSON()).toEqual({ error: 'k', errorDescription: 'v' })
      expect(e.name).toBe('GoogleOAuthException')
    })

    it('isGoogleOAuthError narrows', () => {
      expect(isGoogleOAuthError(new GoogleOAuthException('x'))).toBe(true)
      expect(isGoogleOAuthError(new Error('x'))).toBe(false)
    })

    it('getGoogleErrorDescription known + unknown codes', () => {
      expect(getGoogleErrorDescription('access_denied')).toMatch(/denied/i)
      expect(getGoogleErrorDescription('invalid_token')).toMatch(/invalid/i)
      expect(getGoogleErrorDescription('unknown_err')).toMatch(/unknown_err/)
    })

    it('parseScopes + hasRequiredScopes', () => {
      expect(parseScopes('email profile  openid')).toEqual(['email', 'profile', 'openid'])
      expect(hasRequiredScopes('email profile', ['email'])).toBe(true)
      expect(hasRequiredScopes('email', ['email', 'profile'])).toBe(false)
    })

    it('token expiry helpers', () => {
      const d = calculateTokenExpiry(3600)
      expect(d.getTime()).toBeGreaterThan(Date.now())
      expect(isTokenExpired(d, 60)).toBe(false)
      expect(isTokenExpired(new Date(Date.now() - 10), 0)).toBe(true)
    })

    it('buildSignInButtonUrl includes provided options', () => {
      const url = buildSignInButtonUrl('cid', {
        theme: 'filled_blue',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        logo_alignment: 'center',
        width: 240,
        locale: 'en',
      })
      const u = new URL(url)
      expect(u.searchParams.get('client_id')).toBe('cid')
      expect(u.searchParams.get('theme')).toBe('filled_blue')
      expect(u.searchParams.get('size')).toBe('large')
      expect(u.searchParams.get('width')).toBe('240')
      expect(u.searchParams.get('locale')).toBe('en')
    })

    it('buildSignInButtonUrl omits undefined options', () => {
      const u = new URL(buildSignInButtonUrl('cid'))
      expect(u.searchParams.get('theme')).toBeNull()
      expect(u.searchParams.get('client_id')).toBe('cid')
    })
  })
})
