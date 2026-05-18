"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  setupUpdateListeners,
  checkForUpdates,
  installUpdate,
  isUpdaterAvailable,
  type UpdateInfo,
} from "@/lib/tauri";
import { useTauri } from "@/hooks/useTauri";

export interface UpdateNotificationProps {
  /**
   * Whether to automatically check for updates on mount
   */
  autoCheck?: boolean;
  /**
   * Callback when an update is found
   */
  onUpdateFound?: (info: UpdateInfo) => void;
  /**
   * Callback when update installation starts
   */
  onInstallStart?: () => void;
  /**
   * Custom render function for the notification
   */
  children?: (props: UpdateNotificationRenderProps) => React.ReactNode;
}

export interface UpdateNotificationRenderProps {
  updateInfo: UpdateInfo | null;
  isChecking: boolean;
  isDownloading: boolean;
  downloadProgress: number;
  error: string | null;
  checkForUpdates: () => Promise<void>;
  installUpdate: () => Promise<void>;
  dismiss: () => void;
}

/**
 * Component for displaying and managing application updates
 */
export function UpdateNotification({
  autoCheck = true,
  onUpdateFound,
  onInstallStart,
  children,
}: UpdateNotificationProps) {
  const { isTauri } = useTauri();
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  // Set up update event listeners
  useEffect(() => {
    if (!isTauri || !isUpdaterAvailable()) return;

    let cleanup: (() => void) | undefined;

    setupUpdateListeners({
      onUpdateAvailable: (info) => {
        setUpdateInfo(info);
        onUpdateFound?.(info);
      },
      onNoUpdateAvailable: () => {
        setUpdateInfo(null);
      },
      onDownloadStart: () => {
        setIsDownloading(true);
        setDownloadProgress(0);
        onInstallStart?.();
      },
      onDownloadProgress: (progress) => {
        setDownloadProgress(progress);
      },
      onDownloadComplete: () => {
        setIsDownloading(false);
        setDownloadProgress(100);
      },
      onError: (err) => {
        setError(err);
        setIsDownloading(false);
      },
    }).then((unsub) => {
      cleanup = unsub;
    });

    return () => {
      cleanup?.();
    };
  }, [isTauri, onUpdateFound, onInstallStart]);

  // Auto-check for updates
  useEffect(() => {
    if (!isTauri || !autoCheck || !isUpdaterAvailable()) return;

    handleCheckForUpdates();
  }, [isTauri, autoCheck]);

  const handleCheckForUpdates = useCallback(async () => {
    if (!isTauri || !isUpdaterAvailable()) return;

    setIsChecking(true);
    setError(null);

    try {
      const info = await checkForUpdates();
      setUpdateInfo(info);
      if (info) {
        onUpdateFound?.(info);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to check for updates",
      );
    } finally {
      setIsChecking(false);
    }
  }, [isTauri, onUpdateFound]);

  const handleInstallUpdate = useCallback(async () => {
    if (!isTauri || !isUpdaterAvailable() || !updateInfo) return;

    setError(null);
    onInstallStart?.();

    try {
      await installUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to install update");
    }
  }, [isTauri, updateInfo, onInstallStart]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  // Custom render
  if (children) {
    return (
      <>
        {children({
          updateInfo,
          isChecking,
          isDownloading,
          downloadProgress,
          error,
          checkForUpdates: handleCheckForUpdates,
          installUpdate: handleInstallUpdate,
          dismiss: handleDismiss,
        })}
      </>
    );
  }

  // Don't render if not in Tauri, no update, or dismissed
  if (!isTauri || !updateInfo || dismissed) {
    return null;
  }

  // Default UI
  return (
    <div
      className="update-notification"
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        backgroundColor: "var(--bg-color, #fff)",
        borderRadius: "8px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
        padding: "16px",
        maxWidth: "320px",
        zIndex: 9999,
        border: "1px solid var(--border-color, rgba(0, 0, 0, 0.1))",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <h4
          style={{
            margin: "0 0 8px 0",
            fontSize: "14px",
            fontWeight: 600,
          }}
        >
          Update Available
        </h4>
        <button
          onClick={handleDismiss}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "0",
            fontSize: "18px",
            lineHeight: 1,
            opacity: 0.6,
          }}
          aria-label="Dismiss"
        >
          x
        </button>
      </div>

      <p
        style={{
          margin: "0 0 12px 0",
          fontSize: "13px",
          color: "var(--text-secondary, #666)",
        }}
      >
        Version {updateInfo.version} is available. You have version{" "}
        {updateInfo.currentVersion}.
      </p>

      {updateInfo.body && (
        <p
          style={{
            margin: "0 0 12px 0",
            fontSize: "12px",
            color: "var(--text-secondary, #666)",
            maxHeight: "80px",
            overflow: "auto",
          }}
        >
          {updateInfo.body}
        </p>
      )}

      {error && (
        <p
          style={{
            margin: "0 0 12px 0",
            fontSize: "12px",
            color: "#e81123",
          }}
        >
          {error}
        </p>
      )}

      {isDownloading && (
        <div
          style={{
            marginBottom: "12px",
          }}
        >
          <div
            style={{
              height: "4px",
              backgroundColor: "var(--bg-secondary, #f0f0f0)",
              borderRadius: "2px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${downloadProgress}%`,
                backgroundColor: "var(--primary-color, #6366f1)",
                transition: "width 0.2s ease",
              }}
            />
          </div>
          <p
            style={{
              margin: "4px 0 0 0",
              fontSize: "11px",
              color: "var(--text-secondary, #666)",
            }}
          >
            Downloading... {Math.round(downloadProgress)}%
          </p>
        </div>
      )}

      <div style={{ display: "flex", gap: "8px" }}>
        <button
          onClick={handleInstallUpdate}
          disabled={isDownloading}
          style={{
            flex: 1,
            padding: "8px 16px",
            backgroundColor: "var(--primary-color, #6366f1)",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            fontSize: "13px",
            fontWeight: 500,
            cursor: isDownloading ? "not-allowed" : "pointer",
            opacity: isDownloading ? 0.7 : 1,
          }}
        >
          {isDownloading ? "Installing..." : "Install & Restart"}
        </button>
        <button
          onClick={handleDismiss}
          style={{
            padding: "8px 16px",
            backgroundColor: "transparent",
            color: "var(--text-color, inherit)",
            border: "1px solid var(--border-color, rgba(0, 0, 0, 0.2))",
            borderRadius: "4px",
            fontSize: "13px",
            cursor: "pointer",
          }}
        >
          Later
        </button>
      </div>
    </div>
  );
}

export default UpdateNotification;
