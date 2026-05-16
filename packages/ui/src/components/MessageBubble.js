import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Stub message bubble component — stub only until S05 port.
 * Full implementation with reactions, thread previews, and media lands in S05.
 */
export const MessageBubble = ({ content, timestamp, isOwn }) => (_jsxs("div", { style: { textAlign: isOwn ? 'right' : 'left' }, children: [_jsx("span", { children: content }), _jsx("time", { dateTime: timestamp, children: timestamp })] }));
