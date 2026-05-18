/**
 * Branding Export API Route
 *
 * GET /api/tenants/[id]/branding/export - Export branding as JSON
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const GRAPHQL_URL =
  process.env.NEXT_PUBLIC_GRAPHQL_URL || "http://api.localhost/v1/graphql";
const ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

async function fetchBrandingForExport(tenantId: string) {
  if (!ADMIN_SECRET) {
    logger.warn(
      "HASURA_ADMIN_SECRET not set, cannot fetch branding for export",
    );
    return null;
  }

  const response = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-hasura-admin-secret": ADMIN_SECRET,
    },
    body: JSON.stringify({
      query: `
        query GetBrandingForExport($tenantId: String!) {
          branding: nchat_tenant_branding(
            where: { tenant_id: { _eq: $tenantId } }
            limit: 1
          ) {
            app_name
            tagline
            company_name
            website_url
            logo_url
            logo_dark_url
            logo_scale
            logo_svg
            favicon_url
            favicon_svg
            email_header_url
            email_footer_html
            primary_font
            heading_font
            mono_font
            font_urls
            custom_domain
            domain_verified
            ssl_enabled
            meta_title
            meta_description
            meta_keywords
            og_image_url
            social_links
            privacy_policy_url
            terms_of_service_url
            support_email
            contact_email
          }
          themes: nchat_tenant_themes(
            where: { tenant_id: { _eq: $tenantId } }
          ) {
            theme_id
            is_active
            theme_data
          }
        }
      `,
      variables: { tenantId },
    }),
  });

  const result = await response.json();

  if (result.errors) {
    logger.error("GraphQL error fetching branding for export:", result.errors);
    return null;
  }

  return {
    branding: result.data?.branding?.[0] ?? null,
    themes: result.data?.themes ?? [],
  };
}

/**
 * GET - Export branding configuration
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: tenantId } = await params;

    // Fetch branding from database
    const dbData = await fetchBrandingForExport(tenantId);
    const dbBranding = dbData?.branding;
    const dbThemes = dbData?.themes ?? [];

    // Build export payload — merge DB data over defaults
    const branding = {
      version: "1.0.0",
      exportedAt: new Date().toISOString(),
      tenantId,
      theme: {
        light:
          dbThemes.find(
            (t: { is_active: boolean; theme_data: Record<string, unknown> }) =>
              t.is_active,
          )?.theme_data ?? {},
        dark: {},
      },
      logos: {
        primary: dbBranding?.logo_url ?? null,
        dark: dbBranding?.logo_dark_url ?? null,
        square: null,
        favicon: dbBranding?.favicon_url ?? null,
        faviconSvg: dbBranding?.favicon_svg ?? null,
        logoSvg: dbBranding?.logo_svg ?? null,
        scale: dbBranding?.logo_scale ?? 1,
      },
      identity: {
        appName: dbBranding?.app_name ?? null,
        tagline: dbBranding?.tagline ?? null,
        companyName: dbBranding?.company_name ?? null,
        websiteUrl: dbBranding?.website_url ?? null,
      },
      fonts: {
        primary: dbBranding?.primary_font ?? null,
        heading: dbBranding?.heading_font ?? null,
        mono: dbBranding?.mono_font ?? null,
        urls: dbBranding?.font_urls ?? [],
      },
      email: {
        headerUrl: dbBranding?.email_header_url ?? null,
        footerHtml: dbBranding?.email_footer_html ?? null,
      },
      seo: {
        metaTitle: dbBranding?.meta_title ?? null,
        metaDescription: dbBranding?.meta_description ?? null,
        metaKeywords: dbBranding?.meta_keywords ?? null,
        ogImageUrl: dbBranding?.og_image_url ?? null,
      },
      social: dbBranding?.social_links ?? {},
      legal: {
        privacyPolicyUrl: dbBranding?.privacy_policy_url ?? null,
        termsOfServiceUrl: dbBranding?.terms_of_service_url ?? null,
      },
      contact: {
        supportEmail: dbBranding?.support_email ?? null,
        contactEmail: dbBranding?.contact_email ?? null,
      },
      customCSS: "",
      domains: dbBranding?.custom_domain
        ? [
            {
              domain: dbBranding.custom_domain,
              verified: dbBranding.domain_verified ?? false,
              ssl: dbBranding.ssl_enabled ?? false,
            },
          ]
        : [],
      featureFlags: {},
    };

    logger.info("Branding configuration exported:", { tenantId });

    return new NextResponse(JSON.stringify(branding, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="branding-${tenantId}-${Date.now()}.json"`,
      },
    });
  } catch (error) {
    logger.error("GET /api/tenants/[id]/branding/export failed:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
