/**
 * PinLockWrapper — root-level wrapper that shows the PIN lock overlay.
 *
 * Decoupled from @/hooks/use-pin-lock, @/contexts/auth-context, next/navigation.
 * All state and operations are injected via the PinLockStateAdapter prop.
 *
 * @module auth/pin-lock-wrapper
 */

import { useEffect, useState } from 'react';
import { PinLock } from './pin-lock';
import type { PinLockAdapter } from './pin-lock';

// ============================================================================
// Types
// ============================================================================

export interface PinLockStateAdapter {
  /** Whether the session is currently locked */
  isLocked: boolean;
  /** Whether the user has set up a PIN */
  hasPinSetup: boolean;
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** Unlock the session (after PIN verified externally) */
  unlock(): void;
  /** Sign the user out */
  signOut(): Promise<void>;
  /** Navigate to a path */
  push(path: string): void;
  /** Injectable security adapter for the PinLock UI */
  pinLockAdapter: PinLockAdapter;
}

export interface PinLockWrapperProps {
  children: React.ReactNode;
  /** Injectable state/operations — replaces usePinLock/useAuth/useRouter */
  adapter: PinLockStateAdapter;
  /** Path to navigate after sign-out (default: "/auth/signin") */
  signOutPath?: string;
  /** Whether to render children hidden behind the lock (default: true) */
  renderChildrenBehindLock?: boolean;
  /** Additional class names for the overlay */
  className?: string;
}

// ============================================================================
// PinLockWrapper
// ============================================================================

/**
 * Wraps the app at root-layout level to show PIN lock when the session is locked.
 *
 * @example
 * ```tsx
 * <PinLockWrapper adapter={pinLockStateAdapter}>
 *   {children}
 * </PinLockWrapper>
 * ```
 */
export function PinLockWrapper({
  children,
  adapter,
  signOutPath = '/auth/signin',
  renderChildrenBehindLock = true,
  className,
}: PinLockWrapperProps) {
  const { isLocked, hasPinSetup, isAuthenticated, unlock, signOut, push, pinLockAdapter } = adapter;

  const [showLock, setShowLock] = useState(false);

  // Show the lock screen only when: authenticated + PIN set up + session locked
  useEffect(() => {
    setShowLock(isAuthenticated && hasPinSetup && isLocked);
  }, [isAuthenticated, hasPinSetup, isLocked]);

  const handleUnlock = () => {
    unlock();
    setShowLock(false);
  };

  const handleForgotPin = async () => {
    const confirmed = window.confirm(
      'Forgot PIN? You will be signed out and need to sign in with your password. PIN lock will be disabled.'
    );
    if (confirmed) {
      await signOut();
      push(signOutPath);
    }
  };

  if (!showLock) {
    return <>{children}</>;
  }

  return (
    <>
      {renderChildrenBehindLock && <div className="hidden">{children}</div>}
      <PinLock
        adapter={pinLockAdapter}
        onUnlock={handleUnlock}
        onForgotPin={handleForgotPin}
        className={className}
      />
    </>
  );
}

export default PinLockWrapper;
