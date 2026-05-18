/**
 * Activity Feed Types
 *
 * TypeScript type definitions for the activity feed system
 */

// =============================================================================
// Activity Type Enums
// =============================================================================

/**
 * All possible activity types in the system
 */
export type ActivityType =
  | "message"
  | "reaction"
  | "mention"
  | "reply"
  | "thread_reply"
  | "channel_created"
  | "channel_archived"
  | "channel_unarchived"
  | "member_joined"
  | "member_left"
  | "member_invited"
  | "file_shared"
  | "call_started"
  | "call_ended"
  | "reminder_due"
  | "task_completed"
  | "task_assigned"
  | "integration_event"
  | "system";

/**
 * Activity categories for filtering
 */
export type ActivityCategory =
  | "all"
  | "mentions"
  | "threads"
  | "reactions"
  | "files"
  | "channels"
  | "members"
  | "calls"
  | "tasks"
  | "integrations";

/**
 * Activity priority levels
 */
export type ActivityPriority = "low" | "normal" | "high" | "urgent";

// =============================================================================
// User & Actor Types
// =============================================================================

/**
 * Basic user information for activity displays
 */
export interface ActivityActor {
  id: string;
  username?: string;
  displayName: string;
  avatarUrl?: string;
  email?: string;
}

/**
 * Multiple actors for aggregated activities
 */
export interface ActivityActors {
  actors: ActivityActor[];
  totalCount: number;
  hasMore: boolean;
}

// =============================================================================
// Context Types
// =============================================================================

/**
 * Channel context for an activity
 */
export interface ActivityChannel {
  id: string;
  name: string;
  slug: string;
  type: "public" | "private" | "direct";
  isArchived?: boolean;
}

/**
 * Message context for an activity
 */
export interface ActivityMessage {
  id: string;
  content: string;
  contentPreview?: string;
  userId: string;
  channelId: string;
  threadId?: string;
  createdAt: string;
  user?: ActivityActor;
}

/**
 * Thread context for an activity
 */
export interface ActivityThread {
  id: string;
  channelId: string;
  parentMessageId: string;
  replyCount: number;
  participantCount: number;
}

/**
 * File context for file-related activities
 */
export interface ActivityFile {
  id: string;
  name: string;
  type: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
}

/**
 * Call context for call-related activities
 */
export interface ActivityCall {
  id: string;
  type: "voice" | "video";
  duration?: number;
  participantCount?: number;
  endedAt?: string;
}

/**
 * Task context for task-related activities
 */
export interface ActivityTask {
  id: string;
  title: string;
  description?: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  dueAt?: string;
  assignee?: ActivityActor;
}

/**
 * Integration context for integration events
 */
export interface ActivityIntegration {
  id: string;
  name: string;
  type: "github" | "jira" | "slack" | "google_drive" | "custom";
  iconUrl?: string;
  eventType: string;
  eventData?: Record<string, unknown>;
}

// =============================================================================
// Core Activity Types
// =============================================================================

/**
 * Base activity interface - all activities extend this
 */
