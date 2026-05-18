/**
 * useProfile Hook
 *
 * Comprehensive hook for user profile management including:
 * - Profile CRUD operations
 * - Photo upload/delete
 * - Username management with validation
 * - Privacy settings
 * - Profile discovery (search, QR code)
 *
 * Provides full parity with Telegram/WhatsApp/Signal/Slack/Discord profile features.
 *
 * @module hooks/use-profile
 * @version 1.0.0
 */

import * as React from "react";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import {
  type UserProfileFull,
  type UpdateProfileInput,
  type ProfilePhoto,
  type ProfilePrivacySettings,
  type UsernameValidation,
  type ProfileQRCode,
  type ProfileSearchResult,
  type PhotoUploadOptions,
  DEFAULT_PRIVACY_SETTINGS,
} from "@/types/profile";
import {
  validateUsername,
  validateDisplayName,
  validateBio,
  validateProfileInput,
} from "@/services/profile";

// ============================================================================
// Types
// ============================================================================

export interface UseProfileOptions {
  /** User ID to fetch profile for (defaults to current user) */
  userId?: string;
  /** Auto-fetch profile on mount */
  autoFetch?: boolean;
}

export interface UseProfileReturn {
  // Data
  profile: UserProfileFull | null;
  privacySettings: ProfilePrivacySettings;
  isCurrentUser: boolean;

  // Loading states
  isLoading: boolean;
  isUpdating: boolean;
  isUploadingPhoto: boolean;
  isChangingUsername: boolean;

  // Errors
  error: Error | null;

  // Profile operations
  fetchProfile: () => Promise<void>;
  updateProfile: (input: UpdateProfileInput) => Promise<boolean>;

  // Photo operations
  uploadPhoto: (options: PhotoUploadOptions) => Promise<ProfilePhoto | null>;
  deletePhoto: () => Promise<boolean>;

  // Username operations
  checkUsername: (username: string) => Promise<UsernameValidation>;
  changeUsername: (newUsername: string) => Promise<boolean>;

  // Privacy operations
  updatePrivacy: (
    settings: Partial<ProfilePrivacySettings>,
  ) => Promise<boolean>;

  // Discovery
  searchUsers: (
    query: string,
    options?: { limit?: number; offset?: number },
  ) => Promise<ProfileSearchResult[]>;
  generateQRCode: (
    style?: "default" | "minimal" | "branded",
  ) => Promise<ProfileQRCode | null>;

  // Validation helpers
  validateUsername: typeof validateUsername;
  validateDisplayName: typeof validateDisplayName;
  validateBio: typeof validateBio;
}

// ============================================================================
// API Functions
// ============================================================================

async function fetchProfileApi(userId?: string): Promise<UserProfileFull> {
  const endpoint = userId
    ? `/api/users/${userId}/profile`
    : "/api/users/me/profile";
  const response = await fetch(endpoint);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to fetch profile");
  }

  return data.data.profile;
}

async function updateProfileApi(
  input: UpdateProfileInput,
): Promise<UserProfileFull> {
  const response = await fetch("/api/users/me/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to update profile");
  }

  return data.data.profile;
}

async function uploadPhotoApi(
  file: File,
  crop?: PhotoUploadOptions["crop"],
): Promise<ProfilePhoto> {
  const formData = new FormData();
  formData.append("file", file);
  if (crop) {
    formData.append("crop", JSON.stringify(crop));
  }

  const response = await fetch("/api/users/me/photo", {
    method: "POST",
    body: formData,
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to upload photo");
  }

  return data.data.photo;
}

async function deletePhotoApi(): Promise<void> {
  const response = await fetch("/api/users/me/photo", {
    method: "DELETE",
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to delete photo");
  }
}

async function checkUsernameApi(username: string): Promise<UsernameValidation> {
  const response = await fetch(
    `/api/users/me/username?check=${encodeURIComponent(username)}`,
  );
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to check username");
  }

  return data.data;
}

async function changeUsernameApi(username: string): Promise<void> {
  const response = await fetch("/api/users/me/username", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to change username");
  }
}

async function getPrivacyApi(): Promise<ProfilePrivacySettings> {
  const response = await fetch("/api/users/me/privacy");
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to fetch privacy settings");
  }

  return data.data.privacySettings;
}

