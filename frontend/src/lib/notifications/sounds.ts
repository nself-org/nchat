/**
 * Enhanced Notification Sounds - Advanced sound management
 *
 * Extends the basic sound system with:
 * - Custom sound upload and storage
 * - Sound profiles
 * - Per-notification-type sounds
 * - Volume normalization
 * - Sound pack management
 */

import {
  NOTIFICATION_SOUNDS,
  playNotificationSound,
  getSoundById,
  addCustomSound,
  removeCustomSound,
  getCustomSounds,
  normalizeVolume,
  volumeToAudioLevel,
} from "./notification-sounds";
import type {
  NotificationType,
  NotificationPreferences,
  NotificationSound,
} from "./notification-types";

// ============================================================================
// Types
// ============================================================================

export interface SoundProfile {
  id: string;
  name: string;
  description?: string;
  sounds: Record<NotificationType, string>;
  volume: number;
  createdAt: string;
  isDefault?: boolean;
}

export interface CustomSoundUpload {
  name: string;
  file: File;
  duration?: number;
}

export interface SoundPack {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  sounds: NotificationSound[];
  previewUrl?: string;
}

export interface SoundPlayOptions {
  volume?: number;
  loop?: boolean;
  fadeIn?: number;
  fadeOut?: number;
}

// ============================================================================
// Sound Profiles
// ============================================================================

const PROFILES_STORAGE_KEY = "nchat-sound-profiles";
const ACTIVE_PROFILE_KEY = "nchat-active-sound-profile";

let soundProfiles: SoundProfile[] = [];
let activeProfileId: string | null = null;

/**
 * Default sound profile
 */
const DEFAULT_PROFILE: SoundProfile = {
  id: "default",
  name: "Default",
  description: "Standard notification sounds",
  sounds: {
    mention: "mention",
    direct_message: "dm",
    thread_reply: "thread",
    reaction: "reaction",
    channel_invite: "ding",
    channel_update: "subtle",
    system: "system",
    announcement: "alert",
    keyword: "mention",
  },
  volume: 80,
  createdAt: new Date().toISOString(),
  isDefault: true,
};

/**
 * Load sound profiles from storage
 */
export function loadSoundProfiles(): SoundProfile[] {
  if (typeof window === "undefined") {
    return [DEFAULT_PROFILE];
  }

  try {
    const stored = localStorage.getItem(PROFILES_STORAGE_KEY);
    if (stored) {
      soundProfiles = JSON.parse(stored);
    } else {
      soundProfiles = [DEFAULT_PROFILE];
    }

    const storedActive = localStorage.getItem(ACTIVE_PROFILE_KEY);
    if (storedActive) {
      activeProfileId = storedActive;
    } else {
      activeProfileId = "default";
    }
  } catch {
    soundProfiles = [DEFAULT_PROFILE];
    activeProfileId = "default";
  }

  return soundProfiles;
}

/**
 * Save sound profiles to storage
 */
function saveSoundProfiles(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(soundProfiles));
    if (activeProfileId) {
      localStorage.setItem(ACTIVE_PROFILE_KEY, activeProfileId);
    }
  } catch {
    // Storage full or unavailable
  }
}

/**
 * Get all sound profiles
 */
export function getSoundProfiles(): SoundProfile[] {
  return [...soundProfiles];
}

/**
 * Get active sound profile
 */
export function getActiveProfile(): SoundProfile {
  const profile = soundProfiles.find((p) => p.id === activeProfileId);
  return profile || DEFAULT_PROFILE;
}

/**
 * Set active sound profile
 */
export function setActiveProfile(profileId: string): boolean {
  const profile = soundProfiles.find((p) => p.id === profileId);

  if (!profile) {
    return false;
  }

  activeProfileId = profileId;
  saveSoundProfiles();
  return true;
}

/**
 * Create sound profile
 */
