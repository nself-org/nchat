"use client";

/**
 * Message Forward Modal
 *
 * Allows users to forward messages to multiple channels with optional comment.
 */

import { useState, useCallback, useMemo } from "react";
import {
  Search,
  Send,
  X,
  Hash,
  User,
  MessageSquare,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import {
  validateForwardRequest,
  getDestinationDisplayText,
  getForwardModeDisplayText,
  getForwardModeDescription,
  getForwardSummary,
  filterDestinations,
  isDestinationSelected,
  MAX_FORWARD_DESTINATIONS,
  MAX_FORWARD_COMMENT_LENGTH,
  type ForwardableMessage,
  type ForwardDestination,
  type ForwardingMode,
} from "@/lib/messages/message-forwarding";

interface MessageForwardModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ForwardableMessage[];
  availableDestinations: ForwardDestination[];
  recentDestinations?: ForwardDestination[];
  onForward: (
    messages: ForwardableMessage[],
    destinations: ForwardDestination[],
    mode: ForwardingMode,
    comment?: string,
  ) => Promise<void>;
}

export function MessageForwardModal({
  isOpen,
  onClose,
  messages,
  availableDestinations,
  recentDestinations = [],
  onForward,
}: MessageForwardModalProps) {
  const [selectedDestinations, setSelectedDestinations] = useState<
    ForwardDestination[]
  >([]);
  const [forwardMode, setForwardMode] = useState<ForwardingMode>("forward");
  const [comment, setComment] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isForwarding, setIsForwarding] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const filteredDestinations = useMemo(() => {
    return filterDestinations(availableDestinations, searchQuery);
  }, [availableDestinations, searchQuery]);

  const handleToggleDestination = useCallback(
    (destination: ForwardDestination) => {
      setSelectedDestinations((prev) => {
        if (isDestinationSelected(destination, prev)) {
          return prev.filter(
            (d) => !(d.type === destination.type && d.id === destination.id),
          );
        }

        if (prev.length >= MAX_FORWARD_DESTINATIONS) {
          return prev;
        }

        return [...prev, destination];
      });
    },
    [],
  );

  const handleRemoveDestination = useCallback(
    (destination: ForwardDestination) => {
      setSelectedDestinations((prev) =>
        prev.filter(
          (d) => !(d.type === destination.type && d.id === destination.id),
        ),
      );
    },
    [],
  );

  const handleForward = useCallback(async () => {
    const validation = validateForwardRequest(
      messages,
      selectedDestinations,
      comment,
    );

    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors([]);
    setIsForwarding(true);

    try {
      await onForward(
        messages,
        selectedDestinations,
        forwardMode,
        comment || undefined,
      );
      handleReset();
      onClose();
    } catch (error) {
      setErrors([
        error instanceof Error ? error.message : "Failed to forward messages",
      ]);
    } finally {
      setIsForwarding(false);
    }
  }, [
    messages,
    selectedDestinations,
    forwardMode,
    comment,
    onForward,
    onClose,
  ]);

  const handleReset = useCallback(() => {
    setSelectedDestinations([]);
    setForwardMode("forward");
    setComment("");
    setSearchQuery("");
    setErrors([]);
  }, []);

  const handleClose = useCallback(() => {
    handleReset();
    onClose();
  }, [handleReset, onClose]);

  const getDestinationIcon = (type: ForwardDestination["type"]) => {
    switch (type) {
      case "channel":
        return <Hash className="h-4 w-4" />;
      case "user":
        return <User className="h-4 w-4" />;
      case "thread":
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Forward Messages</DialogTitle>
          <DialogDescription>
            Forward {messages.length} message{messages.length !== 1 ? "s" : ""}{" "}
            to other channels or users
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-hidden py-4">
          {/* Forwarding Mode */}
          <div className="space-y-3">
            <Label>Forwarding Mode</Label>
            <RadioGroup
              value={forwardMode}
              onValueChange={(v) => setForwardMode(v as ForwardingMode)}
            >
              <div className="space-y-2">
                {(["forward", "copy", "quote"] as ForwardingMode[]).map(
                  (mode) => (
                    <label
                      key={mode}
                      htmlFor={mode}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                        "hover:border-accent-foreground/20 hover:bg-accent",
                        forwardMode === mode && "bg-primary/5 border-primary",
                      )}
                    >
                      <RadioGroupItem
                        value={mode}
                        id={mode}
                        className="mt-0.5"
                      />
                      <div className="flex-1 space-y-1">
                        <div className="font-medium">
                          {getForwardModeDisplayText(mode)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {getForwardModeDescription(mode)}
                        </div>
                      </div>
                    </label>
                  ),
                )}
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Destination Selection */}
          <div className="flex min-h-0 flex-1 flex-col space-y-3">
            <Label>
              Select Destinations ({selectedDestinations.length}/
              {MAX_FORWARD_DESTINATIONS})
            </Label>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search channels and users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Selected Destinations */}
            {selectedDestinations.length > 0 && (
              <div className="flex flex-wrap gap-2 rounded-lg bg-muted p-3">
                {selectedDestinations.map((dest) => (
                  <Badge
                    key={`${dest.type}-${dest.id}`}
                    variant="secondary"
                    className="py-1 pl-2 pr-1"
                  >
                    {getDestinationDisplayText(dest)}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="ml-1 h-4 w-4 hover:bg-transparent"
                      onClick={() => handleRemoveDestination(dest)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Recent Destinations */}
            {recentDestinations.length > 0 && searchQuery === "" && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">
                  Recent
                </div>
                <div className="space-y-1">
                  {recentDestinations.slice(0, 5).map((dest) => {
                    const isSelected = isDestinationSelected(
                      dest,
                      selectedDestinations,
                    );

                    return (
                      <button
                        key={`${dest.type}-${dest.id}`}
                        type="button"
                        onClick={() => handleToggleDestination(dest)}
                        disabled={
                          !isSelected &&
                          selectedDestinations.length >=
                            MAX_FORWARD_DESTINATIONS
                        }
                        className={cn(
                          "flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors",
                          "hover:bg-accent",
                          isSelected && "bg-primary/10 hover:bg-primary/15",
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
                            isSelected
                              ? "border-primary bg-primary"
                              : "border-muted-foreground",
                          )}
                        >
                          {isSelected && (
                            <Check className="text-primary-foreground h-3 w-3" />
                          )}
                        </div>
                        <div className="shrink-0 text-muted-foreground">
                          {getDestinationIcon(dest.type)}
                        </div>
                        {dest.avatarUrl && (
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={dest.avatarUrl} />
                            <AvatarFallback>{dest.name[0]}</AvatarFallback>
                          </Avatar>
                        )}
                        <span className="flex-1 truncate">{dest.name}</span>
                        {dest.isPrivate && (
                          <Badge variant="secondary" className="text-xs">
                            Private
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* All Destinations */}
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="mb-2 text-xs font-medium text-muted-foreground">
                {searchQuery ? "Search Results" : "All Destinations"}
              </div>
              <ScrollArea className="-mr-4 flex-1 pr-4">
                <div className="space-y-1">
                  {filteredDestinations.map((dest) => {
                    const isSelected = isDestinationSelected(
                      dest,
                      selectedDestinations,
                    );
                    const isRecent = recentDestinations.some(
                      (r) => r.type === dest.type && r.id === dest.id,
                    );

                    if (isRecent && searchQuery === "") return null;

                    return (
                      <button
                        key={`${dest.type}-${dest.id}`}
                        type="button"
                        onClick={() => handleToggleDestination(dest)}
                        disabled={
                          !isSelected &&
                          selectedDestinations.length >=
                            MAX_FORWARD_DESTINATIONS
                        }
                        className={cn(
                          "flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors",
                          "hover:bg-accent",
                          isSelected && "bg-primary/10 hover:bg-primary/15",
                          !isSelected &&
                            selectedDestinations.length >=
                              MAX_FORWARD_DESTINATIONS &&
                            "cursor-not-allowed opacity-50",
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
                            isSelected
                              ? "border-primary bg-primary"
                              : "border-muted-foreground",
                          )}
                        >
                          {isSelected && (
                            <Check className="text-primary-foreground h-3 w-3" />
                          )}
                        </div>
                        <div className="shrink-0 text-muted-foreground">
                          {getDestinationIcon(dest.type)}
                        </div>
                        {dest.avatarUrl && (
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={dest.avatarUrl} />
                            <AvatarFallback>{dest.name[0]}</AvatarFallback>
                          </Avatar>
                        )}
                        <span className="flex-1 truncate">{dest.name}</span>
                        {dest.isPrivate && (
                          <Badge variant="secondary" className="text-xs">
                            Private
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
                {filteredDestinations.length === 0 && (
                  <div className="py-8 text-center text-muted-foreground">
                    No destinations found
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          <Separator />

          {/* Optional Comment */}
          <div className="space-y-2">
            <Label htmlFor="forward-comment">Add a comment (optional)</Label>
            <Textarea
              id="forward-comment"
              placeholder="Add context for the forwarded message..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={MAX_FORWARD_COMMENT_LENGTH}
              rows={2}
              className="resize-none"
            />
            <div className="text-right text-xs text-muted-foreground">
              {comment.length}/{MAX_FORWARD_COMMENT_LENGTH}
            </div>
          </div>

          {/* Summary */}
          {selectedDestinations.length > 0 && (
            <div className="rounded-lg bg-muted p-3 text-sm">
              {getForwardSummary(
                messages.length,
                selectedDestinations.length,
                forwardMode,
              )}
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <div className="border-destructive/50 bg-destructive/10 rounded-md border p-3">
              <ul className="space-y-1 text-sm text-destructive">
                {errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleForward}
            disabled={isForwarding || selectedDestinations.length === 0}
          >
            <Send className="mr-2 h-4 w-4" />
            {isForwarding ? "Forwarding..." : "Forward"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
