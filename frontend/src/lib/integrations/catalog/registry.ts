/**
 * Integration Registry
 *
 * Manages the catalog of available integrations, installation lifecycle,
 * credential vault, health monitoring, and usage metrics.
 */

import { BaseConnector } from "./base-connector";
import {
  type CatalogEntry,
  type ConnectorConfig,
  type ConnectorCredentials,
  type ConnectorStatus,
  type HealthCheckResult,
  type IntegrationMetrics,
  type IntegrationCatalogCategory,
  type InstalledIntegration,
  ConnectorError,
} from "./types";

// ============================================================================
// Credential Vault
// ============================================================================

/**
 * Secure credential vault for storing integration credentials.
 */
export class CredentialVault {
  private credentials: Map<string, ConnectorCredentials> = new Map();
  private encryptionKey: string | null = null;

  /**
   * Set the encryption key for encrypting credentials at rest.
   */
  setEncryptionKey(key: string): void {
    this.encryptionKey = key;
  }

  /**
   * Store credentials for an integration.
   */
  async store(
    integrationId: string,
    credentials: ConnectorCredentials,
  ): Promise<void> {
    if (this.encryptionKey) {
      const encrypted = await BaseConnector.encryptCredentials(
        credentials,
        this.encryptionKey,
      );
      this.credentials.set(integrationId, {
        ...credentials,
        encrypted: true,
        accessToken: encrypted,
      });
    } else {
      this.credentials.set(integrationId, { ...credentials, encrypted: false });
    }
  }

  /**
   * Retrieve credentials for an integration.
   */
  async retrieve(integrationId: string): Promise<ConnectorCredentials | null> {
    const stored = this.credentials.get(integrationId);
    if (!stored) return null;

    if (stored.encrypted && this.encryptionKey) {
      return BaseConnector.decryptCredentials(
        stored.accessToken,
        this.encryptionKey,
      );
    }

    return stored;
  }

  /**
   * Remove credentials for an integration.
   */
  remove(integrationId: string): void {
    this.credentials.delete(integrationId);
  }

  /**
   * Check if credentials exist for an integration.
   */
  has(integrationId: string): boolean {
    return this.credentials.has(integrationId);
  }

  /**
   * List all integration IDs with stored credentials.
   */
  listIds(): string[] {
    return Array.from(this.credentials.keys());
  }

  /**
   * Clear all stored credentials.
   */
  clear(): void {
    this.credentials.clear();
  }
}

// ============================================================================
// Health Monitor
// ============================================================================

/**
 * Health monitor for periodic health checks and auto-disable on failure.
 */
export class HealthMonitor {
  private intervals: Map<string, ReturnType<typeof setInterval>> = new Map();
  private results: Map<string, HealthCheckResult[]> = new Map();
  private maxConsecutiveFailures: number;
  private checkIntervalMs: number;
  private onAutoDisable?: (integrationId: string, reason: string) => void;

  constructor(options?: {
    maxConsecutiveFailures?: number;
    checkIntervalMs?: number;
    onAutoDisable?: (integrationId: string, reason: string) => void;
  }) {
    this.maxConsecutiveFailures = options?.maxConsecutiveFailures ?? 3;
    this.checkIntervalMs = options?.checkIntervalMs ?? 60_000;
    this.onAutoDisable = options?.onAutoDisable;
  }

  /**
   * Start monitoring an integration connector.
   */
  startMonitoring(integrationId: string, connector: BaseConnector): void {
    this.stopMonitoring(integrationId);

    const check = async () => {
      try {
        const result = await connector.healthCheck();
        const history = this.results.get(integrationId) || [];
        history.push(result);
        if (history.length > 20) history.shift();
        this.results.set(integrationId, history);

        // Check for consecutive failures
        if (result.consecutiveFailures >= this.maxConsecutiveFailures) {
          this.onAutoDisable?.(
            integrationId,
            `${result.consecutiveFailures} consecutive health check failures: ${result.message}`,
          );
          this.stopMonitoring(integrationId);
        }
      } catch {
        // Health check itself failed - count it
        const history = this.results.get(integrationId) || [];
        const failures =
          history.length > 0
            ? (history[history.length - 1].consecutiveFailures || 0) + 1
            : 1;
        history.push({
          healthy: false,
          responseTimeMs: 0,
          message: "Health check execution failed",
          checkedAt: new Date().toISOString(),
          consecutiveFailures: failures,
        });
        if (history.length > 20) history.shift();
        this.results.set(integrationId, history);

        if (failures >= this.maxConsecutiveFailures) {
          this.onAutoDisable?.(
            integrationId,
            `${failures} consecutive health check failures`,
          );
          this.stopMonitoring(integrationId);
        }
      }
    };

    // Run initial check
    check();

    // Set up periodic checks
    const interval = setInterval(check, this.checkIntervalMs);
    this.intervals.set(integrationId, interval);
  }

