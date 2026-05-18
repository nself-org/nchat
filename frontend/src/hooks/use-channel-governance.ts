/**
 * Channel Governance Hook
 *
 * React hook for channel governance operations including:
 * - Naming policy validation
 * - Default channel management
 * - Template management
 * - Archival policy management
 * - Channel creation governance
 * - Lifecycle hooks
 *
 * Phase 6: Task 63 - Channel governance and templates
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  GovernanceService,
  createGovernanceService,
  type GovernanceConfig,
  type NamingPolicy,
  type DefaultChannelConfig,
  type ArchivalPolicy,
  type ChannelCreationRules,
  type LifecycleHook,
  type GovernanceChannelTemplate,
  type ChannelApprovalRequest,
  type GovernanceAuditEntry,
  type NamingValidationResult,
  type LifecycleHookType,
} from "@/services/channels/governance.service";
import type { UserRole } from "@/types/user";
import type { ChannelType } from "@/types/channel";

// =============================================================================
// TYPES
// =============================================================================

export interface UseChannelGovernanceOptions {
  /** Initial configuration */
  initialConfig?: Partial<GovernanceConfig>;
  /** User role for permission checks */
  userRole?: UserRole;
  /** User ID for permission checks */
  userId?: string;
  /** Enable auto-save to localStorage */
  persistConfig?: boolean;
  /** LocalStorage key for persistence */
  storageKey?: string;
}

export interface UseChannelGovernanceReturn {
  // State
  config: GovernanceConfig;
  isLoading: boolean;
  error: string | null;

  // Naming Policy
  namingPolicy: NamingPolicy;
  validateName: (name: string) => NamingValidationResult;
  sanitizeName: (name: string) => string;
  isReservedName: (name: string) => boolean;
  generateSlug: (name: string, existingSlugs?: string[]) => string;

  // Default Channels
  defaultChannels: DefaultChannelConfig[];
  addDefaultChannel: (channel: DefaultChannelConfig) => void;
  removeDefaultChannel: (channelId: string) => boolean;
  updateDefaultChannel: (
    channelId: string,
    updates: Partial<DefaultChannelConfig>,
  ) => boolean;

  // Templates
  templates: GovernanceChannelTemplate[];
  getTemplateById: (
    templateId: string,
  ) => GovernanceChannelTemplate | undefined;
  getTemplatesByType: (type: ChannelType) => GovernanceChannelTemplate[];
  createTemplate: (
    template: Omit<GovernanceChannelTemplate, "id" | "isBuiltIn" | "createdAt">,
  ) => GovernanceChannelTemplate;
  updateTemplate: (
    templateId: string,
    updates: Partial<GovernanceChannelTemplate>,
  ) => boolean;
  deleteTemplate: (templateId: string) => boolean;
  applyTemplate: (
    templateId: string,
    overrides?: { name?: string; description?: string },
  ) => Omit<
    GovernanceChannelTemplate,
    "id" | "isBuiltIn" | "createdAt" | "createdBy"
  > | null;

  // Archival Policy
  archivalPolicy: ArchivalPolicy;
  updateArchivalPolicy: (updates: Partial<ArchivalPolicy>) => void;
  shouldAutoArchive: (channel: {
    id: string;
    type: ChannelType;
    isDefault: boolean;
    memberCount: number;
    lastMessageAt?: string | null;
  }) => { shouldArchive: boolean; reason?: string; daysInactive?: number };
  shouldWarnBeforeArchive: (channel: {
    id: string;
    type: ChannelType;
    isDefault: boolean;
    memberCount: number;
    lastMessageAt?: string | null;
  }) => { shouldWarn: boolean; daysUntilArchive?: number };
  getChannelsToArchive: (
    channels: Array<{
      id: string;
      name: string;
      type: ChannelType;
      isDefault: boolean;
      memberCount: number;
      lastMessageAt?: string | null;
    }>,
  ) => Array<{
    id: string;
    name: string;
    reason: string;
    daysInactive: number;
  }>;

  // Channel Creation
  creationRules: ChannelCreationRules;
  canCreateChannel: (channelType: ChannelType) => {
    allowed: boolean;
    reason?: string;
    requiresApproval?: boolean;
  };
  requestChannelApproval: (
    channelName: string,
    channelType: ChannelType,
    description: string,
  ) => ChannelApprovalRequest;
  approveChannelRequest: (requestId: string) => ChannelApprovalRequest | null;
  rejectChannelRequest: (
    requestId: string,
    reason: string,
  ) => ChannelApprovalRequest | null;
  pendingApprovals: ChannelApprovalRequest[];
  recordChannelCreation: () => void;
  recordChannelDeletion: () => void;

