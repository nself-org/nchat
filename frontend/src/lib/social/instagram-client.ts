/**
 * Instagram API Integration Client
 * Uses Instagram Graph API for fetching posts
 * Requires Facebook App + Instagram Business Account
 */

import type { SocialPost, SocialAPIClient, OAuthConfig } from './types'

const INSTAGRAM_GRAPH_BASE = 'https://graph.instagram.com'
const FACEBOOK_GRAPH_BASE = 'https://graph.facebook.com/v18.0'
const FACEBOOK_AUTH_BASE = 'https://www.facebook.com/v18.0/dialog/oauth'

export class InstagramClient implements SocialAPIClient {
  private config: OAuthConfig

  constructor() {
    this.config = {
      clientId: process.env.INSTAGRAM_APP_ID || '',
      clientSecret: process.env.INSTAGRAM_APP_SECRET || '',
      redirectUri: process.env.NEXT_PUBLIC_APP_URL + '/api/social/instagram/callback' || '',
      scopes: ['instagram_basic', 'instagram_content_publish', 'pages_read_engagement'],
    }

    if (!this.config.clientId || !this.config.clientSecret) {
      throw new Error('Instagram API credentials not configured')
    }
  }

  /**
   * Get OAuth authorization URL
   */
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(','),
      response_type: 'code',
      state,
    })

    return `${FACEBOOK_AUTH_BASE}?${params.toString()}`
  }

  /**
   * Exchange authorization code for access token
   */
  async authenticate(
    code: string
  ): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: Date }> {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      grant_type: 'authorization_code',
      redirect_uri: this.config.redirectUri,
      code,
    })

    const authUrl = `${FACEBOOK_GRAPH_BASE}/oauth/access_token?${params.toString()}`
    const response = await fetch(authUrl)

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Instagram authentication failed: ${error}`)
    }

    const data = await response.json()

    // Exchange short-lived token for long-lived token
    const longLivedToken = await this.exchangeForLongLivedToken(data.access_token)

    return longLivedToken
  }

  /**
   * Exchange short-lived token for long-lived token (60 days)
   */
  private async exchangeForLongLivedToken(
    shortToken: string
  ): Promise<{ accessToken: string; expiresAt?: Date }> {
    const params = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      fb_exchange_token: shortToken,
    })

    const exchangeUrl = `${FACEBOOK_GRAPH_BASE}/oauth/access_token?${params.toString()}`
    const response = await fetch(exchangeUrl)

    if (!response.ok) {
      throw new Error('Failed to exchange for long-lived token')
    }

    const data = await response.json()

    return {
      accessToken: data.access_token,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
    }
  }

  /**
   * Refresh token (get a new long-lived token)
   */
  async refreshToken(accessToken: string): Promise<{ accessToken: string; expiresAt?: Date }> {
    const params = new URLSearchParams({
      grant_type: 'ig_refresh_token',
      access_token: accessToken,
    })

    const response = await fetch(
      `${INSTAGRAM_GRAPH_BASE}/refresh_access_token?${params.toString()}`
    )

    if (!response.ok) {
      throw new Error('Instagram token refresh failed')
    }

    const data = await response.json()

    return {
      accessToken: data.access_token,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
    }
  }

  /**
   * Get Instagram Business Account info
   */
  async getAccountInfo(
    accessToken: string
  ): Promise<{ id: string; name: string; handle?: string; avatarUrl?: string }> {
    // First, get the Facebook Page ID
    const pageResponse = await fetch(
      `${FACEBOOK_GRAPH_BASE}/me/accounts?access_token=${accessToken}`
    )

    if (!pageResponse.ok) {
      throw new Error('Failed to fetch Facebook pages')
    }

    const pageData = await pageResponse.json()
    if (!pageData.data || pageData.data.length === 0) {
      throw new Error('No Facebook pages found')
    }

    const page = pageData.data[0]

    // Get Instagram Business Account
    const igResponse = await fetch(
      `${FACEBOOK_GRAPH_BASE}/${page.id}?fields=instagram_business_account&access_token=${accessToken}`
    )

    if (!igResponse.ok) {
      throw new Error('Failed to fetch Instagram Business Account')
    }

    const igData = await igResponse.json()
    const igAccountId = igData.instagram_business_account?.id

    if (!igAccountId) {
      throw new Error('No Instagram Business Account linked to this page')
    }

    // Get account details
    const accountResponse = await fetch(
      `${FACEBOOK_GRAPH_BASE}/${igAccountId}?fields=id,username,name,profile_picture_url&access_token=${accessToken}`
    )

    if (!accountResponse.ok) {
      throw new Error('Failed to fetch Instagram account details')
    }

    const accountData = await accountResponse.json()

    return {
      id: accountData.id,
      name: accountData.name || accountData.username,
      handle: accountData.username,
      avatarUrl: accountData.profile_picture_url,
    }
  }

  /**
   * Get recent Instagram posts
   */
  async getRecentPosts(
    accessToken: string,
    accountId: string,
    since?: string
  ): Promise<SocialPost[]> {
    const fields = [
      'id',
      'caption',
      'media_type',
      'media_url',
      'permalink',
      'timestamp',
      'username',
      'like_count',
      'comments_count',
      'children{media_type,media_url}',
    ].join(',')

    let url = `${FACEBOOK_GRAPH_BASE}/${accountId}/media?fields=${fields}&access_token=${accessToken}&limit=100`

    if (since) {
      url += `&since=${since}`
    }

    const response = await fetch(url)

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to fetch Instagram posts: ${error}`)
    }

    const data = await response.json()

    if (!data.data || data.data.length === 0) {
      return []
    }

    return data.data.map((post: any) => {
      const caption = post.caption || ''
      const hashtags = caption.match(/#\w+/g)?.map((h: string) => h.slice(1)) || []
      const mentions = caption.match(/@\w+/g)?.map((m: string) => m.slice(1)) || []

      // Handle media URLs
      const mediaUrls: string[] = []
      const mediaTypes: Array<'image' | 'video' | 'gif'> = []

      if (post.media_type === 'CAROUSEL_ALBUM' && post.children?.data) {
        // Multiple images/videos
        for (const child of post.children.data) {
          mediaUrls.push(child.media_url)
          mediaTypes.push(child.media_type === 'VIDEO' ? 'video' : 'image')
        }
      } else if (post.media_url) {
        // Single image or video
        mediaUrls.push(post.media_url)
        mediaTypes.push(post.media_type === 'VIDEO' ? 'video' : 'image')
      }

      return {
        id: '', // Will be generated by database
        account_id: '', // Will be set by caller
        post_id: post.id,
        post_url: post.permalink,
        content: caption,
        author_name: post.username,
        author_handle: post.username,
        author_avatar_url: undefined, // Not provided in media endpoint
        media_urls: mediaUrls.length > 0 ? mediaUrls : undefined,
        media_types: mediaTypes.length > 0 ? mediaTypes : undefined,
        hashtags: hashtags.length > 0 ? hashtags : undefined,
        mentions: mentions.length > 0 ? mentions : undefined,
        engagement: {
          likes: post.like_count,
          comments: post.comments_count,
        },
        posted_at: post.timestamp,
        imported_at: new Date().toISOString(),
        was_posted_to_channel: false,
      }
    })
  }

  /**
   * Revoke access (not directly supported by Instagram API)
   */
  async revokeAccess(accessToken: string): Promise<void> {
    // Instagram doesn't have a direct revoke endpoint
    // Users must revoke access through their Facebook settings
  }
}
