"use client";

import { useState, useEffect } from "react";
import { type AppConfig } from "@/config/app-config";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings, CheckCircle } from "lucide-react";

interface FeaturesStepProps {
  config: AppConfig;
  onUpdate: (updates: Partial<AppConfig>) => void;
  onValidate: (isValid: boolean) => void;
}

export function FeaturesStep({
  config,
  onUpdate,
  onValidate,
}: FeaturesStepProps) {
  const [features, setFeatures] = useState(config.features);

  useEffect(() => {
    onValidate(true); // Always valid
  }, [onValidate]);

  const handleFeatureToggle = (
    feature: keyof typeof features,
    enabled: boolean,
  ) => {
    const updated = { ...features, [feature]: enabled };
    setFeatures(updated);
    onUpdate({ features: updated });
  };

  const featureGroups = [
    {
      title: "Core Messaging",
      features: [
        {
          key: "publicChannels",
          label: "Public Channels",
          description: "Open channels visible to all members",
        },
        {
          key: "privateChannels",
          label: "Private Channels",
          description: "Invite-only channels for teams",
        },
        {
          key: "directMessages",
          label: "Direct Messages",
          description: "1-on-1 private conversations",
        },
        {
          key: "groupMessages",
          label: "Group Messages",
          description: "Private group conversations",
        },
        {
          key: "messageEditing",
          label: "Edit Messages",
          description: "Edit messages after sending",
        },
        {
          key: "messageDeleting",
          label: "Delete Messages",
          description: "Remove sent messages",
        },
        {
          key: "threads",
          label: "Message Threads",
          description: "Reply in threads to organize discussions",
        },
        {
          key: "pinnedMessages",
          label: "Pin Messages",
          description: "Pin important messages to channels",
        },
      ],
    },
    {
      title: "Content & Media",
      features: [
        {
          key: "fileUploads",
          label: "File Uploads",
          description: "Share documents and images",
        },
        {
          key: "imagePreview",
          label: "Image Previews",
          description: "View images inline in chat",
        },
        {
          key: "linkPreviews",
          label: "Link Previews",
          description: "Rich previews for shared links",
        },
        {
          key: "socialEmbeds",
          label: "Social Media Embeds",
          description: "Play videos from YouTube, Instagram, TikTok inline",
        },
        {
          key: "urlUnfurling",
          label: "Smart URL Unfurling",
          description: "Auto-expand links with title, description, thumbnail",
        },
        {
          key: "reactions",
          label: "Emoji Reactions",
          description: "React to messages with emojis",
        },
        {
          key: "customEmojis",
          label: "Custom Emojis",
          description: "Upload custom workspace emojis",
        },
        {
          key: "codeBlocks",
          label: "Code Blocks",
          description: "Share code with syntax highlighting",
        },
        {
          key: "markdownSupport",
          label: "Markdown",
          description: "Format messages with markdown",
        },
      ],
    },
    {
      title: "Organization",
      features: [
        {
          key: "search",
          label: "Search",
          description: "Search messages and files",
        },
        {
          key: "mentions",
          label: "@Mentions",
          description: "Tag users in messages",
        },
        {
          key: "notifications",
          label: "Notifications",
          description: "Desktop and mobile notifications",
        },
        {
          key: "unreadIndicators",
          label: "Unread Indicators",
          description: "Track unread messages",
        },
        {
          key: "savedMessages",
          label: "Saved Messages",
          description: "Bookmark important messages",
        },
        {
          key: "userStatus",
          label: "User Status",
          description: "Set online/away/busy status",
        },
        {
          key: "typing",
          label: "Typing Indicators",
          description: "See when others are typing",
        },
      ],
    },
    {
      title: "User Management",
      features: [
        {
          key: "userProfiles",
          label: "User Profiles",
          description: "Profile pictures and bios",
        },
        {
          key: "userDirectory",
          label: "Member Directory",
          description: "Browse all workspace members",
        },
        {
          key: "roles",
          label: "User Roles",
          description: "Admin, moderator, member roles",
        },
        {
          key: "permissions",
          label: "Permissions",
          description: "Control who can post where",
        },
        {
          key: "inviteLinks",
          label: "Invite Links",
          description: "Share links to join workspace",
        },
        {
          key: "guestAccess",
          label: "Guest Access",
          description: "Allow limited guest access",
        },
      ],
    },
    {
      title: "Integrations",
      features: [
        {
          key: "webhooks",
          label: "Webhooks",
          description: "Send notifications from external apps",
        },
        {
          key: "slashCommands",
          label: "Slash Commands",
          description: "Quick actions with / commands",
        },
        {
          key: "bots",
          label: "Bot Support",
          description: "Add bots for automation",
        },
        {
          key: "apiAccess",
          label: "API Access",
          description: "Programmatic access to workspace",
        },
      ],
    },
    {
      title: "Administration",
      features: [
        {
          key: "moderation",
          label: "Message Moderation",
          description: "Delete inappropriate content",
        },
        {
          key: "userBanning",
          label: "Ban Users",
          description: "Remove and block users",
        },
        {
          key: "exportData",
          label: "Export Data",
          description: "Download workspace data",
        },
        {
          key: "analytics",
          label: "Basic Analytics",
          description: "Message and user statistics",
        },
        {
          key: "auditLog",
          label: "Audit Log",
          description: "Track admin actions",
        },
      ],
    },
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 text-center">
        <div className="shadow-glow mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#00D4FF] to-[#0EA5E9]">
          <Settings className="h-6 w-6 text-zinc-900" />
        </div>
        <h2 className="mb-3 text-2xl font-bold text-zinc-900 dark:text-white">
          Features & Capabilities
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          Choose which features to enable for your platform
        </p>
      </div>

      <div className="space-y-6">
        {featureGroups.map((group, groupIndex) => (
          <div key={groupIndex} className="space-y-4">
            <Label className="text-base font-medium text-zinc-900 dark:text-white">
              {group.title}
            </Label>

            <div className="space-y-4">
              {group.features.map((feature) => {
                const isEnabled =
                  features[feature.key as keyof typeof features];

                return (
                  <div
                    key={feature.key}
                    className="flex items-center justify-between rounded-xl border border-zinc-900/10 bg-white p-3 transition-all duration-300 hover:border-[#00D4FF]/30 dark:border-white/10 dark:bg-zinc-900 dark:hover:border-[#00D4FF]/30"
                  >
                    <div>
                      <div className="font-medium text-zinc-900 dark:text-white">
                        {feature.label}
                      </div>
                      <div className="text-sm text-zinc-600 dark:text-zinc-400">
                        {feature.description}
                      </div>
                    </div>
                    <Switch
                      checked={Boolean(isEnabled)}
                      onCheckedChange={(checked) =>
                        handleFeatureToggle(
                          feature.key as keyof typeof features,
                          checked,
                        )
                      }
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="rounded-xl border border-[#0EA5E9]/20 bg-gradient-to-r from-[#00D4FF]/10 to-[#0EA5E9]/10 p-4 dark:border-[#00D4FF]/30 dark:from-[#00D4FF]/20 dark:to-[#0EA5E9]/20">
          <div className="flex gap-3">
            <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#0EA5E9]" />
            <div className="text-sm text-zinc-700 dark:text-zinc-300">
              <p className="mb-1 font-medium text-zinc-900 dark:text-white">
                Feature Recommendations
              </p>
              <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                <li>
                  • Start with core messaging features and expand gradually
                </li>
                <li>
                  • Enable file uploads and reactions for richer communication
                </li>
                <li>• Add user roles and permissions for larger teams</li>
                <li>• Integrations help connect with your existing tools</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-purple-500/20 bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-4 dark:border-purple-400/30 dark:from-purple-500/20 dark:to-pink-500/20">
          <div className="flex gap-3">
            <div className="mt-0.5 flex-shrink-0">
              <span className="text-lg">🚀</span>
            </div>
            <div className="text-sm text-zinc-700 dark:text-zinc-300">
              <p className="mb-2 font-medium text-zinc-900 dark:text-white">
                Future Roadmap
              </p>
              <div className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
                <div>
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Voice & Video:
                  </span>
                  <p className="ml-2">
                    Voice/video calls, screen sharing, huddles, voice channels,
                    live streaming, call recording
                  </p>
                </div>
                <div>
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                    AI Features:
                  </span>
                  <p className="ml-2">
                    Smart replies, auto-translation, voice transcription, noise
                    suppression, content moderation
                  </p>
                </div>
                <div>
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Collaboration:
                  </span>
                  <p className="ml-2">
                    Shared canvas, whiteboards, calendars, task lists, forms,
                    polls, shared notes
                  </p>
                </div>
                <div>
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Advanced Media:
                  </span>
                  <p className="ml-2">
                    GIF search, stickers, live location, drawing tools, video
                    messages
                  </p>
                </div>
                <div>
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Automation:
                  </span>
                  <p className="ml-2">
                    Workflow builder, scheduled messages, auto-responders,
                    custom bots, app directory
                  </p>
                </div>
                <div>
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Enterprise:
                  </span>
                  <p className="ml-2">
                    E2E encryption, SSO, compliance tools, advanced analytics,
                    IP restrictions
                  </p>
                </div>
                <div>
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Community:
                  </span>
                  <p className="ml-2">
                    Forums, threads, broadcasts, leaderboards, activity feeds,
                    communities/servers
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
