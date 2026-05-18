"use client";

import { useState, useEffect } from "react";
import { User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type {
  OnboardingStepProps,
  UserProfile,
} from "@/lib/onboarding/onboarding-types";

interface ProfileSetupStepProps extends OnboardingStepProps {
  initialData?: Partial<UserProfile>;
  onDataChange?: (data: Partial<UserProfile>) => void;
}

export function ProfileSetupStep({
  onNext,
  onPrev,
  onSkip,
  isFirst,
  canSkip,
  initialData,
  onDataChange,
}: ProfileSetupStepProps) {
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    displayName: "",
    fullName: "",
    bio: "",
    title: "",
    department: "",
    ...initialData,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: keyof UserProfile, value: string) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    onDataChange?.(newData);

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.displayName?.trim()) {
      newErrors.displayName = "Display name is required";
    } else if (formData.displayName.length < 2) {
      newErrors.displayName = "Display name must be at least 2 characters";
    } else if (formData.displayName.length > 50) {
      newErrors.displayName = "Display name must be less than 50 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      onNext();
    }
  };

  return (
    <div className="flex flex-col px-4 py-6">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="from-primary/20 to-primary/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br">
          <User className="h-8 w-8 text-primary" />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-white">
          Set Up Your Profile
        </h2>
        <p className="mx-auto max-w-md text-zinc-600 dark:text-zinc-400">
          Tell us a bit about yourself so your teammates know who you are.
        </p>
      </div>

      {/* Form */}
      <div className="mx-auto w-full max-w-md space-y-6">
        {/* Display Name - Required */}
        <div className="space-y-2">
          <Label htmlFor="displayName" className="flex items-center gap-1">
            Display Name
            <span className="text-red-500">*</span>
          </Label>
          <Input
            id="displayName"
            placeholder="How you want to be called"
            value={formData.displayName || ""}
            onChange={(e) => handleChange("displayName", e.target.value)}
            className={cn(errors.displayName && "border-red-500")}
          />
          {errors.displayName && (
            <p className="text-sm text-red-500">{errors.displayName}</p>
          )}
          <p className="text-xs text-zinc-500">
            This is how you'll appear to others
          </p>
        </div>

        {/* Full Name - Optional */}
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name (Optional)</Label>
          <Input
            id="fullName"
            placeholder="Your full name"
            value={formData.fullName || ""}
            onChange={(e) => handleChange("fullName", e.target.value)}
          />
        </div>

        {/* Title - Optional */}
        <div className="space-y-2">
          <Label htmlFor="title">Job Title (Optional)</Label>
          <Input
            id="title"
            placeholder="e.g., Software Engineer, Product Manager"
            value={formData.title || ""}
            onChange={(e) => handleChange("title", e.target.value)}
          />
        </div>

        {/* Department - Optional */}
        <div className="space-y-2">
          <Label htmlFor="department">Department (Optional)</Label>
          <Input
            id="department"
            placeholder="e.g., Engineering, Marketing"
            value={formData.department || ""}
            onChange={(e) => handleChange("department", e.target.value)}
          />
        </div>

        {/* Bio - Optional */}
        <div className="space-y-2">
          <Label htmlFor="bio">Bio (Optional)</Label>
          <Textarea
            id="bio"
            placeholder="A short description about yourself"
            value={formData.bio || ""}
            onChange={(e) => handleChange("bio", e.target.value)}
            rows={3}
            className="resize-none"
          />
          <p className="text-xs text-zinc-500">
            {formData.bio?.length || 0}/200 characters
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="mt-8 flex items-center justify-between border-t border-zinc-200 pt-6 dark:border-zinc-700">
        <div>
          {!isFirst && (
            <Button variant="ghost" onClick={onPrev}>
              Back
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {canSkip && onSkip && (
            <Button variant="ghost" onClick={onSkip}>
              Skip
            </Button>
          )}
          <Button onClick={handleNext}>Continue</Button>
        </div>
      </div>
    </div>
  );
}