async function updatePrivacyApi(
  settings: Partial<ProfilePrivacySettings>,
): Promise<ProfilePrivacySettings> {
  const response = await fetch("/api/users/me/privacy", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to update privacy settings");
  }

  return data.data.privacySettings;
}

async function searchUsersApi(
  query: string,
  options: { limit?: number; offset?: number } = {},
): Promise<ProfileSearchResult[]> {
  const params = new URLSearchParams({
    q: query,
    limit: String(options.limit || 20),
    offset: String(options.offset || 0),
  });

  const response = await fetch(`/api/users/search?${params}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to search users");
  }

  return data.data.results;
}

async function generateQRCodeApi(
  style: "default" | "minimal" | "branded" = "default",
): Promise<ProfileQRCode> {
  const response = await fetch(`/api/users/me/qrcode?style=${style}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to generate QR code");
  }

  return data.data.qrCode;
}

// ============================================================================
// Hook
// ============================================================================

export function useProfile(options: UseProfileOptions = {}): UseProfileReturn {
  const { userId, autoFetch = true } = options;
  const { user: authUser } = useAuth();
  const { toast } = useToast();

  // State
  const [profile, setProfile] = React.useState<UserProfileFull | null>(null);
  const [privacySettings, setPrivacySettings] =
    React.useState<ProfilePrivacySettings>(DEFAULT_PRIVACY_SETTINGS);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = React.useState(false);
  const [isChangingUsername, setIsChangingUsername] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  // Computed
  const isCurrentUser = !userId || userId === authUser?.id;

  // ============================================================================
  // Profile Operations
  // ============================================================================

  const fetchProfile = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const fetchedProfile = await fetchProfileApi(userId);
      setProfile(fetchedProfile);

      if (isCurrentUser && fetchedProfile.privacySettings) {
        setPrivacySettings(fetchedProfile.privacySettings);
      }
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Failed to fetch profile");
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, isCurrentUser]);

  const updateProfile = React.useCallback(
    async (input: UpdateProfileInput): Promise<boolean> => {
      if (!isCurrentUser) {
        toast({
          title: "Error",
          description: "Cannot update another user's profile",
          variant: "destructive",
        });
        return false;
      }

      // Validate input
      const validation = validateProfileInput(input);
      if (!validation.valid) {
        const firstError = Object.values(validation.errors)[0];
        toast({
          title: "Validation Error",
          description: firstError,
          variant: "destructive",
        });
        return false;
      }

      setIsUpdating(true);
      setError(null);

      try {
        const updatedProfile = await updateProfileApi(input);
        setProfile((prev) =>
          prev ? { ...prev, ...updatedProfile } : updatedProfile,
        );

        toast({
          title: "Profile Updated",
          description: "Your profile has been updated successfully.",
        });

        return true;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to update profile");
        setError(error);

        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });

        return false;
      } finally {
        setIsUpdating(false);
      }
    },
    [isCurrentUser, toast],
  );

  // ============================================================================
  // Photo Operations
  // ============================================================================

  const uploadPhoto = React.useCallback(
    async (options: PhotoUploadOptions): Promise<ProfilePhoto | null> => {
      if (!isCurrentUser) {
        toast({
          title: "Error",
          description: "Cannot update another user's photo",
          variant: "destructive",
        });
        return null;
      }

      setIsUploadingPhoto(true);
      setError(null);

      try {
        const photo = await uploadPhotoApi(options.file, options.crop);
        setProfile((prev) => (prev ? { ...prev, photo } : null));

        toast({
          title: "Photo Updated",
          description: "Your profile photo has been updated.",
        });

        return photo;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to upload photo");
        setError(error);

        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });

        return null;
      } finally {
        setIsUploadingPhoto(false);
      }
    },
    [isCurrentUser, toast],
  );

  const deletePhoto = React.useCallback(async (): Promise<boolean> => {
    if (!isCurrentUser) {
      toast({
        title: "Error",
        description: "Cannot delete another user's photo",
        variant: "destructive",
      });
      return false;
    }

    setIsUploadingPhoto(true);
    setError(null);

    try {
      await deletePhotoApi();
      setProfile((prev) => (prev ? { ...prev, photo: undefined } : null));

      toast({
        title: "Photo Deleted",
        description: "Your profile photo has been removed.",
      });

      return true;
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Failed to delete photo");
      setError(error);

      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });

      return false;
    } finally {
      setIsUploadingPhoto(false);
    }
  }, [isCurrentUser, toast]);

  // ============================================================================
  // Username Operations
  // ============================================================================

  const checkUsername = React.useCallback(
    async (username: string): Promise<UsernameValidation> => {
      try {
        return await checkUsernameApi(username);
      } catch (err) {
        return {
          valid: false,
          error:
            err instanceof Error ? err.message : "Failed to check username",
        };
      }
    },
    [],
  );

  const changeUsername = React.useCallback(
    async (newUsername: string): Promise<boolean> => {
      if (!isCurrentUser) {
        toast({
          title: "Error",
          description: "Cannot change another user's username",
          variant: "destructive",
        });
        return false;
      }

      // Validate first
      const validation = validateUsername(newUsername);
      if (!validation.valid) {
        toast({
          title: "Invalid Username",
          description: validation.error,
          variant: "destructive",
        });
        return false;
      }

      setIsChangingUsername(true);
      setError(null);

      try {
        await changeUsernameApi(newUsername);
        setProfile((prev) =>
          prev ? { ...prev, username: newUsername.toLowerCase() } : null,
        );

        toast({
          title: "Username Changed",
          description: `Your username is now @${newUsername.toLowerCase()}`,
        });

        return true;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to change username");
        setError(error);

        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });

        return false;
      } finally {
        setIsChangingUsername(false);
      }
    },
    [isCurrentUser, toast],
  );

  // ============================================================================
  // Privacy Operations
  // ============================================================================

  const updatePrivacy = React.useCallback(
    async (settings: Partial<ProfilePrivacySettings>): Promise<boolean> => {
      if (!isCurrentUser) {
        toast({
          title: "Error",
          description: "Cannot update another user's privacy settings",
          variant: "destructive",
        });
        return false;
      }

      setIsUpdating(true);
      setError(null);

      try {
        const updatedSettings = await updatePrivacyApi(settings);
        setPrivacySettings(updatedSettings);

        toast({
          title: "Privacy Updated",
          description: "Your privacy settings have been updated.",
        });

        return true;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to update privacy");
        setError(error);

        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });

        return false;
      } finally {
        setIsUpdating(false);
      }
    },
    [isCurrentUser, toast],
  );

  // ============================================================================
  // Discovery Operations
  // ============================================================================

  const searchUsers = React.useCallback(
    async (
      query: string,
      options: { limit?: number; offset?: number } = {},
    ): Promise<ProfileSearchResult[]> => {
      try {
        return await searchUsersApi(query, options);
      } catch (err) {
        toast({
          title: "Search Error",
          description:
            err instanceof Error ? err.message : "Failed to search users",
          variant: "destructive",
        });
        return [];
      }
    },
    [toast],
  );

  const generateQRCode = React.useCallback(
    async (
      style: "default" | "minimal" | "branded" = "default",
    ): Promise<ProfileQRCode | null> => {
      try {
        return await generateQRCodeApi(style);
      } catch (err) {
        toast({
          title: "Error",
          description:
            err instanceof Error ? err.message : "Failed to generate QR code",
          variant: "destructive",
        });
        return null;
      }
    },
    [toast],
  );

  // ============================================================================
  // Effects
  // ============================================================================

  // Auto-fetch profile on mount
  React.useEffect(() => {
    if (autoFetch && (authUser || userId)) {
      fetchProfile();
    }
  }, [autoFetch, authUser, userId, fetchProfile]);

  // Fetch privacy settings for current user
  React.useEffect(() => {
    if (isCurrentUser && authUser) {
      getPrivacyApi()
        .then(setPrivacySettings)
        .catch(() => {
          // Use defaults if fetch fails
        });
    }
  }, [isCurrentUser, authUser]);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // Data
    profile,
    privacySettings,
    isCurrentUser,

    // Loading states
    isLoading,
    isUpdating,
    isUploadingPhoto,
    isChangingUsername,

    // Errors
    error,

    // Profile operations
    fetchProfile,
    updateProfile,

    // Photo operations
    uploadPhoto,
    deletePhoto,

    // Username operations
    checkUsername,
    changeUsername,

    // Privacy operations
    updatePrivacy,

    // Discovery
    searchUsers,
    generateQRCode,

    // Validation helpers
    validateUsername,
    validateDisplayName,
    validateBio,
  };
}

export default useProfile;
