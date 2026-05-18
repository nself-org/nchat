"use client";

/**
 * Test Notification Button
 *
 * Provides UI for testing different notification types, priorities, and delivery methods.
 * Useful for development, testing, and demoing the notification system.
 */

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useNotificationStore,
  type NotificationType,
  type NotificationPriority,
} from "@/stores/notification-store";
import { useAuth } from "@/contexts/auth-context";
import { Bell, Play } from "lucide-react";
import { toast } from "@/hooks/use-toast";

// ============================================================================
// Test Notification Templates
// ============================================================================

interface NotificationTemplate {
  id: string;
  name: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  body: string;
  description: string;
}

const NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  {
    id: "mention-normal",
    name: "Mention (Normal)",
    type: "mention",
    priority: "normal",
    title: "John mentioned you",
    body: "Hey @you, can you review this?",
    description: "Standard @mention notification",
  },
  {
    id: "mention-urgent",
    name: "Mention (Urgent)",
    type: "mention",
    priority: "urgent",
    title: "URGENT: Sarah mentioned you",
    body: "@you - Critical issue needs immediate attention!",
    description: "Urgent @mention notification",
  },
  {
    id: "dm-normal",
    name: "Direct Message",
    type: "direct_message",
    priority: "normal",
    title: "New message from Alice",
    body: "Hey! Are you available for a quick call?",
    description: "Direct message notification",
  },
  {
    id: "dm-high",
    name: "Direct Message (High)",
    type: "direct_message",
    priority: "high",
    title: "Important message from Bob",
    body: "Can you please review the contract ASAP?",
    description: "High priority direct message",
  },
  {
    id: "thread-reply",
    name: "Thread Reply",
    type: "thread_reply",
    priority: "normal",
    title: "New reply in thread",
    body: 'Charlie replied: "I agree with that approach"',
    description: "Thread reply notification",
  },
  {
    id: "reaction",
    name: "Reaction",
    type: "reaction",
    priority: "low",
    title: "Someone reacted to your message",
    body: "David reacted with 👍 to your message",
    description: "Message reaction notification",
  },
  {
    id: "channel-invite",
    name: "Channel Invite",
    type: "channel_invite",
    priority: "normal",
    title: "Channel invitation",
    body: "Emily invited you to #project-alpha",
    description: "Channel invitation notification",
  },
  {
    id: "channel-update",
    name: "Channel Update",
    type: "channel_update",
    priority: "low",
    title: "Channel updated",
    body: '#general topic changed to "Weekly Updates"',
    description: "Channel update notification",
  },
  {
    id: "system",
    name: "System Notification",
    type: "system",
    priority: "normal",
    title: "System Update",
    body: "New version available. Please refresh.",
    description: "System notification",
  },
  {
    id: "announcement",
    name: "Announcement",
    type: "announcement",
    priority: "high",
    title: "Important Announcement",
    body: "All-hands meeting tomorrow at 10 AM",
    description: "Announcement notification",
  },
  {
    id: "keyword-alert",
    name: "Keyword Alert",
    type: "mention",
    priority: "high",
    title: 'Keyword alert: "deployment"',
    body: 'Frank mentioned: "deployment scheduled for tonight"',
    description: "Keyword alert notification",
  },
];

// ============================================================================
// Component
// ============================================================================

export interface TestNotificationButtonProps {
  /**
   * Button variant
   */
  variant?: "default" | "outline" | "ghost" | "secondary";

  /**
   * Button size
   */
  size?: "default" | "sm" | "lg" | "icon";

  /**
   * Show as icon button
   */
  iconOnly?: boolean;

  /**
   * Custom className
   */
  className?: string;
}

export function TestNotificationButton({
  variant = "outline",
  size = "default",
  iconOnly = false,
  className,
}: TestNotificationButtonProps) {
  const { user } = useAuth();
  const addNotification = useNotificationStore(
    (state) => state.addNotification,
  );

  const handleSendTestNotification = React.useCallback(
    (template: NotificationTemplate) => {
      if (!user) {
        toast({
          title: "Not authenticated",
          description: "You must be logged in to test notifications",
          variant: "destructive",
        });
        return;
      }

      const notification = {
        id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: template.type,
        priority: template.priority,
        title: template.title,
        body: template.body,
        actor: {
          id: user.id,
          name: user.displayName || "Test User",
          avatarUrl: user.avatarUrl,
        },
        channelId: "test-channel-id",
        channelName: "#test-channel",
        isRead: false,
        isArchived: false,
        createdAt: new Date().toISOString(),
        actionUrl: "/chat/test-channel",
        metadata: {
          test: true,
          templateId: template.id,
        },
      };

      addNotification(notification);

      toast({
        title: "Test notification sent",
        description: `${template.name} - ${template.description}`,
      });
    },
    [user, addNotification],
  );

  const handleSendAll = React.useCallback(() => {
    NOTIFICATION_TEMPLATES.forEach((template, index) => {
      setTimeout(() => {
        handleSendTestNotification(template);
      }, index * 500); // Stagger notifications
    });

    toast({
      title: "Sending all test notifications",
      description: `Sending ${NOTIFICATION_TEMPLATES.length} notifications...`,
    });
  }, [handleSendTestNotification]);

  const handleSendBurst = React.useCallback(() => {
    // Send 5 random notifications quickly
    for (let i = 0; i < 5; i++) {
      const randomTemplate =
        NOTIFICATION_TEMPLATES[
          Math.floor(Math.random() * NOTIFICATION_TEMPLATES.length)
        ];
      setTimeout(() => {
        handleSendTestNotification(randomTemplate);
      }, i * 200);
    }

    toast({
      title: "Burst test",
      description: "Sending 5 random notifications",
    });
  }, [handleSendTestNotification]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <Play className="mr-2 h-4 w-4" />
          {!iconOnly && "Test Notifications"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[300px]">
        <DropdownMenuLabel>Test Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Quick actions */}
        <DropdownMenuItem onClick={handleSendAll}>
          <div className="flex flex-col gap-1">
            <div className="font-medium">Send All Types</div>
            <div className="text-xs text-muted-foreground">
              Send one of each notification type
            </div>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleSendBurst}>
          <div className="flex flex-col gap-1">
            <div className="font-medium">Burst Test (5x)</div>
            <div className="text-xs text-muted-foreground">
              Rapid-fire 5 random notifications
            </div>
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Individual Templates</DropdownMenuLabel>

        {/* Individual templates */}
        {NOTIFICATION_TEMPLATES.map((template) => (
          <DropdownMenuItem
            key={template.id}
            onClick={() => handleSendTestNotification(template)}
          >
            <div className="flex flex-1 flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{template.name}</span>
                <PriorityBadge priority={template.priority} />
              </div>
              <div className="text-xs text-muted-foreground">
                {template.description}
              </div>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Priority badge component
 */
function PriorityBadge({ priority }: { priority: NotificationPriority }) {
  const colors = {
    low: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    normal: "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400",
    high: "bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-400",
    urgent: "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400",
  };

  return (
    <span
      className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${colors[priority]}`}
    >
      {priority}
    </span>
  );
}

export default TestNotificationButton;
