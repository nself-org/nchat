"use client";

import { useState } from "react";
import {
  MessageSquare,
  Send,
  Hash,
  ThumbsUp,
  Reply,
  MoreHorizontal,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  ComponentPreview,
  PreviewCard,
  PreviewGrid,
} from "@/components/dev/component-preview";
import { CodeBlock } from "@/components/dev/code-block";
import { PropsTable, PropDefinition } from "@/components/dev/props-table";

// ============================================================================
// Mock Data for Demos
// ============================================================================

const mockUser = {
  id: "user-1",
  displayName: "Alice Johnson",
  username: "alice",
  avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alice",
};

const mockMessages = [
  {
    id: "msg-1",
    content: "Hey team! Just finished the new feature implementation.",
    user: mockUser,
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    reactions: [
      { emoji: "thumbs_up", count: 3, users: ["user-2", "user-3", "user-4"] },
    ],
  },
  {
    id: "msg-2",
    content: "That looks great! Can you share the PR link?",
    user: {
      id: "user-2",
      displayName: "Bob Smith",
      username: "bob",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob",
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
    replyTo: {
      id: "msg-1",
      content: "Hey team! Just finished...",
      user: mockUser,
    },
  },
  {
    id: "msg-3",
    content: "Sure! Here it is: https://github.com/nself/chat/pull/123",
    user: mockUser,
    createdAt: new Date(Date.now() - 1000 * 60 * 1).toISOString(),
  },
];

// ============================================================================
// Props Definitions
// ============================================================================

const messageListProps: PropDefinition[] = [
  {
    name: "channelId",
    type: "string",
    required: true,
    description: "The ID of the channel to display messages for",
  },
  {
    name: "messages",
    type: "Message[]",
    required: true,
    description: "Array of messages to display",
  },
  {
    name: "channelName",
    type: "string",
    default: '"general"',
    description: "Name of the channel for empty state",
  },
  {
    name: "channelType",
    type: '"public" | "private" | "dm" | "group-dm"',
    default: '"public"',
    description: "Type of channel",
  },
  {
    name: "isLoading",
    type: "boolean",
    default: "false",
    description: "Show loading skeleton",
  },
  {
    name: "hasMore",
    type: "boolean",
    default: "true",
    description: "Whether there are more messages to load",
  },
  {
    name: "typingUsers",
    type: "TypingUser[]",
    description: "Users currently typing",
  },
  {
    name: "lastReadAt",
    type: "Date",
    description: "Last read timestamp for unread indicator",
  },
  {
    name: "highlightedMessageId",
    type: "string",
    description: "ID of message to highlight",
  },
  {
    name: "onLoadMore",
    type: "() => void | Promise<void>",
    description: "Callback when scrolled near top",
  },
  {
    name: "onReply",
    type: "(message: Message) => void",
    description: "Callback when reply is triggered",
  },
  {
    name: "onThread",
    type: "(message: Message) => void",
    description: "Callback when thread is opened",
  },
  {
    name: "onEdit",
    type: "(message: Message) => void",
    description: "Callback when edit is triggered",
  },
  {
    name: "onDelete",
    type: "(messageId: string) => void",
    description: "Callback when delete is triggered",
  },
  {
    name: "onReact",
    type: "(messageId: string, emoji: string) => void",
    description: "Callback for adding reaction",
  },
];

const messageItemProps: PropDefinition[] = [
  {
    name: "message",
    type: "Message",
    required: true,
    description: "The message object to render",
  },
  {
    name: "isGrouped",
    type: "boolean",
    default: "false",
    description: "Whether message is part of a group (hides avatar)",
  },
  {
    name: "showAvatar",
    type: "boolean",
    default: "true",
    description: "Whether to show user avatar",
  },
  {
    name: "isCompact",
    type: "boolean",
    default: "false",
    description: "Compact display mode for threads",
  },
  {
    name: "isHighlighted",
    type: "boolean",
    default: "false",
    description: "Highlight the message",
  },
  {
    name: "onReply",
    type: "(message: Message) => void",
    description: "Reply callback",
  },
  {
    name: "onThread",
    type: "(message: Message) => void",
    description: "Open thread callback",
  },
  {
    name: "onEdit",
    type: "(message: Message) => void",
    description: "Edit callback",
  },
  {
    name: "onDelete",
    type: "(messageId: string) => void",
    description: "Delete callback",
  },
  {
    name: "onReact",
    type: "(messageId: string, emoji: string) => void",
    description: "Add reaction callback",
  },
  {
    name: "onPin",
    type: "(messageId: string) => void",
    description: "Pin message callback",
  },
];

const messageInputProps: PropDefinition[] = [
  {
    name: "channelId",
    type: "string",
    required: true,
    description: "Current channel ID",
  },
  {
    name: "placeholder",
    type: "string",
    default: '"Message"',
    description: "Placeholder text",
  },
  {
    name: "disabled",
    type: "boolean",
    default: "false",
    description: "Disable input",
  },
  {
    name: "maxLength",
    type: "number",
    default: "4000",
    description: "Maximum message length",
  },
  {
    name: "onSend",
    type: "(content: string, attachments?: File[]) => void",
    required: true,
    description: "Send callback",
  },
  {
    name: "onTyping",
    type: "() => void",
    description: "Typing indicator callback",
  },
  {
    name: "onEdit",
    type: "(messageId: string, content: string) => void",
    description: "Edit message callback",
  },
  {
    name: "editingMessage",
    type: "Message | null",
    description: "Message being edited",
  },
  {
    name: "replyingTo",
    type: "Message | null",
    description: "Message being replied to",
  },
  {
    name: "mentionSuggestions",
    type: "MentionSuggestion[]",
    description: "User mention suggestions",
  },
];

// ============================================================================
// Code Examples
// ============================================================================

const messageListCode = `import { MessageList } from '@/components/chat/message-list'

function ChatView() {
  const [messages, setMessages] = useState<Message[]>([])
  const messageListRef = useRef<MessageListRef>(null)

  const handleLoadMore = async () => {
    const olderMessages = await fetchOlderMessages()
    setMessages(prev => [...olderMessages, ...prev])
  }

  const handleReply = (message: Message) => {
    setReplyingTo(message)
  }

  return (
    <MessageList
      ref={messageListRef}
      channelId="channel-123"
      messages={messages}
      channelName="general"
      hasMore={true}
      typingUsers={[{ id: 'user-1', displayName: 'Alice' }]}
      onLoadMore={handleLoadMore}
      onReply={handleReply}
      onThread={(msg) => openThread(msg)}
      onReact={(id, emoji) => addReaction(id, emoji)}
    />
  )
}`;

const messageItemCode = `import { MessageItem } from '@/components/chat/message-item'

<MessageItem
  message={{
    id: 'msg-1',
    content: 'Hello world!',
    user: {
      id: 'user-1',
      displayName: 'Alice',
      avatarUrl: '/avatars/alice.png'
    },
    createdAt: new Date().toISOString(),
    reactions: [
      { emoji: 'thumbs_up', count: 3, users: ['user-2', 'user-3'] }
    ]
  }}
  onReply={(msg) => setReplyingTo(msg)}
  onThread={(msg) => openThread(msg)}
  onReact={(id, emoji) => addReaction(id, emoji)}
/>`;

const messageInputCode = `import { MessageInput, MessageInputRef } from '@/components/chat/message-input'

function ChatComposer() {
  const inputRef = useRef<MessageInputRef>(null)
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)

  const handleSend = async (content: string, attachments?: File[]) => {
    await sendMessage({
      content,
      attachments,
      replyToId: replyingTo?.id
    })
    setReplyingTo(null)
  }

  return (
    <MessageInput
      ref={inputRef}
      channelId="channel-123"
      placeholder="Message #general"
      replyingTo={replyingTo}
      onSend={handleSend}
      onTyping={() => emitTyping()}
      onCancelReply={() => setReplyingTo(null)}
      mentionSuggestions={channelMembers}
    />
  )
}`;

// ============================================================================
// Page Component
// ============================================================================

export default function MessagesPage() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="mb-2 flex items-center gap-3">
          <div className="rounded-lg bg-green-500/10 p-2">
            <MessageSquare className="h-5 w-5 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Message Components
          </h1>
        </div>
        <p className="text-muted-foreground">
          Components for displaying and composing messages in chat channels.
          Includes virtualized lists, rich text editing, reactions, and threads.
        </p>
      </div>

      {/* Component List */}
      <div className="flex flex-wrap gap-2">
        {[
          "MessageList",
          "MessageItem",
          "MessageInput",
          "MessageSkeleton",
          "MessageReactions",
          "TypingIndicator",
          "MessageSystem",
        ].map((name) => (
          <Badge key={name} variant="secondary" className="text-sm">
            {name}
          </Badge>
        ))}
      </div>

      <Separator />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="messagelist">MessageList</TabsTrigger>
          <TabsTrigger value="messageitem">MessageItem</TabsTrigger>
          <TabsTrigger value="messageinput">MessageInput</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Message System Overview</CardTitle>
              <CardDescription>
                The message system consists of three main components that work
                together to provide a complete chat experience.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <PreviewCard title="MessageList">
                  <div className="space-y-2 text-sm">
                    <p className="text-muted-foreground">
                      Virtualized container for messages with infinite scroll,
                      grouping, and unread indicators.
                    </p>
                    <ul className="list-inside list-disc text-muted-foreground">
                      <li>TanStack Virtual for performance</li>
                      <li>Auto-scroll to new messages</li>
                      <li>Date separators</li>
                      <li>Typing indicators</li>
                    </ul>
                  </div>
                </PreviewCard>

                <PreviewCard title="MessageItem">
                  <div className="space-y-2 text-sm">
                    <p className="text-muted-foreground">
                      Individual message with hover actions, reactions, and
                      context menu.
                    </p>
                    <ul className="list-inside list-disc text-muted-foreground">
                      <li>Grouped messages</li>
                      <li>Reply threads</li>
                      <li>Emoji reactions</li>
                      <li>Rich content</li>
                    </ul>
                  </div>
                </PreviewCard>

                <PreviewCard title="MessageInput">
                  <div className="space-y-2 text-sm">
                    <p className="text-muted-foreground">
                      Rich text editor with TipTap for composing messages.
                    </p>
                    <ul className="list-inside list-disc text-muted-foreground">
                      <li>@mentions and #channels</li>
                      <li>File attachments</li>
                      <li>Emoji picker</li>
                      <li>Draft saving</li>
                    </ul>
                  </div>
                </PreviewCard>
              </div>
            </CardContent>
          </Card>

          {/* Demo Preview */}
          <ComponentPreview
            title="Message List Demo"
            description="Example of a message list with multiple messages and interactions"
            code={`<div className="space-y-1">
  {messages.map((msg, i) => (
    <div key={msg.id} className="flex gap-3 px-4 py-1 hover:bg-muted/50">
      <Avatar>
        <AvatarImage src={msg.user.avatarUrl} />
      </Avatar>
      <div>
        <div className="flex gap-2 items-baseline">
          <span className="font-semibold">{msg.user.displayName}</span>
          <span className="text-xs text-muted-foreground">12:34 PM</span>
        </div>
        <p>{msg.content}</p>
      </div>
    </div>
  ))}
</div>`}
          >
            <div className="rounded-lg border bg-background">
              <div className="flex items-center gap-2 border-b px-4 py-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">general</span>
              </div>
              <div className="h-64 overflow-y-auto p-2">
                {mockMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="hover:bg-muted/50 group flex gap-3 rounded px-2 py-2"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-sm font-medium text-white">
                      {msg.user.displayName.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold">
                          {msg.user.displayName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      {msg.replyTo && (
                        <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <Reply className="h-3 w-3" />
                          Replying to {msg.replyTo.user.displayName}
                        </div>
                      )}
                      <p className="text-sm">{msg.content}</p>
                      {msg.reactions && (
                        <div className="mt-1 flex gap-1">
                          {msg.reactions.map((r) => (
                            <span
                              key={r.emoji}
                              className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
                            >
                              <ThumbsUp className="h-3 w-3" /> {r.count}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Reply className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <ThumbsUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t p-3">
                <div className="bg-muted/30 flex items-center gap-2 rounded-lg border px-3 py-2">
                  <span className="text-sm text-muted-foreground">
                    Message #general
                  </span>
                  <div className="flex-1" />
                  <Button size="icon" className="h-7 w-7">
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </ComponentPreview>
        </TabsContent>

        {/* MessageList Tab */}
        <TabsContent value="messagelist" className="mt-6 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>MessageList</CardTitle>
              <CardDescription>
                A virtualized, infinite-scrolling list of messages with
                grouping, date separators, and typing indicators.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock
                code={messageListCode}
                language="tsx"
                filename="chat-view.tsx"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Props</CardTitle>
            </CardHeader>
            <CardContent>
              <PropsTable props={messageListProps} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Features</CardTitle>
            </CardHeader>
            <CardContent>
              <PreviewGrid cols={2}>
                <PreviewCard title="Virtualization">
                  <p className="text-sm text-muted-foreground">
                    Uses TanStack Virtual to efficiently render large message
                    lists. Only visible messages are rendered in the DOM,
                    enabling smooth scrolling with thousands of messages.
                  </p>
                </PreviewCard>
                <PreviewCard title="Message Grouping">
                  <p className="text-sm text-muted-foreground">
                    Consecutive messages from the same user within 5 minutes are
                    grouped together, hiding redundant avatars and timestamps.
                  </p>
                </PreviewCard>
                <PreviewCard title="Date Separators">
                  <p className="text-sm text-muted-foreground">
                    Automatic date separators are inserted between messages from
                    different days. Shows "Today", "Yesterday", or the full
                    date.
                  </p>
                </PreviewCard>
                <PreviewCard title="Unread Indicators">
                  <p className="text-sm text-muted-foreground">
                    When a lastReadAt timestamp is provided, an unread indicator
                    is shown with the count of new messages.
                  </p>
                </PreviewCard>
              </PreviewGrid>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MessageItem Tab */}
        <TabsContent value="messageitem" className="mt-6 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>MessageItem</CardTitle>
              <CardDescription>
                Renders a single message with all its features: author info,
                content, reactions, thread preview, and hover actions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock
                code={messageItemCode}
                language="tsx"
                filename="message-item-example.tsx"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Props</CardTitle>
            </CardHeader>
            <CardContent>
              <PropsTable props={messageItemProps} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Variants</CardTitle>
            </CardHeader>
            <CardContent>
              <PreviewGrid cols={2}>
                <PreviewCard title="Default">
                  <div className="flex gap-3 p-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-sm font-medium text-white">
                      A
                    </div>
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold">Alice</span>
                        <span className="text-xs text-muted-foreground">
                          12:34 PM
                        </span>
                      </div>
                      <p className="text-sm">Hello, world!</p>
                    </div>
                  </div>
                </PreviewCard>

                <PreviewCard title="Grouped">
                  <div className="flex gap-3 p-2 pl-14">
                    <div>
                      <p className="text-sm">This is a grouped message</p>
                    </div>
                  </div>
                </PreviewCard>

                <PreviewCard title="With Reactions">
                  <div className="flex gap-3 p-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-500 text-sm font-medium text-white">
                      B
                    </div>
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold">Bob</span>
                        <span className="text-xs text-muted-foreground">
                          12:35 PM
                        </span>
                      </div>
                      <p className="text-sm">Great work everyone!</p>
                      <div className="mt-2 flex gap-1">
                        <span className="bg-primary/10 border-primary/20 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs">
                          <ThumbsUp className="h-3 w-3" /> 5
                        </span>
                      </div>
                    </div>
                  </div>
                </PreviewCard>

                <PreviewCard title="Compact (Thread)">
                  <div className="flex gap-2 p-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-[10px] font-medium text-white">
                      C
                    </div>
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-semibold">Carol</span>
                        <span className="text-[10px] text-muted-foreground">
                          12:36 PM
                        </span>
                      </div>
                      <p className="text-xs">Compact message in thread</p>
                    </div>
                  </div>
                </PreviewCard>
              </PreviewGrid>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MessageInput Tab */}
        <TabsContent value="messageinput" className="mt-6 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>MessageInput</CardTitle>
              <CardDescription>
                A rich text message composer built on TipTap with support for
                formatting, @mentions, emoji, and file attachments.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock
                code={messageInputCode}
                language="tsx"
                filename="chat-composer.tsx"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Props</CardTitle>
            </CardHeader>
            <CardContent>
              <PropsTable props={messageInputProps} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Features</CardTitle>
            </CardHeader>
            <CardContent>
              <PreviewGrid cols={2}>
                <PreviewCard title="Rich Text Formatting">
                  <p className="mb-2 text-sm text-muted-foreground">
                    Supports bold, italic, underline, strikethrough, code, and
                    links.
                  </p>
                  <div className="flex gap-1">
                    <Badge variant="outline">Ctrl+B</Badge>
                    <Badge variant="outline">Ctrl+I</Badge>
                    <Badge variant="outline">Ctrl+U</Badge>
                    <Badge variant="outline">Ctrl+K</Badge>
                  </div>
                </PreviewCard>

                <PreviewCard title="@Mentions">
                  <p className="text-sm text-muted-foreground">
                    Type @ to mention users. Suggestions appear as you type with
                    fuzzy matching on display name and username.
                  </p>
                </PreviewCard>

                <PreviewCard title="File Attachments">
                  <p className="text-sm text-muted-foreground">
                    Drag and drop or click to attach files. Supports up to 10
                    files, max 25MB each. Shows thumbnails for images.
                  </p>
                </PreviewCard>

                <PreviewCard title="Draft Saving">
                  <p className="text-sm text-muted-foreground">
                    Drafts are automatically saved per channel and restored when
                    returning to the channel.
                  </p>
                </PreviewCard>
              </PreviewGrid>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ref Methods</CardTitle>
            </CardHeader>
            <CardContent>
              <CodeBlock
                code={`interface MessageInputRef {
  focus: () => void      // Focus the editor
  clear: () => void      // Clear content and attachments
  setContent: (content: string) => void  // Set editor content
  getContent: () => string  // Get current HTML content
}`}
                language="typescript"
                filename="message-input.types.ts"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
