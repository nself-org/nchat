"use client";

import { useState } from "react";
import { SettingsSection } from "./settings-section";
import { Button } from "@/components/ui/button";
import { Download, Trash2, AlertCircle, Check } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DataSettingsProps {
  className?: string;
}

/**
 * DataSettings - Manage your data
 */
export function DataSettings({ className }: DataSettingsProps) {
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  const handleDownloadData = async () => {
    setDownloadLoading(true);
    setDownloadSuccess(false);

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Simulate file download
      const data = {
        exportedAt: new Date().toISOString(),
        messages: [],
        channels: [],
        profile: {},
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `nchat-data-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 5000);
    } finally {
      setDownloadLoading(false);
    }
  };

  const handleDeleteData = async () => {
    setDeleteLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setDeleteSuccess(true);
      setDeleteDialogOpen(false);
      setTimeout(() => setDeleteSuccess(false), 5000);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <SettingsSection
      title="Your Data"
      description="Download or delete your data"
      className={className}
    >
      <div className="space-y-4">
        {/* Download data */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="flex-1">
            <p className="font-medium">Download your data</p>
            <p className="text-sm text-muted-foreground">
              Get a copy of your messages, profile, and other data
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleDownloadData}
            disabled={downloadLoading}
            className="gap-2"
          >
            {downloadLoading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Preparing...
              </>
            ) : downloadSuccess ? (
              <>
                <Check className="h-4 w-4" />
                Downloaded!
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download
              </>
            )}
          </Button>
        </div>

        {/* Delete message history */}
        <div className="border-destructive/30 bg-destructive/5 flex items-center justify-between rounded-lg border p-4">
          <div className="flex-1">
            <p className="font-medium text-destructive">
              Delete message history
            </p>
            <p className="text-sm text-muted-foreground">
              Permanently delete all your messages. This cannot be undone.
            </p>
          </div>
          <Button
            variant="destructive"
            onClick={() => setDeleteDialogOpen(true)}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>

        {deleteSuccess && (
          <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200">
            <Check className="h-4 w-4" />
            <AlertDescription>
              Your message history has been deleted.
            </AlertDescription>
          </Alert>
        )}

        {/* Info */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Deleting your data is permanent and cannot be reversed. Consider
            downloading a copy first.
          </AlertDescription>
        </Alert>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Delete all message history?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                This will permanently delete all your messages from all channels
                and direct message conversations.
              </p>
              <p className="font-medium text-destructive">
                This action cannot be undone.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteData}
              disabled={deleteLoading}
              className="hover:bg-destructive/90 bg-destructive text-destructive-foreground"
            >
              {deleteLoading ? "Deleting..." : "Delete all messages"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsSection>
  );
}
