"use client";

import { useState, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  BarChart3,
  Plus,
  Trash2,
  GripVertical,
  Calendar,
  Eye,
  EyeOff,
  Users,
  CheckCircle2,
  Clock,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePollCreator, useCreatePoll } from "@/lib/polls/use-poll";
import type { PollSettings } from "@/lib/polls/poll-store";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

interface CreatePollModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: string;
  onPollCreated?: (pollId: string) => void;
}

interface PollOptionInputProps {
  index: number;
  value: string;
  onChange: (value: string) => void;
  onRemove: () => void;
  canRemove: boolean;
  disabled?: boolean;
}

// ============================================================================
// Sub-components
// ============================================================================

function PollOptionInput({
  index,
  value,
  onChange,
  onRemove,
  canRemove,
  disabled,
}: PollOptionInputProps) {
  return (
    <div className="group flex items-center gap-2">
      <div className="flex h-6 w-6 items-center justify-center text-xs text-muted-foreground">
        <GripVertical className="h-4 w-4 cursor-grab opacity-50 transition-opacity group-hover:opacity-100" />
      </div>
      <div className="relative flex-1">
        <Input
          placeholder={`Option ${index + 1}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="pr-10"
          maxLength={200}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          {value.length}/200
        </span>
      </div>
      {canRemove && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          disabled={disabled}
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

function PollPreview({
  question,
  options,
  settings,
  endsAt,
}: {
  question: string;
  options: string[];
  settings: PollSettings;
  endsAt: Date | null;
}) {
  const [previewVote, setPreviewVote] = useState<number | null>(null);
  const validOptions = options.filter((o) => o.trim());

  // Simulated vote counts for preview
  const previewVotes = useMemo(() => {
    return validOptions.map(() => Math.floor(Math.random() * 50));
  }, [validOptions.length]);

  const totalVotes = previewVotes.reduce((a, b) => a + b, 0);

  return (
    <div className="bg-muted/30 space-y-4 rounded-xl border p-4">
      <div className="flex items-start gap-3">
        <div className="bg-primary/10 rounded-lg p-2">
          <BarChart3 className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-base font-semibold">
            {question || "Your question here..."}
          </h4>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span>{totalVotes} votes</span>
            {endsAt && (
              <>
                <span className="text-muted-foreground/50">|</span>
                <Clock className="h-3 w-3" />
                <span>Ends {endsAt.toLocaleDateString()}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {validOptions.map((option, index) => {
          const percentage =
            totalVotes > 0
              ? Math.round((previewVotes[index] / totalVotes) * 100)
              : 0;
          const isSelected = previewVote === index;

          return (
            <button
              key={index}
              type="button"
              onClick={() => setPreviewVote(isSelected ? null : index)}
              className={cn(
                "relative w-full overflow-hidden rounded-lg border p-3 text-left transition-all",
                isSelected
                  ? "bg-primary/5 border-primary"
                  : "hover:border-primary/50 hover:bg-accent/50 border-border",
              )}
            >
              {/* Progress background */}
              <div
                className={cn(
                  "absolute inset-y-0 left-0 transition-all",
                  isSelected ? "bg-primary/10" : "bg-muted",
                )}
                style={{ width: `${percentage}%` }}
              />

              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isSelected && (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  )}
                  <span className={cn("text-sm", isSelected && "font-medium")}>
                    {option}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">
                    {previewVotes[index]}
                  </span>
                  <span className="font-medium">{percentage}%</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Settings badges */}
      <div className="flex flex-wrap gap-2">
        {settings.allowMultipleVotes && (
          <Badge variant="secondary" className="text-xs">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Multiple choices
          </Badge>
        )}
        {settings.isAnonymous && (
          <Badge variant="secondary" className="text-xs">
            <EyeOff className="mr-1 h-3 w-3" />
            Anonymous
          </Badge>
        )}
        {settings.allowAddOptions && (
          <Badge variant="secondary" className="text-xs">
            <Plus className="mr-1 h-3 w-3" />
            Users can add options
          </Badge>
        )}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        This is a preview. Click options to see how voting works.
      </p>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function CreatePollModal({
  open,
  onOpenChange,
  channelId,
  onPollCreated,
}: CreatePollModalProps) {
  const {
    question,
    options,
    settings,
    endsAt,
    step,
    isValid,
    errors,
    setQuestion,
    addOption,
    removeOption,
    updateOption,
    setSettings,
    setEndsAt,
    setStep,
    reset,
  } = usePollCreator();

  const { createPoll, creating } = useCreatePoll();
  const [submitting, setSubmitting] = useState(false);

  const validOptions = useMemo(
    () => options.filter((o) => o.trim()),
    [options],
  );

  const handleClose = useCallback(() => {
    onOpenChange(false);
    // Delay reset to allow animation to complete
    setTimeout(() => {
      reset();
      setStep("create");
    }, 300);
  }, [onOpenChange, reset, setStep]);

  const handleSubmit = useCallback(async () => {
    if (!isValid || submitting) return;

    setSubmitting(true);
    try {
      // Generate a temporary message ID (in real implementation, message would be created first)
      const messageId = `poll-msg-${Date.now()}`;

      const poll = await createPoll({
        channelId,
        messageId,
        question,
        options: validOptions,
        settings,
        endsAt,
      });

      if (poll) {
        onPollCreated?.(poll.id);
        handleClose();
      }
    } catch (error) {
      logger.error("Failed to create poll:", error);
    } finally {
      setSubmitting(false);
    }
  }, [
    isValid,
    submitting,
    createPoll,
    channelId,
    question,
    validOptions,
    settings,
    endsAt,
    onPollCreated,
    handleClose,
  ]);

  const handleDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setEndsAt(value ? new Date(value) : null);
    },
    [setEndsAt],
  );

  const formatDateForInput = (date: Date | null) => {
    if (!date) return "";
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60 * 1000);
    return localDate.toISOString().slice(0, 16);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            {step === "create" ? "Create a Poll" : "Preview Poll"}
          </DialogTitle>
          <DialogDescription>
            {step === "create"
              ? "Create a poll to gather opinions from your team."
              : "Review your poll before posting."}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 px-1">
          <div
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              step === "create" ? "bg-primary" : "bg-primary/30",
            )}
          />
          <div
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              step === "preview" ? "bg-primary" : "bg-muted",
            )}
          />
        </div>

        <ScrollArea className="-mx-6 flex-1 px-6">
          <div className="space-y-6 py-4">
            {step === "create" ? (
              <>
                {/* Question input */}
                <div className="space-y-2">
                  <Label htmlFor="poll-question">
                    Question <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="poll-question"
                    placeholder="What would you like to ask?"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    disabled={creating || submitting}
                    maxLength={500}
                    className="text-base"
                  />
                  <p className="text-right text-xs text-muted-foreground">
                    {question.length}/500
                  </p>
                </div>

                {/* Options */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>
                      Options <span className="text-destructive">*</span>
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      {validOptions.length} of {options.length} filled (min 2)
                    </span>
                  </div>

                  <div className="space-y-2">
                    {options.map((option, index) => (
                      <PollOptionInput
                        key={index}
                        index={index}
                        value={option}
                        onChange={(value) => updateOption(index, value)}
                        onRemove={() => removeOption(index)}
                        canRemove={options.length > 2}
                        disabled={creating || submitting}
                      />
                    ))}
                  </div>

                  {options.length < 10 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addOption}
                      disabled={creating || submitting}
                      className="w-full"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Option ({options.length}/10)
                    </Button>
                  )}
                </div>

                <Separator />

                {/* Settings */}
                <div className="space-y-4">
                  <Label className="text-base">Poll Settings</Label>

                  <div className="space-y-4">
                    {/* Multiple choice */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label
                          htmlFor="multiple-votes"
                          className="cursor-pointer font-normal"
                        >
                          Allow multiple choices
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Voters can select more than one option
                        </p>
                      </div>
                      <Switch
                        id="multiple-votes"
                        checked={settings.allowMultipleVotes}
                        onCheckedChange={(checked) =>
                          setSettings({ allowMultipleVotes: checked })
                        }
                        disabled={creating || submitting}
                      />
                    </div>

                    {/* Anonymous voting */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label
                          htmlFor="anonymous"
                          className="flex cursor-pointer items-center gap-2 font-normal"
                        >
                          <EyeOff className="h-4 w-4" />
                          Anonymous voting
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Voters&apos; identities will be hidden
                        </p>
                      </div>
                      <Switch
                        id="anonymous"
                        checked={settings.isAnonymous}
                        onCheckedChange={(checked) =>
                          setSettings({ isAnonymous: checked })
                        }
                        disabled={creating || submitting}
                      />
                    </div>

                    {/* Allow adding options */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label
                          htmlFor="add-options"
                          className="flex cursor-pointer items-center gap-2 font-normal"
                        >
                          <Users className="h-4 w-4" />
                          Allow users to add options
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Anyone can add new options to the poll
                        </p>
                      </div>
                      <Switch
                        id="add-options"
                        checked={settings.allowAddOptions}
                        onCheckedChange={(checked) =>
                          setSettings({ allowAddOptions: checked })
                        }
                        disabled={creating || submitting}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* End date */}
                <div className="space-y-2">
                  <Label htmlFor="end-date" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    End Date (optional)
                  </Label>
                  <Input
                    id="end-date"
                    type="datetime-local"
                    value={formatDateForInput(endsAt)}
                    onChange={handleDateChange}
                    min={formatDateForInput(new Date())}
                    disabled={creating || submitting}
                  />
                  <p className="text-xs text-muted-foreground">
                    Poll will automatically close at this time. Leave empty for
                    no end date.
                  </p>
                </div>

                {/* Validation errors */}
                {errors.length > 0 && (
                  <div className="bg-destructive/10 border-destructive/20 rounded-lg border p-3">
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      <span className="font-medium">
                        Please fix the following:
                      </span>
                    </div>
                    <ul className="text-destructive/80 mt-2 list-inside list-disc text-sm">
                      {errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <PollPreview
                question={question}
                options={validOptions}
                settings={settings}
                endsAt={endsAt}
              />
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          {step === "create" ? (
            <>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                onClick={() => setStep("preview")}
                disabled={!isValid || submitting}
              >
                Preview
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setStep("create")}
                disabled={submitting}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={!isValid || submitting}>
                {submitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Poll
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CreatePollModal;
