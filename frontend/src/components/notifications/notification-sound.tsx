"use client";

import * as React from "react";
import {
  useNotificationStore,
  type NotificationType,
} from "@/stores/notification-store";

import { logger } from "@/lib/logger";

// Default sound URLs for different notification types
const DEFAULT_SOUNDS: Record<NotificationType, string> = {
  mention: "/sounds/mention.mp3",
  direct_message: "/sounds/message.mp3",
  thread_reply: "/sounds/thread.mp3",
  reaction: "/sounds/reaction.mp3",
  channel_invite: "/sounds/invite.mp3",
  channel_update: "/sounds/update.mp3",
  system: "/sounds/system.mp3",
  announcement: "/sounds/announcement.mp3",
};

// Fallback to a simple beep if no audio file available
const FALLBACK_SOUND =
  "data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU" +
  "tvT38AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

export interface NotificationSoundOptions {
  /**
   * Type of notification to determine sound
   */
  type?: NotificationType;

  /**
   * Custom sound URL (overrides type-based selection)
   */
  soundUrl?: string;

  /**
   * Volume level (0-100)
   */
  volume?: number;

  /**
   * Whether to force play even if preferences have sound disabled
   */
  force?: boolean;
}

export interface UseNotificationSoundReturn {
  /**
   * Play a notification sound
   */
  play: (options?: NotificationSoundOptions) => Promise<void>;

  /**
   * Stop the currently playing sound
   */
  stop: () => void;

  /**
   * Whether sound is currently playing
   */
  isPlaying: boolean;

  /**
   * Whether sound is enabled in preferences
   */
  isSoundEnabled: boolean;

  /**
   * Current volume from preferences
   */
  volume: number;

  /**
   * Set the volume
   */
  setVolume: (volume: number) => void;

  /**
   * Toggle sound on/off
   */
  toggleSound: () => void;

  /**
   * Preload sounds for faster playback
   */
  preloadSounds: () => void;
}

/**
 * useNotificationSound Hook
 *
 * Provides notification sound functionality:
 * - Play different sounds for different notification types
 * - Respect user preferences
 * - Volume control
 * - DND awareness
 */
