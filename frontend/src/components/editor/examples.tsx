/**
 * Rich Text Editor Examples
 *
 * Complete examples demonstrating all features of the editor and markdown system.
 */

"use client";

import * as React from "react";
import { useState, useRef } from "react";
import type { JSONContent } from "@tiptap/core";
import { RichEditor, type RichEditorRef } from "./rich-editor";
import { MarkdownRenderer, MarkdownPreview } from "@/lib/markdown";
import { jsonToMarkdown, markdownToJson } from "@/lib/markdown";
import type { MentionUser, MentionChannel } from "./editor-extensions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// ============================================================================
// Sample Data
// ============================================================================

const sampleUsers: MentionUser[] = [
  {
    id: "1",
    username: "alice",
    displayName: "Alice Johnson",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alice",
    presence: "online",
  },
  {
    id: "2",
    username: "bob",
    displayName: "Bob Smith",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob",
    presence: "away",
  },
  {
    id: "3",
    username: "charlie",
    displayName: "Charlie Brown",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie",
    presence: "dnd",
  },
  {
    id: "4",
    username: "diana",
    displayName: "Diana Prince",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Diana",
    presence: "offline",
  },
];

const sampleChannels: MentionChannel[] = [
  { id: "1", name: "general", type: "public", icon: "💬" },
  { id: "2", name: "random", type: "public", icon: "🎲" },
  { id: "3", name: "dev-team", type: "private", icon: "👨‍💻" },
  { id: "4", name: "announcements", type: "public", icon: "📢" },
];

const sampleMarkdown = `# Rich Text Editor Demo

Welcome to the **nself-chat** rich text editor! This editor supports:

## Text Formatting
- **Bold text** with \`Cmd+B\`
- *Italic text* with \`Cmd+I\`
- <u>Underlined text</u> with \`Cmd+U\`
- ~~Strikethrough text~~
- Inline \`code\` blocks

## Code Blocks

\`\`\`typescript
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

// console.log(greet("World"));
\`\`\`

## Lists

### Bullet Lists
- First item
- Second item
  - Nested item
- Third item

### Numbered Lists
1. First step
2. Second step
3. Third step

## Blockquotes

> "The only way to do great work is to love what you do."
> — Steve Jobs

## Links

Check out [nself-chat](https://github.com/yourusername/nself-chat) on GitHub!

## Mentions

You can mention users like @alice or channels like #general in your messages.

## Emojis

Express yourself with emojis: :smile: :heart: :rocket:

---

Try typing \`@\` to mention a user, \`#\` for channels, or \`:\` for emojis!
`;

// ============================================================================
// Example 1: Basic Editor
// ============================================================================

export function BasicEditorExample() {
  const [messages, setMessages] = useState<
    Array<{ id: string; content: JSONContent }>
  >([]);
  const editorRef = useRef<RichEditorRef>(null);

  const handleSubmit = (html: string, json: JSONContent) => {
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), content: json },
    ]);
    editorRef.current?.clear();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Basic Editor</CardTitle>
        <CardDescription>
          Simple chat-style editor with message history
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Message history */}
        <div className="max-h-[400px] space-y-3 overflow-y-auto">
          {messages.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No messages yet. Type something below!
            </p>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="rounded-lg border p-3">
                <MarkdownRenderer
                  content={msg.content}
                  onMentionClick={(userId, username) =>
                    alert(`Clicked mention: @${username}`)
                  }
                  onChannelClick={(channelId, channelName) =>
                    alert(`Clicked channel: #${channelName}`)
                  }
                />
              </div>
            ))
          )}
        </div>

        {/* Editor */}
        <RichEditor
          ref={editorRef}
          placeholder="Type a message... (Cmd+B for bold, Cmd+I for italic)"
          onSubmit={handleSubmit}
          users={sampleUsers}
          channels={sampleChannels}
          showToolbar={true}
          showSendButton={true}
        />
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Example 2: Editor with Preview
// ============================================================================

