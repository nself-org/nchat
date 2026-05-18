/**
 * App Registry - Sample apps for the nchat app marketplace
 *
 * Contains built-in apps and sample integrations for demonstration
 */

import type { App, AppDeveloper, AppCategory } from "./app-types";
import { CATEGORY_IDS } from "./app-categories";
import { createPermission } from "./app-permissions";

// ============================================================================
// Developer Profiles
// ============================================================================

const NCHAT_DEVELOPER: AppDeveloper = {
  id: "nchat",
  name: "nchat",
  email: "apps@nchat.dev",
  website: "https://nchat.dev",
  verified: true,
  avatarUrl: "/images/nchat-logo.svg",
};

const GITHUB_DEVELOPER: AppDeveloper = {
  id: "github",
  name: "GitHub",
  email: "support@github.com",
  website: "https://github.com",
  verified: true,
  avatarUrl: "/images/apps/github-logo.svg",
};

const JIRA_DEVELOPER: AppDeveloper = {
  id: "atlassian",
  name: "Atlassian",
  email: "support@atlassian.com",
  website: "https://atlassian.com",
  verified: true,
  avatarUrl: "/images/apps/atlassian-logo.svg",
};

const GOOGLE_DEVELOPER: AppDeveloper = {
  id: "google",
  name: "Google",
  email: "support@google.com",
  website: "https://google.com",
  verified: true,
  avatarUrl: "/images/apps/google-logo.svg",
};

const TRELLO_DEVELOPER: AppDeveloper = {
  id: "trello",
  name: "Trello",
  email: "support@trello.com",
  website: "https://trello.com",
  verified: true,
  avatarUrl: "/images/apps/trello-logo.svg",
};

// ============================================================================
// Helper to create category reference
// ============================================================================

function makeCategory(id: string, name: string): AppCategory {
  return {
    id,
    name,
    slug: id,
    description: "",
    icon: "Box",
    color: "#6b7280",
    appCount: 0,
  };
}

// ============================================================================
// Built-in Apps
// ============================================================================

