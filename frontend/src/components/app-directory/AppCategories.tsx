"use client";

import * as React from "react";
import {
  Zap,
  MessageSquare,
  Code,
  BarChart3,
  Shield,
  Users,
  Megaphone,
  DollarSign,
  Headphones,
  FolderOpen,
  Kanban,
  Workflow,
  Smile,
  Palette,
  Box,
  LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useAppDirectoryStore } from "@/stores/app-directory-store";
import type { AppCategory } from "@/lib/app-directory/app-types";

interface AppCategoriesProps {
  categories: AppCategory[];
  className?: string;
  variant?: "horizontal" | "vertical";
}

// Icon component type with optional style support
type IconComponent = React.ComponentType<{
  className?: string;
  style?: React.CSSProperties;
}>;

// Icon mapping for categories
const CATEGORY_ICONS: Record<string, IconComponent> = {
  productivity: Zap,
  communication: MessageSquare,
  "developer-tools": Code,
  analytics: BarChart3,
  security: Shield,
  "hr-culture": Users,
  marketing: Megaphone,
  sales: DollarSign,
  "customer-support": Headphones,
  "file-management": FolderOpen,
  "project-management": Kanban,
  automation: Workflow,
  social: Smile,
  design: Palette,
};

export function AppCategories({
  categories,
  className,
  variant = "horizontal",
}: AppCategoriesProps) {
  const { activeCategory, setActiveCategory } = useAppDirectoryStore();

  const handleCategoryClick = (categoryId: string | null) => {
    setActiveCategory(categoryId === activeCategory ? null : categoryId);
  };

  if (variant === "vertical") {
    return (
      <nav className={cn("flex flex-col gap-1", className)}>
        <Button
          variant={activeCategory === null ? "secondary" : "ghost"}
          className="justify-start"
          onClick={() => handleCategoryClick(null)}
        >
          <LayoutGrid className="mr-2 h-4 w-4" />
          All Apps
        </Button>
        {categories.map((category) => {
          const Icon = CATEGORY_ICONS[category.id] || Box;
          return (
            <Button
              key={category.id}
              variant={activeCategory === category.id ? "secondary" : "ghost"}
              className="justify-start"
              onClick={() => handleCategoryClick(category.id)}
            >
              <Icon className="mr-2 h-4 w-4" />
              {category.name}
              {category.appCount > 0 && (
                <span className="ml-auto text-xs text-muted-foreground">
                  {category.appCount}
                </span>
              )}
            </Button>
          );
        })}
      </nav>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-2 pb-3">
          <CategoryButton
            id={null}
            name="All Apps"
            icon={LayoutGrid}
            isActive={activeCategory === null}
            onClick={() => handleCategoryClick(null)}
          />
          {categories.map((category) => {
            const Icon = CATEGORY_ICONS[category.id] || Box;
            return (
              <CategoryButton
                key={category.id}
                id={category.id}
                name={category.name}
                icon={Icon}
                color={category.color}
                count={category.appCount}
                isActive={activeCategory === category.id}
                onClick={() => handleCategoryClick(category.id)}
              />
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}

interface CategoryButtonProps {
  id: string | null;
  name: string;
  icon: IconComponent;
  color?: string;
  count?: number;
  isActive: boolean;
  onClick: () => void;
}

function CategoryButton({
  id,
  name,
  icon: Icon,
  color,
  count,
  isActive,
  onClick,
}: CategoryButtonProps) {
  return (
    <Button
      variant={isActive ? "default" : "outline"}
      size="sm"
      className={cn("flex-shrink-0 gap-2", !isActive && "hover:bg-accent")}
      onClick={onClick}
    >
      <Icon
        className="h-4 w-4"
        style={!isActive && color ? { color } : undefined}
      />
      {name}
    </Button>
  );
}

// Category Grid for landing/browse pages
interface CategoryGridProps {
  categories: AppCategory[];
  className?: string;
}

export function CategoryGrid({ categories, className }: CategoryGridProps) {
  const { setActiveCategory } = useAppDirectoryStore();

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4",
        className,
      )}
    >
      {categories.map((category) => {
        const Icon = CATEGORY_ICONS[category.id] || Box;
        return (
          <button
            key={category.id}
            className="flex flex-col items-center gap-3 rounded-lg border bg-card p-6 text-center transition-colors hover:bg-accent"
            onClick={() => setActiveCategory(category.id)}
          >
            <div
              className="flex h-12 w-12 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${category.color}20` }}
            >
              <Icon className="h-6 w-6" style={{ color: category.color }} />
            </div>
            <div>
              <h3 className="font-medium">{category.name}</h3>
              {category.appCount > 0 && (
                <p className="text-sm text-muted-foreground">
                  {category.appCount} apps
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
