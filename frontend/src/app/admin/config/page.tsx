"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Settings, Wrench } from "lucide-react";

export default function ConfigPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="flex items-center gap-3 text-3xl font-bold">
          <Settings className="h-8 w-8" />
          App Configuration
        </h1>
        <p className="mt-2 text-muted-foreground">
          Customize your application settings, branding, and features
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Under Construction
          </CardTitle>
          <CardDescription>
            The admin configuration interface is being rebuilt with improved
            functionality.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>In the meantime, you can configure your application using:</p>
            <ul className="ml-4 list-inside list-disc space-y-1">
              <li>
                Environment variables in{" "}
                <code className="rounded bg-muted px-1">.env.local</code>
              </li>
              <li>
                Platform templates via{" "}
                <code className="rounded bg-muted px-1">
                  NEXT_PUBLIC_PLATFORM_TEMPLATE
                </code>
              </li>
              <li>
                Feature flags via{" "}
                <code className="rounded bg-muted px-1">
                  NEXT_PUBLIC_FEATURE_*
                </code>{" "}
                variables
              </li>
              <li>
                Theme customization via{" "}
                <code className="rounded bg-muted px-1">
                  NEXT_PUBLIC_THEME_*
                </code>{" "}
                variables
              </li>
            </ul>
            <p className="mt-4">
              See <code className="rounded bg-muted px-1">.env.example</code>{" "}
              for a complete list of configuration options.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
