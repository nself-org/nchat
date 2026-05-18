"use client";

import { ReactNode } from "react";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon | ReactNode;
  trend?: {
    value: number;
    label?: string;
    direction?: "up" | "down" | "neutral";
    isPositive?: boolean;
  };
  className?: string;
  onClick?: () => void;
  loading?: boolean;
}

export function StatsCard({
  title,
  value,
  description,
  icon,
  trend,
  className,
  onClick,
  loading = false,
}: StatsCardProps) {
  // Determine icon component
  const IconComponent = typeof icon === "function" ? icon : null;
  const iconElement = IconComponent ? (
    <IconComponent className="h-4 w-4 text-muted-foreground" />
  ) : icon && typeof icon !== "function" ? (
    <span className="text-muted-foreground">{icon as ReactNode}</span>
  ) : null;

  // Determine trend direction from isPositive if direction not provided
  const trendDirection =
    trend?.direction ??
    (trend?.isPositive !== undefined
      ? trend.isPositive
        ? "up"
        : "down"
      : "neutral");

  const TrendIcon =
    trendDirection === "up"
      ? TrendingUp
      : trendDirection === "down"
        ? TrendingDown
        : Minus;

  const trendColor =
    trendDirection === "up"
      ? "text-green-600 dark:text-green-400"
      : trendDirection === "down"
        ? "text-red-600 dark:text-red-400"
        : "text-muted-foreground";

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all",
        onClick && "cursor-pointer hover:border-primary hover:shadow-md",
        className,
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {iconElement}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <div className="h-8 w-24 animate-pulse rounded bg-muted" />
            {description && (
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            )}
          </div>
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                {typeof value === "number" ? value.toLocaleString() : value}
              </span>
            </div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
            {trend && (
              <div
                className={cn(
                  "mt-2 flex items-center gap-1 text-xs",
                  trendColor,
                )}
              >
                <TrendIcon className="h-3 w-3" />
                <span className="font-medium">
                  {trendDirection === "up"
                    ? "+"
                    : trendDirection === "down"
                      ? ""
                      : ""}
                  {trend.value}%
                </span>
                {trend.label && (
                  <span className="text-muted-foreground">{trend.label}</span>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Variant for displaying a compact inline stat
interface InlineStatProps {
  label: string;
  value: number | string;
  icon?: ReactNode;
  className?: string;
}

export function InlineStat({ label, value, icon, className }: InlineStatProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {icon && <span className="text-muted-foreground">{icon}</span>}
      <span className="text-sm text-muted-foreground">{label}:</span>
      <span className="font-medium">
        {typeof value === "number" ? value.toLocaleString() : value}
      </span>
    </div>
  );
}

// Grid container for stats cards
interface StatsGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

export function StatsGrid({
  children,
  columns = 4,
  className,
}: StatsGridProps) {
  const gridCols = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div className={cn("grid gap-4", gridCols[columns], className)}>
      {children}
    </div>
  );
}

export default StatsCard;
