/**
 * Email Test Panel Component
 *
 * Admin component for testing email templates and configuration.
 */

"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, XCircle, Loader2, Mail, Send } from "lucide-react";
import type { EmailType } from "@/lib/email/types";

import { logger } from "@/lib/logger";

// ============================================================================
// Email Test Panel Component
// ============================================================================

export default function EmailTestPanel() {
  const [emailType, setEmailType] = React.useState<EmailType>("welcome");
  const [recipientEmail, setRecipientEmail] = React.useState("");
  const [recipientName, setRecipientName] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [verifying, setVerifying] = React.useState(false);
  const [result, setResult] = React.useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [queueStatus, setQueueStatus] = React.useState<any>(null);

  // Template-specific data
  const [templateData, setTemplateData] = React.useState<Record<string, any>>({
    userName: "Test User",
    loginUrl: "http://localhost:3000/login",
    verificationUrl: "http://localhost:3000/verify?token=abc123",
    verificationCode: "123456",
    resetUrl: "http://localhost:3000/reset?token=xyz789",
    messagePreview: "Hey, check out this cool feature!",
    messageUrl: "http://localhost:3000/chat/channel/general/msg123",
  });

  // ==========================================================================
  // Handlers
  // ==========================================================================

  const handleSendTestEmail = async () => {
    if (!recipientEmail) {
      setResult({
        success: false,
        message: "Please enter a recipient email address",
      });
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const response = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: emailType,
          to: {
            email: recipientEmail,
            name: recipientName || undefined,
          },
          data: getTemplateData(emailType),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: `Email queued successfully! ID: ${data.emailId}`,
        });
        // Refresh queue status
        fetchQueueStatus();
      } else {
        setResult({
          success: false,
          message: data.error || "Failed to send email",
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setSending(false);
    }
  };

  const handleVerifyConfig = async () => {
    setVerifying(true);

    try {
      const response = await fetch("/api/email/send?action=verify");
      const data = await response.json();

      setResult({
        success: data.valid,
        message: data.valid
          ? "Email configuration is valid and working!"
          : "Email configuration verification failed. Check your settings.",
      });
    } catch (_error) {
      setResult({
        success: false,
        message: "Failed to verify email configuration",
      });
    } finally {
      setVerifying(false);
    }
  };

  const fetchQueueStatus = async () => {
    try {
      const response = await fetch("/api/email/send?action=status");
      const data = await response.json();
      setQueueStatus(data);
    } catch (error) {
      logger.error("Failed to fetch queue status:", error);
    }
  };

  const getTemplateData = (type: EmailType): any => {
    const baseData = {
      userName: templateData.userName,
    };

    switch (type) {
      case "welcome":
        return {
          ...baseData,
          loginUrl: templateData.loginUrl,
        };

      case "email-verification":
        return {
          ...baseData,
          verificationUrl: templateData.verificationUrl,
          verificationCode: templateData.verificationCode,
        };

      case "password-reset":
        return {
          ...baseData,
          resetUrl: templateData.resetUrl,
        };

      case "password-changed":
        return {
          ...baseData,
          timestamp: new Date(),
        };

      case "new-login":
        return {
          ...baseData,
          deviceInfo: {
            browser: "Chrome",
            os: "macOS",
          },
          timestamp: new Date(),
        };

      case "mention-notification":
        return {
          ...baseData,
          mentionedBy: {
            name: "John Doe",
          },
          channel: {
            name: "general",
            type: "public",
          },
          messagePreview: templateData.messagePreview,
          messageUrl: templateData.messageUrl,
          timestamp: new Date(),
        };

      case "dm-notification":
        return {
          ...baseData,
          sender: {
            name: "Jane Smith",
          },
          messagePreview: templateData.messagePreview,
          messageUrl: templateData.messageUrl,
          timestamp: new Date(),
        };

      case "digest":
        return {
          ...baseData,
          frequency: "daily" as const,
          dateRange: {
            start: new Date(Date.now() - 86400000),
            end: new Date(),
          },
          items: [
            {
              id: "1",
              type: "mention" as const,
              channelName: "general",
              senderName: "John Doe",
              messagePreview: "Hey @TestUser, check this out!",
              url: "http://localhost:3000/chat/general/msg1",
              timestamp: new Date(),
            },
          ],
          stats: {
            totalMessages: 10,
            totalMentions: 2,
            totalDirectMessages: 3,
            totalReactions: 5,
            activeChannels: ["general", "random"],
          },
        };

      default:
        return baseData;
    }
  };

  // Load queue status on mount
  React.useEffect(() => {
    fetchQueueStatus();
  }, []);

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Testing Panel
        </CardTitle>
        <CardDescription>
          Test email templates and verify email configuration
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="send" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="send">Send Test Email</TabsTrigger>
            <TabsTrigger value="status">Queue Status</TabsTrigger>
          </TabsList>

          {/* Send Test Email Tab */}
          <TabsContent value="send" className="space-y-4">
            <div className="grid gap-4">
              {/* Email Type */}
              <div className="space-y-2">
                <Label htmlFor="email-type">Email Type</Label>
                <Select
                  value={emailType}
                  onValueChange={(value) => setEmailType(value as EmailType)}
                >
                  <SelectTrigger id="email-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="welcome">Welcome Email</SelectItem>
                    <SelectItem value="email-verification">
                      Email Verification
                    </SelectItem>
                    <SelectItem value="password-reset">
                      Password Reset
                    </SelectItem>
                    <SelectItem value="password-changed">
                      Password Changed
                    </SelectItem>
                    <SelectItem value="new-login">New Login Alert</SelectItem>
                    <SelectItem value="mention-notification">
                      Mention Notification
                    </SelectItem>
                    <SelectItem value="dm-notification">
                      DM Notification
                    </SelectItem>
                    <SelectItem value="digest">Digest Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Recipient Email */}
              <div className="space-y-2">
                <Label htmlFor="recipient-email">Recipient Email</Label>
                <Input
                  id="recipient-email"
                  type="email"
                  placeholder="test@example.com"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                />
              </div>

              {/* Recipient Name */}
              <div className="space-y-2">
                <Label htmlFor="recipient-name">
                  Recipient Name (Optional)
                </Label>
                <Input
                  id="recipient-name"
                  placeholder="Test User"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                />
              </div>

              {/* Template Data */}
              <div className="space-y-2">
                <Label htmlFor="user-name">User Name (Template Data)</Label>
                <Input
                  id="user-name"
                  placeholder="Test User"
                  value={templateData.userName}
                  onChange={(e) =>
                    setTemplateData({
                      ...templateData,
                      userName: e.target.value,
                    })
                  }
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={handleSendTestEmail}
                  disabled={sending}
                  className="flex-1"
                >
                  {sending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send Test Email
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleVerifyConfig}
                  disabled={verifying}
                >
                  {verifying ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Verify Config"
                  )}
                </Button>
              </div>

              {/* Result */}
              {result && (
                <Alert variant={result.success ? "default" : "destructive"}>
                  {result.success ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  <AlertTitle>
                    {result.success ? "Success" : "Error"}
                  </AlertTitle>
                  <AlertDescription>{result.message}</AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>

          {/* Queue Status Tab */}
          <TabsContent value="status" className="space-y-4">
            {queueStatus ? (
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Total Queued</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{queueStatus.total}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Pending</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-yellow-600">
                      {queueStatus.pending}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Sending</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-blue-600">
                      {queueStatus.sending}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Failed</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-red-600">
                      {queueStatus.failed}
                    </p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            )}

            <Button
              onClick={fetchQueueStatus}
              variant="outline"
              className="w-full"
            >
              Refresh Status
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
