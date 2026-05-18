"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  type UserProfile,
  useUserStore,
  getInitials,
} from "@/stores/user-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Camera, Upload, X, Loader2 } from "lucide-react";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface EditProfileFormProps extends React.HTMLAttributes<HTMLFormElement> {
  user: UserProfile;
  onSave?: (data: ProfileFormData) => Promise<void>;
  onCancel?: () => void;
  showAvatarUpload?: boolean;
  showCoverUpload?: boolean;
}

export interface ProfileFormData {
  displayName: string;
  username: string;
  bio: string;
  location: string;
  website: string;
  pronouns: string;
  avatarUrl?: string;
  coverUrl?: string;
}

// ============================================================================
// Component
// ============================================================================

const EditProfileForm = React.forwardRef<HTMLFormElement, EditProfileFormProps>(
  (
    {
      className,
      user,
      onSave,
      onCancel,
      showAvatarUpload = true,
      showCoverUpload = true,
      ...props
    },
    ref,
  ) => {
    const updateCurrentUser = useUserStore((state) => state.updateCurrentUser);
    const setUpdatingProfile = useUserStore(
      (state) => state.setUpdatingProfile,
    );
    const isUpdating = useUserStore((state) => state.isUpdatingProfile);

    const [formData, setFormData] = React.useState<ProfileFormData>({
      displayName: user.displayName,
      username: user.username,
      bio: user.bio ?? "",
      location: user.location ?? "",
      website: user.website ?? "",
      pronouns: user.pronouns ?? "",
      avatarUrl: user.avatarUrl,
      coverUrl: user.coverUrl,
    });

    const [errors, setErrors] = React.useState<
      Partial<Record<keyof ProfileFormData, string>>
    >({});
    const [avatarPreview, setAvatarPreview] = React.useState<string | null>(
      null,
    );
    const [coverPreview, setCoverPreview] = React.useState<string | null>(null);

    const avatarInputRef = React.useRef<HTMLInputElement>(null);
    const coverInputRef = React.useRef<HTMLInputElement>(null);

    const handleChange = (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
      // Clear error when user starts typing
      if (errors[name as keyof ProfileFormData]) {
        setErrors((prev) => ({ ...prev, [name]: undefined }));
      }
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setAvatarPreview(reader.result as string);
          setFormData((prev) => ({
            ...prev,
            avatarUrl: reader.result as string,
          }));
        };
        reader.readAsDataURL(file);
      }
    };

    const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setCoverPreview(reader.result as string);
          setFormData((prev) => ({
            ...prev,
            coverUrl: reader.result as string,
          }));
        };
        reader.readAsDataURL(file);
      }
    };

    const removeAvatar = () => {
      setAvatarPreview(null);
      setFormData((prev) => ({ ...prev, avatarUrl: undefined }));
      if (avatarInputRef.current) {
        avatarInputRef.current.value = "";
      }
    };

    const removeCover = () => {
      setCoverPreview(null);
      setFormData((prev) => ({ ...prev, coverUrl: undefined }));
      if (coverInputRef.current) {
        coverInputRef.current.value = "";
      }
    };

    const validate = (): boolean => {
      const newErrors: Partial<Record<keyof ProfileFormData, string>> = {};

      if (!formData.displayName.trim()) {
        newErrors.displayName = "Display name is required";
      } else if (formData.displayName.length > 50) {
        newErrors.displayName = "Display name must be 50 characters or less";
      }

      if (!formData.username.trim()) {
        newErrors.username = "Username is required";
      } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
        newErrors.username =
          "Username can only contain letters, numbers, and underscores";
      } else if (formData.username.length < 3) {
        newErrors.username = "Username must be at least 3 characters";
      } else if (formData.username.length > 30) {
        newErrors.username = "Username must be 30 characters or less";
      }

      if (formData.bio.length > 200) {
        newErrors.bio = "Bio must be 200 characters or less";
      }

      if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
        newErrors.website = "Website must be a valid URL";
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validate()) return;

      try {
        setUpdatingProfile(true);

        if (onSave) {
          await onSave(formData);
        } else {
          // Default: update via store
          updateCurrentUser({
            displayName: formData.displayName,
            username: formData.username,
            bio: formData.bio || undefined,
            location: formData.location || undefined,
            website: formData.website || undefined,
            pronouns: formData.pronouns || undefined,
            avatarUrl: formData.avatarUrl,
            coverUrl: formData.coverUrl,
          });
        }
      } catch (error) {
        logger.error("Failed to update profile:", error);
      } finally {
        setUpdatingProfile(false);
      }
    };

    const displayAvatarUrl = avatarPreview ?? formData.avatarUrl;
    const displayCoverUrl = coverPreview ?? formData.coverUrl;

    return (
      <form
        ref={ref}
        onSubmit={handleSubmit}
        className={cn("space-y-6", className)}
        {...props}
      >
        {/* Cover image */}
        {showCoverUpload && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cover Image</CardTitle>
              <CardDescription>
                Add a banner image to personalize your profile
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className="group relative h-32 cursor-pointer overflow-hidden rounded-lg bg-muted"
                onClick={() => coverInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    coverInputRef.current?.click();
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label="Upload cover image"
                style={{
                  backgroundImage: displayCoverUrl
                    ? `url(${displayCoverUrl})`
                    : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <Upload className="h-6 w-6 text-white" />
                </div>
                {displayCoverUrl && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute right-2 top-2 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeCover();
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverChange}
                className="hidden"
              />
            </CardContent>
          </Card>
        )}

        {/* Avatar */}
        {showAvatarUpload && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profile Picture</CardTitle>
              <CardDescription>
                Upload a photo to help others recognize you
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="group relative">
                  <Avatar className="h-20 w-20">
                    {displayAvatarUrl && (
                      <AvatarImage
                        src={displayAvatarUrl}
                        alt="Avatar preview"
                      />
                    )}
                    <AvatarFallback className="text-2xl">
                      {getInitials(formData.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <Camera className="h-6 w-6 text-white" />
                  </button>
                </div>
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Photo
                  </Button>
                  {displayAvatarUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={removeAvatar}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Basic info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name *</Label>
                <Input
                  id="displayName"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleChange}
                  placeholder="Your display name"
                  className={errors.displayName ? "border-destructive" : ""}
                />
                {errors.displayName && (
                  <p className="text-xs text-destructive">
                    {errors.displayName}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    @
                  </span>
                  <Input
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="username"
                    className={cn(
                      "pl-7",
                      errors.username ? "border-destructive" : "",
                    )}
                  />
                </div>
                {errors.username && (
                  <p className="text-xs text-destructive">{errors.username}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                placeholder="Tell us about yourself..."
                rows={3}
                className={errors.bio ? "border-destructive" : ""}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                {errors.bio && (
                  <span className="text-destructive">{errors.bio}</span>
                )}
                <span className="ml-auto">{formData.bio.length}/200</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pronouns">Pronouns</Label>
              <Input
                id="pronouns"
                name="pronouns"
                value={formData.pronouns}
                onChange={handleChange}
                placeholder="e.g., they/them"
              />
            </div>
          </CardContent>
        </Card>

        {/* Additional info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="Where are you based?"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                name="website"
                type="url"
                value={formData.website}
                onChange={handleChange}
                placeholder="https://yourwebsite.com"
                className={errors.website ? "border-destructive" : ""}
              />
              {errors.website && (
                <p className="text-xs text-destructive">{errors.website}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isUpdating}>
            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </form>
    );
  },
);
EditProfileForm.displayName = "EditProfileForm";

export { EditProfileForm };
