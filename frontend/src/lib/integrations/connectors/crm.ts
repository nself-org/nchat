/**
 * CRM Connector
 *
 * Supports Salesforce and HubSpot.
 * Features: contact lookup from chat, deal/opportunity notifications,
 * activity logging, lead creation from messages, pipeline stage alerts.
 */

import { BaseConnector } from "../catalog/base-connector";
import {
  type ConnectorConfig,
  type ConnectorCredentials,
  type HealthCheckResult,
  type CatalogEntry,
  type ConnectorCapability,
  type IntegrationCatalogCategory,
  type CRMContact,
  type CRMDeal,
  type CRMActivity,
  type CRMContactSearchParams,
  type CRMLeadCreateParams,
  type CRMProvider,
  ConnectorError,
} from "../catalog/types";

// ============================================================================
// CRM API Abstraction
// ============================================================================

interface CRMApiAdapter {
  searchContacts(params: CRMContactSearchParams): Promise<CRMContact[]>;
  getContact(contactId: string): Promise<CRMContact>;
  createLead(params: CRMLeadCreateParams): Promise<CRMContact>;
  updateContact(
    contactId: string,
    updates: Partial<CRMContact>,
  ): Promise<CRMContact>;
  listDeals(options?: {
    stage?: string;
    ownerId?: string;
    limit?: number;
  }): Promise<CRMDeal[]>;
  getDeal(dealId: string): Promise<CRMDeal>;
  logActivity(
    activity: Omit<CRMActivity, "id" | "externalId" | "provider">,
  ): Promise<CRMActivity>;
  getActivities(contactId: string, limit?: number): Promise<CRMActivity[]>;
  getPipelineStages(): Promise<
    Array<{ id: string; name: string; probability: number }>
  >;
  healthCheck(): Promise<{ ok: boolean; message: string }>;
}

// ============================================================================
// Salesforce Adapter
// ============================================================================

class SalesforceAdapter implements CRMApiAdapter {
  private instanceUrl: string;
  private accessToken: string;