export function createSoundProfile(
  name: string,
  sounds?: Partial<Record<NotificationType, string>>,
  options?: {
    description?: string;
    volume?: number;
  },
): SoundProfile {
  const profile: SoundProfile = {
    id: `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    description: options?.description,
    sounds: {
      ...DEFAULT_PROFILE.sounds,
      ...sounds,
    },
    volume: options?.volume ?? 80,
    createdAt: new Date().toISOString(),
  };

  soundProfiles.push(profile);
  saveSoundProfiles();

  return profile;
}

/**
 * Update sound profile
 */
export function updateSoundProfile(
  profileId: string,
  updates: Partial<Omit<SoundProfile, "id" | "createdAt" | "isDefault">>,
): SoundProfile | null {
  const profile = soundProfiles.find((p) => p.id === profileId);

  if (!profile || profile.isDefault) {
    return null;
  }

  Object.assign(profile, updates);
  saveSoundProfiles();

  return profile;
}

/**
 * Delete sound profile
 */
export function deleteSoundProfile(profileId: string): boolean {
  const profile = soundProfiles.find((p) => p.id === profileId);

  if (!profile || profile.isDefault) {
    return false;
  }

  soundProfiles = soundProfiles.filter((p) => p.id !== profileId);

  // Reset to default if deleted profile was active
  if (activeProfileId === profileId) {
    activeProfileId = "default";
  }

  saveSoundProfiles();
  return true;
}

/**
 * Duplicate sound profile
 */
export function duplicateSoundProfile(
  profileId: string,
  newName: string,
): SoundProfile | null {
  const profile = soundProfiles.find((p) => p.id === profileId);

  if (!profile) {
    return null;
  }

  return createSoundProfile(newName, profile.sounds, {
    description: `Copy of ${profile.name}`,
    volume: profile.volume,
  });
}

// ============================================================================
// Custom Sound Management
// ============================================================================

const CUSTOM_SOUNDS_STORAGE_KEY = "nchat-custom-sounds";

interface StoredCustomSound {
  id: string;
  name: string;
  dataUrl: string;
  duration: number;
  createdAt: string;
}

let customSoundData: StoredCustomSound[] = [];

/**
 * Load custom sounds from storage
 */
export function loadCustomSounds(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const stored = localStorage.getItem(CUSTOM_SOUNDS_STORAGE_KEY);
    if (stored) {
      customSoundData = JSON.parse(stored);

      // Re-register custom sounds
      customSoundData.forEach((sound) => {
        addCustomSound(sound.id, sound.name, sound.dataUrl, sound.duration);
      });
    }
  } catch {
    customSoundData = [];
  }
}

/**
 * Upload custom sound
 */
export async function uploadCustomSound(
  upload: CustomSoundUpload,
): Promise<NotificationSound | null> {
  if (typeof window === "undefined") {
    return null;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;

      if (!dataUrl) {
        resolve(null);
        return;
      }

      // Get audio duration
      const audio = new Audio(dataUrl);
      audio.onloadedmetadata = () => {
        const duration = Math.round(audio.duration * 1000);
        const id = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Store the sound data
        const storedSound: StoredCustomSound = {
          id,
          name: upload.name,
          dataUrl,
          duration,
          createdAt: new Date().toISOString(),
        };

        customSoundData.push(storedSound);
        saveCustomSounds();

        // Register with sound system
        const sound = addCustomSound(id, upload.name, dataUrl, duration);
        resolve(sound);
      };

      audio.onerror = () => {
        resolve(null);
      };
    };

    reader.onerror = () => {
      resolve(null);
    };

    reader.readAsDataURL(upload.file);
  });
}

/**
 * Save custom sounds to storage
 */
function saveCustomSounds(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(
      CUSTOM_SOUNDS_STORAGE_KEY,
      JSON.stringify(customSoundData),
    );
  } catch {
    // Storage full - might need to remove oldest sounds
  }
}

/**
 * Delete custom sound
 */
export function deleteCustomSound(soundId: string): boolean {
  const index = customSoundData.findIndex((s) => s.id === soundId);

  if (index === -1) {
    return false;
  }

  customSoundData.splice(index, 1);
  saveCustomSounds();

  removeCustomSound(soundId);
  return true;
}

/**
 * Get all custom sounds
 */
export function getAllCustomSounds(): NotificationSound[] {
  return getCustomSounds();
}

// ============================================================================
// Sound Playback with Options
// ============================================================================

let currentPlayingAudio: HTMLAudioElement | null = null;

/**
 * Play sound with advanced options
 */
export async function playSoundWithOptions(
  soundId: string,
  options: SoundPlayOptions = {},
): Promise<void> {
  const { volume = 80, loop = false, fadeIn = 0, fadeOut = 0 } = options;

  const sound = getSoundById(soundId);
  if (!sound || soundId === "none") {
    return;
  }

  // Stop any currently playing sound
  if (currentPlayingAudio) {
    currentPlayingAudio.pause();
    currentPlayingAudio = null;
  }

  const audio = new Audio(sound.url);
  audio.volume = fadeIn > 0 ? 0 : volumeToAudioLevel(volume);
  audio.loop = loop;
  currentPlayingAudio = audio;

  // Fade in
  if (fadeIn > 0) {
    const targetVolume = volumeToAudioLevel(volume);
    const steps = fadeIn / 50;
    const volumeStep = targetVolume / steps;
    let currentVolume = 0;

    const fadeInInterval = setInterval(() => {
      currentVolume += volumeStep;
      if (currentVolume >= targetVolume) {
        audio.volume = targetVolume;
        clearInterval(fadeInInterval);
      } else {
        audio.volume = currentVolume;
      }
    }, 50);
  }

  // Set up fade out before end
  if (fadeOut > 0 && !loop) {
    audio.ontimeupdate = () => {
      const timeRemaining = (audio.duration - audio.currentTime) * 1000;
      if (timeRemaining <= fadeOut && timeRemaining > 0) {
        const fadeOutVolume =
          (timeRemaining / fadeOut) * volumeToAudioLevel(volume);
        audio.volume = Math.max(0, fadeOutVolume);
      }
    };
  }

  try {
    await audio.play();
  } catch {
    currentPlayingAudio = null;
  }
}

/**
 * Stop currently playing sound
 */
export function stopCurrentSound(): void {
  if (currentPlayingAudio) {
    currentPlayingAudio.pause();
    currentPlayingAudio.currentTime = 0;
    currentPlayingAudio = null;
  }
}

/**
 * Play sound for notification type using active profile
 */
export async function playSoundForNotificationType(
  type: NotificationType,
  options?: SoundPlayOptions,
): Promise<void> {
  const profile = getActiveProfile();
  const soundId = profile.sounds[type] || "default";
  const volume = options?.volume ?? profile.volume;

  await playSoundWithOptions(soundId, { ...options, volume });
}

// ============================================================================
// Sound Pack Management
// ============================================================================

const SOUND_PACKS_STORAGE_KEY = "nchat-sound-packs";
let installedPacks: SoundPack[] = [];

/**
 * Load installed sound packs
 */
export function loadSoundPacks(): SoundPack[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = localStorage.getItem(SOUND_PACKS_STORAGE_KEY);
    if (stored) {
      installedPacks = JSON.parse(stored);
    }
  } catch {
    installedPacks = [];
  }

  return installedPacks;
}

/**
 * Install sound pack
 */
export function installSoundPack(pack: SoundPack): boolean {
  if (installedPacks.some((p) => p.id === pack.id)) {
    return false;
  }

  installedPacks.push(pack);

  // Register all sounds in the pack
  pack.sounds.forEach((sound) => {
    addCustomSound(sound.id, sound.name, sound.url, sound.duration);
  });

  saveSoundPacks();
  return true;
}

/**
 * Uninstall sound pack
 */
export function uninstallSoundPack(packId: string): boolean {
  const pack = installedPacks.find((p) => p.id === packId);

  if (!pack) {
    return false;
  }

  // Remove all sounds in the pack
  pack.sounds.forEach((sound) => {
    removeCustomSound(sound.id);
  });

  installedPacks = installedPacks.filter((p) => p.id !== packId);
  saveSoundPacks();

  return true;
}

/**
 * Save sound packs to storage
 */
function saveSoundPacks(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(
      SOUND_PACKS_STORAGE_KEY,
      JSON.stringify(installedPacks),
    );
  } catch {
    // Storage full
  }
}

/**
 * Get installed sound packs
 */
export function getInstalledSoundPacks(): SoundPack[] {
  return [...installedPacks];
}

// ============================================================================
// Preset Sound Themes
// ============================================================================

export const SOUND_THEMES = {
  minimal: {
    name: "Minimal",
    sounds: {
      mention: "subtle",
      direct_message: "subtle",
      thread_reply: "subtle",
      reaction: "none",
      channel_invite: "subtle",
      channel_update: "none",
      system: "subtle",
      announcement: "subtle",
      keyword: "subtle",
    },
  },
  professional: {
    name: "Professional",
    sounds: {
      mention: "ding",
      direct_message: "pop",
      thread_reply: "knock",
      reaction: "none",
      channel_invite: "chime",
      channel_update: "subtle",
      system: "system",
      announcement: "bell",
      keyword: "ding",
    },
  },
  playful: {
    name: "Playful",
    sounds: {
      mention: "pop",
      direct_message: "whoosh",
      thread_reply: "pop",
      reaction: "pop",
      channel_invite: "chime",
      channel_update: "whoosh",
      system: "ding",
      announcement: "chime",
      keyword: "bell",
    },
  },
  silent: {
    name: "Silent",
    sounds: {
      mention: "none",
      direct_message: "none",
      thread_reply: "none",
      reaction: "none",
      channel_invite: "none",
      channel_update: "none",
      system: "none",
      announcement: "none",
      keyword: "none",
    },
  },
} as const;

export type SoundTheme = keyof typeof SOUND_THEMES;

/**
 * Apply sound theme to a profile
 */
export function applySoundTheme(
  profileId: string,
  theme: SoundTheme,
): SoundProfile | null {
  const themeData = SOUND_THEMES[theme];
  return updateSoundProfile(profileId, {
    sounds: themeData.sounds as Record<NotificationType, string>,
  });
}

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize sound system
 */
export function initializeSoundSystem(): void {
  loadSoundProfiles();
  loadCustomSounds();
  loadSoundPacks();
}
