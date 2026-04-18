# Bot Templates Documentation

Complete guide to using and customizing pre-built bot templates in nself-chat.

## Table of Contents

1. [Overview](#overview)
2. [Available Templates](#available-templates)
3. [Using Templates](#using-templates)
4. [Customizing Templates](#customizing-templates)
5. [Template Structure](#template-structure)
6. [Examples](#examples)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Overview

### What Are Bot Templates?

Bot templates are pre-built, production-ready bots that you can instantly deploy to your nself-chat instance. They provide common functionality out of the box and can be customized to fit your specific needs.

**Benefits:**

- **Zero coding required** for basic use cases
- **Instant deployment** - add to your workspace in seconds
- **Battle-tested** - used in production by hundreds of teams
- **Fully customizable** - modify behavior, appearance, and settings
- **Type-safe** - built with TypeScript for reliability

### Why Use Templates?

Instead of building bots from scratch, templates give you:

1. **Speed** - Deploy common functionality in minutes, not days
2. **Best practices** - Learn from well-architected examples
3. **Reliability** - Production-tested code with error handling
4. **Customization** - Start with working code, modify to your needs
5. **Consistency** - Standardized bot patterns across your organization

### Template Categories

| Category         | Purpose                  | Examples                             |
| ---------------- | ------------------------ | ------------------------------------ |
| **Welcome**      | Onboarding and greetings | Welcome Bot                          |
| **Utility**      | General-purpose tools    | FAQ Bot                              |
| **Productivity** | Team efficiency          | Poll Bot, Scheduler Bot, Standup Bot |
| **Moderation**   | Content management       | Auto-moderator Bot                   |
| **Analytics**    | Metrics and reporting    | Analytics Bot                        |

---

## Available Templates

### 1. Welcome Bot 👋

Automatically greet new members and send onboarding messages.

**Features:**

- Customizable welcome messages with placeholders
- Optional direct messages to new members
- Auto-role assignment on join
- Server rules display
- Member count tracking

**Use Cases:**

- Onboarding new team members
- Community server welcomes
- Directing users to important channels
- Auto-assigning roles

**Commands:**

- `/setwelcome message:<text>` - Configure welcome message
- `/testwelcome` - Preview the welcome message
- `/welcomesettings` - View current settings

**Configuration:**

```typescript
{
  welcomeMessage: string // Message template
  sendDM: boolean // Send DM to new members
  showRules: boolean // Display rules button
  assignRole: string // Role to auto-assign
  embedColor: string // Embed color (hex)
}
```

**Message Placeholders:**

- `{user}` - New member's name
- `{channel}` - Channel name
- `{memberCount}` - Total member count

**Example Message:**

```
Welcome {user} to {channel}! 🎉

We're glad to have you here. Here are some tips to get started:

• Introduce yourself in this channel
• Check out the pinned messages for important info
• Feel free to ask questions - we're here to help!

You are member #{memberCount}!
```

---

### 2. FAQ Bot ❓

Answer frequently asked questions using a knowledge base with smart keyword matching.

**Features:**

- Keyword-based question matching
- Add/edit/delete FAQs via commands
- Category organization
- Search functionality
- Usage analytics tracking
- Auto-respond to questions
- Configurable match confidence

**Use Cases:**

- Customer support automation
- Internal documentation
- Onboarding assistance
- Reducing repetitive questions

**Commands:**

- `/faq` - List all FAQs by category
- `/addfaq question:<q> answer:<a> [category:<cat>]` - Add new FAQ
- `/removefaq id:<id>` - Remove an FAQ
- `/searchfaq query:<text>` - Search FAQs

**Configuration:**

```typescript
{
  faqs: FAQItem[]          // FAQ knowledge base
  autoRespond: boolean     // Auto-answer questions
  minMatchScore: number    // Confidence threshold (0-1)
}

interface FAQItem {
  id: string
  question: string
  answer: string
  category?: string
  keywords: string[]
  useCount: number
}
```

**Example Usage:**

```bash
# Add an FAQ
/addfaq question:"How do I reset my password?" answer:"Click 'Forgot Password' on the login page." category:"Account"

# Search FAQs
/searchfaq query:"password reset"

# View all FAQs
/faq
```

**Keyword Extraction:**

The bot automatically extracts keywords by:

1. Converting to lowercase
2. Removing stop words (how, what, the, etc.)
3. Filtering words shorter than 3 characters
4. Storing for future matching

**Match Scoring:**

Questions are matched using keyword overlap:

- Score = (matching keywords) / (total query keywords)
- Only responds if score ≥ `minMatchScore`
- Returns best match if multiple FAQs qualify

---

### 3. Poll Bot 📊

Create and manage polls and surveys with real-time voting.

**Features:**

- Create polls with multiple options
- Real-time vote tracking
- Anonymous or public voting
- Time-limited polls
- Single or multiple choice
- Visual progress bars
- Reaction-based voting
- Poll results visualization

**Use Cases:**

- Team decisions
- Quick surveys
- Feature voting
- Meeting scheduling
- Event planning

**Commands:**

- `/poll question:<q> options:<opt1,opt2,opt3>` - Create poll
- `/pollresults id:<poll-id>` - View detailed results
- `/closepoll id:<poll-id>` - Close poll early

**Advanced Options:**

- `duration:<time>` - Auto-close after duration (e.g., `1h`, `2d`)
- `multiple:true` - Allow multiple votes per person
- `anonymous:true` - Hide who voted for what

**Configuration:**

```typescript
{
  defaultDuration: number // Default poll duration (ms)
  maxOptions: number // Max poll options (2-20)
  allowAnonymous: boolean // Allow anonymous polls
}

interface Poll {
  id: string
  question: string
  options: string[]
  votes: Record<string, string | string[]>
  createdBy: string
  createdAt: Date
  expiresAt?: Date
  allowMultipleVotes: boolean
  anonymous: boolean
  maxChoices: number
  channelId: string
}
```

**Example Usage:**

```bash
# Simple poll
/poll question:"What pizza?" options:"Cheese,Pepperoni,Veggie"

# Multiple choice poll
/poll question:"Pick your favorite colors" options:"Red,Blue,Green,Yellow" multiple:true

# Time-limited anonymous poll
/poll question:"Rate our service" options:"1,2,3,4,5" duration:1h anonymous:true

# View results
/pollresults id:abc123
```

**Voting Formats:**

The bot supports two voting methods:

1. **Reaction-based**: React with number emojis (1️⃣, 2️⃣, etc.)
2. **Button-based**: Click interactive buttons

**Time Duration Formats:**

- `5m` - 5 minutes
- `2h` - 2 hours
- `1d` - 1 day
- `1w` - 1 week

**Progress Bar Visualization:**

```
1️⃣ **Cheese**
███████░░░ 7 votes (70%)

2️⃣ **Pepperoni**
███░░░░░░░ 3 votes (30%)
```

---

### 4. Scheduler Bot ⏰

Set reminders and schedule messages with powerful time parsing.

**Features:**

- One-time and recurring reminders
- Schedule messages for future delivery
- Flexible time parsing
- Timezone support
- Notification preferences
- Cron-like recurring schedules
- Per-user reminder limits
- Reminder management

**Use Cases:**

- Meeting reminders
- Deadline tracking
- Daily standups
- Birthday notifications
- Scheduled announcements

**Commands:**

- `/remind when:<time> message:<text>` - Set reminder
- `/reminders` - List your reminders
- `/deletereminder id:<id>` - Delete reminder
- `/schedule when:<time> message:<text>` - Schedule message

**Advanced Options:**

- `repeat:<interval>` - Recurring reminder (e.g., `1d`, `1w`)
- `count:<n>` - Max occurrences for recurring reminders
- `channel:<id>` - Target channel for scheduled messages

**Configuration:**

```typescript
{
  maxRemindersPerUser: number // Max reminders per user
  defaultTimezone: string // Default timezone
  allowRecurring: boolean // Allow recurring reminders
}

interface Reminder {
  id: string
  message: string
  channelId: string
  userId: string
  scheduledFor: Date
  recurring?: {
    interval: number
    count?: number
  }
  completed: boolean
  createdAt: Date
}
```

**Time Formats:**

**Relative time:**

```bash
/remind when:30m message:"Check status"
/remind when:2h message:"Team meeting"
/remind when:1d message:"Submit report"
```

**Named times:**

```bash
/remind when:tomorrow message:"Follow up"
/remind when:"next week" message:"Sprint planning"
```

**Absolute datetime:**

```bash
/remind when:"2026-02-15 15:00" message:"Product launch"
```

**Recurring reminders:**

```bash
# Daily reminder
/remind when:9am message:"Daily standup" repeat:1d

# Weekly reminder (5 times)
/remind when:monday message:"Sprint review" repeat:1w count:5
```

**Example Usage:**

```bash
# Quick reminder
/remind when:30m message:"Check deployment status"

# Tomorrow reminder
/remind when:tomorrow message:"Send weekly report"

# Recurring daily reminder
/remind when:"9:00" message:"Team standup time!" repeat:1d

# List reminders
/reminders

# Delete reminder
/deletereminder id:xyz789

# Schedule announcement
/schedule when:"2026-02-01 10:00" message:"Server maintenance in 1 hour" channel:general
```

---

### 5. Standup Bot 🗣️

Automate daily standup meetings and track team participation.

**Features:**

- Scheduled daily standup prompts
- Collect responses from team members
- Generate standup summaries
- Track participation rates
- Customizable questions
- Skip weekends option
- Remind non-responders
- Historical standup notes

**Use Cases:**

- Daily team standups
- Async team updates
- Remote team coordination
- Project status tracking
- Team accountability

**Commands:**

- `/standup` - Start daily standup
- `/mystandup yesterday:<text> today:<text> [blockers:<text>]` - Submit update
- `/updatestandup` - Update your response
- `/endstandup` - End standup and show summary
- `/standupnotes [date:<YYYY-MM-DD>]` - View standup summary

**Configuration:**

```typescript
{
  standupTime: string // Daily standup time (HH:MM)
  standupChannel: string // Channel for standups
  skipWeekends: boolean // Skip Saturday/Sunday
  questions: {
    yesterday: string
    today: string
    blockers: string
  }
  remindNonResponders: boolean
  reminderTime: string // Reminder time (HH:MM)
}

interface StandupSession {
  id: string
  date: string // YYYY-MM-DD
  channelId: string
  responses: StandupResponse[]
  status: 'active' | 'completed'
  createdAt: Date
  completedAt?: Date
}

interface StandupResponse {
  userId: string
  userName: string
  yesterday: string
  today: string
  blockers: string
  timestamp: Date
}
```

**Default Questions:**

1. What did you accomplish yesterday?
2. What will you work on today?
3. Do you have any blockers?

**Example Usage:**

```bash
# Start standup (admin)
/standup

# Submit your update
/mystandup yesterday:"Fixed login bug" today:"Work on API endpoints" blockers:"None"

# Update your response
/updatestandup today:"Work on API endpoints and write tests"

# End standup and show summary
/endstandup

# View past standup
/standupnotes date:2026-01-30
```

**Standup Summary Format:**

```
📋 Standup Summary - Friday, January 31, 2026

Status: ✅ Completed
Responses: 8
Started: 9:00 AM
Ended: 9:45 AM

👤 Alice Smith
Yesterday: Fixed authentication bug and updated docs
Today: Implement new search feature
Blockers: None

👤 Bob Johnson
Yesterday: Code review and testing
Today: Deploy to staging
Blockers: Waiting for API key from DevOps

👤 Charlie Davis
Yesterday: Database migration
Today: Performance optimization
Blockers: Need design mockups for new UI
```

**Automated Scheduling:**

When configured, the bot automatically:

1. Posts standup prompt at `standupTime` (e.g., 9:00 AM)
2. Collects responses throughout the day
3. Sends reminder at `reminderTime` (e.g., 10:00 AM) to non-responders
4. Compiles summary when `/endstandup` is called

---

## Using Templates

### Method 1: Via Admin UI

1. Navigate to **Admin** → **Bots** → **Templates**
2. Browse available templates
3. Click **Install** on desired template
4. Configure settings
5. Enable in target channels

### Method 2: Via API

```typescript
// List available templates
const response = await fetch('/api/bots/templates?featured=true')
const { data: templates } = await response.json()

// Get specific template
const welcomeTemplate = templates.find((t) => t.id === 'welcome-bot')

// Install template
const installResponse = await fetch('/api/bots', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    template_id: 'welcome-bot',
    name: 'My Welcome Bot',
    config: {
      welcomeMessage: 'Welcome to our community!',
      sendDM: true,
      embedColor: '#22c55e',
    },
  }),
})
```

### Method 3: Programmatically

```typescript
import { createWelcomeBot } from '@/lib/bots/templates'

// Create with defaults
const welcomeBot = createWelcomeBot()

// Bot is now running and will respond to events
```

### Quick Start Example

```typescript
import { createFAQBot } from '@/lib/bots/templates'

// 1. Create the bot
const faqBot = createFAQBot()

// 2. Add some FAQs via commands
// /addfaq question:"How do I...?" answer:"You can..." category:"Getting Started"

// 3. Bot will now auto-respond to questions
```

---

## Customizing Templates

### Customization Levels

Templates offer three levels of customization:

#### Level 1: Configuration Only (No Code)

Modify bot behavior through settings:

```typescript
// Welcome Bot configuration
{
  welcomeMessage: "Custom welcome message with {user}",
  sendDM: true,
  showRules: true,
  assignRole: "member",
  embedColor: "#6366f1"
}

// FAQ Bot configuration
{
  autoRespond: true,
  minMatchScore: 0.7  // Require 70% keyword match
}

// Poll Bot configuration
{
  defaultDuration: 48 * 60 * 60 * 1000,  // 2 days
  maxOptions: 15,
  allowAnonymous: false
}
```

#### Level 2: Template Forking

Copy template code and modify:

```typescript
import { bot, embed } from '@/lib/bots/bot-sdk'
import { welcomeBotTemplate } from '@/lib/bots/templates/welcome-bot'

// Start with template config
export function createCustomWelcomeBot() {
  return bot('custom-welcome-bot')
    .name('Custom Welcome Bot')
    .description('My customized welcome bot')
    .version('1.0.0')
    .icon('🎉')
    .permissions('read_messages', 'send_messages', 'mention_users')

    .settings({
      ...welcomeBotTemplate.defaultConfig,
      // Add custom settings
      sendWelcomeGif: true,
      gifUrl: 'https://example.com/welcome.gif',
    })

    .onUserJoin(async (ctx, api) => {
      const config = api.getBotConfig()

      // Custom welcome logic
      const response = embed()
        .title('🎉 Welcome!')
        .description(`Hey ${ctx.user.displayName}, welcome to the team!`)
        .color('#22c55e')

      // Add GIF if enabled
      if (config.settings?.sendWelcomeGif) {
        response.image(config.settings.gifUrl as string)
      }

      return response.build()
    })

    .build()
}
```

#### Level 3: Complete Customization

Build entirely new features:

```typescript
import { bot, embed, text } from '@/lib/bots/bot-sdk'

export function createAdvancedWelcomeBot() {
  return bot('advanced-welcome-bot')
    .name('Advanced Welcome Bot')
    .description('Welcome bot with gamification')
    .permissions('read_messages', 'send_messages', 'mention_users', 'manage_roles')

    .settings({
      welcomePoints: 100,
      achievements: true,
      leaderboard: true,
    })

    .onUserJoin(async (ctx, api) => {
      // Award welcome points
      const userPoints = (await api.getStorage<number>(`points:${ctx.user.id}`)) || 0
      await api.setStorage(`points:${ctx.user.id}`, userPoints + 100)

      // Check for achievements
      const memberCount = await getMemberCount(ctx.channel.id, api)

      const response = embed()
        .title('🎉 Welcome to the Community!')
        .description(
          `Welcome ${ctx.user.displayName}!\n\n` +
            `You've earned **100 points** for joining! 🌟\n\n` +
            `You are member **#${memberCount}**!`
        )
        .color('#22c55e')

      // Special achievement for early members
      if (memberCount <= 100) {
        response.field(
          '🏆 Achievement Unlocked!',
          'Early Adopter - Joined in first 100 members',
          false
        )
      }

      return response.build()
    })

    .command('points', 'Check your points', async (ctx, api) => {
      const points = (await api.getStorage<number>(`points:${ctx.user.id}`)) || 0
      return text(`You have ${points} points! 🌟`)
    })

    .command('leaderboard', 'View top members', async (ctx, api) => {
      // Fetch and display leaderboard
      const leaderboard = await getLeaderboard(api)

      const response = embed()
        .title('🏆 Leaderboard')
        .description(
          leaderboard
            .map((entry, i) => `${i + 1}. ${entry.name} - ${entry.points} points`)
            .join('\n')
        )
        .color('#f59e0b')

      return response.build()
    })

    .build()
}

async function getMemberCount(channelId: string, api: any): Promise<number> {
  const channel = await api.getChannel(channelId)
  return channel.memberCount || 0
}

async function getLeaderboard(api: any): Promise<Array<{ name: string; points: number }>> {
  // Query database for top users by points
  // This is a simplified example
  return [
    { name: 'Alice', points: 500 },
    { name: 'Bob', points: 450 },
    { name: 'Charlie', points: 400 },
  ]
}
```

### Common Modifications

#### Change Message Styling

```typescript
// Original
return text('Welcome!')

// Custom with embed
return embed()
  .title('🎉 Welcome!')
  .description("We're glad you're here!")
  .color('#22c55e')
  .thumbnail('https://example.com/logo.png')
  .footer('Powered by nself-chat')
  .build()
```

#### Add Extra Commands

```typescript
// Add to any template
.command('help', 'Show help', (ctx) => {
  return embed()
    .title('📚 Bot Help')
    .description('Available commands:')
    .field('/command1', 'Description 1')
    .field('/command2', 'Description 2')
    .build()
})
```

#### Add Reaction Handlers

```typescript
.onReaction(async (ctx, api) => {
  if (ctx.reaction.emoji === '✅' && ctx.reaction.action === 'add') {
    // User confirmed something
    await api.sendMessage(ctx.channel.id, text('Confirmed!'))
  }
})
```

#### Add Keyword Triggers

```typescript
.onKeyword(['thanks', 'thank you'], (ctx) => {
  return text('You\'re welcome! 😊')
})
```

#### Modify Storage Keys

```typescript
// Original
await api.setStorage('poll:123', pollData)

// Scoped to channel
await api.setStorage(`poll:${ctx.channel.id}:123`, pollData)

// Scoped to user
await api.setStorage(`user:${ctx.user.id}:preferences`, userData)
```

---

## Template Structure

### File Organization

Each template follows this structure:

```
src/lib/bots/templates/
├── index.ts              # Export all templates
├── welcome-bot.ts        # Welcome Bot template
├── faq-bot.ts           # FAQ Bot template
├── poll-bot.ts          # Poll Bot template
├── scheduler-bot.ts     # Scheduler Bot template
└── standup-bot.ts       # Standup Bot template
```

### Template File Structure

Every template file contains:

```typescript
/**
 * 1. IMPORTS
 */
import { bot, embed, text } from '../bot-sdk'
import type { BotInstance } from '../bot-runtime'

/**
 * 2. TYPE DEFINITIONS
 */
export interface BotConfig {
  // Configuration interface
}

export interface BotData {
  // Data structure interface
}

/**
 * 3. FACTORY FUNCTION
 */
export function createTemplateBot(): BotInstance {
  return bot('template-bot-id')
    .name('Template Bot')
    .description('What this bot does')
    .version('1.0.0')
    .icon('🤖')
    .permissions('read_messages', 'send_messages')

    .settings({
      // Default settings
    })

    .command('command1', 'Description', async (ctx, api) => {
      // Command implementation
    })

    .onMessage(async (ctx, api) => {
      // Message handler
    })

    .onInit(async (bot, api) => {
      // Initialization
    })

    .build()
}

/**
 * 4. HELPER FUNCTIONS
 */
function helperFunction() {
  // Utility functions
}

/**
 * 5. TEMPLATE METADATA
 */
export const templateBotTemplate = {
  id: 'template-bot',
  name: 'Template Bot',
  description: 'What this bot does',
  category: 'productivity' as const,
  icon: '🤖',
  configSchema: {
    type: 'object',
    properties: {
      // JSON Schema for configuration
    },
  },
  defaultConfig: {
    // Default configuration values
  },
  isFeatured: true,
}
```

### Required Fields

Every template must include:

| Field           | Type    | Description                        |
| --------------- | ------- | ---------------------------------- |
| `id`            | string  | Unique bot identifier (kebab-case) |
| `name`          | string  | Display name                       |
| `description`   | string  | What the bot does                  |
| `category`      | string  | Template category                  |
| `icon`          | string  | Emoji or icon URL                  |
| `configSchema`  | object  | JSON Schema for settings           |
| `defaultConfig` | object  | Default configuration              |
| `isFeatured`    | boolean | Show in featured list              |

### Configuration Schema

Templates use JSON Schema for configuration validation:

```typescript
configSchema: {
  type: 'object',
  properties: {
    welcomeMessage: {
      type: 'string',
      title: 'Welcome Message',
      description: 'Message shown to new members',
      default: 'Welcome!',
      minLength: 1,
      maxLength: 1000
    },
    sendDM: {
      type: 'boolean',
      title: 'Send Direct Message',
      description: 'Also send a DM to new members',
      default: false
    },
    maxAttempts: {
      type: 'number',
      title: 'Max Attempts',
      description: 'Maximum number of attempts',
      default: 3,
      minimum: 1,
      maximum: 10
    },
    mode: {
      type: 'string',
      title: 'Mode',
      description: 'Operation mode',
      enum: ['basic', 'advanced', 'expert'],
      default: 'basic'
    }
  },
  required: ['welcomeMessage']
}
```

---

## Examples

### Example 1: Basic Template Usage

```typescript
import { createWelcomeBot } from '@/lib/bots/templates'

// Install welcome bot with defaults
const bot = createWelcomeBot()

// Bot automatically greets new users
```

### Example 2: Configured Template

```typescript
import { createFAQBot } from '@/lib/bots/templates'

// Create FAQ bot
const faqBot = createFAQBot()

// Add FAQs programmatically
await fetch('/api/bots/faq-bot/commands', {
  method: 'POST',
  body: JSON.stringify({
    command: 'addfaq',
    args: {
      question: 'How do I reset my password?',
      answer: 'Click "Forgot Password" on login page',
      category: 'Account',
    },
  }),
})
```

### Example 3: Multiple Templates

```typescript
import {
  createWelcomeBot,
  createFAQBot,
  createPollBot,
  createSchedulerBot,
} from '@/lib/bots/templates'

// Deploy complete bot suite
const bots = {
  welcome: createWelcomeBot(),
  faq: createFAQBot(),
  poll: createPollBot(),
  scheduler: createSchedulerBot(),
}

console.log('Deployed', Object.keys(bots).length, 'bots')
```

### Example 4: Custom Template Fork

```typescript
import { bot, embed, text, error } from '@/lib/bots/bot-sdk'

export function createCustomPollBot() {
  return (
    bot('custom-poll-bot')
      .name('Advanced Poll Bot')
      .description('Poll bot with charts and analytics')
      .version('2.0.0')
      .icon('📊')
      .permissions('read_messages', 'send_messages', 'add_reactions')

      .settings({
        defaultDuration: 24 * 60 * 60 * 1000,
        maxOptions: 20, // Increased from 10
        allowAnonymous: true,
        enableCharts: true, // New feature
        enableExport: true, // New feature
      })

      .command('poll', 'Create an advanced poll', async (ctx, api) => {
        // ... poll creation logic

        const config = api.getBotConfig()
        if (!ctx.args.question || !ctx.args.options) {
          return error('Usage: /poll question:<text> options:<opt1,opt2,...>')
        }

        const poll = {
          id: generateId(),
          question: ctx.args.question as string,
          options: (ctx.args.options as string).split(','),
          votes: {},
          createdAt: new Date(),
        }

        await api.setStorage(`poll:${poll.id}`, poll)

        return renderPollEmbed(poll, config)
      })

      // New command: Export poll results
      .command('exportpoll', 'Export poll data as CSV', async (ctx, api) => {
        if (!ctx.args.id) {
          return error('Usage: /exportpoll id:<poll-id>')
        }

        const poll = await api.getStorage(`poll:${ctx.args.id}`)
        if (!poll) {
          return error('Poll not found')
        }

        const csv = generateCSV(poll)

        return text(`Poll data exported:\n\n\`\`\`csv\n${csv}\n\`\`\``)
      })

      // New command: Generate chart
      .command('pollchart', 'Show poll results chart', async (ctx, api) => {
        if (!ctx.args.id) {
          return error('Usage: /pollchart id:<poll-id>')
        }

        const poll = await api.getStorage(`poll:${ctx.args.id}`)
        if (!poll) {
          return error('Poll not found')
        }

        const chartUrl = await generateChart(poll)

        return embed().title(`📊 ${poll.question}`).image(chartUrl).build()
      })

      .build()
  )
}

function generateId(): string {
  return Math.random().toString(36).substring(7)
}

function renderPollEmbed(poll: any, config: any): any {
  // Custom rendering logic
  return embed()
    .title(`📊 ${poll.question}`)
    .description(poll.options.map((o: string, i: number) => `${i + 1}. ${o}`).join('\n'))
    .footer(`Poll ID: ${poll.id}`)
    .color('#8b5cf6')
    .build()
}

function generateCSV(poll: any): string {
  const header = 'Option,Votes,Percentage\n'
  const rows = poll.options
    .map((option: string, i: number) => {
      const votes = poll.votes[i] || 0
      const total = Object.values(poll.votes).reduce((a: any, b: any) => a + b, 0)
      const percentage = total > 0 ? ((votes / total) * 100).toFixed(2) : '0.00'
      return `${option},${votes},${percentage}%`
    })
    .join('\n')

  return header + rows
}

async function generateChart(poll: any): Promise<string> {
  // Generate chart using Chart.js or similar
  // Return chart image URL
  return 'https://quickchart.io/chart?...'
}
```

### Example 5: Template with Database Integration

```typescript
import { bot, embed, text } from '@/lib/bots/bot-sdk'
import { db } from '@/lib/database'

export function createDatabasePollBot() {
  return bot('db-poll-bot')
    .name('Database Poll Bot')
    .description('Poll bot with PostgreSQL backend')
    .version('1.0.0')
    .icon('📊')
    .permissions('read_messages', 'send_messages')

    .command('poll', 'Create poll', async (ctx, api) => {
      const question = ctx.args.question as string
      const options = (ctx.args.options as string).split(',')

      // Store in PostgreSQL
      const result = await db.query(
        `
        INSERT INTO nchat_polls (question, options, created_by, channel_id)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `,
        [question, options, ctx.user.id, ctx.channel.id]
      )

      const pollId = result.rows[0].id

      return embed()
        .title(`📊 ${question}`)
        .description(options.map((o, i) => `${i + 1}. ${o}`).join('\n'))
        .footer(`Poll ID: ${pollId}`)
        .build()
    })

    .onReaction(async (ctx, api) => {
      // Find poll from database
      const poll = await db.query(
        `
        SELECT * FROM nchat_polls
        WHERE message_id = $1
      `,
        [ctx.reaction.messageId]
      )

      if (poll.rows.length === 0) return

      const emojiNumbers = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣']
      const optionIndex = emojiNumbers.indexOf(ctx.reaction.emoji)

      if (optionIndex === -1) return

      // Record vote in database
      await db.query(
        `
        INSERT INTO nchat_poll_votes (poll_id, user_id, option_index)
        VALUES ($1, $2, $3)
        ON CONFLICT (poll_id, user_id)
        DO UPDATE SET option_index = $3, updated_at = NOW()
      `,
        [poll.rows[0].id, ctx.user.id, optionIndex]
      )

      // Update poll message with new results
      const results = await getPollResults(poll.rows[0].id)
      await api.editMessage(ctx.reaction.messageId, renderPollResults(results))
    })

    .build()
}

async function getPollResults(pollId: string): Promise<any> {
  const result = await db.query(
    `
    SELECT
      p.question,
      p.options,
      COUNT(v.id) as total_votes,
      json_agg(
        json_build_object(
          'option_index', v.option_index,
          'user_id', v.user_id
        )
      ) as votes
    FROM nchat_polls p
    LEFT JOIN nchat_poll_votes v ON v.poll_id = p.id
    WHERE p.id = $1
    GROUP BY p.id
  `,
    [pollId]
  )

  return result.rows[0]
}

function renderPollResults(results: any): any {
  // Render updated poll with vote counts
  return embed().title(`📊 ${results.question}`).description(/* ... */).build()
}
```

---

## Best Practices

### 1. Configuration Management

**DO:**

```typescript
// Use typed configurations
interface BotConfig {
  maxRetries: number
  timeout: number
  enabled: boolean
}

const config = api.getBotConfig()
const settings = config.settings as BotConfig
```

**DON'T:**

```typescript
// Untyped access
const maxRetries = config.settings.maxRetries // No type safety
```

### 2. Error Handling

**DO:**

```typescript
.command('poll', 'Create poll', async (ctx, api) => {
  try {
    // Validate input
    if (!ctx.args.question) {
      return error('Question is required')
    }

    // Process command
    const poll = await createPoll(ctx.args)
    return renderPoll(poll)

  } catch (err) {
    console.error('Poll creation failed:', err)
    return error('Failed to create poll. Please try again.')
  }
})
```

**DON'T:**

```typescript
.command('poll', 'Create poll', async (ctx, api) => {
  // No validation or error handling
  const poll = await createPoll(ctx.args)
  return renderPoll(poll)
})
```

### 3. Storage Keys

**DO:**

```typescript
// Namespaced, hierarchical keys
await api.setStorage(`bot:poll:${pollId}`, data)
await api.setStorage(`bot:user:${userId}:preferences`, prefs)
await api.setStorage(`bot:channel:${channelId}:config`, config)
```

**DON'T:**

```typescript
// Generic keys (collision risk)
await api.setStorage(pollId, data)
await api.setStorage('prefs', prefs)
```

### 4. Permission Requests

**DO:**

```typescript
// Minimal permissions
.permissions('read_messages', 'send_messages')
```

**DON'T:**

```typescript
// Over-requesting permissions
.permissions(
  'read_messages',
  'send_messages',
  'manage_messages',  // Not needed
  'manage_channels',  // Not needed
  'ban_users'        // Definitely not needed
)
```

### 5. Resource Cleanup

**DO:**

```typescript
.onInit(async (bot, api) => {
  const interval = setInterval(() => {
    cleanupOldData(api)
  }, 60000)

  // Register cleanup
  bot.registerCleanup(() => {
    clearInterval(interval)
  })
})
```

**DON'T:**

```typescript
.onInit(async (bot, api) => {
  // No cleanup - memory leak
  setInterval(() => {
    cleanupOldData(api)
  }, 60000)
})
```

### 6. Rate Limiting

**DO:**

```typescript
let lastApiCall = 0
const RATE_LIMIT = (1000) // 1 second

  .onMessage(async (ctx, api) => {
    const now = Date.now()

    if (now - lastApiCall < RATE_LIMIT) {
      return // Rate limited
    }

    lastApiCall = now

    // Make API call
    await externalAPI.call()
  })
```

**DON'T:**

```typescript
.onMessage(async (ctx, api) => {
  // No rate limiting - can overwhelm external APIs
  await externalAPI.call()
})
```

### 7. Input Validation

**DO:**

```typescript
.command('addfaq', 'Add FAQ', async (ctx, api) => {
  const question = ctx.args.question as string
  const answer = ctx.args.answer as string

  // Validate
  if (!question || question.length < 5) {
    return error('Question must be at least 5 characters')
  }

  if (!answer || answer.length < 10) {
    return error('Answer must be at least 10 characters')
  }

  if (question.length > 200) {
    return error('Question too long (max 200 characters)')
  }

  // Process
  await addFAQ({ question, answer })
  return success('FAQ added!')
})
```

**DON'T:**

```typescript
.command('addfaq', 'Add FAQ', async (ctx, api) => {
  // No validation
  const question = ctx.args.question
  const answer = ctx.args.answer

  await addFAQ({ question, answer })
  return success('FAQ added!')
})
```

### 8. Performance Optimization

**DO:**

```typescript
// Cache frequently accessed data
let faqCache: FAQ[] | null = null
let cacheTimestamp = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function getFAQs(api: BotApi): Promise<FAQ[]> {
  const now = Date.now()

  if (faqCache && now - cacheTimestamp < CACHE_TTL) {
    return faqCache
  }

  faqCache = (await api.getStorage<FAQ[]>('faqs')) || []
  cacheTimestamp = now

  return faqCache
}
```

**DON'T:**

```typescript
// Always fetch from storage
async function getFAQs(api: BotApi): Promise<FAQ[]> {
  return (await api.getStorage<FAQ[]>('faqs')) || []
}
```

### 9. Security

**DO:**

```typescript
.command('deletepoll', 'Delete poll', async (ctx, api) => {
  const poll = await api.getStorage(`poll:${ctx.args.id}`)

  // Verify ownership
  if (poll.createdBy !== ctx.user.id) {
    return error('You can only delete your own polls')
  }

  await api.deleteStorage(`poll:${ctx.args.id}`)
  return success('Poll deleted')
})
```

**DON'T:**

```typescript
.command('deletepoll', 'Delete poll', async (ctx, api) => {
  // No permission check - anyone can delete
  await api.deleteStorage(`poll:${ctx.args.id}`)
  return success('Poll deleted')
})
```

### 10. Documentation

**DO:**

```typescript
/**
 * Create a poll with multiple options
 *
 * @param question - Poll question
 * @param options - Array of poll options
 * @param config - Poll configuration
 * @returns Poll object with ID and settings
 *
 * @example
 * const poll = createPoll(
 *   'Favorite color?',
 *   ['Red', 'Blue', 'Green'],
 *   { anonymous: true }
 * )
 */
function createPoll(question: string, options: string[], config?: PollConfig): Poll {
  // ...
}
```

**DON'T:**

```typescript
// No documentation
function createPoll(question, options, config) {
  // ...
}
```

---

## Troubleshooting

### Common Issues

#### 1. Bot Not Responding

**Symptoms:**

- Bot doesn't react to commands
- No welcome messages sent
- Handlers not firing

**Solutions:**

```typescript
// Check bot is enabled
const config = api.getBotConfig()
if (!config.enabled) {
  console.log('Bot is disabled')
}

// Check permissions
const manifest = bot.getManifest()
console.log('Required permissions:', manifest.permissions)

// Check channel whitelist
if (config.channels && !config.channels.includes(ctx.channel.id)) {
  console.log('Bot not enabled in this channel')
}

// Add debug logging
.onMessage((ctx, api) => {
  console.log('Message received:', ctx.message.content)
  // ... handler logic
})
```

#### 2. Storage Errors

**Symptoms:**

- Data not persisting
- "Not found" errors
- Stale data returned

**Solutions:**

```typescript
// Use consistent key format
const KEY_PREFIX = 'mybot'
const getPollKey = (id: string) => `${KEY_PREFIX}:poll:${id}`
const getUserKey = (id: string) => `${KEY_PREFIX}:user:${id}`

// Check storage operations
try {
  await api.setStorage(key, data)
  console.log('✓ Saved successfully')
} catch (err) {
  console.error('✗ Save failed:', err)
}

// Verify data immediately after save
const saved = await api.getStorage(key)
if (JSON.stringify(saved) !== JSON.stringify(data)) {
  console.error('Data mismatch!')
}

// Clear old data periodically
.onInit(async (bot, api) => {
  setInterval(async () => {
    await cleanupOldPolls(api)
  }, 24 * 60 * 60 * 1000)  // Daily cleanup
})
```

#### 3. Command Parsing Issues

**Symptoms:**

- Arguments not parsed correctly
- Undefined values in `ctx.args`
- Commands not recognized

**Solutions:**

```typescript
// Provide clear usage examples
.command('poll', 'Create poll', (ctx) => {
  if (!ctx.args.question || !ctx.args.options) {
    return text(
      'Usage: `/poll question:<question> options:<opt1,opt2,opt3>`\n\n' +
      'Example:\n' +
      '`/poll question:"Favorite color?" options:"Red,Blue,Green"`'
    )
  }

  // Parse comma-separated options
  const options = (ctx.args.options as string)
    .split(',')
    .map(o => o.trim())
    .filter(o => o.length > 0)

  if (options.length < 2) {
    return error('Polls need at least 2 options')
  }

  // ... create poll
})
```

#### 4. Permission Denied

**Symptoms:**

- Operations fail with permission errors
- Bot can't perform actions

**Solutions:**

```typescript
// Check before attempting action
if (!bot.hasPermission('manage_messages')) {
  return error('Bot needs "Manage Messages" permission')
}

// Request additional permissions
.permissions(
  'read_messages',
  'send_messages',
  'add_reactions',  // For reaction-based voting
  'manage_messages' // For editing poll messages
)

// Graceful degradation
.onReaction(async (ctx, api) => {
  if (bot.hasPermission('manage_messages')) {
    await api.editMessage(messageId, updatedContent)
  } else {
    // Fallback: Send new message
    await api.sendMessage(ctx.channel.id, updatedContent)
  }
})
```

#### 5. Rate Limiting

**Symptoms:**

- API calls failing
- Delayed responses
- 429 Too Many Requests errors

**Solutions:**

```typescript
// Implement request queue
class RequestQueue {
  private queue: Array<() => Promise<any>> = []
  private processing = false
  private lastRequest = 0
  private readonly minInterval = 100 // ms between requests

  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn()
          resolve(result)
        } catch (err) {
          reject(err)
        }
      })
      this.process()
    })
  }

  private async process() {
    if (this.processing || this.queue.length === 0) return

    this.processing = true

    while (this.queue.length > 0) {
      const now = Date.now()
      const timeSinceLastRequest = now - this.lastRequest

      if (timeSinceLastRequest < this.minInterval) {
        await sleep(this.minInterval - timeSinceLastRequest)
      }

      const fn = this.queue.shift()
      if (fn) {
        await fn()
        this.lastRequest = Date.now()
      }
    }

    this.processing = false
  }
}

