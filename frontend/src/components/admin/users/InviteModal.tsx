"use client";

import { useState } from "react";
import { Mail, Link as LinkIcon, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useUserManagementStore } from "@/stores/user-management-store";
import { validateEmail } from "@/lib/admin/users/user-manager";
import {
  parseCSVEmails,
  validateBulkEmails,
} from "@/lib/admin/users/user-invite";
import type { UserRole } from "@/lib/admin/users/user-types";

import { logger } from "@/lib/logger";

interface InviteModalProps {
  open: boolean;
  onClose: () => void;
  mode: "single" | "bulk" | "link";
}

export function InviteModal({
  open,
  onClose,
  mode: initialMode,
}: InviteModalProps) {
  const [mode, setMode] = useState(initialMode);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Single invite state
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("member");
  const [message, setMessage] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [emailError, setEmailError] = useState("");

  // Bulk invite state
  const [bulkEmails, setBulkEmails] = useState("");
  const [bulkRole, setBulkRole] = useState<UserRole>("member");
  const [bulkValidation, setBulkValidation] = useState<{
    valid: string[];
    invalid: string[];
  } | null>(null);

  // Link invite state
  const [linkRole, setLinkRole] = useState<UserRole>("member");
  const [maxUses, setMaxUses] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("7");
  const [generatedLink, setGeneratedLink] = useState("");

  const { roles } = useUserManagementStore();

  const handleSingleInvite = async () => {
    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);
    try {
      // In production, call the API
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
      handleClose();
    } catch (error) {
      logger.error("Failed to send invite:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkValidate = () => {
    const emails = parseCSVEmails(bulkEmails);
    const result = validateBulkEmails(emails);
    setBulkValidation(result);
  };

  const handleBulkInvite = async () => {
    if (!bulkValidation || bulkValidation.valid.length === 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      // In production, call the API
      await new Promise((resolve) => setTimeout(resolve, 1000));
      handleClose();
    } catch (error) {
      logger.error("Failed to send bulk invites:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateLink = async () => {
    setIsSubmitting(true);
    try {
      // In production, call the API
      const code = Math.random().toString(36).substring(2, 10);
      const link = `${window.location.origin}/invite/${code}`;
      setGeneratedLink(link);
    } catch (error) {
      logger.error("Failed to generate link:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedLink);
  };

  const handleClose = () => {
    setEmail("");
    setRole("member");
    setMessage("");
    setSendEmail(true);
    setEmailError("");
    setBulkEmails("");
    setBulkRole("member");
    setBulkValidation(null);
    setLinkRole("member");
    setMaxUses("");
    setExpiresInDays("7");
    setGeneratedLink("");
    onClose();
  };

  const roleOptions =
    roles.length > 0
      ? roles
      : [
          { id: "admin", name: "Admin" },
          { id: "moderator", name: "Moderator" },
          { id: "member", name: "Member" },
          { id: "guest", name: "Guest" },
        ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Invite Users</DialogTitle>
          <DialogDescription>
            Invite new users to join your workspace
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="single" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </TabsTrigger>
            <TabsTrigger value="bulk" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Bulk
            </TabsTrigger>
            <TabsTrigger value="link" className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              Link
            </TabsTrigger>
          </TabsList>

          {/* Single Email Invite */}
          <TabsContent value="single" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError("");
                }}
                className={emailError ? "border-red-500" : ""}
              />
              {emailError && (
                <p className="text-sm text-red-500">{emailError}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={role}
                onValueChange={(v) => setRole(v as UserRole)}
              >
                <SelectTrigger id="role">
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

            <div className="space-y-2">
              <Label htmlFor="message">Personal Message (optional)</Label>
              <Textarea
                id="message"
                placeholder="Add a personal message to the invite..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="send-email"
                checked={sendEmail}
                onCheckedChange={setSendEmail}
              />
              <Label htmlFor="send-email">Send invitation email</Label>
            </div>
          </TabsContent>

          {/* Bulk Invite */}
          <TabsContent value="bulk" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="bulk-emails">Email Addresses</Label>
              <Textarea
                id="bulk-emails"
                placeholder="Enter emails, one per line or comma-separated..."
                value={bulkEmails}
                onChange={(e) => {
                  setBulkEmails(e.target.value);
                  setBulkValidation(null);
                }}
                rows={5}
              />
              <p className="text-xs text-muted-foreground">
                Enter email addresses separated by commas or new lines
              </p>
            </div>

            {bulkValidation && (
              <div className="space-y-2 text-sm">
                <p className="text-green-600">
                  Valid: {bulkValidation.valid.length} email(s)
                </p>
                {bulkValidation.invalid.length > 0 && (
                  <p className="text-red-500">
                    Invalid: {bulkValidation.invalid.join(", ")}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="bulk-role">Role for all invites</Label>
              <Select
                value={bulkRole}
                onValueChange={(v) => setBulkRole(v as UserRole)}
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

            {!bulkValidation && (
              <Button
                variant="outline"
                onClick={handleBulkValidate}
                disabled={!bulkEmails.trim()}
              >
                Validate Emails
              </Button>
            )}
          </TabsContent>

          {/* Invite Link */}
          <TabsContent value="link" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="link-role">Default Role</Label>
              <Select
                value={linkRole}
                onValueChange={(v) => setLinkRole(v as UserRole)}
              >
                <SelectTrigger id="link-role">
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

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="max-uses">Max Uses (optional)</Label>
                <Input
                  id="max-uses"
                  type="number"
                  placeholder="Unlimited"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  min="1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expires">Expires In</Label>
                <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                  <SelectTrigger id="expires">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 day</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="never">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {generatedLink && (
              <div className="space-y-2">
                <Label>Invite Link</Label>
                <div className="flex gap-2">
                  <Input value={generatedLink} readOnly />
                  <Button variant="outline" onClick={handleCopyLink}>
                    Copy
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          {mode === "single" && (
            <Button
              onClick={handleSingleInvite}
              disabled={isSubmitting || !email}
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Send Invite
            </Button>
          )}
          {mode === "bulk" && (
            <Button
              onClick={handleBulkInvite}
              disabled={
                isSubmitting ||
                !bulkValidation ||
                bulkValidation.valid.length === 0
              }
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Send {bulkValidation?.valid.length || 0} Invite(s)
            </Button>
          )}
          {mode === "link" && (
            <Button onClick={handleGenerateLink} disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {generatedLink ? "Generate New Link" : "Generate Link"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default InviteModal;