  // Lifecycle Hooks
  lifecycleHooks: LifecycleHook[];
  registerHook: (hook: LifecycleHook) => void;
  unregisterHook: (hookId: string) => boolean;
  getHooksByType: (type: LifecycleHookType) => LifecycleHook[];
  triggerHook: (
    type: LifecycleHookType,
    payload: Record<string, unknown>,
  ) => Promise<Array<{ hookId: string; success: boolean; error?: string }>>;

  // Audit Log
  auditLog: GovernanceAuditEntry[];
  logAction: (
    action: string,
    details: Record<string, unknown>,
    channelId?: string,
    channelName?: string,
  ) => GovernanceAuditEntry;
  getAuditLog: (options?: {
    limit?: number;
    offset?: number;
    action?: string;
    channelId?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }) => GovernanceAuditEntry[];

  // Configuration
  updateConfig: (updates: Partial<GovernanceConfig>) => void;
  updateNamingPolicy: (updates: Partial<NamingPolicy>) => void;
  updateCreationRules: (updates: Partial<ChannelCreationRules>) => void;
  resetToDefaults: () => void;
  exportConfig: () => string;
  importConfig: (configJson: string) => boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_STORAGE_KEY = "nchat_channel_governance_config";

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useChannelGovernance(
  options: UseChannelGovernanceOptions = {},
): UseChannelGovernanceReturn {
  const {
    initialConfig,
    userRole = "member",
    userId = "anonymous",
    persistConfig = false,
    storageKey = DEFAULT_STORAGE_KEY,
  } = options;

  // Load persisted config if enabled
  const loadPersistedConfig = useCallback(():
    | Partial<GovernanceConfig>
    | undefined => {
    if (!persistConfig || typeof window === "undefined") return undefined;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Ignore parse errors
    }
    return undefined;
  }, [persistConfig, storageKey]);

  // Initialize service with merged config
  const [service] = useState(() => {
    const persistedConfig = loadPersistedConfig();
    const mergedConfig = { ...persistedConfig, ...initialConfig };
    return createGovernanceService(mergedConfig);
  });

  const [config, setConfig] = useState<GovernanceConfig>(() =>
    service.getConfig(),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<
    ChannelApprovalRequest[]
  >([]);
  const [auditLog, setAuditLog] = useState<GovernanceAuditEntry[]>([]);

  // Persist config when it changes
  useEffect(() => {
    if (!persistConfig || typeof window === "undefined") return;

    try {
      localStorage.setItem(storageKey, JSON.stringify(config));
    } catch {
      // Ignore storage errors
    }
  }, [config, persistConfig, storageKey]);

  // Refresh pending approvals
  const refreshPendingApprovals = useCallback(() => {
    setPendingApprovals(service.getPendingApprovals());
  }, [service]);

  // Refresh audit log
  const refreshAuditLog = useCallback(() => {
    setAuditLog(service.getAuditLog({ limit: 100 }));
  }, [service]);

  // ===========================================================================
  // NAMING POLICY
  // ===========================================================================

  const validateName = useCallback(
    (name: string): NamingValidationResult => {
      return service.validateChannelName(name);
    },
    [service],
  );

  const sanitizeName = useCallback(
    (name: string): string => {
      return service.sanitizeChannelName(name);
    },
    [service],
  );

  const isReservedName = useCallback(
    (name: string): boolean => {
      return service.isReservedName(name);
    },
    [service],
  );

  const generateSlug = useCallback(
    (name: string, existingSlugs: string[] = []): string => {
      return service.generateSlug(name, existingSlugs);
    },
    [service],
  );

  // ===========================================================================
  // DEFAULT CHANNELS
  // ===========================================================================

  const addDefaultChannel = useCallback(
    (channel: DefaultChannelConfig) => {
      try {
        service.addDefaultChannel(channel);
        setConfig(service.getConfig());
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Failed to add default channel",
        );
      }
    },
    [service],
  );

  const removeDefaultChannel = useCallback(
    (channelId: string): boolean => {
      const result = service.removeDefaultChannel(channelId);
      if (result) {
        setConfig(service.getConfig());
      }
      return result;
    },
    [service],
  );

