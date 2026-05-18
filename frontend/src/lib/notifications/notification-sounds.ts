/**
 * Notification Sounds - Sound management for notifications
 *
 * Provides:
 * - Predefined sound library
 * - Sound playback
 * - Volume control
 * - Preloading
 */

import type { NotificationSound, NotificationType } from "./notification-types";

import { logger } from "@/lib/logger";

// ============================================================================
// Sound Library
// ============================================================================

/**
 * Predefined notification sounds
 */
export const NOTIFICATION_SOUNDS: NotificationSound[] = [
  // Default sounds
  {
    id: "default",
    name: "Default",
    url: "/sounds/notification.mp3",
    category: "default",
    duration: 1000,
  },
  {
    id: "mention",
    name: "Mention",
    url: "/sounds/mention.mp3",
    category: "default",
    duration: 800,
  },
  {
    id: "dm",
    name: "Direct Message",
    url: "/sounds/dm.mp3",
    category: "default",
    duration: 1000,
  },
  {
    id: "thread",
    name: "Thread Reply",
    url: "/sounds/thread.mp3",
    category: "default",
    duration: 700,
  },
  {
    id: "reaction",
    name: "Reaction",
    url: "/sounds/reaction.mp3",
    category: "default",
    duration: 500,
  },

  // System sounds
  {
    id: "system",
    name: "System",
    url: "/sounds/system.mp3",
    category: "system",
    duration: 600,
  },
  {
    id: "alert",
    name: "Alert",
    url: "/sounds/alert.mp3",
    category: "system",
    duration: 1200,
  },
  {
    id: "success",
    name: "Success",
    url: "/sounds/success.mp3",
    category: "system",
    duration: 800,
  },
  {
    id: "error",
    name: "Error",
    url: "/sounds/error.mp3",
    category: "system",
    duration: 900,
  },

  // Additional sounds
  {
    id: "pop",
    name: "Pop",
    url: "/sounds/pop.mp3",
    category: "default",
    duration: 300,
  },
  {
    id: "ding",
    name: "Ding",
    url: "/sounds/ding.mp3",
    category: "default",
    duration: 500,
  },
  {
    id: "chime",
    name: "Chime",
    url: "/sounds/chime.mp3",
    category: "default",
    duration: 1000,
  },
  {
    id: "bell",
    name: "Bell",
    url: "/sounds/bell.mp3",
    category: "default",
    duration: 800,
  },
  {
    id: "knock",
    name: "Knock",
    url: "/sounds/knock.mp3",
    category: "default",
    duration: 600,
  },
  {
    id: "whoosh",
    name: "Whoosh",
    url: "/sounds/whoosh.mp3",
    category: "default",
    duration: 400,
  },
  {
    id: "subtle",
    name: "Subtle",
    url: "/sounds/subtle.mp3",
    category: "default",
    duration: 500,
  },
  {
    id: "none",
    name: "None (Silent)",
    url: "",
    category: "system",
    duration: 0,
  },
];

/**
 * Default sounds for notification types
 */
export const DEFAULT_SOUNDS_BY_TYPE: Record<NotificationType, string> = {
  mention: "mention",
  direct_message: "dm",
  thread_reply: "thread",
  reaction: "reaction",
  channel_invite: "ding",
  channel_update: "subtle",
  system: "system",
  announcement: "alert",
  keyword: "mention",
};

/**
 * Fallback sound (base64 encoded beep)
 */
const FALLBACK_SOUND =
  "data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU" +
  "tvT38AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

// ============================================================================
// Audio Cache
// ============================================================================

const audioCache = new Map<string, HTMLAudioElement>();
let preloaded = false;

/**
 * Get or create audio element for a sound
 */
function getAudioElement(soundId: string): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;

  // Check cache
  if (audioCache.has(soundId)) {
    return audioCache.get(soundId)!;
  }

  // Find sound
  const sound = NOTIFICATION_SOUNDS.find((s) => s.id === soundId);
  const url = sound?.url || FALLBACK_SOUND;

  if (!url || soundId === "none") return null;

  // Create and cache audio element
  const audio = new Audio(url);
  audio.preload = "auto";
  audioCache.set(soundId, audio);

  return audio;
}

// ============================================================================
// Playback Functions
// ============================================================================

/**
 * Play a notification sound
 */
export async function playNotificationSound(
  soundId: string,
  volume: number = 80,
): Promise<void> {
  if (soundId === "none") return;

  const audio = getAudioElement(soundId);
  if (!audio) return;

  try {
    audio.volume = Math.max(0, Math.min(1, volume / 100));
    audio.currentTime = 0;
    await audio.play();
  } catch (error) {
    // Try fallback sound
    try {
      const fallbackAudio = new Audio(FALLBACK_SOUND);
      fallbackAudio.volume = Math.max(0, Math.min(1, volume / 100));
      await fallbackAudio.play();
    } catch {
      logger.warn("Failed to play notification sound:", { context: error });
    }
  }
}

