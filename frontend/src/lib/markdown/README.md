# Markdown Library

Complete markdown parsing and rendering for the nself-chat application.

## Features

- ✅ **Full Markdown Support**: All standard markdown syntax
- ✅ **TipTap Integration**: Seamless conversion between TipTap JSON and Markdown
- ✅ **Syntax Highlighting**: Code blocks with lowlight
- ✅ **@Mentions & #Channels**: Custom mention syntax with callbacks
- ✅ **Emoji Support**: Emoji shortcodes (`:emoji:`)
- ✅ **HTML Sanitization**: DOMPurify integration for safe rendering
- ✅ **Preview Modes**: Preview and raw markdown views
- ✅ **Compact Rendering**: Truncated previews for message lists

## Supported Markdown

### Text Formatting

- **Bold**: `**text**` or `__text__`
- _Italic_: `*text*` or `_text_`
- <u>Underline</u>: `<u>text</u>`
- ~~Strikethrough~~: `~~text~~`
- `Code`: `` `code` ``

### Block Elements

- Headings: `# H1` through `###### H6`
- Code blocks with syntax highlighting:
  ```language
  code here
  ```
- Blockquotes: `> quote`
- Horizontal rules: `---` or `***` or `___`

### Lists

- Bullet lists: `- item` or `* item` or `+ item`
- Ordered lists: `1. item`

### Links & Media

- Links: `[text](url)`
- Images: `![alt](url)`
- Auto-linked URLs

### Custom Syntax

- User mentions: `@username`
- Channel mentions: `#channel`
- Emoji shortcodes: `:emoji:`

## Usage

### Parsing

```typescript
import { jsonToMarkdown, markdownToJson, jsonToHtml } from "@/lib/markdown";

// TipTap JSON to Markdown
const markdown = jsonToMarkdown(editorJson);

// Markdown to TipTap JSON
const json = markdownToJson("**Hello** _world_!");

// TipTap JSON to HTML
const html = jsonToHtml(editorJson, { sanitize: true });

// Get plain text (strip all formatting)
const text = jsonToPlainText(editorJson);

// Get excerpt (first N characters)
const excerpt = getExcerpt(editorJson, 100);

// Word count
const words = countWords(editorJson);

// Check if empty
if (isEmpty(editorJson)) {
  console.log("No content");
}
```

### Rendering

```typescript
import { MarkdownRenderer, MarkdownPreview } from '@/lib/markdown'

// Basic rendering
<MarkdownRenderer
  content={editorJson}
  onMentionClick={(userId, username) => {
    console.log('Clicked mention:', username)
  }}
  onChannelClick={(channelId, channelName) => {
    console.log('Clicked channel:', channelName)
  }}
  onLinkClick={(url) => {
    console.log('Clicked link:', url)
  }}
/>

// Preview with raw mode toggle
<MarkdownPreview
  content={editorJson}
  showToggle={true}
  initialMode="preview"
/>

// Compact rendering (for message previews)
<CompactMarkdownRenderer
  content={editorJson}
  maxLength={100}
/>
```

### Editor Integration

```typescript
import { RichTextEditor } from '@/components/editor'
import { jsonToMarkdown, markdownToJson } from '@/lib/markdown'

function MessageEditor() {
  const [content, setContent] = useState('')

  const handleSubmit = (html: string, json: JSONContent) => {
    // Convert to markdown for storage
    const markdown = jsonToMarkdown(json)

    // Save to database
    await saveMessage({ content: markdown })
  }

  return (
    <RichTextEditor
      onSubmit={handleSubmit}
      onChange={(html, json) => setContent(json)}
    />
  )
}
```

### Message Display

```typescript
import { MarkdownRenderer } from '@/lib/markdown'
import { markdownToJson } from '@/lib/markdown'

function Message({ message }) {
  const jsonContent = markdownToJson(message.content)

  return (
    <MarkdownRenderer
      content={jsonContent}
      onMentionClick={(userId) => {
        // Navigate to user profile
        router.push(`/users/${userId}`)
      }}
      onChannelClick={(channelId) => {
        // Navigate to channel
        router.push(`/channels/${channelId}`)
      }}
    />
  )
}
```

