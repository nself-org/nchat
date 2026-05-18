"use client";

import { useState } from "react";
import {
  User,
  Shield,
  Crown,
  MessageSquare,
  Phone,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  ComponentPreview,
  PreviewCard,
  PreviewGrid,
} from "@/components/dev/component-preview";
import { CodeBlock } from "@/components/dev/code-block";
import { PropsTable, PropDefinition } from "@/components/dev/props-table";

// ============================================================================
// Mock Data
// ============================================================================

const mockUsers = [
  {
    id: "user-1",
    displayName: "Alice Johnson",
    username: "alice",
    avatarUrl: null,
    presence: "online",
    role: "owner",
    bio: "Building the future of team communication",
    customStatus: { emoji: "coffee", text: "In deep work mode" },
  },
  {
    id: "user-2",
    displayName: "Bob Smith",
    username: "bob",
    avatarUrl: null,
    presence: "away",
    role: "admin",
    bio: "Full-stack developer",
  },
  {
    id: "user-3",
    displayName: "Carol Williams",
    username: "carol",
    avatarUrl: null,
    presence: "dnd",
    role: "moderator",
  },
  {
    id: "user-4",
    displayName: "David Brown",
    username: "david",
    avatarUrl: null,
    presence: "offline",
    role: "member",
  },
];

// ============================================================================
// Props Definitions
// ============================================================================

const userAvatarProps: PropDefinition[] = [
  {
    name: "user",
    type: 'Pick<UserProfile, "avatarUrl" | "displayName">',
    description: "User object with avatar and name",
  },
  {
    name: "src",
    type: "string",
    description: "Direct avatar URL (overrides user.avatarUrl)",
  },
  {
    name: "name",
    type: "string",
    description: "Display name for fallback initials",
  },
  {
    name: "size",
    type: '"xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl"',
    default: '"md"',
    description: "Avatar size",
  },
  {
    name: "shape",
    type: '"circle" | "rounded" | "square"',
    default: '"circle"',
    description: "Avatar shape",
  },
  {
    name: "presence",
    type: "PresenceStatus",
    description: "User presence status",
  },
  {
    name: "showPresence",
    type: "boolean",
    default: "true",
    description: "Whether to show presence indicator",
  },
  {
    name: "loading",
    type: "boolean",
    default: "false",
    description: "Show loading skeleton",
  },
  {
    name: "interactive",
    type: "boolean",
    default: "false",
    description: "Enable hover/click effects",
  },
  {
    name: "fallbackColor",
    type: "string",
    description: "Background color for fallback",
  },
];

const userProfileCardProps: PropDefinition[] = [
  {
    name: "user",
    type: "UserProfile",
    required: true,
    description: "User profile object",
  },
  {
    name: "onMessage",
    type: "() => void",
    description: "Callback for message button",
  },
  {
    name: "onCall",
    type: "() => void",
    description: "Callback for call button",
  },
  {
    name: "onViewProfile",
    type: "() => void",
    description: "Callback for view profile button",
  },
  {
    name: "showQuickActions",
    type: "boolean",
    default: "true",
    description: "Show action buttons",
  },
  {
    name: "compact",
    type: "boolean",
    default: "false",
    description: "Compact card mode",
  },
];

const presenceDotProps: PropDefinition[] = [
  {
    name: "status",
    type: '"online" | "away" | "dnd" | "offline"',
    required: true,
    description: "Presence status",
  },
  {
    name: "size",
    type: '"xs" | "sm" | "md" | "lg" | "xl"',
    default: '"md"',
    description: "Dot size",
  },
  {
    name: "position",
    type: '"bottom-right" | "bottom-left" | "top-right" | "top-left" | "inline"',
    default: '"bottom-right"',
    description: "Position relative to parent",
  },
  {
    name: "showTooltip",
    type: "boolean",
    default: "false",
    description: "Show status tooltip on hover",
  },
  {
    name: "animate",
    type: "boolean",
    default: "true",
    description: "Animate online status",
  },
];

// ============================================================================
// Code Examples
// ============================================================================

const userAvatarCode = `import { UserAvatar } from '@/components/user/user-avatar'

// Basic usage
<UserAvatar
  user={{ displayName: 'Alice', avatarUrl: '/avatar.png' }}
  size="md"
  presence="online"
/>

// With fallback
<UserAvatar
  name="Bob Smith"
  size="lg"
  presence="away"
  fallbackColor="#8B5CF6"
/>

// Avatar group
import { UserAvatarGroup } from '@/components/user/user-avatar'

<UserAvatarGroup
  users={[
    { id: '1', displayName: 'Alice', avatarUrl: '/alice.png' },
    { id: '2', displayName: 'Bob', avatarUrl: '/bob.png' },
    { id: '3', displayName: 'Carol', avatarUrl: '/carol.png' },
  ]}
  max={3}
  size="sm"
/>`;

