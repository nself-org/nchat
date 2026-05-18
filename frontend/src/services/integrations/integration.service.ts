/**
 * Integration Service
 *
 * Orchestrates connectors, installation management, credential management,
 * and health monitoring for the integration catalog.
 */

import {
  IntegrationRegistry,
  CredentialVault,
  HealthMonitor,
} from "@/lib/integrations/catalog/registry";
import { SyncEngine } from "@/lib/integrations/catalog/sync-engine";
import { CalendarConnector } from "@/lib/integrations/connectors/calendar";
import { TicketingConnector } from "@/lib/integrations/connectors/ticketing";
import { CICDConnector } from "@/lib/integrations/connectors/ci-cd";
import { DocsConnector } from "@/lib/integrations/connectors/docs";
import { CRMConnector } from "@/lib/integrations/connectors/crm";
import type {
  CatalogEntry,
  ConnectorConfig,
  ConnectorCredentials,
  InstalledIntegration,
  IntegrationCatalogCategory,
  SyncResult,
  HealthCheckResult,
  IntegrationMetrics,
} from "@/lib/integrations/catalog/types";

// ============================================================================
// Integration Service
// ============================================================================

export class IntegrationService {
  private registry: IntegrationRegistry;
  private syncEngine: SyncEngine;
  private initialized = false;

  constructor(options?: {
    encryptionKey?: string;
    healthCheckIntervalMs?: number;
    maxConsecutiveFailures?: number;
  }) {
    const vault = new CredentialVault();
    if (options?.encryptionKey) {
      vault.setEncryptionKey(options.encryptionKey);
    }

    const healthMonitor = new HealthMonitor({
      checkIntervalMs: options?.healthCheckIntervalMs ?? 300_000, // 5 minutes
      maxConsecutiveFailures: options?.maxConsecutiveFailures ?? 5,
    });

    this.registry = new IntegrationRegistry({ vault, healthMonitor });
    this.syncEngine = new SyncEngine({
      maxQueueSize: 50_000,
      defaultMaxRetries: 3,
      onConflict: () => "latest_wins",
    });
  }

  /**
   * Initialize the service with all available connectors.
   */
  initialize(): void {
    if (this.initialized) return;

    // Register all calendar connectors
    this.registry.registerConnector(new CalendarConnector("google_calendar"));
    this.registry.registerConnector(new CalendarConnector("outlook_calendar"));

    // Register all ticketing connectors
    this.registry.registerConnector(new TicketingConnector("jira"));
    this.registry.registerConnector(new TicketingConnector("linear"));
    this.registry.registerConnector(new TicketingConnector("github_issues"));

    // Register all CI/CD connectors
    this.registry.registerConnector(new CICDConnector("github_actions"));
    this.registry.registerConnector(new CICDConnector("gitlab_ci"));
    this.registry.registerConnector(new CICDConnector("jenkins"));

    // Register all docs connectors
    this.registry.registerConnector(new DocsConnector("google_docs"));
    this.registry.registerConnector(new DocsConnector("notion"));
    this.registry.registerConnector(new DocsConnector("confluence"));

    // Register all CRM connectors
    this.registry.registerConnector(new CRMConnector("salesforce"));
    this.registry.registerConnector(new CRMConnector("hubspot"));

    this.initialized = true;
  }

  // ==========================================================================
  // Catalog
  // ==========================================================================

  /**
   * Get all available integrations.
   */
  getCatalog(): CatalogEntry[] {
    this.ensureInitialized();
    return this.registry.getCatalog();
  }

  /**
   * Get a specific catalog entry.
   */
  getCatalogEntry(id: string): CatalogEntry | null {
    this.ensureInitialized();
    return this.registry.getCatalogEntry(id);
  }

  /**
   * Search the catalog.
   */
  searchCatalog(query: string): CatalogEntry[] {
    this.ensureInitialized();
    return this.registry.searchCatalog(query);
  }

  /**
   * Filter catalog by category.
   */
  filterByCategory(category: IntegrationCatalogCategory): CatalogEntry[] {
    this.ensureInitialized();
    return this.registry.filterByCategory(category);
  }

