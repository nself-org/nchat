"use client";

/**
 * Poll Creator Component
 *
 * Allows users to create polls with multiple options, settings, and expiration.
 */

import { useState, useCallback } from "react";
import { X, Plus, Calendar, Users, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  MIN_POLL_OPTIONS,
  MAX_POLL_OPTIONS,
  MAX_QUESTION_LENGTH,
  MAX_OPTION_LENGTH,
  DEFAULT_MAX_CHOICES,
  validateCreatePollInput,
  type CreatePollInput,
} from "@/lib/messages/polls";

interface PollCreatorProps {
  channelId: string;
  isOpen: boolean;
  onClose: () => void;
  onCreatePoll: (input: CreatePollInput) => Promise<void>;
}

export function PollCreator({
  channelId,
  isOpen,
  onClose,
  onCreatePoll,
}: PollCreatorProps) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [allowAddOptions, setAllowAddOptions] = useState(false);
  const [maxChoices, setMaxChoices] = useState(DEFAULT_MAX_CHOICES);
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const handleAddOption = useCallback(() => {
    if (options.length < MAX_POLL_OPTIONS) {
      setOptions([...options, ""]);
    }
  }, [options]);

  const handleRemoveOption = useCallback(
    (index: number) => {
      if (options.length > MIN_POLL_OPTIONS) {
        setOptions(options.filter((_, i) => i !== index));
      }
    },
    [options],
  );

  const handleOptionChange = useCallback(
    (index: number, value: string) => {
      const newOptions = [...options];
      newOptions[index] = value;
      setOptions(newOptions);
    },
    [options],
  );

  const handleCreatePoll = useCallback(async () => {
    const input: CreatePollInput = {
      question: question.trim(),
      options: options.map((o) => o.trim()).filter((o) => o.length > 0),
      channelId,
      isAnonymous,
      allowMultiple,
      allowAddOptions,
      maxChoices: allowMultiple ? maxChoices : 1,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    };

    const validation = validateCreatePollInput(input);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors([]);
    setIsCreating(true);

    try {
      await onCreatePoll(input);
      handleReset();
      onClose();
    } catch (error) {
      setErrors([
        error instanceof Error ? error.message : "Failed to create poll",
      ]);
    } finally {
      setIsCreating(false);
    }
  }, [
    question,
    options,
    channelId,
    isAnonymous,
    allowMultiple,
    allowAddOptions,
    maxChoices,
    expiresAt,
    onCreatePoll,
    onClose,
  ]);

  const handleReset = useCallback(() => {
    setQuestion("");
    setOptions(["", ""]);
    setIsAnonymous(false);
    setAllowMultiple(false);
    setAllowAddOptions(false);
    setMaxChoices(DEFAULT_MAX_CHOICES);
    setExpiresAt("");
    setShowAdvanced(false);
    setErrors([]);
  }, []);

  const handleClose = useCallback(() => {
    handleReset();
    onClose();
  }, [handleReset, onClose]);

  // Calculate minimum expiration time (5 minutes from now)
  const minExpirationDate = new Date(Date.now() + 5 * 60 * 1000)
    .toISOString()
    .slice(0, 16);

  // Calculate maximum expiration time (30 days from now)
  const maxExpirationDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 16);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create a Poll</DialogTitle>
          <DialogDescription>
            Ask a question and provide options for people to vote on
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Question */}
          <div className="space-y-2">
            <Label htmlFor="poll-question">Question *</Label>
            <Textarea
              id="poll-question"
              placeholder="What would you like to ask?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={MAX_QUESTION_LENGTH}
              rows={2}
              className="resize-none"
            />
            <div className="text-right text-xs text-muted-foreground">
              {question.length}/{MAX_QUESTION_LENGTH}
            </div>
          </div>

          {/* Options */}
          <div className="space-y-2">
            <Label>Options *</Label>
            <div className="space-y-2">
              {options.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder={`Option ${index + 1}`}
                      value={option}
                      onChange={(e) =>
                        handleOptionChange(index, e.target.value)
                      }
                      maxLength={MAX_OPTION_LENGTH}
                    />
                  </div>
                  {options.length > MIN_POLL_OPTIONS && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveOption(index)}
                      className="shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {options.length < MAX_POLL_OPTIONS && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddOption}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Option
              </Button>
            )}
            <div className="text-xs text-muted-foreground">
              {options.length}/{MAX_POLL_OPTIONS} options
            </div>
          </div>

          <Separator />

          {/* Basic Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="anonymous">Anonymous Voting</Label>
                <div className="text-xs text-muted-foreground">
                  Hide who voted for each option
                </div>
              </div>
              <Switch
                id="anonymous"
                checked={isAnonymous}
                onCheckedChange={setIsAnonymous}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="multiple">Allow Multiple Choices</Label>
                <div className="text-xs text-muted-foreground">
                  Let people select more than one option
                </div>
              </div>
              <Switch
                id="multiple"
                checked={allowMultiple}
                onCheckedChange={setAllowMultiple}
              />
            </div>

            {allowMultiple && (
              <div className="ml-8 space-y-2">
                <Label htmlFor="max-choices">Maximum Choices</Label>
                <Input
                  id="max-choices"
                  type="number"
                  min={1}
                  max={options.length}
                  value={maxChoices}
                  onChange={(e) =>
                    setMaxChoices(parseInt(e.target.value, 10) || 1)
                  }
                  className="w-24"
                />
              </div>
            )}
          </div>

          {/* Advanced Settings Toggle */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full"
          >
            <Settings2 className="mr-2 h-4 w-4" />
            {showAdvanced ? "Hide" : "Show"} Advanced Settings
          </Button>

          {/* Advanced Settings */}
          {showAdvanced && (
            <div className="bg-muted/50 space-y-4 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="add-options">
                    Allow _Users to Add Options
                  </Label>
                  <div className="text-xs text-muted-foreground">
                    Let participants suggest new options
                  </div>
                </div>
                <Switch
                  id="add-options"
                  checked={allowAddOptions}
                  onCheckedChange={setAllowAddOptions}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expires-at">
                  <Calendar className="mr-2 inline h-4 w-4" />
                  Poll Expiration (Optional)
                </Label>
                <Input
                  id="expires-at"
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  min={minExpirationDate}
                  max={maxExpirationDate}
                />
                <div className="text-xs text-muted-foreground">
                  Leave empty for no expiration. Must be at least 5 minutes in
                  the future.
                </div>
              </div>
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
          <Button onClick={handleCreatePoll} disabled={isCreating}>
            {isCreating ? "Creating..." : "Create Poll"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
