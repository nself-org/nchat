# Internationalization (i18n) Guide

**Last Updated**: January 31, 2026
**Version**: 1.0.0

## Overview

nself-chat includes a comprehensive internationalization (i18n) framework that supports multi-language content, RTL (right-to-left) languages, and locale-specific formatting. This guide covers everything you need to know about using and contributing translations.

---

## Table of Contents

1. [Supported Languages](#supported-languages)
2. [Architecture](#architecture)
3. [Using Translations](#using-translations)
4. [Translation Structure](#translation-structure)
5. [RTL Support](#rtl-support)
6. [Date and Number Formatting](#date-and-number-formatting)
7. [Contributing Translations](#contributing-translations)
8. [Testing Translations](#testing-translations)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

---

## Supported Languages

nself-chat currently supports the following languages:

| Language             | Code | Direction | Completion | Native Name |
| -------------------- | ---- | --------- | ---------- | ----------- |
| English              | `en` | LTR       | 100%       | English     |
| Spanish              | `es` | LTR       | 100%       | Español     |
| French               | `fr` | LTR       | 100%       | Français    |
| German               | `de` | LTR       | 100%       | Deutsch     |
| Chinese (Simplified) | `zh` | LTR       | 100%       | 中文        |
| Arabic               | `ar` | RTL       | 100%       | العربية     |
| Japanese             | `ja` | LTR       | 95%        | 日本語      |
| Portuguese           | `pt` | LTR       | 95%        | Português   |
| Russian              | `ru` | LTR       | 95%        | Русский     |

### Planned Languages

- Hebrew (he) - RTL support
- Korean (ko)
- Italian (it)
- Dutch (nl)
- Turkish (tr)
- Hindi (hi)

---

## Architecture

### Core Components

The i18n system consists of several key components:

```
src/
├── lib/i18n/
│   ├── locales.ts          # Locale configurations
│   ├── translator.ts       # Translation engine
│   ├── i18n-config.ts      # Configuration
│   ├── plurals.ts          # Pluralization rules
│   ├── date-formats.ts     # Date/time formatting
│   ├── number-formats.ts   # Number formatting
│   ├── rtl.ts              # RTL support
│   ├── language-detector.ts # Browser detection
│   └── index.ts            # Public API
├── stores/
│   └── locale-store.ts     # Zustand state management
├── components/i18n/
│   ├── LocaleProvider.tsx  # React context
│   ├── LanguageSwitcher.tsx # UI component
│   ├── TranslatedText.tsx  # Text component
│   ├── FormattedDate.tsx   # Date formatting
│   ├── FormattedNumber.tsx # Number formatting
│   └── RTLWrapper.tsx      # RTL layout
└── locales/
    ├── en/                 # English translations
    │   ├── common.json
    │   ├── chat.json
    │   ├── settings.json
    │   └── admin.json
    ├── es/                 # Spanish translations
    ├── fr/                 # French translations
    ├── de/                 # German translations
    ├── zh/                 # Chinese translations
    ├── ar/                 # Arabic translations
    ├── ja/                 # Japanese translations
    ├── pt/                 # Portuguese translations
    └── ru/                 # Russian translations
```

### Translation Loading

Translations are loaded dynamically using code-splitting:

```typescript
// Dynamic import
const translations = await import(`@/locales/${locale}/${namespace}.json`)
```

This ensures:

- Small initial bundle size
- On-demand loading of languages
- Automatic code-splitting per locale
- Faster page loads

---

## Using Translations

### Basic Translation

```typescript
import { translate, t } from '@/lib/i18n/translator'

// Using translate function
const text = translate('common:app.name')

// Using shorthand
const text = t('common:app.name')

// With default namespace (assumes 'common')
const text = t('app.name')
```

### With Interpolation

```typescript
// Simple interpolation
const text = t('time.ago', {
  values: { time: '5 minutes' },
})
// Output: "5 minutes ago"

// Multiple values
const text = t('validation.minLength', {
  values: { min: 8 },
})
// Output: "Must be at least 8 characters"
```

### With Pluralization

```typescript
// Pluralization (automatic based on count)
const text = t('time.minutes', {
  count: 1,
})
// Output: "1 minute"

const text = t('time.minutes', {
  count: 5,
})
// Output: "5 minutes"
```

### Using React Hooks

```typescript
import { useTranslation } from '@/hooks/use-translation';

function MyComponent() {
  const { t, locale, setLocale } = useTranslation();

  return (
    <div>
      <h1>{t('app.welcome')}</h1>
      <p>Current locale: {locale}</p>
    </div>
  );
}
```

### Using Components

```typescript
import { TranslatedText } from '@/components/i18n/TranslatedText';
import { FormattedDate } from '@/components/i18n/FormattedDate';
import { FormattedNumber } from '@/components/i18n/FormattedNumber';

function MyComponent() {
  return (
    <div>
      {/* Simple translation */}
      <TranslatedText i18nKey="app.name" />

      {/* With interpolation */}
      <TranslatedText
        i18nKey="time.ago"
        values={{ time: '5 minutes' }}
      />

      {/* Date formatting */}
      <FormattedDate date={new Date()} format="long" />

      {/* Number formatting */}
      <FormattedNumber value={1234.56} style="currency" currency="USD" />
    </div>
  );
}
```

---

## Translation Structure

### Namespaces

Translations are organized into namespaces:

#### `common.json` - Common UI elements

```json
{
  "app": {
    "name": "nChat",
    "tagline": "Team Communication Platform",
    "loading": "Loading...",
    "error": "An error occurred"
  },
  "navigation": { ... },
  "time": { ... },
  "validation": { ... },
  "errors": { ... },
  "status": { ... },
  "notifications": { ... },
  "confirmations": { ... },
  "empty": { ... },
  "accessibility": { ... },
  "language": { ... }
}
```

#### `chat.json` - Chat-specific strings

```json
{
  "messages": { ... },
  "channels": { ... },
  "threads": { ... },
  "directMessages": { ... },
  "mentions": { ... },
  "files": { ... },
  "search": { ... },
  "presence": { ... },
  "notifications": { ... },
  "members": { ... },
  "reactions": { ... },
  "formatting": { ... }
}
```

#### `settings.json` - Settings UI

```json
{
  "settings": { ... },
  "profile": { ... },
  "account": { ... },
  "appearance": { ... },
  "notifications": { ... },
  "privacy": { ... },
  "language": { ... },
  "accessibility": { ... },
  "advanced": { ... },
  "about": { ... }
}
```

#### `admin.json` - Admin dashboard

```json
{
  "admin": { ... },
  "dashboard": { ... },
  "users": { ... },
  "roles": { ... },
  "channels": { ... },
  "moderation": { ... },
  "analytics": { ... },
  "settings": { ... },
  "integrations": { ... },
  "logs": { ... },
  "setup": { ... }
}
```

### Key Naming Conventions

1. **Use dot notation**: `section.subsection.key`
2. **Be descriptive**: `channels.createPublic` not `channels.cp`
3. **Group related keys**: All button text under `buttons.*`
4. **Plural forms**: Use `_one` and `_other` suffixes
   ```json
   {
     "messages_one": "{{count}} message",
     "messages_other": "{{count}} messages"
   }
   ```

### Interpolation Syntax

Use `{{variable}}` for variable interpolation:

```json
{
  "welcome": "Welcome, {{name}}!",
  "itemsSelected": "{{count}} items selected",
  "validation": {
    "minLength": "Must be at least {{min}} characters"
  }
}
```

---

## RTL Support

### Supported RTL Languages

- Arabic (`ar`)
- Hebrew (`he`) - planned

### Automatic RTL Detection

The i18n system automatically detects RTL languages and applies appropriate styles:

```typescript
// Automatic detection and application
import { getDirection, applyDocumentDirection } from '@/lib/i18n/rtl'

const direction = getDirection('ar') // 'rtl'
applyDocumentDirection('ar') // Applies dir="rtl" to <html>
```

### RTL Component Wrapper

```typescript
import { RTLWrapper } from '@/components/i18n/RTLWrapper';

function MyComponent() {
  return (
    <RTLWrapper>
      <div>Content automatically adapts to RTL</div>
    </RTLWrapper>
  );
}
```

### CSS Considerations

Use logical properties for RTL compatibility:

```css
/* ❌ Avoid */
.element {
  margin-left: 10px;
  text-align: left;
}

/* ✅ Use logical properties */
.element {
  margin-inline-start: 10px;
  text-align: start;
}

/* ✅ Or use Tailwind RTL utilities */
.element {
  @apply ms-2.5; /* margin-start */
  @apply text-start;
}
```

---

## Date and Number Formatting

### Date Formatting

```typescript
import { formatDate, formatRelativeTime } from '@/lib/i18n/date-formats'

// Format date
const formatted = formatDate(new Date(), 'long', 'en')
// Output: "January 31, 2026"

// Relative time
const relative = formatRelativeTime(new Date(), 'en')
// Output: "just now"
```

#### Date Format Options

- `short`: "1/31/26"
- `medium`: "Jan 31, 2026"
- `long`: "January 31, 2026"
- `full`: "Friday, January 31, 2026"
- `time`: "3:45 PM"
- `datetime`: "Jan 31, 2026, 3:45 PM"

### Number Formatting

```typescript
import { formatNumber, formatCurrency } from '@/lib/i18n/number-formats'

// Format number
const num = formatNumber(1234.56, 'en')
// Output: "1,234.56"

// Format currency
const price = formatCurrency(99.99, 'USD', 'en')
// Output: "$99.99"

// Format percentage
const percent = formatNumber(0.85, 'en', { style: 'percent' })
// Output: "85%"
```

---

## Contributing Translations

We welcome translation contributions from the community! Here's how to contribute:

### Quick Start

1. **Fork the repository**

   ```bash
   git clone https://github.com/yourusername/nself-chat.git
   cd nself-chat
   ```

2. **Choose your language**
   - Check `/src/locales/` for existing languages
   - Copy `en/` folder as template if starting new language

3. **Translate the files**
   - Edit JSON files in `/src/locales/[your-lang]/`
   - Keep the keys the same, translate only the values
   - Maintain interpolation variables like `{{name}}`

4. **Update locale configuration**

   Edit `/src/lib/i18n/locales.ts`:

   ```typescript
   export const SUPPORTED_LOCALES = {
     // ... existing locales
     it: {
       code: 'it',
       name: 'Italiano',
       englishName: 'Italian',
       script: 'Latn',
       direction: 'ltr',
       bcp47: 'it-IT',
       flag: '🇮🇹',
       dateFnsLocale: 'it',
       numberLocale: 'it-IT',
       pluralRule: 'other',
       isComplete: false,
       completionPercent: 0,
     },
   }
   ```

5. **Test your translations**

   ```bash
   pnpm dev
   # Navigate to settings and change language
   ```

6. **Submit a pull request**
   ```bash
   git checkout -b add-italian-translation
   git add src/locales/it/
   git commit -m "Add Italian translation"
   git push origin add-italian-translation
   ```

### Translation Guidelines

#### 1. **Maintain Context**

- Understand the UI context where text appears
- Ask for screenshots if unclear
- Check similar apps in your language for terminology

#### 2. **Preserve Formatting**

- Keep interpolation variables: `{{name}}`, `{{count}}`
- Maintain HTML entities: `&nbsp;`, `&mdash;`
- Don't translate technical terms like "URL", "API", "OAuth"

#### 3. **Handle Plurals Correctly**

English uses `_one` and `_other`:

```json
{
  "messages_one": "{{count}} message",
  "messages_other": "{{count}} messages"
}
```

Some languages need more forms:

- **Arabic**: `_zero`, `_one`, `_two`, `_few`, `_many`, `_other`
- **Polish**: `_one`, `_few`, `_many`, `_other`
- **Russian**: `_one`, `_few`, `_many`, `_other`

#### 4. **Use Appropriate Formality**

- Match the app's tone (professional but friendly)
- Use informal "you" where appropriate (tu vs. vous)
- Be consistent throughout

#### 5. **Test Edge Cases**

- Long words (German compounds)
- Short words (Chinese characters)
- RTL text (Arabic/Hebrew)
- Special characters

### Validation Checklist

Before submitting:

- [ ] All JSON files are valid (no syntax errors)
- [ ] All keys from English version are present
- [ ] Interpolation variables are unchanged
- [ ] Plural forms follow locale's plural rules
- [ ] No machine translation without review
- [ ] Tested in UI (if possible)
- [ ] Proper character encoding (UTF-8)
- [ ] Consistent terminology across files

### Review Process

1. **Automated checks**:
   - JSON syntax validation
   - Key completeness check
   - Interpolation variable check

2. **Community review**:
   - Native speakers review translations
   - Maintainers check for consistency
   - UI testing with new translations

3. **Approval and merge**:
   - At least one native speaker approval
   - Maintainer approval
   - Merge to main branch
   - Deploy in next release

---

## Testing Translations

### Manual Testing

1. **Change language in UI**:
   - Go to Settings → Language
   - Select your language
   - Navigate through all pages

2. **Check for issues**:
   - Text overflow/truncation
   - Misaligned elements
   - Missing translations (showing keys)
   - Broken layouts (especially RTL)

### Automated Testing

```bash
# Run translation tests
pnpm test src/lib/i18n/__tests__/

# Specific locale test
pnpm test src/lib/i18n/__tests__/locales.test.ts

# Test translator
pnpm test src/lib/i18n/__tests__/translator.test.ts
```

### Validation Script

```bash
# Validate all translation files
node scripts/validate-translations.js

# Check specific language
node scripts/validate-translations.js --locale=es

# Find missing keys
node scripts/validate-translations.js --find-missing
```

---

## Best Practices

### For Developers

1. **Always use translation keys**

   ```typescript
   // ❌ Don't hardcode strings
   <button>Save</button>

   // ✅ Use translation keys
   <button>{t('app.save')}</button>
   ```

2. **Provide context in keys**

   ```typescript
   // ❌ Vague
   t('submit')

   // ✅ Descriptive
   t('settings.account.submit')
   ```

3. **Use interpolation for dynamic content**

   ```typescript
   // ❌ Don't concatenate
   const text = userName + ' sent a message'

   // ✅ Use interpolation
   const text = t('messages.userSent', { values: { user: userName } })
   ```

4. **Handle plurals properly**

   ```typescript
   // ❌ Manual plural logic
   const text = count === 1 ? '1 message' : `${count} messages`

   // ✅ Use plural keys
   const text = t('messages.count', { count })
   ```

### For Translators

1. **Translate meaning, not words**
   - Adapt idioms to your language
   - Use natural phrasing
   - Consider cultural context

2. **Maintain consistency**
   - Use same terms for same concepts
   - Keep tone consistent
   - Follow your language's style guide

3. **Test in context**
   - See how translations look in UI
   - Check text length and wrapping
   - Verify with native speakers

4. **Document ambiguities**
   - Add comments for unclear terms
   - Provide alternatives for review
   - Ask questions in pull requests

---

## Troubleshooting

### Common Issues

#### 1. **Translations not loading**

**Problem**: Changing language doesn't update UI

**Solutions**:

```typescript
// Check if namespace is loaded
const { loadNamespace } = useLocaleStore()
await loadNamespace('chat')

// Force reload
window.location.reload()
```

#### 2. **Missing translation keys**

**Problem**: Seeing keys like `common:app.name` instead of translated text

**Solutions**:

- Check if key exists in translation file
- Verify namespace is loaded
- Check for typos in key name
- Ensure fallback locale (en) has the key

#### 3. **RTL layout issues**

**Problem**: RTL languages display incorrectly

**Solutions**:

- Use logical CSS properties (`margin-inline-start` vs `margin-left`)
- Wrap components in `<RTLWrapper>`
- Check `dir` attribute on `<html>`
- Use Tailwind RTL utilities

#### 4. **Plural forms not working**

**Problem**: Always showing same plural form

**Solutions**:

```typescript
// Ensure count is passed
t('messages.count', { count: 5 }); // ✅

t('messages.count', { values: { count: 5 } }); // ❌

// Check plural keys exist
{
  "messages.count_one": "{{count}} message",
  "messages.count_other": "{{count}} messages"
}
```

#### 5. **Date/number formatting incorrect**

**Problem**: Dates or numbers not formatted for locale

**Solutions**:

```typescript
// Use locale-aware formatting
import { formatDate } from '@/lib/i18n/date-formats';
const formatted = formatDate(date, 'long', locale);

// Or use components
<FormattedDate date={date} format="long" />
<FormattedNumber value={1234.56} />
```

### Debug Mode

Enable i18n debug mode:

```typescript
// In i18n-config.ts
export const i18nConfig = {
  debug: true, // Enable logging
  // ...
}
```

This will log:

- Missing translations
- Fallback usage
- Namespace loading
- Translation lookups

---

## Resources

### Documentation

- [i18n Architecture](../architecture/i18n-architecture.md)
- [Translation API Reference](../api/i18n-api.md)
- [RTL Design Guide](../design/rtl-design.md)

### External Resources

- [date-fns Locales](https://date-fns.org/docs/I18n)
- [Intl.NumberFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat)
- [Intl.DateTimeFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat)
- [Unicode CLDR Plurals](https://cldr.unicode.org/index/cldr-spec/plural-rules)
- [BCP 47 Language Tags](https://www.rfc-editor.org/rfc/bcp/bcp47.txt)

### Community

- **Translation Discussions**: [GitHub Discussions](https://github.com/nself/nself-chat/discussions/categories/translations)
- **Report Issues**: [GitHub Issues](https://github.com/nself/nself-chat/issues)
- **Request Language**: [Request Form](https://github.com/nself/nself-chat/issues/new?template=language_request.md)

---

## License

All translations are part of the nself-chat project and follow the same license (MIT).

Contributors retain copyright of their translations but grant nself-chat the right to use, modify, and distribute them under the project license.

---

**Need Help?**

- 📧 Email: i18n@nself.org
- 💬 Discord: [nself-chat Discord](https://discord.gg/nself-chat)
- 📖 Docs: [docs.nself.org/i18n](https://docs.nself.org/i18n)

**Want to contribute?** See [CONTRIBUTING.md](../CONTRIBUTING.md) for more information!
