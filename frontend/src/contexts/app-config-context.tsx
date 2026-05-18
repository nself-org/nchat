"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { AppConfig, defaultAppConfig } from "@/config/app-config";
import { isDevelopment } from "@/lib/environment";

import { logger } from "@/lib/logger";

interface AppConfigContextType {
  config: AppConfig;
  updateConfig: (updates: Partial<AppConfig>) => Promise<AppConfig>;
  resetConfig: () => void;
  isLoading: boolean;
  saveConfig: () => Promise<void>;
}

const AppConfigContext = createContext<AppConfigContextType | undefined>(
  undefined,
);

export function AppConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(defaultAppConfig);
  const [isLoading, setIsLoading] = useState(true);

  // Load config from localStorage or API on mount
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      // First try to load from localStorage (for quick startup)
      const savedConfig = localStorage.getItem("app-config");
      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig);
        const mergedConfig = { ...defaultAppConfig, ...parsedConfig };
        setConfig(mergedConfig);
      }

      // Then try to load from API (from database)
      try {
        const response = await fetch("/api/config");
        if (response.ok) {
          const serverConfig = await response.json();
          const finalConfig = {
            ...defaultAppConfig,
            ...serverConfig,
          };
          setConfig(finalConfig);
          localStorage.setItem("app-config", JSON.stringify(finalConfig));
        }
      } catch (apiError) {
        // If API fails, use localStorage or defaults
        logger.warn("API config load failed, using local/default config", {
          error: apiError,
        });
      }
    } catch (error) {
      logger.warn("Failed to load app config", { error });
    } finally {
      setIsLoading(false);
    }
  };

  const updateConfig = async (updates: Partial<AppConfig>) => {
    const newConfig = {
      ...config,
      ...updates,
      setup: {
        ...config.setup,
        ...(updates.setup || {}),
      },
      owner: {
        ...config.owner,
        ...(updates.owner || {}),
      },
      branding: {
        ...config.branding,
        ...(updates.branding || {}),
      },
      theme: {
        ...config.theme,
        ...(updates.theme || {}),
      },
      homepage: {
        ...config.homepage,
        ...(updates.homepage || {}),
      },
      authProviders: {
        ...config.authProviders,
        ...(updates.authProviders || {}),
      },
      authPermissions: {
        ...config.authPermissions,
        ...(updates.authPermissions || {}),
      },
      features: {
        ...config.features,
        ...(updates.features || {}),
      },
    };

    // Update state immediately for responsiveness
    setConfig(newConfig);

    // Save to localStorage immediately for persistence
    localStorage.setItem("app-config", JSON.stringify(newConfig));

    // Save to database asynchronously
    try {
      await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newConfig),
      });
    } catch (error) {
      logger.error("Failed to save config to database:", error);
      // Don't throw - we already saved locally
    }

    return newConfig;
  };

  const resetConfig = () => {
    setConfig(defaultAppConfig);
    localStorage.setItem("app-config", JSON.stringify(defaultAppConfig));
  };

  const saveConfig = async () => {
    try {
      // Save to localStorage first
      localStorage.setItem("app-config", JSON.stringify(config));

      // Save to database
      const response = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error("Failed to save configuration to database");
      }
    } catch (error) {
      logger.error("Failed to save app config:", error);
      throw error;
    }
  };

  const value = {
    config,
    updateConfig,
    resetConfig,
    isLoading,
    saveConfig,
  };

  return (
    <AppConfigContext.Provider value={value}>
      {children}
    </AppConfigContext.Provider>
  );
}

export function useAppConfig() {
  const context = useContext(AppConfigContext);
  if (context === undefined) {
    throw new Error("useAppConfig must be used within an AppConfigProvider");
  }
  return context;
}
