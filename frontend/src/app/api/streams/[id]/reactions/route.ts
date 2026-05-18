/**
 * Stream Reactions API Route
 *
 * POST /api/streams/[id]/reactions - Send reaction to stream
 * GET /api/streams/[id]/reactions - Get recent reactions
 *
 * Database schema uses `emoji` field (VARCHAR(10)) with direct position columns.
 * API accepts `emoji` as Unicode or reaction type names (heart, like, fire, etc.)
 * For backward compatibility, API also accepts `reaction_type` field.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nhost } from "@/lib/nhost.server";
import { logger } from "@/lib/logger";

// Valid reaction types (stored as emoji strings in database)
const VALID_REACTION_TYPES = [
  "heart",
  "like",
  "fire",
  "clap",
  "laugh",
  "wow",
  "sad",
  "angry",
] as const;
type ReactionType = (typeof VALID_REACTION_TYPES)[number];

// Map reaction type names to Unicode emojis for database storage
const REACTION_TYPE_TO_EMOJI: Record<ReactionType, string> = {
  heart: "\u2764\uFE0F",
  like: "\uD83D\uDC4D",
  fire: "\uD83D\uDD25",
  clap: "\uD83D\uDC4F",
  laugh: "\uD83D\uDE02",
  wow: "\uD83D\uDE2E",
  sad: "\uD83D\uDE22",
  angry: "\uD83D\uDE20",
};

// Emoji to reaction type mapping for normalization
const EMOJI_TO_REACTION_TYPE: Record<string, ReactionType> = {
  // Unicode emojis
  "❤️": "heart",
  "❤": "heart",
  "💖": "heart",
  "💗": "heart",
  "👍": "like",
  "👍🏻": "like",
  "👍🏼": "like",
  "👍🏽": "like",
  "👍🏾": "like",
  "👍🏿": "like",
  "🔥": "fire",
  "👏": "clap",
  "👏🏻": "clap",
  "👏🏼": "clap",
  "👏🏽": "clap",
  "👏🏾": "clap",
  "👏🏿": "clap",
  "😂": "laugh",
  "🤣": "laugh",
  "😆": "laugh",
  "😮": "wow",
  "🤯": "wow",
  "😲": "wow",
  "😢": "sad",
  "😭": "sad",
  "😠": "angry",
  "😡": "angry",
  // Text shortcuts
  heart: "heart",
  like: "like",
  fire: "fire",
  clap: "clap",
  laugh: "laugh",
  wow: "wow",
  sad: "sad",
  angry: "angry",
};

// Schema for reaction input
const reactionInputSchema = z
  .object({
    // Accept either reaction_type or emoji (for backward compatibility)
    reaction_type: z.enum(VALID_REACTION_TYPES).optional(),
    emoji: z.string().optional(),
    // Optional position metadata for animated reactions
    positionX: z.number().optional(),
    positionY: z.number().optional(),
  })
  .refine((data) => data.reaction_type || data.emoji, {
    message: "Either reaction_type or emoji is required",
  });

/**
 * Convert emoji or text to reaction_type
 */
function normalizeReactionType(input: string): ReactionType | null {
  const normalized = input.trim().toLowerCase();

  // Direct match
  if (VALID_REACTION_TYPES.includes(normalized as ReactionType)) {
    return normalized as ReactionType;
  }

  // Emoji mapping
  const mapped = EMOJI_TO_REACTION_TYPE[input.trim()];
  if (mapped) {
    return mapped;
  }

  return null;
}

