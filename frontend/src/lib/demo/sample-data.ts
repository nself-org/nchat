// ===============================================================================
// Demo Sample Data
// ===============================================================================
//
// Provides realistic sample data for the demo system including users, channels,
// messages, files, and reactions. This data is used to populate the demo when
// users try different templates.
//
// ===============================================================================

import type { TemplateId } from "@/templates/types";

// -------------------------------------------------------------------------------
// User Types & Data
// -------------------------------------------------------------------------------

export interface DemoUser {
  id: string;
  name: string;
  displayName: string;
  email: string;
  avatar: string;
  status: "online" | "away" | "dnd" | "offline";
  role: "owner" | "admin" | "member" | "guest";
  bio?: string;
  timezone?: string;
  lastSeen?: Date;
}

export const demoUsers: DemoUser[] = [
  {
    id: "user-1",
    name: "sarah_chen",
    displayName: "Sarah Chen",
    email: "sarah@example.com",
    avatar:
      "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah&backgroundColor=b6e3f4",
    status: "online",
    role: "owner",
    bio: "Product Lead | Building the future of team communication",
    timezone: "America/Los_Angeles",
  },
  {
    id: "user-2",
    name: "alex_rivera",
    displayName: "Alex Rivera",
    email: "alex@example.com",
    avatar:
      "https://api.dicebear.com/7.x/avataaars/svg?seed=alex&backgroundColor=c0aede",
    status: "online",
    role: "admin",
    bio: "Engineering Manager | Coffee enthusiast",
    timezone: "America/New_York",
  },
  {
    id: "user-3",
    name: "jordan_kim",
    displayName: "Jordan Kim",
    email: "jordan@example.com",
    avatar:
      "https://api.dicebear.com/7.x/avataaars/svg?seed=jordan&backgroundColor=d1d4f9",
    status: "away",
    role: "member",
    bio: "Senior Developer | TypeScript advocate",
    timezone: "America/Chicago",
  },
  {
    id: "user-4",
    name: "maya_patel",
    displayName: "Maya Patel",
    email: "maya@example.com",
    avatar:
      "https://api.dicebear.com/7.x/avataaars/svg?seed=maya&backgroundColor=ffd5dc",
    status: "dnd",
    role: "member",
    bio: "UX Designer | Creating delightful experiences",
    timezone: "Europe/London",
  },
  {
    id: "user-5",
    name: "chris_taylor",
    displayName: "Chris Taylor",
    email: "chris@example.com",
    avatar:
      "https://api.dicebear.com/7.x/avataaars/svg?seed=chris&backgroundColor=ffdfbf",
    status: "offline",
    role: "member",
    bio: "DevOps Engineer | Automation enthusiast",
    timezone: "Asia/Tokyo",
  },
  {
    id: "user-6",
    name: "emma_wilson",
    displayName: "Emma Wilson",
    email: "emma@example.com",
    avatar:
      "https://api.dicebear.com/7.x/avataaars/svg?seed=emma&backgroundColor=c1f0db",
    status: "online",
    role: "member",
    bio: "Frontend Developer | React & Next.js",
    timezone: "America/Denver",
  },
  {
    id: "user-7",
    name: "demo_user",
    displayName: "Demo User",
    email: "demo@example.com",
    avatar:
      "https://api.dicebear.com/7.x/avataaars/svg?seed=demo&backgroundColor=e8f5e9",
    status: "online",
    role: "member",
    bio: "Exploring the platform",
    timezone: "UTC",
  },
];

// -------------------------------------------------------------------------------
// Channel Types & Data
// -------------------------------------------------------------------------------

export interface DemoChannel {
  id: string;
  name: string;
  slug: string;
  type: "public" | "private" | "direct" | "group";
  description?: string;
  icon?: string;
  memberIds: string[];
  unreadCount: number;
  mentionCount: number;
  isPinned?: boolean;
  isMuted?: boolean;
  lastMessageAt: Date;
  createdAt: Date;
}

