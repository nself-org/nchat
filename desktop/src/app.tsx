/**
 * Purpose: ɳChat desktop app shell — wraps the layout with i18n + RTL support.
 * Inputs:  Tauri IPC (appInfo), i18next locale, @nself-chat/ui Sidebar adapter.
 * Outputs: Full app shell with sidebar + main content area.
 * Constraints:
 *   - NselfI18nProvider must wrap the tree so useNselfTranslation() works everywhere.
 *   - RTL: document.documentElement.dir is kept in sync with i18next locale changes.
 *   - Tauri embeds a Vite SPA so the same CSS dir-attribute approach as web applies.
 * SPORT: F08-SERVICE-INVENTORY.md — nchat-desktop-app-shell
 */

import React from 'react';
import { Sidebar } from '@nself-chat/ui/layout';
import type { SidebarAdapter } from '@nself-chat/ui/layout';
import { Spinner } from '@nself-chat/ui/primitives';
import { tauriAdapters } from './lib/ui-adapters';
import { NselfI18nProvider, useNselfTranslation, isRTL, useTranslation } from '@nself/i18n';

// ─── RTL — set document.dir on locale change ────────────────────────────────

function useDocumentDir(): void {
  const { i18n } = useTranslation();
  React.useEffect(() => {
    const applyDir = (lang: string): void => {
      document.documentElement.dir = isRTL(lang) ? 'rtl' : 'ltr';
    };
    applyDir(i18n.language ?? 'en');
    i18n.on('languageChanged', applyDir);
    return () => {
      i18n.off('languageChanged', applyDir);
    };
  }, [i18n]);
}

// ---------------------------------------------------------------------------
// Stub sidebar adapter — all required fields satisfied, all optional undefined.
// A real implementation connects these to GraphQL subscriptions at runtime.
// ---------------------------------------------------------------------------

const sidebarAdapter: SidebarAdapter = {
  // SidebarAdapter
  currentUser: { id: '', displayName: 'Loading…', avatarUrl: undefined, status: 'offline' },
  workspaceName: 'nChat',
  workspaceIconUrl: undefined,
  onOpenWorkspaceSettings: undefined,
  onOpenUserProfile: undefined,
  onSignOut: undefined,
  showDirectMessages: true,
  // ChannelCategoryAdapter (via ChannelListAdapter)
  onToggleCollapse: () => undefined,
  onCreateChannel: undefined,
  onEditCategory: undefined,
  onDeleteCategory: undefined,
  canManageCategories: false,
  // ChannelItemAdapter (via ChannelListAdapter)
  mutedChannels: new Set(),
  starredChannels: new Set(),
  isAdmin: false,
  onToggleMute: () => undefined,
  onToggleStar: () => undefined,
  onOpenSettings: undefined,
  // ChannelListAdapter extras
  sortOrder: undefined,
  onCreateUncategorizedChannel: undefined,
  // DirectMessageListAdapter
  onNewDM: undefined,
  onNewGroupDM: undefined,
  onClose: undefined,
};

// ---------------------------------------------------------------------------
// Inner shell — uses t() for all user-visible strings
// ---------------------------------------------------------------------------

function DesktopShell(): React.ReactElement {
  const { t } = useNselfTranslation();
  const [ready, setReady] = React.useState(false);

  // Apply dir=rtl on Arabic locale (Tauri SPA — same approach as web).
  useDocumentDir();

  React.useEffect(() => {
    // Confirm Tauri IPC is live before rendering the shell.
    tauriAdapters.appInfo
      .get()
      .then(() => setReady(true))
      .catch(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar — channel + DM navigation */}
      <Sidebar
        channels={[]}
        dmChannels={[]}
        categories={[]}
        adapter={sidebarAdapter}
        activeChannelId={undefined}
        unreadMap={{}}
        onSelect={undefined}
        isLoading={false}
      />

      {/* Main content area */}
      <main className="flex flex-1 flex-col overflow-hidden">
        <div className="flex flex-1 items-center justify-center text-muted-foreground text-sm">
          {t('desktop.nchat.selectChannel')}
        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Desktop app shell — wraps shell with NselfI18nProvider
// ---------------------------------------------------------------------------

export function DesktopApp(): React.ReactElement {
  return (
    <NselfI18nProvider>
      <DesktopShell />
    </NselfI18nProvider>
  );
}