export const BUILT_IN_APPS: App[] = [
  {
    id: "polls",
    name: "Polls",
    slug: "polls",
    shortDescription: "Create and manage polls in any channel",
    longDescription: `Create engaging polls to gather feedback from your team. Polls supports single choice, multiple choice, and anonymous voting options.

Features:
- Create polls with /poll command
- Single or multiple choice options
- Anonymous voting support
- Real-time vote counting
- Automatic poll closing
- Results export`,
    type: "bot",
    status: "active",
    visibility: "public",
    pricing: "free",
    icon: "/images/apps/polls-icon.svg",
    developer: NCHAT_DEVELOPER,
    categories: [makeCategory(CATEGORY_IDS.PRODUCTIVITY, "Productivity")],
    tags: [
      { id: "polls", name: "polls", slug: "polls" },
      { id: "voting", name: "voting", slug: "voting" },
      { id: "feedback", name: "feedback", slug: "feedback" },
    ],
    permissions: [
      createPermission("messages:read", "required", "To detect poll commands"),
      createPermission("messages:write", "required", "To post poll messages"),
      createPermission("reactions:read", "required", "To track votes"),
      createPermission(
        "commands:register",
        "required",
        "To register /poll command",
      ),
    ],
    screenshots: [
      {
        id: "1",
        url: "/images/apps/polls/screenshot-1.png",
        caption: "Creating a poll",
        order: 1,
      },
      {
        id: "2",
        url: "/images/apps/polls/screenshot-2.png",
        caption: "Poll results",
        order: 2,
      },
    ],
    currentVersion: "1.2.0",
    versions: [
      {
        version: "1.2.0",
        releaseDate: "2024-01-15",
        changelog: "Added anonymous voting support",
      },
      {
        version: "1.1.0",
        releaseDate: "2024-01-01",
        changelog: "Multiple choice polls",
      },
      {
        version: "1.0.0",
        releaseDate: "2023-12-01",
        changelog: "Initial release",
      },
    ],
    stats: {
      installs: 15420,
      activeInstalls: 12350,
      rating: 4.8,
      ratingCount: 523,
      reviewCount: 156,
    },
    links: { documentation: "https://docs.nchat.dev/apps/polls" },
    requirements: {},
    features: [
      "Slash commands",
      "Real-time updates",
      "Anonymous voting",
      "Results export",
    ],
    createdAt: "2023-12-01T00:00:00Z",
    updatedAt: "2024-01-15T00:00:00Z",
    publishedAt: "2023-12-01T00:00:00Z",
    featured: true,
    verified: true,
    builtIn: true,
  },
  {
    id: "reminders",
    name: "Reminders",
    slug: "reminders",
    shortDescription: "Set personal and channel reminders",
    longDescription: `Never miss important tasks or messages. Set reminders for yourself or your team with natural language commands.

Features:
- /remind command for quick reminders
- Natural language time parsing
- Recurring reminders
- Channel reminders
- Snooze functionality
- Reminder management`,
    type: "bot",
    status: "active",
    visibility: "public",
    pricing: "free",
    icon: "/images/apps/reminders-icon.svg",
    developer: NCHAT_DEVELOPER,
    categories: [makeCategory(CATEGORY_IDS.PRODUCTIVITY, "Productivity")],
    tags: [
      { id: "reminders", name: "reminders", slug: "reminders" },
      { id: "tasks", name: "tasks", slug: "tasks" },
      { id: "scheduling", name: "scheduling", slug: "scheduling" },
    ],
    permissions: [
      createPermission(
        "messages:read",
        "required",
        "To detect reminder commands",
      ),
      createPermission(
        "messages:write",
        "required",
        "To send reminder notifications",
      ),
      createPermission(
        "notifications:send",
        "required",
        "To send push notifications",
      ),
      createPermission(
        "commands:register",
        "required",
        "To register /remind command",
      ),
    ],
    screenshots: [],
    currentVersion: "2.0.1",
    versions: [
      { version: "2.0.1", releaseDate: "2024-01-10", changelog: "Bug fixes" },
      {
        version: "2.0.0",
        releaseDate: "2024-01-01",
        changelog: "Added recurring reminders",
      },
    ],
    stats: {
      installs: 23150,
      activeInstalls: 19800,
      rating: 4.7,
      ratingCount: 892,
      reviewCount: 234,
    },
    links: { documentation: "https://docs.nchat.dev/apps/reminders" },
    requirements: {},
    features: [
      "Slash commands",
      "Natural language",
      "Recurring",
      "Push notifications",
    ],
    createdAt: "2023-11-01T00:00:00Z",
    updatedAt: "2024-01-10T00:00:00Z",
    publishedAt: "2023-11-01T00:00:00Z",
    featured: true,
    verified: true,
    builtIn: true,
  },
  {
    id: "giphy",
    name: "Giphy",
    slug: "giphy",
    shortDescription: "Search and share GIFs from Giphy",
    longDescription: `Add some fun to your conversations with GIFs! Search the entire Giphy library directly from nchat.

Features:
- /giphy command to search GIFs
- Inline GIF picker
- Trending GIFs
- Random GIF option
- Content filtering
- Favorites`,
    type: "integration",
    status: "active",
    visibility: "public",
    pricing: "free",
    icon: "/images/apps/giphy-icon.svg",
    developer: NCHAT_DEVELOPER,
    categories: [
      makeCategory(CATEGORY_IDS.SOCIAL, "Social & Fun"),
      makeCategory(CATEGORY_IDS.COMMUNICATION, "Communication"),
    ],
    tags: [
      { id: "gifs", name: "gifs", slug: "gifs" },
      { id: "media", name: "media", slug: "media" },
      { id: "fun", name: "fun", slug: "fun" },
    ],
    permissions: [
      createPermission("messages:write", "required", "To post GIFs"),
      createPermission(
        "commands:register",
        "required",
        "To register /giphy command",
      ),
    ],
    screenshots: [],
    currentVersion: "1.0.0",
    versions: [
      {
        version: "1.0.0",
        releaseDate: "2023-12-15",
        changelog: "Initial release",
      },
    ],
    stats: {
      installs: 31200,
      activeInstalls: 28500,
      rating: 4.9,
      ratingCount: 1523,
      reviewCount: 412,
    },
    links: { website: "https://giphy.com" },
    requirements: {},
    features: ["GIF search", "Trending GIFs", "Content filtering"],
    createdAt: "2023-12-15T00:00:00Z",
    updatedAt: "2023-12-15T00:00:00Z",
    publishedAt: "2023-12-15T00:00:00Z",
    featured: true,
    verified: true,
    builtIn: true,
  },
  {
    id: "welcome-bot",
    name: "Welcome Bot",
    slug: "welcome-bot",
    shortDescription: "Automatically greet new team members",
    longDescription: `Make new team members feel welcome with automated onboarding messages.

Features:
- Customizable welcome messages
- Channel-specific greetings
- Onboarding checklists
- Team introductions
- Resource links`,
    type: "bot",
    status: "active",
    visibility: "public",
    pricing: "free",
    icon: "/images/apps/welcome-bot-icon.svg",
    developer: NCHAT_DEVELOPER,
    categories: [makeCategory(CATEGORY_IDS.HR_CULTURE, "HR & Culture")],
    tags: [
      { id: "onboarding", name: "onboarding", slug: "onboarding" },
      { id: "welcome", name: "welcome", slug: "welcome" },
      { id: "automation", name: "automation", slug: "automation" },
    ],
    permissions: [
      createPermission(
        "messages:write",
        "required",
        "To send welcome messages",
      ),
      createPermission("users:read", "required", "To detect new members"),
      createPermission(
        "channels:read",
        "required",
        "To know which channels to greet in",
      ),
    ],
    screenshots: [],
    currentVersion: "1.1.0",
    versions: [
      {
        version: "1.1.0",
        releaseDate: "2024-01-05",
        changelog: "Custom message templates",
      },
      {
        version: "1.0.0",
        releaseDate: "2023-12-01",
        changelog: "Initial release",
      },
    ],
    stats: {
      installs: 8920,
      activeInstalls: 7650,
      rating: 4.6,
      ratingCount: 234,
      reviewCount: 67,
    },
    links: { documentation: "https://docs.nchat.dev/apps/welcome-bot" },
    requirements: {},
    features: ["Auto welcome", "Custom templates", "Onboarding checklists"],
    createdAt: "2023-12-01T00:00:00Z",
    updatedAt: "2024-01-05T00:00:00Z",
    publishedAt: "2023-12-01T00:00:00Z",
    featured: false,
    verified: true,
    builtIn: true,
  },
  {
    id: "poll-bot",
    name: "Quick Poll Bot",
    slug: "poll-bot",
    shortDescription: "Simple yes/no and quick reaction polls",
    longDescription: `Quick polls for fast decisions. Just react to vote!

Features:
- Reaction-based voting
- Yes/No quick polls
- Thumbs up/down polls
- Auto-close after time limit
- Results announcement`,
    type: "bot",
    status: "active",
    visibility: "public",
    pricing: "free",
    icon: "/images/apps/poll-bot-icon.svg",
    developer: NCHAT_DEVELOPER,
    categories: [makeCategory(CATEGORY_IDS.PRODUCTIVITY, "Productivity")],
    tags: [
      { id: "polls", name: "polls", slug: "polls" },
      { id: "quick", name: "quick", slug: "quick" },
      { id: "voting", name: "voting", slug: "voting" },
    ],
    permissions: [
      createPermission("messages:read", "required"),
      createPermission("messages:write", "required"),
      createPermission("reactions:read", "required"),
      createPermission("reactions:write", "required"),
    ],
    screenshots: [],
    currentVersion: "1.0.0",
    versions: [
      {
        version: "1.0.0",
        releaseDate: "2024-01-01",
        changelog: "Initial release",
      },
    ],
    stats: {
      installs: 5430,
      activeInstalls: 4200,
      rating: 4.5,
      ratingCount: 156,
      reviewCount: 42,
    },
    links: {},
    requirements: {},
    features: ["Reaction voting", "Quick setup", "Auto-close"],
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    publishedAt: "2024-01-01T00:00:00Z",
    featured: false,
    verified: true,
    builtIn: true,
  },
  {
    id: "reminder-bot",
    name: "Standup Reminder",
    slug: "reminder-bot",
    shortDescription: "Daily standup and meeting reminders",
    longDescription: `Keep your team on schedule with automated standup and meeting reminders.

Features:
- Daily standup prompts
- Custom reminder schedules
- Meeting reminders
- Status collection
- Summary reports`,
    type: "bot",
    status: "active",
    visibility: "public",
    pricing: "free",
    icon: "/images/apps/reminder-bot-icon.svg",
    developer: NCHAT_DEVELOPER,
    categories: [
      makeCategory(CATEGORY_IDS.PRODUCTIVITY, "Productivity"),
      makeCategory(CATEGORY_IDS.PROJECT_MANAGEMENT, "Project Management"),
    ],
    tags: [
      { id: "standup", name: "standup", slug: "standup" },
      { id: "meetings", name: "meetings", slug: "meetings" },
      { id: "reminders", name: "reminders", slug: "reminders" },
    ],
    permissions: [
      createPermission("messages:write", "required"),
      createPermission("notifications:send", "required"),
      createPermission("channels:read", "required"),
    ],
    screenshots: [],
    currentVersion: "1.0.0",
    versions: [
      {
        version: "1.0.0",
        releaseDate: "2024-01-01",
        changelog: "Initial release",
      },
    ],
    stats: {
      installs: 6780,
      activeInstalls: 5430,
      rating: 4.4,
      ratingCount: 198,
      reviewCount: 54,
    },
    links: {},
    requirements: {},
    features: ["Daily standups", "Custom schedules", "Status reports"],
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    publishedAt: "2024-01-01T00:00:00Z",
    featured: false,
    verified: true,
    builtIn: true,
  },
];

