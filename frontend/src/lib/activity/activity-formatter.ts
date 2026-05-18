/**
 * Activity Formatter
 *
 * Utilities for formatting activity text and descriptions
 */

import type {
  Activity,
  ActivityType,
  AggregatedActivity,
  ActivityActor,
  ActivityActors,
} from "./activity-types";

// =============================================================================
// Actor Name Formatting
// =============================================================================

/**
 * Format a single actor's name
 */
export function formatActorName(actor: ActivityActor): string {
  return actor.displayName || actor.username || "Unknown user";
}

/**
 * Format multiple actors' names
 * Returns: "Alice", "Alice and Bob", "Alice, Bob, and 3 others"
 */
export function formatActorNames(actors: ActivityActors, maxNames = 2): string {
  const { actors: actorList, totalCount } = actors;

  if (actorList.length === 0) {
    return "Someone";
  }

  if (actorList.length === 1) {
    return formatActorName(actorList[0]);
  }

  if (actorList.length === 2 && totalCount === 2) {
    return `${formatActorName(actorList[0])} and ${formatActorName(actorList[1])}`;
  }

  const visibleNames = actorList.slice(0, maxNames).map(formatActorName);
  const remaining = totalCount - maxNames;

  if (remaining <= 0) {
    const lastName = visibleNames.pop();
    return `${visibleNames.join(", ")}, and ${lastName}`;
  }

  const othersText = remaining === 1 ? "1 other" : `${remaining} others`;
  return `${visibleNames.join(", ")}, and ${othersText}`;
}

// =============================================================================
// Activity Text Formatting
// =============================================================================

/**
 * Get the action verb for an activity type
 */
export function getActivityVerb(type: ActivityType): string {
  const verbs: Record<ActivityType, string> = {
    message: "sent a message",
    reaction: "reacted",
    mention: "mentioned you",
    reply: "replied",
    thread_reply: "replied in a thread",
    channel_created: "created a channel",
    channel_archived: "archived a channel",
    channel_unarchived: "unarchived a channel",
    member_joined: "joined",
    member_left: "left",
    member_invited: "was invited to",
    file_shared: "shared a file",
    call_started: "started a call",
    call_ended: "ended a call",
    reminder_due: "Reminder",
    task_completed: "completed a task",
    task_assigned: "assigned a task",
    integration_event: "integration event",
    system: "System notification",
  };

  return verbs[type] || "activity";
}

/**
 * Format a single activity into a readable text
 */
export function formatActivityText(activity: Activity): string {
  const actorName = formatActorName(activity.actor);

  switch (activity.type) {
    case "message":
      return `${actorName} sent a message in #${activity.channel.name}`;

    case "reaction":
      return `${actorName} reacted ${activity.emoji} to your message`;

    case "mention":
      if (activity.mentionType === "everyone") {
        return `${actorName} mentioned @everyone in #${activity.channel.name}`;
      }
      if (activity.mentionType === "here") {
        return `${actorName} mentioned @here in #${activity.channel.name}`;
      }
      return `${actorName} mentioned you in #${activity.channel.name}`;

    case "reply":
      return `${actorName} replied to your message`;

    case "thread_reply":
      return `${actorName} replied in a thread you're following`;

    case "channel_created":
      return `${actorName} created #${activity.channel.name}`;

    case "channel_archived":
      return `${actorName} archived #${activity.channel.name}`;

    case "channel_unarchived":
      return `${actorName} unarchived #${activity.channel.name}`;

    case "member_joined":
      if (activity.invitedBy) {
        return `${actorName} was added to #${activity.channel.name} by ${formatActorName(activity.invitedBy)}`;
      }
      return `${actorName} joined #${activity.channel.name}`;

    case "member_left":
      if (activity.removedBy) {
        if (activity.reason === "kicked") {
          return `${actorName} was removed from #${activity.channel.name}`;
        }
        if (activity.reason === "banned") {
          return `${actorName} was banned from #${activity.channel.name}`;
        }
      }
      return `${actorName} left #${activity.channel.name}`;

    case "member_invited":
      return `${actorName} invited ${formatActorName(activity.invitee)} to #${activity.channel.name}`;

    case "file_shared":
      return `${actorName} shared "${activity.file.name}" in #${activity.channel.name}`;

    case "call_started":
      const callType =
        activity.call.type === "video" ? "video call" : "voice call";
      return `${actorName} started a ${callType} in #${activity.channel.name}`;

    case "call_ended":
      if (activity.call.duration) {
        const duration = formatCallDuration(activity.call.duration);
        return `Call ended after ${duration}`;
      }
      return `Call ended in #${activity.channel.name}`;

    case "reminder_due":
      return activity.reminderText;

    case "task_completed":
      return `${actorName} completed "${activity.task.title}"`;

    case "task_assigned":
      if (activity.task.assignee) {
        return `${actorName} assigned "${activity.task.title}" to ${formatActorName(activity.task.assignee)}`;
      }
      return `${actorName} created task "${activity.task.title}"`;

    case "integration_event":
      return `${activity.integration.name}: ${activity.integration.eventType}`;

    case "system":
      return activity.title;

    default:
      return `${actorName} performed an action`;
  }
}