const userProfileCardCode = `import { UserProfileCard, UserProfileCardTrigger } from '@/components/user/user-profile-card'

// Standalone card
<UserProfileCard
  user={currentUser}
  onMessage={() => openDM(user)}
  onViewProfile={() => router.push(\`/users/\${user.id}\`)}
/>

// Hover trigger
<UserProfileCardTrigger
  user={user}
  onMessage={() => openDM(user)}
  side="right"
>
  <UserAvatar user={user} size="sm" interactive />
</UserProfileCardTrigger>`;

const presenceDotCode = `import { UserPresenceDot } from '@/components/user/user-presence-dot'

<UserPresenceDot status="online" size="md" />
<UserPresenceDot status="away" size="sm" showTooltip />
<UserPresenceDot status="dnd" size="lg" position="inline" />
<UserPresenceDot status="offline" animate={false} />`;

// ============================================================================
// Page Component
// ============================================================================

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState("overview");

  // Helper to get presence color
  const getPresenceColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-green-500";
      case "away":
        return "bg-yellow-500";
      case "dnd":
        return "bg-red-500";
      default:
        return "bg-gray-400";
    }
  };

  // Helper to get role badge color
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "owner":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "admin":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "moderator":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="mb-2 flex items-center gap-3">
          <div className="rounded-lg bg-orange-500/10 p-2">
            <User className="h-5 w-5 text-orange-500" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">User Components</h1>
        </div>
        <p className="text-muted-foreground">
          Components for displaying user information including avatars, profile
          cards, presence indicators, and role badges.
        </p>
      </div>

      {/* Component List */}
      <div className="flex flex-wrap gap-2">
        {[
          "UserAvatar",
          "UserAvatarGroup",
          "UserProfileCard",
          "UserPresenceDot",
          "RoleBadge",
          "UserStatus",
        ].map((name) => (
          <Badge key={name} variant="secondary" className="text-sm">
            {name}
          </Badge>
        ))}
      </div>

      <Separator />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="avatar">UserAvatar</TabsTrigger>
          <TabsTrigger value="profilecard">UserProfileCard</TabsTrigger>
          <TabsTrigger value="presence">PresenceIndicator</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>User Component System</CardTitle>
              <CardDescription>
                A complete set of components for displaying user identity,
                status, and profile information throughout the application.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <PreviewCard title="UserAvatar">
                  <div className="space-y-2 text-sm">
                    <p className="text-muted-foreground">
                      Display user avatar with fallback initials and optional
                      presence indicator.
                    </p>
                    <ul className="list-inside list-disc text-muted-foreground">
                      <li>7 size variants</li>
                      <li>3 shape options</li>
                      <li>Presence overlay</li>
                      <li>Loading skeleton</li>
                    </ul>
                  </div>
                </PreviewCard>

                <PreviewCard title="UserProfileCard">
                  <div className="space-y-2 text-sm">
                    <p className="text-muted-foreground">
                      Rich profile card with cover image, bio, and quick action
                      buttons.
                    </p>
                    <ul className="list-inside list-disc text-muted-foreground">
                      <li>Hover trigger</li>
                      <li>Quick actions</li>
                      <li>Compact mode</li>
                      <li>Custom status</li>
                    </ul>
                  </div>
                </PreviewCard>

                <PreviewCard title="UserPresenceDot">
                  <div className="space-y-2 text-sm">
                    <p className="text-muted-foreground">
                      Status indicator showing online, away, DND, or offline
                      state.
                    </p>
                    <ul className="list-inside list-disc text-muted-foreground">
                      <li>4 status states</li>
                      <li>5 size variants</li>
                      <li>Animated pulse</li>
                      <li>Tooltip support</li>
                    </ul>
                  </div>
                </PreviewCard>
              </div>
            </CardContent>
          </Card>

          {/* Demo Preview - All Components Together */}
          <ComponentPreview
            title="User Components Demo"
            description="All user components working together"
          >
            <div className="space-y-6">
              {/* Avatar Sizes */}
              <div>
                <h4 className="mb-3 text-sm font-medium">Avatar Sizes</h4>
                <div className="flex items-end gap-4">
                  {["xs", "sm", "md", "lg", "xl", "2xl"].map((size, i) => (
                    <div key={size} className="text-center">
                      <div
                        className={cn(
                          "relative flex items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 font-medium text-white",
                          size === "xs" && "h-6 w-6 text-[10px]",
                          size === "sm" && "h-8 w-8 text-xs",
                          size === "md" && "h-10 w-10 text-sm",
                          size === "lg" && "h-12 w-12 text-base",
                          size === "xl" && "h-16 w-16 text-lg",
                          size === "2xl" && "h-20 w-20 text-xl",
                        )}
                      >
                        {mockUsers[i % 4].displayName.charAt(0)}
                        <span
                          className={cn(
                            "absolute rounded-full border-2 border-background",
                            getPresenceColor(mockUsers[i % 4].presence),
                            size === "xs" && "bottom-0 right-0 h-2 w-2",
                            size === "sm" && "bottom-0 right-0 h-2.5 w-2.5",
                            size === "md" && "bottom-0 right-0 h-3 w-3",
                            size === "lg" && "bottom-0 right-0 h-3.5 w-3.5",
                            size === "xl" && "bottom-0 right-0 h-4 w-4",
                            size === "2xl" && "bottom-1 right-1 h-4 w-4",
                          )}
                        />
                      </div>
                      <span className="mt-1 text-xs text-muted-foreground">
                        {size}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Avatar Group */}
              <div>
                <h4 className="mb-3 text-sm font-medium">Avatar Group</h4>
                <div className="flex items-center">
                  {mockUsers.slice(0, 3).map((user, i) => (
                    <div
                      key={user.id}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br text-xs font-medium text-white ring-2 ring-background",
                        i === 0 && "from-blue-500 to-cyan-500",
                        i === 1 && "-ml-2 from-green-500 to-emerald-500",
                        i === 2 && "-ml-2 from-purple-500 to-pink-500",
                      )}
                    >
                      {user.displayName.charAt(0)}
                    </div>
                  ))}
                  <div className="-ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium ring-2 ring-background">
                    +5
                  </div>
                </div>
              </div>

              {/* Presence States */}
              <div>
                <h4 className="mb-3 text-sm font-medium">Presence States</h4>
                <div className="flex gap-6">
                  {[
                    {
                      status: "online",
                      label: "Online",
                      color: "bg-green-500",
                    },
                    { status: "away", label: "Away", color: "bg-yellow-500" },
                    {
                      status: "dnd",
                      label: "Do Not Disturb",
                      color: "bg-red-500",
                    },
                    {
                      status: "offline",
                      label: "Offline",
                      color: "bg-gray-400",
                    },
                  ].map((item) => (
                    <div key={item.status} className="flex items-center gap-2">
                      <span
                        className={cn("h-3 w-3 rounded-full", item.color)}
                      />
                      <span className="text-sm">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Role Badges */}
              <div>
                <h4 className="mb-3 text-sm font-medium">Role Badges</h4>
                <div className="flex gap-2">
                  {[
                    { role: "owner", label: "Owner", icon: Crown },
                    { role: "admin", label: "Admin", icon: Shield },
                    { role: "moderator", label: "Moderator", icon: Shield },
                    { role: "member", label: "Member", icon: User },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <span
                        key={item.role}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium",
                          getRoleBadgeColor(item.role),
                        )}
                      >
                        <Icon className="h-3 w-3" />
                        {item.label}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Profile Card */}
              <div>
                <h4 className="mb-3 text-sm font-medium">Profile Card</h4>
                <div className="w-80 overflow-hidden rounded-lg border">
                  <div className="from-primary/20 to-primary/10 h-16 bg-gradient-to-r" />
                  <div className="-mt-8 p-4">
                    <div className="mb-3 flex items-end gap-4">
                      <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-xl font-medium text-white ring-4 ring-background">
                        A
                        <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-background bg-green-500" />
                      </div>
                      <div className="flex-1 pb-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold">
                            Alice Johnson
                          </h3>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
                              getRoleBadgeColor("owner"),
                            )}
                          >
                            <Crown className="h-2.5 w-2.5" />
                            Owner
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">@alice</p>
                      </div>
                    </div>
                    <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
                      <span className="capitalize">online</span>
                    </div>
                    <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                      Building the future of team communication
                    </p>
                    <Separator className="my-3" />
                    <div className="flex items-center gap-2">
                      <Button size="sm" className="flex-1">
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Message
                      </Button>
                      <Button variant="outline" size="sm">
                        <Phone className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ComponentPreview>
        </TabsContent>

        {/* UserAvatar Tab */}
        <TabsContent value="avatar" className="mt-6 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>UserAvatar</CardTitle>
              <CardDescription>
                A flexible avatar component with multiple sizes, shapes, and an
                integrated presence indicator.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock
                code={userAvatarCode}
                language="tsx"
                filename="avatar-examples.tsx"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Props</CardTitle>
            </CardHeader>
            <CardContent>
              <PropsTable props={userAvatarProps} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Size Variants</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-2 text-left">Size</th>
                      <th className="px-4 py-2 text-left">Dimensions</th>
                      <th className="px-4 py-2 text-left">Use Case</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="px-4 py-2">
                        <code>xs</code>
                      </td>
                      <td className="px-4 py-2">24x24px</td>
                      <td className="px-4 py-2">Inline text, badges</td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-4 py-2">
                        <code>sm</code>
                      </td>
                      <td className="px-4 py-2">32x32px</td>
                      <td className="px-4 py-2">Lists, threads</td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-4 py-2">
                        <code>md</code>
                      </td>
                      <td className="px-4 py-2">40x40px</td>
                      <td className="px-4 py-2">Message avatars (default)</td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-4 py-2">
                        <code>lg</code>
                      </td>
                      <td className="px-4 py-2">48x48px</td>
                      <td className="px-4 py-2">Member lists</td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-4 py-2">
                        <code>xl</code>
                      </td>
                      <td className="px-4 py-2">64x64px</td>
                      <td className="px-4 py-2">Profile cards</td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-4 py-2">
                        <code>2xl</code>
                      </td>
                      <td className="px-4 py-2">80x80px</td>
                      <td className="px-4 py-2">Profile pages</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2">
                        <code>3xl</code>
                      </td>
                      <td className="px-4 py-2">96x96px</td>
                      <td className="px-4 py-2">Large profile views</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* UserProfileCard Tab */}
        <TabsContent value="profilecard" className="mt-6 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>UserProfileCard</CardTitle>
              <CardDescription>
                A rich profile card that shows user information with optional
                cover image, custom status, and quick action buttons.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock
                code={userProfileCardCode}
                language="tsx"
                filename="profile-card-examples.tsx"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Props</CardTitle>
            </CardHeader>
            <CardContent>
              <PropsTable props={userProfileCardProps} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Variants</CardTitle>
            </CardHeader>
            <CardContent>
              <PreviewGrid cols={2}>
                <PreviewCard title="Full Card">
                  <p className="text-sm text-muted-foreground">
                    Full-size card with cover image, avatar, bio, and action
                    buttons. Used in hover cards and profile modals.
                  </p>
                </PreviewCard>
                <PreviewCard title="Compact Card">
                  <p className="text-sm text-muted-foreground">
                    Minimal card with just avatar, name, and role. Used in
                    member lists and search results.
                  </p>
                </PreviewCard>
              </PreviewGrid>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PresenceIndicator Tab */}
        <TabsContent value="presence" className="mt-6 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>UserPresenceDot</CardTitle>
              <CardDescription>
                A status indicator dot showing the user&apos;s current online
                status. Can be positioned absolutely within avatars or inline in
                text.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock
                code={presenceDotCode}
                language="tsx"
                filename="presence-examples.tsx"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Props</CardTitle>
            </CardHeader>
            <CardContent>
              <PropsTable props={presenceDotProps} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status States</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-2 text-left">Status</th>
                      <th className="px-4 py-2 text-left">Color</th>
                      <th className="px-4 py-2 text-left">Animation</th>
                      <th className="px-4 py-2 text-left">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="px-4 py-2">
                        <code>online</code>
                      </td>
                      <td className="px-4 py-2">
                        <span className="inline-flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full bg-green-500" />
                          Green
                        </span>
                      </td>
                      <td className="px-4 py-2">Pulse</td>
                      <td className="px-4 py-2">
                        User is active and available
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-4 py-2">
                        <code>away</code>
                      </td>
                      <td className="px-4 py-2">
                        <span className="inline-flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full bg-yellow-500" />
                          Yellow
                        </span>
                      </td>
                      <td className="px-4 py-2">None</td>
                      <td className="px-4 py-2">
                        User is idle or stepped away
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-4 py-2">
                        <code>dnd</code>
                      </td>
                      <td className="px-4 py-2">
                        <span className="inline-flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full bg-red-500" />
                          Red
                        </span>
                      </td>
                      <td className="px-4 py-2">None</td>
                      <td className="px-4 py-2">
                        Do not disturb - no notifications
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2">
                        <code>offline</code>
                      </td>
                      <td className="px-4 py-2">
                        <span className="inline-flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full bg-gray-400" />
                          Gray
                        </span>
                      </td>
                      <td className="px-4 py-2">None</td>
                      <td className="px-4 py-2">User is not connected</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