  /**
   * Stop monitoring an integration.
   */
  stopMonitoring(integrationId: string): void {
    const interval = this.intervals.get(integrationId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(integrationId);
    }
  }

  /**
   * Get health check history for an integration.
   */
  getHistory(integrationId: string): HealthCheckResult[] {
    return this.results.get(integrationId) || [];
  }

  /**
   * Get latest health check result.
   */
  getLatest(integrationId: string): HealthCheckResult | null {
    const history = this.results.get(integrationId) || [];
    return history.length > 0 ? history[history.length - 1] : null;
  }

  /**
   * Check if an integration is currently being monitored.
   */
  isMonitoring(integrationId: string): boolean {
    return this.intervals.has(integrationId);
  }

  /**
   * Stop all monitoring.
   */
  stopAll(): void {
    for (const [id] of this.intervals) {
      this.stopMonitoring(id);
    }
  }
}

// ============================================================================
// Integration Registry
// ============================================================================

/**
 * Registry manages the catalog, installation lifecycle, and connector instances.
 */
export class IntegrationRegistry {
  private catalog: Map<string, CatalogEntry> = new Map();
  private connectors: Map<string, BaseConnector> = new Map();
  private installations: Map<string, InstalledIntegration> = new Map();
  private vault: CredentialVault;
  private healthMonitor: HealthMonitor;

  constructor(options?: {
    vault?: CredentialVault;
    healthMonitor?: HealthMonitor;
  }) {
    this.vault = options?.vault ?? new CredentialVault();
    this.healthMonitor =
      options?.healthMonitor ??
      new HealthMonitor({
        onAutoDisable: (id, reason) => this.disableIntegration(id, reason),
      });
  }

  // ==========================================================================
  // Catalog Management
  // ==========================================================================

  /**
   * Register a connector in the catalog.
   */
  registerConnector(connector: BaseConnector): void {
    const entry = connector.getCatalogEntry();
    this.catalog.set(entry.id, entry);
    this.connectors.set(entry.id, connector);
  }

  /**
   * Unregister a connector from the catalog.
   */
  unregisterConnector(connectorId: string): void {
    this.catalog.delete(connectorId);
    this.connectors.delete(connectorId);
  }

  /**
   * Get all catalog entries.
   */
  getCatalog(): CatalogEntry[] {
    return Array.from(this.catalog.values());
  }

  /**
   * Get a catalog entry by ID.
   */
  getCatalogEntry(id: string): CatalogEntry | null {
    return this.catalog.get(id) || null;
  }

  /**
   * Search the catalog.
   */
  searchCatalog(query: string): CatalogEntry[] {
    const lower = query.toLowerCase();
    return this.getCatalog().filter(
      (e) =>
        e.name.toLowerCase().includes(lower) ||
        e.description.toLowerCase().includes(lower) ||
        e.category.toLowerCase().includes(lower),
    );
  }

  /**
   * Filter catalog by category.
   */
  filterByCategory(category: IntegrationCatalogCategory): CatalogEntry[] {
    return this.getCatalog().filter((e) => e.category === category);
  }

  // ==========================================================================
  // Installation Lifecycle
  // ==========================================================================

  /**
   * Install an integration.
   */
  async install(
    catalogId: string,
    config: ConnectorConfig,
    credentials: ConnectorCredentials,
  ): Promise<InstalledIntegration> {
    const entry = this.catalog.get(catalogId);
    if (!entry) {
      throw new ConnectorError(
        `Integration "${catalogId}" not found in catalog`,
        "config",
        catalogId,
      );
    }

    const connector = this.connectors.get(catalogId);
    if (!connector) {
      throw new ConnectorError(
        `Connector "${catalogId}" not registered`,
        "config",
        catalogId,
      );
    }

    // Store credentials
    await this.vault.store(config.id, credentials);

    // Connect the connector
    await connector.connect(config, credentials);

    // Create installation record
    const installation: InstalledIntegration = {
      id: config.id,
      catalogId,
      config,
      status: "connected",
      metrics: connector.getMetrics(),
      enabled: true,
    };

    this.installations.set(config.id, installation);

    // Start health monitoring
    this.healthMonitor.startMonitoring(config.id, connector);

    return installation;
  }