const queue = new RequestQueue()

  // Use queue for API calls
  .onMessage(async (ctx, api) => {
    await queue.enqueue(() => api.sendMessage(ctx.channel.id, text('Response')))
  })

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
```

#### 6. Memory Leaks

**Symptoms:**

- Increasing memory usage over time
- Bot becomes slow
- Server crashes

**Solutions:**

```typescript
// Limit cache size
const MAX_CACHE_SIZE = 100
const cache = new Map<string, any>()

function addToCache(key: string, value: any) {
  if (cache.size >= MAX_CACHE_SIZE) {
    // Remove oldest entry
    const firstKey = cache.keys().next().value
    cache.delete(firstKey)
  }
  cache.set(key, value)
}

// Clean up intervals and timers
.onInit((bot, api) => {
  const intervals: NodeJS.Timeout[] = []

  intervals.push(setInterval(() => {
    cleanupOldData(api)
  }, 60000))

  bot.registerCleanup(() => {
    intervals.forEach(clearInterval)
  })
})

// Limit stored data
async function savePollResults(pollId: string, results: any, api: BotApi) {
  // Only keep last 30 days
  const cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000)

  if (results.createdAt < cutoff) {
    await api.deleteStorage(`poll:${pollId}`)
    return
  }

  await api.setStorage(`poll:${pollId}`, results)
}
```

### Debug Mode

Enable debug logging for troubleshooting:

```typescript
const DEBUG = process.env.BOT_DEBUG === 'true'

