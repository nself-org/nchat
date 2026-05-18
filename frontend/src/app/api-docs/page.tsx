"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import "swagger-ui-react/swagger-ui.css";

import { logger } from "@/lib/logger";

// Dynamically import SwaggerUI to avoid SSR issues
const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

export default function ApiDocsPage() {
  const [spec, setSpec] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch the OpenAPI spec
    fetch("/openapi.yaml")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch OpenAPI spec");
        }
        return response.text();
      })
      .then((yamlText) => {
        // SwaggerUI can parse YAML directly
        setSpec(yamlText);
      })
      .catch((err) => {
        logger.error("Error loading OpenAPI spec:", err);
        setError(err.message);
      });
  }, []);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h2 className="mb-2 text-center text-xl font-semibold text-gray-900">
            Failed to Load API Documentation
          </h2>
          <p className="text-center text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!spec) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-indigo-600" />
          <p className="text-gray-600">Loading API documentation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="api-docs-container">
      <style jsx global>{`
        .api-docs-container {
          min-height: 100vh;
          background: #fafafa;
        }

        /* Custom Swagger UI styling to match app theme */
        .swagger-ui .topbar {
          display: none;
        }

        .swagger-ui .info {
          margin: 50px auto;
          max-width: 1200px;
        }

        .swagger-ui .scheme-container {
          background: #fff;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
          padding: 20px;
          margin: 20px auto;
          max-width: 1200px;
          border-radius: 8px;
        }

        .swagger-ui .opblock-tag {
          border-bottom: 1px solid #e5e7eb;
          padding: 15px 0;
        }

        .swagger-ui .opblock {
          border-radius: 8px;
          margin: 10px 0;
          border: 1px solid #e5e7eb;
        }

        .swagger-ui .opblock.opblock-get {
          border-color: #61affe;
          background: rgba(97, 175, 254, 0.05);
        }

        .swagger-ui .opblock.opblock-post {
          border-color: #49cc90;
          background: rgba(73, 204, 144, 0.05);
        }

        .swagger-ui .opblock.opblock-patch {
          border-color: #fca130;
          background: rgba(252, 161, 48, 0.05);
        }

        .swagger-ui .opblock.opblock-delete {
          border-color: #f93e3e;
          background: rgba(249, 62, 62, 0.05);
        }

        .swagger-ui .btn.authorize {
          background: #4f46e5;
          border-color: #4f46e5;
        }

        .swagger-ui .btn.authorize:hover {
          background: #4338ca;
          border-color: #4338ca;
        }

        .swagger-ui .btn.execute {
          background: #4f46e5;
          border-color: #4f46e5;
        }

        .swagger-ui .btn.execute:hover {
          background: #4338ca;
          border-color: #4338ca;
        }

        /* Improve code block styling */
        .swagger-ui .highlight-code {
          background: #1f2937;
          border-radius: 6px;
        }

        .swagger-ui .highlight-code > pre {
          padding: 16px;
        }

        /* Response examples */
        .swagger-ui .responses-wrapper {
          padding: 20px;
        }

        /* Parameter tables */
        .swagger-ui table {
          border-radius: 6px;
          overflow: hidden;
        }

        .swagger-ui table thead tr {
          background: #f9fafb;
        }

        /* Models section */
        .swagger-ui .model-box {
          background: #f9fafb;
          border-radius: 6px;
          padding: 15px;
        }

        /* Try it out button */
        .swagger-ui .try-out__btn {
          background: #4f46e5;
          border-color: #4f46e5;
          color: white;
        }

        .swagger-ui .try-out__btn:hover {
          background: #4338ca;
          border-color: #4338ca;
        }

        /* Loading overlay */
        .swagger-ui .loading-container {
          display: flex;
          justify-content: center;
          padding: 40px;
        }
      `}</style>

      <SwaggerUI spec={spec} />
    </div>
  );
}
