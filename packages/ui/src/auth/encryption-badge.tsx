/**
 * EncryptionBadge — encryption status indicator component.
 *
 * No Radix deps. No @/ aliases. Uses native `title` attr for tooltips.
 * Inline SVG icons. CVA variants (badgeVariants / iconVariants).
 *
 * @module auth/encryption-badge
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

// ============================================================================
// Types
// ============================================================================

export type EncryptionLevel = 'none' | 'initializing' | 'encrypted' | 'verified' | 'error';

export interface EncryptionBadgeProps extends VariantProps<typeof badgeVariants> {
  /** Current encryption level */
  level: EncryptionLevel;
  /** Whether to show tooltip (via native title attr) with details */
  showTooltip?: boolean;
  /** Custom tooltip text */
  tooltipContent?: string;
  /** Whether to show the label text */
  showLabel?: boolean;
  /** Custom label text */
  label?: string;
  /** Click handler */
  onClick?: () => void;
  /** Additional CSS class */
  className?: string;
  /** Whether the component is interactive */
  interactive?: boolean;
  /** Test ID for testing */
  'data-testid'?: string;
}

// ============================================================================
// Variants (CVA)
// ============================================================================

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full font-medium transition-colors',
  {
    variants: {
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-1 text-sm',
        lg: 'px-3 py-1.5 text-base',
      },
      variant: {
        none: 'bg-muted text-muted-foreground',
        initializing: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        encrypted: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        verified: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
        error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      },
    },
    defaultVariants: {
      size: 'md',
      variant: 'none',
    },
  }
);

const iconVariants = cva('flex-shrink-0', {
  variants: {
    size: {
      sm: 'h-3 w-3',
      md: 'h-4 w-4',
      lg: 'h-5 w-5',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

// ============================================================================
// Inline SVG icons (no lucide-react — matches source inline SVG approach)
// ============================================================================

interface IconProps {
  className?: string;
}

const LockIcon: React.FC<IconProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const UnlockIcon: React.FC<IconProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 9.9-1" />
  </svg>
);

const ShieldCheckIcon: React.FC<IconProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const LoaderIcon: React.FC<IconProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn(className, 'animate-spin')}
    aria-hidden="true"
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

const AlertIcon: React.FC<IconProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </svg>
);

// ============================================================================
// Helpers
// ============================================================================

function getIcon(level: EncryptionLevel, size: 'sm' | 'md' | 'lg' = 'md'): React.ReactNode {
  const className = iconVariants({ size });
  switch (level) {
    case 'none':
      return <UnlockIcon className={className} />;
    case 'initializing':
      return <LoaderIcon className={className} />;
    case 'encrypted':
      return <LockIcon className={className} />;
    case 'verified':
      return <ShieldCheckIcon className={className} />;
    case 'error':
      return <AlertIcon className={className} />;
    default:
      return <UnlockIcon className={className} />;
  }
}

function getDefaultLabel(level: EncryptionLevel): string {
  switch (level) {
    case 'none':
      return 'Not encrypted';
    case 'initializing':
      return 'Initializing...';
    case 'encrypted':
      return 'Encrypted';
    case 'verified':
      return 'Verified';
    case 'error':
      return 'Error';
    default:
      return 'Unknown';
  }
}

function getDefaultTooltip(level: EncryptionLevel): string {
  switch (level) {
    case 'none':
      return 'Messages in this conversation are not encrypted.';
    case 'initializing':
      return 'Setting up encryption for this conversation...';
    case 'encrypted':
      return 'Messages are encrypted end-to-end. Only participants can read them.';
    case 'verified':
      return 'Messages are encrypted and all participants have been verified.';
    case 'error':
      return 'There was an error with encryption. Messages may not be secure.';
    default:
      return 'Unknown encryption status.';
  }
}

function getAriaLabel(level: EncryptionLevel): string {
  switch (level) {
    case 'none':
      return 'Encryption disabled';
    case 'initializing':
      return 'Encryption initializing';
    case 'encrypted':
      return 'End-to-end encrypted';
    case 'verified':
      return 'Verified end-to-end encrypted';
    case 'error':
      return 'Encryption error';
    default:
      return 'Unknown encryption status';
  }
}

// ============================================================================
// EncryptionBadge
// ============================================================================

/**
 * EncryptionBadge displays encryption status with CVA-styled badge.
 * Uses native `title` attribute for tooltip — no Radix Tooltip dependency.
 */
export const EncryptionBadge = React.forwardRef<HTMLDivElement, EncryptionBadgeProps>(
  (
    {
      level,
      size = 'md',
      showTooltip = true,
      tooltipContent,
      showLabel = true,
      label,
      onClick,
      className,
      interactive = false,
      'data-testid': testId,
    },
    ref
  ) => {
    const displayLabel = label ?? getDefaultLabel(level);
    const displayTooltip = tooltipContent ?? getDefaultTooltip(level);
    const safeSize = (size ?? 'md') as 'sm' | 'md' | 'lg';

    return (
      <div
        ref={ref}
        className={cn(
          badgeVariants({ size, variant: level }),
          interactive && 'cursor-pointer hover:opacity-80',
          className
        )}
        onClick={interactive ? onClick : undefined}
        role={interactive ? 'button' : 'status'}
        aria-label={getAriaLabel(level)}
        tabIndex={interactive ? 0 : undefined}
        onKeyDown={
          interactive
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onClick?.();
                }
              }
            : undefined
        }
        title={showTooltip ? displayTooltip : undefined}
        data-testid={testId}
        data-encryption-level={level}
      >
        {getIcon(level, safeSize)}
        {showLabel && <span>{displayLabel}</span>}
      </div>
    );
  }
);

