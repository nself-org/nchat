"use client";

import { useState, useCallback } from "react";
import {
  Clock,
  Timer,
  Shield,
  Eye,
  Copy,
  Forward,
  Bell,
  ChevronDown,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { DisappearingToggle } from "./DisappearingToggle";
import { DisappearingTimer } from "./DisappearingTimer";
import {
  DisappearingSettings as DisappearingSettingsType,
  SecretChatSettings,
  DISAPPEARING_TIMER_OPTIONS,
  formatDuration,
} from "@/lib/disappearing";

interface DisappearingSettingsProps {
  /** Current settings */
  settings: DisappearingSettingsType;
  /** Callback when settings change */
  onSettingsChange: (settings: Partial<DisappearingSettingsType>) => void;
  /** Whether this is a DM or channel */
  chatType: "channel" | "dm" | "group_dm";
  /** Whether the current user can modify settings */
  canModify?: boolean;
  /** Secret chat settings (if applicable) */
  secretSettings?: SecretChatSettings | null;
  /** Callback for secret settings change */
  onSecretSettingsChange?: (settings: Partial<SecretChatSettings>) => void;
  /** Whether to show secret chat options */
  showSecretOptions?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Complete settings panel for disappearing messages.
 */
export function DisappearingSettings({
  settings,
  onSettingsChange,
  chatType,
  canModify = true,
  secretSettings,
  onSecretSettingsChange,
  showSecretOptions = false,
  className,
}: DisappearingSettingsProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const handleToggle = useCallback(
    (enabled: boolean) => {
      onSettingsChange({ enabled });
    },
    [onSettingsChange],
  );

  const handleDurationChange = useCallback(
    (defaultDuration: number) => {
      onSettingsChange({ defaultDuration });
    },
    [onSettingsChange],
  );

  const handleCanModifyChange = useCallback(
    (canModify: "owner" | "admin" | "all") => {
      onSettingsChange({ canModify });
    },
    [onSettingsChange],
  );

  const handleShowBannerChange = useCallback(
    (showBanner: boolean) => {
      onSettingsChange({ showBanner });
    },
    [onSettingsChange],
  );

  const isSecretChat = secretSettings !== null && secretSettings !== undefined;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Main Toggle */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 rounded-lg p-2">
                <Timer className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">
                  Disappearing Messages
                </CardTitle>
                <CardDescription>
                  Messages will automatically disappear after the set time
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={handleToggle}
              disabled={!canModify || isSecretChat}
            />
          </div>
        </CardHeader>

        {settings.enabled && (
          <CardContent className="pt-0">
            <Separator className="mb-4" />

            {/* Timer Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Default Timer</Label>
              <DisappearingTimer
                value={settings.defaultDuration}
                onChange={handleDurationChange}
                disabled={!canModify}
                variant="buttons"
              />
              <p className="text-xs text-muted-foreground">
                New messages will disappear after{" "}
                {formatDuration(settings.defaultDuration)}
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Info Alert */}
      {settings.enabled && !isSecretChat && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            When enabled, all new messages in this{" "}
            {chatType === "dm" ? "conversation" : "channel"} will disappear
            after the set time. This won&apos;t affect existing messages.
          </AlertDescription>
        </Alert>
      )}

      {/* Advanced Settings */}
      {settings.enabled && canModify && (
        <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between px-4 py-2"
            >
              <span className="text-sm font-medium">Advanced Settings</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  isAdvancedOpen && "rotate-180",
                )}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-2">
            {/* Who can modify */}
            {chatType !== "dm" && (
              <div className="space-y-2">
                <Label className="text-sm">Who can change these settings</Label>
                <Select
                  value={settings.canModify}
                  onValueChange={(v) =>
                    handleCanModifyChange(v as "owner" | "admin" | "all")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Channel owner only</SelectItem>
                    <SelectItem value="admin">Admins and owner</SelectItem>
                    <SelectItem value="all">All members</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Show banner */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">Show indicator banner</Label>
                <p className="text-xs text-muted-foreground">
                  Display a banner showing disappearing is enabled
                </p>
              </div>
              <Switch
                checked={settings.showBanner}
                onCheckedChange={handleShowBannerChange}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Secret Chat Settings */}
      {showSecretOptions && (
        <SecretChatSettingsSection
          settings={secretSettings || null}
          onChange={onSecretSettingsChange}
          canModify={canModify}
        />
      )}
    </div>
  );
}

/**
 * Secret chat settings section.
 */
function SecretChatSettingsSection({
  settings,
  onChange,
  canModify,
}: {
  settings: SecretChatSettings | null;
  onChange?: (settings: Partial<SecretChatSettings>) => void;
  canModify?: boolean;
}) {
  const isEnabled = settings !== null;

  if (!isEnabled) {
    return (
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-muted p-2">
              <Shield className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-base text-muted-foreground">
                Secret Chat
              </CardTitle>
              <CardDescription>
                Enhanced privacy with end-to-end encryption
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 rounded-lg p-2">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Secret Chat</CardTitle>
            <CardDescription>
              End-to-end encrypted with enhanced privacy
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Separator className="mb-4" />
        <div className="space-y-4">
          {/* Screenshot warning */}
          <SettingRow
            icon={<Eye className="h-4 w-4" />}
            label="Screenshot warning"
            description="Notify when screenshots are detected"
            checked={settings.screenshotWarning}
            onCheckedChange={(checked) =>
              onChange?.({ screenshotWarning: checked })
            }
            disabled={!canModify}
          />

          {/* Prevent forwarding */}
          <SettingRow
            icon={<Forward className="h-4 w-4" />}
            label="Prevent forwarding"
            description="Block message forwarding"
            checked={settings.preventForwarding}
            onCheckedChange={(checked) =>
              onChange?.({ preventForwarding: checked })
            }
            disabled={!canModify}
          />

          {/* Prevent copying */}
          <SettingRow
            icon={<Copy className="h-4 w-4" />}
            label="Prevent copying"
            description="Block text selection and copying"
            checked={settings.preventCopying}
            onCheckedChange={(checked) =>
              onChange?.({ preventCopying: checked })
            }
            disabled={!canModify}
          />

          {/* Hide notification content */}
          <SettingRow
            icon={<Bell className="h-4 w-4" />}
            label="Hide notification content"
            description="Don't show message content in notifications"
            checked={settings.hideNotificationContent}
            onCheckedChange={(checked) =>
              onChange?.({ hideNotificationContent: checked })
            }
            disabled={!canModify}
          />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Setting row component.
 */
function SettingRow({
  icon,
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-muted-foreground">{icon}</div>
        <div className="space-y-0.5">
          <Label className="text-sm">{label}</Label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}

export default DisappearingSettings;
