import React from 'react';

/** Props for the ChannelListItem component. */
interface ChannelListItemProps {
  /** Display name of the channel. */
  name: string;
  /** Preview text of the most recent message in the channel. */
  lastMessage?: string;
  /** Whether this channel is currently selected/active. */
  isActive?: boolean;
}

/**
 * Stub channel list item component — stub only until S05 port.
 * Full implementation with unread badges, presence indicators, and context menu lands in S05.
 */
export const ChannelListItem: React.FC<ChannelListItemProps> = ({ name, lastMessage, isActive }) => (
  <div aria-current={isActive ? 'page' : undefined}>
    <span>{name}</span>
    {lastMessage && <span>{lastMessage}</span>}
  </div>
);