/**
 * Play sound by notification type
 */
export async function playSoundForType(
  type: NotificationType,
  volume: number = 80,
  customSound?: string,
): Promise<void> {
  const soundId = customSound || DEFAULT_SOUNDS_BY_TYPE[type] || "default";
  await playNotificationSound(soundId, volume);
}

/**
 * Stop all playing sounds
 */
export function stopAllSounds(): void {
  audioCache.forEach((audio) => {
    audio.pause();
    audio.currentTime = 0;
  });
}

/**
 * Stop a specific sound
 */
export function stopSound(soundId: string): void {
  const audio = audioCache.get(soundId);
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
  }
}

// ============================================================================
// Preloading
// ============================================================================

/**
 * Preload all notification sounds
 */
export function preloadSounds(): void {
  if (preloaded || typeof window === "undefined") return;

  NOTIFICATION_SOUNDS.forEach((sound) => {
    if (sound.url && sound.id !== "none") {
      getAudioElement(sound.id);
    }
  });

  preloaded = true;
}

/**
 * Preload specific sounds
 */
export function preloadSpecificSounds(soundIds: string[]): void {
  if (typeof window === "undefined") return;

  soundIds.forEach((id) => {
    getAudioElement(id);
  });
}

/**
 * Check if sounds are preloaded
 */
export function areSoundsPreloaded(): boolean {
  return preloaded;
}

/**
 * Clear audio cache
 */
export function clearAudioCache(): void {
  stopAllSounds();
  audioCache.clear();
  preloaded = false;
}

// ============================================================================
// Sound Info Functions
// ============================================================================

/**
 * Get sound by ID
 */
export function getSoundById(soundId: string): NotificationSound | undefined {
  return NOTIFICATION_SOUNDS.find((s) => s.id === soundId);
}

/**
 * Get sounds by category
 */
export function getSoundsByCategory(
  category: NotificationSound["category"],
): NotificationSound[] {
  return NOTIFICATION_SOUNDS.filter((s) => s.category === category);
}

/**
 * Get all available sounds
 */
export function getAvailableSounds(): NotificationSound[] {
  return NOTIFICATION_SOUNDS;
}

/**
 * Get sound name by ID
 */
export function getSoundName(soundId: string): string {
  return getSoundById(soundId)?.name || soundId;
}

// ============================================================================
// Custom Sound Management
// ============================================================================

/**
 * Add a custom sound
 */
export function addCustomSound(
  id: string,
  name: string,
  url: string,
  duration: number = 1000,
): NotificationSound {
  const customSound: NotificationSound = {
    id: `custom_${id}`,
    name,
    url,
    category: "custom",
    duration,
  };

  // Add to the sounds array (in memory only)
  NOTIFICATION_SOUNDS.push(customSound);

  // Preload the new sound
  getAudioElement(customSound.id);

  return customSound;
}

/**
 * Remove a custom sound
 */
export function removeCustomSound(soundId: string): boolean {
  const index = NOTIFICATION_SOUNDS.findIndex(
    (s) => s.id === soundId && s.category === "custom",
  );

  if (index === -1) return false;

  NOTIFICATION_SOUNDS.splice(index, 1);
  audioCache.delete(soundId);

  return true;
}

/**
 * Get custom sounds
 */
export function getCustomSounds(): NotificationSound[] {
  return getSoundsByCategory("custom");
}

// ============================================================================
// Volume Utilities
// ============================================================================

/**
 * Normalize volume to 0-100 range
 */
export function normalizeVolume(volume: number): number {
  return Math.max(0, Math.min(100, Math.round(volume)));
}

/**
 * Convert volume to audio level (0-1)
 */
export function volumeToAudioLevel(volume: number): number {
  return normalizeVolume(volume) / 100;
}

/**
 * Get volume icon based on level
 */
export function getVolumeIcon(
  volume: number,
): "muted" | "low" | "medium" | "high" {
  if (volume === 0) return "muted";
  if (volume < 33) return "low";
  if (volume < 66) return "medium";
  return "high";
}

// ============================================================================
// Test Sound
// ============================================================================

/**
 * Play a test sound at specified volume
 */
export async function playTestSound(
  soundId: string = "default",
  volume: number = 80,
): Promise<void> {
  await playNotificationSound(soundId, volume);
}

/**
 * Play a test beep (always works, for permission testing)
 */
export async function playTestBeep(volume: number = 80): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    const audio = new Audio(FALLBACK_SOUND);
    audio.volume = volumeToAudioLevel(volume);
    await audio.play();
  } catch (error) {
    logger.warn("Failed to play test beep:", { context: error });
  }
}
