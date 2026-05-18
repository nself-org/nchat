/**
 * IDmeVerification — ID.me identity verification status component.
 *
 * Decoupled from Next.js: all fetch/redirect operations injectable as props.
 * Works in Next.js, Tauri desktop, and Capacitor mobile.
 *
 * @module auth/idme-verification
 */

import { useState, useEffect, useCallback } from 'react';
import { Shield, CheckCircle2, AlertCircle, ExternalLink, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface IDmeVerificationStatus {
  verified: boolean;
  verificationType?: string;
  verificationGroup?: string;
  verifiedAt?: string;
}

export interface IDmeVerificationAdapter {
  /** Fetch the user's current verification status */
  getStatus(userId: string): Promise<IDmeVerificationStatus>;
  /** Redirect to ID.me OAuth flow */
  initiateVerification(userId: string): Promise<void>;
}

export interface IDmeVerificationProps {
  userId?: string;
  onVerificationComplete?: () => void;
  /** Injectable adapter — defaults to /api/auth/idme/* fetch calls */
  adapter?: IDmeVerificationAdapter;
  className?: string;
}

// ============================================================================
// Badge helper
// ============================================================================

type BadgeVariant = 'default' | 'secondary' | 'outline';

interface BadgeInfo {
  label: string;
  variant: BadgeVariant;
}

const VERIFICATION_BADGES: Record<string, BadgeInfo> = {
  military:   { label: 'Military',       variant: 'default' },
  responder:  { label: 'First Responder', variant: 'default' },
  student:    { label: 'Student',         variant: 'secondary' },
  teacher:    { label: 'Teacher',         variant: 'secondary' },
  government: { label: 'Government',      variant: 'secondary' },
  verified:   { label: 'Verified',        variant: 'outline' },
};

function VerificationBadge({ type }: { type: string }) {
  const info = VERIFICATION_BADGES[type] ?? VERIFICATION_BADGES.verified!;
  const variantClasses: Record<BadgeVariant, string> = {
    default:   'bg-primary text-primary-foreground',
    secondary: 'bg-secondary text-secondary-foreground',
    outline:   'border border-input text-foreground',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantClasses[info!.variant]
      )}
    >
      {info!.label}
    </span>
  );
}

// ============================================================================
// Default adapter (Next.js fetch-based)
// ============================================================================

const defaultAdapter: IDmeVerificationAdapter = {
  async getStatus(userId) {
    const response = await fetch(`/api/auth/idme/status?userId=${userId}`);
    if (!response.ok) throw new Error('Failed to load verification status');
    return response.json() as Promise<IDmeVerificationStatus>;
  },
  async initiateVerification(userId) {
    const state = btoa(JSON.stringify({ userId }));
    const baseUrl = window.location.origin;
    const redirectUri = `${baseUrl}/api/auth/idme/callback`;
    const clientId = (globalThis as Record<string, unknown>).NEXT_PUBLIC_IDME_CLIENT_ID as string | undefined
      ?? '';

    const authUrl = new URL('https://api.id.me/oauth/authorize');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'military student responder teacher government');
    authUrl.searchParams.set('state', state);

    window.location.href = authUrl.toString();
  },
};

// ============================================================================
// IDmeVerification
// ============================================================================

/**
 * Displays ID.me verification status and allows initiating verification.
 *
 * @example
 * ```tsx
 * <IDmeVerification
 *   userId={user.id}
 *   onVerificationComplete={() => refetchUser()}
 * />
 * ```
 */
export function IDmeVerification({
  userId,
  onVerificationComplete,
  adapter = defaultAdapter,
  className,
}: IDmeVerificationProps) {
  const [status, setStatus] = useState<IDmeVerificationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');

  const loadStatus = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }
    try {
      const data = await adapter.getStatus(userId);
      setStatus(data);
    } catch {
      // Non-blocking — just won't show status
    } finally {
      setIsLoading(false);
    }
  }, [adapter, userId]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleInitiate = async () => {
    if (!userId) return;
    setIsVerifying(true);
    setError('');
    try {
      await adapter.initiateVerification(userId);
      onVerificationComplete?.();
    } catch {
      setError('Failed to initiate verification. Please try again.');
      setIsVerifying(false);
    }
  };

  if (isLoading) {
    return (
      <div className={cn('rounded-xl border bg-card p-6', className)}>
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl border bg-card', className)}>
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-indigo-600" />
          <h3 className="font-semibold text-foreground">ID.me Verification</h3>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Verify your identity to unlock exclusive features and badges
        </p>
      </div>

      <div className="space-y-4 p-4">
        {status?.verified ? (
          <>
            {/* Verified state */}
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <p className="text-sm">Your identity has been verified with ID.me</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Verification Status</span>
                {status.verificationType && <VerificationBadge type={status.verificationType} />}
              </div>

              {status.verifiedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Verified</span>
                  <span className="text-sm text-foreground">
                    {new Date(status.verifiedAt).toLocaleDateString()}
                  </span>
                </div>
              )}

              {status.verificationGroup && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Group</span>
                  <span className="text-sm capitalize text-foreground">{status.verificationGroup}</span>
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Your verification is managed by ID.me, a trusted identity verification service.
            </p>
          </>
        ) : (
          <>
            {/* Unverified state */}
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3">
                <AlertCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Your identity has not been verified yet
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Benefits of verification:</p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Unlock exclusive verified member badges</li>
                  <li>• Access military, student, and professional discounts</li>
                  <li>• Increased trust with other community members</li>
                </ul>
              </div>
            </div>

            <button
              type="button"
              onClick={handleInitiate}
              disabled={isVerifying || !userId}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Redirecting...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4" />
                  Verify with ID.me
                </>
              )}
            </button>

            <p className="text-center text-xs text-muted-foreground">
              You&apos;ll be redirected to ID.me to complete verification
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default IDmeVerification;
