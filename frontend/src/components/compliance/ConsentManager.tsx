"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle,
  XCircle,
  Clock,
  Info,
  Shield,
  Save,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useComplianceStore } from "@/stores/compliance-store";
import type {
  ConsentType,
  ConsentStatus,
  UserConsent,
} from "@/lib/compliance/compliance-types";
import { logger } from "@/lib/logger";
import {
  CONSENT_CONFIGS,
  createConsent,
  updateConsentStatus,
  hasRequiredConsents,
  getCurrentConsentStatus,
  generateConsentSummary,
  getLegalBasisInfo,
} from "@/lib/compliance/consent-manager";

interface ConsentItemProps {
  config: (typeof CONSENT_CONFIGS)[number];
  consent?: UserConsent;
  onToggle: (type: ConsentType, granted: boolean) => void;
}

function ConsentItem({ config, consent, onToggle }: ConsentItemProps) {
  const status = consent?.status || "pending";
  const isGranted = status === "granted";
  const legalBasisInfo = getLegalBasisInfo(config.legalBasis);

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Label className="text-base font-medium">{config.name}</Label>
            {config.required && (
              <Badge variant="secondary" className="text-xs">
                Required
              </Badge>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-medium">{legalBasisInfo.name}</p>
                  <p className="mt-1 text-xs">{legalBasisInfo.gdprArticle}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {config.description}
          </p>
        </div>
        <Switch
          checked={isGranted}
          onCheckedChange={(checked) => onToggle(config.type, checked)}
          disabled={config.required}
        />
      </div>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="details" className="border-0">
          <AccordionTrigger className="py-1 text-sm text-muted-foreground">
            View details
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 text-sm">
              <div>
                <p className="font-medium text-muted-foreground">
                  Data Processed
                </p>
                <ul className="list-inside list-disc text-muted-foreground">
                  {config.dataProcessed.map((data, i) => (
                    <li key={i}>{data}</li>
                  ))}
                </ul>
              </div>
              {config.thirdParties && config.thirdParties.length > 0 && (
                <div>
                  <p className="font-medium text-muted-foreground">
                    Third Parties
                  </p>
                  <p className="text-muted-foreground">
                    {config.thirdParties.join(", ")}
                  </p>
                </div>
              )}
              {config.retentionPeriod && (
                <div>
                  <p className="font-medium text-muted-foreground">
                    Retention Period
                  </p>
                  <p className="text-muted-foreground">
                    {config.retentionPeriod}
                  </p>
                </div>
              )}
              <div>
                <p className="font-medium text-muted-foreground">Legal Basis</p>
                <p className="text-muted-foreground">
                  {legalBasisInfo.name} ({legalBasisInfo.gdprArticle})
                </p>
              </div>
              {consent?.grantedAt && (
                <div>
                  <p className="font-medium text-muted-foreground">
                    Consent Given
                  </p>
                  <p className="text-muted-foreground">
                    {new Date(consent.grantedAt).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

export function ConsentManager() {
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const { userConsents, setUserConsents, updateConsent } = useComplianceStore();

  // Initialize consents if not present
  useEffect(() => {
    if (userConsents.length === 0) {
      const initialConsents = CONSENT_CONFIGS.map((config) =>
        createConsent(
          "user-123",
          config.type,
          config.required ? "granted" : "pending",
          {
            source: "signup",
          },
        ),
      );
      setUserConsents(initialConsents);
    }
  }, [userConsents.length, setUserConsents]);

  const summary = generateConsentSummary(userConsents);
  const { valid: hasRequired, missing } = hasRequiredConsents(userConsents);

  const handleToggle = (type: ConsentType, granted: boolean) => {
    const config = CONSENT_CONFIGS.find((c) => c.type === type);
    if (config?.required) return; // Can't toggle required consents

    updateConsent(type, granted ? "granted" : "denied");
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // API call would go here
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setHasChanges(false);
    } catch (error) {
      logger.error("Failed to save consent preferences:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAcceptAll = () => {
    CONSENT_CONFIGS.forEach((config) => {
      updateConsent(config.type, "granted");
    });
    setHasChanges(true);
  };

  const handleRejectOptional = () => {
    CONSENT_CONFIGS.forEach((config) => {
      if (!config.required) {
        updateConsent(config.type, "denied");
      }
    });
    setHasChanges(true);
  };

  const getConsentByType = (type: ConsentType) =>
    userConsents.find((c) => c.consentType === type);

  // Group configs by category
  const groupedConfigs = CONSENT_CONFIGS.reduce(
    (acc, config) => {
      if (!acc[config.category]) {
        acc[config.category] = [];
      }
      acc[config.category].push(config);
      return acc;
    },
    {} as Record<string, typeof CONSENT_CONFIGS>,
  );

  const categoryLabels: Record<string, string> = {
    essential: "Essential",
    functional: "Functional",
    analytics: "Analytics",
    marketing: "Marketing",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <Shield className="h-6 w-6" />
            Consent Preferences
          </h2>
          <p className="text-muted-foreground">
            Manage how we use your data and communicate with you
          </p>
        </div>
        <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Preferences
            </>
          )}
        </Button>
      </div>

      {/* Summary Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="font-medium">{summary.granted} Granted</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <span className="font-medium">{summary.denied} Denied</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                <span className="font-medium">{summary.pending} Pending</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRejectOptional}
              >
                Reject Optional
              </Button>
              <Button size="sm" onClick={handleAcceptAll}>
                Accept All
              </Button>
            </div>
          </div>
          {!hasRequired && missing.length > 0 && (
            <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
              <p className="text-sm text-yellow-800">
                <strong>Required consent missing:</strong>{" "}
                {missing
                  .map((m) => CONSENT_CONFIGS.find((c) => c.type === m)?.name)
                  .join(", ")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Consent Categories */}
      {Object.entries(groupedConfigs).map(([category, configs]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="text-lg">
              {categoryLabels[category] || category}
            </CardTitle>
            <CardDescription>
              {category === "essential" &&
                "Required for the application to function"}
              {category === "functional" &&
                "Enhance your experience with additional features"}
              {category === "analytics" &&
                "Help us understand how you use our service"}
              {category === "marketing" &&
                "Receive relevant communications and offers"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {configs.map((config) => (
              <ConsentItem
                key={config.type}
                config={config}
                consent={getConsentByType(config.type)}
                onToggle={handleToggle}
              />
            ))}
          </CardContent>
        </Card>
      ))}

      {/* Information Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="h-4 w-4" />
            About Your Consent
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            You can change your consent preferences at any time. Changes will
            take effect immediately.
          </p>
          <ul className="list-inside list-disc space-y-1">
            <li>
              Essential consents cannot be withdrawn as they are required for
              the service
            </li>
            <li>Withdrawing consent may limit some features</li>
            <li>Your consent history is logged for compliance purposes</li>
            <li>
              For more information, see our{" "}
              <a href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </a>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
