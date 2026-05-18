/**
 * PIN Lock Settings Page
 *
 * User-facing page for managing PIN lock settings
 */

"use client";

import { useAuth } from "@/contexts/auth-context";
import { PinManage } from "@/components/security/PinManage";
import { Card, CardContent } from "@/components/ui/card";
import { Shield } from "lucide-react";

export default function PinLockSettingsPage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="container max-w-4xl py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Please sign in to access PIN lock settings
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="space-y-2">
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Shield className="h-8 w-8" />
            PIN Lock
          </h1>
          <p className="text-muted-foreground">
            Secure your account with a PIN lock. Your app will require a PIN to
            unlock after periods of inactivity or when closed.
          </p>
        </div>

        {/* PIN Management */}
        <PinManage
          userId={user.id}
          userName={user.email || user.displayName || "User"}
        />
      </div>
    </div>
  );
}
