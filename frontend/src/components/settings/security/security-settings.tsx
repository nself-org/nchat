"use client";

/**
 * Security Settings Component
 * Combines various security-related settings
 */

import * as React from "react";
import { SettingsSection } from "../settings-section";
import { TwoFactorSettings } from "../TwoFactorSettings";
import { PasswordSettings } from "../PasswordSettings";
import { SessionsSettings } from "../SessionsSettings";
import { cn } from "@/lib/utils";

export interface SecuritySettingsProps {
  className?: string;
}

export function SecuritySettings({ className }: SecuritySettingsProps) {
  return (
    <div className={cn("space-y-8", className)}>
      <SettingsSection title="Password">
        <PasswordSettings />
      </SettingsSection>

      <SettingsSection title="Two-Factor Authentication">
        <TwoFactorSettings />
      </SettingsSection>

      <SettingsSection title="Active Sessions">
        <SessionsSettings />
      </SettingsSection>
    </div>
  );
}

export default SecuritySettings;
