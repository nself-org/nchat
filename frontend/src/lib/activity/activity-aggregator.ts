/**
 * Activity Aggregator
 *
 * Utilities for aggregating similar activities into groups
 */

import type {
  Activity,
  AggregatedActivity,
  ActivityType,
  ActivityCategory,
  ActivityActor,
  ActivityActors,
} from "./activity-types";

// =============================================================================
// Types
// =============================================================================

interface AggregationConfig {
  /** Time window for aggregation in minutes */
  windowMinutes: number;
  /** Maximum activities to aggregate */
  maxActivities: number;
  /** Activity types that can be aggregated */
  aggregatableTypes: ActivityType[];
}

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_CONFIG: AggregationConfig = {
  windowMinutes: 60, // 1 hour
  maxActivities: 50,
  aggregatableTypes: [
    "reaction",
    "mention",
    "reply",
    "thread_reply",
    "member_joined",
    "member_left",
    "file_shared",
  ],
};

// =============================================================================
// Aggregation Logic
// =============================================================================

/**
 * Check if two activities can be aggregated together
 */
function canAggregate(
  activity1: Activity,
  activity2: Activity,
  config: AggregationConfig,
): boolean {
  // Must be the same type
  if (activity1.type !== activity2.type) {
    return false;
  }

  // Type must be aggregatable
  if (!config.aggregatableTypes.includes(activity1.type)) {
    return false;
  }

  // Check time window
  const time1 = new Date(activity1.createdAt).getTime();
  const time2 = new Date(activity2.createdAt).getTime();
  const diffMinutes = Math.abs(time1 - time2) / (1000 * 60);

  if (diffMinutes > config.windowMinutes) {
    return false;
  }

  // Type-specific aggregation rules
  switch (activity1.type) {
    case "reaction":
      // Aggregate reactions to the same message
      if (
        "message" in activity1 &&
        "message" in activity2 &&
        activity1.message &&
        activity2.message
      ) {
        return activity1.message.id === activity2.message.id;
      }
      return false;

    case "mention":
      // Aggregate mentions in the same channel
      if (
        "channel" in activity1 &&
        "channel" in activity2 &&
        activity1.channel &&
        activity2.channel
      ) {
        return activity1.channel.id === activity2.channel.id;
      }
      return false;

    case "reply":
    case "thread_reply":
      // Aggregate replies to the same thread
      if ("thread" in activity1 && "thread" in activity2) {
        return (activity1 as any).thread?.id === (activity2 as any).thread?.id;
      }
      if ("parentMessage" in activity1 && "parentMessage" in activity2) {
        return (
          (activity1 as any).parentMessage?.id ===
          (activity2 as any).parentMessage?.id
        );
      }
      return false;

    case "member_joined":
    case "member_left":
      // Aggregate member changes in the same channel
      if (
        "channel" in activity1 &&
        "channel" in activity2 &&
        activity1.channel &&
        activity2.channel
      ) {
        return activity1.channel.id === activity2.channel.id;
      }
      return false;

    case "file_shared":
      // Aggregate files shared in the same channel
      if (
        "channel" in activity1 &&
        "channel" in activity2 &&
        activity1.channel &&
        activity2.channel
      ) {
        return activity1.channel.id === activity2.channel.id;
      }
      return false;

    default:
      return false;
  }
}

/**
 * Create an aggregated activity from a group of activities
 */
function createAggregatedActivity(activities: Activity[]): AggregatedActivity {
  if (activities.length === 0) {
    throw new Error("Cannot create aggregated activity from empty array");
  }

  const first = activities[0];
  const last = activities[activities.length - 1];

  // Collect unique actors
  const actorMap = new Map<string, ActivityActor>();
  activities.forEach((activity) => {
    if (!actorMap.has(activity.actor.id)) {
      actorMap.set(activity.actor.id, activity.actor);
    }
  });

  const actorsList = Array.from(actorMap.values());
  const actors: ActivityActors = {
    actors: actorsList.slice(0, 5), // Show first 5 actors
    totalCount: actorsList.length,
    hasMore: actorsList.length > 5,
  };

  // Determine if all are read
  const allRead = activities.every((a) => a.isRead);

  // Calculate priority (use highest)
  const priorityOrder = ["low", "normal", "high", "urgent"];
  const maxPriority = activities.reduce(
    (max, a) => {
      const currentIndex = priorityOrder.indexOf(a.priority);
      const maxIndex = priorityOrder.indexOf(max);
      return currentIndex > maxIndex ? a.priority : max;
    },
    "low" as Activity["priority"],
  );

  // Build metadata based on type
  const metadata: AggregatedActivity["metadata"] = {};

  if (first.type === "reaction") {
    const emojis = new Set<string>();
    activities.forEach((a) => {
      if (a.type === "reaction") {
        emojis.add(a.emoji);
      }
    });
    metadata.emojis = Array.from(emojis);
  }

  if (first.type === "file_shared") {
    metadata.fileCount = activities.length;
  }

  if (first.type === "reply" || first.type === "thread_reply") {
    metadata.replyCount = activities.length;
  }

  // Get channel from first activity if available
  const channel = "channel" in first ? first.channel : undefined;
  const message = "message" in first ? first.message : undefined;
  const thread = "thread" in first ? (first as any).thread : undefined;

  // Sort activities by date (newest first)
  const sortedActivities = [...activities].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return {
    id: `agg-${first.id}-${activities.length}`,
    type: first.type,
    category: first.category,
    priority: maxPriority,
    actors,
    activities: sortedActivities,
    count: activities.length,
    latestAt: sortedActivities[0].createdAt,
    earliestAt: sortedActivities[sortedActivities.length - 1].createdAt,
    isRead: allRead,
    channel,
    message,
    thread,
    metadata,
  };
}

