/**
 * Example: Message Item with Full Actions Integration
 *
 * This example shows how to integrate message actions, context menu,
 * and bulk operations in a real message list.
 */

"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import {
  MessageItem,
  MessageActions,
  MessageContextMenu,
  BulkMessageActions,
} from "@/components/chat";
import { useMessageActions } from "@/hooks";
import { cn } from "@/lib/utils";
import type { Message } from "@/types/message";

// ============================================================================
// Example 1: Basic Message with Actions
// ============================================================================

export function MessageWithActions({ message }: { message: Message }) {
  const [isHovering, setIsHovering] = useState(false);

  const { handleAction, getPermissions } = useMessageActions({
    channelId: message.channelId,
    onReplyMessage: (msg) => {
      console.log("Reply to:", msg);
    },
    onOpenThread: (msg) => {
      console.log("Open thread for:", msg);
    },
    onEditMessage: (msg) => {
      console.log("Edit:", msg);
    },
    onDeleteMessage: async (id) => {
      console.log("Delete:", id);
    },
  });

  const permissions = getPermissions(message);

  return (
    <MessageContextMenu
      message={message}
      permissions={permissions}
      onAction={(action, data) => handleAction(action, message, data)}
    >
      <div
        className="relative"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <MessageItem message={message} />

        {/* Hover actions */}
        <AnimatePresence>
          {isHovering && (
            <MessageActions
              message={message}
              permissions={permissions}
              onAction={(action, data) => handleAction(action, message, data)}
            />
          )}
        </AnimatePresence>
      </div>
    </MessageContextMenu>
  );
}

// ============================================================================
// Example 2: Message List with Bulk Operations
// ============================================================================

