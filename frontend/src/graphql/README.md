# GraphQL Operations Reference

This directory contains all GraphQL queries, mutations, and subscriptions for the nself-chat application.

## Overview

All GraphQL operations follow consistent patterns and use fragments for reusability. Files are organized by feature domain.

## Files Created for v1.0.0

### 1. User Management (`users.ts`)

**Queries:**

- `GET_USER` - Get a single user by ID, username, or email
- `GET_USER_BY_ID` - Get user by ID (simple)
- `GET_USER_PROFILE` - Get detailed user profile
- `GET_USERS` - Get all users with pagination and search
- `GET_ONLINE_USERS` - Get currently online users
- `GET_USER_PRESENCE` - Get user presence/status
- `GET_USERS_PRESENCE` - Get presence for multiple users
- `GET_USERS_BY_ROLE` - Get users by role
- `GET_CURRENT_USER` - Get current user with all details
- `SEARCH_USERS` - Search users by name, username, or email
- `SEARCH_USERS_FOR_MENTION` - Search users for mentions

**Mutations:**

- `UPDATE_PROFILE` - Update user profile
- `UPDATE_STATUS` - Update custom status message
- `CLEAR_STATUS` - Clear user status
- `UPDATE_PRESENCE` - Update user presence (online/away/busy/offline)
- `SET_OFFLINE` - Set user as offline
- `UPDATE_USER_SETTINGS` - Update user settings (JSON field)
- `UPDATE_NOTIFICATION_PREFERENCES` - Update notification preferences
- `UPDATE_AVATAR` - Update user avatar URL
- `UPLOAD_AVATAR` - Get presigned URL for avatar upload
- `DELETE_AVATAR` - Delete user avatar
- `DEACTIVATE_USER` - Deactivate user account
- `REACTIVATE_USER` - Reactivate user account
- `DELETE_USER` - Delete user account (hard delete, admin only)
- `UPDATE_USER_ROLE` - Update user role (admin only)

**Subscriptions:**

- `PRESENCE_SUBSCRIPTION` - Subscribe to user presence changes
- `ALL_PRESENCE_SUBSCRIPTION` - Subscribe to all online users presence
- `USERS_PRESENCE_SUBSCRIPTION` - Subscribe to specific users' presence
- `USER_STATUS_SUBSCRIPTION` - Subscribe to user status changes
- `USER_PROFILE_SUBSCRIPTION` - Subscribe to user profile updates
- `PRESENCE_STREAM_SUBSCRIPTION` - Subscribe to presence stream

### 2. Direct Messages (`dms.ts`)

**Queries:**

- `GET_USER_DMS` - Get all DMs for the current user
- `GET_DM` - Get a single DM by ID
- `GET_DM_BY_SLUG` - Get a DM by slug
- `CHECK_EXISTING_DM` - Check if DM exists between two users
- `GET_DM_MESSAGES` - Get DM messages with pagination
- `GET_TOTAL_DM_UNREAD_COUNT` - Get unread count for all DMs
- `SEARCH_DM_MESSAGES` - Search DM messages

**Mutations:**

- `CREATE_OR_GET_DM` - Create a new 1:1 DM or get existing one
- `CREATE_GROUP_DM` - Create a new group DM
- `UPDATE_DM_SETTINGS` - Update DM settings (group only)
- `ARCHIVE_DM` - Archive a DM
- `UNARCHIVE_DM` - Unarchive a DM
- `DELETE_DM` - Delete a DM (soft delete)
- `SEND_DM_MESSAGE` - Send a message
- `UPDATE_DM_MESSAGE` - Update a message
- `DELETE_DM_MESSAGE` - Delete a message (soft delete)
- `MARK_DM_AS_READ` - Mark DM as read
- `ADD_DM_PARTICIPANTS` - Add participants to group DM
- `REMOVE_DM_PARTICIPANT` - Remove participant from group DM
- `LEAVE_DM` - Leave a DM
- `UPDATE_DM_NOTIFICATION_SETTINGS` - Update notification settings
- `ADD_DM_REACTION` - Add reaction to DM message
- `REMOVE_DM_REACTION` - Remove reaction from DM message

**Subscriptions:**

- `DM_LIST_SUBSCRIPTION` - Subscribe to DM list updates
- `DM_SUBSCRIPTION` - Subscribe to a single DM updates
- `DM_MESSAGES_SUBSCRIPTION` - Subscribe to new messages in a DM
- `DM_TYPING_SUBSCRIPTION` - Subscribe to typing indicators
- `DM_UNREAD_COUNT_SUBSCRIPTION` - Subscribe to unread count

### 3. Files (`files.ts`)

**Queries:**

