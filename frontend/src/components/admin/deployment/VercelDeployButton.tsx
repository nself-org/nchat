"use client";

import React, { useState } from "react";
import {
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ChevronRight,
  ChevronDown,
  Rocket,
  GitBranch,
  Link as LinkIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface EnvVariable {
  name: string;
  description: string;
  required: boolean;
  example: string;
  currentValue?: string;
}

const REQUIRED_ENV_VARS: EnvVariable[] = [
  {
    name: "NEXT_PUBLIC_USE_DEV_AUTH",
    description: "Disable development authentication for production",
    required: true,
    example: "false",
  },
  {
    name: "NEXT_PUBLIC_APP_NAME",
    description: "Your application name",
    required: true,
    example: "nchat",
  },
  {
    name: "NEXT_PUBLIC_APP_URL",
    description: "Your deployment URL (will be your Vercel URL)",
    required: true,
    example: "https://nchat.vercel.app",
  },
  {
    name: "NEXT_PUBLIC_GRAPHQL_URL",
    description: "Hasura GraphQL endpoint",
    required: true,
    example: "https://api.yourproject.nhost.run/v1/graphql",
  },
  {
    name: "NEXT_PUBLIC_AUTH_URL",
    description: "Authentication service URL",
    required: true,
    example: "https://auth.yourproject.nhost.run/v1/auth",
  },
  {
    name: "NEXT_PUBLIC_STORAGE_URL",
    description: "File storage service URL",
    required: true,
    example: "https://storage.yourproject.nhost.run/v1/storage",
  },
];

const OPTIONAL_ENV_VARS: EnvVariable[] = [
  {
    name: "NEXT_PUBLIC_SENTRY_DSN",
    description: "Sentry error tracking DSN",
    required: false,
    example: "https://[key]@[org].ingest.sentry.io/[project]",
  },
  {
    name: "NEXT_PUBLIC_GA_ID",
    description: "Google Analytics tracking ID",
    required: false,
    example: "G-XXXXXXXXXX",
  },
];

export default function VercelDeployButton() {
  const [copiedVar, setCopiedVar] = useState<string | null>(null);
  const [expandedStep, setExpandedStep] = useState<string>("step-1");

  const copyToClipboard = async (text: string, varName: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedVar(varName);
    setTimeout(() => setCopiedVar(null), 2000);
  };

  const checkEnvVarSet = (varName: string): boolean => {
    if (typeof window === "undefined") return false;
    const value = process.env[varName];
    return Boolean(value && value !== "undefined" && value !== "");
  };

  const allRequiredVarsSet = REQUIRED_ENV_VARS.every((envVar) =>
    checkEnvVarSet(envVar.name),
  );

  const deployUrl = `https://vercel.com/new/clone?repository-url=https://github.com/yourusername/nself-chat&env=${REQUIRED_ENV_VARS.map((v) => v.name).join(",")}&envDescription=Environment%20variables%20required%20for%20nchat&envLink=https://github.com/yourusername/nself-chat/blob/main/docs/guides/deployment/vercel-deployment.md&project-name=nchat&repository-name=nself-chat`;

  return (
    <div className="space-y-6">
      {/* Deploy Button Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Rocket className="h-5 w-5" />
                Deploy to Vercel
              </CardTitle>
              <CardDescription>
                One-click deployment for nchat with automatic configuration
              </CardDescription>
            </div>
            <Badge variant={allRequiredVarsSet ? "default" : "secondary"}>
              {allRequiredVarsSet ? "Ready to Deploy" : "Setup Required"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick Deploy */}
          <div className="flex items-center gap-4">
            <Button
              size="lg"
              className="flex-1"
              onClick={() => window.open(deployUrl, "_blank")}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Deploy Now
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() =>
                window.open(
                  "https://vercel.com/docs/deployments/overview",
                  "_blank",
                )
              }
            >
              Documentation
            </Button>
          </div>

          {!allRequiredVarsSet && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Configuration Required</AlertTitle>
              <AlertDescription>
                Some required environment variables are not configured. Follow
                the steps below to set them up before deploying.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Step-by-Step Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Deployment Guide</CardTitle>
          <CardDescription>
            Follow these steps to deploy nchat to Vercel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion
            type="single"
            collapsible
            value={expandedStep}
            onValueChange={setExpandedStep}
            className="w-full"
          >
            {/* Step 1: Fork Repository */}
            <AccordionItem value="step-1">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4" />
                  <span>Step 1: Fork the Repository</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  First, fork the nself-chat repository to your GitHub account.
                </p>
                <ol className="list-inside list-decimal space-y-2 text-sm">
                  <li>
                    Visit{" "}
                    <a
                      href="https://github.com/yourusername/nself-chat"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      github.com/yourusername/nself-chat
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </li>
                  <li>Click the "Fork" button in the top-right corner</li>
                  <li>Choose your GitHub account as the destination</li>
                  <li>Wait for the fork to complete</li>
                </ol>
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Once forked, you'll have your own copy of the repository to
                    deploy and customize.
                  </AlertDescription>
                </Alert>
              </AccordionContent>
            </AccordionItem>

            {/* Step 2: Setup Backend */}
            <AccordionItem value="step-2">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" />
                  <span>Step 2: Setup Backend Services</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  nchat requires backend services (GraphQL, Auth, Storage).
                  Choose one option:
                </p>
                <div className="space-y-3">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">
                        Option A: Nhost Cloud (Recommended)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <ol className="list-inside list-decimal space-y-1">
                        <li>
                          Sign up at{" "}
                          <a
                            href="https://nhost.io"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            nhost.io
                          </a>
                        </li>
                        <li>Create a new project</li>
                        <li>
                          Copy your GraphQL, Auth, and Storage URLs from project
                          settings
                        </li>
                      </ol>
                      <Badge variant="secondary">Free tier available</Badge>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">
                        Option B: Self-Host with nself CLI
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <ol className="list-inside list-decimal space-y-1">
                        <li>Deploy nself backend to your server</li>
                        <li>Configure public HTTPS URLs</li>
                        <li>Ensure services are accessible from internet</li>
                      </ol>
                      <Badge variant="outline">Advanced users</Badge>
                    </CardContent>
                  </Card>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Step 3: Environment Variables */}
            <AccordionItem value="step-3">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>Step 3: Configure Environment Variables</span>
                  <Badge variant="destructive" className="ml-auto mr-2">
                    Required
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  These environment variables must be set in Vercel before
                  deployment:
                </p>

                {/* Required Variables */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">Required Variables</h4>
                  {REQUIRED_ENV_VARS.map((envVar) => {
                    const isSet = checkEnvVarSet(envVar.name);
                    return (
                      <Card key={envVar.name}>
                        <CardContent className="pt-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <code className="rounded bg-muted px-2 py-1 font-mono text-sm">
                                {envVar.name}
                              </code>
                              <div className="flex items-center gap-2">
                                {isSet && (
                                  <Badge variant="default" className="text-xs">
                                    <CheckCircle2 className="mr-1 h-3 w-3" />
                                    Set
                                  </Badge>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    copyToClipboard(envVar.example, envVar.name)
                                  }
                                >
                                  {copiedVar === envVar.name ? (
                                    <Check className="h-3 w-3" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {envVar.description}
                            </p>
                            <div className="bg-muted/50 rounded p-2 font-mono text-xs">
                              Example: {envVar.example}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Optional Variables */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">
                    Optional Variables (Recommended)
                  </h4>
                  {OPTIONAL_ENV_VARS.map((envVar) => (
                    <Card key={envVar.name}>
                      <CardContent className="pt-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <code className="rounded bg-muted px-2 py-1 font-mono text-sm">
                              {envVar.name}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                copyToClipboard(envVar.example, envVar.name)
                              }
                            >
                              {copiedVar === envVar.name ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {envVar.description}
                          </p>
                          <div className="bg-muted/50 rounded p-2 font-mono text-xs">
                            Example: {envVar.example}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Step 4: Deploy */}
            <AccordionItem value="step-4">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Rocket className="h-4 w-4" />
                  <span>Step 4: Deploy to Vercel</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Now you're ready to deploy!
                </p>
                <ol className="list-inside list-decimal space-y-2 text-sm">
                  <li>Click the "Deploy Now" button at the top</li>
                  <li>
                    Vercel will open and ask you to connect your GitHub account
                  </li>
                  <li>Select your forked repository</li>
                  <li>Add all environment variables from Step 3</li>
                  <li>Click "Deploy"</li>
                  <li>Wait 2-3 minutes for the build to complete</li>
                </ol>
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    After deployment, you'll receive a unique URL like
                    https://nchat-abc123.vercel.app
                  </AlertDescription>
                </Alert>
              </AccordionContent>
            </AccordionItem>

            {/* Step 5: Post-Deployment */}
            <AccordionItem value="step-5">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Step 5: Post-Deployment Setup</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  After successful deployment:
                </p>
                <ol className="list-inside list-decimal space-y-2 text-sm">
                  <li>Update NEXT_PUBLIC_APP_URL to your actual Vercel URL</li>
                  <li>Run the setup wizard to configure your app</li>
                  <li>
                    (Optional) Configure a custom domain in Vercel settings
                  </li>
                  <li>(Optional) Set up monitoring with Sentry</li>
                  <li>Test all features work correctly</li>
                </ol>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Important</AlertTitle>
                  <AlertDescription>
                    Make sure to update your OAuth callback URLs and CORS
                    settings in your backend to include your new Vercel domain.
                  </AlertDescription>
                </Alert>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Helpful Resources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Button
              variant="outline"
              className="justify-start"
              onClick={() =>
                window.open(
                  "/docs/guides/deployment/vercel-deployment.md",
                  "_blank",
                )
              }
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Full Deployment Guide
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => window.open("https://vercel.com/docs", "_blank")}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Vercel Documentation
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => window.open("https://docs.nhost.io", "_blank")}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Nhost Documentation
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() =>
                window.open(
                  "https://github.com/nself/nself-chat/issues",
                  "_blank",
                )
              }
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Get Help
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