/**
 * Aggregate activities into groups
 */
export function aggregateActivities(
  activities: Activity[],
  config: Partial<AggregationConfig> = {},
): (Activity | AggregatedActivity)[] {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  if (activities.length === 0) {
    return [];
  }

  // Sort by date (newest first)
  const sorted = [...activities].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const result: (Activity | AggregatedActivity)[] = [];
  const processed = new Set<string>();

  for (const activity of sorted) {
    // Skip if already processed
    if (processed.has(activity.id)) {
      continue;
    }

    // Check if this activity type can be aggregated
    if (!finalConfig.aggregatableTypes.includes(activity.type)) {
      result.push(activity);
      processed.add(activity.id);
      continue;
    }

    // Find all activities that can be aggregated with this one
    const group: Activity[] = [activity];
    processed.add(activity.id);

    for (const other of sorted) {
      if (processed.has(other.id)) {
        continue;
      }

      if (group.length >= finalConfig.maxActivities) {
        break;
      }

      if (canAggregate(activity, other, finalConfig)) {
        group.push(other);
        processed.add(other.id);
      }
    }

    // If we have a group, create an aggregated activity
    if (group.length > 1) {
      result.push(createAggregatedActivity(group));
    } else {
      result.push(activity);
    }
  }

  return result;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if an item is an aggregated activity
 */
export function isAggregatedActivity(
  item: Activity | AggregatedActivity,
): item is AggregatedActivity {
  return "activities" in item && Array.isArray(item.activities);
}

/**
 * Flatten aggregated activities back to individual activities
 */
export function flattenAggregatedActivities(
  items: (Activity | AggregatedActivity)[],
): Activity[] {
  const result: Activity[] = [];

  for (const item of items) {
    if (isAggregatedActivity(item)) {
      result.push(...item.activities);
    } else {
      result.push(item);
    }
  }

  return result;
}

/**
 * Get all activity IDs from a list (including those in aggregated activities)
 */
export function getAllActivityIds(
  items: (Activity | AggregatedActivity)[],
): string[] {
  const ids: string[] = [];

  for (const item of items) {
    if (isAggregatedActivity(item)) {
      item.activities.forEach((a) => ids.push(a.id));
    } else {
      ids.push(item.id);
    }
  }

  return ids;
}

/**
 * Get unread count from activities including aggregated
 */
export function getUnreadCount(
  items: (Activity | AggregatedActivity)[],
): number {
  let count = 0;

  for (const item of items) {
    if (isAggregatedActivity(item)) {
      count += item.activities.filter((a) => !a.isRead).length;
    } else if (!item.isRead) {
      count++;
    }
  }

  return count;
}

/**
 * Split aggregated activities by read status
 */
export function splitByReadStatus(items: (Activity | AggregatedActivity)[]): {
  read: Activity[];
  unread: Activity[];
} {
  const activities = flattenAggregatedActivities(items);

  return {
    read: activities.filter((a) => a.isRead),
    unread: activities.filter((a) => !a.isRead),
  };
}

/**
 * Re-aggregate after marking activities as read
 */
export function reaggregateAfterRead(
  items: (Activity | AggregatedActivity)[],
  readIds: string[],
  config: Partial<AggregationConfig> = {},
): (Activity | AggregatedActivity)[] {
  // Flatten all activities
  const allActivities = flattenAggregatedActivities(items);

  // Mark the specified activities as read
  const updatedActivities = allActivities.map((activity) => {
    if (readIds.includes(activity.id)) {
      return {
        ...activity,
        isRead: true,
        readAt: new Date().toISOString(),
      };
    }
    return activity;
  });

  // Re-aggregate
  return aggregateActivities(updatedActivities, config);
}

// =============================================================================
// Export Configuration Type
// =============================================================================

export type { AggregationConfig };