  // ==========================================================================
  // Installation Management
  // ==========================================================================

  /**
   * Install an integration.
   */
  async install(
    catalogId: string,
    config: ConnectorConfig,
    credentials: ConnectorCredentials,
  ): Promise<InstalledIntegration> {
    this.ensureInitialized();
    return this.registry.install(catalogId, config, credentials);
  }

  /**
   * Configure an installed integration.
   */
  async configure(
    installationId: string,
    updates: Partial<ConnectorConfig>,
  ): Promise<InstalledIntegration> {
    this.ensureInitialized();
    return this.registry.configure(installationId, updates);
  }

  /**
   * Enable an installed integration.
   */
  async enable(installationId: string): Promise<InstalledIntegration> {
    this.ensureInitialized();
    return this.registry.enable(installationId);
  }

  /**
   * Disable an installed integration.
   */
  async disable(installationId: string): Promise<InstalledIntegration> {
    this.ensureInitialized();
    return this.registry.disable(installationId);
  }

  /**
   * Uninstall an integration.
   */
  async uninstall(installationId: string): Promise<void> {
    this.ensureInitialized();
    this.syncEngine.clearIntegrationQueue(installationId);
    return this.registry.uninstall(installationId);
  }

  /**
   * Get all installed integrations.
   */
  getInstalled(): InstalledIntegration[] {
    this.ensureInitialized();
    return this.registry.getInstallations();
  }

  /**
   * Get a specific installation.
   */
  getInstallation(installationId: string): InstalledIntegration | null {
    this.ensureInitialized();
    return this.registry.getInstallation(installationId);
  }

  // ==========================================================================
  // Sync
  // ==========================================================================

  /**
   * Trigger a sync for an installation.
   */
  async triggerSync(
    installationId: string,
    options?: { fullResync?: boolean; entityType?: string },
  ): Promise<SyncResult[]> {
    this.ensureInitialized();

    const installation = this.registry.getInstallation(installationId);
    if (!installation) {
      throw new Error(`Installation "${installationId}" not found`);
    }

    if (!installation.enabled) {
      throw new Error(`Installation "${installationId}" is not enabled`);
    }

    // Process the queue
    const results = await this.syncEngine.processQueue(async (item) => {
      // The actual sync logic would be implemented by each connector
      // For now, mark as processed
      await Promise.resolve();
    });

    return results;
  }

  /**
   * Get sync status for an installation.
   */
  getSyncStatus(installationId: string, entityType: string) {
    return this.syncEngine.getSyncState(installationId, entityType);
  }

  /**
   * Get the sync engine instance.
   */
  getSyncEngine(): SyncEngine {
    return this.syncEngine;
  }

  // ==========================================================================
  // Health & Metrics
  // ==========================================================================

  /**
   * Get health for an installation.
   */
  getHealth(installationId: string): HealthCheckResult | null {
    this.ensureInitialized();
    return this.registry.getHealth(installationId);
  }

  /**
   * Get metrics for an installation.
   */
  getMetrics(installationId: string): IntegrationMetrics | null {
    this.ensureInitialized();
    return this.registry.getMetrics(installationId);
  }

  // ==========================================================================
  // Lifecycle
  // ==========================================================================

  /**
   * Shut down the service.
   */
  async shutdown(): Promise<void> {
    await this.registry.shutdown();
    this.syncEngine.clearQueue();
    this.initialized = false;
  }

  /**
   * Get the registry instance (for advanced usage).
   */
  getRegistry(): IntegrationRegistry {
    return this.registry;
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      this.initialize();
    }
  }
}

// ============================================================================
// Singleton
// ============================================================================

let serviceInstance: IntegrationService | null = null;

export function getIntegrationService(): IntegrationService {
  if (!serviceInstance) {
    serviceInstance = new IntegrationService();
    serviceInstance.initialize();
  }
  return serviceInstance;
}

export function resetIntegrationService(): void {
  if (serviceInstance) {
    serviceInstance.shutdown();
  }
  serviceInstance = null;
}
