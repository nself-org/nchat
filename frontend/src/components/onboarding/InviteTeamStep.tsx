"use client";

import { useState } from "react";
import { UserPlus, Mail, X, Check, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  OnboardingStepProps,
  TeamInvitation,
  InvitationResult,
} from "@/lib/onboarding/onboarding-types";

interface InviteTeamStepProps extends OnboardingStepProps {
  invitations?: TeamInvitation[];
  onInvitationsChange?: (invitations: TeamInvitation[]) => void;
  onSendInvitations?: (
    invitations: TeamInvitation[],
  ) => Promise<InvitationResult[]>;
}

export function InviteTeamStep({
  onNext,
  onPrev,
  onSkip,
  isFirst,
  canSkip,
  invitations: initialInvitations = [],
  onInvitationsChange,
  onSendInvitations,
}: InviteTeamStepProps) {
  const [invitations, setInvitations] =
    useState<TeamInvitation[]>(initialInvitations);
  const [currentEmail, setCurrentEmail] = useState("");
  const [bulkEmails, setBulkEmails] = useState("");
  const [showBulk, setShowBulk] = useState(false);
  const [customMessage, setCustomMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [results, setResults] = useState<InvitationResult[]>([]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const addEmail = (email: string) => {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) return;

    if (!validateEmail(trimmedEmail)) {
      setError(`Invalid email: ${trimmedEmail}`);
      return;
    }

    if (invitations.some((inv) => inv.email === trimmedEmail)) {
      setError("This email has already been added");
      return;
    }

    const newInvitations = [
      ...invitations,
      {
        email: trimmedEmail,
        role: "member" as const,
        message: customMessage || undefined,
      },
    ];
    setInvitations(newInvitations);
    onInvitationsChange?.(newInvitations);
    setError(null);
    setCurrentEmail("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addEmail(currentEmail);
    }
  };

  const handleBulkAdd = () => {
    // Parse emails from textarea (comma, newline, or space separated)
    const emails = bulkEmails
      .split(/[,\n\s]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0);

    const validEmails: string[] = [];
    const invalidEmails: string[] = [];

    emails.forEach((email) => {
      if (validateEmail(email)) {
        if (
          !invitations.some((inv) => inv.email === email) &&
          !validEmails.includes(email)
        ) {
          validEmails.push(email);
        }
      } else {
        invalidEmails.push(email);
      }
    });

    if (invalidEmails.length > 0) {
      setError(
        `Invalid emails: ${invalidEmails.slice(0, 3).join(", ")}${invalidEmails.length > 3 ? "..." : ""}`,
      );
    } else {
      setError(null);
    }

    if (validEmails.length > 0) {
      const newInvitations = [
        ...invitations,
        ...validEmails.map((email) => ({
          email,
          role: "member" as const,
          message: customMessage || undefined,
        })),
      ];
      setInvitations(newInvitations);
      onInvitationsChange?.(newInvitations);
      setBulkEmails("");
      setShowBulk(false);
    }
  };

  const removeInvitation = (email: string) => {
    const newInvitations = invitations.filter((inv) => inv.email !== email);
    setInvitations(newInvitations);
    onInvitationsChange?.(newInvitations);
  };

  const handleSendInvitations = async () => {
    if (invitations.length === 0) {
      onNext();
      return;
    }

    if (onSendInvitations) {
      setIsSending(true);
      try {
        const results = await onSendInvitations(invitations);
        setResults(results);
        // Continue to next step regardless of results
        setTimeout(onNext, 2000);
      } catch (err) {
        setError("Failed to send invitations. Please try again.");
      } finally {
        setIsSending(false);
      }
    } else {
      // No send handler, just proceed
      onNext();
    }
  };

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  return (
    <div className="flex flex-col px-4 py-6">
      {/* Header */}
      <div className="mb-6 text-center">
        <div className="from-primary/20 to-primary/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br">
          <UserPlus className="h-8 w-8 text-primary" />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-white">
          Invite Your Team
        </h2>
        <p className="mx-auto max-w-md text-zinc-600 dark:text-zinc-400">
          Bring your teammates to nchat. They'll receive an email invitation.
        </p>
      </div>

      {/* Results Display */}
      {results.length > 0 && (
        <div className="mx-auto mb-6 w-full max-w-lg">
          <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800/50">
            <div className="flex items-center justify-center gap-4 text-center">
              {successCount > 0 && (
                <div className="flex items-center gap-2 text-green-600">
                  <Check className="h-5 w-5" />
                  <span>{successCount} sent</span>
                </div>
              )}
              {failCount > 0 && (
                <div className="flex items-center gap-2 text-red-500">
                  <AlertCircle className="h-5 w-5" />
                  <span>{failCount} failed</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {results.length === 0 && (
        <div className="mx-auto w-full max-w-lg space-y-6">
          {/* Email Input */}
          <div className="space-y-2">
            <Label>Email addresses</Label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="colleague@company.com"
                value={currentEmail}
                onChange={(e) => setCurrentEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1"
              />
              <Button
                variant="secondary"
                onClick={() => addEmail(currentEmail)}
                disabled={!currentEmail}
              >
                Add
              </Button>
            </div>
            <p className="text-xs text-zinc-500">
              Press Enter or comma to add multiple emails
            </p>
          </div>

          {/* Bulk Add Toggle */}
          {!showBulk ? (
            <button
              type="button"
              onClick={() => setShowBulk(true)}
              className="text-sm text-primary hover:underline"
            >
              Add multiple emails at once
            </button>
          ) : (
            <div className="space-y-2">
              <Label>Paste multiple emails</Label>
              <Textarea
                placeholder="email1@company.com, email2@company.com&#10;email3@company.com"
                value={bulkEmails}
                onChange={(e) => setBulkEmails(e.target.value)}
                rows={3}
              />
              <div className="flex gap-2">
                <Button variant="secondary" onClick={handleBulkAdd}>
                  Add All
                </Button>
                <Button variant="ghost" onClick={() => setShowBulk(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-500">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          {/* Invitation List */}
          {invitations.length > 0 && (
            <div className="space-y-2">
              <Label>Invitations ({invitations.length})</Label>
              <div className="flex flex-wrap gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/50">
                {invitations.map((invitation) => (
                  <Badge
                    key={invitation.email}
                    variant="secondary"
                    className="flex items-center gap-1 py-1 pl-2 pr-1"
                  >
                    <Mail className="h-3 w-3" />
                    <span>{invitation.email}</span>
                    <button
                      type="button"
                      onClick={() => removeInvitation(invitation.email)}
                      className="ml-1 rounded-full p-0.5 transition-colors hover:bg-zinc-300 dark:hover:bg-zinc-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Custom Message */}
          <div className="space-y-2">
            <Label>Personal message (optional)</Label>
            <Textarea
              placeholder="Add a personal note to your invitation..."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-zinc-500">
              This message will be included in the invitation email
            </p>
          </div>

          {/* Empty State */}
          {invitations.length === 0 && (
            <div className="py-8 text-center text-zinc-500">
              <UserPlus className="mx-auto mb-2 h-12 w-12 opacity-30" />
              <p>No invitations added yet</p>
              <p className="text-sm">
                Enter email addresses above to invite teammates
              </p>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="mt-8 flex items-center justify-between border-t border-zinc-200 pt-6 dark:border-zinc-700">
        <div>
          {!isFirst && (
            <Button variant="ghost" onClick={onPrev} disabled={isSending}>
              Back
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {canSkip && onSkip && invitations.length === 0 && (
            <Button variant="ghost" onClick={onSkip}>
              Skip for now
            </Button>
          )}
          <Button onClick={handleSendInvitations} disabled={isSending}>
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : invitations.length > 0 ? (
              `Send ${invitations.length} Invitation${invitations.length !== 1 ? "s" : ""}`
            ) : (
              "Continue"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
