"use client";

import { useState } from "react";
import {
  Copy,
  Link as LinkIcon,
  Loader2,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useUserManagementStore } from "@/stores/user-management-store";
import {
  formatInviteExpiration,
  generateInviteUrl,
} from "@/lib/admin/users/user-invite";
import type {
  UserRole,
  InviteLink as InviteLinkType,
} from "@/lib/admin/users/user-types";

import { logger } from "@/lib/logger";

export function InviteLink() {
  const [linkRole, setLinkRole] = useState<UserRole>("member");
  const [maxUses, setMaxUses] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("7");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const [copied, setCopied] = useState(false);

  const { inviteLinks, roles, addInviteLink, removeInviteLink } =
    useUserManagementStore();

  const roleOptions =
    roles.length > 0
      ? roles
      : [
          { id: "admin", name: "Admin" },
          { id: "moderator", name: "Moderator" },
          { id: "member", name: "Member" },
          { id: "guest", name: "Guest" },
        ];

  const handleGenerateLink = async () => {
    setIsGenerating(true);
    try {
      // Generate a unique code
      const code = Math.random().toString(36).substring(2, 10);
      const link = generateInviteUrl(code);

      // Calculate expiration
      let expiresAt: string;
      if (expiresInDays === "never") {
        expiresAt = new Date(
          Date.now() + 365 * 24 * 60 * 60 * 1000,
        ).toISOString();
      } else {
        expiresAt = new Date(
          Date.now() + parseInt(expiresInDays, 10) * 24 * 60 * 60 * 1000,
        ).toISOString();
      }

      // Add to store
      const newLink: InviteLinkType = {
        id: Date.now().toString(),
        code,
        url: link,
        role: linkRole,
        maxUses: maxUses ? parseInt(maxUses, 10) : null,
        currentUses: 0,
        expiresAt,
        createdAt: new Date().toISOString(),
        createdBy: {
          id: "current-user",
          username: "admin",
          displayName: "Admin User",
        },
        isActive: true,
      };

      addInviteLink(newLink);
      setGeneratedLink(link);
    } catch (error) {
      logger.error("Failed to generate link:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteLink = async (linkId: string) => {
    // In production, call the API first
    removeInviteLink(linkId);
  };

  const activeLinks = inviteLinks.filter((l) => l.isActive);

  return (
    <div className="space-y-6">
      {/* Generate New Link */}
      <Card>
        <CardHeader>
          <CardTitle>Generate Invite Link</CardTitle>
          <CardDescription>
            Create a shareable link that allows users to join your workspace
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
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

            <div className="space-y-2">
              <Label htmlFor="max-uses">Max Uses</Label>
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
              <Label>Generated Link</Label>
              <div className="flex gap-2">
                <Input
                  value={generatedLink}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  onClick={() => handleCopyLink(generatedLink)}
                >
                  {copied ? "Copied!" : <Copy className="h-4 w-4" />}
                </Button>
                <Button variant="outline" asChild>
                  <a
                    href={generatedLink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          )}

          <Button onClick={handleGenerateLink} disabled={isGenerating}>
            {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <LinkIcon className="mr-2 h-4 w-4" />
            Generate Link
          </Button>
        </CardContent>
      </Card>

      {/* Active Links */}
      <Card>
        <CardHeader>
          <CardTitle>Active Invite Links</CardTitle>
          <CardDescription>Manage your existing invite links</CardDescription>
        </CardHeader>
        <CardContent>
          {activeLinks.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No active invite links
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Link</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Uses</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeLinks.map((link) => (
                  <TableRow key={link.id}>
                    <TableCell>
                      <code className="rounded bg-muted px-2 py-1 text-xs">
                        {link.code}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {link.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {link.currentUses}
                      {link.maxUses && ` / ${link.maxUses}`}
                    </TableCell>
                    <TableCell>
                      {formatInviteExpiration(link.expiresAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleCopyLink(link.url)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDeleteLink(link.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default InviteLink;
