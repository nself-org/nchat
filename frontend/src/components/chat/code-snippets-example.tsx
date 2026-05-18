/**
 * Example usage of code snippets and syntax highlighting components
 * This file demonstrates all features of the code highlighting system
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Code2 } from "lucide-react";
import { CodeBlock } from "./CodeBlock";
import { InlineCode } from "./InlineCode";
import { CodeSnippetModal } from "./CodeSnippetModal";
import type { CodeSnippet } from "./CodeSnippetModal";

export function CodeSnippetsExample() {
  const [showModal, setShowModal] = useState(false);

  // Example code snippets
  const examples = {
    javascript: `// React Hook for data fetching
import { useState, useEffect } from 'react'

export function useDataFetch(url) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch(url)
      .then(response => response.json())
      .then(data => {
        setData(data)
        setLoading(false)
      })
      .catch(error => {
        setError(error)
        setLoading(false)
      })
  }, [url])

  return { data, loading, error }
}`,

    typescript: `// Type-safe API client
interface User {
  id: string
  name: string
  email: string
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  async getUser(id: string): Promise<User> {
    const response = await fetch(\\\`\${this.baseUrl}/users/\${id}\\\`)
    if (!response.ok) {
      throw new Error('Failed to fetch user')
    }
    return response.json()
  }
}

export default ApiClient`,

    python: `# Data processing pipeline
import pandas as pd
from typing import List, Dict

def process_data(file_path: str) -> pd.DataFrame:
    """
    Load and process CSV data

    Args:
        file_path: Path to CSV file

    Returns:
        Processed DataFrame
    """
    df = pd.read_csv(file_path)

    # Clean data
    df = df.dropna()
    df = df.drop_duplicates()

    # Transform
    df['date'] = pd.to_datetime(df['date'])
    df['value'] = df['value'].astype(float)

    return df`,

    sql: `-- User analytics query
SELECT
    u.id,
    u.name,
    COUNT(DISTINCT m.id) as message_count,
    AVG(m.length) as avg_message_length,
    MAX(m.created_at) as last_message_at
FROM users u
LEFT JOIN messages m ON u.id = m.user_id
WHERE u.created_at > NOW() - INTERVAL '30 days'
GROUP BY u.id, u.name
HAVING COUNT(DISTINCT m.id) > 10
ORDER BY message_count DESC
LIMIT 100;`,

    go: `// Concurrent HTTP server
package main

import (
    "fmt"
    "net/http"
    "sync"
)

type Server struct {
    mu    sync.RWMutex
    users map[string]string
}

func (s *Server) handleUser(w http.ResponseWriter, r *http.Request) {
    s.mu.RLock()
    defer s.mu.RUnlock()

    userID := r.URL.Query().Get("id")
    user, exists := s.users[userID]

    if !exists {
        http.Error(w, "User not found", http.StatusNotFound)
        return
    }

    fmt.Fprintf(w, "User: %s", user)
}

func main() {
    server := &Server{
        users: make(map[string]string),
    }

    http.HandleFunc("/user", server.handleUser)
    http.ListenAndServe(":8080", nil)
}`,
  };

  // Handle snippet share
  const handleShare = async (snippet: CodeSnippet) => {
    // REMOVED: console.log('Sharing snippet:', snippet)
    // In production, this would send to the backend
    alert(`Shared: ${snippet.title} (${snippet.language})`);
  };

  return (
    <div className="space-y-8 p-6">
      <div>
        <h2 className="mb-4 text-2xl font-bold">
          Code Snippets & Syntax Highlighting
        </h2>
        <p className="mb-4 text-muted-foreground">
          Examples of inline code and code blocks with syntax highlighting
        </p>

        {/* Inline Code Examples */}
        <div className="mb-6 space-y-2">
          <h3 className="text-lg font-semibold">Inline Code</h3>
          <p>
            Use <InlineCode>const variable = "value"</InlineCode> to declare
            constants. You can also use <InlineCode>npm install</InlineCode> to
            install packages.
          </p>
          <p>
            API endpoint:{" "}
            <InlineCode>https://api.example.com/v1/users</InlineCode>
          </p>
        </div>

        {/* Code Block Examples */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold">Code Blocks</h3>

          {/* JavaScript Example */}
          <div>
            <h4 className="mb-2 text-sm font-medium text-muted-foreground">
              JavaScript - React Hook
            </h4>
            <CodeBlock
              code={examples.javascript}
              language="javascript"
              filename="useDataFetch.js"
              showLineNumbers
            />
          </div>

          {/* TypeScript Example */}
          <div>
            <h4 className="mb-2 text-sm font-medium text-muted-foreground">
              TypeScript - API Client
            </h4>
            <CodeBlock
              code={examples.typescript}
              language="typescript"
              filename="ApiClient.ts"
              showLineNumbers
            />
          </div>

          {/* Python Example */}
          <div>
            <h4 className="mb-2 text-sm font-medium text-muted-foreground">
              Python - Data Processing
            </h4>
            <CodeBlock
              code={examples.python}
              language="python"
              filename="process_data.py"
              showLineNumbers
            />
          </div>

          {/* SQL Example */}
          <div>
            <h4 className="mb-2 text-sm font-medium text-muted-foreground">
              SQL - Analytics Query
            </h4>
            <CodeBlock
              code={examples.sql}
              language="sql"
              filename="user_analytics.sql"
              showLineNumbers
            />
          </div>

          {/* Go Example */}
          <div>
            <h4 className="mb-2 text-sm font-medium text-muted-foreground">
              Go - HTTP Server
            </h4>
            <CodeBlock
              code={examples.go}
              language="go"
              filename="server.go"
              showLineNumbers
            />
          </div>

          {/* Without Line Numbers */}
          <div>
            <h4 className="mb-2 text-sm font-medium text-muted-foreground">
              Without Line Numbers
            </h4>
            <CodeBlock
              code="console.log('Hello, World!')\nconsole.log('No line numbers')"
              language="javascript"
              showLineNumbers={false}
            />
          </div>

          {/* Create Snippet Button */}
          <div className="flex justify-center pt-6">
            <Button
              onClick={() => setShowModal(true)}
              size="lg"
              className="gap-2"
            >
              <Code2 className="h-5 w-5" />
              Create Code Snippet
            </Button>
          </div>
        </div>
      </div>

      {/* Code Snippet Modal */}
      <CodeSnippetModal
        open={showModal}
        onOpenChange={setShowModal}
        onShare={handleShare}
      />
    </div>
  );
}

/**
 * Example of using code snippets in message content
 */
export function MessageWithCodeExample() {
  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center gap-2">
        <div className="bg-primary/20 h-10 w-10 rounded-full" />
        <div>
          <p className="font-semibold">John Developer</p>
          <p className="text-xs text-muted-foreground">2 minutes ago</p>
        </div>
      </div>

      <div className="space-y-3">
        <p>
          Here's how to fix the authentication issue. You need to update the{" "}
          <InlineCode>useAuth</InlineCode> hook:
        </p>

        <CodeBlock
          code={`export function useAuth() {
  const { user, loading } = useAuthContext()

  // Add this check
  if (loading) {
    return { user: null, loading: true }
  }

  return { user, loading: false }
}`}
          language="typescript"
          filename="useAuth.ts"
          showLineNumbers
        />

        <p>
          This ensures that <InlineCode>user</InlineCode> is{" "}
          <InlineCode>null</InlineCode> while loading, preventing any undefined
          errors.
        </p>
      </div>
    </div>
  );
}
