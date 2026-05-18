"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/auth-context";
import {
  Settings,
  Palette,
  Hash,
  Lock,
  ChevronDown,
  ChevronRight,
  Plus,
  MoreVertical,
  ArrowUpDown,
  Megaphone,
  GripVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  staggerContainer,
  staggerItem,
  sidebarToggle,
  fade,
} from "@/lib/animations";

import { logger } from "@/lib/logger";

type ChannelType = "public" | "private" | "direct" | "group";
type SortOrder = "alphabetical" | "manual" | "recent";

interface Channel {
  id: string;
  name: string;
  slug: string;
  type: ChannelType;
  unreadCount?: number;
  parentId?: string | null;
  order?: number;
  lastActivity?: Date;
}

interface ChannelCategory {
  id: string;
  name: string;
  order: number;
  collapsed?: boolean;
  channels: Channel[];
  parentChannelId?: string; // ID of the parent channel for this category
  hideParentChannel?: boolean; // Option to hide the parent channel
  hideCategory?: boolean; // Option to hide the category label entirely
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [sortOrder, setSortOrder] = useState<SortOrder>("manual");
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
    new Set(),
  );
  const [collapsedChannels, setCollapsedChannels] = useState<Set<string>>(
    new Set(),
  );
  const [isReordering, setIsReordering] = useState(false);
  const [showPublicChannelsAsCategory, setShowPublicChannelsAsCategory] =
    useState(false); // Toggle for public channels category

  // Example data structure with categories and nested channels
  const [categories, setCategories] = useState<ChannelCategory[]>([
    {
      id: "cat-public",
      name: "Public Channels",
      order: 1,
      hideCategory: false, // Can be toggled to hide the category label
      channels: [
        { id: "1", name: "general", slug: "general", type: "public", order: 1 },
        {
          id: "2",
          name: "announcements",
          slug: "announcements",
          type: "public",
          order: 2,
        },
        { id: "3", name: "random", slug: "random", type: "public", order: 3 },
        {
          id: "4",
          name: "introductions",
          slug: "introductions",
          type: "public",
          order: 4,
        },
      ],
    },
    {
      id: "cat-projects",
      name: "Projects",
      order: 2,
      parentChannelId: "5", // Points to #projects channel
      hideParentChannel: true, // Hide the #projects channel and use category as root
      channels: [
        {
          id: "5",
          name: "projects",
          slug: "projects",
          type: "private",
          order: 1,
        },
        {
          id: "6",
          name: "projects-alpha",
          slug: "projects-alpha",
          type: "private",
          order: 2,
        },
        {
          id: "7",
          name: "projects-beta",
          slug: "projects-beta",
          type: "private",
          order: 3,
        },
        {
          id: "8",
          name: "projects-gamma",
          slug: "projects-gamma",
          type: "private",
          order: 4,
        },
        {
          id: "9",
          name: "projects-gamma-dev",
          slug: "projects-gamma-dev",
          type: "private",
          order: 5,
        },
        {
          id: "10",
          name: "projects-gamma-design",
          slug: "projects-gamma-design",
          type: "private",
          order: 6,
        },
      ],
    },
    {
      id: "cat-teams",
      name: "Teams",
      order: 3,
      channels: [
        {
          id: "11",
          name: "engineering",
          slug: "engineering",
          type: "private",
          order: 1,
        },
        { id: "12", name: "design", slug: "design", type: "private", order: 2 },
        {
          id: "13",
          name: "marketing",
          slug: "marketing",
          type: "private",
          order: 3,
        },
      ],
    },
  ]);

  const toggleCategory = (categoryId: string) => {
    const newCollapsed = new Set(collapsedCategories);
    if (newCollapsed.has(categoryId)) {
      newCollapsed.delete(categoryId);
    } else {
      newCollapsed.add(categoryId);
    }
    setCollapsedCategories(newCollapsed);
  };

  const toggleChannel = (channelId: string) => {
    const newCollapsed = new Set(collapsedChannels);
    if (newCollapsed.has(channelId)) {
      newCollapsed.delete(channelId);
    } else {
      newCollapsed.add(channelId);
    }
    setCollapsedChannels(newCollapsed);
  };

  // Auto-detect parent-child relationships based on naming
  const organizeChannelsByNaming = (channels: Channel[]): Channel[] => {
    // Clone channels to avoid mutation
    const organizedChannels = channels.map((c) => ({ ...c }));

    // Sort by name length and alphabetically to process parents before children
    const sortedChannels = [...organizedChannels].sort((a, b) => {
      // First sort by length (shorter names first, as they're likely parents)
      if (a.name.length !== b.name.length) {
        return a.name.length - b.name.length;
      }
      return a.name.localeCompare(b.name);
    });

    // Process each channel to find its best parent
    sortedChannels.forEach((channel) => {
      // Skip if already has a parent
      if (channel.parentId) return;

      // Find the best parent: the longest matching prefix
      let bestParent: Channel | null = null;
      let longestMatch = 0;

      organizedChannels.forEach((potentialParent) => {
        // Can't be its own parent and parent must not have a dash count equal or greater
        if (potentialParent.id === channel.id) return;

        // Check if this channel's name starts with the potential parent's name + dash
        if (channel.name.startsWith(potentialParent.name + "-")) {
          const matchLength = potentialParent.name.length;
          if (matchLength > longestMatch) {
            bestParent = potentialParent;
            longestMatch = matchLength;
          }
        }
      });

      // Set the parent if found
      if (bestParent !== null) {
        const channelToUpdate = organizedChannels.find(
          (c) => c.id === channel.id,
        );
        if (channelToUpdate) {
          channelToUpdate.parentId = (bestParent as Channel).id;
        }
      }
    });

    return organizedChannels;
  };

  const sortChannels = (channels: Channel[]) => {
    // Always apply organic organization to maintain parent-child relationships
    let processedChannels = organizeChannelsByNaming(channels);

    switch (sortOrder) {
      case "alphabetical":
        return [...processedChannels].sort((a, b) =>
          a.name.localeCompare(b.name),
        );
      case "recent":
        return [...processedChannels].sort((a, b) => {
          const aTime = a.lastActivity?.getTime() || 0;
          const bTime = b.lastActivity?.getTime() || 0;
          return bTime - aTime;
        });
      case "manual":
      default:
        return [...processedChannels].sort(
          (a, b) => (a.order || 0) - (b.order || 0),
        );
    }
  };

  const renderChannel = (
    channel: Channel,
    depth: number = 0,
    isLast: boolean = false,
    parentChannel?: Channel,
    allChannels?: Channel[],
    skipPrefix?: boolean,
  ) => {
    const isActive = pathname === `/chat/channel/${channel.slug}`;
    // Use passed channels or fallback to all channels
    const channelsToSearch =
      allChannels || categories.flatMap((cat) => cat.channels);
    const childChannels = channelsToSearch.filter(
      (c) => c.parentId === channel.id,
    );
    const hasChildren = childChannels.length > 0;
    const isCollapsed = collapsedChannels.has(channel.id);

    // Simplify display name if it starts with parent's name (unless skipPrefix is true)
    let displayName = channel.name;
    if (
      !skipPrefix &&
      parentChannel &&
      channel.name.startsWith(parentChannel.name + "-")
    ) {
      displayName = channel.name.substring(parentChannel.name.length + 1);
    }
    // If we're skipping the parent but showing children, strip the common prefix
    if (skipPrefix && channel.name.includes("-")) {
      const parts = channel.name.split("-");
      if (parts.length > 1) {
        displayName = parts.slice(1).join("-");
      }
    }

    return (
      <motion.div
        key={channel.id}
        variants={staggerItem}
        initial="initial"
        animate="animate"
        layout
      >
        <div className="group relative flex items-center">
          {/* Tree lines for nested channels */}
          {depth > 0 && (
            <>
              {/* Vertical line */}
              <div
                className="absolute border-l border-zinc-300 dark:border-zinc-600"
                style={{
                  left: `${depth * 20 + 3}px`,
                  top: 0,
                  bottom: isLast ? "50%" : 0,
                  height: isLast ? "50%" : "100%",
                }}
              />
              {/* Horizontal line */}
              <div
                className="absolute border-t border-zinc-300 dark:border-zinc-600"
                style={{
                  left: `${depth * 20 + 3}px`,
                  width: "8px",
                  top: "50%",
                }}
              />
            </>
          )}

          {isReordering &&
            (user?.role === "owner" || user?.role === "admin") && (
              <div
                className="cursor-move p-0.5"
                style={{ marginLeft: `${depth * 20}px` }}
                aria-label="Reorder channel"
              >
                <GripVertical className="h-3 w-3 text-zinc-400" />
              </div>
            )}

          <Link
            href={`/chat/channel/${channel.slug}`}
            className={cn(
              "flex flex-1 items-center rounded-md px-2 py-0.5 text-sm transition-colors",
              "text-zinc-700 dark:text-zinc-300",
              "hover:bg-zinc-100 dark:hover:bg-zinc-800",
              isActive &&
                "bg-zinc-200 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-white",
            )}
            style={{ marginLeft: depth > 0 ? `${depth * 20 + 10}px` : "10px" }}
          >
            {channel.name === "announcements" ? (
              <Megaphone className="mr-1.5 h-3 w-3 text-zinc-500 dark:text-zinc-400" />
            ) : channel.type === "private" ? (
              <Lock className="mr-1.5 h-3 w-3 text-zinc-500 dark:text-zinc-400" />
            ) : (
              <Hash className="mr-1.5 h-3 w-3 text-zinc-500 dark:text-zinc-400" />
            )}
            <span className="truncate">{displayName}</span>
            {channel.unreadCount && channel.unreadCount > 0 && (
              <span className="ml-auto mr-1 rounded-full bg-[#00D4FF] px-1.5 py-0.5 text-xs font-medium text-zinc-900">
                {channel.unreadCount}
              </span>
            )}
            {hasChildren && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  toggleChannel(channel.id);
                }}
                className="ml-auto rounded p-0.5 transition-colors hover:bg-zinc-300 dark:hover:bg-zinc-700"
                aria-label={isCollapsed ? "Expand channel" : "Collapse channel"}
              >
                {isCollapsed ? (
                  <ChevronRight className="h-3 w-3 text-zinc-500" />
                ) : (
                  <ChevronDown className="h-3 w-3 text-zinc-500" />
                )}
              </button>
            )}
          </Link>
          {(user?.role === "owner" || user?.role === "admin") && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded p-1 opacity-0 transition-all hover:bg-zinc-200 group-hover:opacity-100 dark:hover:bg-zinc-700">
                  <MoreVertical className="h-3.5 w-3.5 text-zinc-500" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem>Edit Channel</DropdownMenuItem>
                <DropdownMenuItem>Channel Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600">
                  Archive Channel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        {hasChildren && !isCollapsed && (
          <div className="relative">
            {sortChannels(childChannels).map((child, index, array) =>
              renderChannel(
                child,
                depth + 1,
                index === array.length - 1,
                channel,
                channelsToSearch,
              ),
            )}
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <motion.div
      className="flex h-full w-64 flex-col border-r bg-zinc-50 dark:bg-zinc-900/50"
      initial={{ x: -256 }}
      animate={{ x: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {/* App Header */}
      <motion.div
        className="flex h-16 items-center border-b border-zinc-200 px-4 dark:border-zinc-800"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <h1 className="bg-gradient-to-r from-[#00D4FF] to-[#0EA5E9] bg-clip-text text-xl font-bold text-transparent">
          nChat
        </h1>
      </motion.div>

      {/* Channels */}
      <ScrollArea className="flex-1 px-2 py-4">
        <div className="space-y-4">
          {/* Channels Header with Sort */}
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xs font-semibold uppercase text-zinc-900 dark:text-white">
              Channels
            </h2>
            <div className="flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="rounded p-1 transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    aria-label="Sort channels"
                  >
                    <ArrowUpDown className="h-3.5 w-3.5 text-zinc-500" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Sort Channels</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setSortOrder("manual")}>
                    Manual Order
                  </DropdownMenuItem>
                  {(user?.role === "owner" || user?.role === "admin") &&
                    sortOrder === "manual" && (
                      <DropdownMenuItem
                        onClick={() => setIsReordering(!isReordering)}
                      >
                        {isReordering ? "Done Reordering" : "Edit Order"}
                      </DropdownMenuItem>
                    )}
                  <DropdownMenuItem
                    onClick={() => setSortOrder("alphabetical")}
                  >
                    Alphabetical
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortOrder("recent")}>
                    Recent Activity
                  </DropdownMenuItem>
                  {(user?.role === "owner" || user?.role === "admin") && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() =>
                          setShowPublicChannelsAsCategory(
                            !showPublicChannelsAsCategory,
                          )
                        }
                      >
                        {showPublicChannelsAsCategory ? "Hide" : "Show"} Public
                        Channels Category
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              {(user?.role === "owner" || user?.role === "admin") && (
                <button
                  className="rounded p-1 transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  aria-label="Add new channel"
                >
                  <Plus className="h-3.5 w-3.5 text-zinc-500" />
                </button>
              )}
            </div>
          </div>

          {/* Show Category Button for Hidden Categories */}
          {categories.some((cat) => cat.hideCategory) &&
            (user?.role === "owner" || user?.role === "admin") && (
              <div className="mb-2 px-2 py-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="text-xs text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-400">
                      Show hidden categories...
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    {categories
                      .filter((cat) => cat.hideCategory)
                      .map((cat) => (
                        <DropdownMenuItem
                          key={cat.id}
                          onClick={() => {
                            const newCategories = [...categories];
                            const catIndex = newCategories.findIndex(
                              (c) => c.id === cat.id,
                            );
                            if (catIndex !== -1) {
                              newCategories[catIndex] = {
                                ...newCategories[catIndex],
                                hideCategory: false,
                              };
                              setCategories(newCategories);
                            }
                          }}
                        >
                          Show "{cat.name}"
                        </DropdownMenuItem>
                      ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

          {/* Public Channels without category (if enabled) */}
          {!showPublicChannelsAsCategory &&
            (() => {
              const publicCategory = categories.find(
                (cat) => cat.id === "cat-public",
              );
              if (!publicCategory) return null;

              const organizedChannels =
                sortOrder === "manual"
                  ? organizeChannelsByNaming(publicCategory.channels)
                  : publicCategory.channels;

              const topLevelChannels = sortChannels(
                organizedChannels.filter((c) => !c.parentId),
              );

              return topLevelChannels.length > 0 ? (
                <div className="mb-4 space-y-0.5">
                  {topLevelChannels.map((channel) =>
                    renderChannel(
                      channel,
                      0,
                      false,
                      undefined,
                      organizedChannels,
                    ),
                  )}
                </div>
              ) : null;
            })()}

          {/* Categories and Channels */}
          {categories
            .filter(
              (cat) => showPublicChannelsAsCategory || cat.id !== "cat-public",
            )
            .map((category) => {
              const isCollapsed = collapsedCategories.has(category.id);
              // First organize channels, then filter for top level
              const organizedChannels =
                sortOrder === "manual"
                  ? organizeChannelsByNaming(category.channels)
                  : category.channels;

              let topLevelChannels: Channel[] = [];
              let renderAsTree = false;

              // Check if category has a parent channel
              const parentChannel = category.parentChannelId
                ? organizedChannels.find(
                    (c) => c.id === category.parentChannelId,
                  )
                : null;

              if (parentChannel && !category.hideParentChannel) {
                // Show parent channel and its tree
                topLevelChannels = [parentChannel];
                renderAsTree = false;
              } else if (parentChannel && category.hideParentChannel) {
                // Hide parent but show its children as top-level
                const parentChildren = organizedChannels.filter(
                  (c) => c.parentId === parentChannel.id,
                );
                topLevelChannels = sortChannels(parentChildren);
                renderAsTree = true;
              } else {
                // No parent channel, show all top-level channels
                topLevelChannels = sortChannels(
                  organizedChannels.filter((c) => !c.parentId),
                );
                renderAsTree = true;
              }

              return (
                <div key={category.id} className="space-y-1">
                  {/* Category Header */}
                  {!category.hideCategory && (
                    <div className="group relative flex items-center justify-between px-2 py-1">
                      <button
                        onClick={() => toggleCategory(category.id)}
                        className="flex items-center"
                      >
                        {isCollapsed ? (
                          <ChevronRight className="mr-1 h-3 w-3 text-zinc-400" />
                        ) : (
                          <ChevronDown className="mr-1 h-3 w-3 text-zinc-400" />
                        )}
                        <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-500">
                          {category.name}
                        </span>
                      </button>
                      {(user?.role === "owner" || user?.role === "admin") && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="rounded p-0.5 opacity-0 transition-all hover:bg-zinc-200 group-hover:opacity-100 dark:hover:bg-zinc-700">
                              <MoreVertical className="h-3 w-3 text-zinc-500" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={() => {
                                // Toggle hide/show category
                                const newCategories = [...categories];
                                const catIndex = newCategories.findIndex(
                                  (c) => c.id === category.id,
                                );
                                if (catIndex !== -1) {
                                  newCategories[catIndex] = {
                                    ...newCategories[catIndex],
                                    hideCategory: true,
                                  };
                                  setCategories(newCategories);
                                }
                              }}
                            >
                              Hide Category Label
                            </DropdownMenuItem>
                            <DropdownMenuItem>Rename Category</DropdownMenuItem>
                            {!parentChannel ? (
                              <DropdownMenuItem>
                                Add Parent Channel
                              </DropdownMenuItem>
                            ) : (
                              <>
                                <DropdownMenuItem
                                  onClick={() => {
                                    // Toggle hide/show parent channel
                                    const newCategories = [...categories];
                                    const catIndex = newCategories.findIndex(
                                      (c) => c.id === category.id,
                                    );
                                    if (catIndex !== -1) {
                                      newCategories[catIndex] = {
                                        ...newCategories[catIndex],
                                        hideParentChannel:
                                          !category.hideParentChannel,
                                      };
                                      setCategories(newCategories);
                                    }
                                  }}
                                >
                                  {category.hideParentChannel ? "Show" : "Hide"}{" "}
                                  Parent Channel
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  Remove Parent Channel
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuItem>Add Channel</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600">
                              Delete Category
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  )}

                  {/* Category Channels */}
                  {(!category.hideCategory ? !isCollapsed : true) && (
                    <div
                      className={
                        renderAsTree && !category.hideCategory
                          ? "relative"
                          : "space-y-0.5"
                      }
                    >
                      {renderAsTree &&
                        !category.hideCategory &&
                        topLevelChannels.length > 0 && (
                          <>
                            {/* Vertical line from category to channels */}
                            <div
                              className="absolute border-l border-zinc-300 dark:border-zinc-600"
                              style={{
                                left: "13px",
                                top: "-6px",
                                height: `calc(${topLevelChannels.length * 28}px - 20px)`,
                              }}
                            />
                          </>
                        )}
                      {topLevelChannels.map((channel, index, array) => (
                        <div
                          key={channel.id}
                          className={
                            renderAsTree && !category.hideCategory
                              ? "relative"
                              : ""
                          }
                        >
                          {renderAsTree && !category.hideCategory && (
                            <>
                              {/* Vertical segment for non-last items */}
                              {index < array.length - 1 && (
                                <div
                                  className="absolute border-l border-zinc-300 dark:border-zinc-600"
                                  style={{
                                    left: "13px",
                                    top: "14px",
                                    height: "100%",
                                  }}
                                />
                              )}
                              {/* Horizontal line from tree to channel */}
                              <div
                                className="absolute border-t border-zinc-300 dark:border-zinc-600"
                                style={{
                                  left: "13px",
                                  width: "8px",
                                  top: "14px",
                                }}
                              />
                            </>
                          )}
                          <div
                            style={{
                              paddingLeft:
                                renderAsTree && !category.hideCategory
                                  ? "12px"
                                  : "0",
                            }}
                          >
                            {renderChannel(
                              channel,
                              0,
                              index === array.length - 1,
                              undefined,
                              organizedChannels,
                              renderAsTree && !category.hideCategory,
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        {/* Direct Messages */}
        <div className="mt-6 space-y-1">
          <div className="px-2 py-1">
            <h2 className="text-xs font-semibold uppercase text-zinc-900 dark:text-white">
              Direct Messages
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-zinc-600 dark:text-zinc-400"
          >
            <Plus className="mr-2 h-3.5 w-3.5" />
            Add teammates
          </Button>
        </div>
      </ScrollArea>

      {/* User Profile */}
      <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center space-x-3 rounded-lg p-2 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.avatarUrl} />
                <AvatarFallback>
                  {user?.displayName?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden text-left">
                <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">
                  {user?.displayName}
                </p>
                <p className="truncate text-xs text-zinc-600 dark:text-zinc-400">
                  @{user?.username} ·{" "}
                  {user?.role === "owner" ? "Owner" : user?.role}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" alignOffset={-4}>
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings/profile" className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Profile Settings
              </Link>
            </DropdownMenuItem>
            {user?.role === "owner" && (
              <DropdownMenuItem asChild>
                <Link href="/settings/setup" className="cursor-pointer">
                  <Palette className="mr-2 h-4 w-4" />
                  Setup & Branding
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={async (e) => {
                e.preventDefault();
                try {
                  await signOut();
                } catch (error) {
                  logger.error("Sign out failed:", error);
                }
              }}
            >
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}
