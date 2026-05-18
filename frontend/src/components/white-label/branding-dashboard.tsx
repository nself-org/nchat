/**
 * Branding Dashboard - Complete White Label Control Center
 *
 * Unified interface for managing all branding aspects:
 * - Template selection
 * - Theme customization
 * - Logo management
 * - Domain configuration
 * - Custom CSS
 * - Export/Import
 */

"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Palette,
  Image as ImageIcon,
  Globe,
  Code,
  Download,
  Upload,
  Save,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Eye,
} from "lucide-react";
import { TemplateSelector } from "./template-selector";
import { ThemeEditor } from "./theme-editor";
import type { TemplateId } from "@/templates/types";
import { tenantBrandingService } from "@/lib/white-label/tenant-branding";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface BrandingDashboardProps {
  tenantId: string;
  userId: string;
  className?: string;
}

export function BrandingDashboard({
  tenantId,
  userId,
  className,
}: BrandingDashboardProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("template");
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Logo state
  const [primaryLogo, setPrimaryLogo] = useState<File | null>(null);
  const [primaryLogoPreview, setPrimaryLogoPreview] = useState<string>("");
  const [squareLogo, setSquareLogo] = useState<File | null>(null);
  const [squareLogoPreview, setSquareLogoPreview] = useState<string>("");
  const [favicon, setFavicon] = useState<File | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string>("");

  // Domain state
  const [customDomain, setCustomDomain] = useState("");
  const [domainStatus, setDomainStatus] = useState<
    "none" | "pending" | "verified"
  >("none");
  const [dnsRecords, setDnsRecords] = useState<
    Array<{ type: string; name: string; value: string }>
  >([]);

  // CSS state
  const [customCSS, setCustomCSS] = useState("");

  // Template state
  const [currentTemplate, setCurrentTemplate] = useState<TemplateId>("default");

  useEffect(() => {
    loadBrandingData();
  }, [tenantId]);

  const loadBrandingData = async () => {
    try {
      const branding = await tenantBrandingService.getTenantBranding(tenantId);
      if (branding) {
        setCurrentTemplate(branding.templateId);
        setPrimaryLogoPreview(branding.logos.primary?.url || "");
        setSquareLogoPreview(branding.logos.square?.url || "");
        setFaviconPreview(branding.logos.favicon?.url || "");
        setCustomDomain(branding.domains.primary || "");
        setDomainStatus(
          branding.domains.customDomainVerified ? "verified" : "none",
        );
        setCustomCSS(branding.customCSS || "");
      }
    } catch (error) {
      console.error("Failed to load branding:", error);
      toast({
        title: "Error",
        description: "Failed to load branding configuration",
        variant: "destructive",
      });
    }
  };

  const handleLogoUpload = async (
    file: File,
    type: "primary" | "square" | "favicon",
  ) => {
    try {
      // Preview immediately
      const reader = new FileReader();
      reader.onloadend = () => {
        const preview = reader.result as string;
        if (type === "primary") {
          setPrimaryLogo(file);
          setPrimaryLogoPreview(preview);
        } else if (type === "square") {
          setSquareLogo(file);
          setSquareLogoPreview(preview);
        } else {
          setFavicon(file);
          setFaviconPreview(preview);
        }
      };
      reader.readAsDataURL(file);

      // Upload to server
      const result = await tenantBrandingService.uploadLogo(
        tenantId,
        file,
        type,
      );

      setHasChanges(true);
      toast({
        title: "Success",
        description: `${type} logo uploaded successfully`,
      });
    } catch (error) {
      console.error("Upload failed:", error);
      toast({
        title: "Error",
        description: "Failed to upload logo",
        variant: "destructive",
      });
    }
  };

  const handleTemplateChange = async (templateId: TemplateId) => {
    try {
      setIsSaving(true);
      await tenantBrandingService.switchTemplate(
        tenantId,
        templateId,
        userId,
        true,
      );
      setCurrentTemplate(templateId);
      setHasChanges(false);

      toast({
        title: "Success",
        description: `Switched to ${templateId} template`,
      });
    } catch (error) {
      console.error("Template switch failed:", error);
      toast({
        title: "Error",
        description: "Failed to switch template",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDomainConfiguration = async () => {
    try {
      const result = await tenantBrandingService.configureDomain(
        tenantId,
        customDomain,
        userId,
      );
      setDnsRecords(result.dnsRecords);
      setDomainStatus("pending");

      toast({
        title: "Success",
        description: "Domain configured. Please add DNS records.",
      });
    } catch (error) {
      console.error("Domain configuration failed:", error);
      toast({
        title: "Error",
        description: "Failed to configure domain",
        variant: "destructive",
      });
    }
  };

  const handleDomainVerification = async () => {
    try {
      const result = await tenantBrandingService.verifyDomain(
        tenantId,
        customDomain,
      );
      if (result.verified) {
        setDomainStatus("verified");
        toast({
          title: "Success",
          description: "Domain verified successfully!",
        });
      } else {
        toast({
          title: "Verification Failed",
          description: result.errors?.join(", ") || "DNS records not found",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Verification failed:", error);
      toast({
        title: "Error",
        description: "Failed to verify domain",
        variant: "destructive",
      });
    }
  };

  const handleCSSUpdate = async () => {
    try {
      setIsSaving(true);
      await tenantBrandingService.applyCustomCSS(tenantId, customCSS, userId);
      setHasChanges(false);

      toast({
        title: "Success",
        description: "Custom CSS applied successfully",
      });
    } catch (error) {
      console.error("CSS update failed:", error);
      toast({
        title: "Error",
        description: "Failed to apply custom CSS",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      const blob = await tenantBrandingService.exportBranding(tenantId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `branding-${tenantId}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Branding configuration exported",
      });
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        title: "Error",
        description: "Failed to export branding",
        variant: "destructive",
      });
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await tenantBrandingService.importBranding(tenantId, file, userId);
      await loadBrandingData();

      toast({
        title: "Success",
        description: "Branding configuration imported",
      });
    } catch (error) {
      console.error("Import failed:", error);
      toast({
        title: "Error",
        description: "Failed to import branding",
        variant: "destructive",
      });
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">White Label Branding</h1>
          <p className="text-muted-foreground">
            Customize every aspect of your platform's appearance
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" asChild>
            <label>
              <Upload className="mr-2 h-4 w-4" />
              Import
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </label>
          </Button>
        </div>
      </div>

      {hasChanges && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You have unsaved changes. Make sure to save before leaving.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="template">
            <Sparkles className="mr-2 h-4 w-4" />
            Template
          </TabsTrigger>
          <TabsTrigger value="theme">
            <Palette className="mr-2 h-4 w-4" />
            Theme
          </TabsTrigger>
          <TabsTrigger value="logos">
            <ImageIcon className="mr-2 h-4 w-4" />
            Logos
          </TabsTrigger>
          <TabsTrigger value="domain">
            <Globe className="mr-2 h-4 w-4" />
            Domain
          </TabsTrigger>
          <TabsTrigger value="css">
            <Code className="mr-2 h-4 w-4" />
            Custom CSS
          </TabsTrigger>
        </TabsList>

        {/* Template Tab */}
        <TabsContent value="template" className="space-y-6">
          <TemplateSelector
            currentTemplateId={currentTemplate}
            onSelect={handleTemplateChange}
          />
        </TabsContent>

        {/* Theme Tab */}
        <TabsContent value="theme" className="space-y-6">
          <ThemeEditor
            tenantId={tenantId}
            onSave={async (theme) => {
              // Handle theme save
              setHasChanges(false);
              toast({
                title: "Success",
                description: "Theme saved successfully",
              });
            }}
          />
        </TabsContent>

        {/* Logos Tab */}
        <TabsContent value="logos" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Primary Logo */}
            <Card>
              <CardHeader>
                <CardTitle>Primary Logo</CardTitle>
                <CardDescription>
                  Main logo (recommended: 200x60px)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {primaryLogoPreview && (
                  <div className="rounded-lg border p-4">
                    <img
                      src={primaryLogoPreview}
                      alt="Primary logo"
                      className="mx-auto max-h-16 object-contain"
                    />
                  </div>
                )}
                <Button variant="outline" className="w-full" asChild>
                  <label>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Logo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleLogoUpload(file, "primary");
                      }}
                      className="hidden"
                    />
                  </label>
                </Button>
              </CardContent>
            </Card>

            {/* Square Logo */}
            <Card>
              <CardHeader>
                <CardTitle>Square Logo</CardTitle>
                <CardDescription>
                  Icon version (recommended: 512x512px)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {squareLogoPreview && (
                  <div className="rounded-lg border p-4">
                    <img
                      src={squareLogoPreview}
                      alt="Square logo"
                      className="mx-auto h-16 w-16 object-contain"
                    />
                  </div>
                )}
                <Button variant="outline" className="w-full" asChild>
                  <label>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Icon
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleLogoUpload(file, "square");
                      }}
                      className="hidden"
                    />
                  </label>
                </Button>
              </CardContent>
            </Card>

            {/* Favicon */}
            <Card>
              <CardHeader>
                <CardTitle>Favicon</CardTitle>
                <CardDescription>
                  Browser tab icon (recommended: 32x32px)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {faviconPreview && (
                  <div className="rounded-lg border p-4">
                    <img
                      src={faviconPreview}
                      alt="Favicon"
                      className="mx-auto h-8 w-8 object-contain"
                    />
                  </div>
                )}
                <Button variant="outline" className="w-full" asChild>
                  <label>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Favicon
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleLogoUpload(file, "favicon");
                      }}
                      className="hidden"
                    />
                  </label>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Domain Tab */}
        <TabsContent value="domain" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Custom Domain</CardTitle>
              <CardDescription>
                Connect your own domain to your white-label instance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Domain Name</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="chat.yourdomain.com"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                  />
                  <Button
                    onClick={handleDomainConfiguration}
                    disabled={!customDomain}
                  >
                    Configure
                  </Button>
                </div>
              </div>

              {domainStatus !== "none" && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">DNS Records</h4>
                      <Badge
                        variant={
                          domainStatus === "verified" ? "default" : "secondary"
                        }
                      >
                        {domainStatus === "verified" ? (
                          <>
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Verified
                          </>
                        ) : (
                          <>
                            <AlertCircle className="mr-1 h-3 w-3" />
                            Pending
                          </>
                        )}
                      </Badge>
                    </div>
                    <ScrollArea className="h-[200px]">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="p-2 text-left">Type</th>
                            <th className="p-2 text-left">Name</th>
                            <th className="p-2 text-left">Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dnsRecords.map((record, index) => (
                            <tr key={index} className="border-b">
                              <td className="p-2 font-mono">{record.type}</td>
                              <td className="p-2 font-mono">{record.name}</td>
                              <td className="p-2 font-mono text-xs">
                                {record.value}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </ScrollArea>
                    {domainStatus !== "verified" && (
                      <Button
                        onClick={handleDomainVerification}
                        className="w-full"
                      >
                        Verify Domain
                      </Button>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Custom CSS Tab */}
        <TabsContent value="css" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Custom CSS</CardTitle>
              <CardDescription>
                Add custom styles to further personalize your platform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="/* Add your custom CSS here */
.my-custom-class {
  color: red;
}"
                value={customCSS}
                onChange={(e) => {
                  setCustomCSS(e.target.value);
                  setHasChanges(true);
                }}
                className="min-h-[400px] font-mono text-sm"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCustomCSS("")}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Clear
                </Button>
                <Button
                  onClick={handleCSSUpdate}
                  disabled={!hasChanges || isSaving}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? "Saving..." : "Save CSS"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