- `GET_FILE` - Get a single file by ID
- `GET_CHANNEL_FILES` - Get all files in a channel
- `GET_FILES_BY_TYPE` - Get files by type (images, videos, documents, etc.)
- `GET_USER_FILES` - Get recent files shared by a user
- `GET_MESSAGE_FILES` - Get attachments for a specific message
- `GET_CHANNEL_FILE_STATS` - Get file statistics for a channel
- `GET_STORAGE_USAGE` - Get storage usage for workspace
- `SEARCH_FILES` - Search files by name or type
- `GET_RECENT_FILES` - Get recent files (workspace-wide)

**Mutations:**

- `REQUEST_UPLOAD_URL` - Request presigned URL for file upload
- `CREATE_FILE` - Create file record after upload
- `CREATE_FILES` - Create multiple files at once
- `DELETE_FILE` - Delete a file
- `DELETE_MESSAGE_FILES` - Delete all files for a message
- `BULK_DELETE_FILES` - Bulk delete files
- `UPDATE_FILE_METADATA` - Update file metadata
- `GENERATE_THUMBNAIL` - Generate thumbnail for image/video
- `CONFIRM_FILE_UPLOAD` - Confirm upload completion
- `GET_DOWNLOAD_URL` - Get download URL for a file
- `UPDATE_FILE_NAME` - Update file name
- `PROCESS_FILE` - Process uploaded file (thumbnails, metadata, etc.)

**Subscriptions:**

- `CHANNEL_FILES_SUBSCRIPTION` - Subscribe to new files in a channel
- `FILE_UPLOAD_PROGRESS_SUBSCRIPTION` - Subscribe to file upload progress
- `FILES_STREAM_SUBSCRIPTION` - Subscribe to file stream

### 4. Notifications (`notifications.ts`)

**Queries:**

- `GET_NOTIFICATIONS` - Get notifications for a user
- `GET_UNREAD_COUNT` - Get unread notification count
- `GET_UNREAD_BY_CHANNEL` - Get unread counts by channel
- `GET_NOTIFICATION_PREFERENCES` - Get notification preferences
- `GET_NOTIFICATIONS_GROUPED` - Get recent notifications grouped by type

**Mutations:**

- `MARK_AS_READ` - Mark a single notification as read
- `MARK_MULTIPLE_AS_READ` - Mark multiple notifications as read
- `MARK_ALL_AS_READ` - Mark all notifications as read
- `UPDATE_NOTIFICATION_PREFERENCES` - Update notification preferences
- `MUTE_CHANNEL_NOTIFICATIONS` - Mute a channel's notifications
- `UNMUTE_CHANNEL_NOTIFICATIONS` - Unmute a channel's notifications
- `DELETE_NOTIFICATION` - Delete a notification
- `DELETE_ALL_NOTIFICATIONS` - Delete all notifications for a user
- `CREATE_NOTIFICATION` - Create a notification (server-side)
- `REGISTER_PUSH_TOKEN` - Register push notification token
- `UNREGISTER_PUSH_TOKEN` - Unregister push notification token

**Subscriptions:**

- `NOTIFICATION_SUBSCRIPTION` - Subscribe to new notifications
- `UNREAD_COUNT_SUBSCRIPTION` - Subscribe to unread count changes
- `NOTIFICATION_STREAM_SUBSCRIPTION` - Subscribe to notification stream
- `CHANNEL_UNREAD_SUBSCRIPTION` - Subscribe to channel unread updates

### 5. Reports (`reports.ts`)

**Queries:**

- `GET_REPORTS` - Get all reports (admin only)
- `GET_USER_REPORTS` - Get user reports only (admin only)
- `GET_MESSAGE_REPORTS` - Get message reports only (admin only)
- `GET_USER_REPORT` - Get a single user report by ID
- `GET_MESSAGE_REPORT` - Get a single message report by ID
- `GET_REPORTS_AGAINST_USER` - Get reports for a specific user
- `GET_REPORTS_BY_USER` - Get reports submitted by a user
- `GET_REPORT_STATS` - Get report statistics
- `CHECK_EXISTING_REPORT` - Check if user has already reported something
- `GET_PENDING_REPORTS_COUNT` - Get pending reports count

**Mutations:**

- `REPORT_USER` - Report a user
- `REPORT_MESSAGE` - Report a message
- `UPDATE_REPORT_STATUS` - Update report status (admin/moderator)
- `RESOLVE_USER_REPORT` - Resolve a user report (admin/moderator)
- `RESOLVE_MESSAGE_REPORT` - Resolve a message report (admin/moderator)
- `ESCALATE_REPORT` - Escalate a report
- `ADD_REPORT_ACTIVITY` - Add activity to a report (audit trail)
- `BULK_UPDATE_REPORTS` - Bulk update report statuses
- `DELETE_REPORT` - Delete a report (admin only)

