/**
 * Accessibility Examples
 *
 * This file contains examples of how to use accessibility features
 * in nself-chat components.
 */

"use client";

import { useRef, useEffect } from "react";
import {
  useFocusTrap,
  useAnnouncer,
  useArrowNavigation,
  useFocusFirstInput,
  useAriaLabel,
  useAriaLoading,
  usePrefersReducedMotion,
} from "@/hooks/use-a11y";
import { useAccessibility } from "@/contexts/accessibility-context";
import {
  announce,
  getMessageLabel,
  getChannelLabel,
  getCountLabel,
} from "@/lib/a11y";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ============================================================================
// Example 1: Accessible Modal
// ============================================================================

interface AccessibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function AccessibleModal({
  isOpen,
  onClose,
  title,
  children,
}: AccessibleModalProps) {
  const modalRef = useFocusTrap<HTMLDivElement>(isOpen, {
    returnFocus: true,
    onEscape: onClose,
  });
  const announce = useAnnouncer();
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (isOpen) {
      announce(`${title} dialog opened`);
    } else {
      announce(`${title} dialog closed`);
    }
  }, [isOpen, title, announce]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal content */}
      <div
        ref={modalRef}
        className="relative w-full max-w-md rounded-lg bg-white p-6 dark:bg-gray-800"
        style={{
          animation: prefersReducedMotion ? "none" : "fadeIn 0.3s ease-out",
        }}
      >
        <h2 id="modal-title" className="mb-4 text-xl font-bold">
          {title}
        </h2>

        <div className="mb-4">{children}</div>

        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Example 2: Accessible Form
// ============================================================================

interface AccessibleFormProps {
  onSubmit: (data: { name: string; email: string }) => Promise<void>;
}

export function AccessibleForm({ onSubmit }: AccessibleFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusFirstInput(formRef, true);
  const announce = useAnnouncer();
  const loadingProps = useAriaLoading(isLoading, "Submitting form");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    announce("Submitting form", "polite");

    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const data = {
        name: formData.get("name") as string,
        email: formData.get("email") as string,
      };

      await onSubmit(data);
      announce("Form submitted successfully", "polite");
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError(message);
      announce(`Error: ${message}`, "assertive");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="space-y-4"
      {...loadingProps}
    >
      {/* Name field */}
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium">
          Name
        </label>
        <Input
          id="name"
          name="name"
          type="text"
          required
          aria-required="true"
          disabled={isLoading}
        />
      </div>

      {/* Email field */}
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium">
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          aria-required="true"
          aria-invalid={!!error}
          aria-describedby={error ? "email-error" : undefined}
          disabled={isLoading}
        />
        {error && (
          <span
            id="email-error"
            role="alert"
            className="mt-1 text-sm text-red-600"
          >
            {error}
          </span>
        )}
      </div>

      {/* Submit button */}
      <Button type="submit" disabled={isLoading} aria-busy={isLoading}>
        {isLoading ? "Submitting..." : "Submit"}
      </Button>
    </form>
  );
}

// ============================================================================
// Example 3: Accessible Channel List
// ============================================================================

interface Channel {
  id: string;
  name: string;
  unreadCount: number;
  isPrivate: boolean;
  isMuted: boolean;
}

interface AccessibleChannelListProps {
  channels: Channel[];
  onSelectChannel: (channel: Channel) => void;
}

export function AccessibleChannelList({
  channels,
  onSelectChannel,
}: AccessibleChannelListProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useArrowNavigation(listRef, {
    orientation: "vertical",
    loop: true,
    onSelect: (element) => {
      const channelId = element.getAttribute("data-channel-id");
      const channel = channels.find((c) => c.id === channelId);
      if (channel) {
        onSelectChannel(channel);
      }
    },
  });

  return (
    <nav ref={listRef} aria-label="Channels" className="space-y-1">
      {channels.map((channel, index) => {
        const label = getChannelLabel(channel.name, {
          unreadCount: channel.unreadCount,
          isPrivate: channel.isPrivate,
          isMuted: channel.isMuted,
        });

        return (
          <a
            key={channel.id}
            href={`/channel/${channel.id}`}
            data-channel-id={channel.id}
            tabIndex={index === 0 ? 0 : -1}
            aria-label={label}
            className="block rounded p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={(e) => {
              e.preventDefault();
              onSelectChannel(channel);
            }}
          >
            <span className="flex items-center gap-2">
              {channel.isPrivate && <span aria-hidden="true">🔒</span>}
              <span className="font-medium">{channel.name}</span>
              {channel.unreadCount > 0 && (
                <span
                  className="text-primary-foreground ml-auto rounded-full bg-primary px-2 py-0.5 text-xs"
                  aria-label={getCountLabel(
                    channel.unreadCount,
                    "unread message",
                    "unread messages",
                  )}
                >
                  {channel.unreadCount}
                </span>
              )}
              {channel.isMuted && (
                <span
                  aria-label="Muted"
                  className="ml-auto text-muted-foreground"
                >
                  🔇
                </span>
              )}
            </span>
          </a>
        );
      })}
    </nav>
  );
}