  const updateDefaultChannel = useCallback(
    (channelId: string, updates: Partial<DefaultChannelConfig>): boolean => {
      const result = service.updateDefaultChannel(channelId, updates);
      if (result) {
        setConfig(service.getConfig());
      }
      return result;
    },
    [service],
  );

  // ===========================================================================
  // TEMPLATES
  // ===========================================================================

  const templates = useMemo(() => service.getTemplates(), [service, config]);

  const getTemplateById = useCallback(
    (templateId: string) => service.getTemplateById(templateId),
    [service],
  );

  const getTemplatesByType = useCallback(
    (type: ChannelType) => service.getTemplatesByType(type),
    [service],
  );

  const createTemplate = useCallback(
    (
      template: Omit<
        GovernanceChannelTemplate,
        "id" | "isBuiltIn" | "createdAt"
      >,
    ): GovernanceChannelTemplate => {
      const newTemplate = service.createTemplate(template);
      setConfig(service.getConfig());
      return newTemplate;
    },
    [service],
  );

  const updateTemplate = useCallback(
    (
      templateId: string,
      updates: Partial<GovernanceChannelTemplate>,
    ): boolean => {
      const result = service.updateTemplate(templateId, updates);
      if (result) {
        setConfig(service.getConfig());
      }
      return result;
    },
    [service],
  );

  const deleteTemplate = useCallback(
    (templateId: string): boolean => {
      const result = service.deleteTemplate(templateId);
      if (result) {
        setConfig(service.getConfig());
      }
      return result;
    },
    [service],
  );

  const applyTemplate = useCallback(
    (
      templateId: string,
      overrides?: { name?: string; description?: string },
    ) => {
      return service.applyTemplate(templateId, overrides);
    },
    [service],
  );

  // ===========================================================================
  // ARCHIVAL POLICY
  // ===========================================================================

  const updateArchivalPolicy = useCallback(
    (updates: Partial<ArchivalPolicy>) => {
      service.updateArchivalPolicy(updates);
      setConfig(service.getConfig());
    },
    [service],
  );

  const shouldAutoArchive = useCallback(
    (channel: {
      id: string;
      type: ChannelType;
      isDefault: boolean;
      memberCount: number;
      lastMessageAt?: string | null;
    }) => service.shouldAutoArchive(channel),
    [service],
  );

  const shouldWarnBeforeArchive = useCallback(
    (channel: {
      id: string;
      type: ChannelType;
      isDefault: boolean;
      memberCount: number;
      lastMessageAt?: string | null;
    }) => service.shouldWarnBeforeArchive(channel),
    [service],
  );

  const getChannelsToArchive = useCallback(
    (
      channels: Array<{
        id: string;
        name: string;
        type: ChannelType;
        isDefault: boolean;
        memberCount: number;
        lastMessageAt?: string | null;
      }>,
    ) => service.getChannelsToArchive(channels),
    [service],
  );

  // ===========================================================================
  // CHANNEL CREATION
  // ===========================================================================

  const canCreateChannel = useCallback(
    (channelType: ChannelType) => {
      return service.canCreateChannel(userRole, channelType, userId);
    },
    [service, userRole, userId],
  );

  const requestChannelApproval = useCallback(
    (
      channelName: string,
      channelType: ChannelType,
      description: string,
    ): ChannelApprovalRequest => {
      const request = service.requestChannelApproval(
        channelName,
        channelType,
        description,
        userId,
      );
      refreshPendingApprovals();
      return request;
    },
    [service, userId, refreshPendingApprovals],
  );

  const approveChannelRequest = useCallback(
    (requestId: string): ChannelApprovalRequest | null => {
      try {
        const result = service.approveChannelRequest(
          requestId,
          userId,
          userRole,
        );
        refreshPendingApprovals();
        return result;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to approve request");
        return null;
      }
    },
    [service, userId, userRole, refreshPendingApprovals],
  );

  const rejectChannelRequest = useCallback(
    (requestId: string, reason: string): ChannelApprovalRequest | null => {
      try {
        const result = service.rejectChannelRequest(
          requestId,
          userId,
          userRole,
          reason,
        );
        refreshPendingApprovals();
        return result;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to reject request");
        return null;
      }
    },
    [service, userId, userRole, refreshPendingApprovals],
  );

  const recordChannelCreation = useCallback(() => {
    service.recordChannelCreation(userId);
  }, [service, userId]);

  const recordChannelDeletion = useCallback(() => {
    service.recordChannelDeletion(userId);
  }, [service, userId]);

