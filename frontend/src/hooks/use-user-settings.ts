/**
 * User Settings Hook
 *
 * Custom hooks for managing user settings including profile, account,
 * notifications, and privacy settings.
 */

import { useMutation } from "@apollo/client";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { validateImageFile, compressImage } from "@/lib/image-utils";
import {
  UPDATE_USER_PROFILE,
  UPDATE_USER_AVATAR,
  REMOVE_USER_AVATAR,
  UPDATE_USER_EMAIL,
  UPDATE_USER_PASSWORD,
  CONNECT_OAUTH_ACCOUNT,
  DISCONNECT_OAUTH_ACCOUNT,
  ENABLE_TWO_FACTOR_AUTH,
  DISABLE_TWO_FACTOR_AUTH,
  DELETE_USER_ACCOUNT,
  UPDATE_NOTIFICATION_SETTINGS,
  UPDATE_PRIVACY_SETTINGS,
  CLEAR_LOCATION_HISTORY,
  type UpdateProfileInput,
  type NotificationSettings,
  type LocationPrivacySettings,
} from "@/graphql/mutations/user-settings";

// ============================================================================
// Profile Settings Hook
// ============================================================================

export function useProfileSettings() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [updateProfileMutation, { loading: updating }] =
    useMutation(UPDATE_USER_PROFILE);
  const [updateAvatarMutation, { loading: uploadingAvatar }] =
    useMutation(UPDATE_USER_AVATAR);
  const [removeAvatarMutation, { loading: removingAvatar }] =
    useMutation(REMOVE_USER_AVATAR);

  const updateProfile = async (input: UpdateProfileInput) => {
    if (!user?.id) {
      throw new Error("User not authenticated");
    }

    try {
      const { data } = await updateProfileMutation({
        variables: {
          userId: user.id,
          ...input,
        },
      });

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });

      return data.update_nchat_users_by_pk;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const uploadAvatar = async (file: File): Promise<string> => {
    if (!user?.id) {
      throw new Error("User not authenticated");
    }

    try {
      // Validate image
      const validation = validateImageFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Compress and resize image
      const compressedFile = await compressImage(file, {
        maxWidth: 512,
        maxHeight: 512,
        quality: 0.85,
        outputFormat: "jpeg",
      });

      // Upload file to storage
      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: compressedFile.name,
          contentType: compressedFile.type,
          size: compressedFile.size,
        }),
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to initialize upload");
      }

      const { data: uploadData } = await uploadResponse.json();

      // Upload file to presigned URL
      const uploadFileResponse = await fetch(uploadData.uploadUrl, {
        method: uploadData.method,
        headers: uploadData.headers || {},
        body: compressedFile,
      });

      if (!uploadFileResponse.ok) {
        throw new Error("Failed to upload file");
      }

      // Construct the public URL
      const avatarUrl = `${process.env.NEXT_PUBLIC_STORAGE_URL}/v1/files/${uploadData.bucket}/${uploadData.key}`;

      // Update user avatar in database
      await updateAvatarMutation({
        variables: {
          userId: user.id,
          avatarUrl,
        },
      });

      toast({
        title: "Avatar updated",
        description: "Your profile photo has been updated.",
      });

      return avatarUrl;
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to upload avatar. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const removeAvatar = async () => {
    if (!user?.id) {
      throw new Error("User not authenticated");
    }

    try {
      await removeAvatarMutation({
        variables: { userId: user.id },
      });

      toast({
        title: "Avatar removed",
        description: "Your profile photo has been removed.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove avatar. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    updateProfile,
    uploadAvatar,
    removeAvatar,
    updating,
    uploadingAvatar,
    removingAvatar,
  };
}

// ============================================================================
// Account Settings Hook
// ============================================================================

export function useAccountSettings() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  const [updateEmailMutation, { loading: updatingEmail }] =
    useMutation(UPDATE_USER_EMAIL);
  const [connectOAuthMutation, { loading: connecting }] = useMutation(
    CONNECT_OAUTH_ACCOUNT,
  );
  const [disconnectOAuthMutation, { loading: disconnecting }] = useMutation(
    DISCONNECT_OAUTH_ACCOUNT,
  );
  const [enableTwoFactorMutation, { loading: enabling2FA }] = useMutation(
    ENABLE_TWO_FACTOR_AUTH,
  );
  const [disableTwoFactorMutation, { loading: disabling2FA }] = useMutation(
    DISABLE_TWO_FACTOR_AUTH,
  );
  const [deleteAccountMutation, { loading: deleting }] =
    useMutation(DELETE_USER_ACCOUNT);

  const updateEmail = async (newEmail: string, password: string) => {
    if (!user?.id) {
      throw new Error("User not authenticated");
    }

    try {
      // First verify the password via API
      const verifyResponse = await fetch("/api/auth/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!verifyResponse.ok) {
        throw new Error("Invalid password");
      }

      // Update email
      await updateEmailMutation({
        variables: {
          userId: user.id,
          email: newEmail,
        },
      });

      toast({
        title: "Email updated",
        description: "Please check your new email for a verification link.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to update email",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updatePassword = async (
    currentPassword: string,
    newPassword: string,
  ) => {
    if (!user?.id) {
      throw new Error("User not authenticated");
    }

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          currentPassword,
          newPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update password");
      }

      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to update password",
        variant: "destructive",
      });
      throw error;
    }
  };

  const connectOAuth = async (provider: string) => {
    // Initiate OAuth flow via API
    try {
      const response = await fetch(
        `/api/auth/oauth/connect?provider=${provider}`,
        {
          method: "GET",
        },
      );

      const { data } = await response.json();

      if (data.authUrl) {
        // Redirect to OAuth provider
        window.location.href = data.authUrl;
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to connect ${provider}. Please try again.`,
        variant: "destructive",
      });
      throw error;
    }
  };

  const disconnectOAuth = async (accountId: string) => {
    if (!user?.id) {
      throw new Error("User not authenticated");
    }

    try {
      await disconnectOAuthMutation({
        variables: {
          userId: user.id,
          accountId,
        },
      });

      toast({
        title: "Account disconnected",
        description: "The account has been disconnected successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to disconnect account. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const enableTwoFactor = async () => {
    if (!user?.id) {
      throw new Error("User not authenticated");
    }

    try {
      // Generate 2FA secret via API
      const response = await fetch("/api/auth/2fa/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });

      const { data } = await response.json();

      // Return setup data (QR code, secret, backup codes)
      return data;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to enable 2FA. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const confirmTwoFactor = async (
    code: string,
    secret: string,
    backupCodes: string[],
  ) => {
    if (!user?.id) {
      throw new Error("User not authenticated");
    }

    try {
      // Verify the code
      const verifyResponse = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, secret }),
      });

      if (!verifyResponse.ok) {
        throw new Error("Invalid verification code");
      }

      // Enable 2FA in database
      await enableTwoFactorMutation({
        variables: {
          userId: user.id,
          secret,
          backupCodes,
        },
      });

      toast({
        title: "2FA enabled",
        description: "Two-factor authentication has been enabled.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to enable 2FA",
        variant: "destructive",
      });
      throw error;
    }
  };

  const disableTwoFactor = async () => {
    if (!user?.id) {
      throw new Error("User not authenticated");
    }

    try {
      await disableTwoFactorMutation({
        variables: { userId: user.id },
      });

      toast({
        title: "2FA disabled",
        description: "Two-factor authentication has been disabled.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to disable 2FA. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteAccount = async () => {
    if (!user?.id) {
      throw new Error("User not authenticated");
    }

    try {
      await deleteAccountMutation({
        variables: { userId: user.id },
      });

      toast({
        title: "Account deleted",
        description: "Your account has been permanently deleted.",
      });

      // Sign out after deletion
      await signOut();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete account. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    updateEmail,
    updatePassword,
    connectOAuth,
    disconnectOAuth,
    enableTwoFactor,
    confirmTwoFactor,
    disableTwoFactor,
    deleteAccount,
    updatingEmail,
    connecting,
    disconnecting,
    enabling2FA,
    disabling2FA,
    deleting,
  };
}

// ============================================================================
// Notification Settings Hook
// ============================================================================

export function useNotificationSettings() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [updateSettingsMutation, { loading: updating }] = useMutation(
    UPDATE_NOTIFICATION_SETTINGS,
  );

  const updateSettings = async (settings: NotificationSettings) => {
    if (!user?.id) {
      throw new Error("User not authenticated");
    }

    try {
      await updateSettingsMutation({
        variables: {
          userId: user.id,
          settings,
        },
      });

      toast({
        title: "Settings saved",
        description: "Your notification preferences have been updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save notification settings. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    updateSettings,
    updating,
  };
}

// ============================================================================
// Privacy Settings Hook
// ============================================================================

export function usePrivacySettings() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [updateSettingsMutation, { loading: updating }] = useMutation(
    UPDATE_PRIVACY_SETTINGS,
  );
  const [clearLocationMutation, { loading: clearingLocation }] = useMutation(
    CLEAR_LOCATION_HISTORY,
  );

  const updateSettings = async (settings: LocationPrivacySettings) => {
    if (!user?.id) {
      throw new Error("User not authenticated");
    }

    try {
      await updateSettingsMutation({
        variables: {
          userId: user.id,
          settings,
        },
      });

      toast({
        title: "Settings saved",
        description: "Your privacy settings have been updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save privacy settings. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const clearLocationHistory = async () => {
    if (!user?.id) {
      throw new Error("User not authenticated");
    }

    try {
      await clearLocationMutation({
        variables: { userId: user.id },
      });

      toast({
        title: "Location history cleared",
        description: "All location data has been permanently deleted.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear location history. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    updateSettings,
    clearLocationHistory,
    updating,
    clearingLocation,
  };
}