  constructor(accessToken: string, instanceUrl: string) {
    this.accessToken = accessToken;
    this.instanceUrl = instanceUrl.endsWith("/")
      ? instanceUrl.slice(0, -1)
      : instanceUrl;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.instanceUrl}/services/data/v59.0${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    };

    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`Salesforce API ${response.status}: ${errorText}`);
    }
    if (response.status === 204) return {} as T;
    return response.json();
  }

  async searchContacts(params: CRMContactSearchParams): Promise<CRMContact[]> {
    let soql =
      "SELECT Id, FirstName, LastName, Email, Phone, Account.Name, Title, OwnerId, Owner.Name, CreatedDate, LastModifiedDate FROM Contact";
    const conditions: string[] = [];

    if (params.query) {
      conditions.push(
        `(FirstName LIKE '%${params.query}%' OR LastName LIKE '%${params.query}%' OR Email LIKE '%${params.query}%')`,
      );
    }
    if (params.email) conditions.push(`Email = '${params.email}'`);
    if (params.company)
      conditions.push(`Account.Name LIKE '%${params.company}%'`);

    if (conditions.length > 0) soql += ` WHERE ${conditions.join(" AND ")}`;
    soql += ` LIMIT ${params.limit || 20}`;

    const data = await this.request<{
      records: Array<{
        Id: string;
        FirstName: string;
        LastName: string;
        Email: string;
        Phone?: string;
        Account?: { Name: string };
        Title?: string;
        Owner?: { Name: string };
        CreatedDate: string;
        LastModifiedDate: string;
      }>;
    }>(`/query?q=${encodeURIComponent(soql)}`);

    return (data.records || []).map((r) => this.mapSalesforceContact(r));
  }

  async getContact(contactId: string): Promise<CRMContact> {
    const data = await this.request<Record<string, unknown>>(
      `/sobjects/Contact/${contactId}`,
    );
    return this.mapSalesforceContact(data as never);
  }

  async createLead(params: CRMLeadCreateParams): Promise<CRMContact> {
    const body = {
      FirstName: params.firstName,
      LastName: params.lastName,
      Email: params.email,
      Phone: params.phone,
      Company: params.company || "Unknown",
      Title: params.title,
      LeadSource: params.source || "Chat",
      Description: params.notes,
    };

    const data = await this.request<{ id: string }>("/sobjects/Lead", {
      method: "POST",
      body: JSON.stringify(body),
    });

    // Leads and Contacts are different objects in Salesforce
    // Return as a CRMContact for consistency
    return {
      id: data.id,
      firstName: params.firstName,
      lastName: params.lastName,
      email: params.email,
      phone: params.phone,
      company: params.company,
      title: params.title,
      tags: [],
      customFields: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      provider: "salesforce",
      externalId: data.id,
      url: `${this.instanceUrl}/lightning/r/Lead/${data.id}/view`,
    };
  }

  async updateContact(
    contactId: string,
    updates: Partial<CRMContact>,
  ): Promise<CRMContact> {
    const body: Record<string, unknown> = {};
    if (updates.firstName) body.FirstName = updates.firstName;
    if (updates.lastName) body.LastName = updates.lastName;
    if (updates.email) body.Email = updates.email;
    if (updates.phone) body.Phone = updates.phone;
    if (updates.title) body.Title = updates.title;

    await this.request(`/sobjects/Contact/${contactId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });

    return this.getContact(contactId);
  }

  async listDeals(options?: {
    stage?: string;
    ownerId?: string;
    limit?: number;
  }): Promise<CRMDeal[]> {
    let soql =
      "SELECT Id, Name, Amount, StageName, Probability, CloseDate, Account.Name, Owner.Name, Owner.Email, CreatedDate, LastModifiedDate FROM Opportunity";
    const conditions: string[] = [];

    if (options?.stage) conditions.push(`StageName = '${options.stage}'`);
    if (options?.ownerId) conditions.push(`OwnerId = '${options.ownerId}'`);
    if (conditions.length > 0) soql += ` WHERE ${conditions.join(" AND ")}`;
    soql += ` ORDER BY CloseDate ASC LIMIT ${options?.limit || 20}`;

    const data = await this.request<{
      records: Array<{
        Id: string;
        Name: string;
        Amount: number;
        StageName: string;
        Probability: number;
        CloseDate: string;
        Account?: { Name: string };
        Owner: { Name: string; Email: string };
        CreatedDate: string;
        LastModifiedDate: string;
      }>;
    }>(`/query?q=${encodeURIComponent(soql)}`);

    return (data.records || []).map((r) => ({
      id: r.Id,
      name: r.Name,
      amount: r.Amount || 0,
      currency: "USD",
      stage: r.StageName,
      probability: r.Probability || 0,
      closeDate: r.CloseDate,
      contact: { id: "", name: r.Account?.Name || "", email: "" },
      owner: { name: r.Owner.Name, email: r.Owner.Email },
      createdAt: r.CreatedDate,
      updatedAt: r.LastModifiedDate,
      provider: "salesforce" as CRMProvider,
      externalId: r.Id,
      url: `${this.instanceUrl}/lightning/r/Opportunity/${r.Id}/view`,
    }));
  }

  async getDeal(dealId: string): Promise<CRMDeal> {
    const data = await this.request<Record<string, unknown>>(
      `/sobjects/Opportunity/${dealId}`,
    );
    const r = data as {
      Id: string;
      Name: string;
      Amount: number;
      StageName: string;
      Probability: number;
      CloseDate: string;
      Owner: { Name: string; Email: string };
      CreatedDate: string;
      LastModifiedDate: string;
    };

    return {
      id: r.Id,
      name: r.Name,
      amount: r.Amount || 0,
      currency: "USD",
      stage: r.StageName,
      probability: r.Probability || 0,
      closeDate: r.CloseDate,
      contact: { id: "", name: "", email: "" },
      owner: { name: r.Owner?.Name || "", email: r.Owner?.Email || "" },
      createdAt: r.CreatedDate,
      updatedAt: r.LastModifiedDate,
      provider: "salesforce",
      externalId: r.Id,
      url: `${this.instanceUrl}/lightning/r/Opportunity/${r.Id}/view`,
    };
  }

  async logActivity(
    activity: Omit<CRMActivity, "id" | "externalId" | "provider">,
  ): Promise<CRMActivity> {
    const body = {
      Subject: activity.subject,
      Description: activity.description,
      WhoId: activity.contactId,
      WhatId: activity.dealId,
      ActivityDate: new Date().toISOString().split("T")[0],
    };

    const data = await this.request<{ id: string }>("/sobjects/Task", {
      method: "POST",
      body: JSON.stringify(body),
    });

    return {
      ...activity,
      id: data.id,
      provider: "salesforce",
      externalId: data.id,
    };
  }

  async getActivities(contactId: string, limit = 20): Promise<CRMActivity[]> {
    const soql = `SELECT Id, Subject, Description, ActivityDate, Owner.Name, Owner.Email FROM Task WHERE WhoId = '${contactId}' ORDER BY ActivityDate DESC LIMIT ${limit}`;
    const data = await this.request<{
      records: Array<{
        Id: string;
        Subject: string;
        Description?: string;
        ActivityDate: string;
        Owner: { Name: string; Email: string };
      }>;
    }>(`/query?q=${encodeURIComponent(soql)}`);

    return (data.records || []).map((r) => ({
      id: r.Id,
      type: "task" as const,
      subject: r.Subject,
      description: r.Description,
      contactId,
      createdBy: { name: r.Owner.Name, email: r.Owner.Email },
      createdAt: r.ActivityDate,
      provider: "salesforce" as CRMProvider,
      externalId: r.Id,
    }));
  }

  async getPipelineStages(): Promise<
    Array<{ id: string; name: string; probability: number }>
  > {
    const data = await this.request<{
      values: Array<{
        value: string;
        label: string;
        attributes?: { defaultProbability?: number };
      }>;
    }>("/sobjects/Opportunity/describe/fields/StageName/picklistValues");

    // Handle different Salesforce API response formats
    const values: Array<{
      value: string;
      label: string;
      attributes?: { defaultProbability?: number };
    }> =
      data.values ||
      (Array.isArray(data)
        ? (data as unknown as Array<{
            value: string;
            label: string;
            attributes?: { defaultProbability?: number };
          }>)
        : []);
    return values.map((v) => ({
      id: v.value,
      name: v.label || v.value,
      probability: v.attributes?.defaultProbability || 0,
    }));
  }

  async healthCheck(): Promise<{ ok: boolean; message: string }> {
    try {
      await this.request("/sobjects");
      return { ok: true, message: "Salesforce API is accessible" };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Health check failed",
      };
    }
  }

  private mapSalesforceContact(r: {
    Id: string;
    FirstName: string;
    LastName: string;
    Email: string;
    Phone?: string;
    Account?: { Name: string };
    Title?: string;
    Owner?: { Name: string };
    CreatedDate: string;
    LastModifiedDate: string;
  }): CRMContact {
    return {
      id: r.Id,
      firstName: r.FirstName || "",
      lastName: r.LastName || "",
      email: r.Email || "",
      phone: r.Phone,
      company: r.Account?.Name,
      title: r.Title,
      owner: r.Owner ? { name: r.Owner.Name, email: "" } : undefined,
      tags: [],
      customFields: {},
      createdAt: r.CreatedDate,
      updatedAt: r.LastModifiedDate,
      provider: "salesforce",
      externalId: r.Id,
      url: `${this.instanceUrl}/lightning/r/Contact/${r.Id}/view`,
    };
  }
}

// ============================================================================
// HubSpot Adapter
// ============================================================================

class HubSpotAdapter implements CRMApiAdapter {
  private baseUrl = "https://api.hubapi.com";
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    };

    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`HubSpot API ${response.status}: ${errorText}`);
    }
    if (response.status === 204) return {} as T;
    return response.json();
  }

  async searchContacts(params: CRMContactSearchParams): Promise<CRMContact[]> {
    const filters: Array<{
      propertyName: string;
      operator: string;
      value: string;
    }> = [];

    if (params.email) {
      filters.push({
        propertyName: "email",
        operator: "EQ",
        value: params.email,
      });
    }
    if (params.company) {
      filters.push({
        propertyName: "company",
        operator: "CONTAINS_TOKEN",
        value: params.company,
      });
    }

    const body: Record<string, unknown> = {
      filterGroups: filters.length > 0 ? [{ filters }] : [],
      properties: [
        "firstname",
        "lastname",
        "email",
        "phone",
        "company",
        "jobtitle",
        "hubspot_owner_id",
        "createdate",
        "lastmodifieddate",
      ],
      limit: params.limit || 20,
    };

    if (params.query) {
      body.query = params.query;
    }

    const data = await this.request<{
      results: Array<{
        id: string;
        properties: {
          firstname: string;
          lastname: string;
          email: string;
          phone?: string;
          company?: string;
          jobtitle?: string;
          createdate: string;
          lastmodifieddate: string;
        };
      }>;
    }>("/crm/v3/objects/contacts/search", {
      method: "POST",
      body: JSON.stringify(body),
    });

    return (data.results || []).map((r) => this.mapHubSpotContact(r));
  }

  async getContact(contactId: string): Promise<CRMContact> {
    const data = await this.request<{
      id: string;
      properties: Record<string, string>;
    }>(
      `/crm/v3/objects/contacts/${contactId}?properties=firstname,lastname,email,phone,company,jobtitle,createdate,lastmodifieddate`,
    );

    return this.mapHubSpotContact(data);
  }

  async createLead(params: CRMLeadCreateParams): Promise<CRMContact> {
    const data = await this.request<{
      id: string;
      properties: Record<string, string>;
    }>("/crm/v3/objects/contacts", {
      method: "POST",
      body: JSON.stringify({
        properties: {
          firstname: params.firstName,
          lastname: params.lastName,
          email: params.email,
          phone: params.phone,
          company: params.company,
          jobtitle: params.title,
          hs_lead_status: "NEW",
          notes: params.notes,
        },
      }),
    });

    return this.mapHubSpotContact(data);
  }

  async updateContact(
    contactId: string,
    updates: Partial<CRMContact>,
  ): Promise<CRMContact> {
    const properties: Record<string, string> = {};
    if (updates.firstName) properties.firstname = updates.firstName;
    if (updates.lastName) properties.lastname = updates.lastName;
    if (updates.email) properties.email = updates.email;
    if (updates.phone) properties.phone = updates.phone;
    if (updates.title) properties.jobtitle = updates.title;

    await this.request(`/crm/v3/objects/contacts/${contactId}`, {
      method: "PATCH",
      body: JSON.stringify({ properties }),
    });

    return this.getContact(contactId);
  }

  async listDeals(options?: {
    stage?: string;
    ownerId?: string;
    limit?: number;
  }): Promise<CRMDeal[]> {
    const filters: Array<{
      propertyName: string;
      operator: string;
      value: string;
    }> = [];
    if (options?.stage)
      filters.push({
        propertyName: "dealstage",
        operator: "EQ",
        value: options.stage,
      });
    if (options?.ownerId)
      filters.push({
        propertyName: "hubspot_owner_id",
        operator: "EQ",
        value: options.ownerId,
      });

    const data = await this.request<{
      results: Array<{
        id: string;
        properties: {
          dealname: string;
          amount: string;
          dealstage: string;
          closedate: string;
          hs_deal_stage_probability: string;
          createdate: string;
          hs_lastmodifieddate: string;
        };
      }>;
    }>("/crm/v3/objects/deals/search", {
      method: "POST",
      body: JSON.stringify({
        filterGroups: filters.length > 0 ? [{ filters }] : [],
        properties: [
          "dealname",
          "amount",
          "dealstage",
          "closedate",
          "hs_deal_stage_probability",
          "createdate",
          "hs_lastmodifieddate",
        ],
        limit: options?.limit || 20,
      }),
    });

    return (data.results || []).map((r) => ({
      id: r.id,
      name: r.properties.dealname || "",
      amount: parseFloat(r.properties.amount || "0"),
      currency: "USD",
      stage: r.properties.dealstage || "",
      probability: parseFloat(r.properties.hs_deal_stage_probability || "0"),
      closeDate: r.properties.closedate,
      contact: { id: "", name: "", email: "" },
      owner: { name: "", email: "" },
      createdAt: r.properties.createdate,
      updatedAt: r.properties.hs_lastmodifieddate,
      provider: "hubspot" as CRMProvider,
      externalId: r.id,
      url: `https://app.hubspot.com/contacts/deals/${r.id}`,
    }));
  }

  async getDeal(dealId: string): Promise<CRMDeal> {
    const data = await this.request<{
      id: string;
      properties: Record<string, string>;
    }>(
      `/crm/v3/objects/deals/${dealId}?properties=dealname,amount,dealstage,closedate,hs_deal_stage_probability,createdate,hs_lastmodifieddate`,
    );

    return {
      id: data.id,
      name: data.properties.dealname || "",
      amount: parseFloat(data.properties.amount || "0"),
      currency: "USD",
      stage: data.properties.dealstage || "",
      probability: parseFloat(data.properties.hs_deal_stage_probability || "0"),
      closeDate: data.properties.closedate,
      contact: { id: "", name: "", email: "" },
      owner: { name: "", email: "" },
      createdAt: data.properties.createdate,
      updatedAt: data.properties.hs_lastmodifieddate,
      provider: "hubspot",
      externalId: data.id,
      url: `https://app.hubspot.com/contacts/deals/${data.id}`,
    };
  }

  async logActivity(
    activity: Omit<CRMActivity, "id" | "externalId" | "provider">,
  ): Promise<CRMActivity> {
    const typeMap: Record<string, string> = {
      call: "CALL",
      email: "EMAIL",
      meeting: "MEETING",
      note: "NOTE",
      task: "TASK",
    };

    const data = await this.request<{ id: string }>("/crm/v3/objects/notes", {
      method: "POST",
      body: JSON.stringify({
        properties: {
          hs_note_body: `${activity.subject}\n\n${activity.description || ""}`,
          hs_timestamp: new Date().toISOString(),
        },
        associations: [
          {
            to: { id: activity.contactId },
            types: [
              {
                associationCategory: "HUBSPOT_DEFINED",
                associationTypeId: 202,
              },
            ],
          },
        ],
      }),
    });

    return {
      ...activity,
      id: data.id,
      provider: "hubspot",
      externalId: data.id,
    };
  }

  async getActivities(contactId: string, limit = 20): Promise<CRMActivity[]> {
    const data = await this.request<{
      results: Array<{
        id: string;
        properties: {
          hs_note_body: string;
          hs_timestamp: string;
          hs_created_by: string;
        };
      }>;
    }>(
      `/crm/v3/objects/contacts/${contactId}/associations/notes?limit=${limit}`,
    );

    return (data.results || []).map((r) => ({
      id: r.id,
      type: "note" as const,
      subject: (r.properties?.hs_note_body || "").split("\n")[0] || "Note",
      description: r.properties?.hs_note_body,
      contactId,
      createdBy: { name: r.properties?.hs_created_by || "", email: "" },
      createdAt: r.properties?.hs_timestamp || new Date().toISOString(),
      provider: "hubspot" as CRMProvider,
      externalId: r.id,
    }));
  }

  async getPipelineStages(): Promise<
    Array<{ id: string; name: string; probability: number }>
  > {
    const data = await this.request<{
      results: Array<{
        stages: Array<{
          id: string;
          label: string;
          metadata: { probability: string };
        }>;
      }>;
    }>("/crm/v3/pipelines/deals");

    const stages: Array<{ id: string; name: string; probability: number }> = [];
    for (const pipeline of data.results || []) {
      for (const stage of pipeline.stages || []) {
        stages.push({
          id: stage.id,
          name: stage.label,
          probability: parseFloat(stage.metadata?.probability || "0"),
        });
      }
    }
    return stages;
  }

  async healthCheck(): Promise<{ ok: boolean; message: string }> {
    try {
      await this.request("/crm/v3/objects/contacts?limit=1");
      return { ok: true, message: "HubSpot API is accessible" };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Health check failed",
      };
    }
  }

  private mapHubSpotContact(r: {
    id: string;
    properties: {
      firstname?: string;
      lastname?: string;
      email?: string;
      phone?: string;
      company?: string;
      jobtitle?: string;
      createdate?: string;
      lastmodifieddate?: string;
    };
  }): CRMContact {
    return {
      id: r.id,
      firstName: r.properties.firstname || "",
      lastName: r.properties.lastname || "",
      email: r.properties.email || "",
      phone: r.properties.phone,
      company: r.properties.company,
      title: r.properties.jobtitle,
      tags: [],
      customFields: {},
      createdAt: r.properties.createdate || new Date().toISOString(),
      updatedAt: r.properties.lastmodifieddate || new Date().toISOString(),
      provider: "hubspot",
      externalId: r.id,
      url: `https://app.hubspot.com/contacts/${r.id}`,
    };
  }
}

