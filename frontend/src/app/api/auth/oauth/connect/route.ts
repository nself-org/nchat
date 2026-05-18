/**
 * OAuth Connection API Route
 *
 * Initiates OAuth flow for connecting social accounts.
 */

import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
// import { authConfig } from '@/config/auth.config'

const OAUTH_CONFIGS = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    scope: "openid email profile",
  },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID,
    authUrl: "https://github.com/login/oauth/authorize",
    scope: "user:email",
  },
  apple: {
    clientId: process.env.APPLE_CLIENT_ID,
    authUrl: "https://appleid.apple.com/auth/authorize",
    scope: "email name",
  },
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get("provider");

    if (!provider || !(provider in OAUTH_CONFIGS)) {
      return NextResponse.json(
        { error: "Invalid OAuth provider" },
        { status: 400 },
      );
    }

    const config = OAUTH_CONFIGS[provider as keyof typeof OAUTH_CONFIGS];

    if (!config.clientId) {
      return NextResponse.json(
        { error: `${provider} OAuth not configured` },
        { status: 400 },
      );
    }

    // Build OAuth URL
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/oauth/callback`;
    const state = Buffer.from(
      JSON.stringify({ provider, timestamp: Date.now() }),
    ).toString("base64");

    const authUrl = new URL(config.authUrl);
    authUrl.searchParams.set("client_id", config.clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", config.scope);
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("response_type", "code");

    return NextResponse.json({
      data: { authUrl: authUrl.toString() },
    });
  } catch (error) {
    logger.error("OAuth connection error:", error);
    return NextResponse.json(
      { error: "Failed to initialize OAuth connection" },
      { status: 500 },
    );
  }
}
