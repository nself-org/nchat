/**
 * Template Switching API Route
 *
 * POST /api/tenants/[id]/branding/template - Switch template
 */

import { NextRequest, NextResponse } from "next/server";
import { loadTemplate } from "@/templates";
import type { TemplateId } from "@/templates/types";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const GRAPHQL_URL =
  process.env.NEXT_PUBLIC_GRAPHQL_URL || "http://api.localhost/v1/graphql";
const ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

async function graphql<T>(
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(ADMIN_SECRET ? { "x-hasura-admin-secret": ADMIN_SECRET } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  const result = await response.json();
  if (result.errors) {
    throw new Error(result.errors[0].message);
  }
  return result.data;
}

/**
 * POST - Switch template
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: tenantId } = await params;

    const { templateId, userId, preserveCustomizations } = await request.json();

    // Validate template ID
    const validTemplates: TemplateId[] = [
      "default",
      "slack",
      "discord",
      "telegram",
      "whatsapp",
    ];
    if (!validTemplates.includes(templateId)) {
      return NextResponse.json(
        { error: "Invalid template ID" },
        { status: 400 },
      );
    }

    if (!ADMIN_SECRET) {
      logger.warn("HASURA_ADMIN_SECRET not set, cannot switch template");
      return NextResponse.json(
        { error: "Service misconfigured" },
        { status: 503 },
      );
    }

    // Load template configuration
    const template = await loadTemplate(templateId);

    // Query existing customizations if we need to preserve them
    let customCss: string | null = null;
    let customColors: Record<string, unknown> | null = null;

    if (preserveCustomizations) {
      const themeData = await graphql<{
        nchat_tenant_themes: Array<{
          custom_css: string | null;
          light_primary_color: string | null;
          dark_primary_color: string | null;
        }>;
      }>(
        `
          query GetTenantTheme($tenantId: uuid!) {
            nchat_tenant_themes(
              where: { tenant_id: { _eq: $tenantId } }
              limit: 1
            ) {
              custom_css
              light_primary_color
              dark_primary_color
            }
          }
        `,
        { tenantId },
      );

      const existingTheme = themeData.nchat_tenant_themes?.[0];
      if (existingTheme) {
        customCss = existingTheme.custom_css;
        // Collect non-null color overrides to merge over the template
        customColors = Object.fromEntries(
          Object.entries(existingTheme).filter(
            ([key, val]) => key !== "custom_css" && val !== null,
          ),
        );
      }
    }

    // Merge: template is the base, existing custom values override if preserveCustomizations
    const themeConfig = template.theme || {};
    const mergedTheme =
      preserveCustomizations && customColors
        ? {
            ...themeConfig,
            ...customColors,
            ...(customCss ? { custom_css: customCss } : {}),
          }
        : themeConfig;

    const now = new Date().toISOString();

    // Update the tenant's template_id on the nchat_tenants table
    await graphql(
      `
        mutation UpdateTenantTemplate(
          $tenantId: uuid!
          $templateId: String!
          $updatedAt: timestamptz!
        ) {
          update_nchat_tenants_by_pk(
            pk_columns: { id: $tenantId }
            _set: { template_id: $templateId, updated_at: $updatedAt }
          ) {
            id
            template_id
          }
        }
      `,
      { tenantId, templateId, updatedAt: now },
    );

    // Upsert theme configuration with merged values
    const themeSetInput: Record<string, unknown> = {
      updated_at: now,
    };
    // Apply merged theme colors/css
    for (const [key, val] of Object.entries(mergedTheme)) {
      if (typeof key === "string" && val !== undefined) {
        themeSetInput[key] = val;
      }
    }

    await graphql(
      `mutation UpsertTenantTheme($tenantId: uuid!, $data: nchat_tenant_themes_set_input!) {
        insert_nchat_tenant_themes_one(
          object: { tenant_id: $tenantId }
          on_conflict: {
            constraint: nchat_tenant_themes_tenant_id_key
            update_columns: [${Object.keys(themeSetInput)
              .map((k) => k)
              .join(", ")}]
          }
        ) {
          id
        }
      }`,
      { tenantId, data: themeSetInput },
    ).catch(async () => {
      // Fallback: plain update if insert with conflict fails
      await graphql(
        `
          mutation UpdateTenantTheme(
            $tenantId: uuid!
            $data: nchat_tenant_themes_set_input!
          ) {
            update_nchat_tenant_themes(
              where: { tenant_id: { _eq: $tenantId } }
              _set: $data
            ) {
              affected_rows
            }
          }
        `,
        { tenantId, data: themeSetInput },
      );
    });

    // Record changelog entry in audit log
    await graphql(
      `
        mutation InsertTemplateSwitchAuditLog(
          $object: nchat_audit_logs_insert_input!
        ) {
          insert_nchat_audit_logs_one(object: $object) {
            id
          }
        }
      `,
      {
        object: {
          action: "template_switch",
          actor_id: userId,
          resource_type: "tenant_branding",
          resource_id: tenantId,
          metadata: {
            template_id: templateId,
            preserve_customizations: preserveCustomizations,
          },
          timestamp: now,
        },
      },
    ).catch((err: unknown) => {
      // Audit log failure is non-fatal — log and continue
      logger.warn("Failed to record template switch audit log: " + String(err));
    });

    logger.info("Template switched:", {
      tenantId,
      templateId,
      userId,
      preserveCustomizations,
    });

    const branding = {
      tenantId,
      templateId,
      customTemplate: preserveCustomizations
        ? { customCss, customColors }
        : null,
      audit: {
        createdAt: new Date(),
        createdBy: userId,
        updatedAt: new Date(),
        updatedBy: userId,
        version: 2,
        changelog: [
          {
            timestamp: new Date(),
            userId,
            action: "switch_template",
            changes: { templateId, preserveCustomizations },
          },
        ],
      },
    };

    return NextResponse.json(branding);
  } catch (error) {
    logger.error("POST /api/tenants/[id]/branding/template failed:", error);
    return NextResponse.json(
      { error: "Template switch failed" },
      { status: 500 },
    );
  }
}
