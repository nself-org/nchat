/**
 * GDPR Data Request Component
 *
 * Handles both data export and deletion requests with
 * proper verification and compliance workflows.
 */

"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle,
  Download,
  Trash2,
  Shield,
  Clock,
  CheckCircle2,
  FileText,
  Info,
} from "lucide-react";
import type {
  ExportDataCategory,
  DeletionScope,
} from "@/lib/compliance/compliance-types";

interface GDPRDataRequestProps {
  userId: string;
  userEmail: string;
}

export function GDPRDataRequest({ userId, userEmail }: GDPRDataRequestProps) {
  const [requestType, setRequestType] = useState<"export" | "delete" | null>(
    null,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Your Data Rights (GDPR)
        </h2>
        <p className="text-muted-foreground">
          Under the General Data Protection Regulation (GDPR), you have the
          right to access and control your personal data.
        </p>
      </div>

      {/* Request Type Selection */}
      {!requestType && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card
            className="cursor-pointer hover:border-primary"
            onClick={() => setRequestType("export")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Export Your Data
              </CardTitle>
              <CardDescription>
                Download a copy of all your personal data (GDPR Article 20)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Machine-readable format
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Processed within 30 days
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Secure download link
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:border-destructive"
            onClick={() => setRequestType("delete")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-destructive" />
                Delete Your Data
              </CardTitle>
              <CardDescription>
                Request deletion of your personal data (GDPR Article 17)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  Permanent action
                </li>
                <li className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Identity verification required
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  14-day cooling-off period
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Export Request Form */}
      {requestType === "export" && (
        <DataExportForm
          userId={userId}
          userEmail={userEmail}
          onCancel={() => setRequestType(null)}
        />
      )}

      {/* Delete Request Form */}
      {requestType === "delete" && (
        <DataDeletionForm
          userId={userId}
          userEmail={userEmail}
          onCancel={() => setRequestType(null)}
        />
      )}
    </div>
  );
}

function DataExportForm({
  userId,
  userEmail,
  onCancel,
}: {
  userId: string;
  userEmail: string;
  onCancel: () => void;
}) {
  const [selectedCategories, setSelectedCategories] = useState<
    ExportDataCategory[]
  >(["all"]);
  const [format, setFormat] = useState<"json" | "csv" | "zip">("zip");
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const categories: {
    value: ExportDataCategory;
    label: string;
    description: string;
  }[] = [
    { value: "all", label: "Everything", description: "Complete data export" },
    { value: "profile", label: "Profile", description: "Account information" },
    { value: "messages", label: "Messages", description: "All your messages" },
    { value: "files", label: "Files", description: "Uploaded files" },
    { value: "reactions", label: "Reactions", description: "Your reactions" },
    { value: "activity", label: "Activity", description: "Login history" },
    { value: "settings", label: "Settings", description: "Preferences" },
    { value: "consents", label: "Consents", description: "Consent records" },
  ];

  const handleSubmit = async () => {
    try {
      setSubmitting(true);

      const response = await fetch("/api/compliance/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          user_email: userEmail,
          categories: selectedCategories,
          format,
          include_metadata: includeMetadata,
        }),
      });

      if (!response.ok) throw new Error("Failed to submit export request");

      // Show success message
      alert(
        "Export request submitted! You will receive an email when your data is ready.",
      );
      onCancel();
    } catch (error) {
      alert("Failed to submit export request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Request Data Export</CardTitle>
        <CardDescription>
          Select what data you want to export. We will prepare your data and
          send you a secure download link.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Categories */}
        <div className="space-y-4">
          <Label>What data do you want to export?</Label>
          <div className="grid gap-3">
            {categories.map((category) => (
              <div key={category.value} className="flex items-start space-x-3">
                <Checkbox
                  id={category.value}
                  checked={selectedCategories.includes(category.value)}
                  onCheckedChange={(checked) => {
                    if (category.value === "all") {
                      setSelectedCategories(checked ? ["all"] : []);
                    } else {
                      setSelectedCategories((prev) =>
                        checked
                          ? [...prev.filter((c) => c !== "all"), category.value]
                          : prev.filter((c) => c !== category.value),
                      );
                    }
                  }}
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor={category.value}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {category.label}
                  </label>
                  <p className="text-sm text-muted-foreground">
                    {category.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Format */}
        <div className="space-y-3">
          <Label>Export Format</Label>
          <RadioGroup value={format} onValueChange={(v) => setFormat(v as any)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="zip" id="zip" />
              <Label htmlFor="zip">ZIP Archive (Recommended)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="json" id="json" />
              <Label htmlFor="json">JSON (Machine-readable)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="csv" id="csv" />
              <Label htmlFor="csv">CSV (Spreadsheet)</Label>
            </div>
          </RadioGroup>
        </div>

        {/* Metadata */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="metadata"
            checked={includeMetadata}
            onCheckedChange={(checked) => setIncludeMetadata(!!checked)}
          />
          <label
            htmlFor="metadata"
            className="text-sm font-medium leading-none"
          >
            Include metadata (timestamps, IDs, etc.)
          </label>
        </div>

        {/* Info */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Your export will be available for 7 days and can be downloaded up to
            5 times. Processing typically takes 24-48 hours.
          </AlertDescription>
        </Alert>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || selectedCategories.length === 0}
          >
            {submitting ? "Submitting..." : "Submit Request"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DataDeletionForm({
  userId,
  userEmail,
  onCancel,
}: {
  userId: string;
  userEmail: string;
  onCancel: () => void;
}) {
  const [scope, setScope] = useState<DeletionScope>("full_account");
  const [reason, setReason] = useState("");
  const [understood, setUnderstood] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const scopes: {
    value: DeletionScope;
    label: string;
    description: string;
    warning: string;
  }[] = [
    {
      value: "full_account",
      label: "Delete Everything",
      description:
        "Permanently delete your entire account and all associated data",
      warning:
        "This will delete your account, messages, files, and all other data.",
    },
    {
      value: "messages_only",
      label: "Messages Only",
      description: "Delete all your messages but keep your account",
      warning: "Your messages will be permanently removed from all channels.",
    },
    {
      value: "files_only",
      label: "Files Only",
      description: "Delete all files you have uploaded",
      warning: "All uploaded files will be permanently deleted.",
    },
    {
      value: "activity_only",
      label: "Activity Data",
      description: "Delete activity logs and analytics data",
      warning: "Your activity history will be removed.",
    },
  ];

  const handleSubmit = async () => {
    try {
      setSubmitting(true);

      const response = await fetch("/api/compliance/deletion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          user_email: userEmail,
          scope,
          reason,
        }),
      });

      if (!response.ok) throw new Error("Failed to submit deletion request");

      alert(
        "Deletion request submitted. You will receive an email to verify your identity. You have 14 days to cancel.",
      );
      onCancel();
    } catch (error) {
      alert("Failed to submit deletion request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedScope = scopes.find((s) => s.value === scope)!;

  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle className="text-destructive">
          Request Data Deletion
        </CardTitle>
        <CardDescription>
          This action will permanently delete your data. Please read carefully
          before proceeding.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Scope Selection */}
        <div className="space-y-3">
          <Label>What would you like to delete?</Label>
          <RadioGroup
            value={scope}
            onValueChange={(v) => setScope(v as DeletionScope)}
          >
            {scopes.map((s) => (
              <div
                key={s.value}
                className="flex items-start space-x-3 rounded-lg border p-4"
              >
                <RadioGroupItem value={s.value} id={s.value} className="mt-1" />
                <div className="grid flex-1 gap-1.5 leading-none">
                  <Label htmlFor={s.value} className="font-medium">
                    {s.label}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {s.description}
                  </p>
                </div>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Reason */}
        <div className="space-y-2">
          <Label htmlFor="reason">Reason (optional)</Label>
          <Textarea
            id="reason"
            placeholder="Tell us why you want to delete your data (helps us improve)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
        </div>

        {/* Warning */}
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Warning:</strong> {selectedScope.warning} This action cannot
            be undone after the 14-day cooling-off period.
          </AlertDescription>
        </Alert>

        {/* Confirmation */}
        <div className="flex items-start space-x-2">
          <Checkbox
            id="understood"
            checked={understood}
            onCheckedChange={(checked) => setUnderstood(!!checked)}
          />
          <label
            htmlFor="understood"
            className="text-sm font-medium leading-relaxed"
          >
            I understand that this deletion is permanent and cannot be undone. I
            have 14 days to cancel this request before it is processed.
          </label>
        </div>

        {/* Info */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            You will receive an email to verify your identity. After
            verification, there is a 14-day cooling-off period during which you
            can cancel. Deletion begins after this period and may take up to 30
            days to complete.
          </AlertDescription>
        </Alert>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={submitting || !understood}
          >
            {submitting ? "Submitting..." : "Submit Deletion Request"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
