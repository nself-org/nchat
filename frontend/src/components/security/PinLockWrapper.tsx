/**
 * PIN Lock Wrapper Component
 *
 * Wraps the app to handle PIN lock overlay display
 * Should be placed at the root layout level
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePinLock } from "@/hooks/use-pin-lock";
import { PinLock } from "./PinLock";
import { useAuth } from "@/contexts/auth-context";

// ============================================================================
// Types
// ============================================================================

interface PinLockWrapperProps {
  children: React.ReactNode;
}

// ============================================================================
// Component
// ============================================================================

export function PinLockWrapper({ children }: PinLockWrapperProps) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { isLocked, hasPinSetup, unlock } = usePinLock();

  // Track if we should show the lock screen
  const [showLock, setShowLock] = useState(false);

  // Update show lock when lock state changes
  useEffect(() => {
    // Only show lock if:
    // 1. User is authenticated
    // 2. PIN is configured
    // 3. Session is locked
    if (user && hasPinSetup && isLocked) {
      setShowLock(true);
    } else {
      setShowLock(false);
    }
  }, [user, hasPinSetup, isLocked]);

  // Handle unlock
  const handleUnlock = () => {
    unlock();
    setShowLock(false);
  };

  // Handle forgot PIN
  const handleForgotPin = async () => {
    const confirmed = confirm(
      "Forgot PIN? You will be signed out and need to sign in with your password. PIN lock will be disabled.",
    );

    if (confirmed) {
      // Sign out user
      await signOut();

      // Clear PIN settings (will happen on sign out)
      // Navigate to login
      router.push("/auth/signin");
    }
  };

  // Don't render lock screen if not needed
  if (!showLock) {
    return <>{children}</>;
  }

  return (
    <>
      {/* Render children (hidden behind lock) */}
      <div className="hidden">{children}</div>

      {/* PIN Lock Overlay */}
      <PinLock onUnlock={handleUnlock} onForgotPin={handleForgotPin} />
    </>
  );
}