/**
 * POST /api/streams/[id]/reactions
 * Send a reaction to the stream
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    // Get user from session
    const session = await nhost.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const streamId = id;
    const userId = session.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "User ID not found" }, { status: 401 });
    }

    // Validate stream ID
    if (!z.string().uuid().safeParse(streamId).success) {
      return NextResponse.json({ error: "Invalid stream ID" }, { status: 400 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = reactionInputSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validation.error.errors },
        { status: 400 },
      );
    }

    const { reaction_type, emoji, positionX, positionY } = validation.data;

    // Determine the reaction type
    let reactionType: ReactionType | null = null;

    if (reaction_type) {
      reactionType = reaction_type;
    } else if (emoji) {
      reactionType = normalizeReactionType(emoji);
    }

    if (!reactionType) {
      return NextResponse.json(
        {
          error: "Invalid reaction type",
          validTypes: VALID_REACTION_TYPES,
        },
        { status: 400 },
      );
    }

    // Verify stream is live and reactions are enabled
    const { data: streamData, error: streamError } =
      await nhost.graphql.request(
        `
        query GetStreamReactionStatus($id: uuid!) {
          nchat_streams_by_pk(id: $id) {
            status
            enable_reactions
          }
        }
      `,
        { id: streamId },
      );

    if (streamError || !streamData?.nchat_streams_by_pk) {
      return NextResponse.json({ error: "Stream not found" }, { status: 404 });
    }

    if (!streamData.nchat_streams_by_pk.enable_reactions) {
      return NextResponse.json(
        { error: "Reactions are disabled for this stream" },
        { status: 403 },
      );
    }

    if (streamData.nchat_streams_by_pk.status !== "live") {
      return NextResponse.json(
        { error: "Stream is not live" },
        { status: 400 },
      );
    }

    // Convert reaction type to emoji for database storage
    const emojiValue = REACTION_TYPE_TO_EMOJI[reactionType];

    // Insert reaction using correct schema (emoji field with direct position columns)
    const { data, error } = await nhost.graphql.request(
      `
        mutation SendStreamReaction($object: nchat_stream_reactions_insert_input!) {
          insert_nchat_stream_reactions_one(object: $object) {
            id
            stream_id
            user_id
            emoji
            position_x
            position_y
            created_at
          }
        }
      `,
      {
        object: {
          stream_id: streamId,
          user_id: userId,
          emoji: emojiValue,
          position_x: positionX ?? null,
          position_y: positionY ?? null,
        },
      },
    );

    if (error || !data?.insert_nchat_stream_reactions_one) {
      logger.error("Failed to send reaction:", error);
      return NextResponse.json(
        { error: "Failed to send reaction" },
        { status: 500 },
      );
    }

    const reaction = data.insert_nchat_stream_reactions_one;

    // Note: Stream total_reactions counter is updated by database trigger
    // (update_stream_reaction_count function in migration 025_live_streaming.sql)

    // Return response with backward-compatible fields
    return NextResponse.json({
      id: reaction.id,
      stream_id: reaction.stream_id,
      user_id: reaction.user_id,
      // Include both formats for backward compatibility
      emoji: reaction.emoji,
      reaction_type: reactionType,
      position_x: reaction.position_x,
      position_y: reaction.position_y,
      created_at: reaction.created_at,
    });
  } catch (error) {
    logger.error("Send stream reaction error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/streams/[id]/reactions
 * Get recent reactions for a stream
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const streamId = id;

    // Validate stream ID
    if (!z.string().uuid().safeParse(streamId).success) {
      return NextResponse.json({ error: "Invalid stream ID" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const since = searchParams.get("since"); // ISO timestamp

    // Build where clause
    let whereClause = "stream_id: {_eq: $streamId}";
    const variables: Record<string, unknown> = { streamId, limit };

    if (since) {
      whereClause += ", created_at: {_gt: $since}";
      variables.since = since;
    }

    // Fetch recent reactions using correct schema (emoji, position_x, position_y)
    const { data, error } = await nhost.graphql.request(
      `
        query GetStreamReactions($streamId: uuid!, $limit: Int!, $since: timestamptz) {
          nchat_stream_reactions(
            where: {${whereClause}}
            order_by: {created_at: desc}
            limit: $limit
          ) {
            id
            stream_id
            user_id
            emoji
            position_x
            position_y
            created_at
          }

          reaction_counts: nchat_stream_reactions_aggregate(
            where: {stream_id: {_eq: $streamId}}
          ) {
            aggregate {
              count
            }
          }
        }
      `,
      variables,
    );

    if (error) {
      logger.error("Failed to fetch reactions:", error);
      return NextResponse.json(
        { error: "Failed to fetch reactions" },
        { status: 500 },
      );
    }

    const reactions = data?.nchat_stream_reactions || [];
    const totalCount = data?.reaction_counts?.aggregate?.count || 0;

    // Transform reactions to include backward-compatible reaction_type field
    const transformedReactions = reactions.map(
      (r: {
        id: string;
        stream_id: string;
        user_id: string;
        emoji: string;
        position_x: number | null;
        position_y: number | null;
        created_at: string;
      }) => {
        // Convert emoji back to reaction type for backward compatibility
        const reactionType = normalizeReactionType(r.emoji);

        return {
          id: r.id,
          stream_id: r.stream_id,
          user_id: r.user_id,
          emoji: r.emoji,
          reaction_type: reactionType, // Backward compatibility
          position_x: r.position_x,
          position_y: r.position_y,
          created_at: r.created_at,
        };
      },
    );

    return NextResponse.json({
      reactions: transformedReactions,
      total: totalCount,
    });
  } catch (error) {
    logger.error("Get stream reactions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