// ============================================================================
// CRM Connector
// ============================================================================

export class CRMConnector extends BaseConnector {
  readonly providerId: string;
  readonly displayName: string;
  readonly description =
    "Look up contacts, track deals, and log activities from chat";
  readonly icon = "users";
  readonly category: IntegrationCatalogCategory = "crm";
  readonly capabilities: ConnectorCapability[] = ["read", "write", "search"];
  readonly version = "1.0.0";

  private adapter: CRMApiAdapter | null = null;
  private provider: CRMProvider;

  constructor(provider: CRMProvider) {
    super(
      { maxRequests: 200, windowMs: 60_000 },
      {
        maxAttempts: 3,
        initialDelayMs: 500,
        maxDelayMs: 15_000,
        backoffMultiplier: 2,
        jitterFactor: 0.1,
      },
    );
    this.provider = provider;
    this.providerId = provider;
    const nameMap: Record<CRMProvider, string> = {
      salesforce: "Salesforce",
      hubspot: "HubSpot",
    };
    this.displayName = nameMap[provider];
  }

  protected async doConnect(
    config: ConnectorConfig,
    credentials: ConnectorCredentials,
  ): Promise<void> {
    switch (this.provider) {
      case "salesforce":
        this.adapter = new SalesforceAdapter(
          credentials.accessToken,
          credentials.metadata.instanceUrl ||
            (config.providerConfig.instanceUrl as string) ||
            "",
        );
        break;
      case "hubspot":
        this.adapter = new HubSpotAdapter(credentials.accessToken);
        break;
    }

    const health = await this.adapter.healthCheck();
    if (!health.ok) {
      throw new ConnectorError(health.message, "auth", this.providerId);
    }
  }

