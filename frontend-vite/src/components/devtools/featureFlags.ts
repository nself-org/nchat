/**
 * Purpose:    Feature-flag catalog + code samples for /dev/features. Extracted from the legacy
 *             app/dev/features/page.tsx to keep the page under the 300-line cap.
 * Inputs:     none — pure constant data.
 * Outputs:    FEATURE_FLAGS, CATEGORY_LABELS, and the three code-sample strings.
 * Constraints:Data only. SOT below.
 * SOT:        F-NCHAT-VITE-DEVTOOLS-FEATUREFLAGS-01
 */
import {
  Hash,
  Lock,
  MessageSquare,
  MessageCircle,
  Smile,
  Search,
  Calendar,
  Upload,
  Mic,
  Video,
  Sparkles,
  Users,
  Link,
  FolderOpen,
  type LucideIcon,
} from 'lucide-react'

export type FeatureCategory = 'channels' | 'messaging' | 'media' | 'organization' | 'advanced'

export interface FeatureFlag {
  id: string
  name: string
  description: string
  icon: LucideIcon
  category: FeatureCategory
  defaultEnabled: boolean
  dependencies?: string[]
}

export const FEATURE_FLAGS: ReadonlyArray<FeatureFlag> = [
  { id: 'publicChannels', name: 'Public Channels', description: 'Allow creation of public channels visible to all members', icon: Hash, category: 'channels', defaultEnabled: true },
  { id: 'privateChannels', name: 'Private Channels', description: 'Allow creation of private, invite-only channels', icon: Lock, category: 'channels', defaultEnabled: true },
  { id: 'directMessages', name: 'Direct Messages', description: 'Enable one-on-one private messaging between users', icon: MessageSquare, category: 'channels', defaultEnabled: true },
  { id: 'threads', name: 'Message Threads', description: 'Allow threaded replies to keep conversations organized', icon: MessageCircle, category: 'messaging', defaultEnabled: true },
  { id: 'reactions', name: 'Emoji Reactions', description: 'Allow users to react to messages with emoji', icon: Smile, category: 'messaging', defaultEnabled: true },
  { id: 'search', name: 'Message Search', description: 'Enable full-text search across all messages', icon: Search, category: 'messaging', defaultEnabled: true },
  { id: 'messageScheduling', name: 'Message Scheduling', description: 'Schedule messages to be sent at a later time', icon: Calendar, category: 'messaging', defaultEnabled: false },
  { id: 'fileUploads', name: 'File Uploads', description: 'Allow users to upload and share files', icon: Upload, category: 'media', defaultEnabled: true },
  { id: 'voiceMessages', name: 'Voice Messages', description: 'Record and send voice messages', icon: Mic, category: 'media', defaultEnabled: false, dependencies: ['fileUploads'] },
  { id: 'videoConferencing', name: 'Video Conferencing', description: 'Start video calls within channels and DMs', icon: Video, category: 'media', defaultEnabled: false },
  { id: 'customEmojis', name: 'Custom Emoji', description: 'Upload and use custom emoji', icon: Sparkles, category: 'media', defaultEnabled: false, dependencies: ['fileUploads', 'reactions'] },
  { id: 'guestAccess', name: 'Guest Access', description: 'Allow external guests with limited access', icon: Users, category: 'organization', defaultEnabled: false },
  { id: 'inviteLinks', name: 'Invite Links', description: 'Generate shareable invite links for channels', icon: Link, category: 'organization', defaultEnabled: true },
  { id: 'channelCategories', name: 'Channel Categories', description: 'Organize channels into collapsible categories', icon: FolderOpen, category: 'organization', defaultEnabled: false, dependencies: ['publicChannels'] },
]

export const CATEGORY_LABELS: Record<FeatureCategory, string> = {
  channels: 'Channels',
  messaging: 'Messaging',
  media: 'Media & Files',
  organization: 'Organization',
  advanced: 'Advanced',
}

export const FEATURE_CONFIG_CODE = `// src/config/app-config.ts

export interface AppConfig {
  features: {
    publicChannels: boolean
    privateChannels: boolean
    directMessages: boolean
    fileUploads: boolean
    voiceMessages: boolean
    threads: boolean
    reactions: boolean
    search: boolean
    guestAccess: boolean
    inviteLinks: boolean
    channelCategories: boolean
    customEmojis: boolean
    messageScheduling: boolean
    videoConferencing: boolean
  }
}`

export const FEATURE_USAGE_CODE = `// Using feature flags in components
import { useAppConfig } from '@/contexts/app-config-context'

function MessageActions({ message }) {
  const { config } = useAppConfig()

  return (
    <div className="flex gap-1">
      {config?.features?.reactions && (
        <Button onClick={() => openReactionPicker()}>
          <Smile className="h-4 w-4" />
        </Button>
      )}

      {config?.features?.threads && (
        <Button onClick={() => openThread(message)}>
          <MessageCircle className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}`

export const FEATURE_GUARD_CODE = `// Feature guard component
export function FeatureGuard({
  feature,
  children,
  fallback = null
}: {
  feature: keyof AppConfig['features']
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  const { config } = useAppConfig()

  if (!config?.features?.[feature]) {
    return fallback
  }

  return children
}

// Usage
<FeatureGuard feature="voiceMessages">
  <VoiceRecordButton />
</FeatureGuard>`
