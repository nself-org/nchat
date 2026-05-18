"use client";

/**
 * WorkflowNode - Individual workflow step node
 *
 * Represents a single step in the workflow canvas
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { useWorkflowBuilderStore } from "@/stores/workflow-builder-store";
import {
  getOutputHandles,
  getInputHandles,
} from "@/lib/workflows/workflow-steps";
import type { WorkflowStep, Position } from "@/lib/workflows/workflow-types";
import {
  Zap,
  MessageSquare,
  ClipboardList,
  GitBranch,
  Clock,
  Globe,
  CheckCircle,
  Play,
  Repeat,
  GitFork,
  Square,
  GripVertical,
} from "lucide-react";

interface WorkflowNodeProps {
  step: WorkflowStep;
  isSelected: boolean;
  className?: string;
}

// Icon mapping for step types
const stepIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  trigger: Zap,
  message: MessageSquare,
  form: ClipboardList,
  condition: GitBranch,
  delay: Clock,
  webhook: Globe,
  approval: CheckCircle,
  action: Play,
  loop: Repeat,
  parallel: GitFork,
  end: Square,
};

export function WorkflowNode({
  step,
  isSelected,
  className,
}: WorkflowNodeProps) {
  const nodeRef = React.useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragOffset, setDragOffset] = React.useState<Position>({ x: 0, y: 0 });

  const {
    selectStep,
    moveStep,
    startConnection,
    endConnection,
    isConnecting,
    startStepDrag,
    endDrag,
    canvas,
    setSidebarTab,
    setPropertiesPanelOpen,
  } = useWorkflowBuilderStore();

  const Icon = stepIcons[step.type] || Play;
  const outputHandles = getOutputHandles(step.type);
  const inputHandles = getInputHandles(step.type);

  // Handle node click
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isConnecting) {
      endConnection(step.id);
    } else {
      selectStep(step.id, e.shiftKey || e.metaKey || e.ctrlKey);
      setSidebarTab("properties");
      setPropertiesPanelOpen(true);
    }
  };

  // Handle double click to edit
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSidebarTab("properties");
    setPropertiesPanelOpen(true);
  };

  // Handle drag start
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest(".node-handle")) return;

    e.stopPropagation();

    if (!isSelected) {
      selectStep(step.id);
    }

    const rect = nodeRef.current?.getBoundingClientRect();
    if (!rect) return;

    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsDragging(true);
    startStepDrag(step.id);
  };

  // Handle drag move
  React.useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const containerRect =
        nodeRef.current?.parentElement?.getBoundingClientRect();
      if (!containerRect) return;

      const x = (e.clientX - containerRect.left) / canvas.zoom - dragOffset.x;
      const y = (e.clientY - containerRect.top) / canvas.zoom - dragOffset.y;

      moveStep(step.id, {
        x: Math.max(0, Math.round(x / 10) * 10), // Snap to grid
        y: Math.max(0, Math.round(y / 10) * 10),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      endDrag();
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, canvas.zoom, dragOffset, step.id, moveStep, endDrag]);

  // Handle output click (start connection)
  const handleOutputClick = (e: React.MouseEvent, handleId?: string) => {
    e.stopPropagation();
    startConnection(step.id, handleId);
  };

  // Handle input click (end connection)
  const handleInputClick = (e: React.MouseEvent, handleId?: string) => {
    e.stopPropagation();
    if (isConnecting) {
      endConnection(step.id, handleId);
    }
  };

  // Get node color based on step type
  const getNodeColor = () => {
    const colors: Record<string, string> = {
      trigger: "border-green-500 bg-green-500/10",
      message: "border-blue-500 bg-blue-500/10",
      form: "border-purple-500 bg-purple-500/10",
      condition: "border-amber-500 bg-amber-500/10",
      delay: "border-indigo-500 bg-indigo-500/10",
      webhook: "border-pink-500 bg-pink-500/10",
      approval: "border-teal-500 bg-teal-500/10",
      action: "border-orange-500 bg-orange-500/10",
      loop: "border-cyan-500 bg-cyan-500/10",
      parallel: "border-lime-500 bg-lime-500/10",
      end: "border-gray-500 bg-gray-500/10",
    };
    return colors[step.type] || "border-gray-500 bg-gray-500/10";
  };

  return (
    <div
      ref={nodeRef}
      className={cn(
        "absolute min-w-[240px] rounded-lg border-2 bg-card shadow-sm",
        "transition-shadow",
        getNodeColor(),
        isSelected &&
          "ring-2 ring-primary ring-offset-2 ring-offset-background",
        isDragging && "cursor-grabbing opacity-90 shadow-lg",
        !isDragging && "cursor-grab hover:shadow-md",
        isConnecting && "cursor-crosshair",
        className,
      )}
      style={{
        left: step.position.x,
        top: step.position.y,
      }}
      role="button"
      tabIndex={0}
      aria-label={`Workflow step: ${step.name}`}
      aria-pressed={isSelected ? "true" : "false"}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleMouseDown}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick(e as unknown as React.MouseEvent);
        }
      }}
    >
      {/* Input handle */}
      {inputHandles.length > 0 && (
        <div
          className={cn(
            "node-handle absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2",
            "h-3 w-3 rounded-full border-2 border-muted-foreground bg-background",
            "cursor-crosshair transition-colors hover:border-primary hover:bg-primary",
          )}
          role="button"
          tabIndex={0}
          aria-label="Input connection handle"
          onClick={(e) => handleInputClick(e)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleInputClick(e as unknown as React.MouseEvent);
            }
          }}
        />
      )}

      {/* Header */}
      <div className="border-border/50 flex items-center gap-2 border-b px-3 py-2">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
        <Icon className="h-4 w-4 text-foreground" />
        <span className="flex-1 truncate text-sm font-medium">{step.name}</span>
      </div>

      {/* Content */}
      <div className="px-3 py-2">
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {step.description || getStepDescription(step)}
        </p>
      </div>

      {/* Output handles */}
      {outputHandles.length > 0 && (
        <div className="absolute bottom-0 right-0 top-0 flex translate-x-1/2 flex-col justify-center gap-2 py-4">
          {outputHandles.map((handle) => (
            <div
              key={handle}
              className={cn(
                "node-handle flex items-center gap-1",
                outputHandles.length > 1 && "relative",
              )}
            >
              <div
                className={cn(
                  "h-3 w-3 rounded-full border-2 bg-background",
                  "cursor-crosshair transition-colors hover:border-primary hover:bg-primary",
                  handle === "true" && "border-green-500",
                  handle === "false" && "border-red-500",
                  handle === "default" && "border-muted-foreground",
                  handle === "timeout" && "border-amber-500",
                )}
                role="button"
                tabIndex={0}
                aria-label={`Output connection handle: ${handle}`}
                onClick={(e) => handleOutputClick(e, handle)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleOutputClick(e as unknown as React.MouseEvent, handle);
                  }
                }}
              />
              {outputHandles.length > 1 && (
                <span className="absolute left-4 whitespace-nowrap text-[10px] text-muted-foreground">
                  {handle}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Get a brief description for the step
function getStepDescription(step: WorkflowStep): string {
  switch (step.type) {
    case "trigger":
      return `Triggers on ${(step.config as { triggerType?: string }).triggerType || "event"}`;
    case "message":
      return "Sends a message";
    case "form":
      return "Collects information";
    case "condition":
      return "Branches based on conditions";
    case "delay":
      return "Waits before continuing";
    case "webhook":
      return "Calls an external API";
    case "approval":
      return "Requests approval";
    case "action":
      return `Performs ${(step.config as { actionType?: string }).actionType || "action"}`;
    case "loop":
      return "Repeats steps";
    case "parallel":
      return "Runs branches in parallel";
    case "end":
      return "Ends the workflow";
    default:
      return "Workflow step";
  }
}

export default WorkflowNode;