export function MessageListWithBulk({
  channelId,
  messages,
}: {
  channelId: string;
  messages: Message[];
}) {
  const { handleAction, getPermissions, selection, bulkHandlers } =
    useMessageActions({
      channelId,
      enableBulkOperations: true,
      onReplyMessage: (message) => {
        console.log("Reply to:", message);
      },
      onOpenThread: (message) => {
        console.log("Open thread:", message);
      },
      onEditMessage: (message) => {
        console.log("Edit:", message);
      },
      onDeleteMessage: async (id) => {
        console.log("Delete:", id);
      },
    });

  const selectedMessages = messages.filter((m) =>
    selection.selectedMessages.has(m.id),
  );

  return (
    <div className="relative">
      {/* Bulk action bar */}
      <AnimatePresence>
        {selection.isSelectionMode && selection.selectedMessages.size > 0 && (
          <div className="sticky top-0 z-20 p-4">
            <BulkMessageActions
              selectedCount={selection.selectedMessages.size}
              onDelete={() =>
                bulkHandlers.onBulkDelete(
                  Array.from(selection.selectedMessages),
                )
              }
              onForward={() => bulkHandlers.onBulkForward(selectedMessages)}
              onCopy={() => bulkHandlers.onBulkCopy(selectedMessages)}
              onClearSelection={selection.clearSelection}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Message list */}
      <div className="space-y-1">
        {messages.map((message) => {
          const permissions = getPermissions(message);
          const isSelected = selection.selectedMessages.has(message.id);

          return (
            <MessageContextMenu
              key={message.id}
              message={message}
              permissions={permissions}
              onAction={(action, data) => handleAction(action, message, data)}
              onEnterSelectionMode={selection.enterSelectionMode}
              isSelected={isSelected}
            >
              {selection.isSelectionMode ? (
                <div
                  className={cn(
                    "relative cursor-pointer",
                    isSelected && "bg-primary/5",
                  )}
                  role="button"
                  tabIndex={0}
                  onClick={() => selection.toggleSelection(message.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      selection.toggleSelection(message.id);
                    }
                  }}
                >
                  {/* Selection checkbox */}
                  <div className="absolute left-2 top-4 z-10">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => selection.toggleSelection(message.id)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </div>
                  <MessageItem message={message} className="ml-8" />
                </div>
              ) : (
                <div className={cn("relative", isSelected && "bg-primary/5")}>
                  <MessageItem message={message} />
                </div>
              )}
            </MessageContextMenu>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Example 3: Mobile Message List
// ============================================================================

export function MobileMessageList({
  channelId,
  messages,
}: {
  channelId: string;
  messages: Message[];
}) {
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  const { handleAction, getPermissions } = useMessageActions({
    channelId,
    onReplyMessage: (msg) => {
      console.log("Reply to:", msg);
      setSelectedMessage(null);
    },
    onOpenThread: (msg) => {
      console.log("Open thread:", msg);
      setSelectedMessage(null);
    },
    onEditMessage: (msg) => {
      console.log("Edit:", msg);
      setSelectedMessage(null);
    },
    onDeleteMessage: async (id) => {
      console.log("Delete:", id);
      setSelectedMessage(null);
    },
  });

  return (
    <>
      {/* Message list */}
      <div className="space-y-1">
        {messages.map((message) => (
          <div
            key={message.id}
            onTouchStart={() => setSelectedMessage(message)}
            className="active:bg-muted/50"
          >
            <MessageItem message={message} />
          </div>
        ))}
      </div>

      {/* Mobile action sheet */}
      <AnimatePresence>
        {selectedMessage && (
          <MessageActions
            message={selectedMessage}
            permissions={getPermissions(selectedMessage)}
            onAction={(action, data) =>
              handleAction(action, selectedMessage, data)
            }
            variant="mobile"
            onClose={() => setSelectedMessage(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ============================================================================
// Example 4: Thread View with Compact Actions
// ============================================================================

export function ThreadMessageList({
  threadId,
  messages,
}: {
  threadId: string;
  messages: Message[];
}) {
  const { handleAction, getPermissions } = useMessageActions({
    channelId: threadId,
    onReplyMessage: (msg) => {
      console.log("Reply to:", msg);
    },
  });

  return (
    <div className="space-y-0.5">
      {messages.map((message) => {
        const permissions = getPermissions(message);

        return (
          <MessageContextMenu
            key={message.id}
            message={message}
            permissions={permissions}
            onAction={(action, data) => handleAction(action, message, data)}
          >
            <div className="hover:bg-muted/30 group relative">
              <MessageItem message={message} isCompact />

              {/* Compact actions on hover */}
              <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
                <MessageActions
                  message={message}
                  permissions={permissions}
                  onAction={(action, data) =>
                    handleAction(action, message, data)
                  }
                  variant="compact"
                />
              </div>
            </div>
          </MessageContextMenu>
        );
      })}
    </div>
  );
}

// ============================================================================
// Example 5: Full Integration with GraphQL
// ============================================================================

import { useMutation } from "@apollo/client";
import {
  DELETE_MESSAGE,
  PIN_MESSAGE,
  UNPIN_MESSAGE,
  STAR_MESSAGE,
  UNSTAR_MESSAGE,
  ADD_REACTION,
  REMOVE_REACTION,
} from "@/graphql/mutations/messages";

export function MessageWithGraphQL({ message }: { message: Message }) {
  const [deleteMessage] = useMutation(DELETE_MESSAGE);
  const [pinMessage] = useMutation(PIN_MESSAGE);
  const [unpinMessage] = useMutation(UNPIN_MESSAGE);
  const [starMessage] = useMutation(STAR_MESSAGE);
  const [unstarMessage] = useMutation(UNSTAR_MESSAGE);
  const [addReaction] = useMutation(ADD_REACTION);
  const [removeReaction] = useMutation(REMOVE_REACTION);

  const { handleAction, getPermissions, handlers } = useMessageActions({
    channelId: message.channelId,
    onDeleteMessage: async (id) => {
      await deleteMessage({
        variables: { id },
        update(cache) {
          cache.evict({ id: cache.identify({ __typename: "Message", id }) });
        },
      });
    },
  });

  // Override handlers with GraphQL mutations
  const customHandlers = {
    ...handlers,
    onReact: async (messageId: string, emoji: string) => {
      await addReaction({
        variables: { messageId, emoji },
        optimisticResponse: {
          addReaction: {
            __typename: "Reaction",
            emoji,
            count: 1,
            hasReacted: true,
          },
        },
      });
    },
    onRemoveReaction: async (messageId: string, emoji: string) => {
      await removeReaction({
        variables: { messageId, emoji },
      });
    },
    onPin: async (messageId: string) => {
      await pinMessage({
        variables: { messageId },
        optimisticResponse: {
          pinMessage: {
            __typename: "Message",
            id: messageId,
            isPinned: true,
          },
        },
      });
    },
    onUnpin: async (messageId: string) => {
      await unpinMessage({
        variables: { messageId },
        optimisticResponse: {
          unpinMessage: {
            __typename: "Message",
            id: messageId,
            isPinned: false,
          },
        },
      });
    },
    onBookmark: async (messageId: string) => {
      await starMessage({
        variables: { messageId },
        optimisticResponse: {
          starMessage: {
            __typename: "Message",
            id: messageId,
            isBookmarked: true,
          },
        },
      });
    },
    onUnbookmark: async (messageId: string) => {
      await unstarMessage({
        variables: { messageId },
        optimisticResponse: {
          unstarMessage: {
            __typename: "Message",
            id: messageId,
            isBookmarked: false,
          },
        },
      });
    },
  };

  const permissions = getPermissions(message);

  return (
    <MessageContextMenu
      message={message}
      permissions={permissions}
      onAction={(action, data) => handleAction(action, message, data)}
    >
      <MessageItem
        message={message}
        onReact={customHandlers.onReact}
        onRemoveReaction={customHandlers.onRemoveReaction}
        onPin={customHandlers.onPin}
        onUnpin={customHandlers.onUnpin}
      />
    </MessageContextMenu>
  );
}
