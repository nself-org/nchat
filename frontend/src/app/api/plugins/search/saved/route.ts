/**
 * GET/POST/PUT/DELETE /api/plugins/search/saved
 *
 * Saved searches endpoint for Advanced Search plugin
 * Allows users to save and manage frequently used searches
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const SEARCH_SERVICE_URL =
  process.env.SEARCH_SERVICE_URL || "http://localhost:3107";

export interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  query: string;
  filters?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
  useCount: number;
}

// GET - Fetch saved searches for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const searchId = searchParams.get("id");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 },
      );
    }

    let url = `${SEARCH_SERVICE_URL}/api/search/saved?userId=${userId}`;
    if (searchId) {
      url += `&id=${searchId}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error("Saved searches fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch saved searches" },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    logger.error("Saved searches proxy error:", error);
    return NextResponse.json(
      { error: "Search service unavailable" },
      { status: 503 },
    );
  }
}

// POST - Create a new saved search
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.userId || !body.name || !body.query) {
      return NextResponse.json(
        { error: "userId, name, and query are required" },
        { status: 400 },
      );
    }

    const response = await fetch(`${SEARCH_SERVICE_URL}/api/search/saved`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: body.userId,
        name: body.name,
        query: body.query,
        filters: body.filters || {},
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error("Saved search creation error:", error);
      return NextResponse.json(
        { error: "Failed to save search" },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    logger.error("Saved searches POST proxy error:", error);
    return NextResponse.json(
      { error: "Search service unavailable" },
      { status: 503 },
    );
  }
}

// PUT - Update a saved search
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id || !body.userId) {
      return NextResponse.json(
        { error: "id and userId are required" },
        { status: 400 },
      );
    }

    const response = await fetch(`${SEARCH_SERVICE_URL}/api/search/saved`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error("Saved search update error:", error);
      return NextResponse.json(
        { error: "Failed to update saved search" },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    logger.error("Saved searches PUT proxy error:", error);
    return NextResponse.json(
      { error: "Search service unavailable" },
      { status: 503 },
    );
  }
}

// DELETE - Delete a saved search
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const searchId = searchParams.get("id");

    if (!userId || !searchId) {
      return NextResponse.json(
        { error: "userId and id are required" },
        { status: 400 },
      );
    }

    const response = await fetch(
      `${SEARCH_SERVICE_URL}/api/search/saved?userId=${userId}&id=${searchId}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const error = await response.text();
      logger.error("Saved search deletion error:", error);
      return NextResponse.json(
        { error: "Failed to delete saved search" },
        { status: response.status },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Saved search deleted",
    });
  } catch (error) {
    logger.error("Saved searches DELETE proxy error:", error);
    return NextResponse.json(
      { error: "Search service unavailable" },
      { status: 503 },
    );
  }
}

export const dynamic = "force-dynamic";
