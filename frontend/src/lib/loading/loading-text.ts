/**
 * Loading Text Constants
 * Standard loading messages for consistent UX
 */

/**
 * Generic loading messages
 */
export const LOADING_TEXT = {
  // Generic
  LOADING: "Loading...",
  PLEASE_WAIT: "Please wait...",
  PROCESSING: "Processing...",
  WORKING: "Working on it...",
  ALMOST_DONE: "Almost done...",

  // Data operations
  LOADING_DATA: "Loading data...",
  FETCHING: "Fetching...",
  REFRESHING: "Refreshing...",
  SYNCING: "Syncing...",
  UPDATING: "Updating...",

  // Saving operations
  SAVING: "Saving...",
  SAVING_CHANGES: "Saving changes...",
  APPLYING_CHANGES: "Applying changes...",

  // Sending operations
  SENDING: "Sending...",
  SUBMITTING: "Submitting...",
  POSTING: "Posting...",

  // File operations
  UPLOADING: "Uploading...",
  DOWNLOADING: "Downloading...",
  IMPORTING: "Importing...",
  EXPORTING: "Exporting...",

  // Authentication
  SIGNING_IN: "Signing in...",
  SIGNING_OUT: "Signing out...",
  SIGNING_UP: "Creating account...",
  VERIFYING: "Verifying...",

  // Navigation
  LOADING_PAGE: "Loading page...",
  REDIRECTING: "Redirecting...",

  // Search
  SEARCHING: "Searching...",

  // Deleting
  DELETING: "Deleting...",
  REMOVING: "Removing...",

  // Initializing
  INITIALIZING: "Initializing...",
  SETTING_UP: "Setting up...",
  PREPARING: "Preparing...",

  // Connecting
  CONNECTING: "Connecting...",
  RECONNECTING: "Reconnecting...",
  DISCONNECTING: "Disconnecting...",
} as const;

/**
 * Chat-specific loading messages
 */
export const CHAT_LOADING_TEXT = {
  LOADING_MESSAGES: "Loading messages...",
  LOADING_CHANNELS: "Loading channels...",
  LOADING_MEMBERS: "Loading members...",
  LOADING_THREAD: "Loading thread...",
  LOADING_CONVERSATION: "Loading conversation...",
  SENDING_MESSAGE: "Sending message...",
  UPLOADING_FILE: "Uploading file...",
  UPLOADING_IMAGE: "Uploading image...",
  LOADING_MORE: "Loading more...",
  LOADING_OLDER: "Loading older messages...",
  JOINING_CHANNEL: "Joining channel...",
  LEAVING_CHANNEL: "Leaving channel...",
  CREATING_CHANNEL: "Creating channel...",
  DELETING_MESSAGE: "Deleting message...",
  EDITING_MESSAGE: "Updating message...",
  ADDING_REACTION: "Adding reaction...",
  STARTING_CALL: "Starting call...",
  CONNECTING_CALL: "Connecting to call...",
} as const;

/**
 * User-specific loading messages
 */
export const USER_LOADING_TEXT = {
  LOADING_PROFILE: "Loading profile...",
  UPDATING_PROFILE: "Updating profile...",
  UPLOADING_AVATAR: "Uploading avatar...",
  LOADING_SETTINGS: "Loading settings...",
  SAVING_SETTINGS: "Saving settings...",
  LOADING_PREFERENCES: "Loading preferences...",
  CHECKING_USERNAME: "Checking availability...",
  SENDING_INVITATION: "Sending invitation...",
} as const;

/**
 * Admin-specific loading messages
 */
export const ADMIN_LOADING_TEXT = {
  LOADING_USERS: "Loading users...",
  LOADING_ANALYTICS: "Loading analytics...",
  LOADING_LOGS: "Loading logs...",
  GENERATING_REPORT: "Generating report...",
  PROCESSING_BULK: "Processing bulk action...",
  UPDATING_PERMISSIONS: "Updating permissions...",
} as const;

/**
 * Success messages (for loading states that show success)
 */
export const SUCCESS_TEXT = {
  SAVED: "Saved!",
  SAVED_SUCCESSFULLY: "Saved successfully",
  UPDATED: "Updated!",
  SENT: "Sent!",
  UPLOADED: "Uploaded!",
  DELETED: "Deleted!",
  CREATED: "Created!",
  DONE: "Done!",
  COMPLETE: "Complete!",
  SUCCESS: "Success!",
} as const;

