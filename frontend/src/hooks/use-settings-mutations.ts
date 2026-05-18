"use client";

/**
 * Settings Mutations Hook
 *
 * React hook for updating user settings with proper error handling,
 * optimistic updates, and loading states.
 */

import { useMutation } from "@apollo/client";
import { useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { logger } from "@/lib/logger";
import { useToast } from "@/hooks/use-toast";
import {
  UPDATE_PROFILE,
  UPLOAD_AVATAR,
  REMOVE_AVATAR,
  UPDATE_EMAIL,
  UPDATE_NOTIFICATION_PREFERENCES,
  UPDATE_PRIVACY_SETTINGS,
  UPDATE_THEME_PREFERENCES,
  UPDATE_ACCESSIBILITY_SETTINGS,
  ENABLE_2FA,
  DISABLE_2FA,
  DELETE_ACCOUNT,
  CONNECT_OAUTH_PROVIDER,
  DISCONNECT_OAUTH_PROVIDER,
  CLEAR_LOCATION_HISTORY,
  type UpdateProfileInput,
  type NotificationPreferences,
  type PrivacySettings,
  type ThemePreferences,
  type AccessibilitySettings,
} from "@/graphql/mutations/settings";

export function useSettingsMutations() {
  const { user } = useAuth();
  const { toast } = useToast();

  // ============================================================================
  // Profile Mutations
  // ============================================================================

  const [updateProfileMutation, { loading: updatingProfile }] =
    useMutation(UPDATE_PROFILE);

  const updateProfile = useCallback(
    async (input: UpdateProfileInput) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        logger.info("Updating user profile", {
          userId: user.id,
          fields: Object.keys(input),
        });

        const { data } = await updateProfileMutation({
          variables: { userId: user.id, input },
        });

        logger.info("Profile updated successfully", { userId: user.id });
        toast({
          title: "Profile updated",
          description: "Your profile has been updated successfully.",
        });

        return data.update_nchat_users_by_pk;
      } catch (error) {
        logger.error("Failed to update profile", error as Error, {
          userId: user.id,
        });
        toast({
          title: "Update failed",
          description: "Failed to update your profile. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, updateProfileMutation, toast],
  );

  // ============================================================================
  // Avatar Mutations
  // ============================================================================

  const [uploadAvatarMutation, { loading: uploadingAvatar }] =
    useMutation(UPLOAD_AVATAR);
  const [removeAvatarMutation, { loading: removingAvatar }] =
    useMutation(REMOVE_AVATAR);

  const uploadAvatar = useCallback(
    async (file: File) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        logger.info("Uploading avatar", {
          userId: user.id,
          fileSize: file.size,
        });

        const avatarUrl = URL.createObjectURL(file); // Temporary

        const { data } = await uploadAvatarMutation({
          variables: { userId: user.id, avatarUrl },
        });

        logger.info("Avatar uploaded successfully", { userId: user.id });
        toast({
          title: "Avatar updated",
          description: "Your profile picture has been updated.",
        });

        return data.update_nchat_users_by_pk;
      } catch (error) {
        logger.error("Failed to upload avatar", error as Error, {
          userId: user.id,
        });
        toast({
          title: "Upload failed",
          description: "Failed to upload your avatar. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, uploadAvatarMutation, toast],
  );

  const removeAvatar = useCallback(async () => {
    if (!user?.id) {
      throw new Error("User not authenticated");
    }

    try {
      logger.info("Removing avatar", { userId: user.id });

      const { data } = await removeAvatarMutation({
        variables: { userId: user.id },
      });

      logger.info("Avatar removed successfully", { userId: user.id });
      toast({
        title: "Avatar removed",
        description: "Your profile picture has been removed.",
      });

      return data.update_nchat_users_by_pk;
    } catch (error) {
      logger.error("Failed to remove avatar", error as Error, {
        userId: user.id,
      });
      toast({
        title: "Remove failed",
        description: "Failed to remove your avatar. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  }, [user?.id, removeAvatarMutation, toast]);

  // ============================================================================
  // Account Mutations
  // ============================================================================

  const [updateEmailMutation, { loading: updatingEmail }] =
    useMutation(UPDATE_EMAIL);
  const [enable2FAMutation, { loading: enabling2FA }] = useMutation(ENABLE_2FA);
  const [disable2FAMutation, { loading: disabling2FA }] =
    useMutation(DISABLE_2FA);
  const [deleteAccountMutation, { loading: deletingAccount }] =
    useMutation(DELETE_ACCOUNT);

  const updateEmail = useCallback(
    async (newEmail: string) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        logger.info("Updating email", { userId: user.id });

        const { data } = await updateEmailMutation({
          variables: { userId: user.id, newEmail },
        });

        logger.info("Email updated successfully", { userId: user.id });
        toast({
          title: "Email updated",
          description: "Please verify your new email address.",
        });

        return data.update_nchat_users_by_pk;
      } catch (error) {
        logger.error("Failed to update email", error as Error, {
          userId: user.id,
        });
        toast({
          title: "Update failed",
          description: "Failed to update your email. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, updateEmailMutation, toast],
  );

  const enable2FA = useCallback(async () => {
    if (!user?.id) {
      throw new Error("User not authenticated");
    }

    try {
      logger.info("Enabling 2FA", { userId: user.id });

      const { data } = await enable2FAMutation({
        variables: { userId: user.id },
      });

      logger.info("2FA enabled successfully", { userId: user.id });
      toast({
        title: "2FA enabled",
        description: "Two-factor authentication has been enabled.",
      });

      return data.update_nchat_users_by_pk;
    } catch (error) {
      logger.error("Failed to enable 2FA", error as Error, { userId: user.id });
      toast({
        title: "Enable failed",
        description: "Failed to enable 2FA. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  }, [user?.id, enable2FAMutation, toast]);

  const disable2FA = useCallback(async () => {
    if (!user?.id) {
      throw new Error("User not authenticated");
    }

    try {
      logger.info("Disabling 2FA", { userId: user.id });

      const { data } = await disable2FAMutation({
        variables: { userId: user.id },
      });

      logger.info("2FA disabled successfully", { userId: user.id });
      toast({
        title: "2FA disabled",
        description: "Two-factor authentication has been disabled.",
      });

      return data.update_nchat_users_by_pk;
    } catch (error) {
      logger.error("Failed to disable 2FA", error as Error, {
        userId: user.id,
      });
      toast({
        title: "Disable failed",
        description: "Failed to disable 2FA. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  }, [user?.id, disable2FAMutation, toast]);

  const deleteAccount = useCallback(async () => {
    if (!user?.id) {
      throw new Error("User not authenticated");
    }

    try {
      logger.warn("Deleting account", { userId: user.id });

      const { data } = await deleteAccountMutation({
        variables: { userId: user.id },
      });

      logger.warn("Account deleted", { userId: user.id });
      toast({
        title: "Account deleted",
        description: "Your account has been permanently deleted.",
      });

      return data.delete_nchat_users_by_pk;
    } catch (error) {
      logger.error("Failed to delete account", error as Error, {
        userId: user.id,
      });
      toast({
        title: "Delete failed",
        description: "Failed to delete your account. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  }, [user?.id, deleteAccountMutation, toast]);

  // ============================================================================
  // Notification Mutations
  // ============================================================================

  const [updateNotificationsMutation, { loading: updatingNotifications }] =
    useMutation(UPDATE_NOTIFICATION_PREFERENCES);

  const updateNotificationPreferences = useCallback(
    async (preferences: NotificationPreferences) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        logger.info("Updating notification preferences", { userId: user.id });

        const { data } = await updateNotificationsMutation({
          variables: { userId: user.id, preferences },
        });

        logger.info("Notification preferences updated", { userId: user.id });
        toast({
          title: "Preferences updated",
          description: "Your notification preferences have been saved.",
        });

        return data.update_nchat_users_by_pk;
      } catch (error) {
        logger.error("Failed to update notifications", error as Error, {
          userId: user.id,
        });
        toast({
          title: "Update failed",
          description: "Failed to update notification preferences.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, updateNotificationsMutation, toast],
  );

  // ============================================================================
  // Privacy Mutations
  // ============================================================================

  const [updatePrivacyMutation, { loading: updatingPrivacy }] = useMutation(
    UPDATE_PRIVACY_SETTINGS,
  );
  const [clearLocationMutation, { loading: clearingLocation }] = useMutation(
    CLEAR_LOCATION_HISTORY,
  );

  const updatePrivacySettings = useCallback(
    async (settings: PrivacySettings) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        logger.info("Updating privacy settings", { userId: user.id });

        const { data } = await updatePrivacyMutation({
          variables: { userId: user.id, settings },
        });

        logger.info("Privacy settings updated", { userId: user.id });
        toast({
          title: "Privacy updated",
          description: "Your privacy settings have been saved.",
        });

        return data.update_nchat_users_by_pk;
      } catch (error) {
        logger.error("Failed to update privacy", error as Error, {
          userId: user.id,
        });
        toast({
          title: "Update failed",
          description: "Failed to update privacy settings.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, updatePrivacyMutation, toast],
  );

  const clearLocationHistory = useCallback(async () => {
    if (!user?.id) {
      throw new Error("User not authenticated");
    }

    try {
      logger.info("Clearing location history", { userId: user.id });

      const { data } = await clearLocationMutation({
        variables: { userId: user.id },
      });

      logger.info("Location history cleared", {
        userId: user.id,
        count: data.affected_rows,
      });
      toast({
        title: "History cleared",
        description: "Your location history has been deleted.",
      });

      return data;
    } catch (error) {
      logger.error("Failed to clear location history", error as Error, {
        userId: user.id,
      });
      toast({
        title: "Clear failed",
        description: "Failed to clear location history.",
        variant: "destructive",
      });
      throw error;
    }
  }, [user?.id, clearLocationMutation, toast]);

  // ============================================================================
  // Theme & Accessibility Mutations
  // ============================================================================

  const [updateThemeMutation, { loading: updatingTheme }] = useMutation(
    UPDATE_THEME_PREFERENCES,
  );
  const [updateAccessibilityMutation, { loading: updatingAccessibility }] =
    useMutation(UPDATE_ACCESSIBILITY_SETTINGS);

  const updateThemePreferences = useCallback(
    async (theme: ThemePreferences) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        logger.info("Updating theme preferences", { userId: user.id });

        const { data } = await updateThemeMutation({
          variables: { userId: user.id, theme },
        });

        logger.info("Theme preferences updated", { userId: user.id });
        toast({
          title: "Theme updated",
          description: "Your theme preferences have been saved.",
        });

        return data.update_nchat_users_by_pk;
      } catch (error) {
        logger.error("Failed to update theme", error as Error, {
          userId: user.id,
        });
        toast({
          title: "Update failed",
          description: "Failed to update theme preferences.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, updateThemeMutation, toast],
  );

  const updateAccessibilitySettings = useCallback(
    async (settings: AccessibilitySettings) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        logger.info("Updating accessibility settings", { userId: user.id });

        const { data } = await updateAccessibilityMutation({
          variables: { userId: user.id, settings },
        });

        logger.info("Accessibility settings updated", { userId: user.id });
        toast({
          title: "Accessibility updated",
          description: "Your accessibility settings have been saved.",
        });

        return data.update_nchat_users_by_pk;
      } catch (error) {
        logger.error("Failed to update accessibility", error as Error, {
          userId: user.id,
        });
        toast({
          title: "Update failed",
          description: "Failed to update accessibility settings.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, updateAccessibilityMutation, toast],
  );

  // ============================================================================
  // OAuth Mutations
  // ============================================================================

  const [connectOAuthMutation, { loading: connectingOAuth }] = useMutation(
    CONNECT_OAUTH_PROVIDER,
  );
  const [disconnectOAuthMutation, { loading: disconnectingOAuth }] =
    useMutation(DISCONNECT_OAUTH_PROVIDER);

  const connectOAuthProvider = useCallback(
    async (provider: string, providerId: string, accessToken: string) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        logger.info("Connecting OAuth provider", { userId: user.id, provider });

        const { data } = await connectOAuthMutation({
          variables: { userId: user.id, provider, providerId, accessToken },
        });

        logger.info("OAuth provider connected", { userId: user.id, provider });
        toast({
          title: "Account connected",
          description: `Your ${provider} account has been connected.`,
        });

        return data.insert_nchat_oauth_connections_one;
      } catch (error) {
        logger.error("Failed to connect OAuth", error as Error, {
          userId: user.id,
          provider,
        });
        toast({
          title: "Connection failed",
          description: `Failed to connect ${provider} account.`,
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, connectOAuthMutation, toast],
  );

  const disconnectOAuthProvider = useCallback(
    async (provider: string) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        logger.info("Disconnecting OAuth provider", {
          userId: user.id,
          provider,
        });

        const { data } = await disconnectOAuthMutation({
          variables: { userId: user.id, provider },
        });

        logger.info("OAuth provider disconnected", {
          userId: user.id,
          provider,
        });
        toast({
          title: "Account disconnected",
          description: `Your ${provider} account has been disconnected.`,
        });

        return data;
      } catch (error) {
        logger.error("Failed to disconnect OAuth", error as Error, {
          userId: user.id,
          provider,
        });
        toast({
          title: "Disconnection failed",
          description: `Failed to disconnect ${provider} account.`,
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, disconnectOAuthMutation, toast],
  );

  // ============================================================================
  // Return API
  // ============================================================================

  return {
    // Profile
    updateProfile,
    uploadAvatar,
    removeAvatar,
    updatingProfile,
    uploadingAvatar,
    removingAvatar,

    // Account
    updateEmail,
    enable2FA,
    disable2FA,
    deleteAccount,
    updatingEmail,
    enabling2FA,
    disabling2FA,
    deletingAccount,

    // Notifications
    updateNotificationPreferences,
    updatingNotifications,

    // Privacy
    updatePrivacySettings,
    clearLocationHistory,
    updatingPrivacy,
    clearingLocation,

    // Theme & Accessibility
    updateThemePreferences,
    updateAccessibilitySettings,
    updatingTheme,
    updatingAccessibility,

    // OAuth
    connectOAuthProvider,
    disconnectOAuthProvider,
    connectingOAuth,
    disconnectingOAuth,
  };
}
