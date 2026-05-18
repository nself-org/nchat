"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useNotificationSettingsStore } from "@/stores/notification-settings-store";

export interface MentionSettingsPanelProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * MentionSettingsPanel - Configure @mention notification settings
 */
export function MentionSettingsPanel({
  className,
  ...props
}: MentionSettingsPanelProps) {
  const mentionSettings = useNotificationSettingsStore(
    (state) => state.preferences.mentions,
  );
  const updateMentionSettings = useNotificationSettingsStore(
    (state) => state.updateMentionSettings,
  );

  return (
    <div className={cn("space-y-6", className)} {...props}>
      {/* Master Toggle */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="mentions-enabled" className="text-base font-medium">
              Mention Notifications
            </Label>
            <p className="text-sm text-muted-foreground">
              Get notified when someone mentions you
            </p>
          </div>
          <Switch
            id="mentions-enabled"
            checked={mentionSettings.enabled}
            onCheckedChange={(enabled) => updateMentionSettings({ enabled })}
          />
        </div>
      </Card>

      {/* Mention Types */}
      <Card
        className={cn(
          "p-4",
          !mentionSettings.enabled && "pointer-events-none opacity-50",
        )}
      >
        <h3 className="mb-4 text-sm font-medium">Mention Types</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notify-user" className="flex items-center gap-2">
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                  @username
                </span>
                Personal mentions
              </Label>
              <p className="text-xs text-muted-foreground">
                When someone mentions you directly
              </p>
            </div>
            <Switch
              id="notify-user"
              checked={mentionSettings.notifyOnUserMention}
              onCheckedChange={(notifyOnUserMention) =>
                updateMentionSettings({ notifyOnUserMention })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notify-here" className="flex items-center gap-2">
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                  @here
                </span>
                Here mentions
              </Label>
              <p className="text-xs text-muted-foreground">
                When someone uses @here in a channel
              </p>
            </div>
            <Switch
              id="notify-here"
              checked={mentionSettings.notifyOnHere}
              onCheckedChange={(notifyOnHere) =>
                updateMentionSettings({ notifyOnHere })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label
                htmlFor="notify-channel"
                className="flex items-center gap-2"
              >
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                  @channel
                </span>
                Channel mentions
              </Label>
              <p className="text-xs text-muted-foreground">
                When someone uses @channel
              </p>
            </div>
            <Switch
              id="notify-channel"
              checked={mentionSettings.notifyOnChannel}
              onCheckedChange={(notifyOnChannel) =>
                updateMentionSettings({ notifyOnChannel })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label
                htmlFor="notify-everyone"
                className="flex items-center gap-2"
              >
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                  @everyone
                </span>
                Everyone mentions
              </Label>
              <p className="text-xs text-muted-foreground">
                When someone uses @everyone
              </p>
            </div>
            <Switch
              id="notify-everyone"
              checked={mentionSettings.notifyOnEveryone}
              onCheckedChange={(notifyOnEveryone) =>
                updateMentionSettings({ notifyOnEveryone })
              }
            />
          </div>
        </div>
      </Card>

      {/* Delivery Options */}
      <Card
        className={cn(
          "p-4",
          !mentionSettings.enabled && "pointer-events-none opacity-50",
        )}
      >
        <h3 className="mb-4 text-sm font-medium">Delivery Methods</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="mention-desktop">Desktop notifications</Label>
              <p className="text-xs text-muted-foreground">
                Show desktop notification for mentions
              </p>
            </div>
            <Switch
              id="mention-desktop"
              checked={mentionSettings.desktop}
              onCheckedChange={(desktop) => updateMentionSettings({ desktop })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="mention-mobile">Mobile push notifications</Label>
              <p className="text-xs text-muted-foreground">
                Send push notification to mobile
              </p>
            </div>
            <Switch
              id="mention-mobile"
              checked={mentionSettings.mobile}
              onCheckedChange={(mobile) => updateMentionSettings({ mobile })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="mention-email">Email notifications</Label>
              <p className="text-xs text-muted-foreground">
                Include mentions in email digests
              </p>
            </div>
            <Switch
              id="mention-email"
              checked={mentionSettings.email}
              onCheckedChange={(email) => updateMentionSettings({ email })}
            />
          </div>
        </div>
      </Card>

      {/* Display Options */}
      <Card
        className={cn(
          "p-4",
          !mentionSettings.enabled && "pointer-events-none opacity-50",
        )}
      >
        <h3 className="mb-4 text-sm font-medium">Display Options</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="mention-highlight">
                Highlight mentions in messages
              </Label>
              <p className="text-xs text-muted-foreground">
                Visually highlight @mentions in chat
              </p>
            </div>
            <Switch
              id="mention-highlight"
              checked={mentionSettings.highlightInMessages}
              onCheckedChange={(highlightInMessages) =>
                updateMentionSettings({ highlightInMessages })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="mention-badge">Show mention badge</Label>
              <p className="text-xs text-muted-foreground">
                Display unread mention count on channels
              </p>
            </div>
            <Switch
              id="mention-badge"
              checked={mentionSettings.showBadge}
              onCheckedChange={(showBadge) =>
                updateMentionSettings({ showBadge })
              }
            />
          </div>
        </div>
      </Card>

      {/* Quiet Hours Override */}
      <Card
        className={cn(
          "p-4",
          !mentionSettings.enabled && "pointer-events-none opacity-50",
        )}
      >
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="mention-breakthrough" className="font-medium">
              Break through quiet hours
            </Label>
            <p className="text-sm text-muted-foreground">
              Allow mention notifications even when quiet hours are active
            </p>
          </div>
          <Switch
            id="mention-breakthrough"
            checked={mentionSettings.breakThroughQuietHours}
            onCheckedChange={(breakThroughQuietHours) =>
              updateMentionSettings({ breakThroughQuietHours })
            }
          />
        </div>
      </Card>
    </div>
  );
}

MentionSettingsPanel.displayName = "MentionSettingsPanel";

export default MentionSettingsPanel;