// ============================================================================
// Example 4: Accessible Message
// ============================================================================

interface Message {
  id: string;
  content: string;
  author: {
    name: string;
    avatar: string;
  };
  timestamp: Date;
  edited: boolean;
  attachments: Array<{ name: string; url: string }>;
}

interface AccessibleMessageProps {
  message: Message;
  onReply: (message: Message) => void;
  onEdit: (message: Message) => void;
  onDelete: (message: Message) => void;
}

export function AccessibleMessage({
  message,
  onReply,
  onEdit,
  onDelete,
}: AccessibleMessageProps) {
  const { settings } = useAccessibility();
  const announce = useAnnouncer();

  const label = getMessageLabel(
    message.content,
    message.author.name,
    message.timestamp,
    {
      isEdited: message.edited,
      hasAttachments: message.attachments.length > 0,
      attachmentCount: message.attachments.length,
    },
  );

  const handleAction = (action: string, callback: () => void) => {
    callback();
    if (settings.announceNotifications) {
      announce(`${action} ${message.author.name}'s message`);
    }
  };

  return (
    <div role="article" aria-label={label} className="border-b p-4">
      {/* Avatar and author */}
      <div className="mb-2 flex items-start gap-3">
        <img
          src={message.author.avatar}
          alt=""
          aria-hidden="true"
          className="h-10 w-10 rounded-full"
        />
        <div>
          <div className="font-medium">{message.author.name}</div>
          <time
            dateTime={message.timestamp.toISOString()}
            className="text-sm text-muted-foreground"
          >
            {message.timestamp.toLocaleString()}
          </time>
          {message.edited && (
            <span className="ml-2 text-xs text-muted-foreground">(edited)</span>
          )}
        </div>
      </div>

      {/* Message content */}
      <div className="pl-13">{message.content}</div>

      {/* Attachments */}
      {message.attachments.length > 0 && (
        <ul
          aria-label={getCountLabel(message.attachments.length, "attachment")}
          className="mt-2 list-none space-y-1 pl-0"
        >
          {message.attachments.map((attachment) => (
            <li key={attachment.url}>
              <a
                href={attachment.url}
                className="block text-sm text-primary hover:underline"
              >
                📎 {attachment.name}
              </a>
            </li>
          ))}
        </ul>
      )}

      {/* Actions */}
      <div
        role="group"
        aria-label="Message actions"
        className="mt-2 flex gap-2"
      >
        <Button
          size="sm"
          variant="ghost"
          onClick={() => handleAction("Replying to", () => onReply(message))}
          aria-label={`Reply to ${message.author.name}'s message`}
        >
          Reply
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => handleAction("Editing", () => onEdit(message))}
          aria-label="Edit message"
        >
          Edit
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => handleAction("Deleting", () => onDelete(message))}
          aria-label="Delete message"
        >
          Delete
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Example 5: Accessible Loading State
// ============================================================================

interface AccessibleLoadingProps {
  isLoading: boolean;
  children: React.ReactNode;
  loadingText?: string;
}

export function AccessibleLoading({
  isLoading,
  children,
  loadingText = "Loading",
}: AccessibleLoadingProps) {
  const announce = useAnnouncer();

  useEffect(() => {
    if (isLoading) {
      announce(loadingText, "polite");
    }
  }, [isLoading, loadingText, announce]);

  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        className="flex items-center justify-center p-8"
      >
        <div className="text-center">
          <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span>{loadingText}</span>
          <span className="sr-only">{loadingText}</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Missing useState import
import { useState } from "react";
