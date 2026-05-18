/**
 * GET/PUT /api/tenants/[id]/branding
 *
 * Manages tenant branding configuration
 * GET: Fetch branding settings
 * PUT: Update branding settings with database persistence
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import type { TenantBrandingData } from "@/lib/white-label/tenant-branding-service";

// GraphQL query to fetch tenant branding
async function fetchBrandingFromDatabase(
  tenantId: string,
): Promise<TenantBrandingData | null> {
  const graphqlUrl =
    process.env.NEXT_PUBLIC_GRAPHQL_URL || "http://api.localhost/v1/graphql";
  const adminSecret = process.env.HASURA_ADMIN_SECRET;

  if (!adminSecret) {
    logger.warn("HASURA_ADMIN_SECRET not set, cannot fetch branding");
    return null;
  }

  try {
    const response = await fetch(graphqlUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-hasura-admin-secret": adminSecret,
      },
      body: JSON.stringify({
        query: `
          query GetTenantBranding($tenantId: String!) {
            nchat_tenant_branding(where: { tenant_id: { _eq: $tenantId } }) {
              id
              tenant_id
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
              domain_verified_at
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
              created_at
              updated_at
            }
          }
        `,
        variables: { tenantId },
      }),
    });

    const result = await response.json();

    if (result.errors) {
      logger.error("GraphQL error fetching branding:", result.errors);
      return null;
    }

    const brandingRecord = result.data?.nchat_tenant_branding?.[0];

    if (!brandingRecord) {
      return null;
    }

    // Transform database record to API format
    return {
      appName: brandingRecord.app_name,
      tagline: brandingRecord.tagline,
      companyName: brandingRecord.company_name,
      websiteUrl: brandingRecord.website_url,
      logoUrl: brandingRecord.logo_url,
      logoDarkUrl: brandingRecord.logo_dark_url,
      logoScale: brandingRecord.logo_scale,
      logoSvg: brandingRecord.logo_svg,
      faviconUrl: brandingRecord.favicon_url,
      faviconSvg: brandingRecord.favicon_svg,
      emailHeaderUrl: brandingRecord.email_header_url,
      emailFooterHtml: brandingRecord.email_footer_html,
      primaryFont: brandingRecord.primary_font,
      headingFont: brandingRecord.heading_font,
      monoFont: brandingRecord.mono_font,
      fontUrls: brandingRecord.font_urls,
      customDomain: brandingRecord.custom_domain,
      domainVerified: brandingRecord.domain_verified,
      domainVerifiedAt: brandingRecord.domain_verified_at
        ? new Date(brandingRecord.domain_verified_at)
        : undefined,
      sslEnabled: brandingRecord.ssl_enabled,
      metaTitle: brandingRecord.meta_title,
      metaDescription: brandingRecord.meta_description,
      metaKeywords: brandingRecord.meta_keywords,
      ogImageUrl: brandingRecord.og_image_url,
      socialLinks: brandingRecord.social_links,
      privacyPolicyUrl: brandingRecord.privacy_policy_url,
      termsOfServiceUrl: brandingRecord.terms_of_service_url,
      supportEmail: brandingRecord.support_email,
      contactEmail: brandingRecord.contact_email,
    };
  } catch (error) {
    logger.error("Failed to fetch branding from database:", error);
    return null;
  }
}

// GraphQL mutation to update/insert tenant branding
async function saveBrandingToDatabase(
  tenantId: string,
  data: Partial<TenantBrandingData>,
): Promise<boolean> {
  const graphqlUrl =
    process.env.NEXT_PUBLIC_GRAPHQL_URL || "http://api.localhost/v1/graphql";
  const adminSecret = process.env.HASURA_ADMIN_SECRET;

  if (!adminSecret) {
    logger.warn("HASURA_ADMIN_SECRET not set, cannot save branding");
    return false;
  }

  try {
    const mutation = `
      mutation UpsertTenantBranding($tenantId: String!, $data: nchat_tenant_branding_set_input!) {
        update_nchat_tenant_branding(
          where: { tenant_id: { _eq: $tenantId } }
          _set: $data
        ) {
          affected_rows
        }
      }
    `;

    const variables = {
      tenantId,
      data: {
        app_name: data.appName,
        tagline: data.tagline,
        company_name: data.companyName,
        website_url: data.websiteUrl,
        logo_url: data.logoUrl,
        logo_dark_url: data.logoDarkUrl,
        logo_scale: data.logoScale,
        logo_svg: data.logoSvg,
        favicon_url: data.faviconUrl,
        favicon_svg: data.faviconSvg,
        email_header_url: data.emailHeaderUrl,
        email_footer_html: data.emailFooterHtml,
        primary_font: data.primaryFont,
        heading_font: data.headingFont,
        mono_font: data.monoFont,
        font_urls: data.fontUrls,
        custom_domain: data.customDomain,
        domain_verified: data.domainVerified,
        domain_verified_at: data.domainVerifiedAt?.toISOString(),
        ssl_enabled: data.sslEnabled,
        meta_title: data.metaTitle,
        meta_description: data.metaDescription,
        meta_keywords: data.metaKeywords,
        og_image_url: data.ogImageUrl,
        social_links: data.socialLinks,
        privacy_policy_url: data.privacyPolicyUrl,
        terms_of_service_url: data.termsOfServiceUrl,
        support_email: data.supportEmail,
        contact_email: data.contactEmail,
        updated_at: new Date().toISOString(),
      },
    };

    const response = await fetch(graphqlUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-hasura-admin-secret": adminSecret,
      },
      body: JSON.stringify({
        query: mutation,
        variables,
      }),
    });

    const result = await response.json();

    if (result.errors) {
      logger.error("GraphQL error updating branding:", result.errors);
      return false;
    }

    return (result.data?.update_nchat_tenant_branding?.affected_rows || 0) > 0;
  } catch (error) {
    logger.error("Failed to save branding to database:", error);
    return false;
  }
}

// Provide default branding if none exists
function getDefaultBranding(): TenantBrandingData {
  return {
    appName: "nchat",
    tagline: "Team Communication Platform",
    companyName: "Your Company",
    websiteUrl: "https://example.com",
    logoScale: 1,
    sslEnabled: true,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: tenantId } = await params;

    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant ID is required" },
        { status: 400 },
      );
    }

    // Try to fetch from database
    let branding = await fetchBrandingFromDatabase(tenantId);

    // If not found, return defaults
    if (!branding) {
      branding = getDefaultBranding();
    }

    return NextResponse.json({
      success: true,
      data: branding,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Failed to fetch branding:", error);
    return NextResponse.json(
      { error: "Failed to fetch branding" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: tenantId } = await params;
    const data = await request.json();

    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant ID is required" },
        { status: 400 },
      );
    }

    if (!data || typeof data !== "object") {
      return NextResponse.json(
        { error: "Invalid branding data" },
        { status: 400 },
      );
    }

    // Validate key fields
    if (data.appName && typeof data.appName !== "string") {
      return NextResponse.json({ error: "Invalid appName" }, { status: 400 });
    }

    // Save to database
    const saved = await saveBrandingToDatabase(tenantId, data);

    if (!saved) {
      return NextResponse.json(
        { error: "Failed to save branding" },
        { status: 500 },
      );
    }

    // Fetch updated branding
    const updatedBranding = await fetchBrandingFromDatabase(tenantId);

    return NextResponse.json({
      success: true,
      data: updatedBranding,
      message: "Branding updated successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Failed to update branding:", error);
    return NextResponse.json(
      { error: "Failed to update branding" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
