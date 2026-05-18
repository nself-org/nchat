"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  CheckCircle2,
  EyeOff,
  Users,
  Calendar,
  Settings,
  Loader2,
  Save,
  RotateCcw,
  Trash2,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PollSettings as PollSettingsType } from "@/lib/polls/poll-store";

// ============================================================================
// Types
// ============================================================================

interface PollSettingsProps {
  settings: PollSettingsType;
  endsAt: Date | null;
  pollStatus: "active" | "closed";
  canEdit: boolean;
  onSettingsChange: (settings: Partial<PollSettingsType>) => void;
  onEndsAtChange: (endsAt: Date | null) => void;
  onSave: () => Promise<void>;
  onDelete?: () => Promise<void>;
  saving?: boolean;
  deleting?: boolean;
  className?: string;
}

interface SettingRowProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

// ============================================================================
// Setting Row Component
// ============================================================================

function SettingRow({
  icon,
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: SettingRowProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between py-3",
        disabled && "opacity-50",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-muted p-2 text-muted-foreground">
          {icon}
        </div>
        <div className="space-y-0.5">
          <Label htmlFor={label} className="cursor-pointer font-medium">
            {label}
          </Label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch
        id={label}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function PollSettings({
  settings,
  endsAt,
  pollStatus,
  canEdit,
  onSettingsChange,
  onEndsAtChange,
  onSave,
  onDelete,
  saving = false,
  deleting = false,
  className,
}: PollSettingsProps) {
  const [hasChanges, setHasChanges] = useState(false);

  const handleSettingChange = useCallback(
    (key: keyof PollSettingsType) => (checked: boolean) => {
      onSettingsChange({ [key]: checked });
      setHasChanges(true);
    },
    [onSettingsChange],
  );

  const handleEndsAtChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      onEndsAtChange(value ? new Date(value) : null);
      setHasChanges(true);
    },
    [onEndsAtChange],
  );

  const handleSave = useCallback(async () => {
    await onSave();
    setHasChanges(false);
  }, [onSave]);

  const formatDateForInput = (date: Date | null) => {
    if (!date) return "";
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60 * 1000);
    return localDate.toISOString().slice(0, 16);
  };

  const isDisabled = !canEdit || pollStatus === "closed";

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="h-5 w-5" />
          Poll Settings
        </CardTitle>
        <CardDescription>
          Configure how your poll works and when it ends
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Voting Options */}
        <div>
          <h4 className="mb-2 text-sm font-medium">Voting Options</h4>
          <div className="divide-y rounded-lg border">
            <div className="px-4">
              <SettingRow
                icon={<CheckCircle2 className="h-4 w-4" />}
                label="Allow multiple choices"
                description="Voters can select more than one option"
                checked={settings.allowMultipleVotes}
                onCheckedChange={handleSettingChange("allowMultipleVotes")}
                disabled={isDisabled}
              />
            </div>
            <div className="px-4">
              <SettingRow
                icon={<EyeOff className="h-4 w-4" />}
                label="Anonymous voting"
                description="Hide voter identities from everyone"
                checked={settings.isAnonymous}
                onCheckedChange={handleSettingChange("isAnonymous")}
                disabled={isDisabled}
              />
            </div>
            <div className="px-4">
              <SettingRow
                icon={<Users className="h-4 w-4" />}
                label="Allow users to add options"
                description="Anyone can add new options to the poll"
                checked={settings.allowAddOptions}
                onCheckedChange={handleSettingChange("allowAddOptions")}
                disabled={isDisabled}
              />
            </div>
            <div className="px-4">
              <SettingRow
                icon={<Eye className="h-4 w-4" />}
                label="Show results before voting"
                description="Users can see results without voting first"
                checked={settings.showResultsBeforeVoting}
                onCheckedChange={handleSettingChange("showResultsBeforeVoting")}
                disabled={isDisabled}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* End Date */}
        <div className="space-y-2">
          <Label
            htmlFor="poll-end-date"
            className="flex items-center gap-2 font-medium"
          >
            <Calendar className="h-4 w-4" />
            End Date
          </Label>
          <Input
            id="poll-end-date"
            type="datetime-local"
            value={formatDateForInput(endsAt)}
            onChange={handleEndsAtChange}
            min={formatDateForInput(new Date())}
            disabled={isDisabled}
            className="max-w-xs"
          />
          <p className="text-xs text-muted-foreground">
            {endsAt
              ? `Poll will automatically close on ${endsAt.toLocaleString()}`
              : "No end date set. Poll will remain open until manually closed."}
          </p>
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            {hasChanges && (
              <span className="text-xs text-muted-foreground">
                Unsaved changes
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={deleting || !canEdit}
                  >
                    {deleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Delete Poll
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Poll</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this poll? This action
                      cannot be undone. All votes and data will be permanently
                      removed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={onDelete}
                      className="hover:bg-destructive/90 bg-destructive text-destructive-foreground"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              disabled={!hasChanges || saving || isDisabled}
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </Button>
          </div>
        </div>

        {/* Warning for closed polls */}
        {pollStatus === "closed" && (
          <div className="rounded-lg border border-orange-500/20 bg-orange-500/10 p-3">
            <p className="text-sm text-orange-600 dark:text-orange-400">
              This poll is closed. Reopen the poll to modify settings.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Inline Settings Component (for compact display)
// ============================================================================

interface PollSettingsInlineProps {
  settings: PollSettingsType;
  className?: string;
}

export function PollSettingsInline({
  settings,
  className,
}: PollSettingsInlineProps) {
  const activeSettings = [
    settings.allowMultipleVotes && {
      icon: <CheckCircle2 className="h-3 w-3" />,
      label: "Multiple choices",
    },
    settings.isAnonymous && {
      icon: <EyeOff className="h-3 w-3" />,
      label: "Anonymous",
    },
    settings.allowAddOptions && {
      icon: <Users className="h-3 w-3" />,
      label: "Add options",
    },
  ].filter(Boolean);

  if (activeSettings.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {activeSettings.map((setting, index) => (
        <div
          key={index}
          className="bg-muted/50 flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground"
        >
          {(setting as { icon: React.ReactNode; label: string }).icon}
          <span>
            {(setting as { icon: React.ReactNode; label: string }).label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Settings Summary Component
// ============================================================================

interface PollSettingsSummaryProps {
  settings: PollSettingsType;
  endsAt: Date | null;
  className?: string;
}

export function PollSettingsSummary({
  settings,
  endsAt,
  className,
}: PollSettingsSummaryProps) {
  return (
    <div className={cn("space-y-2 text-sm", className)}>
      <div className="flex items-center gap-2">
        <CheckCircle2
          className={cn(
            "h-4 w-4",
            settings.allowMultipleVotes
              ? "text-green-500"
              : "text-muted-foreground",
          )}
        />
        <span
          className={
            !settings.allowMultipleVotes ? "text-muted-foreground" : ""
          }
        >
          {settings.allowMultipleVotes
            ? "Multiple choices allowed"
            : "Single choice only"}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <EyeOff
          className={cn(
            "h-4 w-4",
            settings.isAnonymous ? "text-green-500" : "text-muted-foreground",
          )}
        />
        <span className={!settings.isAnonymous ? "text-muted-foreground" : ""}>
          {settings.isAnonymous ? "Anonymous voting" : "Public voting"}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Users
          className={cn(
            "h-4 w-4",
            settings.allowAddOptions
              ? "text-green-500"
              : "text-muted-foreground",
          )}
        />
        <span
          className={!settings.allowAddOptions ? "text-muted-foreground" : ""}
        >
          {settings.allowAddOptions
            ? "Users can add options"
            : "Fixed options only"}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">
          {endsAt ? `Ends ${endsAt.toLocaleString()}` : "No end date"}
        </span>
      </div>
    </div>
  );
}

export default PollSettings;
