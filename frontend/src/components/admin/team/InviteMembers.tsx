"use client";

import { useState } from "react";
import {
  Mail,
  Link as LinkIcon,
  Users,
  Copy,
  Check,
  Loader2,
  X,
  RefreshCw,
  Download,
  Upload,
  AlertCircle,
  CheckCircle,
  Calendar,
  User,
} from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useTeamStore } from "@/stores/team-store";
import { teamManager } from "@/lib/team/team-manager";
import type { TeamRole, InviteBulkResult } from "@/lib/team/team-types";

import { logger } from "@/lib/logger";

interface InviteMembersProps {
  teamId: string;
}

export function InviteMembers({ teamId }: InviteMembersProps) {
  const [activeTab, setActiveTab] = useState("email");
  const { invitations, inviteLinks, addInvitation, addInviteLink } =
    useTeamStore();

  const pendingInvitesCount = invitations.filter(
    (i) => i.status === "pending",
  ).length;
  const activeLinksCount = inviteLinks.filter((l) => l.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Invite Team Members</h1>
        <p className="text-muted-foreground">
          Invite new members to join your workspace
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Invites</CardDescription>
            <CardTitle className="text-2xl">{pendingInvitesCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Awaiting acceptance
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Links</CardDescription>
            <CardTitle className="text-2xl">{activeLinksCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Invite links active
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Sent</CardDescription>
            <CardTitle className="text-2xl">{invitations.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              All time invitations
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invite Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">Email</span>
          </TabsTrigger>
          <TabsTrigger value="link" className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Link</span>
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Bulk</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="mt-4">
          <EmailInvite
            teamId={teamId}
            onSuccess={(invitation) => addInvitation(invitation)}
          />
        </TabsContent>

        <TabsContent value="link" className="mt-4">
          <LinkInvite
            teamId={teamId}
            onSuccess={(link) => addInviteLink(link)}
          />
        </TabsContent>

        <TabsContent value="bulk" className="mt-4">
          <BulkInvite teamId={teamId} />
        </TabsContent>
      </Tabs>

      {/* Pending Invitations */}
      <PendingInvitations teamId={teamId} invitations={invitations} />
    </div>
  );
}

// Email Invite Component
function EmailInvite({
  teamId,
  onSuccess,
}: {
  teamId: string;
  onSuccess: (invitation: any) => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamRole>("member");
  const [message, setMessage] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await teamManager.inviteMemberByEmail(teamId, {
        email,
        role,
        message: message || undefined,
        sendEmail,
      });

      if (result.success && result.data) {
        setSuccess(true);
        onSuccess(result.data);
        setEmail("");
        setMessage("");
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error || "Failed to send invitation");
      }
    } catch (_err) {
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite by Email</CardTitle>
        <CardDescription>
          Send an invitation to a specific email address
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>Invitation sent successfully!</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              placeholder="colleague@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as TeamRole)}>
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Personal Message (Optional)</Label>
            <Textarea
              id="message"
              placeholder="Add a personal note to the invitation..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="sendEmail"
              checked={sendEmail}
              onCheckedChange={setSendEmail}
            />
            <Label htmlFor="sendEmail">Send invitation email</Label>
          </div>

          <Button type="submit" disabled={isSubmitting || !email}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Send Invitation
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// Link Invite Component
function LinkInvite({
  teamId,
  onSuccess,
}: {
  teamId: string;
  onSuccess: (link: any) => void;
}) {
  const [role, setRole] = useState<TeamRole>("member");
  const [maxUses, setMaxUses] = useState<string>("unlimited");
  const [expiresIn, setExpiresIn] = useState("7");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);

    try {
      const result = await teamManager.createInviteLink(teamId, {
        role,
        maxUses: maxUses === "unlimited" ? undefined : parseInt(maxUses),
        expiresInDays: parseInt(expiresIn),
      });

      if (result.success && result.data) {
        setGeneratedLink(result.data.url);
        onSuccess(result.data);
      }
    } catch (err) {
      logger.error("Failed to generate link:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (generatedLink) {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate Invite Link</CardTitle>
        <CardDescription>
          Create a shareable link that anyone can use to join
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="link-role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as TeamRole)}>
              <SelectTrigger id="link-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxUses">Maximum Uses</Label>
            <Select value={maxUses} onValueChange={setMaxUses}>
              <SelectTrigger id="maxUses">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unlimited">Unlimited</SelectItem>
                <SelectItem value="1">1 use</SelectItem>
                <SelectItem value="5">5 uses</SelectItem>
                <SelectItem value="10">10 uses</SelectItem>
                <SelectItem value="25">25 uses</SelectItem>
                <SelectItem value="50">50 uses</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="expiresIn">Expires In</Label>
          <Select value={expiresIn} onValueChange={setExpiresIn}>
            <SelectTrigger id="expiresIn">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 day</SelectItem>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="14">14 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <LinkIcon className="mr-2 h-4 w-4" />
              Generate Invite Link
            </>
          )}
        </Button>

        {generatedLink && (
          <div className="space-y-2 rounded-lg border bg-muted p-4">
            <Label>Generated Link</Label>
            <div className="flex items-center gap-2">
              <Input
                value={generatedLink}
                readOnly
                className="font-mono text-sm"
              />
              <Button size="sm" variant="outline" onClick={handleCopy}>
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Link expires in {expiresIn} day(s){" "}
              {maxUses !== "unlimited" && `• Max ${maxUses} uses`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Bulk Invite Component
function BulkInvite({ teamId }: { teamId: string }) {
  const [emails, setEmails] = useState("");
  const [role, setRole] = useState<TeamRole>("member");
  const [sendEmails, setSendEmails] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validation, setValidation] = useState<{
    valid: string[];
    invalid: string[];
  } | null>(null);
  const [result, setResult] = useState<InviteBulkResult | null>(null);

  const handleValidate = () => {
    setIsValidating(true);
    const parsedEmails = teamManager.parseCSVEmails(emails);
    const valid: string[] = [];
    const invalid: string[] = [];

    parsedEmails.forEach((email) => {
      if (teamManager.validateEmail(email)) {
        valid.push(email);
      } else {
        invalid.push(email);
      }
    });

    setValidation({ valid, invalid });
    setIsValidating(false);
  };

  const handleSubmit = async () => {
    if (!validation || validation.valid.length === 0) return;

    setIsSubmitting(true);
    setResult(null);

    try {
      const bulkResult = await teamManager.bulkInviteMembers(teamId, {
        emails: validation.valid,
        role,
        sendEmails,
      });

      if (bulkResult.success && bulkResult.data) {
        setResult(bulkResult.data);
        setEmails("");
        setValidation(null);
      }
    } catch (err) {
      logger.error("Failed to send bulk invites:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk Invite</CardTitle>
        <CardDescription>
          Invite multiple users at once via CSV or paste emails
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="emails">Email Addresses</Label>
          <Textarea
            id="emails"
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

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="bulk-role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as TeamRole)}>
              <SelectTrigger id="bulk-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
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
              <Label htmlFor="send-emails">Send emails</Label>
            </div>
          </div>
        </div>

        {validation && (
          <div className="space-y-2">
            {validation.valid.length > 0 && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Valid emails: {validation.valid.length}</AlertTitle>
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

        <div className="flex gap-2">
          {!validation ? (
            <Button
              onClick={handleValidate}
              disabled={!emails.trim() || isValidating}
            >
              {isValidating && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
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
  );
}

// Pending Invitations Component
function PendingInvitations({
  teamId,
  invitations,
}: {
  teamId: string;
  invitations: any[];
}) {
  const { removeInvitation, updateInvitation } = useTeamStore();
  const [canceling, setCanceling] = useState<string | null>(null);
  const [resending, setResending] = useState<string | null>(null);

  const pendingInvites = invitations.filter((i) => i.status === "pending");

  const handleCancel = async (invitationId: string) => {
    setCanceling(invitationId);
    try {
      const result = await teamManager.cancelInvitation(teamId, invitationId);
      if (result.success) {
        removeInvitation(invitationId);
      }
    } catch (err) {
      logger.error("Failed to cancel invitation:", err);
    } finally {
      setCanceling(null);
    }
  };

  const handleResend = async (invitationId: string) => {
    setResending(invitationId);
    try {
      const result = await teamManager.resendInvitation(teamId, invitationId);
      if (result.success) {
        updateInvitation(invitationId, { createdAt: new Date().toISOString() });
      }
    } catch (err) {
      logger.error("Failed to resend invitation:", err);
    } finally {
      setResending(null);
    }
  };

  if (pendingInvites.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Invitations</CardTitle>
        <CardDescription>
          {pendingInvites.length} pending invitation(s)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Invited By</TableHead>
              <TableHead>Sent</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendingInvites.map((invite) => (
              <TableRow key={invite.id}>
                <TableCell className="font-medium">{invite.email}</TableCell>
                <TableCell>
                  <Badge variant="outline">{invite.role}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {invite.invitedBy.displayName}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {new Date(invite.createdAt).toLocaleDateString()}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {new Date(invite.expiresAt).toLocaleDateString()}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResend(invite.id)}
                      disabled={resending === invite.id}
                    >
                      {resending === invite.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleCancel(invite.id)}
                      disabled={canceling === invite.id}
                    >
                      {canceling === invite.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default InviteMembers;