/**
 * Format an aggregated activity into a readable text
 */
export function formatAggregatedActivityText(
  aggregated: AggregatedActivity,
): string {
  const actorNames = formatActorNames(aggregated.actors);
  const count = aggregated.count;

  switch (aggregated.type) {
    case "reaction":
      if (
        aggregated.metadata?.emojis &&
        aggregated.metadata.emojis.length > 0
      ) {
        const emojis = aggregated.metadata.emojis.slice(0, 3).join(" ");
        return `${actorNames} reacted ${emojis} to your message`;
      }
      return `${actorNames} reacted to your message`;

    case "mention":
      if (count === 1) {
        return `${actorNames} mentioned you`;
      }
      return `${count} mentions from ${actorNames}`;

    case "reply":
    case "thread_reply":
      if (count === 1) {
        return `${actorNames} replied`;
      }
      return `${count} new replies from ${actorNames}`;

    case "file_shared":
      if (aggregated.metadata?.fileCount && aggregated.metadata.fileCount > 1) {
        return `${actorNames} shared ${aggregated.metadata.fileCount} files`;
      }
      return `${actorNames} shared a file`;

    case "member_joined":
      if (count === 1) {
        return `${actorNames} joined`;
      }
      return `${count} people joined`;

    default:
      if (count === 1) {
        return formatActivityText(aggregated.activities[0]);
      }
      return `${count} activities from ${actorNames}`;
  }
}

/**
 * Get a short description for an activity (for tooltips, notifications)
 */
export function formatActivityDescription(activity: Activity): string {
  switch (activity.type) {
    case "message":
    case "mention":
    case "reply":
    case "thread_reply":
      return (
        activity.message.contentPreview ||
        truncateText(activity.message.content, 100)
      );

    case "file_shared":
      return `${activity.file.name} (${formatFileSize(activity.file.size)})`;

    case "task_completed":
    case "task_assigned":
      return activity.task.description || activity.task.title;

    case "system":
      return activity.body;

    default:
      return "";
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Truncate text to a maximum length
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + units[i];
}

/**
 * Format call duration in human readable format
 */
export function formatCallDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

/**
 * Get emoji for activity type
 */
export function getActivityEmoji(type: ActivityType): string {
  const emojis: Record<ActivityType, string> = {
    message: "",
    reaction: "",
    mention: "@",
    reply: "",
    thread_reply: "",
    channel_created: "#",
    channel_archived: "",
    channel_unarchived: "",
    member_joined: "",
    member_left: "",
    member_invited: "",
    file_shared: "",
    call_started: "",
    call_ended: "",
    reminder_due: "",
    task_completed: "",
    task_assigned: "",
    integration_event: "",
    system: "",
  };

  return emojis[type] || "";
}

/**
 * Get action URL for an activity
 */
export function getActivityActionUrl(activity: Activity): string | null {
  switch (activity.type) {
    case "message":
    case "mention":
    case "reply":
      return `/chat/${activity.channel.slug}?message=${activity.message.id}`;

    case "thread_reply":
      return `/chat/${activity.channel.slug}?thread=${activity.thread.parentMessageId}`;

    case "channel_created":
    case "channel_archived":
    case "channel_unarchived":
    case "member_joined":
    case "member_left":
    case "member_invited":
      return `/chat/${activity.channel.slug}`;

    case "file_shared":
      if (activity.message) {
        return `/chat/${activity.channel.slug}?message=${activity.message.id}`;
      }
      return `/chat/${activity.channel.slug}`;

    case "call_started":
    case "call_ended":
      return `/chat/${activity.channel.slug}`;

    case "task_completed":
    case "task_assigned":
      return `/tasks/${activity.task.id}`;

    case "system":
      return activity.actionUrl || null;

    default:
      return null;
  }
}
