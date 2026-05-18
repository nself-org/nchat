"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { COLLECTION_LIMITS, getRandomColor, getRandomIcon } from "@/lib/saved";

export interface CreateCollectionProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog is closed */
  onOpenChange: (open: boolean) => void;
  /** Callback when collection is created */
  onCreate: (data: {
    name: string;
    description?: string;
    icon?: string;
    color?: string;
  }) => void;
  /** Whether creation is in progress */
  isLoading?: boolean;
}

/**
 * Dialog for creating a new collection.
 */
export function CreateCollection({
  open,
  onOpenChange,
  onCreate,
  isLoading = false,
}: CreateCollectionProps) {
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [color, setColor] = React.useState(() => getRandomColor());
  const [icon, setIcon] = React.useState(() => getRandomIcon());
  const [error, setError] = React.useState<string | null>(null);

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      setName("");
      setDescription("");
      setColor(getRandomColor());
      setIcon(getRandomIcon());
      setError(null);
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Collection name is required");
      return;
    }

    if (trimmedName.length > COLLECTION_LIMITS.MAX_NAME_LENGTH) {
      setError(
        `Name cannot exceed ${COLLECTION_LIMITS.MAX_NAME_LENGTH} characters`,
      );
      return;
    }

    if (description.length > COLLECTION_LIMITS.MAX_DESCRIPTION_LENGTH) {
      setError(
        `Description cannot exceed ${COLLECTION_LIMITS.MAX_DESCRIPTION_LENGTH} characters`,
      );
      return;
    }

    onCreate({
      name: trimmedName,
      description: description.trim() || undefined,
      icon,
      color,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Collection</DialogTitle>
            <DialogDescription>
              Create a new collection to organize your saved messages.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Name */}
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                placeholder="My Collection"
                maxLength={COLLECTION_LIMITS.MAX_NAME_LENGTH}
                disabled={isLoading}
              />
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A brief description..."
                maxLength={COLLECTION_LIMITS.MAX_DESCRIPTION_LENGTH}
                rows={2}
                disabled={isLoading}
              />
            </div>

            {/* Color picker */}
            <div className="grid gap-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLLECTION_LIMITS.DEFAULT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={cn(
                      "h-8 w-8 rounded-full border-2 transition-transform hover:scale-110",
                      color === c
                        ? "border-primary ring-2 ring-primary ring-offset-2"
                        : "border-transparent",
                    )}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                    disabled={isLoading}
                  />
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="bg-muted/30 rounded-md border p-3">
              <div className="flex items-center gap-2">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded"
                  style={{ backgroundColor: color + "20", color }}
                >
                  <span className="text-lg">{getIconEmoji(icon)}</span>
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {name || "Collection Name"}
                  </p>
                  {description && (
                    <p className="truncate text-xs text-muted-foreground">
                      {description}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Error */}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Collection"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Helper to get emoji for icon name
function getIconEmoji(icon: string): string {
  const iconMap: Record<string, string> = {
    bookmark: "\u{1F516}",
    star: "\u{2B50}",
    heart: "\u{2764}\u{FE0F}",
    folder: "\u{1F4C1}",
    tag: "\u{1F3F7}\u{FE0F}",
    flag: "\u{1F6A9}",
    lightbulb: "\u{1F4A1}",
    check: "\u{2705}",
    clock: "\u{1F552}",
    archive: "\u{1F4E6}",
  };
  return iconMap[icon] ?? "\u{1F4C1}";
}
