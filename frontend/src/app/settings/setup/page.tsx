"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, ArrowLeft, Wrench } from "lucide-react";

export default function SetupManagementPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Check if user has permission
  useEffect(() => {
    if (user && user.role !== "owner" && user.role !== "admin") {
      router.push("/settings/profile");
    }
  }, [user, router]);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => router.push("/settings")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Settings
      </Button>

      <div className="mb-8">
        <h1 className="flex items-center gap-3 text-3xl font-bold">
          <Settings className="h-8 w-8" />
          Setup Management
        </h1>
        <p className="mt-2 text-muted-foreground">
          Configure application settings, branding, and features
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Under Construction
          </CardTitle>
          <CardDescription>
            The setup management interface is being rebuilt with improved
            functionality.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              The setup wizard and configuration management is being redesigned.
              In the meantime:
            </p>
            <ul className="ml-4 list-inside list-disc space-y-1">
              <li>Configure your application using environment variables</li>
              <li>
                Select a platform template via{" "}
                <code className="rounded bg-muted px-1">
                  NEXT_PUBLIC_PLATFORM_TEMPLATE
                </code>
              </li>
              <li>
                Customize features via{" "}
                <code className="rounded bg-muted px-1">
                  NEXT_PUBLIC_FEATURE_*
                </code>{" "}
                variables
              </li>
            </ul>
            <p className="mt-4">
              See <code className="rounded bg-muted px-1">.env.example</code>{" "}
              for all available options.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
