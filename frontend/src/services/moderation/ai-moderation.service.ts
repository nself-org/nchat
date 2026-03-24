/**
 * AI Moderation Service
 *
 * Provides AI-powered content moderation using OpenAI's Moderation API
 * and other providers for comprehensive threat detection.
 *
 * Features:
 * - Toxicity detection
 * - NSFW content detection
 * - Spam detection
 * - Profanity filtering
 * - Custom word list matching
 */

import { logger } from '@/lib/logger'

export interface AIModerationResult {
  safe: boolean
  scores: {
    toxicity: number
    nsfw: number
    spam: number
    profanity: number
  }
  flags: string[]
  action_required?: 'none' | 'flag' | 'hide' | 'warn' | 'block'
  details: {
    toxic_categories?: {
      hate?: number
      harassment?: number
      self_harm?: number
      sexual?: number
      violence?: number
    }
    detected_words?: string[]
    spam_indicators?: string[]
  }
  model_version: string
  confidence: number
  processing_time_ms: number
}

export interface ModerationConfig {
  enabled: boolean
  providers: {
    openai: boolean
    custom: boolean
  }
  thresholds: {
    toxic: number
    nsfw: number
    spam: number
    profanity: number
  }
  autoActions: {
    autoFlag: boolean
    autoHide: boolean
    autoWarn: boolean
    autoMute: boolean
  }
  customWords: {
    blocked: string[]
    allowed: string[]
  }
}

export class AIModerationService {
  private config: ModerationConfig
  private openaiApiKey?: string

  constructor(config: ModerationConfig) {
    this.config = config
    this.openaiApiKey = process.env.OPENAI_API_KEY
  }

  /**
   * Scan text content for violations
   */
  async scanText(
    content: string,
    context?: { userId?: string; channelId?: string }
  ): Promise<AIModerationResult> {
    const startTime = Date.now()

    try {
      // Run all checks in parallel
      const [openaiResult, profanityResult, spamResult] = await Promise.all([
        this.checkWithOpenAI(content),
        this.checkProfanity(content),
        this.checkSpam(content, context),
      ])

      // Aggregate scores
      const scores = {
        toxicity: openaiResult.toxicity,
        nsfw: openaiResult.nsfw,
        spam: spamResult.score,
        profanity: profanityResult.score,
      }

      // Determine if content is safe
      const safe =
        scores.toxicity < this.config.thresholds.toxic &&
        scores.nsfw < this.config.thresholds.nsfw &&
        scores.spam < this.config.thresholds.spam &&
        scores.profanity < this.config.thresholds.profanity

      // Collect flags
      const flags: string[] = []
      if (scores.toxicity >= this.config.thresholds.toxic) flags.push('toxic')
      if (scores.nsfw >= this.config.thresholds.nsfw) flags.push('nsfw')
      if (scores.spam >= this.config.thresholds.spam) flags.push('spam')
      if (scores.profanity >= this.config.thresholds.profanity) flags.push('profanity')

      // Determine action
      const action_required = this.determineAction(scores, flags)

      // Calculate overall confidence
      const confidence = this.calculateConfidence(openaiResult, profanityResult, spamResult)

      const processingTime = Date.now() - startTime

      return {
        safe,
        scores,
        flags,
        action_required,
        details: {
          toxic_categories: openaiResult.categories,
          detected_words: profanityResult.words,
          spam_indicators: spamResult.indicators,
        },
        model_version: 'openai-moderation-007',
        confidence,
        processing_time_ms: processingTime,
      }
    } catch (error) {
      logger.error('AI moderation error:', error)

      // Return safe result if moderation fails
      return {
        safe: true,
        scores: { toxicity: 0, nsfw: 0, spam: 0, profanity: 0 },
        flags: [],
        action_required: 'none',
        details: {},
        model_version: 'error-fallback',
        confidence: 0,
        processing_time_ms: Date.now() - startTime,
      }
    }
  }