export function useNotificationSound(): UseNotificationSoundReturn {
  const preferences = useNotificationStore((state) => state.preferences);
  const updatePreferences = useNotificationStore(
    (state) => state.updatePreferences,
  );

  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const preloadedAudio = React.useRef<Map<string, HTMLAudioElement>>(new Map());
  const [isPlaying, setIsPlaying] = React.useState(false);

  // Check if DND is active
  const isDndActive = React.useCallback((): boolean => {
    if (!preferences.dndSchedule.enabled) return false;

    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

    if (!preferences.dndSchedule.days.includes(currentDay)) {
      return false;
    }

    const { startTime, endTime } = preferences.dndSchedule;

    if (startTime > endTime) {
      return currentTime >= startTime || currentTime < endTime;
    }

    return currentTime >= startTime && currentTime < endTime;
  }, [preferences.dndSchedule]);

  // Play sound
  const play = React.useCallback(
    async (options: NotificationSoundOptions = {}): Promise<void> => {
      const { type = "system", soundUrl, volume, force = false } = options;

      // Check if sound should be played
      if (!force && (!preferences.soundEnabled || !preferences.playSound)) {
        return;
      }

      // Check DND
      if (!force && isDndActive()) {
        return;
      }

      // Determine sound URL
      const url =
        soundUrl ||
        preferences.customSoundUrl ||
        DEFAULT_SOUNDS[type] ||
        FALLBACK_SOUND;
      const effectiveVolume = volume ?? preferences.soundVolume;

      try {
        // Check for preloaded audio
        let audio = preloadedAudio.current.get(url);

        if (!audio) {
          audio = new Audio(url);
          audio.preload = "auto";
        }

        audio.volume = effectiveVolume / 100;
        audio.currentTime = 0;
        audioRef.current = audio;

        setIsPlaying(true);

        audio.onended = () => {
          setIsPlaying(false);
        };

        audio.onerror = () => {
          // Try fallback sound
          if (url !== FALLBACK_SOUND) {
            const fallback = new Audio(FALLBACK_SOUND);
            fallback.volume = effectiveVolume / 100;
            fallback.play().catch(() => {
              logger.warn("Failed to play notification sound");
            });
          }
          setIsPlaying(false);
        };

        await audio.play();
      } catch (error) {
        // Audio play failed (usually due to autoplay restrictions)
        logger.warn("Failed to play notification sound:", { context: error });
        setIsPlaying(false);
      }
    },
    [preferences, isDndActive],
  );

  // Stop sound
  const stop = React.useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, []);

  // Set volume
  const setVolume = React.useCallback(
    (volume: number) => {
      const clampedVolume = Math.max(0, Math.min(100, volume));
      updatePreferences({ soundVolume: clampedVolume });

      if (audioRef.current) {
        audioRef.current.volume = clampedVolume / 100;
      }
    },
    [updatePreferences],
  );

  // Toggle sound
  const toggleSound = React.useCallback(() => {
    updatePreferences({ soundEnabled: !preferences.soundEnabled });
  }, [preferences.soundEnabled, updatePreferences]);

  // Preload sounds
  const preloadSounds = React.useCallback(() => {
    Object.entries(DEFAULT_SOUNDS).forEach(([, url]) => {
      if (!preloadedAudio.current.has(url)) {
        const audio = new Audio();
        audio.preload = "auto";
        audio.src = url;
        preloadedAudio.current.set(url, audio);
      }
    });
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return {
    play,
    stop,
    isPlaying,
    isSoundEnabled: preferences.soundEnabled,
    volume: preferences.soundVolume,
    setVolume,
    toggleSound,
    preloadSounds,
  };
}

/**
 * NotificationSoundPlayer Component
 *
 * A declarative component for playing notification sounds
 */
export interface NotificationSoundPlayerProps {
  /**
   * Whether the sound should play
   */
  shouldPlay: boolean;

  /**
   * Notification type for sound selection
   */
  type?: NotificationType;

  /**
   * Custom sound URL
   */
  soundUrl?: string;

  /**
   * Volume override
   */
  volume?: number;

  /**
   * Callback when sound starts playing
   */
  onPlayStart?: () => void;

  /**
   * Callback when sound finishes playing
   */
  onPlayEnd?: () => void;
}

export function NotificationSoundPlayer({
  shouldPlay,
  type,
  soundUrl,
  volume,
  onPlayStart,
  onPlayEnd,
}: NotificationSoundPlayerProps) {
  const { play, isPlaying } = useNotificationSound();
  const hasPlayedRef = React.useRef(false);

  React.useEffect(() => {
    if (shouldPlay && !hasPlayedRef.current) {
      hasPlayedRef.current = true;
      onPlayStart?.();
      play({ type, soundUrl, volume }).then(() => {
        onPlayEnd?.();
      });
    }

    if (!shouldPlay) {
      hasPlayedRef.current = false;
    }
  }, [shouldPlay, type, soundUrl, volume, play, onPlayStart, onPlayEnd]);

  // This component doesn't render anything
  return null;
}

/**
 * SoundVolumeControl Component
 *
 * A simple volume slider control
 */
export interface SoundVolumeControlProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Whether to show the mute toggle
   */
  showMuteToggle?: boolean;

  /**
   * Whether to show the current volume value
   */
  showValue?: boolean;
}

export function SoundVolumeControl({
  showMuteToggle = true,
  showValue = true,
  className,
  ...props
}: SoundVolumeControlProps) {
  const { isSoundEnabled, volume, setVolume, toggleSound, play } =
    useNotificationSound();

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value, 10);
    setVolume(newVolume);
  };

  const handleTestSound = () => {
    play({ type: "system", force: true });
  };

  return (
    <div className={className} {...props}>
      <div className="flex items-center gap-3">
        {showMuteToggle && (
          <button
            type="button"
            onClick={toggleSound}
            className="rounded p-1 hover:bg-accent"
            aria-label={isSoundEnabled ? "Mute" : "Unmute"}
          >
            {isSoundEnabled ? (
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                />
              </svg>
            ) : (
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                />
              </svg>
            )}
          </button>
        )}

        <input
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={handleVolumeChange}
          disabled={!isSoundEnabled}
          className="flex-1"
          aria-label="Volume"
        />

        {showValue && (
          <span className="w-10 text-right text-sm text-muted-foreground">
            {volume}%
          </span>
        )}

        <button
          type="button"
          onClick={handleTestSound}
          className="text-xs text-primary hover:underline"
        >
          Test
        </button>
      </div>
    </div>
  );
}

useNotificationSound.displayName = "useNotificationSound";
NotificationSoundPlayer.displayName = "NotificationSoundPlayer";
SoundVolumeControl.displayName = "SoundVolumeControl";

export default useNotificationSound;
