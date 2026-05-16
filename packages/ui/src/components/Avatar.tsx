import React from 'react';

/** Props for the Avatar component. */
interface AvatarProps {
  /** Image source URL. */
  src?: string;
  /** Accessible alt text for the avatar image. */
  alt?: string;
  /** Display size in pixels (renders as square). */
  size?: number;
}

/**
 * Stub avatar component — stub only until S05 port.
 * Full implementation with size variants and fallback initials lands in S05.
 */
export const Avatar: React.FC<AvatarProps> = ({ src, alt, size = 32 }) => (
  <img src={src} alt={alt ?? ''} width={size} height={size} />
);