export interface BaseActivity {
  id: string;
  type: ActivityType;
  category: ActivityCategory;
  priority: ActivityPriority;
  actor: ActivityActor;
  createdAt: string;
  isRead: boolean;
  readAt?: string;
  isArchived?: boolean;
  archivedAt?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Message activity - new message in a channel
 */
export interface MessageActivity extends BaseActivity {
  type: "message";
  category: "all";
  message: ActivityMessage;
  channel: ActivityChannel;
}

/**
 * Reaction activity - someone reacted to a message
 */
export interface ReactionActivity extends BaseActivity {
  type: "reaction";
  category: "reactions";
  emoji: string;
  message: ActivityMessage;
  channel: ActivityChannel;
}

/**
 * Mention activity - user was mentioned
 */
export interface MentionActivity extends BaseActivity {
  type: "mention";
  category: "mentions";
  mentionType: "user" | "everyone" | "here" | "channel";
  message: ActivityMessage;
  channel: ActivityChannel;
  thread?: ActivityThread;
}

/**
 * Reply activity - reply to user's message
 */
export interface ReplyActivity extends BaseActivity {
  type: "reply";
  category: "threads";
  message: ActivityMessage;
  parentMessage: ActivityMessage;
  channel: ActivityChannel;
}

/**
 * Thread reply activity - reply in a thread user participates in
 */
export interface ThreadReplyActivity extends BaseActivity {
  type: "thread_reply";
  category: "threads";
  message: ActivityMessage;
  thread: ActivityThread;
  channel: ActivityChannel;
}

/**
 * Channel created activity
 */
export interface ChannelCreatedActivity extends BaseActivity {
  type: "channel_created";
  category: "channels";
  channel: ActivityChannel;
}

/**
 * Channel archived activity
 */
export interface ChannelArchivedActivity extends BaseActivity {
  type: "channel_archived";
  category: "channels";
  channel: ActivityChannel;
}

/**
 * Channel unarchived activity
 */
export interface ChannelUnarchivedActivity extends BaseActivity {
  type: "channel_unarchived";
  category: "channels";
  channel: ActivityChannel;
}

/**
 * Member joined activity
 */
export interface MemberJoinedActivity extends BaseActivity {
  type: "member_joined";
  category: "members";
  channel: ActivityChannel;
  invitedBy?: ActivityActor;
}

/**
 * Member left activity
 */
export interface MemberLeftActivity extends BaseActivity {
  type: "member_left";
  category: "members";
  channel: ActivityChannel;
  removedBy?: ActivityActor;
  reason?: "left" | "kicked" | "banned";
}

/**
 * Member invited activity
 */
export interface MemberInvitedActivity extends BaseActivity {
  type: "member_invited";
  category: "members";
  channel: ActivityChannel;
  invitee: ActivityActor;
}

/**
 * File shared activity
 */
export interface FileSharedActivity extends BaseActivity {
  type: "file_shared";
  category: "files";
  file: ActivityFile;
  message?: ActivityMessage;
  channel: ActivityChannel;
}

/**
 * Call started activity
 */
export interface CallStartedActivity extends BaseActivity {
  type: "call_started";
  category: "calls";
  call: ActivityCall;
  channel: ActivityChannel;
}

/**
 * Call ended activity
 */
export interface CallEndedActivity extends BaseActivity {
  type: "call_ended";
  category: "calls";
  call: ActivityCall;
  channel: ActivityChannel;
}

/**
 * Reminder due activity
 */
export interface ReminderDueActivity extends BaseActivity {
  type: "reminder_due";
  category: "all";
  reminderText: string;
  message?: ActivityMessage;
  channel?: ActivityChannel;
}

/**
 * Task completed activity
 */
export interface TaskCompletedActivity extends BaseActivity {
  type: "task_completed";
  category: "tasks";
  task: ActivityTask;
  channel?: ActivityChannel;
}

/**
 * Task assigned activity
 */
export interface TaskAssignedActivity extends BaseActivity {
  type: "task_assigned";
  category: "tasks";
  task: ActivityTask;
  assignedBy: ActivityActor;
  channel?: ActivityChannel;
}

/**
 * Integration event activity
 */
export interface IntegrationEventActivity extends BaseActivity {
  type: "integration_event";
  category: "integrations";
  integration: ActivityIntegration;
  channel?: ActivityChannel;
}

/**
 * System activity - system notifications
 */
export interface SystemActivity extends BaseActivity {
  type: "system";
  category: "all";
  title: string;
  body: string;
  actionUrl?: string;
}

/**
 * Union type of all activity types
 */
export type Activity =
  | MessageActivity
  | ReactionActivity
  | MentionActivity
  | ReplyActivity
  | ThreadReplyActivity
  | ChannelCreatedActivity
  | ChannelArchivedActivity
  | ChannelUnarchivedActivity
  | MemberJoinedActivity
  | MemberLeftActivity
  | MemberInvitedActivity
  | FileSharedActivity
  | CallStartedActivity
  | CallEndedActivity
  | ReminderDueActivity
  | TaskCompletedActivity
  | TaskAssignedActivity
  | IntegrationEventActivity
  | SystemActivity;

// =============================================================================
// Aggregated Activity Types
// =============================================================================

/**
 * Aggregated activity - groups similar activities
 */
export interface AggregatedActivity {
  id: string;
  type: ActivityType;
  category: ActivityCategory;
  priority: ActivityPriority;
  actors: ActivityActors;
  activities: Activity[];
  count: number;
  latestAt: string;
  earliestAt: string;
  isRead: boolean;
  channel?: ActivityChannel;
  message?: ActivityMessage;
  thread?: ActivityThread;
  metadata?: {
    emojis?: string[];
    fileCount?: number;
    replyCount?: number;
  };
}

// =============================================================================
// Activity Feed Types
// =============================================================================

/**
 * Activity filter options
 */
export interface ActivityFilters {
  category?: ActivityCategory;
  types?: ActivityType[];
  channelIds?: string[];
  userIds?: string[];
  isRead?: boolean;
  priority?: ActivityPriority[];
  dateFrom?: string;
  dateTo?: string;
  searchQuery?: string;
}

/**
 * Activity sort options
 */
export type ActivitySortField = "createdAt" | "priority" | "type";
export type ActivitySortOrder = "asc" | "desc";

export interface ActivitySort {
  field: ActivitySortField;
  order: ActivitySortOrder;
}

/**
 * Activity pagination
 */
export interface ActivityPagination {
  limit: number;
  offset: number;
  cursor?: string;
}

/**
 * Activity feed state
 */
export interface ActivityFeedState {
  activities: Activity[];
  aggregatedActivities: AggregatedActivity[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  totalCount: number;
  unreadCount: number;
  lastFetchedAt: string | null;
}

/**
 * Activity feed options
 */
export interface ActivityFeedOptions {
  filters?: ActivityFilters;
  sort?: ActivitySort;
  pagination?: ActivityPagination;
  aggregate?: boolean;
  aggregateWindow?: number; // Time window in minutes
  realtime?: boolean;
}

// =============================================================================
// Activity Preferences
// =============================================================================

/**
 * User preferences for activity types
 */
export interface ActivityTypePreference {
  type: ActivityType;
  enabled: boolean;
  showDesktop: boolean;
  playSound: boolean;
  emailDigest: boolean;
}

/**
 * User activity preferences
 */
export interface ActivityPreferences {
  // Global settings
  enabled: boolean;
  aggregateEnabled: boolean;
  aggregateWindow: number; // minutes
  showPreview: boolean;