// ============================================================================
// Integration Apps
// ============================================================================

export const INTEGRATION_APPS: App[] = [
  {
    id: "github",
    name: "GitHub",
    slug: "github",
    shortDescription: "GitHub notifications and PR updates in nchat",
    longDescription: `Stay on top of your GitHub activity without leaving nchat. Get notifications for pull requests, issues, code reviews, and more.

Features:
- PR and issue notifications
- Code review requests
- Merge and deployment alerts
- Commit notifications
- Custom notification filters
- Link previews for GitHub URLs`,
    type: "integration",
    status: "active",
    visibility: "public",
    pricing: "free",
    icon: "/images/apps/github-icon.svg",
    banner: "/images/apps/github-banner.png",
    developer: GITHUB_DEVELOPER,
    categories: [makeCategory(CATEGORY_IDS.DEVELOPER_TOOLS, "Developer Tools")],
    tags: [
      { id: "git", name: "git", slug: "git" },
      {
        id: "version-control",
        name: "version control",
        slug: "version-control",
      },
      { id: "ci-cd", name: "CI/CD", slug: "ci-cd" },
    ],
    permissions: [
      createPermission("messages:write", "required", "To post notifications"),
      createPermission("channels:read", "required", "To know where to post"),
      createPermission(
        "webhooks:receive",
        "required",
        "To receive GitHub events",
      ),
    ],
    screenshots: [
      {
        id: "1",
        url: "/images/apps/github/screenshot-1.png",
        caption: "PR notifications",
        order: 1,
      },
      {
        id: "2",
        url: "/images/apps/github/screenshot-2.png",
        caption: "Issue updates",
        order: 2,
      },
      {
        id: "3",
        url: "/images/apps/github/screenshot-3.png",
        caption: "Configuration",
        order: 3,
      },
    ],
    currentVersion: "3.2.0",
    versions: [
      {
        version: "3.2.0",
        releaseDate: "2024-01-12",
        changelog: "GitHub Actions notifications",
      },
      {
        version: "3.1.0",
        releaseDate: "2024-01-01",
        changelog: "Code review improvements",
      },
    ],
    stats: {
      installs: 45600,
      activeInstalls: 42100,
      rating: 4.9,
      ratingCount: 2341,
      reviewCount: 678,
    },
    links: {
      website: "https://github.com",
      documentation: "https://docs.github.com/en/integrations",
    },
    requirements: {},
    features: [
      "PR notifications",
      "Issue tracking",
      "Deployment alerts",
      "Link unfurling",
    ],
    createdAt: "2023-06-01T00:00:00Z",
    updatedAt: "2024-01-12T00:00:00Z",
    publishedAt: "2023-06-01T00:00:00Z",
    featured: true,
    verified: true,
    builtIn: false,
  },
  {
    id: "jira",
    name: "Jira",
    slug: "jira",
    shortDescription: "Track Jira issues and projects from nchat",
    longDescription: `Bring your Jira workflow into nchat. Create issues, track progress, and get updates without context switching.

Features:
- Issue notifications
- Create issues from messages
- Status updates
- Sprint tracking
- Link previews
- Search issues`,
    type: "integration",
    status: "active",
    visibility: "public",
    pricing: "free",
    icon: "/images/apps/jira-icon.svg",
    developer: JIRA_DEVELOPER,
    categories: [
      makeCategory(CATEGORY_IDS.PROJECT_MANAGEMENT, "Project Management"),
    ],
    tags: [
      {
        id: "project-management",
        name: "project management",
        slug: "project-management",
      },
      { id: "issues", name: "issues", slug: "issues" },
      { id: "agile", name: "agile", slug: "agile" },
    ],
    permissions: [
      createPermission("messages:read", "required"),
      createPermission("messages:write", "required"),
      createPermission("webhooks:receive", "required"),
      createPermission("commands:register", "required"),
    ],
    screenshots: [],
    currentVersion: "2.1.0",
    versions: [
      {
        version: "2.1.0",
        releaseDate: "2024-01-08",
        changelog: "Sprint tracking",
      },
    ],
    stats: {
      installs: 34200,
      activeInstalls: 29800,
      rating: 4.7,
      ratingCount: 1876,
      reviewCount: 523,
    },
    links: {
      website: "https://www.atlassian.com/software/jira",
      documentation: "https://support.atlassian.com/jira-software-cloud/",
    },
    requirements: {},
    features: [
      "Issue tracking",
      "Sprint updates",
      "Create from chat",
      "Link unfurling",
    ],
    createdAt: "2023-07-01T00:00:00Z",
    updatedAt: "2024-01-08T00:00:00Z",
    publishedAt: "2023-07-01T00:00:00Z",
    featured: true,
    verified: true,
    builtIn: false,
  },
  {
    id: "google-drive",
    name: "Google Drive",
    slug: "google-drive",
    shortDescription: "Share and preview Google Drive files",
    longDescription: `Seamlessly share Google Drive files in nchat. Get rich previews, manage permissions, and collaborate on documents.

Features:
- File sharing
- Rich previews
- Permission management
- Search Drive files
- Create new docs
- Comment notifications`,
    type: "integration",
    status: "active",
    visibility: "public",
    pricing: "free",
    icon: "/images/apps/google-drive-icon.svg",
    developer: GOOGLE_DEVELOPER,
    categories: [makeCategory(CATEGORY_IDS.FILE_MANAGEMENT, "File Management")],
    tags: [
      { id: "files", name: "files", slug: "files" },
      { id: "cloud-storage", name: "cloud storage", slug: "cloud-storage" },
      { id: "documents", name: "documents", slug: "documents" },
    ],
    permissions: [
      createPermission("messages:write", "required"),
      createPermission("files:write", "required"),
      createPermission(
        "identity:read",
        "optional",
        "For Google account linking",
      ),
    ],
    screenshots: [],
    currentVersion: "1.5.0",
    versions: [
      {
        version: "1.5.0",
        releaseDate: "2024-01-05",
        changelog: "Improved previews",
      },
    ],
    stats: {
      installs: 28900,
      activeInstalls: 25400,
      rating: 4.6,
      ratingCount: 1234,
      reviewCount: 345,
    },
    links: {
      website: "https://drive.google.com",
    },
    requirements: {},
    features: [
      "File sharing",
      "Rich previews",
      "Search",
      "Permission management",
    ],
    createdAt: "2023-08-01T00:00:00Z",
    updatedAt: "2024-01-05T00:00:00Z",
    publishedAt: "2023-08-01T00:00:00Z",
    featured: true,
    verified: true,
    builtIn: false,
  },
  {
    id: "trello",
    name: "Trello",
    slug: "trello",
    shortDescription: "Manage Trello boards and cards from nchat",
    longDescription: `Keep your Trello boards synced with nchat. Get card updates, create new cards, and manage your boards without switching apps.

Features:
- Card notifications
- Create cards from messages
- Due date reminders
- Board updates
- Checklist progress
- Link previews`,
    type: "integration",
    status: "active",
    visibility: "public",
    pricing: "free",
    icon: "/images/apps/trello-icon.svg",
    developer: TRELLO_DEVELOPER,
    categories: [
      makeCategory(CATEGORY_IDS.PROJECT_MANAGEMENT, "Project Management"),
    ],
    tags: [
      { id: "kanban", name: "kanban", slug: "kanban" },
      { id: "boards", name: "boards", slug: "boards" },
      { id: "tasks", name: "tasks", slug: "tasks" },
    ],
    permissions: [
      createPermission("messages:read", "required"),
      createPermission("messages:write", "required"),
      createPermission("webhooks:receive", "required"),
      createPermission("commands:register", "required"),
    ],
    screenshots: [],
    currentVersion: "1.3.0",
    versions: [
      {
        version: "1.3.0",
        releaseDate: "2024-01-02",
        changelog: "Due date reminders",
      },
    ],
    stats: {
      installs: 19500,
      activeInstalls: 16800,
      rating: 4.5,
      ratingCount: 876,
      reviewCount: 234,
    },
    links: {
      website: "https://trello.com",
    },
    requirements: {},
    features: [
      "Card management",
      "Board updates",
      "Due dates",
      "Create from chat",
    ],
    createdAt: "2023-09-01T00:00:00Z",
    updatedAt: "2024-01-02T00:00:00Z",
    publishedAt: "2023-09-01T00:00:00Z",
    featured: false,
    verified: true,
    builtIn: false,
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    slug: "google-calendar",
    shortDescription: "Calendar events and meeting reminders",
    longDescription: `Stay on top of your schedule with Google Calendar integration. Get meeting reminders, RSVP from nchat, and see your schedule at a glance.

Features:
- Event notifications
- Meeting reminders
- RSVP from chat
- Schedule overview
- Create events
- Availability status`,
    type: "integration",
    status: "active",
    visibility: "public",
    pricing: "free",
    icon: "/images/apps/google-calendar-icon.svg",
    developer: GOOGLE_DEVELOPER,
    categories: [makeCategory(CATEGORY_IDS.PRODUCTIVITY, "Productivity")],
    tags: [
      { id: "calendar", name: "calendar", slug: "calendar" },
      { id: "scheduling", name: "scheduling", slug: "scheduling" },
      { id: "meetings", name: "meetings", slug: "meetings" },
    ],
    permissions: [
      createPermission("messages:write", "required"),
      createPermission("notifications:send", "required"),
      createPermission(
        "users:presence",
        "optional",
        "To update availability status",
      ),
    ],
    screenshots: [],
    currentVersion: "2.0.0",
    versions: [
      { version: "2.0.0", releaseDate: "2024-01-10", changelog: "Status sync" },
    ],
    stats: {
      installs: 22100,
      activeInstalls: 19200,
      rating: 4.7,
      ratingCount: 1456,
      reviewCount: 389,
    },
    links: {
      website: "https://calendar.google.com",
    },
    requirements: {},
    features: ["Event reminders", "RSVP", "Schedule view", "Status sync"],
    createdAt: "2023-07-15T00:00:00Z",
    updatedAt: "2024-01-10T00:00:00Z",
    publishedAt: "2023-07-15T00:00:00Z",
    featured: false,
    verified: true,
    builtIn: false,
  },
  {
    id: "zoom",
    name: "Zoom",
    slug: "zoom",
    shortDescription: "Start and schedule Zoom meetings",
    longDescription: `Launch Zoom meetings directly from nchat. Schedule meetings, get join links, and see who is in a call.

Features:
- Start instant meetings
- Schedule meetings
- Join links in chat
- Meeting recordings
- Participant list
- Meeting reminders`,
    type: "integration",
    status: "active",
    visibility: "public",
    pricing: "free",
    icon: "/images/apps/zoom-icon.svg",
    developer: {
      id: "zoom",
      name: "Zoom",
      email: "support@zoom.us",
      website: "https://zoom.us",
      verified: true,
    },
    categories: [makeCategory(CATEGORY_IDS.COMMUNICATION, "Communication")],
    tags: [
      { id: "video", name: "video", slug: "video" },
      { id: "meetings", name: "meetings", slug: "meetings" },
      { id: "conferencing", name: "conferencing", slug: "conferencing" },
    ],
    permissions: [
      createPermission("messages:write", "required"),
      createPermission("commands:register", "required"),
      createPermission("users:read", "optional"),
    ],
    screenshots: [],
    currentVersion: "1.4.0",
    versions: [
      {
        version: "1.4.0",
        releaseDate: "2024-01-08",
        changelog: "Recording links",
      },
    ],
    stats: {
      installs: 38700,
      activeInstalls: 35200,
      rating: 4.8,
      ratingCount: 2134,
      reviewCount: 567,
    },
    links: {
      website: "https://zoom.us",
    },
    requirements: {},
    features: ["Instant meetings", "Scheduling", "Recording links"],
    createdAt: "2023-06-15T00:00:00Z",
    updatedAt: "2024-01-08T00:00:00Z",
    publishedAt: "2023-06-15T00:00:00Z",
    featured: true,
    verified: true,
    builtIn: false,
  },
  {
    id: "salesforce",
    name: "Salesforce",
    slug: "salesforce",
    shortDescription: "CRM updates and deal notifications",
    longDescription: `Keep your sales team informed with Salesforce integration. Get deal updates, lead notifications, and account activity in nchat.

Features:
- Deal stage updates
- Lead notifications
- Account activity
- Search records
- Create from chat
- Pipeline reports`,
    type: "integration",
    status: "active",
    visibility: "public",
    pricing: "freemium",
    icon: "/images/apps/salesforce-icon.svg",
    developer: {
      id: "salesforce",
      name: "Salesforce",
      email: "support@salesforce.com",
      website: "https://salesforce.com",
      verified: true,
    },
    categories: [makeCategory(CATEGORY_IDS.SALES, "Sales")],
    tags: [
      { id: "crm", name: "CRM", slug: "crm" },
      { id: "sales", name: "sales", slug: "sales" },
      { id: "leads", name: "leads", slug: "leads" },
    ],
    permissions: [
      createPermission("messages:write", "required"),
      createPermission("webhooks:receive", "required"),
      createPermission("commands:register", "required"),
    ],
    screenshots: [],
    currentVersion: "2.2.0",
    versions: [
      {
        version: "2.2.0",
        releaseDate: "2024-01-06",
        changelog: "Pipeline reports",
      },
    ],
    stats: {
      installs: 15800,
      activeInstalls: 13500,
      rating: 4.4,
      ratingCount: 876,
      reviewCount: 234,
    },
    links: {
      website: "https://salesforce.com",
    },
    requirements: {},
    features: ["Deal tracking", "Lead alerts", "Search CRM", "Reports"],
    createdAt: "2023-08-15T00:00:00Z",
    updatedAt: "2024-01-06T00:00:00Z",
    publishedAt: "2023-08-15T00:00:00Z",
    featured: false,
    verified: true,
    builtIn: false,
  },
  {
    id: "zendesk",
    name: "Zendesk",
    slug: "zendesk",
    shortDescription: "Support ticket notifications and management",
    longDescription: `Connect your support workflow with nchat. Get ticket notifications, respond to customers, and track support metrics.

Features:
- Ticket notifications
- Reply from chat
- Ticket assignment
- SLA alerts
- Customer context
- Search tickets`,
    type: "integration",
    status: "active",
    visibility: "public",
    pricing: "free",
    icon: "/images/apps/zendesk-icon.svg",
    developer: {
      id: "zendesk",
      name: "Zendesk",
      email: "support@zendesk.com",
      website: "https://zendesk.com",
      verified: true,
    },
    categories: [
      makeCategory(CATEGORY_IDS.CUSTOMER_SUPPORT, "Customer Support"),
    ],
    tags: [
      { id: "support", name: "support", slug: "support" },
      { id: "tickets", name: "tickets", slug: "tickets" },
      { id: "helpdesk", name: "helpdesk", slug: "helpdesk" },
    ],
    permissions: [
      createPermission("messages:write", "required"),
      createPermission("webhooks:receive", "required"),
      createPermission("notifications:send", "required"),
    ],
    screenshots: [],
    currentVersion: "1.6.0",
    versions: [
      { version: "1.6.0", releaseDate: "2024-01-04", changelog: "SLA alerts" },
    ],
    stats: {
      installs: 12400,
      activeInstalls: 10800,
      rating: 4.5,
      ratingCount: 654,
      reviewCount: 178,
    },
    links: {
      website: "https://zendesk.com",
    },
    requirements: {},
    features: [
      "Ticket alerts",
      "Reply from chat",
      "SLA tracking",
      "Customer info",
    ],
    createdAt: "2023-09-15T00:00:00Z",
    updatedAt: "2024-01-04T00:00:00Z",
    publishedAt: "2023-09-15T00:00:00Z",
    featured: false,
    verified: true,
    builtIn: false,
  },
];

