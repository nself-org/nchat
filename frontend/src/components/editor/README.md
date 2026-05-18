# Rich Text Editor Components

TipTap-based rich text editor for nself-chat with full feature support.

## Features

- **Text Formatting**: Bold, italic, underline, strikethrough
- **Code**: Inline code and code blocks with syntax highlighting (30+ languages)
- **Links**: Auto-detect URLs, link dialog for manual insertion
- **Lists**: Bullet and numbered lists with nesting
- **Blockquotes**: Quote formatting
- **@Mentions**: User mentions with autocomplete
- **#Channels**: Channel mentions with autocomplete
- **:Emoji**: Emoji shortcodes with autocomplete
- **Markdown Shortcuts**: Type markdown and see it convert
- **Max Length**: Character limit enforcement
- **Submit on Enter**: Send messages with Enter, new line with Shift+Enter

## Quick Start

```tsx
import { RichEditor, type RichEditorRef } from "@/components/editor";
import { useRef } from "react";

function ChatInput() {
  const editorRef = useRef<RichEditorRef>(null);

  const handleSubmit = (html: string, json: JSONContent) => {
    console.log("Message:", html);
    editorRef.current?.clear();
  };

  return (
    <RichEditor
      ref={editorRef}
      placeholder="Type a message..."
      onSubmit={handleSubmit}
      users={[
        {
          id: "1",
          username: "alice",
          displayName: "Alice",
          presence: "online",
        },
        { id: "2", username: "bob", displayName: "Bob", presence: "away" },
      ]}
      channels={[
        { id: "1", name: "general", type: "public" },
        { id: "2", name: "random", type: "public" },
      ]}
    />
  );
}
```

## Components

### RichEditor

Main editor component with toolbar, suggestions, and send button.

```tsx
<RichEditor
  value={content} // Initial content (HTML or JSON)
  onChange={(html, json) => {}} // Content change callback
  onSubmit={(html, json) => {}} // Submit callback (Enter key)
  placeholder="Type a message..." // Placeholder text
  maxLength={4000} // Character limit
  autoFocus={false} // Auto-focus on mount
  disabled={false} // Disabled state
  users={[]} // Users for @mentions
  channels={[]} // Channels for #mentions
  emojis={[]} // Custom emojis (defaults provided)
  showToolbar={true} // Show formatting toolbar
  showSendButton={true} // Show send button
  showCharacterCount={true} // Show character count
  sendButtonText="Send" // Custom send button text
  minHeight={80} // Minimum editor height
  maxHeight={300} // Maximum editor height
/>
```

### SimpleEditor

Minimal editor without toolbar or send button.

```tsx
<SimpleEditor
  value={content}
  onChange={(html) => {}}
  placeholder="Write something..."
/>
```

### EditorToolbar

Standalone toolbar component.

```tsx
<EditorToolbar
  editor={editor}
  showLink={true}
  showCodeBlock={true}
  showLists={true}
  showQuote={true}
  size="sm"
/>
```

### MentionList / ChannelMentionList / EmojiSuggestionList

Autocomplete dropdown components for suggestions.

### CodeBlock

Syntax-highlighted code block with language selector and copy button.

```tsx
<CodeBlock code={codeString} language="typescript" showLineNumbers={true} />
```

### LinkDialog

Dialog for inserting and editing links.

```tsx
<LinkDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  onSubmit={(data) => console.log(data.url, data.text)}
/>
```

## Hooks

### useRichEditor

Full-featured hook for managing editor state.

```tsx
const {
  editor,
  content,
  jsonContent,
  textContent,
  characterCount,
  isMaxLengthExceeded,
  isEmpty,
  isFocused,
  setContent,
  clear,
  focus,
  blur,
  insertText,
  mentionState,
  channelState,
  emojiState,
} = useRichEditor({
  placeholder: "Type here...",
  maxLength: 4000,
  users: [],
  channels: [],
  onSubmit: (html, json) => {},
});
```

### useCharacterCount

Simple hook for character counting.

```tsx
const count = useCharacterCount(editor);
```

### useEditorFocus

Track editor focus state.

```tsx
const isFocused = useEditorFocus(editor);
```

## Extensions

The editor uses these TipTap extensions:

- **StarterKit** - Basic formatting (bold, italic, lists, etc.)
- **Underline** - Underline support
- **Link** - Link support with auto-detection
- **Mention** - @user, #channel, and :emoji: mentions
- **Placeholder** - Placeholder text
- **CodeBlockLowlight** - Syntax-highlighted code blocks
- **MaxLength** - Character limit enforcement

## Keyboard Shortcuts

| Action              | Shortcut             |
| ------------------- | -------------------- |
| Bold                | Ctrl/Cmd + B         |
| Italic              | Ctrl/Cmd + I         |
| Underline           | Ctrl/Cmd + U         |
| Strikethrough       | Ctrl/Cmd + Shift + S |
| Inline Code         | Ctrl/Cmd + E         |
| Link                | Ctrl/Cmd + K         |
| Submit              | Enter                |
| New Line            | Shift + Enter        |
| Cancel Suggestion   | Escape               |
| Navigate Suggestion | Arrow Up/Down        |
| Select Suggestion   | Enter                |

## Styling

Import the CSS file for proper styling:

```tsx
import "@/components/editor/editor.css";
```

The CSS includes:

- Editor content styling
- Placeholder styling
- Mention styling (@user, #channel)
- Code block syntax highlighting
- List and blockquote styling
- Dark mode support
- Print styles

## Type Definitions

```typescript
interface MentionUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  presence?: "online" | "away" | "dnd" | "offline";
}

interface MentionChannel {
  id: string;
  name: string;
  type: "public" | "private" | "direct" | "group";
  icon?: string | null;
}

interface EmojiSuggestion {
  shortcode: string;
  emoji: string;
  name: string;
}
```

## Converting Store Types

Use helper functions to convert from store types:

```typescript
import {
  userProfileToMentionUser,
  channelToMentionChannel,
} from "@/components/editor";

const mentionUsers = users.map(userProfileToMentionUser);
const mentionChannels = channels.map(channelToMentionChannel);
```
