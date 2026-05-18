/**
 * Desktop app shell — renders the nChat layout using @nself-chat/ui components.
 * Adapters are provided at the shell layer so UI components stay platform-agnostic.
 */

import React from 'react';
import { Sidebar } from '@nself-chat/ui/layout';
import type { SidebarAdapter } from '@nself-chat/ui/layout';
import { Spinner } from '@nself-chat/ui/primitives';
import { tauriAdapters } from './lib/ui-adapters';

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
// Desktop app shell
// ---------------------------------------------------------------------------

export function DesktopApp(): React.ReactElement {
  const [ready, setReady] = React.useState(false);

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
          Select a channel to start messaging
        </div>
      </main>
    </div>
  );
}
