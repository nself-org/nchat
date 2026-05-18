# nself-chat Bots

Complete bot implementations for the nchat platform.

## Available Bots

### 1. Reminder Bot

**Location**: `/src/bots/reminder-bot/`
**Status**: ✅ Complete

Set reminders for yourself or your team.

**Commands:**

- `/remind <time> "<message>"` - Set a reminder
- `/reminders` - List your reminders
- `/cancelreminder <id>` - Cancel a reminder
- `/snooze <id> [time]` - Snooze a reminder
- `/remindchannel <time> "<message>"` - Set channel reminder

**Files:**

- `index.ts` - Main bot implementation
- `commands.ts` - Command handlers
- `scheduler.ts` - Scheduling engine
- `manifest.json` - Bot manifest

### 2. Welcome Bot

**Location**: `/src/bots/welcome-bot/`
**Status**: ✅ Complete

Automatically welcome new members to your channels.

**Commands:**

- `/setwelcome "<message>"` - Set welcome message
- `/testwelcome` - Preview welcome message
- `/disablewelcome` - Disable welcomes

**Files:**

- `index.ts` - Main bot implementation
- `handlers.ts` - Event handlers
- `templates.ts` - Message templates
- `manifest.json` - Bot manifest

### 3. Poll Bot

**Location**: `/src/bots/poll-bot/`
**Status**: ✅ Complete

Create interactive polls and surveys in your channels.

**Commands:**

- `/poll "<question>" "<options>"` - Create a poll
- `/quickpoll "<question>"` - Yes/no poll
- `/pollresults <id>` - Show results
- `/endpoll <id>` - End poll early

**Files:**

- `index.ts` - Main bot implementation
- `commands.ts` - Command handlers
- `handlers.ts` - Vote and expiry handlers
- `manifest.json` - Bot manifest

### 4. FAQ Bot

**Location**: `/src/bots/faq-bot/`
**Status**: ✅ Complete

Answer frequently asked questions automatically.

**Commands:**

- `/faq <question>` - Search FAQ
- `/addfaq "<question>" "<answer>"` - Add FAQ
- `/removefaq <id>` - Remove FAQ
- `/editfaq <id> [fields]` - Edit FAQ
- `/listfaqs [category]` - List all FAQs

**Files:**

- `index.ts` - Main bot implementation
- `knowledge-base.ts` - FAQ storage and search
- `manifest.json` - Bot manifest

### 5. Scheduler Bot

**Location**: `/src/bots/scheduler-bot/`
**Status**: ✅ Complete

Schedule messages and create recurring tasks.

**Commands:**

- `/schedule <when> "<message>"` - Schedule a message
- `/scheduled` - List scheduled messages
- `/cancelschedule <id>` - Cancel schedule
- `/recurring <interval> "<message>"` - Create recurring task
- `/recurringtasks` - List recurring tasks
- `/cancelrecurring <id>` - Cancel recurring task

**Files:**

- `index.ts` - Main bot implementation
- `scheduler.ts` - Scheduling and recurring tasks engine
- `manifest.json` - Bot manifest

## Bot Structure

Each bot follows this structure:

```
/src/bots/my-bot/
├── index.ts           # Main bot implementation
├── commands.ts        # Command handlers (optional)
├── handlers.ts        # Event handlers (optional)
├── [module].ts        # Additional modules
└── manifest.json      # Bot manifest
```

### Bot Manifest (manifest.json)

```json
{
  "id": "my-bot",
  "name": "My Bot",
  "description": "A helpful bot",
  "version": "1.0.0",
  "author": "nself",
  "icon": "🤖",
  "permissions": ["read_messages", "send_messages"],
  "commands": [
    {
      "name": "command",
      "description": "Command description",
      "examples": ["/command arg1 arg2"]
    }
  ],
  "settings": [
    {
      "key": "setting_key",
      "label": "Setting Label",
      "type": "boolean",
      "default": true
    }
  ],
  "triggers": [
    {
      "id": "trigger-id",
      "name": "Trigger Name",
      "event": "message_created",
      "description": "Trigger description"
    }
  ]
}
```

