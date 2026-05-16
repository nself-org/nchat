import React from 'react';
/** Props for the MessageBubble component. */
interface MessageBubbleProps {
    /** The message text content. */
    content: string;
    /** ISO 8601 timestamp string for the message. */
    timestamp: string;
    /** Whether this bubble belongs to the current user (affects alignment). */
    isOwn?: boolean;
}
/**
 * Stub message bubble component — stub only until S05 port.
 * Full implementation with reactions, thread previews, and media lands in S05.
 */
export declare const MessageBubble: React.FC<MessageBubbleProps>;
export {};
//# sourceMappingURL=MessageBubble.d.ts.map