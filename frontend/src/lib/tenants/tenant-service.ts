/**
 * Tenant Service
 *
 * Core service for managing tenants in the multi-tenant system.
 * Handles tenant CRUD operations, schema provisioning, and isolation.
 */

import { Pool } from "pg";
import { DEFAULT_PLANS } from "./types";
import type {
  Tenant,
  CreateTenantRequest,
  UpdateTenantRequest,
  TenantContext,
  TenantUsage,
  TenantSettings,
  BillingPlan,
} from "./types";

/**
 * Tenant Service Class
 */
export class TenantService {
  private pool: Pool;

  constructor(connectionString?: string) {
    this.pool = new Pool({
      connectionString: connectionString || process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  /**
   * Create a new tenant
   */
  async createTenant(request: CreateTenantRequest): Promise<Tenant> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      // 1. Validate slug uniqueness
      const slugExists = await this.checkSlugExists(request.slug);
      if (slugExists) {
        throw new Error(`Tenant slug "${request.slug}" already exists`);
      }

      // 2. Generate schema name (prefixed to avoid conflicts)
      // Validate slug is safe for SQL identifier use (alphanumeric + underscore only)
      if (!/^[a-zA-Z0-9_]+$/.test(request.slug)) {
        throw new Error(
          "Invalid tenant slug: only alphanumeric characters and underscores are allowed",
        );
      }
      const schemaName = `tenant_${request.slug}`;

      // 3. Get plan configuration
      const plan = request.plan || "free";
      const planConfig = DEFAULT_PLANS[plan];

      // 4. Calculate trial end date (14 days)
      const trialEndsAt = request.trial
        ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
        : undefined;

      // 5. Insert tenant record
      const tenantQuery = `
        INSERT INTO public.tenants (
          name, slug, status, owner_email, owner_name,
          schema_name, billing_plan, billing_interval,
          limits, features, trial_ends_at, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;

      const tenantResult = await client.query(tenantQuery, [
        request.name,
        request.slug,
        request.trial ? "trial" : "active",
        request.ownerEmail,
        request.ownerName,
        schemaName,
        plan,
        "monthly",
        JSON.stringify(planConfig.limits),
        JSON.stringify(planConfig.features),
        trialEndsAt,
        JSON.stringify(request.metadata || {}),
      ]);

      const tenant = this.mapRowToTenant(tenantResult.rows[0]);

      // 6. Create PostgreSQL schema for tenant
      // sast-ignore: SQL_INJECTION -- schemaName validated above (alphanumeric + underscore only)
      await client.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);

      // 7. Run migrations for tenant schema
      await this.runTenantMigrations(client, schemaName);

      // 8. Create owner user in tenant schema
      await this.createOwnerUser(client, schemaName, request);

      // 9. Initialize tenant settings
      await this.initializeTenantSettings(client, tenant.id);

      await client.query("COMMIT");

      return tenant;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get tenant by ID
   */
  async getTenantById(id: string): Promise<Tenant | null> {
    const query = "SELECT * FROM public.tenants WHERE id = $1";
    const result = await this.pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToTenant(result.rows[0]);
  }

  /**
   * Get tenant by slug (subdomain)
   */
  async getTenantBySlug(slug: string): Promise<Tenant | null> {
    const query = "SELECT * FROM public.tenants WHERE slug = $1";
    const result = await this.pool.query(query, [slug]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToTenant(result.rows[0]);
  }

  /**
   * Get tenant by custom domain
   */
  async getTenantByDomain(domain: string): Promise<Tenant | null> {
    const query = "SELECT * FROM public.tenants WHERE custom_domain = $1";
    const result = await this.pool.query(query, [domain]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToTenant(result.rows[0]);
  }

  /**
   * Update tenant
   */
  async updateTenant(
    id: string,
    request: UpdateTenantRequest,
  ): Promise<Tenant> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (request.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(request.name);
    }

    if (request.customDomain !== undefined) {
      updates.push(`custom_domain = $${paramIndex++}`);
      values.push(request.customDomain);
    }

    if (request.branding !== undefined) {
      updates.push(`branding = branding || $${paramIndex++}::jsonb`);
      values.push(JSON.stringify(request.branding));
    }

    if (request.limits !== undefined) {
      updates.push(`limits = limits || $${paramIndex++}::jsonb`);
      values.push(JSON.stringify(request.limits));
    }

    if (request.features !== undefined) {
      updates.push(`features = features || $${paramIndex++}::jsonb`);
      values.push(JSON.stringify(request.features));
    }

    if (request.metadata !== undefined) {
      updates.push(`metadata = metadata || $${paramIndex++}::jsonb`);
      values.push(JSON.stringify(request.metadata));
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE public.tenants
      SET ${updates.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);

    if (result.rows.length === 0) {
      throw new Error(`Tenant not found: ${id}`);
    }

    return this.mapRowToTenant(result.rows[0]);
  }

  /**
   * Delete tenant (soft delete)
   */
  async deleteTenant(id: string): Promise<void> {
    const query = `
      UPDATE public.tenants
      SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
      WHERE id = $1
    `;

    await this.pool.query(query, [id]);
  }

  /**
   * Hard delete tenant (removes schema and all data)
   */
  async hardDeleteTenant(id: string): Promise<void> {
    const tenant = await this.getTenantById(id);
    if (!tenant) {
      throw new Error(`Tenant not found: ${id}`);
    }

    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      // Drop tenant schema (CASCADE removes all objects)
      // sast-ignore: SQL_INJECTION -- schemaName from DB record, validated as alphanumeric+underscore at creation
      await client.query(`DROP SCHEMA IF EXISTS ${tenant.schemaName} CASCADE`);

      // Delete tenant record
      await client.query("DELETE FROM public.tenants WHERE id = $1", [id]);

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * List all tenants
   */
  async listTenants(filters?: {
    status?: string;
    plan?: BillingPlan;
    limit?: number;
    offset?: number;
  }): Promise<{ tenants: Tenant[]; total: number }> {
    const whereClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters?.status) {
      whereClauses.push(`status = $${paramIndex++}`);
      values.push(filters.status);
    }

    if (filters?.plan) {
      whereClauses.push(`billing_plan = $${paramIndex++}`);
      values.push(filters.plan);
    }

    const whereClause =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM public.tenants ${whereClause}`;
    const countResult = await this.pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    // Get tenants
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    const query = `
      SELECT * FROM public.tenants
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++}
      OFFSET $${paramIndex}
    `;

    const result = await this.pool.query(query, [...values, limit, offset]);

    return {
      tenants: result.rows.map(this.mapRowToTenant),
      total,
    };
  }

  /**
   * Get tenant usage statistics
   */
  async getTenantUsage(
    tenantId: string,
    period: string,
  ): Promise<TenantUsage | null> {
    const query = `
      SELECT * FROM public.tenant_usage
      WHERE tenant_id = $1 AND period = $2
    `;

    const result = await this.pool.query(query, [tenantId, period]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToTenantUsage(result.rows[0]);
  }

  /**
   * Update tenant usage (incremental)
   */
  async updateTenantUsage(
    tenantId: string,
    updates: Partial<TenantUsage>,
  ): Promise<void> {
    const period = new Date().toISOString().slice(0, 7); // YYYY-MM

    // Use INSERT ... ON CONFLICT to update or create
    const query = `
      INSERT INTO public.tenant_usage (
        tenant_id, period, users_active, users_total,
        messages_sent, messages_total, storage_bytes,
        files_count, calls_total_minutes, calls_total_count,
        api_calls_total, api_calls_by_endpoint
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (tenant_id, period)
      DO UPDATE SET
        users_active = COALESCE($3, tenant_usage.users_active),
        users_total = COALESCE($4, tenant_usage.users_total),
        messages_sent = tenant_usage.messages_sent + COALESCE($5, 0),
        messages_total = tenant_usage.messages_total + COALESCE($6, 0),
        storage_bytes = COALESCE($7, tenant_usage.storage_bytes),
        files_count = tenant_usage.files_count + COALESCE($8, 0),
        calls_total_minutes = tenant_usage.calls_total_minutes + COALESCE($9, 0),
        calls_total_count = tenant_usage.calls_total_count + COALESCE($10, 0),
        api_calls_total = tenant_usage.api_calls_total + COALESCE($11, 0),
        api_calls_by_endpoint = tenant_usage.api_calls_by_endpoint || COALESCE($12, '{}'::jsonb)
    `;

    await this.pool.query(query, [
      tenantId,
      period,
      updates.users?.active,
      updates.users?.total,
      updates.messages?.sent,
      updates.messages?.total,
      updates.storage?.bytesUsed,
      updates.storage?.filesCount,
      updates.calls?.totalMinutes,
      updates.calls?.totalCalls,
      updates.apiCalls?.total,
      updates.apiCalls?.byEndpoint
        ? JSON.stringify(updates.apiCalls.byEndpoint)
        : null,
    ]);
  }

  /**
   * Check if tenant has exceeded limits
   */
  async checkLimits(tenant: Tenant): Promise<{
    exceeded: boolean;
    limits: string[];
  }> {
    const period = new Date().toISOString().slice(0, 7);
    const usage = await this.getTenantUsage(tenant.id, period);

    const exceeded: string[] = [];

    if (!usage) {
      return { exceeded: false, limits: [] };
    }

    // Check user limit
    if (
      tenant.limits.maxUsers !== -1 &&
      usage.users.total > tenant.limits.maxUsers
    ) {
      exceeded.push("maxUsers");
    }

    // Check storage limit
    if (
      tenant.limits.maxStorageGB !== -1 &&
      usage.storage.bytesUsed > tenant.limits.maxStorageGB * 1024 * 1024 * 1024
    ) {
      exceeded.push("maxStorageGB");
    }

    // Check API calls limit
    if (
      tenant.limits.maxApiCallsPerMonth !== -1 &&
      usage.apiCalls.total > tenant.limits.maxApiCallsPerMonth
    ) {
      exceeded.push("maxApiCallsPerMonth");
    }

    return {
      exceeded: exceeded.length > 0,
      limits: exceeded,
    };
  }

  // Private helper methods

  private async checkSlugExists(slug: string): Promise<boolean> {
    const query = "SELECT COUNT(*) FROM public.tenants WHERE slug = $1";
    const result = await this.pool.query(query, [slug]);
    return parseInt(result.rows[0].count) > 0;
  }

  private async runTenantMigrations(
    client: any,
    schemaName: string,
  ): Promise<void> {
    // Run all nchat_* table creation in the tenant schema
    // This creates an isolated copy of the chat schema for each tenant

    await client.query(`SET search_path TO ${schemaName}`);

    // Copy structure from nchat schema (without data)
    const tables = [
      "nchat_users",
      "nchat_channels",
      "nchat_channel_members",
      "nchat_messages",
      "nchat_reactions",
      "nchat_attachments",
      "nchat_mentions",
      "nchat_threads",
      "nchat_thread_participants",
      "nchat_bookmarks",
      "nchat_notifications",
      "nchat_read_receipts",
      "nchat_typing_indicators",
      "nchat_presence",
      "nchat_invites",
      "nchat_settings",
      "nchat_audit_log",
    ];

    for (const table of tables) {
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${schemaName}.${table}
        (LIKE nchat.${table} INCLUDING ALL)
      `);
    }

    // Reset search path
    await client.query("SET search_path TO public");
  }

  private async createOwnerUser(
    client: any,
    schemaName: string,
    request: CreateTenantRequest,
  ): Promise<void> {
    // Create owner user in tenant schema
    const query = `
      INSERT INTO ${schemaName}.nchat_users (
        auth_user_id, username, display_name, email, role, status
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, 'owner', 'active'
      )
    `;

    await client.query(query, [
      request.ownerEmail.split("@")[0],
      request.ownerName,
      request.ownerEmail,
    ]);
  }

  private async initializeTenantSettings(
    client: any,
    tenantId: string,
  ): Promise<void> {
    const query = `
      INSERT INTO public.tenant_settings (
        tenant_id, timezone, language, date_format,
        require_email_verification, require_two_factor,
        session_timeout_minutes, password_policy,
        email_notifications, message_retention_days,
        file_retention_days, audit_log_retention_days
      ) VALUES (
        $1, 'UTC', 'en', 'YYYY-MM-DD',
        true, false, 480,
        '{"minLength": 8, "requireUppercase": true, "requireLowercase": true, "requireNumbers": true, "requireSpecialChars": false}'::jsonb,
        true, 0, 0, 90
      )
    `;

    await client.query(query, [tenantId]);
  }

  private mapRowToTenant(row: any): Tenant {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      customDomain: row.custom_domain,
      status: row.status,
      ownerId: row.owner_id,
      ownerEmail: row.owner_email,
      ownerName: row.owner_name,
      branding: row.branding,
      billing: {
        plan: row.billing_plan,
        interval: row.billing_interval,
        stripeCustomerId: row.stripe_customer_id,
        stripeSubscriptionId: row.stripe_subscription_id,
        stripePriceId: row.stripe_price_id,
        currentPeriodStart: row.current_period_start,
        currentPeriodEnd: row.current_period_end,
        cancelAtPeriodEnd: row.cancel_at_period_end || false,
        usageTracking: {
          users: 0,
          storageBytes: 0,
          apiCallsThisMonth: 0,
        },
        lastPaymentDate: row.last_payment_date,
        lastPaymentAmount: row.last_payment_amount,
        lastPaymentStatus: row.last_payment_status,
      },
      limits: row.limits,
      features: row.features,
      schemaName: row.schema_name,
      metadata: row.metadata || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      trialEndsAt: row.trial_ends_at,
      suspendedAt: row.suspended_at,
      cancelledAt: row.cancelled_at,
    };
  }

  private mapRowToTenantUsage(row: any): TenantUsage {
    return {
      tenantId: row.tenant_id,
      period: row.period,
      users: {
        active: row.users_active,
        total: row.users_total,
      },
      messages: {
        sent: row.messages_sent,
        total: row.messages_total,
      },
      storage: {
        bytesUsed: row.storage_bytes,
        filesCount: row.files_count,
      },
      calls: {
        totalMinutes: row.calls_total_minutes,
        totalCalls: row.calls_total_count,
      },
      apiCalls: {
        total: row.api_calls_total,
        byEndpoint: row.api_calls_by_endpoint || {},
      },
      createdAt: row.created_at,
    };
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

// Singleton instance
let tenantService: TenantService | null = null;

export function getTenantService(): TenantService {
  if (!tenantService) {
    tenantService = new TenantService();
  }
  return tenantService;
}