### Bot Implementation (index.ts)

```typescript
import { bot, command } from "@/lib/bots";
import type { CommandContext, BotApi, BotResponse } from "@/lib/bots";
import { response, embed } from "@/lib/bots";
import manifest from "./manifest.json";

export function createMyBot() {
  return (
    bot(manifest.id)
      .name(manifest.name)
      .description(manifest.description)
      .version(manifest.version)
      .permissions(...manifest.permissions)

      // Commands
      .command(
        command("mycommand")
          .description("Do something")
          .stringArg("arg", "Argument description", true)
          .example("/mycommand value"),
        async (ctx: CommandContext, api: BotApi): Promise<BotResponse> => {
          return response()
            .embed(
              embed()
                .title("Success")
                .description("Command executed")
                .color("#10B981"),
            )
            .build();
        },
      )

      // Event handlers
      .onMessage(async (ctx, api) => {
        // Handle messages
      })

      .onUserJoin(async (ctx, api) => {
        // Handle user joins
      })

      // Initialization
      .onInit(async (instance, api) => {
        // Initialize bot
        // Load from storage
        // Set up intervals
        // Register cleanup
      })

      .build()
  );
}

export default createMyBot;
export { manifest };
```

## Creating a New Bot

1. **Create directory:**

```bash
mkdir -p src/bots/my-bot
cd src/bots/my-bot
```

2. **Create manifest.json** (see structure above)

3. **Create index.ts** (see structure above)

4. **Register in bot-registry.ts:**

```typescript
import { default: createMyBot, manifest } from '@/bots/my-bot'

registerBotFactory('my-bot', createMyBot, manifest, {
  category: 'Productivity',
  featured: true,
  tags: ['automation', 'productivity']
})
```

5. **Test:**

```bash
pnpm test src/bots/my-bot
```

6. **Install:**

```bash
curl -X POST http://localhost:3000/api/bots \
  -H "Content-Type: application/json" \
  -d '{"botId": "my-bot", "config": {"enabled": true}}'
```

## Bot SDK

### Import

```typescript
import {
  bot,
  command,
  response,
  embed,
  button,
  select,
  error,
  success,
  info,
  warning,
} from "@/lib/bots";
```

### Command Builder

```typescript
command("name")
  .description("Description")
  .aliases("alias1", "alias2")
  .stringArg("arg1", "String arg", required)
  .numberArg("arg2", "Number arg")
  .booleanArg("arg3", "Boolean arg")
  .durationArg("time", "Duration (e.g., 5m, 1h)")
  .choiceArg("choice", "Choice", [
    { label: "Option 1", value: "opt1" },
    { label: "Option 2", value: "opt2" },
  ])
  .example("/name arg1 arg2")
  .cooldown(30);
```

### Response Builder

```typescript
response()
  .text("Message text")
  .embed(
    embed()
      .title("Title")
      .description("Description")
      .field("Name", "Value", inline)
      .color("#10B981")
      .footer("Footer")
      .timestamp(),
  )
  .button(button("id").label("Click Me").style("primary").emoji("👍"))
  .build();
```

### Bot API

```typescript
// Messaging
await api.sendMessage(channelId, response);
await api.replyToMessage(messageId, response);

// Reactions
await api.addReaction(messageId, "👍");

// Storage
await api.setStorage("key", value);
const value = await api.getStorage("key");

// Config
const config = api.getBotConfig();
```

## Testing

```typescript
import { createMyBot } from "./index";

describe("MyBot", () => {
  it("handles commands", async () => {
    const bot = createMyBot();
    // Test implementation
  });
});
```

## Documentation

- **Complete Guide**: `/docs/Bot-Framework-Complete.md`
- **API Docs**: `/src/app/api-docs/bots/page.tsx`
- **SDK Reference**: `/src/lib/bots/`

## Support

For issues or questions:

1. Check `/docs/Bot-Framework-Complete.md`
2. Review bot examples in `/src/bots/`
3. Test with `/api/bots` endpoints

## License

MIT License