// ============================================================================
// All Apps
// ============================================================================

export const ALL_APPS: App[] = [...BUILT_IN_APPS, ...INTEGRATION_APPS];

// ============================================================================
// Registry Functions
// ============================================================================

/**
 * Get all apps
 */
export function getAllApps(): App[] {
  return ALL_APPS;
}

/**
 * Get app by ID
 */
export function getAppById(appId: string): App | undefined {
  return ALL_APPS.find((app) => app.id === appId);
}

/**
 * Get app by slug
 */
export function getAppBySlug(slug: string): App | undefined {
  return ALL_APPS.find((app) => app.slug === slug);
}

/**
 * Get apps by category
 */
export function getAppsByCategory(categoryId: string): App[] {
  return ALL_APPS.filter((app) =>
    app.categories.some((cat) => cat.id === categoryId),
  );
}

/**
 * Get built-in apps only
 */
export function getBuiltInApps(): App[] {
  return ALL_APPS.filter((app) => app.builtIn);
}

/**
 * Get integration apps only
 */
export function getIntegrationApps(): App[] {
  return ALL_APPS.filter((app) => !app.builtIn);
}

/**
 * Get featured apps
 */
export function getFeaturedApps(): App[] {
  return ALL_APPS.filter((app) => app.featured);
}

/**
 * Get popular apps (sorted by active installs)
 */
export function getPopularApps(limit: number = 10): App[] {
  return [...ALL_APPS]
    .sort((a, b) => b.stats.activeInstalls - a.stats.activeInstalls)
    .slice(0, limit);
}

/**
 * Get recently updated apps
 */
export function getRecentApps(limit: number = 10): App[] {
  return [...ALL_APPS]
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, limit);
}

/**
 * Get top rated apps
 */
export function getTopRatedApps(limit: number = 10): App[] {
  return [...ALL_APPS]
    .filter((app) => app.stats.ratingCount >= 50) // Minimum ratings for fairness
    .sort((a, b) => b.stats.rating - a.stats.rating)
    .slice(0, limit);
}

/**
 * Get apps by type
 */
export function getAppsByType(type: App["type"]): App[] {
  return ALL_APPS.filter((app) => app.type === type);
}

/**
 * Get free apps
 */
export function getFreeApps(): App[] {
  return ALL_APPS.filter((app) => app.pricing === "free");
}