  protected async doDisconnect(): Promise<void> {
    this.adapter = null;
  }

  protected async doHealthCheck(): Promise<HealthCheckResult> {
    if (!this.adapter) {
      return {
        healthy: false,
        responseTimeMs: 0,
        message: "Not connected",
        checkedAt: new Date().toISOString(),
        consecutiveFailures: 0,
      };
    }
    const start = Date.now();
    const result = await this.adapter.healthCheck();
    return {
      healthy: result.ok,
      responseTimeMs: Date.now() - start,
      message: result.message,
      checkedAt: new Date().toISOString(),
      consecutiveFailures: result.ok ? 0 : 1,
    };
  }

  getCatalogEntry(): CatalogEntry {
    return {
      id: this.providerId,
      name: this.displayName,
      description: this.description,
      icon: this.icon,
      category: this.category,
      capabilities: this.capabilities,
      syncDirections: ["incoming", "outgoing", "bidirectional"],
      actions: [
        {
          id: "lookup_contact",
          label: "Look Up Contact",
          description: "Search for a CRM contact",
          requiredCapabilities: ["search"],
          parameters: [
            {
              name: "query",
              type: "string",
              required: false,
              description: "Search query",
            },
            {
              name: "email",
              type: "string",
              required: false,
              description: "Email address",
            },
          ],
        },
        {
          id: "create_lead",
          label: "Create Lead",
          description: "Create a new lead from a chat message",
          requiredCapabilities: ["write"],
          parameters: [
            {
              name: "firstName",
              type: "string",
              required: true,
              description: "First name",
            },
            {
              name: "lastName",
              type: "string",
              required: true,
              description: "Last name",
            },
            {
              name: "email",
              type: "string",
              required: true,
              description: "Email",
            },
            {
              name: "company",
              type: "string",
              required: false,
              description: "Company",
            },
          ],
        },
        {
          id: "log_activity",
          label: "Log Activity",
          description: "Log an interaction as a CRM activity",
          requiredCapabilities: ["write"],
          parameters: [
            {
              name: "contactId",
              type: "string",
              required: true,
              description: "Contact ID",
            },
            {
              name: "type",
              type: "select",
              required: true,
              description: "Activity type",
              options: [
                { label: "Call", value: "call" },
                { label: "Email", value: "email" },
                { label: "Meeting", value: "meeting" },
                { label: "Note", value: "note" },
              ],
            },
            {
              name: "subject",
              type: "string",
              required: true,
              description: "Subject",
            },
          ],
        },
      ],
      requiredConfig: [],
      requiresOAuth: true,
      beta: false,
      version: this.version,
    };
  }

