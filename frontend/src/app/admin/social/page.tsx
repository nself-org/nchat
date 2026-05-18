/**
 * Social Media Integration Admin Page
 * Main page for managing social media integrations
 */

"use client";

import { useState } from "react";
import { SocialAccountManager } from "@/components/admin/SocialAccountManager";
import { SocialIntegrationSettings } from "@/components/admin/SocialIntegrationSettings";
import { SocialPostHistory } from "@/components/admin/SocialPostHistory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSocialAccounts } from "@/hooks/use-social-accounts";

export default function SocialMediaAdminPage() {
  const { accounts } = useSocialAccounts();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );

  const selectedAccount = accounts.find((acc) => acc.id === selectedAccountId);

  return (
    <div className="container mx-auto space-y-8 py-8">
      <div>
        <h1 className="text-3xl font-bold">Social Media Integration</h1>
        <p className="mt-2 text-muted-foreground">
          Connect social media accounts and automatically import posts to
          channels
        </p>
      </div>

      <Tabs defaultValue="accounts" className="space-y-6">
        <TabsList>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="integrations" disabled={accounts.length === 0}>
            Integrations
          </TabsTrigger>
          <TabsTrigger value="history" disabled={accounts.length === 0}>
            Post History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accounts">
          <SocialAccountManager />
        </TabsContent>

        <TabsContent value="integrations">
          {accounts.length > 0 ? (
            <div className="space-y-6">
              {/* Account Selector */}
              <div className="flex gap-2">
                {accounts.map((account) => (
                  <button
                    key={account.id}
                    onClick={() => setSelectedAccountId(account.id)}
                    className={`rounded-lg border px-4 py-2 transition-colors ${
                      selectedAccountId === account.id
                        ? "text-primary-foreground bg-primary"
                        : "bg-background hover:bg-accent"
                    }`}
                  >
                    {account.account_name}
                  </button>
                ))}
              </div>

              {/* Integration Settings */}
              {selectedAccount ? (
                <SocialIntegrationSettings
                  accountId={selectedAccount.id}
                  platform={selectedAccount.platform}
                />
              ) : (
                <p className="py-12 text-center text-muted-foreground">
                  Select an account to configure integrations
                </p>
              )}
            </div>
          ) : (
            <p className="py-12 text-center text-muted-foreground">
              Connect a social account to create integrations
            </p>
          )}
        </TabsContent>

        <TabsContent value="history">
          <SocialPostHistory accountId={selectedAccountId || undefined} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
