"use client";

/**
 * SSO Configuration Component
 *
 * Admin UI for configuring SAML/SSO connections
 */

import * as React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  SSOProvider,
  SSOConnection,
  SAMLConfiguration,
  SSO_PROVIDER_NAMES,
  SAML_PROVIDER_PRESETS,
  getSAMLService,
  createSSOConnectionFromPreset,
  testSSOConnection,
} from "@/lib/auth/saml";
import { UserRole } from "@/lib/auth/roles";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Trash2,
  Edit,
  Shield,
  CheckCircle,
  XCircle,
  Download,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ============================================================================
// Main Component
// ============================================================================

export function SSOConfiguration() {
  const [connections, setConnections] = useState<SSOConnection[]>([]);
  const [selectedConnection, setSelectedConnection] =
    useState<SSOConnection | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      setIsLoading(true);
      const service = getSAMLService();
      const allConnections = await service.getAllConnections();
      setConnections(allConnections);
    } catch (error) {
      toast({
        title: "Error loading SSO connections",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateConnection = async (data: Partial<SSOConnection>) => {
    try {
      const service = getSAMLService();
      const connection: SSOConnection = {
        id: crypto.randomUUID(),
        name: data.name || "New SSO Connection",
        provider: data.provider || "generic-saml",
        enabled: false,
        config: data.config || ({} as SAMLConfiguration),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      };

      await service.addConnection(connection);
      await loadConnections();
      setIsCreating(false);

      toast({
        title: "SSO Connection Created",
        description: `${connection.name} has been created successfully.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateConnection = async (
    id: string,
    updates: Partial<SSOConnection>,
  ) => {
    try {
      const service = getSAMLService();
      await service.updateConnection(id, updates);
      await loadConnections();
      setIsEditing(false);
      setSelectedConnection(null);

      toast({
        title: "SSO Connection Updated",
        description: "Connection settings have been saved.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteConnection = async (id: string) => {
    if (!confirm("Are you sure you want to delete this SSO connection?"))
      return;

    try {
      const service = getSAMLService();
      await service.removeConnection(id);
      await loadConnections();
      setSelectedConnection(null);

      toast({
        title: "SSO Connection Deleted",
        description: "The connection has been removed.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  const handleTestConnection = async (id: string) => {
    try {
      const result = await testSSOConnection(id);

      if (result.success) {
        toast({
          title: "Connection Test Successful",
          description: "SSO connection is properly configured.",
        });
      } else {
        toast({
          title: "Connection Test Failed",
          description: result.error || "Unknown error",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  const handleDownloadMetadata = (connection: SSOConnection) => {
    const service = getSAMLService();
    const metadata = service.generateSPMetadata(connection);

    const blob = new Blob([metadata], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${connection.name.replace(/\s+/g, "-")}-sp-metadata.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">SSO Configuration</h2>
          <p className="text-muted-foreground">
            Configure SAML/SSO authentication for enterprise single sign-on
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Connection
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-muted-foreground">Loading SSO connections...</p>
          </CardContent>
        </Card>
      )}

      {/* Connections List */}
      {!isLoading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {connections.map((connection) => (
            <Card key={connection.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      {connection.name}
                    </CardTitle>
                    <CardDescription>
                      {SSO_PROVIDER_NAMES[connection.provider]}
                    </CardDescription>
                  </div>
                  <Badge variant={connection.enabled ? "default" : "secondary"}>
                    {connection.enabled ? (
                      <CheckCircle className="mr-1 h-3 w-3" />
                    ) : (
                      <XCircle className="mr-1 h-3 w-3" />
                    )}
                    {connection.enabled ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm">
                  <span className="text-muted-foreground">Domains:</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {connection.domains && connection.domains.length > 0 ? (
                      connection.domains.map((domain) => (
                        <Badge key={domain} variant="outline">
                          {domain}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        No domains
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">
                    JIT Provisioning:
                  </span>
                  <span className="ml-2">
                    {connection.config.jitProvisioning ? "Enabled" : "Disabled"}
                  </span>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedConnection(connection);
                      setIsEditing(true);
                    }}
                  >
                    <Edit className="mr-1 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestConnection(connection.id)}
                  >
                    Test
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownloadMetadata(connection)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteConnection(connection.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && connections.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No SSO Connections</h3>
            <p className="mb-4 text-muted-foreground">
              Get started by adding your first SSO connection
            </p>
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Connection
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      {(isCreating || isEditing) && (
        <SSOConnectionDialog
          connection={isEditing ? selectedConnection : null}
          open={isCreating || isEditing}
          onClose={() => {
            setIsCreating(false);
            setIsEditing(false);
            setSelectedConnection(null);
          }}
          onSave={(data) => {
            if (isEditing && selectedConnection) {
              handleUpdateConnection(selectedConnection.id, data);
            } else {
              handleCreateConnection(data);
            }
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// SSO Connection Dialog
// ============================================================================

interface SSOConnectionDialogProps {
  connection: SSOConnection | null;
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<SSOConnection>) => void;
}

function SSOConnectionDialog({
  connection,
  open,
  onClose,
  onSave,
}: SSOConnectionDialogProps) {
  const [formData, setFormData] = useState<Partial<SSOConnection>>(
    connection || {
      name: "",
      provider: "generic-saml" as SSOProvider,
      enabled: false,
      domains: [],
      config: {
        idpEntityId: "",
        idpSsoUrl: "",
        idpCertificate: "",
        spEntityId: `${window.location.origin}/auth/saml`,
        spAssertionConsumerUrl: `${window.location.origin}/api/auth/saml/callback`,
        nameIdFormat: "email",
        attributeMapping: {
          email: "email",
        },
        jitProvisioning: true,
        defaultRole: "member" as UserRole,
      } as SAMLConfiguration,
    },
  );

  const handleProviderChange = (provider: SSOProvider) => {
    const preset = createSSOConnectionFromPreset(
      provider,
      formData.config || {},
    );
    setFormData({
      ...formData,
      provider,
      config: preset.config,
    });
  };

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {connection ? "Edit SSO Connection" : "Create SSO Connection"}
          </DialogTitle>
          <DialogDescription>
            Configure SAML 2.0 single sign-on authentication
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="idp">Identity Provider</TabsTrigger>
            <TabsTrigger value="attributes">Attributes</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          {/* Basic Settings */}
          <TabsContent value="basic" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Connection Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Acme Corp SSO"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="provider">Provider</Label>
              <Select
                value={formData.provider}
                onValueChange={(value) =>
                  handleProviderChange(value as SSOProvider)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SSO_PROVIDER_NAMES).map(([key, name]) => (
                    <SelectItem key={key} value={key}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="enabled"
                checked={formData.enabled}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, enabled: checked })
                }
              />
              <Label htmlFor="enabled">Enable this connection</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="domains">Allowed Email Domains</Label>
              <Input
                id="domains"
                value={formData.domains?.join(", ") || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    domains: e.target.value.split(",").map((d) => d.trim()),
                  })
                }
                placeholder="example.com, acme.com"
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated list of allowed email domains
              </p>
            </div>
          </TabsContent>

          {/* Identity Provider Settings */}
          <TabsContent value="idp" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="idpEntityId">IdP Entity ID</Label>
              <Input
                id="idpEntityId"
                value={formData.config?.idpEntityId || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    config: {
                      ...formData.config!,
                      idpEntityId: e.target.value,
                    },
                  })
                }
                placeholder="https://idp.example.com/saml/metadata"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="idpSsoUrl">IdP SSO URL</Label>
              <Input
                id="idpSsoUrl"
                value={formData.config?.idpSsoUrl || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    config: { ...formData.config!, idpSsoUrl: e.target.value },
                  })
                }
                placeholder="https://idp.example.com/saml/sso"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="idpCertificate">
                IdP Certificate (X.509 PEM)
              </Label>
              <Textarea
                id="idpCertificate"
                value={formData.config?.idpCertificate || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    config: {
                      ...formData.config!,
                      idpCertificate: e.target.value,
                    },
                  })
                }
                placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                rows={8}
                className="font-mono text-xs"
              />
            </div>
          </TabsContent>

          {/* Attribute Mapping */}
          <TabsContent value="attributes" className="space-y-4">
            <div className="space-y-2 rounded-lg bg-muted p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <p className="text-sm font-medium">
                  Pre-configured for{" "}
                  {SSO_PROVIDER_NAMES[formData.provider || "generic-saml"]}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                These mappings have been automatically configured based on your
                provider selection.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="emailAttr">Email Attribute</Label>
              <Input
                id="emailAttr"
                value={formData.config?.attributeMapping.email || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    config: {
                      ...formData.config!,
                      attributeMapping: {
                        ...formData.config!.attributeMapping,
                        email: e.target.value,
                      },
                    },
                  })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstNameAttr">First Name Attribute</Label>
                <Input
                  id="firstNameAttr"
                  value={formData.config?.attributeMapping.firstName || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      config: {
                        ...formData.config!,
                        attributeMapping: {
                          ...formData.config!.attributeMapping,
                          firstName: e.target.value,
                        },
                      },
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastNameAttr">Last Name Attribute</Label>
                <Input
                  id="lastNameAttr"
                  value={formData.config?.attributeMapping.lastName || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      config: {
                        ...formData.config!,
                        attributeMapping: {
                          ...formData.config!.attributeMapping,
                          lastName: e.target.value,
                        },
                      },
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="groupsAttr">
                Groups Attribute (for role mapping)
              </Label>
              <Input
                id="groupsAttr"
                value={formData.config?.attributeMapping.groups || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    config: {
                      ...formData.config!,
                      attributeMapping: {
                        ...formData.config!.attributeMapping,
                        groups: e.target.value,
                      },
                    },
                  })
                }
              />
            </div>
          </TabsContent>

          {/* Advanced Settings */}
          <TabsContent value="advanced" className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="jitProvisioning"
                checked={formData.config?.jitProvisioning}
                onCheckedChange={(checked) =>
                  setFormData({
                    ...formData,
                    config: { ...formData.config!, jitProvisioning: checked },
                  })
                }
              />
              <Label htmlFor="jitProvisioning">
                Enable Just-in-Time Provisioning
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultRole">Default Role</Label>
              <Select
                value={formData.config?.defaultRole}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    config: {
                      ...formData.config!,
                      defaultRole: value as UserRole,
                    },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-2">
              <h4 className="font-medium">Service Provider URLs</h4>
              <div className="space-y-2">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Entity ID
                  </Label>
                  <Input
                    value={formData.config?.spEntityId}
                    readOnly
                    className="font-mono text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Assertion Consumer Service URL
                  </Label>
                  <Input
                    value={formData.config?.spAssertionConsumerUrl}
                    readOnly
                    className="font-mono text-xs"
                  />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {connection ? "Update Connection" : "Create Connection"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SSOConfiguration;
