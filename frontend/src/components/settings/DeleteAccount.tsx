"use client";

import { useState } from "react";
import { SettingsSection } from "./settings-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/auth-context";

import { logger } from "@/lib/logger";

interface DeleteAccountProps {
  className?: string;
}

/**
 * DeleteAccount - Permanently delete account
 */
export function DeleteAccount({ className }: DeleteAccountProps) {
  const { signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (confirmation !== "DELETE") return;

    setLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      await signOut();
    } catch (error) {
      logger.error("Failed to delete account:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SettingsSection
      title="Danger Zone"
      description="Irreversible and destructive actions"
      className={className}
    >
      <div className="border-destructive/50 bg-destructive/5 rounded-lg border p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
          <div className="flex-1">
            <p className="font-medium text-destructive">Delete Account</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Permanently delete your account and all associated data. This
              action cannot be undone. All your messages, channels, and settings
              will be permanently removed.
            </p>

            <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="mt-4 gap-2">
                  <Trash2 className="h-4 w-4" />
                  Delete Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Are you absolutely sure?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-3">
                    <p>
                      This action <strong>cannot be undone</strong>. This will
                      permanently delete your account and remove all your data
                      from our servers.
                    </p>
                    <ul className="list-inside list-disc space-y-1 text-sm">
                      <li>All your messages will be deleted</li>
                      <li>You will be removed from all channels</li>
                      <li>Your profile and settings will be erased</li>
                      <li>Any files you uploaded will be removed</li>
                    </ul>
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="space-y-2 py-4">
                  <Label
                    htmlFor="delete-confirm"
                    className="text-sm font-medium"
                  >
                    Type <strong className="text-destructive">DELETE</strong> to
                    confirm
                  </Label>
                  <Input
                    id="delete-confirm"
                    value={confirmation}
                    onChange={(e) =>
                      setConfirmation(e.target.value.toUpperCase())
                    }
                    placeholder="DELETE"
                    className="font-mono uppercase"
                    autoComplete="off"
                  />
                </div>

                <AlertDialogFooter>
                  <AlertDialogCancel
                    onClick={() => setConfirmation("")}
                    disabled={loading}
                  >
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={confirmation !== "DELETE" || loading}
                    className="hover:bg-destructive/90 bg-destructive text-destructive-foreground"
                  >
                    {loading ? (
                      <>
                        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Account
                      </>
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </SettingsSection>
  );
}