**Subscriptions:**

- `NEW_REPORTS_SUBSCRIPTION` - Subscribe to new reports (admin only)
- `REPORT_STATUS_SUBSCRIPTION` - Subscribe to report status changes
- `PENDING_REPORTS_COUNT_SUBSCRIPTION` - Subscribe to pending reports count
- `REPORT_ACTIVITIES_SUBSCRIPTION` - Subscribe to report activities

## Type Definitions

All files include comprehensive TypeScript type definitions for variables and responses.

### Common Type Patterns

```typescript
// Query Variables
export interface GetXVariables {
  id?: string;
  limit?: number;
  offset?: number;
}

// Mutation Variables
export interface UpdateXVariables {
  id: string;
  // ... fields to update
}

// Subscription Variables
export interface XSubscriptionVariables {
  id: string;
}
```

## Usage Examples

### Using Individual Exports

```typescript
import { GET_USER_BY_ID, UPDATE_PROFILE } from "@/graphql";

// Use in Apollo Client
const { data } = useQuery(GET_USER_BY_ID, {
  variables: { id: userId },
});
```

### Using Namespace Exports

```typescript
import { users, dms, files } from "@/graphql";

// Organized by domain
const { data } = useQuery(users.GET_USER_BY_ID, {
  variables: { id: userId },
});
```

## Fragments

All operations use fragments for consistency and efficiency:

- `USER_BASIC_FRAGMENT` - Basic user info (id, username, display_name, avatar_url)
- `USER_PROFILE_FRAGMENT` - Full user profile
- `USER_PRESENCE_FRAGMENT` - User presence info
- `CHANNEL_BASIC_FRAGMENT` - Basic channel info
- `CHANNEL_FULL_FRAGMENT` - Full channel details
- `MESSAGE_BASIC_FRAGMENT` - Basic message info
- `MESSAGE_FULL_FRAGMENT` - Full message with attachments, reactions, etc.
- `ATTACHMENT_FRAGMENT` - File attachment info
- `NOTIFICATION_FRAGMENT` - Notification details
- And many more...

## Naming Conventions

- **Queries**: `GET_*`, `SEARCH_*`, `CHECK_*`
- **Mutations**: `CREATE_*`, `UPDATE_*`, `DELETE_*`, action verbs
- **Subscriptions**: `*_SUBSCRIPTION`, `*_STREAM_SUBSCRIPTION`
- **Fragments**: `*_FRAGMENT`

## Database Tables

GraphQL operations map to these database tables:

- `nchat_users` - User accounts
- `nchat_channels` - Channels
- `nchat_messages` - Messages
- `nchat_direct_messages` - Direct messages
- `nchat_dm_messages` - DM messages
- `nchat_attachments` - File attachments
- `nchat_notifications` - Notifications
- `nchat_user_reports` - User reports
- `nchat_message_reports` - Message reports
- `nchat_user_presence` - User presence
- And many more...

## Best Practices

1. **Always use fragments** - Reuse fragments for consistency
2. **Type your variables** - Use exported TypeScript types
3. **Paginate queries** - Use limit/offset for large datasets
4. **Subscribe selectively** - Only subscribe to what you need
5. **Handle errors** - All operations can fail, handle gracefully
6. **Use proper permissions** - Check RBAC before operations
7. **Optimize queries** - Only fetch fields you need
8. **Cache intelligently** - Use Apollo Client cache effectively

## Permission Levels

Many operations require specific permissions:

- **Public**: Anyone can execute
- **Authenticated**: Logged-in users only
- **Owner**: Resource owner only
- **Member**: Channel/DM member only
- **Moderator**: Moderators and above
- **Admin**: Admins and above
- **Owner**: Platform owner only

## Testing

All GraphQL operations should be tested:

```typescript
// See __tests__ directories for examples
import { MockedProvider } from '@apollo/client/testing'

const mocks = [
  {
    request: { query: GET_USER_BY_ID, variables: { id: '123' } },
    result: { data: { nchat_users_by_pk: { ... } } }
  }
]
```

## Future Enhancements

Planned additions:

- [ ] Voice/video call operations
- [ ] Screen sharing operations
- [ ] Payments/transactions
- [ ] Advanced search with filters
- [ ] AI/ML-powered features
- [ ] More granular permissions

## Related Files

- `/src/lib/apollo-client.ts` - Apollo Client setup
- `/src/contexts/auth-context.tsx` - Authentication context
- `/src/hooks/use-*.ts` - React hooks wrapping GraphQL operations
- `/src/types/*.ts` - TypeScript type definitions