  // Type-specific settings
  typePreferences: Partial<Record<ActivityType, ActivityTypePreference>>;

  // Channel-specific overrides
  channelOverrides: Record<
    string,
    {
      enabled: boolean;
      types?: ActivityType[];
    }
  >;

  // Display settings
  groupByDate: boolean;
  showAvatars: boolean;
  compactMode: boolean;

  // Auto-mark as read settings
  autoMarkRead: boolean;
  autoMarkReadDelay: number; // milliseconds
}

// =============================================================================
// Component Props Types
// =============================================================================

/**
 * Props for ActivityFeed component
 */
export interface ActivityFeedProps {
  className?: string;
  options?: ActivityFeedOptions;
  onActivityClick?: (activity: Activity) => void;
  onMarkAsRead?: (activityId: string) => void;
  onMarkAllAsRead?: () => void;
  emptyComponent?: React.ReactNode;
  loadingComponent?: React.ReactNode;
}

/**
 * Props for ActivityItem component
 */
export interface ActivityItemProps {
  activity: Activity | AggregatedActivity;
  compact?: boolean;
  showAvatar?: boolean;
  showChannel?: boolean;
  showTimestamp?: boolean;
  onClick?: () => void;
  onMarkAsRead?: () => void;
}

/**
 * Props for ActivityList component
 */
export interface ActivityListProps {
  activities: (Activity | AggregatedActivity)[];
  groupByDate?: boolean;
  compact?: boolean;
  onActivityClick?: (activity: Activity | AggregatedActivity) => void;
  onMarkAsRead?: (activityId: string) => void;
}

/**
 * Props for ActivityFilters component
 */
export interface ActivityFiltersProps {
  filters: ActivityFilters;
  onChange: (filters: ActivityFilters) => void;
  availableCategories?: ActivityCategory[];
  showSearch?: boolean;
  showDateRange?: boolean;
}

/**
 * Props for ActivityTimeline component
 */
export interface ActivityTimelineProps {
  activities: (Activity | AggregatedActivity)[];
  className?: string;
  showConnector?: boolean;
  onActivityClick?: (activity: Activity | AggregatedActivity) => void;
}

/**
 * Props for ActivityCard component
 */
export interface ActivityCardProps {
  activity: Activity | AggregatedActivity;
  expanded?: boolean;
  showActions?: boolean;
  onClose?: () => void;
  onJumpToContext?: () => void;
  onMarkAsRead?: () => void;
}

/**
 * Props for ActivityIcon component
 */
export interface ActivityIconProps {
  type: ActivityType;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Props for ActivityDate component
 */
export interface ActivityDateProps {
  date: string;
  className?: string;
  format?: "relative" | "absolute" | "smart";
}

/**
 * Props for ActivityAvatar component
 */
export interface ActivityAvatarProps {
  actor: ActivityActor;
  actors?: ActivityActors;
  size?: "sm" | "md" | "lg";
  showOverflow?: boolean;
  maxVisible?: number;
  className?: string;
}

/**
 * Props for UnreadActivities component
 */
export interface UnreadActivitiesProps {
  count: number;
  onClick?: () => void;
  className?: string;
  showBadge?: boolean;
  animate?: boolean;
}

/**
 * Props for ActivityEmpty component
 */
export interface ActivityEmptyProps {
  category?: ActivityCategory;
  className?: string;
  title?: string;
  description?: string;
  showIcon?: boolean;
}

/**
 * Props for ActivityLoading component
 */
export interface ActivityLoadingProps {
  count?: number;
  compact?: boolean;
  className?: string;
}

// =============================================================================
// Date Grouping Types
// =============================================================================

/**
 * Grouped activities by date
 */
export interface DateGroupedActivities {
  date: string;
  label: string;
  activities: (Activity | AggregatedActivity)[];
}

/**
 * Activity date group labels
 */
export type ActivityDateGroup =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "this_month"
  | "older";

// =============================================================================
// Socket Event Types
// =============================================================================

/**
 * Activity socket events
 */
export const ActivitySocketEvents = {
  ACTIVITY_NEW: "activity:new",
  ACTIVITY_READ: "activity:read",
  ACTIVITY_READ_ALL: "activity:read:all",
  ACTIVITY_DELETE: "activity:delete",
  ACTIVITY_SYNC: "activity:sync",
  UNREAD_COUNT_UPDATE: "activity:unread:update",
} as const;

export type ActivitySocketEventName =
  (typeof ActivitySocketEvents)[keyof typeof ActivitySocketEvents];

/**
 * Activity new event payload
 */
export interface ActivityNewEvent {
  activity: Activity;
}

/**
 * Activity read event payload
 */
export interface ActivityReadEvent {
  activityId: string;
  readAt: string;
}

/**
 * Activity read all event payload
 */
export interface ActivityReadAllEvent {
  readAt: string;
  count: number;
}

/**
 * Activity delete event payload
 */
export interface ActivityDeleteEvent {
  activityId: string;
  deletedAt: string;
}

/**
 * Activity sync event payload
 */
export interface ActivitySyncEvent {
  activities: Activity[];
  unreadCount: number;
  timestamp: string;
}

/**
 * Unread count update event payload
 */
export interface UnreadCountUpdateEvent {
  total: number;
  byCategory: Partial<Record<ActivityCategory, number>>;
}