  // ===========================================================================
  // LIFECYCLE HOOKS
  // ===========================================================================

  const registerHook = useCallback(
    (hook: LifecycleHook) => {
      try {
        service.registerHook(hook);
        setConfig(service.getConfig());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to register hook");
      }
    },
    [service],
  );

  const unregisterHook = useCallback(
    (hookId: string): boolean => {
      const result = service.unregisterHook(hookId);
      if (result) {
        setConfig(service.getConfig());
      }
      return result;
    },
    [service],
  );

  const getHooksByType = useCallback(
    (type: LifecycleHookType) => service.getHooksByType(type),
    [service],
  );

  const triggerHook = useCallback(
    async (type: LifecycleHookType, payload: Record<string, unknown>) => {
      setIsLoading(true);
      try {
        const results = await service.triggerHook(type, payload);
        return results;
      } finally {
        setIsLoading(false);
      }
    },
    [service],
  );

  // ===========================================================================
  // AUDIT LOG
  // ===========================================================================

  const logAction = useCallback(
    (
      action: string,
      details: Record<string, unknown>,
      channelId?: string,
      channelName?: string,
    ): GovernanceAuditEntry => {
      const entry = service.logAction(
        action,
        userId,
        userRole,
        details,
        channelId,
        channelName,
      );
      refreshAuditLog();
      return entry;
    },
    [service, userId, userRole, refreshAuditLog],
  );

  const getAuditLog = useCallback(
    (options?: {
      limit?: number;
      offset?: number;
      action?: string;
      channelId?: string;
      userId?: string;
      startDate?: string;
      endDate?: string;
    }) => service.getAuditLog(options),
    [service],
  );

  // ===========================================================================
  // CONFIGURATION
  // ===========================================================================

  const updateConfig = useCallback(
    (updates: Partial<GovernanceConfig>) => {
      service.updateConfig(updates);
      setConfig(service.getConfig());
    },
    [service],
  );

  const updateNamingPolicy = useCallback(
    (updates: Partial<NamingPolicy>) => {
      service.updateConfig({
        namingPolicy: { ...config.namingPolicy, ...updates },
      });
      setConfig(service.getConfig());
    },
    [service, config.namingPolicy],
  );

  const updateCreationRules = useCallback(
    (updates: Partial<ChannelCreationRules>) => {
      service.updateConfig({
        creationRules: { ...config.creationRules, ...updates },
      });
      setConfig(service.getConfig());
    },
    [service, config.creationRules],
  );

  const resetToDefaults = useCallback(() => {
    service.resetToDefaults();
    setConfig(service.getConfig());
  }, [service]);

  const exportConfig = useCallback((): string => {
    return JSON.stringify(service.getConfig(), null, 2);
  }, [service]);

  const importConfig = useCallback(
    (configJson: string): boolean => {
      try {
        const imported = JSON.parse(configJson) as Partial<GovernanceConfig>;
        service.updateConfig(imported);
        setConfig(service.getConfig());
        return true;
      } catch {
        setError("Invalid configuration JSON");
        return false;
      }
    },
    [service],
  );

  // ===========================================================================
  // RETURN
  // ===========================================================================

  return {
    // State
    config,
    isLoading,
    error,

    // Naming Policy
    namingPolicy: config.namingPolicy,
    validateName,
    sanitizeName,
    isReservedName,
    generateSlug,

    // Default Channels
    defaultChannels: config.defaultChannels,
    addDefaultChannel,
    removeDefaultChannel,
    updateDefaultChannel,

    // Templates
    templates,
    getTemplateById,
    getTemplatesByType,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    applyTemplate,

    // Archival Policy
    archivalPolicy: config.archivalPolicy,
    updateArchivalPolicy,
    shouldAutoArchive,
    shouldWarnBeforeArchive,
    getChannelsToArchive,

    // Channel Creation
    creationRules: config.creationRules,
    canCreateChannel,
    requestChannelApproval,
    approveChannelRequest,
    rejectChannelRequest,
    pendingApprovals,
    recordChannelCreation,
    recordChannelDeletion,

    // Lifecycle Hooks
    lifecycleHooks: config.lifecycleHooks,
    registerHook,
    unregisterHook,
    getHooksByType,
    triggerHook,

    // Audit Log
    auditLog,
    logAction,
    getAuditLog,

    // Configuration
    updateConfig,
    updateNamingPolicy,
    updateCreationRules,
    resetToDefaults,
    exportConfig,
    importConfig,
  };
}

export default useChannelGovernance;