  // ==========================================================================
  // CRM Operations
  // ==========================================================================

  async searchContacts(params: CRMContactSearchParams): Promise<CRMContact[]> {
    this.ensureConnected();
    return this.withRetry(
      () => this.adapter!.searchContacts(params),
      "searchContacts",
    );
  }

  async getContact(contactId: string): Promise<CRMContact> {
    this.ensureConnected();
    return this.withRetry(
      () => this.adapter!.getContact(contactId),
      "getContact",
    );
  }

  async createLead(params: CRMLeadCreateParams): Promise<CRMContact> {
    this.ensureConnected();
    return this.withRetry(() => this.adapter!.createLead(params), "createLead");
  }

  async updateContact(
    contactId: string,
    updates: Partial<CRMContact>,
  ): Promise<CRMContact> {
    this.ensureConnected();
    return this.withRetry(
      () => this.adapter!.updateContact(contactId, updates),
      "updateContact",
    );
  }

  async listDeals(options?: {
    stage?: string;
    ownerId?: string;
    limit?: number;
  }): Promise<CRMDeal[]> {
    this.ensureConnected();
    return this.withRetry(() => this.adapter!.listDeals(options), "listDeals");
  }

  async getDeal(dealId: string): Promise<CRMDeal> {
    this.ensureConnected();
    return this.withRetry(() => this.adapter!.getDeal(dealId), "getDeal");
  }