export function EditorWithPreviewExample() {
  const [content, setContent] = useState<JSONContent>();
  const [markdown, setMarkdown] = useState("");

  const handleChange = (html: string, json: JSONContent) => {
    setContent(json);
    setMarkdown(jsonToMarkdown(json));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Editor with Live Preview</CardTitle>
        <CardDescription>
          See your formatted content in real-time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="editor">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="markdown">Markdown</TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="mt-4">
            <RichEditor
              placeholder="Type your message here..."
              onChange={handleChange}
              users={sampleUsers}
              channels={sampleChannels}
              showSendButton={false}
            />
          </TabsContent>

          <TabsContent value="preview" className="mt-4">
            {content ? (
              <div className="min-h-[200px] rounded-lg border p-4">
                <MarkdownRenderer content={content} />
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Start typing to see the preview
              </p>
            )}
          </TabsContent>

          <TabsContent value="markdown" className="mt-4">
            <pre className="overflow-x-auto rounded-lg border bg-muted p-4">
              <code>{markdown || "// Start typing to see markdown..."}</code>
            </pre>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Example 3: Markdown Renderer Demo
// ============================================================================

export function MarkdownRendererExample() {
  const [mode, setMode] = useState<"preview" | "raw">("preview");
  const jsonContent = markdownToJson(sampleMarkdown);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Markdown Renderer</CardTitle>
        <CardDescription>
          Render markdown with full formatting support
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            variant={mode === "preview" ? "default" : "outline"}
            onClick={() => setMode("preview")}
            size="sm"
          >
            Preview
          </Button>
          <Button
            variant={mode === "raw" ? "default" : "outline"}
            onClick={() => setMode("raw")}
            size="sm"
          >
            Raw Markdown
          </Button>
        </div>

        {mode === "preview" ? (
          <div className="rounded-lg border p-4">
            <MarkdownRenderer
              content={jsonContent}
              onMentionClick={(userId, username) =>
                alert(`Navigate to user: ${username}`)
              }
              onChannelClick={(channelId, channelName) =>
                alert(`Navigate to channel: ${channelName}`)
              }
            />
          </div>
        ) : (
          <pre className="overflow-x-auto rounded-lg border bg-muted p-4 text-sm">
            {sampleMarkdown}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Example 4: All Features Demo
// ============================================================================

export function AllFeaturesExample() {
  const editorRef = useRef<RichEditorRef>(null);
  const [output, setOutput] = useState<{
    html: string;
    json: JSONContent;
    markdown: string;
    plainText: string;
    wordCount: number;
  } | null>(null);

  const handleSubmit = (html: string, json: JSONContent) => {
    const markdown = jsonToMarkdown(json);
    const plainText = editorRef.current?.getText() || "";
    const wordCount = plainText.split(/\s+/).filter(Boolean).length;

    setOutput({
      html,
      json,
      markdown,
      plainText,
      wordCount,
    });
  };

  const loadSample = () => {
    const json = markdownToJson(sampleMarkdown);
    editorRef.current?.setJSONContent(json);
  };

  const clearEditor = () => {
    editorRef.current?.clear();
    setOutput(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Features Demo</CardTitle>
        <CardDescription>
          Complete demonstration of all editor and markdown features
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Action buttons */}
        <div className="flex gap-2">
          <Button onClick={loadSample} size="sm">
            Load Sample Content
          </Button>
          <Button onClick={clearEditor} variant="outline" size="sm">
            Clear
          </Button>
          <Button
            onClick={() => editorRef.current?.focus()}
            variant="outline"
            size="sm"
          >
            Focus Editor
          </Button>
        </div>

        {/* Editor */}
        <div>
          <h3 className="mb-2 text-sm font-medium">Rich Text Editor</h3>
          <RichEditor
            ref={editorRef}
            placeholder="Try all features: @mentions, #channels, :emoji:, **bold**, code blocks..."
            onSubmit={handleSubmit}
            users={sampleUsers}
            channels={sampleChannels}
            maxLength={5000}
            showToolbar={true}
            showSendButton={true}
            showCharacterCount={true}
          />
        </div>

        {/* Output */}
        {output && (
          <div className="space-y-4">
            <Tabs defaultValue="rendered">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="rendered">Rendered</TabsTrigger>
                <TabsTrigger value="html">HTML</TabsTrigger>
                <TabsTrigger value="markdown">Markdown</TabsTrigger>
                <TabsTrigger value="json">JSON</TabsTrigger>
                <TabsTrigger value="stats">Stats</TabsTrigger>
              </TabsList>

              <TabsContent value="rendered">
                <div className="rounded-lg border p-4">
                  <MarkdownRenderer content={output.json} />
                </div>
              </TabsContent>

              <TabsContent value="html">
                <pre className="overflow-x-auto rounded-lg border bg-muted p-4 text-xs">
                  <code>{output.html}</code>
                </pre>
              </TabsContent>

              <TabsContent value="markdown">
                <pre className="overflow-x-auto rounded-lg border bg-muted p-4 text-sm">
                  <code>{output.markdown}</code>
                </pre>
              </TabsContent>

              <TabsContent value="json">
                <pre className="overflow-x-auto rounded-lg border bg-muted p-4 text-xs">
                  <code>{JSON.stringify(output.json, null, 2)}</code>
                </pre>
              </TabsContent>

              <TabsContent value="stats">
                <div className="space-y-2 rounded-lg border p-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Plain Text:
                    </span>
                    <span className="font-mono text-sm">
                      {output.plainText.length} chars
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Word Count:
                    </span>
                    <span className="font-mono text-sm">
                      {output.wordCount} words
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Markdown Size:
                    </span>
                    <span className="font-mono text-sm">
                      {output.markdown.length} chars
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      HTML Size:
                    </span>
                    <span className="font-mono text-sm">
                      {output.html.length} chars
                    </span>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Example 5: Keyboard Shortcuts
// ============================================================================

export function KeyboardShortcutsExample() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Keyboard Shortcuts</CardTitle>
        <CardDescription>
          All available keyboard shortcuts for the editor
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Text Formatting */}
          <div>
            <h3 className="mb-3 font-semibold">Text Formatting</h3>
            <div className="grid gap-2">
              <ShortcutRow shortcut="Cmd+B" action="Bold" />
              <ShortcutRow shortcut="Cmd+I" action="Italic" />
              <ShortcutRow shortcut="Cmd+U" action="Underline" />
              <ShortcutRow shortcut="Cmd+Shift+S" action="Strikethrough" />
              <ShortcutRow shortcut="Cmd+E" action="Inline Code" />
              <ShortcutRow shortcut="Cmd+Shift+E" action="Code Block" />
            </div>
          </div>

          {/* Links & Lists */}
          <div>
            <h3 className="mb-3 font-semibold">Links & Lists</h3>
            <div className="grid gap-2">
              <ShortcutRow shortcut="Cmd+K" action="Insert Link" />
              <ShortcutRow shortcut="Cmd+Shift+8" action="Bullet List" />
              <ShortcutRow shortcut="Cmd+Shift+7" action="Ordered List" />
            </div>
          </div>

          {/* Editor Actions */}
          <div>
            <h3 className="mb-3 font-semibold">Editor Actions</h3>
            <div className="grid gap-2">
              <ShortcutRow shortcut="Enter" action="Submit message" />
              <ShortcutRow shortcut="Shift+Enter" action="New line" />
              <ShortcutRow shortcut="Cmd+Z" action="Undo" />
              <ShortcutRow shortcut="Cmd+Shift+Z" action="Redo" />
            </div>
          </div>

          {/* Autocomplete */}
          <div>
            <h3 className="mb-3 font-semibold">Autocomplete</h3>
            <div className="grid gap-2">
              <ShortcutRow shortcut="@" action="Mention user" />
              <ShortcutRow shortcut="#" action="Mention channel" />
              <ShortcutRow shortcut=":" action="Insert emoji" />
              <ShortcutRow shortcut="↑/↓" action="Navigate suggestions" />
              <ShortcutRow shortcut="Enter" action="Select suggestion" />
              <ShortcutRow shortcut="Esc" action="Close suggestions" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ShortcutRow({
  shortcut,
  action,
}: {
  shortcut: string;
  action: string;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-muted-foreground">{action}</span>
      <kbd className="rounded border bg-muted px-2 py-1 font-mono text-xs">
        {shortcut}
      </kbd>
    </div>
  );
}

// ============================================================================
// All Examples Page
// ============================================================================

export default function EditorExamplesPage() {
  return (
    <div className="container mx-auto space-y-8 py-8">
      <div>
        <h1 className="mb-2 text-3xl font-bold">Rich Text Editor Examples</h1>
        <p className="text-muted-foreground">
          Complete examples demonstrating all features of the TipTap editor and
          markdown system.
        </p>
      </div>

      <BasicEditorExample />
      <EditorWithPreviewExample />
      <MarkdownRendererExample />
      <AllFeaturesExample />
      <KeyboardShortcutsExample />
    </div>
  );
}
