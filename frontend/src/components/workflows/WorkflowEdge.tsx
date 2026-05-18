"use client";

/**
 * WorkflowEdge - Connection line between workflow nodes
 *
 * Renders bezier curves connecting steps in the workflow
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { useWorkflowBuilderStore } from "@/stores/workflow-builder-store";
import type {
  WorkflowEdge as WorkflowEdgeType,
  Position,
} from "@/lib/workflows/workflow-types";

interface WorkflowEdgeProps {
  edge: WorkflowEdgeType;
  sourcePosition: Position;
  targetPosition: Position;
  isSelected?: boolean;
  className?: string;
}

export function WorkflowEdge({
  edge,
  sourcePosition,
  targetPosition,
  isSelected = false,
  className,
}: WorkflowEdgeProps) {
  const { selectEdge, deleteEdge } = useWorkflowBuilderStore();

  // Calculate bezier curve control points
  const dx = targetPosition.x - sourcePosition.x;
  const dy = targetPosition.y - sourcePosition.y;
  const controlPointOffset = Math.min(Math.abs(dx) * 0.5, 150);

  // Create path
  const path = `
    M ${sourcePosition.x} ${sourcePosition.y}
    C ${sourcePosition.x + controlPointOffset} ${sourcePosition.y},
      ${targetPosition.x - controlPointOffset} ${targetPosition.y},
      ${targetPosition.x} ${targetPosition.y}
  `;

  // Get edge color based on type
  const getEdgeColor = () => {
    switch (edge.type) {
      case "true":
        return "stroke-green-500";
      case "false":
        return "stroke-red-500";
      case "error":
        return "stroke-destructive";
      case "timeout":
        return "stroke-amber-500";
      case "loop":
        return "stroke-cyan-500";
      default:
        return "stroke-muted-foreground";
    }
  };

  // Handle click
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectEdge(edge.id);
  };

  // Handle double click to delete
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteEdge(edge.id);
  };

  // Calculate label position (midpoint of the curve)
  const labelX = (sourcePosition.x + targetPosition.x) / 2;
  const labelY = (sourcePosition.y + targetPosition.y) / 2 - 10;

  return (
    <g className={cn("workflow-edge", className)}>
      {/* Invisible wider path for easier clicking */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth="20"
        className="cursor-pointer"
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      />

      {/* Visible edge path */}
      <path
        d={path}
        fill="none"
        className={cn(
          "transition-all",
          getEdgeColor(),
          isSelected ? "stroke-primary stroke-[3]" : "stroke-2",
        )}
        strokeLinecap="round"
        markerEnd={isSelected ? "url(#arrowhead-selected)" : "url(#arrowhead)"}
      />

      {/* Edge label */}
      {edge.label && (
        <g transform={`translate(${labelX}, ${labelY})`}>
          <rect
            x="-20"
            y="-8"
            width="40"
            height="16"
            rx="4"
            fill="hsl(var(--card))"
            stroke="hsl(var(--border))"
            strokeWidth="1"
          />
          <text
            textAnchor="middle"
            dominantBaseline="middle"
            className="select-none fill-muted-foreground text-[10px]"
          >
            {edge.label}
          </text>
        </g>
      )}

      {/* Arrow marker definitions */}
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill="hsl(var(--muted-foreground))"
          />
        </marker>
        <marker
          id="arrowhead-selected"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--primary))" />
        </marker>
      </defs>
    </g>
  );
}

export default WorkflowEdge;
