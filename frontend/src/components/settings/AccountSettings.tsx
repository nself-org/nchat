"use client";

import { SettingsSection } from "./settings-section";
import { SettingsRow } from "./settings-row";
import { EmailSettings } from "./EmailSettings";
import { PasswordSettings } from "./PasswordSettings";
import { TwoFactorSettings } from "./TwoFactorSettings";
import { SessionsSettings } from "./SessionsSettings";
import { DevicesSettings } from "./DevicesSettings";
import { DeleteAccount } from "./DeleteAccount";
import { User } from "lucide-react";

interface AccountSettingsProps {
  className?: string;
}

/**
 * AccountSettings - Account overview and management
 */
export function AccountSettings({ className }: AccountSettingsProps) {
  return (
    <div className={className}>
      {/* Page Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
          <User className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Account</h1>
          <p className="text-sm text-muted-foreground">
            Manage your account settings and security
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <EmailSettings />
        <PasswordSettings />
        <TwoFactorSettings />
        <SessionsSettings />
        <DevicesSettings />
        <DeleteAccount />
      </div>
    </div>
  );
}
