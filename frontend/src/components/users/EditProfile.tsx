"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { type ExtendedUserProfile, type SocialLink } from "./UserCard";
import { AvatarUpload } from "./AvatarUpload";
import { CoverPhotoUpload } from "./CoverPhotoUpload";
import { ProfileFields, type ProfileFieldDefinition } from "./ProfileFields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Save, X, Plus, Trash2 } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface EditProfileData {
  displayName: string;
  username: string;
  pronouns: string;
  title: string;
  department: string;
  team: string;
  bio: string;
  location: string;
  timezone: string;
  website: string;
  phone: string;
  socialLinks: SocialLink[];
  customFields: Record<string, string | boolean>;
}

export interface EditProfileProps extends React.HTMLAttributes<HTMLDivElement> {
  user: ExtendedUserProfile;
  customFieldDefinitions?: ProfileFieldDefinition[];
  onSave: (data: EditProfileData) => Promise<void>;
  onCancel: () => void;
  onAvatarUpload: (file: File) => Promise<string>;
  onCoverUpload: (file: File) => Promise<string>;
  onAvatarRemove?: () => Promise<void>;
  onCoverRemove?: () => Promise<void>;
  isLoading?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const PRONOUNS_OPTIONS = [
  { value: "", label: "Prefer not to say" },
  { value: "he/him", label: "He/Him" },
  { value: "she/her", label: "She/Her" },
  { value: "they/them", label: "They/Them" },
  { value: "ze/zir", label: "Ze/Zir" },
  { value: "custom", label: "Custom" },
];

const SOCIAL_PLATFORMS = [
  "Twitter",
  "LinkedIn",
  "GitHub",
  "Instagram",
  "Facebook",
  "YouTube",
  "Website",
  "Other",
];

// ============================================================================
// Component
// ============================================================================

const EditProfile = React.forwardRef<HTMLDivElement, EditProfileProps>(
  (
    {
      className,
      user,
      customFieldDefinitions = [],
      onSave,
      onCancel,
      onAvatarUpload,
      onCoverUpload,
      onAvatarRemove,
      onCoverRemove,
      isLoading = false,
      ...props
    },
    ref,
  ) => {
    const [formData, setFormData] = React.useState<EditProfileData>({
      displayName: user.displayName || "",
      username: user.username || "",
      pronouns: user.pronouns || "",
      title: user.title || "",
      department: user.department || "",
      team: user.team || "",
      bio: user.bio || "",
      location: user.location || "",
      timezone: user.timezone || "",
      website: user.website || "",
      phone: user.phone || "",
      socialLinks: user.socialLinks || [],
      customFields: {},
    });
    const [customPronouns, setCustomPronouns] = React.useState("");
    const [isSaving, setIsSaving] = React.useState(false);
    const [errors, setErrors] = React.useState<Record<string, string>>({});

    const handleChange = (
      field: keyof EditProfileData,
      value: string | SocialLink[],
    ) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      // Clear error when field is edited
      if (errors[field]) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    };

    const handleAddSocialLink = () => {
      setFormData((prev) => ({
        ...prev,
        socialLinks: [...prev.socialLinks, { platform: "", url: "" }],
      }));
    };

    const handleUpdateSocialLink = (
      index: number,
      field: "platform" | "url",
      value: string,
    ) => {
      setFormData((prev) => ({
        ...prev,
        socialLinks: prev.socialLinks.map((link, i) =>
          i === index ? { ...link, [field]: value } : link,
        ),
      }));
    };

    const handleRemoveSocialLink = (index: number) => {
      setFormData((prev) => ({
        ...prev,
        socialLinks: prev.socialLinks.filter((_, i) => i !== index),
      }));
    };

    const validate = (): boolean => {
      const newErrors: Record<string, string> = {};

      if (!formData.displayName.trim()) {
        newErrors.displayName = "Display name is required";
      }

      if (!formData.username.trim()) {
        newErrors.username = "Username is required";
      } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
        newErrors.username =
          "Username can only contain letters, numbers, and underscores";
      }

      if (formData.bio.length > 500) {
        newErrors.bio = "Bio must be 500 characters or less";
      }

      if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
        newErrors.website =
          "Please enter a valid URL starting with http:// or https://";
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate()) return;

