"use client";

/**
 * Create Poll Modal Component
 *
 * Comprehensive modal for creating polls with multiple options, settings,
 * and validation. Supports single/multiple choice, anonymous voting,
 * expiration times, and advanced features.
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  X,
  Plus,
  Calendar,
  Settings2,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type {
  CreatePollInput,
  PollSettings,
  PollResultsVisibility,
} from "@/types/poll";

interface CreatePollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreatePoll: (input: CreatePollInput) => Promise<void>;
  channelId: string;
  defaultSettings?: Partial<PollSettings>;
}

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 10;
const MAX_QUESTION_LENGTH = 300;
const MAX_OPTION_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;

export function CreatePollModal({
  isOpen,
  onClose,
  onCreatePoll,
  channelId,
  defaultSettings,
}: CreatePollModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"basic" | "advanced">("basic");

  // Basic fields
  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);

  // Settings
  const [allowMultiple, setAllowMultiple] = useState(
    defaultSettings?.allowMultiple ?? false,
  );
  const [maxSelections, setMaxSelections] = useState(
    defaultSettings?.maxSelections ?? 2,
  );
  const [minSelections, setMinSelections] = useState(
    defaultSettings?.minSelections ?? 1,
  );
  const [isAnonymous, setIsAnonymous] = useState(
    defaultSettings?.isAnonymous ?? false,
  );
  const [resultsVisibility, setResultsVisibility] =
    useState<PollResultsVisibility>(
      defaultSettings?.resultsVisibility ?? "after_vote",
    );
  const [allowVoteChange, setAllowVoteChange] = useState(
    defaultSettings?.allowVoteChange ?? true,
  );
  const [allowAddOptions, setAllowAddOptions] = useState(
    defaultSettings?.allowAddOptions ?? false,
  );
  const [showVoterNames, setShowVoterNames] = useState(
    defaultSettings?.showVoterNames ?? true,
  );
  const [showRealTimeResults, setShowRealTimeResults] = useState(
    defaultSettings?.showRealTimeResults ?? true,
  );

  // Expiration
  const [hasExpiration, setHasExpiration] = useState(false);
  const [expirationDate, setExpirationDate] = useState("");
  const [expirationTime, setExpirationTime] = useState("");

  // Quick duration presets
  const [quickDuration, setQuickDuration] = useState<string>("");

  // Validation
  const [errors, setErrors] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setQuestion("");
      setDescription("");
      setOptions(["", ""]);
      setAllowMultiple(defaultSettings?.allowMultiple ?? false);
      setMaxSelections(defaultSettings?.maxSelections ?? 2);
      setMinSelections(defaultSettings?.minSelections ?? 1);
      setIsAnonymous(defaultSettings?.isAnonymous ?? false);
      setResultsVisibility(defaultSettings?.resultsVisibility ?? "after_vote");
      setAllowVoteChange(defaultSettings?.allowVoteChange ?? true);
      setAllowAddOptions(defaultSettings?.allowAddOptions ?? false);
      setShowVoterNames(defaultSettings?.showVoterNames ?? true);
      setShowRealTimeResults(defaultSettings?.showRealTimeResults ?? true);
      setHasExpiration(false);
      setExpirationDate("");
      setExpirationTime("");
      setQuickDuration("");
      setErrors([]);
      setActiveTab("basic");
    }
  }, [isOpen, defaultSettings]);

  // Add option
  const handleAddOption = useCallback(() => {
    if (options.length < MAX_OPTIONS) {
      setOptions([...options, ""]);
    }
  }, [options]);

  // Remove option
  const handleRemoveOption = useCallback(
    (index: number) => {
      if (options.length > MIN_OPTIONS) {
        setOptions(options.filter((_, i) => i !== index));
      }
    },
    [options],
  );

  // Update option
  const handleOptionChange = useCallback(
    (index: number, value: string) => {
      const newOptions = [...options];
      newOptions[index] = value;
      setOptions(newOptions);
    },
    [options],
  );

  // Handle quick duration selection
  const handleQuickDuration = useCallback((duration: string) => {
    setQuickDuration(duration);
    setHasExpiration(true);

    const now = new Date();
    let closesAt: Date;

    switch (duration) {
      case "1h":
        closesAt = new Date(now.getTime() + 60 * 60 * 1000);
        break;
      case "6h":
        closesAt = new Date(now.getTime() + 6 * 60 * 60 * 1000);
        break;
      case "1d":
        closesAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        break;
      case "3d":
        closesAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        break;
      case "1w":
        closesAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case "custom":
        setExpirationDate("");
        setExpirationTime("");
        return;
      default:
        return;
    }

    setExpirationDate(closesAt.toISOString().split("T")[0]);
    setExpirationTime(closesAt.toTimeString().slice(0, 5));
  }, []);

  // Validate form
  const validateForm = useCallback((): boolean => {
    const validationErrors: string[] = [];

    // Validate question
    if (!question.trim()) {
      validationErrors.push("Question is required");
    } else if (question.length > MAX_QUESTION_LENGTH) {
      validationErrors.push(
        `Question must be ${MAX_QUESTION_LENGTH} characters or less`,
      );
    }

    // Validate description
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      validationErrors.push(
        `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less`,
      );
    }

    // Validate options
    const trimmedOptions = options
      .map((o) => o.trim())
      .filter((o) => o.length > 0);
    if (trimmedOptions.length < MIN_OPTIONS) {
      validationErrors.push(`At least ${MIN_OPTIONS} options are required`);
    }

    const duplicates = trimmedOptions.filter(
      (item, index) => trimmedOptions.indexOf(item.toLowerCase()) !== index,
    );
    if (duplicates.length > 0) {
      validationErrors.push("Options must be unique");
    }

    options.forEach((option, index) => {
      if (option.trim() && option.length > MAX_OPTION_LENGTH) {
        validationErrors.push(
          `Option ${index + 1} must be ${MAX_OPTION_LENGTH} characters or less`,
        );
      }
    });

    // Validate multiple choice settings
    if (allowMultiple) {
      if (maxSelections < 1 || maxSelections > trimmedOptions.length) {
        validationErrors.push(
          "Maximum selections must be between 1 and the number of options",
        );
      }
      if (minSelections < 1 || minSelections > maxSelections) {
        validationErrors.push(
          "Minimum selections must be between 1 and maximum selections",
        );
      }
    }

    // Validate expiration
    if (hasExpiration && expirationDate && expirationTime) {
      const closesAt = new Date(`${expirationDate}T${expirationTime}`);
      const now = new Date();
      const minExpiration = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes

      if (closesAt < minExpiration) {
        validationErrors.push("Poll must be active for at least 5 minutes");
      }

      const maxExpiration = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
      if (closesAt > maxExpiration) {
        validationErrors.push("Poll cannot be active for more than 30 days");
      }
    }

    setErrors(validationErrors);
    return validationErrors.length === 0;
  }, [
    question,
    description,
    options,
    allowMultiple,
    maxSelections,
    minSelections,
    hasExpiration,
    expirationDate,
    expirationTime,
  ]);

  // Handle create poll
  const handleCreatePoll = useCallback(async () => {
    if (!validateForm()) {
      setActiveTab("basic");
      return;
    }

    const trimmedOptions = options
      .map((o) => o.trim())
      .filter((o) => o.length > 0);

    const closesAt =
      hasExpiration && expirationDate && expirationTime
        ? new Date(`${expirationDate}T${expirationTime}`)
        : undefined;

    const settings: PollSettings = {
      type: allowMultiple ? "multiple" : "single",
      allowMultiple,
      maxSelections: allowMultiple ? maxSelections : undefined,
      minSelections: allowMultiple ? minSelections : undefined,
      isAnonymous,
      resultsVisibility,
      allowVoteChange,
      allowAddOptions,
      addOptionsPermission: "anyone",
      requireComment: false,
      showVoterNames: !isAnonymous && showVoterNames,
      showRealTimeResults,
      isQuiz: false,
    };

    const input: CreatePollInput = {
      question: question.trim(),
      description: description.trim() || undefined,
      options: trimmedOptions.map((text) => ({ text })),
      settings,
      channelId,
      closesAt,
    };

    setIsCreating(true);
    try {
      await onCreatePoll(input);
      toast({
        title: "Poll created",
        description: "Your poll has been created successfully",
      });
      onClose();
    } catch (error) {
      toast({
        title: "Failed to create poll",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
      setErrors([
        error instanceof Error ? error.message : "Failed to create poll",
      ]);
    } finally {
      setIsCreating(false);
    }
  }, [
    validateForm,
    question,
    description,
    options,
    allowMultiple,
    maxSelections,
    minSelections,
    isAnonymous,
    resultsVisibility,
    allowVoteChange,
    allowAddOptions,
    showVoterNames,
    showRealTimeResults,
    hasExpiration,
    expirationDate,
    expirationTime,
    channelId,
    onCreatePoll,
    onClose,
    toast,
  ]);

  // Calculate minimum expiration time
  const minExpirationDateTime = useMemo(() => {
    const min = new Date(Date.now() + 5 * 60 * 1000);
    return min.toISOString().slice(0, 16);
  }, []);

  // Calculate maximum expiration time
  const maxExpirationDateTime = useMemo(() => {
    const max = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return max.toISOString().slice(0, 16);
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Create a Poll
          </DialogTitle>
          <DialogDescription>
            Ask your team a question and gather their opinions
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "basic" | "advanced")}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="advanced">
              <Settings2 className="mr-2 h-4 w-4" />
              Advanced
            </TabsTrigger>
          </TabsList>

          {/* Basic Tab */}
          <TabsContent value="basic" className="space-y-6 py-4">
            {/* Question */}
            <div className="space-y-2">
              <Label htmlFor="question">
                Question <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="question"
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

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Add more context to your question..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={MAX_DESCRIPTION_LENGTH}
                rows={2}
                className="resize-none"
              />
              <div className="text-right text-xs text-muted-foreground">
                {description.length}/{MAX_DESCRIPTION_LENGTH}
              </div>
            </div>

            {/* Options */}
            <div className="space-y-2">
              <Label>
                Options <span className="text-destructive">*</span>
              </Label>
              <div className="space-y-2">
                {options.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder={`Option ${index + 1}`}
                      value={option}
                      onChange={(e) =>
                        handleOptionChange(index, e.target.value)
                      }
                      maxLength={MAX_OPTION_LENGTH}
                    />
                    {options.length > MIN_OPTIONS && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveOption(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {options.length < MAX_OPTIONS && (
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
                {options.length}/{MAX_OPTIONS} options
              </div>
            </div>

            <Separator />

            {/* Basic Settings */}
            <div className="space-y-4">
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
                <div className="ml-8 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="min-selections">Minimum Choices</Label>
                      <Input
                        id="min-selections"
                        type="number"
                        min={1}
                        max={maxSelections}
                        value={minSelections}
                        onChange={(e) =>
                          setMinSelections(parseInt(e.target.value, 10) || 1)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="max-selections">Maximum Choices</Label>
                      <Input
                        id="max-selections"
                        type="number"
                        min={minSelections}
                        max={
                          options.filter((o) => o.trim()).length || MAX_OPTIONS
                        }
                        value={maxSelections}
                        onChange={(e) =>
                          setMaxSelections(parseInt(e.target.value, 10) || 2)
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

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
            </div>

            <Separator />

            {/* Expiration */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="has-expiration">
                    <Calendar className="mr-2 inline h-4 w-4" />
                    Poll Expiration
                  </Label>
                  <div className="text-xs text-muted-foreground">
                    Automatically close poll after a certain time
                  </div>
                </div>
                <Switch
                  id="has-expiration"
                  checked={hasExpiration}
                  onCheckedChange={setHasExpiration}
                />
              </div>

              {hasExpiration && (
                <div className="ml-8 space-y-4">
                  {/* Quick duration presets */}
                  <div className="space-y-2">
                    <Label>Quick Duration</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: "1h", label: "1 Hour" },
                        { value: "6h", label: "6 Hours" },
                        { value: "1d", label: "1 Day" },
                        { value: "3d", label: "3 Days" },
                        { value: "1w", label: "1 Week" },
                        { value: "custom", label: "Custom" },
                      ].map(({ value, label }) => (
                        <Button
                          key={value}
                          type="button"
                          variant={
                            quickDuration === value ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => handleQuickDuration(value)}
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Custom date/time */}
                  {quickDuration === "custom" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="expiration-date">Date</Label>
                        <Input
                          id="expiration-date"
                          type="date"
                          value={expirationDate}
                          onChange={(e) => setExpirationDate(e.target.value)}
                          min={minExpirationDateTime.split("T")[0]}
                          max={maxExpirationDateTime.split("T")[0]}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="expiration-time">Time</Label>
                        <Input
                          id="expiration-time"
                          type="time"
                          value={expirationTime}
                          onChange={(e) => setExpirationTime(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-6 py-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 space-y-0.5">
                  <Label htmlFor="vote-change">Allow Vote Changes</Label>
                  <div className="text-xs text-muted-foreground">
                    Let people change their vote after submitting
                  </div>
                </div>
                <Switch
                  id="vote-change"
                  checked={allowVoteChange}
                  onCheckedChange={setAllowVoteChange}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex-1 space-y-0.5">
                  <Label htmlFor="add-options">Allow Adding Options</Label>
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

              <div className="flex items-center justify-between">
                <div className="flex-1 space-y-0.5">
                  <Label htmlFor="real-time">Show Real-Time Results</Label>
                  <div className="text-xs text-muted-foreground">
                    Update vote counts in real-time
                  </div>
                </div>
                <Switch
                  id="real-time"
                  checked={showRealTimeResults}
                  onCheckedChange={setShowRealTimeResults}
                />
              </div>

              {!isAnonymous && (
                <div className="flex items-center justify-between">
                  <div className="flex-1 space-y-0.5">
                    <Label htmlFor="voter-names">Show Voter Names</Label>
                    <div className="text-xs text-muted-foreground">
                      Display who voted for each option
                    </div>
                  </div>
                  <Switch
                    id="voter-names"
                    checked={showVoterNames}
                    onCheckedChange={setShowVoterNames}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="results-visibility">Results Visibility</Label>
                <Select
                  value={resultsVisibility}
                  onValueChange={(value) =>
                    setResultsVisibility(value as PollResultsVisibility)
                  }
                >
                  <SelectTrigger id="results-visibility">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="always">Always visible</SelectItem>
                    <SelectItem value="after_vote">After voting</SelectItem>
                    <SelectItem value="after_close">
                      After poll closes
                    </SelectItem>
                  </SelectContent>
                </Select>
                <div className="text-xs text-muted-foreground">
                  {resultsVisibility === "always" &&
                    "Results are visible to everyone"}
                  {resultsVisibility === "after_vote" &&
                    "Results visible only after voting"}
                  {resultsVisibility === "after_close" &&
                    "Results visible only after poll closes"}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

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

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isCreating}
          >
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
