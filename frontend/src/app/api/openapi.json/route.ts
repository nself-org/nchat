/**
 * OpenAPI Specification
 *
 * Serves the OpenAPI/Swagger specification for the nChat REST API.
 */

import { NextResponse } from "next/server";

const openAPISpec = {
  openapi: "3.0.0",
  info: {
    title: "nChat API",
    description: "White-label team communication platform API",
    version: "1.0.0",
    contact: {
      name: "nChat Team",
      url: "https://nchat.example.com",
      email: "support@nchat.example.com",
    },
    license: {
      name: "MIT",
      url: "https://opensource.org/licenses/MIT",
    },
  },
  servers: [
    {
      url: "https://api.nchat.example.com",
      description: "Production server",
    },
    {
      url: "http://localhost:3000",
      description: "Development server",
    },
  ],
  tags: [
    { name: "Authentication", description: "Authentication and authorization" },
    { name: "Users", description: "User management" },
    { name: "Channels", description: "Channel operations" },
    { name: "Messages", description: "Message operations" },
    { name: "Webhooks", description: "Webhook management" },
    { name: "Bots", description: "Bot API" },
    { name: "Admin", description: "Administrative operations" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
      apiKey: {
        type: "apiKey",
        in: "header",
        name: "X-API-Key",
      },
    },
    schemas: {
      User: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          email: { type: "string", format: "email" },
          displayName: { type: "string" },
          username: { type: "string" },
          avatarUrl: { type: "string", format: "uri" },
          role: {
            type: "string",
            enum: ["owner", "admin", "moderator", "member", "guest"],
          },
          status: {
            type: "string",
            enum: ["active", "inactive", "suspended", "deleted"],
          },
          isOnline: { type: "boolean" },
          lastSeenAt: { type: "string", format: "date-time" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Channel: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          description: { type: "string" },
          type: {
            type: "string",
            enum: ["public", "private", "direct", "group"],
          },
          category: { type: "string" },
          isArchived: { type: "boolean" },
          memberCount: { type: "integer" },
          unreadCount: { type: "integer" },
          lastMessageAt: { type: "string", format: "date-time" },
          createdBy: { type: "string", format: "uuid" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Message: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          channelId: { type: "string", format: "uuid" },
          userId: { type: "string", format: "uuid" },
          content: { type: "string" },
          type: {
            type: "string",
            enum: ["text", "file", "image", "video", "audio", "system"],
          },
          status: {
            type: "string",
            enum: ["sending", "sent", "delivered", "read", "failed"],
          },
          parentId: { type: "string", format: "uuid" },
          threadCount: { type: "integer" },
          isEdited: { type: "boolean" },
          isPinned: { type: "boolean" },
          isDeleted: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Error: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: {
              code: { type: "string" },
              message: { type: "string" },
              errors: { type: "object" },
            },
          },
          success: { type: "boolean", default: false },
        },
      },
      PaginatedResponse: {
        type: "object",
        properties: {
          data: { type: "array", items: {} },
          pagination: {
            type: "object",
            properties: {
              total: { type: "integer" },
              limit: { type: "integer" },
              offset: { type: "integer" },
              hasMore: { type: "boolean" },
              nextCursor: { type: "string" },
            },
          },
          success: { type: "boolean", default: true },
        },
      },
    },
  },
  paths: {
    "/api/auth/signup": {
      post: {
        tags: ["Authentication"],
        summary: "Sign up a new user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password", "displayName"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 8 },
                  displayName: { type: "string" },
                  username: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "User created successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        user: { $ref: "#/components/schemas/User" },
                        token: { type: "string" },
                        refreshToken: { type: "string" },
                        expiresAt: { type: "string", format: "date-time" },
                      },
                    },
                    success: { type: "boolean" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
        },
      },
    },
    "/api/auth/signin": {
      post: {
        tags: ["Authentication"],
        summary: "Sign in an existing user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "User signed in successfully",
          },
          "401": { description: "Invalid credentials" },
        },
      },
    },
    "/api/channels": {
      get: {
        tags: ["Channels"],
        summary: "List all channels",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "query",
            name: "limit",
            schema: { type: "integer", default: 50 },
            description: "Number of results to return",
          },
          {
            in: "query",
            name: "offset",
            schema: { type: "integer", default: 0 },
            description: "Number of results to skip",
          },
          {
            in: "query",
            name: "type",
            schema: { type: "string", enum: ["public", "private"] },
            description: "Filter by channel type",
          },
        ],
        responses: {
          "200": {
            description: "List of channels",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/PaginatedResponse" },
                    {
                      type: "object",
                      properties: {
                        data: {
                          type: "array",
                          items: { $ref: "#/components/schemas/Channel" },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
        },
      },
      post: {
        tags: ["Channels"],
        summary: "Create a new channel",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "type"],
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  type: { type: "string", enum: ["public", "private"] },
                  category: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Channel created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { $ref: "#/components/schemas/Channel" },
                    success: { type: "boolean" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/channels/{channelId}/messages": {
      get: {
        tags: ["Messages"],
        summary: "Get messages in a channel",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "channelId",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
          {
            in: "query",
            name: "limit",
            schema: { type: "integer", default: 50 },
          },
          {
            in: "query",
            name: "offset",
            schema: { type: "integer", default: 0 },
          },
        ],
        responses: {
          "200": {
            description: "List of messages",
          },
        },
      },
    },
    "/api/messages": {
      post: {
        tags: ["Messages"],
        summary: "Send a message",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["channelId", "content"],
                properties: {
                  channelId: { type: "string", format: "uuid" },
                  content: { type: "string" },
                  parentId: { type: "string", format: "uuid" },
                  mentions: {
                    type: "array",
                    items: { type: "string", format: "uuid" },
                  },
                  attachments: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Message sent",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { $ref: "#/components/schemas/Message" },
                    success: { type: "boolean" },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

export async function GET() {
  return NextResponse.json(openAPISpec, {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