export const demoChannels: DemoChannel[] = [
  {
    id: "channel-1",
    name: "general",
    slug: "general",
    type: "public",
    description: "General discussion and announcements for the team",
    icon: "#",
    memberIds: [
      "user-1",
      "user-2",
      "user-3",
      "user-4",
      "user-5",
      "user-6",
      "user-7",
    ],
    unreadCount: 3,
    mentionCount: 1,
    isPinned: true,
    lastMessageAt: new Date(),
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  },
  {
    id: "channel-2",
    name: "engineering",
    slug: "engineering",
    type: "public",
    description:
      "Engineering discussions, code reviews, and technical decisions",
    icon: "#",
    memberIds: ["user-2", "user-3", "user-5", "user-6", "user-7"],
    unreadCount: 5,
    mentionCount: 0,
    lastMessageAt: new Date(Date.now() - 30 * 60 * 1000),
    createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
  },
  {
    id: "channel-3",
    name: "design",
    slug: "design",
    type: "public",
    description: "Design feedback, UI/UX discussions, and asset sharing",
    icon: "#",
    memberIds: ["user-1", "user-4", "user-6", "user-7"],
    unreadCount: 0,
    mentionCount: 0,
    lastMessageAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
  },
  {
    id: "channel-4",
    name: "random",
    slug: "random",
    type: "public",
    description: "Non-work chat, memes, and fun stuff",
    icon: "#",
    memberIds: [
      "user-1",
      "user-2",
      "user-3",
      "user-4",
      "user-5",
      "user-6",
      "user-7",
    ],
    unreadCount: 12,
    mentionCount: 0,
    isMuted: true,
    lastMessageAt: new Date(Date.now() - 15 * 60 * 1000),
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  },
  {
    id: "channel-5",
    name: "leadership",
    slug: "leadership",
    type: "private",
    description: "Leadership team discussions",
    icon: "#",
    memberIds: ["user-1", "user-2"],
    unreadCount: 1,
    mentionCount: 0,
    lastMessageAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
  },
  {
    id: "dm-1",
    name: "Alex Rivera",
    slug: "dm-alex",
    type: "direct",
    memberIds: ["user-2", "user-7"],
    unreadCount: 2,
    mentionCount: 0,
    lastMessageAt: new Date(Date.now() - 10 * 60 * 1000),
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
  },
  {
    id: "dm-2",
    name: "Maya Patel",
    slug: "dm-maya",
    type: "direct",
    memberIds: ["user-4", "user-7"],
    unreadCount: 0,
    mentionCount: 0,
    lastMessageAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
  },
];

// -------------------------------------------------------------------------------
// Reaction Types & Data
// -------------------------------------------------------------------------------

export interface DemoReaction {
  emoji: string;
  userIds: string[];
  count: number;
}

// -------------------------------------------------------------------------------
// File/Attachment Types & Data
// -------------------------------------------------------------------------------

export interface DemoFile {
  id: string;
  name: string;
  type: "image" | "document" | "video" | "audio" | "code" | "other";
  mimeType: string;
  url: string;
  thumbnailUrl?: string;
  size: number;
  uploadedBy: string;
  uploadedAt: Date;
}