## API Reference

### Parser Functions

#### `jsonToMarkdown(json: JSONContent): string`

Convert TipTap JSON to Markdown string.

#### `markdownToJson(markdown: string): JSONContent`

Convert Markdown string to TipTap JSON.

#### `jsonToHtml(json: JSONContent, options?: ParseOptions): string`

Convert TipTap JSON to sanitized HTML.

#### `markdownToHtml(markdown: string): string`

Convert Markdown string to HTML.

#### `jsonToPlainText(json: JSONContent): string`

Extract plain text (no formatting).

#### `getExcerpt(json: JSONContent, length?: number): string`

Get first N characters with ellipsis.

#### `countWords(json: JSONContent): number`

Count words in content.

#### `isEmpty(json: JSONContent): boolean`

Check if content is empty.

### Renderer Components

#### `<MarkdownRenderer>`

Full-featured markdown renderer.

**Props:**

- `content`: JSONContent | string - Content to render
- `className?`: string - Additional CSS class
- `sanitize?`: boolean - Sanitize HTML (default: true)
- `onMentionClick?`: (userId, username) => void
- `onChannelClick?`: (channelId, channelName) => void
- `onLinkClick?`: (url) => void
- `syntaxHighlighting?`: boolean - Enable code highlighting (default: true)
- `compact?`: boolean - Compact mode (default: false)

#### `<MarkdownPreview>`

Renderer with preview/raw toggle.

**Props:**

- All `MarkdownRenderer` props
- `showToggle?`: boolean - Show toggle button (default: true)
- `initialMode?`: 'preview' | 'raw' - Initial mode (default: 'preview')

#### `<CompactMarkdownRenderer>`

Truncated preview for message lists.

**Props:**

- `content`: JSONContent | string - Content to render
- `maxLength?`: number - Max characters (default: 100)
- `className?`: string - Additional CSS class

## Architecture

### Parser (`parser.ts`)

- Bidirectional conversion: Markdown ↔ TipTap JSON
- HTML generation with sanitization
- Text extraction utilities
- Supports all TipTap node types

### Renderer (`renderer.tsx`)

- React components for rendering
- Syntax highlighting via lowlight
- Interactive mentions and links
- Multiple rendering modes

### Integration Points

1. **Editor**: TipTap stores content as JSON
2. **Storage**: Convert to markdown for database
3. **Display**: Render markdown as formatted React components
4. **API**: Parse markdown from external sources

## Styling

The renderer uses Tailwind's `prose` class for typography. Customize via:

```css
/* globals.css */
.markdown-renderer {
  /* Custom styles */
}

.mention-user {
  /* User mention styles */
}

.mention-channel {
  /* Channel mention styles */
}
```

## Performance

- **Memoization**: All conversions are memoized
- **Lazy Highlighting**: Code blocks only highlighted when visible
- **Sanitization**: DOMPurify runs once per render
- **Compact Mode**: Minimal processing for previews

## Security

- **HTML Sanitization**: All output sanitized via DOMPurify
- **XSS Prevention**: URLs and attributes escaped
- **Safe Defaults**: Sanitization enabled by default
- **Content Policy**: Strict allowlist for tags and attributes

## Testing

```typescript
import { jsonToMarkdown, markdownToJson, isEmpty } from "@/lib/markdown";

describe("Markdown Parser", () => {
  it("converts bold text", () => {
    const json = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "bold", marks: [{ type: "bold" }] }],
        },
      ],
    };
    expect(jsonToMarkdown(json)).toBe("**bold**");
  });

  it("round-trips content", () => {
    const original = "**Hello** _world_!";
    const json = markdownToJson(original);
    const result = jsonToMarkdown(json);
    expect(result).toMatch(/Hello.*world/);
  });
});
```

## Future Enhancements

- [ ] Tables support
- [ ] Task lists (`- [ ]` checkboxes)
- [ ] Footnotes
- [ ] Math equations (KaTeX)
- [ ] Diagrams (Mermaid)
- [ ] Custom containers
- [ ] Advanced link previews
- [ ] Lazy image loading
