/**
 * Discord OAuth — behavior tests
 */

import {
  generateOAuthState,
  storeOAuthState,
  retrieveOAuthState,
  clearOAuthState,
  buildDiscordAuthUrl,
  buildBotInviteUrl,
  initiateDiscordOAuth,
  exchangeCodeForToken,
  refreshAccessToken,
  revokeToken,
  handleDiscordOAuthCallback,
  DiscordOAuthException,
  isDiscordOAuthError,
  getDiscordErrorDescription,
  parseScopes,
  hasRequiredScopes,
  calculateTokenExpiry,
  isTokenExpired,
  calculatePermissions,
} from '../oauth'

const fetchMock = jest.fn();
beforeEach(() => { fetchMock.mockReset(); (global as any).fetch = fetchMock; });

describe('discord/oauth', () => {
  beforeEach(() => {
    sessionStorage.clear()
    jest.restoreAllMocks()
  })

  describe('state lifecycle', () => {
    it('generates unique hex nonces', () => {
      const a = generateOAuthState()
      expect(a).toMatch(/^[0-9a-f]{64}$/)
      expect(generateOAuthState()).not.toBe(a)
    })

    it('stores and single-uses state', () => {
      storeOAuthState({ nonce: 'n', userId: 'u' })
      expect(retrieveOAuthState('n')?.userId).toBe('u')
      expect(retrieveOAuthState('n')).toBeNull()
    })

    it('ttl-expires the state', () => {
      storeOAuthState({ nonce: 'n' })
      const raw = JSON.parse(sessionStorage.getItem('discord_oauth_state')!)
      raw.expiresAt = Date.now() - 1
      sessionStorage.setItem('discord_oauth_state', JSON.stringify(raw))
      expect(retrieveOAuthState('n')).toBeNull()
    })

    it('rejects mismatched nonce', () => {
      storeOAuthState({ nonce: 'x' })
      expect(retrieveOAuthState('y')).toBeNull()
    })

    it('clears cleanly', () => {
      storeOAuthState({ nonce: 'n' })
      clearOAuthState()
      expect(sessionStorage.getItem('discord_oauth_state')).toBeNull()
    })
  })

  describe('buildDiscordAuthUrl', () => {
    const c = { clientId: 'cid', clientSecret: 's', redirectUri: 'r' }

    it('sets response_type=code and space-separated scopes', () => {
      const u = new URL(buildDiscordAuthUrl({ ...c, scopes: ['identify', 'guilds'] }))
      expect(u.searchParams.get('response_type')).toBe('code')
      expect(u.searchParams.get('scope')).toBe('identify guilds')
    })

    it('includes bot permissions when config supplies them', () => {
      const u = new URL(buildDiscordAuthUrl({ ...c, botPermissions: '8' }))
      expect(u.searchParams.get('permissions')).toBe('8')
    })

    it('supports guild pre-select with disable flag', () => {
      const u = new URL(
        buildDiscordAuthUrl(c, { guildId: 'G1', disableGuildSelect: true })
      )
      expect(u.searchParams.get('guild_id')).toBe('G1')
      expect(u.searchParams.get('disable_guild_select')).toBe('true')
    })

    it('passes state and prompt', () => {
      const u = new URL(buildDiscordAuthUrl(c, { state: 'nn', prompt: 'none' }))
      expect(u.searchParams.get('state')).toBe('nn')
      expect(u.searchParams.get('prompt')).toBe('none')
    })
  })

  describe('buildBotInviteUrl', () => {
    it('defaults scopes to bot + applications.commands', () => {
      const u = new URL(buildBotInviteUrl('cid'))
      expect(u.searchParams.get('scope')).toBe('bot applications.commands')
      expect(u.searchParams.get('client_id')).toBe('cid')
    })

    it('includes permissions and guild options', () => {
      const u = new URL(
        buildBotInviteUrl('cid', { permissions: '8', guildId: 'G1' })
      )
      expect(u.searchParams.get('permissions')).toBe('8')
      expect(u.searchParams.get('guild_id')).toBe('G1')
      expect(u.searchParams.get('disable_guild_select')).toBe('true')
    })
  })

  describe('initiateDiscordOAuth', () => {
    it('returns an authUrl whose state matches the nonce', () => {
      const { authUrl, state } = initiateDiscordOAuth({
        clientId: 'c',
        clientSecret: 's',
        redirectUri: 'r',
      })
      expect(new URL(authUrl).searchParams.get('state')).toBe(state)
    })
  })

  describe('exchangeCodeForToken + refresh + revoke', () => {
    const c = { clientId: 'c', clientSecret: 's', redirectUri: 'r' }

    it('maps token response', async () => {
      fetchMock.mockResolvedValueOnce({
        json: async () => ({
          access_token: 'a',
          refresh_token: 'r',
          expires_in: 7200,
          scope: 'identify',
        }),
      } as Response)
      const t = await exchangeCodeForToken(c, 'code')
      expect(t.accessToken).toBe('a')
      expect(t.expiresIn).toBe(7200)
      expect(t.tokenType).toBe('Bearer')
    })

    it('throws on error in exchange response', async () => {
      fetchMock
        .mockResolvedValueOnce({ json: async () => ({ error: 'invalid_grant' }) } as Response)
      await expect(exchangeCodeForToken(c, 'x')).rejects.toBeInstanceOf(DiscordOAuthException)
    })

    it('throws when access_token missing', async () => {
      fetchMock.mockResolvedValueOnce({ json: async () => ({}) } as Response)
      await expect(exchangeCodeForToken(c, 'x')).rejects.toThrow(DiscordOAuthException)
    })

    it('refreshAccessToken returns new token', async () => {
      fetchMock.mockResolvedValueOnce({
        json: async () => ({ access_token: 'n', refresh_token: 'r2', expires_in: 60 }),
      } as Response)
      const r = await refreshAccessToken(c, 'old')
      expect(r.accessToken).toBe('n')
      expect(r.refreshToken).toBe('r2')
    })

    it('revokeToken throws when response not ok', async () => {
      fetchMock.mockResolvedValueOnce({ ok: false } as Response)
      await expect(revokeToken(c, 't')).rejects.toThrow(DiscordOAuthException)
    })

    it('revokeToken resolves on ok response', async () => {
      fetchMock.mockResolvedValueOnce({ ok: true } as Response)
      await expect(revokeToken(c, 't')).resolves.toBeUndefined()
    })
  })

  describe('handleDiscordOAuthCallback', () => {
    const c = { clientId: 'c', clientSecret: 's', redirectUri: 'r' }

    it('rejects callback error', async () => {
      await expect(handleDiscordOAuthCallback(c, { error: 'access_denied' })).rejects.toThrow(
        DiscordOAuthException
      )
    })

    it('rejects missing code', async () => {
      await expect(handleDiscordOAuthCallback(c, { state: 's' })).rejects.toThrow(/code/i)
    })

    it('rejects missing state', async () => {
      await expect(handleDiscordOAuthCallback(c, { code: 'c' })).rejects.toThrow(/state/i)
    })

    it('rejects invalid state', async () => {
      await expect(handleDiscordOAuthCallback(c, { code: 'c', state: 'nope' })).rejects.toThrow(
        /invalid/i
      )
    })

    it('succeeds and passes through guildId', async () => {
      const { state } = initiateDiscordOAuth(c)
      fetchMock.mockResolvedValueOnce({
        json: async () => ({ access_token: 'a', refresh_token: 'r', expires_in: 60 }),
      } as Response)
      const res = await handleDiscordOAuthCallback(c, { code: 'x', state, guildId: 'G' })
      expect(res.result.accessToken).toBe('a')
      expect(res.guildId).toBe('G')
    })
  })

  describe('exceptions and utils', () => {
    it('DiscordOAuthException serializes', () => {
      const e = new DiscordOAuthException('x', 'y')
      expect(e.toJSON()).toEqual({ error: 'x', errorDescription: 'y' })
      expect(e.name).toBe('DiscordOAuthException')
    })

    it('isDiscordOAuthError narrows', () => {
      expect(isDiscordOAuthError(new DiscordOAuthException('x'))).toBe(true)
      expect(isDiscordOAuthError(new Error('x'))).toBe(false)
    })

    it('getDiscordErrorDescription returns friendly for known codes', () => {
      expect(getDiscordErrorDescription('access_denied')).toMatch(/denied/i)
      expect(getDiscordErrorDescription('invalid_client')).toMatch(/client/i)
    })

    it('getDiscordErrorDescription falls back for unknown', () => {
      expect(getDiscordErrorDescription('xx')).toMatch(/xx/)
    })

    it('parseScopes splits on whitespace only (Discord convention)', () => {
      expect(parseScopes('identify  guilds email')).toEqual(['identify', 'guilds', 'email'])
    })

    it('hasRequiredScopes', () => {
      expect(hasRequiredScopes('identify guilds', ['identify'])).toBe(true)
      expect(hasRequiredScopes('identify', ['guilds'])).toBe(false)
    })

    it('calculateTokenExpiry / isTokenExpired round-trip', () => {
      const d = calculateTokenExpiry(3600)
      expect(isTokenExpired(d, 60)).toBe(false)
      expect(isTokenExpired(new Date(Date.now() - 1), 0)).toBe(true)
    })
  })

  describe('calculatePermissions', () => {
    it('combines known permission flags into an integer string', () => {
      // ADMINISTRATOR=1<<3=8
      expect(calculatePermissions(['ADMINISTRATOR'])).toBe('8')
      // BAN_MEMBERS|KICK_MEMBERS = (1<<2)|(1<<1) = 4|2 = 6
      expect(calculatePermissions(['BAN_MEMBERS', 'KICK_MEMBERS'])).toBe('6')
    })

    it('is case-insensitive on permission names', () => {
      expect(calculatePermissions(['administrator'])).toBe('8')
    })

    it('ignores unknown permission names', () => {
      expect(calculatePermissions(['WHATEVER'])).toBe('0')
    })

    it('returns 0 for empty input', () => {
      expect(calculatePermissions([])).toBe('0')
    })

    it('is idempotent for duplicate flags (bitmask OR)', () => {
      expect(calculatePermissions(['ADMINISTRATOR', 'ADMINISTRATOR'])).toBe('8')
    })
  })
})
