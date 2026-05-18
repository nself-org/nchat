/**
 * App Categories - Category definitions for the nchat app marketplace
 *
 * Defines all available app categories with their metadata
 */

import type { AppCategory } from "./app-types";

// ============================================================================
// Category Definitions
// ============================================================================

export const APP_CATEGORIES: AppCategory[] = [
  {
    id: "productivity",
    name: "Productivity",
    slug: "productivity",
    description: "Tools to help your team work more efficiently",
    icon: "Zap",
    color: "#6366f1",
    appCount: 0,
  },
  {
    id: "communication",
    name: "Communication",
    slug: "communication",
    description: "Enhance team communication and collaboration",
    icon: "MessageSquare",
    color: "#10b981",
    appCount: 0,
  },
  {
    id: "developer-tools",
    name: "Developer Tools",
    slug: "developer-tools",
    description: "Integrations for software development workflows",
    icon: "Code",
    color: "#8b5cf6",
    appCount: 0,
  },
  {
    id: "analytics",
    name: "Analytics",
    slug: "analytics",
    description: "Track metrics, reports, and insights",
    icon: "BarChart3",
    color: "#f59e0b",
    appCount: 0,
  },
  {
    id: "security",
    name: "Security",
    slug: "security",
    description: "Security, compliance, and access control tools",
    icon: "Shield",
    color: "#ef4444",
    appCount: 0,
  },
  {
    id: "hr-culture",
    name: "HR & Culture",
    slug: "hr-culture",
    description: "People management and team culture tools",
    icon: "Users",
    color: "#ec4899",
    appCount: 0,
  },
  {
    id: "marketing",
    name: "Marketing",
    slug: "marketing",
    description: "Marketing automation and campaign tools",
    icon: "Megaphone",
    color: "#14b8a6",
    appCount: 0,
  },
  {
    id: "sales",
    name: "Sales",
    slug: "sales",
    description: "CRM and sales pipeline management",
    icon: "DollarSign",
    color: "#22c55e",
    appCount: 0,
  },
  {
    id: "customer-support",
    name: "Customer Support",
    slug: "customer-support",
    description: "Help desk and customer service integrations",
    icon: "HeadphonesIcon",
    color: "#3b82f6",
    appCount: 0,
  },
  {
    id: "file-management",
    name: "File Management",
    slug: "file-management",
    description: "File storage, sharing, and document management",
    icon: "FolderOpen",
    color: "#64748b",
    appCount: 0,
  },
  {
    id: "project-management",
    name: "Project Management",
    slug: "project-management",
    description: "Task tracking and project coordination tools",
    icon: "Kanban",
    color: "#7c3aed",
    appCount: 0,
  },
  {
    id: "automation",
    name: "Automation",
    slug: "automation",
    description: "Workflow automation and process tools",
    icon: "Workflow",
    color: "#0ea5e9",
    appCount: 0,
  },
  {
    id: "social",
    name: "Social & Fun",
    slug: "social",
    description: "Social features, games, and team building",
    icon: "Smile",
    color: "#f97316",
    appCount: 0,
  },
  {
    id: "design",
    name: "Design",
    slug: "design",
    description: "Design tools and creative integrations",
    icon: "Palette",
    color: "#d946ef",
    appCount: 0,
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get a category by its ID
 */
export function getCategoryById(categoryId: string): AppCategory | undefined {
  return APP_CATEGORIES.find((category) => category.id === categoryId);
}

/**
 * Get a category by its slug
 */
export function getCategoryBySlug(slug: string): AppCategory | undefined {
  return APP_CATEGORIES.find((category) => category.slug === slug);
}

/**
 * Get all categories sorted by name
 */
export function getCategoriesSorted(): AppCategory[] {
  return [...APP_CATEGORIES].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get categories with app counts greater than 0
 */
export function getActiveCategories(categories: AppCategory[]): AppCategory[] {
  return categories.filter((category) => category.appCount > 0);
}

/**
 * Update category app counts based on apps
 */
export function updateCategoryCounts(
  categories: AppCategory[],
  appCategoryCounts: Record<string, number>,
): AppCategory[] {
  return categories.map((category) => ({
    ...category,
    appCount: appCategoryCounts[category.id] || 0,
  }));
}

/**
 * Get category icon name for Lucide icons
 */
export function getCategoryIcon(categoryId: string): string {
  const category = getCategoryById(categoryId);
  return category?.icon || "Box";
}

/**
 * Get category color
 */
export function getCategoryColor(categoryId: string): string {
  const category = getCategoryById(categoryId);
  return category?.color || "#6b7280";
}

// ============================================================================
// Category ID Constants
// ============================================================================

export const CATEGORY_IDS = {
  PRODUCTIVITY: "productivity",
  COMMUNICATION: "communication",
  DEVELOPER_TOOLS: "developer-tools",
  ANALYTICS: "analytics",
  SECURITY: "security",
  HR_CULTURE: "hr-culture",
  MARKETING: "marketing",
  SALES: "sales",
  CUSTOMER_SUPPORT: "customer-support",
  FILE_MANAGEMENT: "file-management",
  PROJECT_MANAGEMENT: "project-management",
  AUTOMATION: "automation",
  SOCIAL: "social",
  DESIGN: "design",
} as const;

export type CategoryId = (typeof CATEGORY_IDS)[keyof typeof CATEGORY_IDS];
