/**
 * Domain Configuration API Route
 *
 * POST /api/tenants/[id]/branding/domain - Configure custom domain
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

const GRAPHQL_URL =
  process.env.NEXT_PUBLIC_GRAPHQL_URL || "http://api.localhost/v1/graphql";
const ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

async function hasuraQuery(query: string, variables: Record<string, unknown>) {
  const response = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(ADMIN_SECRET ? { "x-hasura-admin-secret": ADMIN_SECRET } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  return response.json();
}

/**
 * POST - Configure custom domain
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: tenantId } = await params;

    const { domain, userId } = await request.json();

    // Validate domain format
    const domainRegex =
      /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.([a-zA-Z]{2,}\.?)+$/;
    if (!domainRegex.test(domain)) {
      return NextResponse.json(
        { error: "Invalid domain format" },
        { status: 400 },
      );
    }

    // Generate verification token
    const verificationToken = randomBytes(32).toString("hex");

    // Read platform domain from environment variable
    const platformDomain = process.env.PLATFORM_DOMAIN || "nself.app";

    // Generate DNS records
    const dnsRecords = [
      {
        type: "CNAME",
        name: domain,
        value: `${tenantId}.${platformDomain}`,
      },
      {
        type: "TXT",
        name: `_nself-verification.${domain}`,
        value: verificationToken,
      },
    ];

    // Save domain configuration to database
    if (ADMIN_SECRET) {
      const mutation = `
        mutation UpsertCustomDomain(
          $tenantId: String!
          $domain: String!
          $verificationToken: String!
        ) {
          update_nchat_tenant_branding(
            where: { tenant_id: { _eq: $tenantId } }
            _set: {
              custom_domain: $domain
              domain_verified: false
              domain_verified_at: null
              updated_at: "now()"
            }
          ) {
            affected_rows
          }
        }
      `;
      const result = await hasuraQuery(mutation, {
        tenantId,
        domain,
        verificationToken,
      });

      if (result.errors) {
        logger.warn(
          "Failed to persist domain to database, returning DNS records only",
          {
            tenantId,
            domain,
            errors: result.errors,
          },
        );
      } else {
        logger.info("Custom domain saved to database", { tenantId, domain });
      }
    } else {
      logger.warn(
        "HASURA_ADMIN_SECRET not set, domain not persisted to database",
        { tenantId },
      );
    }

    logger.info("Custom domain configured:", { tenantId, domain, userId });

    return NextResponse.json({
      dnsRecords,
      verificationToken,
    });
  } catch (error) {
    logger.error("POST /api/tenants/[id]/branding/domain failed:", error);
    return NextResponse.json(
      { error: "Domain configuration failed" },
      { status: 500 },
    );
  }
}
