"use client";

import { useState, useEffect } from "react";
import { type AppConfig } from "@/config/app-config";
import { EnhancedInput } from "@/components/ui/enhanced-input";
import { User, Mail, UserCheck } from "lucide-react";
import { isDevelopment } from "@/lib/environment";

interface OwnerInfoStepProps {
  config: AppConfig;
  onUpdate: (updates: Partial<AppConfig>) => void;
  onValidate: (isValid: boolean) => void;
}

export function OwnerInfoStep({
  config,
  onUpdate,
  onValidate,
}: OwnerInfoStepProps) {
  // Detect development environment using hostname-based detection
  const isDev = isDevelopment();

  // In development, ALWAYS use prefilled values regardless of config
  const getInitialValues = () => {
    if (isDev) {
      // In dev, always prefill these values
      return {
        email: "owner@nself.org",
        name: "Admin User",
        role: "Platform Owner",
      };
    }

    // In production, use config values
    return {
      email: config.owner?.email || "",
      name: config.owner?.name || "",
      role: config.owner?.role || "",
    };
  };

  const initialValues = getInitialValues();

  const [formData, setFormData] = useState(initialValues);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  const validateForm = (showErrors = false) => {
    const newErrors: Record<string, string> = {};

    // Only show errors if field has been touched (blurred) and showErrors is true
    if (
      showErrors &&
      touchedFields.has("name") &&
      formData.name.trim() === ""
    ) {
      newErrors.name = "Name is required";
    }

    if (showErrors && touchedFields.has("email")) {
      if (formData.email.trim() === "") {
        newErrors.email = "Email is required";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = "Please enter a valid email address";
      }
    }

    setErrors(newErrors);
    // Check validity regardless of showing errors
    const isValid =
      formData.name.trim() !== "" &&
      formData.email.trim() !== "" &&
      (!formData.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email));
    onValidate(isValid);
    return isValid;
  };

  useEffect(() => {
    // Validate without showing errors initially
    validateForm(touchedFields.size > 0);
  }, [formData]);

  useEffect(() => {
    // On mount in dev mode, immediately update parent with prefilled values
    if (isDev) {
      onUpdate({
        owner: initialValues,
      });
    }

    // Run initial validation
    validateForm(false);
  }, []);

  const handleChange = (field: keyof typeof formData, value: string) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);

    onUpdate({
      owner: updated,
    });
  };

  const handleBlur = (field: string) => {
    setTouchedFields((prev) => new Set([...prev, field]));
    // Force validation with errors after blur
    setTimeout(() => validateForm(true), 0);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 text-center">
        <div className="shadow-glow mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#00D4FF] to-[#0EA5E9]">
          <User className="h-6 w-6 text-zinc-900" />
        </div>
        <h2 className="mb-3 text-2xl font-bold text-zinc-900 dark:text-white">
          Owner Information
        </h2>
        <p className="mx-auto max-w-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
          Set up your admin account. You'll automatically become the platform
          owner when you sign in with this email.
        </p>
        {isDev && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500"></span>
            Development Mode - Auto-prefill Active
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="grid gap-6">
          <EnhancedInput
            id="name"
            label="Full Name *"
            icon={<User className="h-4 w-4" />}
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            onBlur={() => handleBlur("name")}
            error={errors.name}
          />

          <div>
            <EnhancedInput
              id="email"
              type="email"
              label="Email Address *"
              icon={<Mail className="h-4 w-4" />}
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              onBlur={() => handleBlur("email")}
              error={errors.email}
            />
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              This will be your admin login email and primary contact
            </p>
          </div>

          <div className="relative">
            <EnhancedInput
              id="role"
              label="Your Role"
              icon={<UserCheck className="h-4 w-4" />}
              value={formData.role}
              onChange={(e) => handleChange("role", e.target.value)}
              placeholder="e.g., CEO, Administrator, Team Lead"
            />
            <span className="absolute right-3 top-3 text-xs text-zinc-400 dark:text-zinc-500">
              Optional
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-gradient-to-br from-zinc-50 to-zinc-100 p-5 ring-1 ring-zinc-900/5 dark:border-zinc-700 dark:from-zinc-800/30 dark:to-zinc-800/50 dark:ring-white/5">
          <div className="flex gap-3">
            <div className="shadow-glow flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-[#00D4FF]">
              <UserCheck className="h-4 w-4 text-zinc-900" />
            </div>
            <div>
              <h3 className="mb-2 font-semibold text-zinc-900 dark:text-white">
                Automatic Owner Assignment
              </h3>
              <p className="mb-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                When you first sign in to your platform with this email address
                (via any authentication method), you'll automatically be granted
                owner privileges with full administrative access.
              </p>
              <div className="text-xs text-zinc-600 dark:text-zinc-400">
                <p className="mb-1 font-medium">
                  ✓ Works with any login method:
                </p>
                <p>
                  Email/Password • Google • GitHub • Magic Links • Other
                  providers
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  🔒
                </span>
              </div>
            </div>
            <div className="text-sm text-zinc-700 dark:text-zinc-300">
              <p className="mb-1 font-medium">Privacy & Security</p>
              <p>
                Your information is stored locally and used only for platform
                configuration. We never share your data with third parties.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
