"use client";

import * as React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit2, Check, X } from "lucide-react";
import type { DirectMessage } from "@/lib/dm/dm-types";
import { canModifyGroupSettings, getGroupDisplayName } from "@/lib/dm";
import { useDMStore } from "@/stores/dm-store";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

interface GroupDMNameProps {
  dm: DirectMessage;
  currentUserId: string;
  editable?: boolean;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function GroupDMName({
  dm,
  currentUserId,
  editable = true,
  className,
}: GroupDMNameProps) {
  const { updateDM } = useDMStore();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(dm.name || "");

  const canEdit = editable && canModifyGroupSettings(dm, currentUserId);
  const displayName = getGroupDisplayName(dm, currentUserId);

  const handleSave = async () => {
    if (!name.trim() || name === dm.name) {
      setIsEditing(false);
      setName(dm.name || "");
      return;
    }

    try {
      updateDM(dm.id, { name: name.trim() });
      setIsEditing(false);
    } catch (error) {
      logger.error("Failed to update name:", error);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setName(dm.name || "");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter group name"
          maxLength={100}
          className="h-8"
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleSave}
        >
          <Check className="h-4 w-4 text-green-500" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleCancel}
        >
          <X className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("group flex items-center gap-2", className)}>
      <h2 className="truncate font-semibold">{displayName}</h2>
      {canEdit && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={() => setIsEditing(true)}
        >
          <Edit2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

GroupDMName.displayName = "GroupDMName";