/**
 * Error messages (for loading states that show errors)
 */
export const ERROR_TEXT = {
  FAILED: "Failed",
  ERROR: "Error",
  SAVE_FAILED: "Save failed",
  LOAD_FAILED: "Load failed",
  UPLOAD_FAILED: "Upload failed",
  SEND_FAILED: "Send failed",
  DELETE_FAILED: "Delete failed",
  CONNECTION_LOST: "Connection lost",
  NETWORK_ERROR: "Network error",
  TIMEOUT: "Request timeout",
  UNKNOWN_ERROR: "Something went wrong",
  TRY_AGAIN: "Please try again",
} as const;

/**
 * Progressive loading messages (for long operations)
 */
export const PROGRESSIVE_LOADING = {
  STEP_1: "Preparing...",
  STEP_2: "Processing...",
  STEP_3: "Almost there...",
  STEP_4: "Finishing up...",
} as const;

/**
 * File upload progress messages
 */
export const UPLOAD_PROGRESS_TEXT = {
  PREPARING: "Preparing upload...",
  UPLOADING: "Uploading...",
  PROCESSING: "Processing file...",
  FINALIZING: "Finalizing...",
  COMPLETE: "Upload complete",
  FAILED: "Upload failed",
  CANCELLED: "Upload cancelled",
  PAUSED: "Upload paused",
} as const;

/**
 * Time-based loading messages
 */
export const TIME_BASED_LOADING = {
  QUICK: "This should only take a moment...",
  NORMAL: "This may take a few seconds...",
  SLOW: "This may take a minute...",
  VERY_SLOW: "This may take several minutes...",
  FIRST_TIME: "First time setup may take a while...",
} as const;

/**
 * Get a random loading message (for variety)
 */
export function getRandomLoadingText(
  category: "generic" | "chat" | "user" | "admin" = "generic",
): string {
  let messages: readonly string[];

  switch (category) {
    case "chat":
      messages = Object.values(CHAT_LOADING_TEXT);
      break;
    case "user":
      messages = Object.values(USER_LOADING_TEXT);
      break;
    case "admin":
      messages = Object.values(ADMIN_LOADING_TEXT);
      break;
    default:
      messages = Object.values(LOADING_TEXT);
  }

  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Get loading message based on duration estimate
 */
export function getLoadingTextForDuration(estimatedMs: number): string {
  if (estimatedMs < 1000) {
    return TIME_BASED_LOADING.QUICK;
  } else if (estimatedMs < 5000) {
    return TIME_BASED_LOADING.NORMAL;
  } else if (estimatedMs < 30000) {
    return TIME_BASED_LOADING.SLOW;
  } else {
    return TIME_BASED_LOADING.VERY_SLOW;
  }
}

/**
 * Format upload progress text
 */
export function formatUploadProgress(
  loaded: number,
  total: number,
  speed?: number,
): string {
  const percentage = Math.round((loaded / total) * 100);
  const loadedMB = (loaded / 1024 / 1024).toFixed(1);
  const totalMB = (total / 1024 / 1024).toFixed(1);

  let text = `${percentage}% (${loadedMB}MB / ${totalMB}MB)`;

  if (speed) {
    const speedMB = (speed / 1024 / 1024).toFixed(1);
    text += ` - ${speedMB}MB/s`;
  }

  return text;
}

/**
 * Format time remaining
 */
export function formatTimeRemaining(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)} seconds remaining`;
  } else if (seconds < 3600) {
    const minutes = Math.round(seconds / 60);
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"} remaining`;
  } else {
    const hours = Math.round(seconds / 3600);
    return `${hours} ${hours === 1 ? "hour" : "hours"} remaining`;
  }
}

/**
 * Get progressive message based on elapsed time
 */
export function getProgressiveMessage(elapsedMs: number): string {
  if (elapsedMs < 2000) {
    return PROGRESSIVE_LOADING.STEP_1;
  } else if (elapsedMs < 5000) {
    return PROGRESSIVE_LOADING.STEP_2;
  } else if (elapsedMs < 8000) {
    return PROGRESSIVE_LOADING.STEP_3;
  } else {
    return PROGRESSIVE_LOADING.STEP_4;
  }
}

/**
 * Animated dots for loading text
 */
export function animateLoadingDots(text: string, count: number = 3): string {
  const dotsCount = Math.floor(Date.now() / 500) % (count + 1);
  return text + ".".repeat(dotsCount);
}