  async logActivity(
    activity: Omit<CRMActivity, "id" | "externalId" | "provider">,
  ): Promise<CRMActivity> {
    this.ensureConnected();
    return this.withRetry(
      () => this.adapter!.logActivity(activity),
      "logActivity",
    );
  }

  async getActivities(
    contactId: string,
    limit?: number,
  ): Promise<CRMActivity[]> {
    this.ensureConnected();
    return this.withRetry(
      () => this.adapter!.getActivities(contactId, limit),
      "getActivities",
    );
  }

  async getPipelineStages(): Promise<
    Array<{ id: string; name: string; probability: number }>
  > {
    this.ensureConnected();
    return this.withRetry(
      () => this.adapter!.getPipelineStages(),
      "getPipelineStages",
    );
  }

  /**
   * Format a contact card for sharing in chat.
   */
  formatContactCard(contact: CRMContact): string {
    return [
      `**${contact.firstName} ${contact.lastName}**`,
      contact.title
        ? `${contact.title}${contact.company ? ` at ${contact.company}` : ""}`
        : contact.company,
      contact.email ? `Email: ${contact.email}` : null,
      contact.phone ? `Phone: ${contact.phone}` : null,
      contact.owner ? `Owner: ${contact.owner.name}` : null,
      contact.url,
    ]
      .filter(Boolean)
      .join("\n");
  }

