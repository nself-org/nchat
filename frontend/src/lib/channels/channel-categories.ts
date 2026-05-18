/**
 * Channel Categories - Predefined category definitions for channel organization
 */

// ============================================================================
// Types
// ============================================================================

export interface ChannelCategoryDefinition {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  position: number;
  isDefault: boolean;
  isSystem: boolean;
}

// ============================================================================
// Predefined Categories
// ============================================================================

export const DEFAULT_CATEGORIES: ChannelCategoryDefinition[] = [
  {
    id: "general",
    name: "General",
    slug: "general",
    description: "General discussion and announcements",
    icon: "MessageSquare",
    color: "#6366f1",
    position: 0,
    isDefault: true,
    isSystem: true,
  },
  {
    id: "announcements",
    name: "Announcements",
    slug: "announcements",
    description: "Important announcements and updates",
    icon: "Megaphone",
    color: "#f59e0b",
    position: 1,
    isDefault: false,
    isSystem: true,
  },
  {
    id: "teams",
    name: "Teams",
    slug: "teams",
    description: "Team-specific channels",
    icon: "Users",
    color: "#10b981",
    position: 2,
    isDefault: false,
    isSystem: false,
  },
  {
    id: "projects",
    name: "Projects",
    slug: "projects",
    description: "Project discussions and updates",
    icon: "FolderKanban",
    color: "#8b5cf6",
    position: 3,
    isDefault: false,
    isSystem: false,
  },
  {
    id: "support",
    name: "Support",
    slug: "support",
    description: "Help and support channels",
    icon: "HelpCircle",
    color: "#ef4444",
    position: 4,
    isDefault: false,
    isSystem: false,
  },
  {
    id: "social",
    name: "Social",
    slug: "social",
    description: "Casual conversations and social activities",
    icon: "Coffee",
    color: "#ec4899",
    position: 5,
    isDefault: false,
    isSystem: false,
  },
  {
    id: "resources",
    name: "Resources",
    slug: "resources",
    description: "Shared resources and documentation",
    icon: "BookOpen",
    color: "#06b6d4",
    position: 6,
    isDefault: false,
    isSystem: false,
  },
  {
    id: "archived",
    name: "Archived",
    slug: "archived",
    description: "Archived and inactive channels",
    icon: "Archive",
    color: "#64748b",
    position: 99,
    isDefault: false,
    isSystem: true,
  },
];

// ============================================================================
// Category Icons Mapping
// ============================================================================

export const CATEGORY_ICONS = {
  MessageSquare: "MessageSquare",
  Megaphone: "Megaphone",
  Users: "Users",
  FolderKanban: "FolderKanban",
  HelpCircle: "HelpCircle",
  Coffee: "Coffee",
  BookOpen: "BookOpen",
  Archive: "Archive",
  Hash: "Hash",
  Code: "Code",
  Briefcase: "Briefcase",
  Gamepad2: "Gamepad2",
  Music: "Music",
  Camera: "Camera",
  Film: "Film",
  Zap: "Zap",
  Star: "Star",
  Heart: "Heart",
  Shield: "Shield",
  Lock: "Lock",
} as const;

export type CategoryIconName = keyof typeof CATEGORY_ICONS;

// ============================================================================
// Category Colors
// ============================================================================

export const CATEGORY_COLORS = [
  "#6366f1", // Indigo
  "#f59e0b", // Amber
  "#10b981", // Emerald
  "#8b5cf6", // Violet
  "#ef4444", // Red
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#64748b", // Slate
  "#f97316", // Orange
  "#14b8a6", // Teal
  "#a855f7", // Purple
  "#22c55e", // Green
] as const;

// ============================================================================
// Helper Functions
// ============================================================================

export function getCategoryById(
  id: string,
): ChannelCategoryDefinition | undefined {
  return DEFAULT_CATEGORIES.find((cat) => cat.id === id);
}

export function getCategoryBySlug(
  slug: string,
): ChannelCategoryDefinition | undefined {
  return DEFAULT_CATEGORIES.find((cat) => cat.slug === slug);
}

export function getDefaultCategory(): ChannelCategoryDefinition {
  return (
    DEFAULT_CATEGORIES.find((cat) => cat.isDefault) || DEFAULT_CATEGORIES[0]
  );
}

export function getSystemCategories(): ChannelCategoryDefinition[] {
  return DEFAULT_CATEGORIES.filter((cat) => cat.isSystem);
}

export function getUserCategories(): ChannelCategoryDefinition[] {
  return DEFAULT_CATEGORIES.filter((cat) => !cat.isSystem);
}

export function sortCategoriesByPosition(
  categories: ChannelCategoryDefinition[],
): ChannelCategoryDefinition[] {
  return [...categories].sort((a, b) => a.position - b.position);
}

export function createCustomCategory(
  name: string,
  options?: Partial<
    Omit<ChannelCategoryDefinition, "id" | "name" | "isSystem">
  >,
): ChannelCategoryDefinition {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const id = `custom-${slug}-${Date.now()}`;

  return {
    id,
    name,
    slug,
    description: options?.description || `${name} channels`,
    icon: options?.icon || "Hash",
    color:
      options?.color ||
      CATEGORY_COLORS[Math.floor(Math.random() * CATEGORY_COLORS.length)],
    position: options?.position ?? DEFAULT_CATEGORIES.length,
    isDefault: false,
    isSystem: false,
  };
}