      setIsSaving(true);
      try {
        const dataToSave = {
          ...formData,
          pronouns:
            formData.pronouns === "custom" ? customPronouns : formData.pronouns,
        };
        await onSave(dataToSave);
      } finally {
        setIsSaving(false);
      }
    };

    return (
      <div ref={ref} className={cn("space-y-6", className)} {...props}>
        <form onSubmit={handleSubmit}>
          {/* Cover and Avatar */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Photos</CardTitle>
              <CardDescription>
                Upload a profile picture and cover photo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <CoverPhotoUpload
                currentCoverUrl={user.coverUrl}
                onUpload={onCoverUpload}
                onRemove={onCoverRemove}
                disabled={isLoading}
              />
              <AvatarUpload
                currentAvatarUrl={user.avatarUrl}
                fallback={formData.displayName || user.username}
                onUpload={onAvatarUpload}
                onRemove={onAvatarRemove}
                disabled={isLoading}
              />
            </CardContent>
          </Card>

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Your public profile information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="displayName">
                    Display Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="displayName"
                    value={formData.displayName}
                    onChange={(e) =>
                      handleChange("displayName", e.target.value)
                    }
                    placeholder="Your display name"
                    disabled={isLoading}
                    className={errors.displayName ? "border-destructive" : ""}
                  />
                  {errors.displayName && (
                    <p className="text-xs text-destructive">
                      {errors.displayName}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">
                    Username <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">@</span>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => handleChange("username", e.target.value)}
                      placeholder="username"
                      disabled={isLoading}
                      className={errors.username ? "border-destructive" : ""}
                    />
                  </div>
                  {errors.username && (
                    <p className="text-xs text-destructive">
                      {errors.username}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pronouns">Pronouns</Label>
                <Select
                  value={formData.pronouns}
                  onValueChange={(value) => handleChange("pronouns", value)}
                  disabled={isLoading}
                >
                  <SelectTrigger id="pronouns">
                    <SelectValue placeholder="Select pronouns" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRONOUNS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.pronouns === "custom" && (
                  <Input
                    value={customPronouns}
                    onChange={(e) => setCustomPronouns(e.target.value)}
                    placeholder="Enter your pronouns"
                    disabled={isLoading}
                    className="mt-2"
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => handleChange("bio", e.target.value)}
                  placeholder="Tell others about yourself..."
                  rows={4}
                  disabled={isLoading}
                  className={errors.bio ? "border-destructive" : ""}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{errors.bio || "Max 500 characters"}</span>
                  <span>{formData.bio.length}/500</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Work Information */}
          <Card>
            <CardHeader>
              <CardTitle>Work Information</CardTitle>
              <CardDescription>Your role and team details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Job Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  placeholder="e.g., Software Engineer"
                  disabled={isLoading}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={(e) => handleChange("department", e.target.value)}
                    placeholder="e.g., Engineering"
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="team">Team</Label>
                  <Input
                    id="team"
                    value={formData.team}
                    onChange={(e) => handleChange("team", e.target.value)}
                    placeholder="e.g., Platform"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact & Location */}
          <Card>
            <CardHeader>
              <CardTitle>Contact & Location</CardTitle>
              <CardDescription>How others can reach you</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => handleChange("location", e.target.value)}
                    placeholder="e.g., San Francisco, CA"
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input
                    id="timezone"
                    value={formData.timezone}
                    onChange={(e) => handleChange("timezone", e.target.value)}
                    placeholder="e.g., America/Los_Angeles"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="e.g., +1 (555) 123-4567"
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    value={formData.website}
                    onChange={(e) => handleChange("website", e.target.value)}
                    placeholder="https://yourwebsite.com"
                    disabled={isLoading}
                    className={errors.website ? "border-destructive" : ""}
                  />
                  {errors.website && (
                    <p className="text-xs text-destructive">{errors.website}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Social Links */}
          <Card>
            <CardHeader>
              <CardTitle>Social Links</CardTitle>
              <CardDescription>Connect your social profiles</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.socialLinks.map((link, index) => (
                <div key={index} className="flex items-center gap-3">
                  <Select
                    value={link.platform}
                    onValueChange={(value) =>
                      handleUpdateSocialLink(index, "platform", value)
                    }
                    disabled={isLoading}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Platform" />
                    </SelectTrigger>
                    <SelectContent>
                      {SOCIAL_PLATFORMS.map((platform) => (
                        <SelectItem key={platform} value={platform}>
                          {platform}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={link.url}
                    onChange={(e) =>
                      handleUpdateSocialLink(index, "url", e.target.value)
                    }
                    placeholder="https://..."
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveSocialLink(index)}
                    disabled={isLoading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={handleAddSocialLink}
                disabled={isLoading}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Link
              </Button>
            </CardContent>
          </Card>

          {/* Custom Fields */}
          {customFieldDefinitions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Additional Information</CardTitle>
                <CardDescription>Custom profile fields</CardDescription>
              </CardHeader>
              <CardContent>
                <ProfileFields
                  fields={customFieldDefinitions}
                  values={formData.customFields}
                  onChange={(key, value) =>
                    setFormData((prev) => ({
                      ...prev,
                      customFields: { ...prev.customFields, [key]: value },
                    }))
                  }
                  disabled={isLoading}
                />
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSaving}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || isLoading}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    );
  },
);
EditProfile.displayName = "EditProfile";

export { EditProfile };
