/**
 * Domain Verification API Route
 *
 * POST /api/tenants/[id]/branding/domain/verify - Verify custom domain
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { promises as dns } from "dns";

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
 * POST - Verify custom domain
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: tenantId } = await params;

    const { domain } = await request.json();

    if (!ADMIN_SECRET) {
      logger.warn("HASURA_ADMIN_SECRET not set, cannot verify domain");
      return NextResponse.json(
        { error: "Service misconfigured" },
        { status: 503 },
      );
    }

    const errors: string[] = [];
    let verified = false;

    try {
      // Fetch stored verification token from database
      const data = await graphql<{
        nchat_custom_domains: Array<{ verification_token: string | null }>;
      }>(
        `
          query GetDomainToken($tenantId: uuid!, $domain: String!) {
            nchat_custom_domains(
              where: { tenant_id: { _eq: $tenantId }, domain: { _eq: $domain } }
              limit: 1
            ) {
              verification_token
            }
          }
        `,
        { tenantId, domain },
      );

      const domainRecord = data.nchat_custom_domains?.[0];
      if (!domainRecord) {
        return NextResponse.json(
          { error: "Domain not found. Configure the domain first." },
          { status: 404 },
        );
      }

      const storedToken = domainRecord.verification_token;
      if (!storedToken) {
        return NextResponse.json(
          {
            error:
              "No verification token found for this domain. Reconfigure the domain.",
          },
          { status: 400 },
        );
      }

      // Check CNAME record
      const platformDomain = process.env.PLATFORM_DOMAIN || "nself.app";
      const expectedCname = `${tenantId}.${platformDomain}`;
      try {
        const cnameRecords = await dns.resolveCname(domain);
        if (!cnameRecords.includes(expectedCname)) {
          errors.push(
            `CNAME record not found or incorrect. Expected: ${expectedCname}`,
          );
        }
      } catch {
        errors.push(`CNAME record not found. Expected: ${expectedCname}`);
      }

      // Check TXT record and compare with stored token
      try {
        const txtRecords = await dns.resolveTxt(
          `_nself-verification.${domain}`,
        );
        const txtValue = txtRecords.flat().join("");

        if (!txtValue) {
          errors.push("Verification TXT record not found");
        } else if (txtValue !== storedToken) {
          errors.push(
            "Verification TXT record does not match the expected token",
          );
        }
      } catch {
        errors.push(
          "Verification TXT record not found. Records may not have propagated yet.",
        );
      }

      if (errors.length === 0) {
        verified = true;

        // Mark domain as verified in database
        await graphql(
          `
            mutation VerifyDomain(
              $tenantId: uuid!
              $domain: String!
              $verifiedAt: timestamptz!
            ) {
              update_nchat_custom_domains(
                where: {
                  tenant_id: { _eq: $tenantId }
                  domain: { _eq: $domain }
                }
                _set: {
                  verification_status: "verified"
                  verified_at: $verifiedAt
                  dns_configured: true
                }
              ) {
                affected_rows
              }
            }
          `,
          { tenantId, domain, verifiedAt: new Date().toISOString() },
        );

        logger.info("Domain verified successfully:", { tenantId, domain });
      }
    } catch (error) {
      logger.error("DNS lookup or DB operation failed:", error);
      errors.push(
        "Verification failed. DNS records may not have propagated yet.",
      );
    }

    return NextResponse.json({
      verified,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    logger.error(
      "POST /api/tenants/[id]/branding/domain/verify failed:",
      error,
    );
    return NextResponse.json(
      { error: "Domain verification failed" },
      { status: 500 },
    );
  }
}
