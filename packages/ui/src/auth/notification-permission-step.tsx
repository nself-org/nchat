/**
 * NotificationPermissionStep — onboarding notifications permission step.
 *
 * Decoupled from app internals: all state via props.
 *
 * @module auth/notification-permission-step
 */

import { useState, useCallback } from 'react';
import { Bell, BellOff, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import type { OnboardingStepProps, NotificationSettings } from './onboarding-types';
import { defaultNotificationSettings } from './onboarding-steps';

// ============================================================================
// Types
// ============================================================================

export type NotificationPermissionStatus = 'default' | 'granted' | 'denied';

export interface NotificationPermissionStepProps extends OnboardingStepProps {
  initialData?: Partial<NotificationSettings>;
  onDataChange?: (data: Partial<NotificationSettings>) => void;
  /** Override permission request — for environments without Notification API */
  onRequestPermission?: () => Promise<NotificationPermissionStatus>;
  className?: string;
}

// ============================================================================
// Switch
// ============================================================================

function Switch({
  checked,
  onChange,
  id,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  id: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50',
        checked ? 'bg-primary' : 'bg-input'
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
          checked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  );
}

// ============================================================================
// NotificationPermissionStep
// ============================================================================

/**
 * Notification permission step — request browser push permission + configure settings.
 *
 * @example
 * ```tsx
 * <NotificationPermissionStep
 *   onNext={handleNext}
 *   onPrev={handlePrev}
 *   isFirst={false}
 *   isLast={false}
 *   canSkip
 *   onSkip={handleSkip}
 *   onDataChange={(data) => store.updateNotifications(data)}
 * />
 * ```
 */
export function NotificationPermissionStep({
  onNext,
  onPrev,
  onSkip,
  isFirst,
  isLast,
  canSkip,
  initialData = {},
  onDataChange,
  onRequestPermission,
  className,
}: NotificationPermissionStepProps) {
  const merged = { ...defaultNotificationSettings, ...initialData };

  const [permissionStatus, setPermissionStatus] = useState<NotificationPermissionStatus>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission as NotificationPermissionStatus;
    }
    return 'default';
  });
  const [requesting, setRequesting] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>(merged as NotificationSettings);

  const updateSettings = useCallback(
    (patch: Partial<NotificationSettings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...patch };
        onDataChange?.(next);
        return next;
      });
    },
    [onDataChange]
  );

  const handleRequestPermission = useCallback(async () => {
    setRequesting(true);
    try {
      let status: NotificationPermissionStatus;
      if (onRequestPermission) {
        status = await onRequestPermission();
      } else if (typeof window !== 'undefined' && 'Notification' in window) {
        const result = await Notification.requestPermission();
        status = result as NotificationPermissionStatus;
      } else {
        status = 'denied';
      }
      setPermissionStatus(status);
      if (status === 'granted') {
        updateSettings({ desktopNotifications: true });
      }
    } catch {
      console.error('[NotificationPermissionStep] Permission request failed');
    } finally {
      setRequesting(false);
    }
  }, [onRequestPermission, updateSettings]);

  const granted = permissionStatus === 'granted';
  const denied = permissionStatus === 'denied';

  return (
    <div className={cn('w-full max-w-lg', className)}>
      <h2 className="mb-1 text-2xl font-bold text-foreground">Stay in the Loop</h2>
      <p className="mb-6 text-muted-foreground">
        Enable notifications so you never miss an important message.
      </p>

      {/* Permission request card */}
      {!granted && !denied && (
        <div className="mb-6 rounded-xl border border-border bg-card p-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Bell className="h-8 w-8 text-primary" />
          </div>
          <h3 className="mb-2 font-semibold text-foreground">Allow Notifications</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Your browser will ask for permission. This lets us alert you to new messages and
            mentions even when the tab is in the background.
          </p>
          <button
            type="button"
            onClick={handleRequestPermission}
            disabled={requesting}
            className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {requesting ? 'Requesting…' : 'Enable Notifications'}
          </button>
        </div>
      )}

      {granted && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-900/20 dark:text-green-400">
          <Check className="h-5 w-5 flex-shrink-0" />
          <span>Notifications are enabled.</span>
        </div>
      )}

      {denied && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <BellOff className="h-5 w-5 flex-shrink-0" />
          <span>
            Notifications were blocked. You can change this in your browser settings at any time.
          </span>
        </div>
      )}

      {/* Settings (only show when granted) */}
      {granted && (
        <div className="space-y-3">
          {(
            [
              { id: 'notif-sound', label: 'Sound alerts', key: 'soundEnabled' },
              { id: 'notif-mentions', label: 'Mentions only', key: 'mentionsOnly' },
              { id: 'notif-dm', label: 'Direct messages', key: 'dmNotifications' },
              { id: 'notif-channel', label: 'Channel messages', key: 'channelNotifications' },
            ] as const
          ).map(({ id, label, key }) => (
            <div
              key={id}
              className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
            >
              <label htmlFor={id} className="text-sm font-medium text-foreground">
                {label}
              </label>
              <Switch
                id={id}
                checked={settings[key as keyof NotificationSettings] as boolean}
                onChange={(v) => updateSettings({ [key]: v })}
              />
            </div>
          ))}

          {/* Mute schedule */}
          <div className="rounded-lg border border-border px-4 py-3">
            <div className="flex items-center justify-between">
              <label htmlFor="notif-mute" className="text-sm font-medium text-foreground">
                Mute schedule
              </label>
              <Switch
                id="notif-mute"
                checked={settings.muteSchedule?.enabled ?? false}
                onChange={(v) =>
                  updateSettings({
                    muteSchedule: { ...settings.muteSchedule!, enabled: v },
                  })
                }
              />
            </div>
            {settings.muteSchedule?.enabled && (
              <div className="mt-3 flex items-center gap-3">
                <div className="flex flex-1 flex-col gap-1">
                  <label className="text-xs text-muted-foreground">From</label>
                  <input
                    type="time"
                    value={settings.muteSchedule?.startTime ?? '22:00'}
                    onChange={(e) =>
                      updateSettings({
                        muteSchedule: { ...settings.muteSchedule!, startTime: e.target.value },
                      })
                    }
                    className="rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <label className="text-xs text-muted-foreground">To</label>
                  <input
                    type="time"
                    value={settings.muteSchedule?.endTime ?? '08:00'}
                    onChange={(e) =>
                      updateSettings({
                        muteSchedule: { ...settings.muteSchedule!, endTime: e.target.value },
                      })
                    }
                    className="rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="mt-8 flex items-center justify-between gap-3">
        <div>
          {!isFirst && (
            <button
              type="button"
              onClick={onPrev}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Back
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {canSkip && onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Skip
            </button>
          )}
          <button
            type="button"
            onClick={onNext}
            className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {isLast ? 'Finish' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default NotificationPermissionStep;
