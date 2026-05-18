import { NextRequest, NextResponse } from "next/server";
import type {
  ImportConfig,
  ImportResult,
  ImportStats,
  ImportError,
  ImportWarning,
  UnifiedUser,
  UnifiedChannel,
  UnifiedMessage,
} from "@/lib/import-export/types";
import { logger } from "@/lib/logger";

// ============================================================================
// TYPES
// ============================================================================

interface ImportRequestBody {
  source: "slack" | "discord" | "file";
  config: ImportConfig;
  data?: {
    users?: UnifiedUser[];
    channels?: UnifiedChannel[];
    messages?: UnifiedMessage[];
  };
}

// ============================================================================
// POST /api/import - Start import process
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body: ImportRequestBody = await request.json();
    const { source, config, data } = body;

    // Validate request
    if (!source || !config) {
      return NextResponse.json(
        { error: "Missing required fields: source and config" },
        { status: 400 },
      );
    }

    if (
      !data ||
      (!data.users?.length && !data.channels?.length && !data.messages?.length)
    ) {
      return NextResponse.json(
        { error: "No data provided for import" },
        { status: 400 },
      );
    }

    // Initialize stats
    const stats: ImportStats = {
      usersImported: 0,
      usersSkipped: 0,
      usersFailed: 0,
      channelsImported: 0,
      channelsSkipped: 0,
      channelsFailed: 0,
      messagesImported: 0,
      messagesSkipped: 0,
      messagesFailed: 0,
      attachmentsImported: 0,
      attachmentsFailed: 0,
      reactionsImported: 0,
      duration: 0,
    };

    const errors: ImportError[] = [];
    const warnings: ImportWarning[] = [];
    const userIdMap: Record<string, string> = {};
    const channelIdMap: Record<string, string> = {};
    const messageIdMap: Record<string, string> = {};

    const startTime = Date.now();

    // Process users
    if (config.options.importUsers && data.users?.length) {
      for (const user of data.users) {
        try {
          // Skip bots if configured
          if (config.options.skipBots && user.isBot) {
            stats.usersSkipped++;
            continue;
          }

          // In production, this would:
          // 1. Check if user already exists (by email or external ID)
          // 2. Create new user or update existing
          // 3. Store the mapping from external ID to internal ID

          // For now, simulate successful import
          const newUserId = crypto.randomUUID();
          userIdMap[user.externalId] = newUserId;
          stats.usersImported++;
        } catch (error) {
          errors.push({
            code: "USER_IMPORT_ERROR",
            message:
              error instanceof Error
                ? error instanceof Error
                  ? error.message
                  : String(error)
                : "Failed to import user",
            item: user.externalId,
          });
          stats.usersFailed++;
        }
      }
    }

    // Process channels
    if (config.options.importChannels && data.channels?.length) {
      // Apply channel filter if specified
      const filteredChannels = config.options.channelFilter?.length
        ? data.channels.filter(
            (c) =>
              config.options.channelFilter!.includes(c.externalId) ||
              config.options.channelFilter!.includes(c.name),
          )
        : data.channels;

      for (const channel of filteredChannels) {
        try {
          // In production, this would:
          // 1. Check if channel already exists (by slug or external ID)
          // 2. Create new channel or update existing
          // 3. Store the mapping from external ID to internal ID

          // For now, simulate successful import
          const newChannelId = crypto.randomUUID();
          channelIdMap[channel.externalId] = newChannelId;
          stats.channelsImported++;
        } catch (error) {
          errors.push({
            code: "CHANNEL_IMPORT_ERROR",
            message:
              error instanceof Error
                ? error instanceof Error
                  ? error.message
                  : String(error)
                : "Failed to import channel",
            item: channel.externalId,
          });
          stats.channelsFailed++;
        }
      }
    }

    // Process messages
    if (config.options.importMessages && data.messages?.length) {
      // Apply date range filter if specified
      let filteredMessages = data.messages;
      if (config.options.dateRange) {
        const { start, end } = config.options.dateRange;
        filteredMessages = filteredMessages.filter((m) => {
          const msgDate = new Date(m.createdAt);
          if (start && msgDate < new Date(start)) return false;
          if (end && msgDate > new Date(end)) return false;
          return true;
        });
      }

      // Skip system messages if configured
      if (config.options.skipSystemMessages) {
        filteredMessages = filteredMessages.filter((m) => m.type !== "system");
      }

      // Filter by selected channels
      if (config.options.channelFilter?.length) {
        filteredMessages = filteredMessages.filter((m) =>
          config.options.channelFilter!.includes(m.channelId),
        );
      }

      for (const message of filteredMessages) {
        try {
          // Get mapped IDs
          const mappedChannelId = channelIdMap[message.channelId];
          const mappedUserId = userIdMap[message.userId];

          if (!mappedChannelId) {
            stats.messagesSkipped++;
            continue;
          }

          // In production, this would:
          // 1. Create the message with mapped channel/user IDs
          // 2. Handle thread relationships
          // 3. Import attachments and reactions

          // For now, simulate successful import
          const newMessageId = crypto.randomUUID();
          messageIdMap[message.externalId] = newMessageId;
          stats.messagesImported++;

          // Count attachments
          if (config.options.importAttachments && message.attachments?.length) {
            stats.attachmentsImported += message.attachments.length;
          }

          // Count reactions
          if (config.options.importReactions && message.reactions?.length) {
            stats.reactionsImported += message.reactions.reduce(
              (sum, r) => sum + r.count,
              0,
            );
          }
        } catch (error) {
          errors.push({
            code: "MESSAGE_IMPORT_ERROR",
            message:
              error instanceof Error
                ? error instanceof Error
                  ? error.message
                  : String(error)
                : "Failed to import message",
            item: message.externalId,
          });
          stats.messagesFailed++;
        }
      }
    }

    stats.duration = Date.now() - startTime;

    // Add warning if some items were skipped
    if (stats.usersSkipped > 0) {
      warnings.push({
        code: "USERS_SKIPPED",
        message: `${stats.usersSkipped} users were skipped (bots or duplicates)`,
      });
    }

    if (stats.messagesSkipped > 0) {
      warnings.push({
        code: "MESSAGES_SKIPPED",
        message: `${stats.messagesSkipped} messages were skipped (missing channel mapping)`,
      });
    }

    const result: ImportResult = {
      success: errors.length === 0,
      stats,
      errors,
      warnings,
      userIdMap,
      channelIdMap,
      messageIdMap,
    };

    return NextResponse.json(result);
  } catch (error) {
    logger.error("Error in POST /api/import:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// ============================================================================
// GET /api/import - Get import status (for polling during long imports)
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const importId = searchParams.get("id");

    if (!importId) {
      return NextResponse.json({ error: "Missing import ID" }, { status: 400 });
    }

    // In production, this would:
    // 1. Look up the import job by ID
    // 2. Return current progress and status
    // 3. Support long-running imports with background processing

    // For now, return a mock status
    return NextResponse.json({
      id: importId,
      status: "completed",
      progress: 100,
      stats: {
        usersImported: 0,
        channelsImported: 0,
        messagesImported: 0,
      },
    });
  } catch (error) {
    logger.error("Error in GET /api/import:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