EncryptionBadge.displayName = 'EncryptionBadge';

// ============================================================================
// Subcomponents
// ============================================================================

/**
 * Compact version showing just the icon without a label.
 */
export const EncryptionIcon = React.forwardRef<
  HTMLDivElement,
  Omit<EncryptionBadgeProps, 'showLabel'>
>((props, ref) => <EncryptionBadge ref={ref} {...props} showLabel={false} />);

EncryptionIcon.displayName = 'EncryptionIcon';

/**
 * Status indicator for channel headers. Derives EncryptionLevel from boolean flags.
 */
export interface ChannelEncryptionStatusProps {
  isEncrypted: boolean;
  isVerified?: boolean;
  isError?: boolean;
  isInitializing?: boolean;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
}

export const ChannelEncryptionStatus: React.FC<ChannelEncryptionStatusProps> = ({
  isEncrypted,
  isVerified = false,
  isError = false,
  isInitializing = false,
  showLabel = true,
  size = 'sm',
  className,
  onClick,
}) => {
  let level: EncryptionLevel = 'none';
  if (isError) {
    level = 'error';
  } else if (isInitializing) {
    level = 'initializing';
  } else if (isVerified) {
    level = 'verified';
  } else if (isEncrypted) {
    level = 'encrypted';
  }

  return (
    <EncryptionBadge
      level={level}
      size={size}
      showLabel={showLabel}
      className={className}
      onClick={onClick}
      interactive={!!onClick}
      data-testid="channel-encryption-status"
    />
  );
};

/**
 * Inline message encryption indicator. Returns null when not encrypted.
 */
export interface MessageEncryptionIndicatorProps {
  isEncrypted: boolean;
  isDecryptionFailed?: boolean;
  className?: string;
}

export const MessageEncryptionIndicator: React.FC<MessageEncryptionIndicatorProps> = ({
  isEncrypted,
  isDecryptionFailed = false,
  className,
}) => {
  if (isDecryptionFailed) {
    return (
      <span
        className={cn('inline-flex items-center gap-1 text-xs text-red-500', className)}
        title="Failed to decrypt message"
        data-testid="message-decryption-failed"
      >
        <AlertIcon className="h-3 w-3" />
        <span className="sr-only">Decryption failed</span>
      </span>
    );
  }

  if (!isEncrypted) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400',
        className
      )}
      title="Message is encrypted"
      data-testid="message-encrypted-indicator"
    >
      <LockIcon className="h-3 w-3" />
      <span className="sr-only">Encrypted</span>
    </span>
  );
};

export default EncryptionBadge;