  /**
   * Format a deal notification for a channel.
   */
  formatDealNotification(
    deal: CRMDeal,
    event: "stage_change" | "won" | "lost" | "created",
  ): string {
    const eventMap: Record<string, string> = {
      stage_change: `moved to **${deal.stage}**`,
      won: "has been **WON**",
      lost: "has been **LOST**",
      created: "was **created**",
    };

    return [
      `**Deal ${eventMap[event]}: ${deal.name}**`,
      `Amount: $${deal.amount.toLocaleString()} ${deal.currency}`,
      `Stage: ${deal.stage} (${deal.probability}% probability)`,
      deal.closeDate
        ? `Close date: ${new Date(deal.closeDate).toLocaleDateString()}`
        : null,
      `Owner: ${deal.owner.name}`,
      deal.url,
    ]
      .filter(Boolean)
      .join("\n");
  }

  /**
   * Create a lead from a chat message.
   */
  async createLeadFromMessage(
    message: { content: string; author: string },
    params: CRMLeadCreateParams,
  ): Promise<CRMContact> {
    return this.createLead({
      ...params,
      source: "Chat",
      notes: `Created from chat by ${message.author}: ${message.content}`,
    });
  }

  private ensureConnected(): void {
    if (!this.adapter || this.status !== "connected") {
      throw new ConnectorError(
        "CRM connector is not connected",
        "config",
        this.providerId,
        { retryable: false },
      );
    }
  }
}
