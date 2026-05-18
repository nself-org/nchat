"use client";

/**
 * TaskActivity Component
 *
 * Displays task-related activities (completed, assigned)
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { ActivityAvatar } from "../ActivityAvatar";
import { ActivityDate } from "../ActivityDate";
import { ActivityIcon } from "../ActivityIcon";
import type {
  TaskCompletedActivity,
  TaskAssignedActivity,
} from "@/lib/activity/activity-types";

type TaskActivityType = TaskCompletedActivity | TaskAssignedActivity;

interface TaskActivityProps {
  activity: TaskActivityType;
  onClick?: () => void;
  className?: string;
}

// Status badge component
function TaskStatusBadge({ status }: { status: string }) {
  const statusStyles: Record<string, string> = {
    pending: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    in_progress:
      "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    completed:
      "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    cancelled: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  };

  const statusLabels: Record<string, string> = {
    pending: "Pending",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-xs font-medium",
        statusStyles[status] || statusStyles.pending,
      )}
    >
      {statusLabels[status] || status}
    </span>
  );
}

export function TaskActivity({
  activity,
  onClick,
  className,
}: TaskActivityProps) {
  const { actor, task, type, isRead, createdAt } = activity;
  const isCompleted = type === "task_completed";

  return (
    <div
      className={cn(
        "group relative flex cursor-pointer gap-3 rounded-lg p-3 transition-colors",
        "hover:bg-muted/50",
        !isRead &&
          (isCompleted
            ? "bg-green-50 dark:bg-green-950/30"
            : "bg-blue-50 dark:bg-blue-950/30"),
        className,
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {/* Unread indicator */}
      {!isRead && (
        <div
          className={cn(
            "absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full",
            isCompleted ? "bg-green-500" : "bg-blue-500",
          )}
        />
      )}

      {/* Avatar */}
      <ActivityAvatar actor={actor} size="md" />

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {/* Header */}
            <p className={cn("text-sm", !isRead && "font-medium")}>
              {isCompleted ? (
                <>
                  <span className="font-medium">{actor.displayName}</span>
                  {" completed a task"}
                </>
              ) : (
                <>
                  <span className="font-medium">
                    {(activity as TaskAssignedActivity).assignedBy.displayName}
                  </span>
                  {" assigned a task to "}
                  <span className="font-medium">{actor.displayName}</span>
                </>
              )}
            </p>

            {/* Task card */}
            <div className="mt-2 rounded-md border bg-background p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {/* Checkbox icon */}
                  {isCompleted ? (
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 border-green-500 bg-green-500">
                      <svg
                        className="h-3 w-3 text-white"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  ) : (
                    <div className="border-muted-foreground/30 h-5 w-5 shrink-0 rounded border-2" />
                  )}
                  <span
                    className={cn(
                      "text-sm font-medium",
                      isCompleted && "text-muted-foreground line-through",
                    )}
                  >
                    {task.title}
                  </span>
                </div>
                <TaskStatusBadge status={task.status} />
              </div>

              {/* Description */}
              {task.description && (
                <p className="ml-7 mt-2 line-clamp-2 text-sm text-muted-foreground">
                  {task.description}
                </p>
              )}

              {/* Due date */}
              {task.dueAt && (
                <p className="ml-7 mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <svg
                    className="h-3 w-3"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  Due: <ActivityDate date={task.dueAt} format="absolute" />
                </p>
              )}

              {/* Assignee */}
              {task.assignee && (
                <div className="ml-7 mt-2 flex items-center gap-2">
                  <ActivityAvatar actor={task.assignee} size="sm" />
                  <span className="text-xs text-muted-foreground">
                    {task.assignee.displayName}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Timestamp */}
          <ActivityDate date={createdAt} className="shrink-0" />
        </div>
      </div>
    </div>
  );
}

export default TaskActivity;
