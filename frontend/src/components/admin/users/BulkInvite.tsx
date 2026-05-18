"use client";

import { useState, useRef } from "react";
import {
  Upload,
  Download,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useUserManagementStore } from "@/stores/user-management-store";
import {
  parseCSVEmails,
  validateBulkEmails,
  downloadInviteTemplate,
} from "@/lib/admin/users/user-invite";
import type { UserRole, BulkInviteResult } from "@/lib/admin/users/user-types";

import { logger } from "@/lib/logger";

export function BulkInvite() {
  const [emails, setEmails] = useState("");
  const [role, setRole] = useState<UserRole>("member");
  const [sendEmails, setSendEmails] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validation, setValidation] = useState<{
    valid: string[];
    invalid: string[];
  } | null>(null);
  const [result, setResult] = useState<BulkInviteResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { roles } = useUserManagementStore();

  const roleOptions =
    roles.length > 0
      ? roles
      : [
          { id: "admin", name: "Admin" },
          { id: "moderator", name: "Moderator" },
          { id: "member", name: "Member" },
          { id: "guest", name: "Guest" },
        ];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const content = await file.text();
    const parsedEmails = parseCSVEmails(content);
    setEmails(parsedEmails.join("\n"));
    setValidation(null);
    setResult(null);
  };

  const handleValidate = () => {
    setIsValidating(true);
    const parsedEmails = parseCSVEmails(emails);
    const validationResult = validateBulkEmails(parsedEmails);
    setValidation(validationResult);
    setIsValidating(false);
  };

  const handleSubmit = async () => {
    if (!validation || validation.valid.length === 0) return;

    setIsSubmitting(true);
    setResult(null);

    try {
      // In production, call the API
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Simulate result
      const mockResult: BulkInviteResult = {
        successful: validation.valid,
        failed: validation.invalid.map((email) => ({
          email,
          reason: "Invalid email format",
        })),
        totalSent: validation.valid.length,
        totalFailed: validation.invalid.length,
      };

      setResult(mockResult);
      setEmails("");
      setValidation(null);
    } catch (error) {
      logger.error("Failed to send bulk invites:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadTemplate = () => {
    downloadInviteTemplate();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bulk Invite Users</CardTitle>
          <CardDescription>
            Import multiple users at once via CSV or paste email addresses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Upload */}
          <div className="space-y-2">
            <Label>Upload CSV File</Label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload CSV
              </Button>
              <Button variant="outline" onClick={handleDownloadTemplate}>
                <Download className="mr-2 h-4 w-4" />
                Download Template
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              CSV should have an email column. Other columns will be ignored.
            </p>
          </div>

          {/* Email Input */}
          <div className="space-y-2">
            <Label htmlFor="bulk-emails">Or paste email addresses</Label>
            <Textarea
              id="bulk-emails"
              placeholder="Enter email addresses, one per line or comma-separated...&#10;&#10;user1@example.com&#10;user2@example.com&#10;user3@example.com"
              value={emails}
              onChange={(e) => {
                setEmails(e.target.value);
                setValidation(null);
                setResult(null);
              }}
              rows={8}
              className="font-mono text-sm"
            />
          </div>

          {/* Role Selection */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bulk-role">Role for all invites</Label>
              <Select
                value={role}
                onValueChange={(v) => setRole(v as UserRole)}
              >
                <SelectTrigger id="bulk-role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end pb-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="send-emails"
                  checked={sendEmails}
                  onCheckedChange={setSendEmails}
                />
                <Label htmlFor="send-emails">Send invitation emails</Label>
              </div>
            </div>
          </div>

          {/* Validation Results */}
          {validation && (
            <div className="space-y-2">
              {validation.valid.length > 0 && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>
                    Valid emails: {validation.valid.length}
                  </AlertTitle>
                  <AlertDescription>
                    {validation.valid.slice(0, 5).join(", ")}
                    {validation.valid.length > 5 &&
                      ` and ${validation.valid.length - 5} more...`}
                  </AlertDescription>
                </Alert>
              )}

              {validation.invalid.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>
                    Invalid emails: {validation.invalid.length}
                  </AlertTitle>
                  <AlertDescription>
                    {validation.invalid.join(", ")}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Result */}
          {result && (
            <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Invitations Sent</AlertTitle>
              <AlertDescription>
                Successfully sent {result.totalSent} invitation(s).
                {result.totalFailed > 0 && ` ${result.totalFailed} failed.`}
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {!validation ? (
              <Button
                onClick={handleValidate}
                disabled={!emails.trim() || isValidating}
              >
                {isValidating && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                <FileText className="mr-2 h-4 w-4" />
                Validate Emails
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleSubmit}
                  disabled={validation.valid.length === 0 || isSubmitting}
                >
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Send {validation.valid.length} Invitation(s)
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setValidation(null);
                    setResult(null);
                  }}
                >
                  Reset
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default BulkInvite;
