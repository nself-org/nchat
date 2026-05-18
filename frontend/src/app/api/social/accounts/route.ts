/**
 * Social Accounts API
 * Manages social media accounts (CRUD operations)
 */

import { NextRequest, NextResponse } from "next/server";
import { ApolloClient, InMemoryCache, HttpLink, gql } from "@apollo/client";

import { logger } from "@/lib/logger";

const apolloClient = new ApolloClient({
  link: new HttpLink({
    uri: process.env.NEXT_PUBLIC_GRAPHQL_URL,
    headers: {
      "x-hasura-admin-secret": process.env.HASURA_ADMIN_SECRET || "",
    },
  }),
  cache: new InMemoryCache(),
});

/**
 * GET /api/social/accounts
 * Get all social accounts
 */
export async function GET(request: NextRequest) {
  try {
    const { data } = await apolloClient.query({
      query: gql`
        query GetSocialAccounts {
          nchat_social_accounts(order_by: { created_at: desc }) {
            id
            platform
            account_id
            account_name
            account_handle
            avatar_url
            is_active
            last_poll_time
            created_at
            updated_at
            token_expires_at
          }
        }
      `,
      fetchPolicy: "network-only",
    });

    return NextResponse.json(data.nchat_social_accounts);
  } catch (error) {
    logger.error("Get social accounts error:", error);
    return NextResponse.json(
      { error: "Failed to fetch social accounts" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/social/accounts
 * Create a new social account
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { data } = await apolloClient.mutate({
      mutation: gql`
        mutation CreateSocialAccount(
          $account: nchat_social_accounts_insert_input!
        ) {
          insert_nchat_social_accounts_one(object: $account) {
            id
            platform
            account_id
            account_name
            account_handle
            avatar_url
            is_active
            created_at
          }
        }
      `,
      variables: {
        account: {
          platform: body.platform,
          account_id: body.account_id,
          account_name: body.account_name,
          account_handle: body.account_handle,
          avatar_url: body.avatar_url,
          access_token_encrypted: body.access_token_encrypted,
          refresh_token_encrypted: body.refresh_token_encrypted,
          token_expires_at: body.token_expires_at,
          is_active: true,
          created_by: body.created_by || "00000000-0000-0000-0000-000000000000", // System user
        },
      },
    });

    return NextResponse.json(data.insert_nchat_social_accounts_one);
  } catch (error) {
    logger.error("Create social account error:", error);
    return NextResponse.json(
      { error: "Failed to create social account" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/social/accounts/[id]
 * Delete a social account
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing account ID" },
        { status: 400 },
      );
    }

    const { data } = await apolloClient.mutate({
      mutation: gql`
        mutation DeleteSocialAccount($id: uuid!) {
          delete_nchat_social_accounts_by_pk(id: $id) {
            id
          }
        }
      `,
      variables: { id },
    });

    return NextResponse.json(data.delete_nchat_social_accounts_by_pk);
  } catch (error) {
    logger.error("Delete social account error:", error);
    return NextResponse.json(
      { error: "Failed to delete social account" },
      { status: 500 },
    );
  }
}