export const demoFiles: DemoFile[] = [
  {
    id: "file-1",
    name: "Q4-roadmap.pdf",
    type: "document",
    mimeType: "application/pdf",
    url: "/demo/files/roadmap.pdf",
    size: 2456789,
    uploadedBy: "user-1",
    uploadedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    id: "file-2",
    name: "new-dashboard-design.png",
    type: "image",
    mimeType: "image/png",
    url: "https://placehold.co/800x600/4A154B/FFFFFF?text=Dashboard+Design",
    thumbnailUrl:
      "https://placehold.co/200x150/4A154B/FFFFFF?text=Dashboard+Design",
    size: 456789,
    uploadedBy: "user-4",
    uploadedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
  {
    id: "file-3",
    name: "api-documentation.md",
    type: "code",
    mimeType: "text/markdown",
    url: "/demo/files/api-docs.md",
    size: 15678,
    uploadedBy: "user-3",
    uploadedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
  },
];

// -------------------------------------------------------------------------------
// Message Types & Data
// -------------------------------------------------------------------------------

export interface DemoMessage {
  id: string;
  channelId: string;
  userId: string;
  content: string;
  createdAt: Date;
  editedAt?: Date;
  isEdited?: boolean;
  isPinned?: boolean;
  reactions?: DemoReaction[];
  attachments?: DemoFile[];
  threadId?: string;
  threadCount?: number;
  replyTo?: string;
}

// Generate messages with realistic timestamps
const now = Date.now();
const minute = 60 * 1000;
const hour = 60 * minute;

export const demoMessages: DemoMessage[] = [
  // General channel messages
  {
    id: "msg-1",
    channelId: "channel-1",
    userId: "user-1",
    content:
      "Good morning team! Quick reminder that we have our weekly standup in 30 minutes. Please come prepared with your updates.",
    createdAt: new Date(now - 2 * hour),
    reactions: [
      { emoji: "👍", userIds: ["user-2", "user-3", "user-6"], count: 3 },
      { emoji: "✅", userIds: ["user-4"], count: 1 },
    ],
    threadCount: 4,
  },
  {
    id: "msg-2",
    channelId: "channel-1",
    userId: "user-2",
    content:
      "Thanks for the heads up! I'll be presenting the new architecture proposal today. Looking forward to everyone's feedback.",
    createdAt: new Date(now - 1.9 * hour),
    reactions: [{ emoji: "🎉", userIds: ["user-1", "user-5"], count: 2 }],
  },
  {
    id: "msg-3",
    channelId: "channel-1",
    userId: "user-4",
    content:
      "I've uploaded the latest mockups for the dashboard redesign. Would love to get everyone's thoughts! @sarah_chen",
    createdAt: new Date(now - 1.5 * hour),
    attachments: [demoFiles[1]],
    reactions: [
      { emoji: "😍", userIds: ["user-1", "user-6"], count: 2 },
      { emoji: "🔥", userIds: ["user-2", "user-3"], count: 2 },
    ],
  },
  {
    id: "msg-4",
    channelId: "channel-1",
    userId: "user-1",
    content:
      "These look amazing Maya! I especially love the new navigation pattern. Let's discuss in more detail during our 1:1.",
    createdAt: new Date(now - 1.2 * hour),
    reactions: [{ emoji: "❤️", userIds: ["user-4"], count: 1 }],
  },
  {
    id: "msg-5",
    channelId: "channel-1",
    userId: "user-6",
    content:
      "Quick question - is anyone else having issues with the staging environment? Getting a 502 error.",
    createdAt: new Date(now - 45 * minute),
    threadCount: 6,
  },
  {
    id: "msg-6",
    channelId: "channel-1",
    userId: "user-5",
    content: "Yeah, I noticed that too. Let me check the deployment logs.",
    createdAt: new Date(now - 40 * minute),
    threadId: "msg-5",
  },
  {
    id: "msg-7",
    channelId: "channel-1",
    userId: "user-5",
    content:
      "Found it! There was a memory leak in the latest deployment. Rolling back now.",
    createdAt: new Date(now - 35 * minute),
    threadId: "msg-5",
    reactions: [{ emoji: "🙏", userIds: ["user-6"], count: 1 }],
  },

  // Engineering channel messages
  {
    id: "msg-8",
    channelId: "channel-2",
    userId: "user-3",
    content:
      "```typescript\nconst useWebSocket = (url: string) => {\n  const [isConnected, setIsConnected] = useState(false);\n  // ... implementation\n};\n```\n\nHere's my proposed hook for the real-time features. Thoughts?",
    createdAt: new Date(now - 3 * hour),
    reactions: [
      { emoji: "👀", userIds: ["user-2", "user-5", "user-6"], count: 3 },
    ],
    threadCount: 8,
  },
  {
    id: "msg-9",
    channelId: "channel-2",
    userId: "user-2",
    content:
      "Nice approach! Have you considered adding automatic reconnection logic? Something like exponential backoff would be great for reliability.",
    createdAt: new Date(now - 2.8 * hour),
    threadId: "msg-8",
  },
  {
    id: "msg-10",
    channelId: "channel-2",
    userId: "user-6",
    content:
      "PR is up for review: https://github.com/example/nself-chat/pull/142\n\nAdds the new message threading functionality. CC: @alex_rivera",
    createdAt: new Date(now - 1 * hour),
    reactions: [{ emoji: "✅", userIds: ["user-2"], count: 1 }],
  },
  {
    id: "msg-11",
    channelId: "channel-2",
    userId: "user-5",
    content:
      "Deployed v2.4.1 to production. Release notes: \n- Fixed memory leak in websocket handler\n- Improved message rendering performance\n- Added support for code block syntax highlighting",
    createdAt: new Date(now - 30 * minute),
    isPinned: true,
    reactions: [
      {
        emoji: "🚀",
        userIds: ["user-1", "user-2", "user-3", "user-6"],
        count: 4,
      },
      { emoji: "🎉", userIds: ["user-4"], count: 1 },
    ],
  },

  // Design channel messages
  {
    id: "msg-12",
    channelId: "channel-3",
    userId: "user-4",
    content:
      "I've been experimenting with different color palettes for the new theme system. Here are a few options:",
    createdAt: new Date(now - 5 * hour),
    attachments: [demoFiles[1]],
  },
  {
    id: "msg-13",
    channelId: "channel-3",
    userId: "user-1",
    content:
      "Love option 2! The contrast is much better for accessibility. Can we run it through the WCAG checker?",
    createdAt: new Date(now - 4.5 * hour),
  },
  {
    id: "msg-14",
    channelId: "channel-3",
    userId: "user-6",
    content:
      "I can help with the implementation once the design is finalized. The theme system is pretty flexible now.",
    createdAt: new Date(now - 4 * hour),
    reactions: [{ emoji: "🙌", userIds: ["user-4"], count: 1 }],
  },

  // Random channel messages
  {
    id: "msg-15",
    channelId: "channel-4",
    userId: "user-3",
    content: "Anyone watching the game tonight?",
    createdAt: new Date(now - 6 * hour),
    reactions: [{ emoji: "🏈", userIds: ["user-2", "user-5"], count: 2 }],
    threadCount: 12,
  },
  {
    id: "msg-16",
    channelId: "channel-4",
    userId: "user-2",
    content: "Check out this hilarious programming meme I found 😂",
    createdAt: new Date(now - 2 * hour),
    reactions: [
      {
        emoji: "😂",
        userIds: ["user-1", "user-3", "user-4", "user-5", "user-6"],
        count: 5,
      },
      { emoji: "💯", userIds: ["user-3"], count: 1 },
    ],
  },
  {
    id: "msg-17",
    channelId: "channel-4",
    userId: "user-6",
    content: "Happy Friday everyone! Any plans for the weekend?",
    createdAt: new Date(now - 15 * minute),
    reactions: [
      { emoji: "🎉", userIds: ["user-1", "user-2", "user-4"], count: 3 },
    ],
    threadCount: 3,
  },

  // Direct messages
  {
    id: "msg-dm-1",
    channelId: "dm-1",
    userId: "user-2",
    content: "Hey! Do you have a minute to chat about the architecture review?",
    createdAt: new Date(now - 20 * minute),
  },
  {
    id: "msg-dm-2",
    channelId: "dm-1",
    userId: "user-7",
    content:
      "Sure thing! I was just looking at the diagrams. The microservices approach looks solid.",
    createdAt: new Date(now - 15 * minute),
  },
  {
    id: "msg-dm-3",
    channelId: "dm-1",
    userId: "user-2",
    content:
      "Great! Let me know if you have any questions. We can hop on a call if that helps.",
    createdAt: new Date(now - 10 * minute),
    reactions: [{ emoji: "👍", userIds: ["user-7"], count: 1 }],
  },
];

// -------------------------------------------------------------------------------
// Template-Specific Branding Data
// -------------------------------------------------------------------------------

export interface TemplateBranding {
  id: TemplateId;
  name: string;
  tagline: string;
  icon: string;
  previewImage: string;
  features: string[];
  highlights: string[];
}

export const templateBranding: Record<TemplateId, TemplateBranding> = {
  default: {
    id: "default",
    name: "nself",
    tagline: "Modern team communication platform",
    icon: "/templates/icons/nself.svg",
    previewImage: "/templates/previews/nself-preview.png",
    features: [
      "Clean modern design",
      "Flexible theming",
      "Best features from Slack, Discord & Telegram",
      "Full customization support",
      "White-label ready",
    ],
    highlights: [
      "Protocol-inspired design",
      "Glowing cyan accents",
      "Dark mode optimized",
    ],
  },
  slack: {
    id: "slack",
    name: "Slack",
    tagline: "Where work happens",
    icon: "/templates/icons/slack.svg",
    previewImage: "/templates/previews/slack-preview.png",
    features: [
      "Classic aubergine sidebar",
      "Green accent colors",
      "Thread-first conversations",
      "Familiar Slack-style UI",
      "Workspace organization",
    ],
    highlights: ["Professional look", "Channel-focused", "Enterprise-ready"],
  },
  discord: {
    id: "discord",
    name: "Discord",
    tagline: "Your place to talk and hang out",
    icon: "/templates/icons/discord.svg",
    previewImage: "/templates/previews/discord-preview.png",
    features: [
      "Blurple accent theme",
      "Server-based organization",
      "Gaming-inspired UI",
      "Voice channel indicators",
      "Rich presence support",
    ],
    highlights: ["Community-focused", "Fun & engaging", "Dark mode default"],
  },
  telegram: {
    id: "telegram",
    name: "Telegram",
    tagline: "Fast, secure messaging",
    icon: "/templates/icons/telegram.svg",
    previewImage: "/templates/previews/telegram-preview.png",
    features: [
      "Clean blue theme",
      "Fast & lightweight",
      "Cloud-based sync",
      "Read receipts & timestamps",
      "Minimal distraction design",
    ],
    highlights: ["Speed-optimized", "Privacy-focused", "Clean aesthetics"],
  },
  whatsapp: {
    id: "whatsapp",
    name: "WhatsApp",
    tagline: "Simple, secure, reliable messaging",
    icon: "/templates/icons/whatsapp.svg",
    previewImage: "/templates/previews/whatsapp-preview.png",
    features: [
      "Green accent theme",
      "Chat bubble style",
      "Status indicators",
      "End-to-end encryption visuals",
      "Familiar mobile-first design",
    ],
    highlights: [
      "Instant messaging style",
      "Universal familiarity",
      "Simple interface",
    ],
  },
};

// -------------------------------------------------------------------------------
// Helper Functions
// -------------------------------------------------------------------------------

/**
 * Get a user by ID
 */
export function getDemoUser(userId: string): DemoUser | undefined {
  return demoUsers.find((user) => user.id === userId);
}

/**
 * Get a channel by ID
 */
export function getDemoChannel(channelId: string): DemoChannel | undefined {
  return demoChannels.find((channel) => channel.id === channelId);
}

/**
 * Get messages for a specific channel
 */
export function getChannelMessages(channelId: string): DemoMessage[] {
  return demoMessages.filter(
    (msg) => msg.channelId === channelId && !msg.threadId,
  );
}

/**
 * Get thread replies for a message
 */
export function getThreadReplies(messageId: string): DemoMessage[] {
  return demoMessages.filter((msg) => msg.threadId === messageId);
}

/**
 * Get the current demo user (simulated logged-in user)
 */
export function getCurrentDemoUser(): DemoUser {
  return demoUsers.find((user) => user.id === "user-7")!;
}

/**
 * Get all channels for the current demo user
 */
export function getCurrentUserChannels(): DemoChannel[] {
  const currentUser = getCurrentDemoUser();
  return demoChannels.filter((channel) =>
    channel.memberIds.includes(currentUser.id),
  );
}

/**
 * Get direct message channels for the current demo user
 */
export function getCurrentUserDMs(): DemoChannel[] {
  return getCurrentUserChannels().filter(
    (channel) => channel.type === "direct",
  );
}

/**
 * Get public and private channels for the current demo user
 */
export function getCurrentUserGroups(): DemoChannel[] {
  return getCurrentUserChannels().filter(
    (channel) => channel.type === "public" || channel.type === "private",
  );
}

/**
 * Get total unread count for the current user
 */
export function getTotalUnreadCount(): number {
  return getCurrentUserChannels().reduce(
    (total, channel) => total + channel.unreadCount,
    0,
  );
}

/**
 * Get total mention count for the current user
 */
export function getTotalMentionCount(): number {
  return getCurrentUserChannels().reduce(
    (total, channel) => total + channel.mentionCount,
    0,
  );
}