  /**
   * Check content using OpenAI Moderation API
   */
  private async checkWithOpenAI(content: string): Promise<{
    toxicity: number
    nsfw: number
    categories: {
      hate?: number
      harassment?: number
      self_harm?: number
      sexual?: number
      violence?: number
    }
  }> {
    if (!this.config.providers.openai || !this.openaiApiKey) {
      return { toxicity: 0, nsfw: 0, categories: {} }
    }

    try {
      const response = await fetch('https://api.openai.com/v1/moderations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.openaiApiKey}`,
        },
        body: JSON.stringify({ input: content }),
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`)
      }

      const data = await response.json()
      const result = data.results[0]

      // Extract scores
      const categories = {
        hate: result.category_scores.hate || 0,
        harassment: result.category_scores.harassment || 0,
        self_harm: result.category_scores['self-harm'] || 0,
        sexual: result.category_scores.sexual || 0,
        violence: result.category_scores.violence || 0,
      }

      // Calculate aggregate scores
      const toxicity = Math.max(categories.hate, categories.harassment, categories.violence)
      const nsfw = Math.max(categories.sexual, categories.self_harm)

      return { toxicity, nsfw, categories }
    } catch (error) {
      logger.error('OpenAI moderation error:', error)
      return { toxicity: 0, nsfw: 0, categories: {} }
    }
  }

  /**
   * Check for profanity using custom word lists
   */
  private async checkProfanity(content: string): Promise<{
    score: number
    words: string[]
  }> {
    const detectedWords: string[] = []
    const contentLower = content.toLowerCase()

    // Check against blocked words
    for (const word of this.config.customWords.blocked) {
      const wordLower = word.toLowerCase()
      if (contentLower.includes(wordLower)) {
        detectedWords.push(word)
      }
    }

    // Check if any detected words are in the allowed list
    const filteredWords = detectedWords.filter(
      (word) => !this.config.customWords.allowed.includes(word)
    )

    // Calculate score based on number and severity of words
    const score = Math.min(filteredWords.length * 0.2, 1.0)

    return { score, words: filteredWords }
  }

  /**
   * Check for spam patterns
   */
  private async checkSpam(
    content: string,
    context?: { userId?: string; channelId?: string }
  ): Promise<{
    score: number
    indicators: string[]
  }> {
    const indicators: string[] = []
    let score = 0

    // Check for excessive repetition
    const uniqueWords = new Set(content.toLowerCase().split(/\s+/))
    const totalWords = content.split(/\s+/).length
    if (totalWords > 10 && uniqueWords.size < totalWords * 0.3) {
      indicators.push('repetitive')
      score += 0.3
    }

    // Check for excessive caps
    const capsCount = (content.match(/[A-Z]/g) || []).length
    const letterCount = (content.match(/[A-Za-z]/g) || []).length
    if (letterCount > 10 && capsCount / letterCount > 0.7) {
      indicators.push('excessive_caps')
      score += 0.2
    }

    // Check for excessive emojis
    const emojiPattern =
      /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu
    const emojiCount = (content.match(emojiPattern) || []).length
    if (emojiCount > 10 || (content.length > 0 && emojiCount / content.length > 0.3)) {
      indicators.push('excessive_emojis')
      score += 0.2
    }

    // Check for suspicious URLs
    const urlPattern = /(https?:\/\/[^\s]+)/g
    const urls = content.match(urlPattern) || []
    if (urls.length > 3) {
      indicators.push('multiple_links')
      score += 0.3
    }

    // Check for URL shorteners (common in spam)
    const shortenerPattern = /(bit\.ly|tinyurl|goo\.gl|ow\.ly|t\.co)/i
    if (shortenerPattern.test(content)) {
      indicators.push('url_shortener')
      score += 0.2
    }

    return { score: Math.min(score, 1.0), indicators }
  }

  /**
   * Determine what action should be taken based on scores
   */
  private determineAction(
    scores: { toxicity: number; nsfw: number; spam: number; profanity: number },
    flags: string[]
  ): 'none' | 'flag' | 'hide' | 'warn' | 'block' {
    if (flags.length === 0) return 'none'

    // Critical violations - block immediately
    if (scores.toxicity > 0.9 || scores.nsfw > 0.9) {
      return 'block'
    }

    // High violations - hide and warn
    if (scores.toxicity > 0.7 || scores.nsfw > 0.7) {
      return this.config.autoActions.autoHide ? 'hide' : 'flag'
    }

    // Medium violations - warn
    if (scores.toxicity > 0.5 || scores.nsfw > 0.5 || scores.profanity > 0.6) {
      return this.config.autoActions.autoWarn ? 'warn' : 'flag'
    }

    // Low violations - flag for review
    return this.config.autoActions.autoFlag ? 'flag' : 'none'
  }

  /**
   * Calculate overall confidence score
   */
  private calculateConfidence(...results: any[]): number {
    // Simple average of non-zero scores
    const scores = results
      .filter((r) => r && typeof r === 'object')
      .map((r) => r.confidence || r.score || 0)
      .filter((s) => s > 0)

    if (scores.length === 0) return 0.5
    return scores.reduce((a, b) => a + b, 0) / scores.length
  }

  /**
   * Scan image for violations.
   * Returns safe result until moderation plugin provides image scanning.
   */
  async scanImage(imageUrl: string): Promise<AIModerationResult> {
    return {
      safe: true,
      scores: { toxicity: 0, nsfw: 0, spam: 0, profanity: 0 },
      flags: [],
      action_required: 'none',
      details: {},
      model_version: 'image-passthrough',
      confidence: 0,
      processing_time_ms: 0,
    }
  }

  /**
   * Batch scan multiple items
   */
  async scanBatch(
    items: Array<{ type: 'text' | 'image'; content: string }>
  ): Promise<AIModerationResult[]> {
    return Promise.all(
      items.map((item) =>
        item.type === 'text' ? this.scanText(item.content) : this.scanImage(item.content)
      )
    )
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ModerationConfig>): void {
    this.config = { ...this.config, ...config }
  }
}

/**
 * Create AI moderation service instance from app config
 */
export function createAIModerationService(appConfig: any): AIModerationService {
  const config: ModerationConfig = {
    enabled: appConfig.moderation?.aiModeration?.enabled ?? true,
    providers: {
      openai: true,
      custom: false,
    },
    thresholds: appConfig.moderation?.thresholds ?? {
      toxic: 0.7,
      nsfw: 0.7,
      spam: 0.6,
      profanity: 0.5,
    },
    autoActions: appConfig.moderation?.autoActions ?? {
      autoFlag: true,
      autoHide: false,
      autoWarn: false,
      autoMute: false,
    },
    customWords: appConfig.moderation?.customWords ?? {
      blocked: [],
      allowed: [],
    },
  }

  return new AIModerationService(config)
}

export default AIModerationService
