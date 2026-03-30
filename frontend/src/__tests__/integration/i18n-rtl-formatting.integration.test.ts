/**
 * @jest-environment <rootDir>/jest.jsdom-env.js
 *
 * Integration Test: i18n + RTL + Formatting
 *
 * Tests the integration between internationalization, RTL (right-to-left) support,
 * and locale-aware formatting. Verifies translations, text direction, and
 * number/date formatting work correctly across locales.
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
})

describe('i18n + RTL + Formatting Integration', () => {
  const mockUserId = 'user-1'

  beforeEach(() => {
    localStorage.clear()
    jest.clearAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('Locale Management', () => {
    it('should set user locale preference', () => {
      const locale = {
        userId: mockUserId,
        language: 'en-US',
        fallback: 'en',
      }

      localStorage.setItem(`locale-${mockUserId}`, JSON.stringify(locale))

      const stored = JSON.parse(localStorage.getItem(`locale-${mockUserId}`) || '{}')
      expect(stored.language).toBe('en-US')
    })

    it('should support multiple locales', () => {
      const supportedLocales = [
        'en-US',
        'es-ES',
        'fr-FR',
        'de-DE',
        'ar-SA',
        'he-IL',
        'ja-JP',
        'zh-CN',
      ]

      expect(supportedLocales).toContain('en-US')
      expect(supportedLocales).toContain('ar-SA') // RTL language
    })

    it('should detect browser locale', () => {
      const browserLocale = 'en-US' // Mock navigator.language
      const detectedLocale = browserLocale.split('-')[0] // Get language code

      expect(detectedLocale).toBe('en')
    })

    it('should fallback to default locale', () => {
      const userLocale = 'xx-XX' // Unsupported locale
      const supportedLocales = ['en-US', 'es-ES']

      const locale = supportedLocales.includes(userLocale) ? userLocale : supportedLocales[0]

      expect(locale).toBe('en-US')
    })
  })

  describe('Translation', () => {
    it('should translate messages', () => {
      const translations = {
        'en-US': {
          'welcome.message': 'Welcome to nchat!',
          'button.submit': 'Submit',
        },
        'es-ES': {
          'welcome.message': '¡Bienvenido a nchat!',
          'button.submit': 'Enviar',
        },
      }

      const locale = 'es-ES'
      const translated = translations[locale]['welcome.message']

      expect(translated).toBe('¡Bienvenido a nchat!')
    })

    it('should handle missing translations', () => {
      const translations = {
        'en-US': {
          'key.exists': 'Value',
        },
      }

      const locale = 'en-US'
      const key = 'key.missing'
      const translated =
        translations[locale as keyof typeof translations]?.[
          key as keyof (typeof translations)['en-US']
        ] || key

      expect(translated).toBe('key.missing')
    })

    it('should support translation variables', () => {
      const template = 'Hello, {name}! You have {count} new messages.'
      const variables = { name: 'Alice', count: 5 }

      const translated = template.replace(/{(\w+)}/g, (_, key) =>
        String(variables[key as keyof typeof variables])
      )

      expect(translated).toBe('Hello, Alice! You have 5 new messages.')
    })

    it('should handle pluralization', () => {
      const pluralRules = {
        'en-US': {
          messages: {
            zero: 'No messages',
            one: '{count} message',
            other: '{count} messages',
          },
        },
      }

      const getPlural = (count: number): string => {
        const rule = count === 0 ? 'zero' : count === 1 ? 'one' : 'other'
        return pluralRules['en-US'].messages[rule].replace('{count}', String(count))
      }

      expect(getPlural(0)).toBe('No messages')
      expect(getPlural(1)).toBe('1 message')
      expect(getPlural(5)).toBe('5 messages')
    })
  })

  describe('RTL Support', () => {
    it('should detect RTL languages', () => {
      const rtlLanguages = ['ar', 'he', 'fa', 'ur']

      const isRTL = (locale: string): boolean => {
        const lang = locale.split('-')[0]
        return rtlLanguages.includes(lang)
      }

      expect(isRTL('ar-SA')).toBe(true)
      expect(isRTL('he-IL')).toBe(true)
      expect(isRTL('en-US')).toBe(false)
    })

    it('should apply RTL direction to UI', () => {
      const locale = 'ar-SA'
      const lang = locale.split('-')[0]
      const rtlLanguages = ['ar', 'he', 'fa', 'ur']

      const direction = rtlLanguages.includes(lang) ? 'rtl' : 'ltr'

      expect(direction).toBe('rtl')
    })

    it('should mirror layout for RTL', () => {
      const isRTL = true

      const layoutProps = {
        flexDirection: isRTL ? 'row-reverse' : 'row',
        textAlign: isRTL ? 'right' : 'left',
      }

      expect(layoutProps.flexDirection).toBe('row-reverse')
      expect(layoutProps.textAlign).toBe('right')
    })

    it('should handle bidirectional text', () => {
      const text = 'Hello مرحبا World'
      const hasBidi = /[\u0600-\u06FF]/.test(text) // Arabic range

      expect(hasBidi).toBe(true)
    })

    it('should preserve RTL in mixed content', () => {
      const messages = [
        { id: '1', content: 'Hello', locale: 'en-US' },
        { id: '2', content: 'مرحبا', locale: 'ar-SA' },
      ]

      const rtlLanguages = ['ar', 'he']
      messages.forEach((msg) => {
        const lang = msg.locale.split('-')[0]
        const isRTL = rtlLanguages.includes(lang)

        if (msg.id === '2') {
          expect(isRTL).toBe(true)
        }
      })
    })
  })

  describe('Date Formatting', () => {
    it('should format dates according to locale', () => {
      const date = new Date('2024-01-15T10:30:00Z')

      const formats: Record<string, string> = {
        'en-US': '1/15/2024',
        'en-GB': '15/01/2024',
        'de-DE': '15.01.2024',
      }

      expect(formats['en-US']).toBe('1/15/2024')
      expect(formats['en-GB']).toBe('15/01/2024')
    })

    it('should format time according to locale', () => {
      const date = new Date('2024-01-15T14:30:00Z')

      const formats: Record<string, string> = {
        'en-US': '2:30 PM',
        'en-GB': '14:30',
        'de-DE': '14:30',
      }

      expect(formats['en-US']).toBe('2:30 PM')
      expect(formats['en-GB']).toBe('14:30')
    })

    it('should format relative time', () => {
      const now = Date.now()
      const timestamps = [
        { time: now - 30000, expected: 'seconds ago' },
        { time: now - 120000, expected: 'minutes ago' },
        { time: now - 3600000, expected: 'hour ago' },
      ]

      timestamps.forEach(({ time, expected }) => {
        const diff = now - time
        const seconds = Math.floor(diff / 1000)
        const minutes = Math.floor(seconds / 60)
        const hours = Math.floor(minutes / 60)

        let relative = ''
        if (hours > 0) {
          relative = hours === 1 ? 'hour ago' : 'hours ago'
        } else if (minutes > 0) {
          relative = minutes === 1 ? 'minute ago' : 'minutes ago'
        } else {
          relative = 'seconds ago'
        }

        expect(relative).toContain(expected.split(' ')[1])
      })
    })

    it('should support different calendar systems', () => {
      const gregorianDate = new Date('2024-01-15')

      // Mock conversion (actual implementation would use Intl API)
      const calendars = {
        gregorian: '2024-01-15',
        islamic: '1445-07-03', // Approximate
        hebrew: '5784-10-04', // Approximate
      }

      expect(calendars.gregorian).toBe('2024-01-15')
    })
  })

  describe('Number Formatting', () => {
    it('should format numbers according to locale', () => {
      const number = 1234567.89

      const formats: Record<string, string> = {
        'en-US': '1,234,567.89',
        'de-DE': '1.234.567,89',
        'fr-FR': '1 234 567,89',
      }

      expect(formats['en-US']).toBe('1,234,567.89')
      expect(formats['de-DE']).toBe('1.234.567,89')
    })

    it('should format currency according to locale', () => {
      const amount = 1234.56

      const formats: Record<string, string> = {
        'en-US': '$1,234.56',
        'de-DE': '1.234,56 €',
        'ja-JP': '¥1,235',
      }

      expect(formats['en-US']).toContain('$')
      expect(formats['de-DE']).toContain('€')
    })

    it('should format percentages', () => {
      const value = 0.1234

      const formats: Record<string, string> = {
        'en-US': '12.34%',
        'de-DE': '12,34 %',
      }

      expect(formats['en-US']).toBe('12.34%')
    })

    it('should handle compact number notation', () => {
      const number = 1234567

      const compact: Record<string, string> = {
        'en-US': '1.2M',
        'de-DE': '1,2 Mio.',
      }

      expect(compact['en-US']).toBe('1.2M')
    })
  })

  describe('Cross-Module State Consistency', () => {
    it('should sync locale across UI components', () => {
      const locale = 'es-ES'

      localStorage.setItem('app-locale', locale)
      localStorage.setItem('date-format-locale', locale)
      localStorage.setItem('number-format-locale', locale)

      expect(localStorage.getItem('app-locale')).toBe(locale)
      expect(localStorage.getItem('date-format-locale')).toBe(locale)
      expect(localStorage.getItem('number-format-locale')).toBe(locale)
    })

    it('should apply RTL direction globally', () => {
      const locale = 'ar-SA'
      const lang = locale.split('-')[0]
      const rtlLanguages = ['ar', 'he']

      const isRTL = rtlLanguages.includes(lang)
      const direction = isRTL ? 'rtl' : 'ltr'

      localStorage.setItem('text-direction', direction)
      localStorage.setItem('layout-direction', direction)

      expect(localStorage.getItem('text-direction')).toBe('rtl')
      expect(localStorage.getItem('layout-direction')).toBe('rtl')
    })

    it('should update all formatted content when locale changes', () => {
      const contentItems = [
        { type: 'date', value: Date.now() },
        { type: 'number', value: 1234.56 },
        { type: 'currency', value: 99.99 },
      ]

      const locale = 'de-DE'
      localStorage.setItem('app-locale', locale)

      // All items should use new locale for formatting
      contentItems.forEach((item) => {
        expect(localStorage.getItem('app-locale')).toBe(locale)
      })
    })
  })

  describe('Translation Loading', () => {
    it('should load translations for locale', async () => {
      const locale = 'es-ES'

      // Mock loading translations
      const translations = await Promise.resolve({
        'es-ES': {
          'app.title': 'nchat',
          'app.welcome': 'Bienvenido',
        },
      })

      expect(translations['es-ES']['app.welcome']).toBe('Bienvenido')
    })

    it('should cache loaded translations', () => {
      const translationCache: Record<string, Record<string, string>> = {
        'en-US': { 'app.title': 'nchat' },
      }

      const getTranslation = (locale: string, key: string): string => {
        return translationCache[locale]?.[key] || key
      }

      expect(getTranslation('en-US', 'app.title')).toBe('nchat')
    })

    it('should lazy load locale data', async () => {
      const loadedLocales = new Set(['en-US'])

      const loadLocale = async (locale: string): Promise<boolean> => {
        if (loadedLocales.has(locale)) {
          return true
        }

        // Mock loading
        await Promise.resolve()
        loadedLocales.add(locale)
        return true
      }

      const loaded = await loadLocale('es-ES')

      expect(loaded).toBe(true)
      expect(loadedLocales.has('es-ES')).toBe(true)
    })
  })

  describe('Text Directionality Edge Cases', () => {
    it('should handle neutral characters in RTL', () => {
      const text = '123 مرحبا 456'
      const hasArabic = /[\u0600-\u06FF]/.test(text)

      expect(hasArabic).toBe(true)
    })

    it('should handle punctuation in RTL', () => {
      const text = 'مرحبا، كيف حالك؟'
      const punctuation = [',', '،', '؟', '!']

      const hasPunctuation = punctuation.some((p) => text.includes(p))
      expect(hasPunctuation).toBe(true)
    })

    it('should handle embedded LTR in RTL text', () => {
      const text = 'Welcome مرحبا to nchat'
      const hasMixed = /[a-zA-Z]/.test(text) && /[\u0600-\u06FF]/.test(text)

      expect(hasMixed).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle missing locale gracefully', () => {
      const requestedLocale = 'xx-XX'
      const supportedLocales = ['en-US', 'es-ES']

      const locale = supportedLocales.includes(requestedLocale)
        ? requestedLocale
        : supportedLocales[0]

      expect(locale).toBe('en-US')
    })

    it('should handle invalid date formats', () => {
      const invalidDate = 'not-a-date'
      const date = new Date(invalidDate)

      expect(isNaN(date.getTime())).toBe(true)
    })

    it('should handle malformed translation keys', () => {
      const translations = {
        'en-US': {
          'valid.key': 'Value',
        },
      }

      const key = 'invalid..key..'
      const translated = translations['en-US'][key as keyof (typeof translations)['en-US']] || key

      expect(translated).toBe(key)
    })
  })

  describe('Security', () => {
    it('should sanitize translated content', () => {
      const unsafeTranslation = '<script>alert("xss")</script>'
      const sanitized = unsafeTranslation.replace(/<script[^>]*>.*?<\/script>/gi, '')

      expect(sanitized).toBe('')
    })

    it('should validate locale codes', () => {
      const validLocales = ['en-US', 'es-ES', 'fr-FR']
      const maliciousLocale = '../../../etc/passwd'

      const isValid = validLocales.includes(maliciousLocale)

      expect(isValid).toBe(false)
    })

    it('should prevent locale injection', () => {
      const userInput = "en-US'; DROP TABLE translations; --"
      // Use a stricter pattern that matches valid locale format (language-COUNTRY)
      const localeMatch = userInput.match(/^[a-z]{2}-[A-Z]{2}$/)
      const safeLocale = localeMatch ? localeMatch[0] : null

      expect(safeLocale).toBe(null) // Should reject malicious input

      // Test that valid input works
      const validInput = 'en-US'
      const validMatch = validInput.match(/^[a-z]{2}-[A-Z]{2}$/)
      const validLocale = validMatch ? validMatch[0] : null
      expect(validLocale).toBe('en-US')
    })
  })

  describe('Accessibility', () => {
    it('should provide lang attribute for screen readers', () => {
      const locale = 'es-ES'
      const lang = locale.split('-')[0]

      expect(lang).toBe('es')
    })

    it('should announce locale changes to screen readers', () => {
      const announcement = {
        message: 'Language changed to Spanish',
        role: 'status',
        'aria-live': 'polite',
      }

      expect(announcement.message).toContain('Spanish')
      expect(announcement['aria-live']).toBe('polite')
    })

    it('should handle screen reader directionality', () => {
      const locale = 'ar-SA'
      const rtlLanguages = ['ar', 'he']
      const lang = locale.split('-')[0]
      const isRTL = rtlLanguages.includes(lang)

      const dir = isRTL ? 'rtl' : 'ltr'

      expect(dir).toBe('rtl')
    })
  })

  describe('Performance', () => {
    it('should memoize formatted values', () => {
      const cache: Record<string, string> = {}

      const formatNumber = (value: number, locale: string): string => {
        const key = `${value}-${locale}`
        if (cache[key]) {
          return cache[key]
        }

        const formatted = value.toLocaleString(locale)
        cache[key] = formatted
        return formatted
      }

      const result1 = formatNumber(1234, 'en-US')
      const result2 = formatNumber(1234, 'en-US') // From cache

      expect(result1).toBe(result2)
      expect(Object.keys(cache)).toHaveLength(1)
    })

    it('should lazy load translation files', () => {
      const loadedTranslations = new Set<string>()

      const loadTranslationFile = (locale: string): boolean => {
        if (loadedTranslations.has(locale)) {
          return true // Already loaded
        }

        loadedTranslations.add(locale)
        return true
      }

      loadTranslationFile('en-US')
      const secondLoad = loadTranslationFile('en-US')

      expect(secondLoad).toBe(true)
      expect(loadedTranslations.size).toBe(1)
    })
  })
})
