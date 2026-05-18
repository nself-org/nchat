import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Stub channel list item component — stub only until S05 port.
 * Full implementation with unread badges, presence indicators, and context menu lands in S05.
 */
export const ChannelListItem = ({ name, lastMessage, isActive }) => (_jsxs("div", { "aria-current": isActive ? 'page' : undefined, children: [_jsx("span", { children: name }), lastMessage && _jsx("span", { children: lastMessage })] }));