  /**
   * Configure an existing installation.
   */
  async configure(
    installationId: string,
    updates: Partial<ConnectorConfig>,
  ): Promise<InstalledIntegration> {
    const installation = this.installations.get(installationId);
    if (!installation) {
      throw new ConnectorError(
        `Installation "${installationId}" not found`,
        "config",
        installationId,
      );
    }

    // Update config
    installation.config = {
      ...installation.config,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.installations.set(installationId, installation);

    return installation;
  }

  /**
   * Enable an installation.
   */
  async enable(installationId: string): Promise<InstalledIntegration> {
    const installation = this.installations.get(installationId);
    if (!installation) {
      throw new ConnectorError(
        `Installation "${installationId}" not found`,
        "config",
        installationId,
      );
    }

    const connector = this.connectors.get(installation.catalogId);
    if (!connector) {
      throw new ConnectorError(
        `Connector "${installation.catalogId}" not found`,
        "config",
        installationId,
      );
    }

    const credentials = await this.vault.retrieve(installationId);
    if (!credentials) {
      throw new ConnectorError("No credentials found", "auth", installationId);
    }

    await connector.connect(installation.config, credentials);
    installation.enabled = true;
    installation.status = "connected";
    this.installations.set(installationId, installation);

    this.healthMonitor.startMonitoring(installationId, connector);

    return installation;
  }

  /**
   * Disable an installation.
   */
  async disable(installationId: string): Promise<InstalledIntegration> {
    const installation = this.installations.get(installationId);
    if (!installation) {
      throw new ConnectorError(
        `Installation "${installationId}" not found`,
        "config",
        installationId,
      );
    }

    const connector = this.connectors.get(installation.catalogId);
    if (connector) {
      await connector.disconnect();
    }

    this.healthMonitor.stopMonitoring(installationId);

    installation.enabled = false;
    installation.status = "disabled";
    this.installations.set(installationId, installation);

    return installation;
  }

  /**
   * Uninstall an integration.
   */
  async uninstall(installationId: string): Promise<void> {
    const installation = this.installations.get(installationId);
    if (!installation) {
      throw new ConnectorError(
        `Installation "${installationId}" not found`,
        "config",
        installationId,
      );
    }

    const connector = this.connectors.get(installation.catalogId);
    if (connector && connector.isConnected()) {
      await connector.disconnect();
    }

    this.healthMonitor.stopMonitoring(installationId);
    this.vault.remove(installationId);
    this.installations.delete(installationId);
  }

  // ==========================================================================
  // Installation Queries
  // ==========================================================================

  /**
   * Get all installations.
   */
  getInstallations(): InstalledIntegration[] {
    return Array.from(this.installations.values());
  }

  /**
   * Get a specific installation.
   */
  getInstallation(installationId: string): InstalledIntegration | null {
    return this.installations.get(installationId) || null;
  }

  /**
   * Get installations filtered by status.
   */
  getInstallationsByStatus(status: ConnectorStatus): InstalledIntegration[] {
    return this.getInstallations().filter((i) => i.status === status);
  }

  /**
   * Get the connector instance for a catalog entry.
   */
  getConnector(catalogId: string): BaseConnector | null {
    return this.connectors.get(catalogId) || null;
  }

  // ==========================================================================
  // Health & Metrics
  // ==========================================================================

  /**
   * Get health status for an installation.
   */
  getHealth(installationId: string): HealthCheckResult | null {
    return this.healthMonitor.getLatest(installationId);
  }

  /**
   * Get metrics for an installation.
   */
  getMetrics(installationId: string): IntegrationMetrics | null {
    const installation = this.installations.get(installationId);
    if (!installation) return null;

    const connector = this.connectors.get(installation.catalogId);
    if (!connector) return null;

    return connector.getMetrics();
  }

  /**
   * Auto-disable an integration due to health check failures.
   */
  private async disableIntegration(
    installationId: string,
    reason: string,
  ): Promise<void> {
    const installation = this.installations.get(installationId);
    if (!installation) return;

    installation.enabled = false;
    installation.status = "error";
    installation.health = {
      healthy: false,
      responseTimeMs: 0,
      message: `Auto-disabled: ${reason}`,
      checkedAt: new Date().toISOString(),
      consecutiveFailures: 0,
    };

    const connector = this.connectors.get(installation.catalogId);
    if (connector) {
      try {
        await connector.disconnect();
      } catch {
        // Best effort disconnect
      }
    }

    this.installations.set(installationId, installation);
  }

  // ==========================================================================
  // Credential Vault Access
  // ==========================================================================

  getVault(): CredentialVault {
    return this.vault;
  }

  getHealthMonitor(): HealthMonitor {
    return this.healthMonitor;
  }

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  /**
   * Shut down the registry, disconnecting all connectors and stopping health checks.
   */
  async shutdown(): Promise<void> {
    this.healthMonitor.stopAll();

    for (const [, connector] of this.connectors) {
      if (connector.isConnected()) {
        try {
          await connector.disconnect();
        } catch {
          // Best effort
        }
      }
    }

    this.installations.clear();
    this.vault.clear();
  }
}