function log(...args: any[]) {
  if (DEBUG) {
    console.log('[BotDebug]', ...args)
  }
}

export function createDebugBot() {
  return bot('debug-bot')
    .name('Debug Bot')

    .onMessage((ctx, api) => {
      log('Message received:', {
        content: ctx.message.content,
        user: ctx.user.displayName,
        channel: ctx.channel.name,
        timestamp: ctx.message.createdAt,
      })

      // ... handler logic
    })

    .command('debug', 'Show debug info', async (ctx, api) => {
      const config = api.getBotConfig()
      const storage = await api.getStorage('debug-info')

      return embed()
        .title('🐛 Debug Information')
        .field('Bot ID', config.id)
        .field('Enabled', config.enabled ? 'Yes' : 'No')
        .field('Channels', config.channels?.join(', ') || 'All')
        .field('Settings', JSON.stringify(config.settings, null, 2))
        .field('Storage', JSON.stringify(storage, null, 2))
        .build()
    })

    .build()
}
```

### Getting Help

If you're still having issues:

1. **Check logs**: Review bot execution logs for errors
2. **Test in isolation**: Use sandbox mode to test without side effects
3. **Review docs**: Check Bot SDK documentation
4. **Search issues**: Look for similar problems on GitHub
5. **Ask community**: Post in Discord support channel
6. **File bug**: Create GitHub issue with reproduction steps

---

## Next Steps

Now that you understand bot templates:

1. **Try a template** - Install a pre-built bot
2. **Customize it** - Modify settings and behavior
3. **Build your own** - Create a custom template
4. **Share it** - Publish to the community

### Related Documentation

- [Bot SDK Documentation](bot-sdk.md) - Complete SDK reference
- [Bot Management UI](../../Bot-Management-UI.md) - Admin interface guide
- [Bot Framework](../../Bot-Framework-v0.7.0.md) - Architecture overview

---

**Happy bot building! 🤖**
