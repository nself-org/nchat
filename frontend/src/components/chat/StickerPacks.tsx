"use client";

/**
 * Sticker Packs Browser Component
 *
 * Browse and manage installed sticker packs.
 * Allows users to install/uninstall packs and preview stickers.
 */

import { useState, useCallback, useMemo } from "react";
import {
  Search,
  Loader2,
  Package,
  Plus,
  Check,
  Download,
  Trash2,
  ExternalLink,
  Star,
  Users,
  Grid3X3,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { StickerPack, Sticker, StickerPackBasic } from "@/types/sticker";

// ============================================================================
// Types
// ============================================================================

interface StickerPacksProps {
  /** Currently installed packs */
  installedPacks: StickerPack[];
  /** Available packs from the store */
  availablePacks?: StickerPack[];
  /** Whether the component is loading */
  isLoading?: boolean;
  /** Callback when a pack is installed */
  onInstallPack?: (packId: string) => Promise<void>;
  /** Callback when a pack is uninstalled */
  onUninstallPack?: (packId: string) => Promise<void>;
  /** Callback when a sticker is selected */
  onSelectSticker?: (sticker: Sticker) => void;
  /** Custom class name */
  className?: string;
}

interface PackPreviewDialogProps {
  pack: StickerPack | null;
  isOpen: boolean;
  onClose: () => void;
  isInstalled: boolean;
  isInstalling: boolean;
  onInstall: () => void;
  onUninstall: () => void;
  onSelectSticker?: (sticker: Sticker) => void;
}

// ============================================================================
// Pack Preview Dialog
// ============================================================================

function PackPreviewDialog({
  pack,
  isOpen,
  onClose,
  isInstalled,
  isInstalling,
  onInstall,
  onUninstall,
  onSelectSticker,
}: PackPreviewDialogProps) {
  if (!pack) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col overflow-hidden">
        <DialogHeader>
          <div className="flex items-start gap-4">
            {pack.thumbnailUrl && (
              <Avatar className="h-16 w-16 rounded-lg">
                <AvatarImage src={pack.thumbnailUrl} alt={pack.name} />
                <AvatarFallback className="rounded-lg">
                  <Package className="h-8 w-8" />
                </AvatarFallback>
              </Avatar>
            )}
            <div className="min-w-0 flex-1">
              <DialogTitle className="flex items-center gap-2">
                {pack.title || pack.name}
                {pack.isVerified && (
                  <Badge variant="secondary" className="text-xs">
                    <Check className="mr-1 h-3 w-3" />
                    Verified
                  </Badge>
                )}
                {pack.isOfficial && (
                  <Badge variant="default" className="text-xs">
                    Official
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {pack.description || `${pack.stickerCount} stickers`}
              </DialogDescription>

              {/* Stats */}
              <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Grid3X3 className="h-3 w-3" />
                  {pack.stickerCount} stickers
                </span>
                <span className="flex items-center gap-1">
                  <Download className="h-3 w-3" />
                  {pack.installCount?.toLocaleString() || 0} installs
                </span>
                {pack.creator && (
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    by {pack.creator.displayName || pack.creator.username}
                  </span>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Sticker Grid */}
        <ScrollArea className="mt-4 flex-1">
          <div className="grid grid-cols-4 gap-2 p-1 sm:grid-cols-5 md:grid-cols-6">
            {pack.stickers.map((sticker) => (
              <motion.button
                key={sticker.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => onSelectSticker?.(sticker)}
                className={cn(
                  "bg-muted/30 aspect-square rounded-lg border p-2 transition-all",
                  "hover:scale-105 hover:border-primary hover:shadow-md",
                  "focus:ring-primary/50 focus:outline-none focus:ring-2",
                )}
              >
                <img
                  src={sticker.thumbnailUrl || sticker.url}
                  alt={sticker.name}
                  className="h-full w-full object-contain"
                  loading="lazy"
                />
              </motion.button>
            ))}
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <Separator className="mt-4" />
        <div className="flex items-center justify-between pt-4">
          <div className="flex items-center gap-2">
            {pack.tags && pack.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {pack.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {pack.websiteUrl && (
              <Button variant="ghost" size="sm" asChild>
                <a
                  href={pack.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-1 h-4 w-4" />
                  Website
                </a>
              </Button>
            )}
            {isInstalled ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={onUninstall}
                disabled={isInstalling}
              >
                {isInstalling ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="mr-1 h-4 w-4" />
                    Uninstall
                  </>
                )}
              </Button>
            ) : (
              <Button size="sm" onClick={onInstall} disabled={isInstalling}>
                {isInstalling ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Download className="mr-1 h-4 w-4" />
                    Install
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Pack Card Component
// ============================================================================

interface PackCardProps {
  pack: StickerPack;
  isInstalled: boolean;
  isInstalling: boolean;
  onPreview: () => void;
  onInstall: () => void;
  onUninstall: () => void;
}

function PackCard({
  pack,
  isInstalled,
  isInstalling,
  onPreview,
  onInstall,
  onUninstall,
}: PackCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          {pack.thumbnailUrl ? (
            <Avatar className="h-12 w-12 rounded-lg">
              <AvatarImage src={pack.thumbnailUrl} alt={pack.name} />
              <AvatarFallback className="rounded-lg">
                <Package className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
              <Package className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <CardTitle className="flex items-center gap-1 text-sm">
              <span className="truncate">{pack.title || pack.name}</span>
              {pack.isVerified && (
                <Check className="h-4 w-4 flex-shrink-0 text-primary" />
              )}
            </CardTitle>
            <CardDescription className="truncate text-xs">
              {pack.stickerCount} stickers
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-2">
        {/* Sticker Preview Grid */}
        <div className="grid grid-cols-4 gap-1">
          {pack.stickers.slice(0, 4).map((sticker) => (
            <div
              key={sticker.id}
              className="bg-muted/50 aspect-square rounded p-1"
            >
              <img
                src={sticker.thumbnailUrl || sticker.url}
                alt={sticker.name}
                className="h-full w-full object-contain"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </CardContent>

      <CardFooter className="pt-2">
        <div className="flex w-full items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={onPreview}
          >
            Preview
          </Button>
          {isInstalled ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onUninstall}
              disabled={isInstalling}
              className="text-destructive hover:text-destructive"
            >
              {isInstalling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          ) : (
            <Button size="sm" onClick={onInstall} disabled={isInstalling}>
              {isInstalling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function StickerPacks({
  installedPacks,
  availablePacks = [],
  isLoading = false,
  onInstallPack,
  onUninstallPack,
  onSelectSticker,
  className,
}: StickerPacksProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"installed" | "browse">(
    "installed",
  );
  const [previewPack, setPreviewPack] = useState<StickerPack | null>(null);
  const [installingPackId, setInstallingPackId] = useState<string | null>(null);

  // Get installed pack IDs for quick lookup
  const installedPackIds = useMemo(
    () => new Set(installedPacks.map((p) => p.id)),
    [installedPacks],
  );

  // Filter packs by search query
  const filteredInstalledPacks = useMemo(() => {
    if (!searchQuery) return installedPacks;
    const query = searchQuery.toLowerCase();
    return installedPacks.filter(
      (pack) =>
        pack.name.toLowerCase().includes(query) ||
        pack.title?.toLowerCase().includes(query) ||
        pack.description?.toLowerCase().includes(query) ||
        pack.tags?.some((tag) => tag.toLowerCase().includes(query)),
    );
  }, [installedPacks, searchQuery]);

  const filteredAvailablePacks = useMemo(() => {
    const nonInstalled = availablePacks.filter(
      (p) => !installedPackIds.has(p.id),
    );
    if (!searchQuery) return nonInstalled;
    const query = searchQuery.toLowerCase();
    return nonInstalled.filter(
      (pack) =>
        pack.name.toLowerCase().includes(query) ||
        pack.title?.toLowerCase().includes(query) ||
        pack.description?.toLowerCase().includes(query) ||
        pack.tags?.some((tag) => tag.toLowerCase().includes(query)),
    );
  }, [availablePacks, installedPackIds, searchQuery]);

  // Handle pack installation
  const handleInstall = useCallback(
    async (packId: string) => {
      if (!onInstallPack) return;
      setInstallingPackId(packId);
      try {
        await onInstallPack(packId);
      } finally {
        setInstallingPackId(null);
      }
    },
    [onInstallPack],
  );

  // Handle pack uninstallation
  const handleUninstall = useCallback(
    async (packId: string) => {
      if (!onUninstallPack) return;
      setInstallingPackId(packId);
      try {
        await onUninstallPack(packId);
        if (previewPack?.id === packId) {
          setPreviewPack(null);
        }
      } finally {
        setInstallingPackId(null);
      }
    },
    [onUninstallPack, previewPack],
  );

  if (isLoading) {
    return (
      <div
        className={cn("flex h-[400px] items-center justify-center", className)}
      >
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn("flex h-[500px] flex-col bg-background", className)}>
      {/* Header */}
      <div className="border-b p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search sticker packs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "installed" | "browse")}
        className="flex flex-1 flex-col"
      >
        <TabsList className="w-full justify-start rounded-none border-b px-4">
          <TabsTrigger value="installed" className="flex items-center gap-1">
            <Star className="h-4 w-4" />
            Installed
            <Badge variant="secondary" className="ml-1 text-xs">
              {installedPacks.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="browse" className="flex items-center gap-1">
            <Package className="h-4 w-4" />
            Browse
            {availablePacks.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {filteredAvailablePacks.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Installed Packs */}
        <TabsContent
          value="installed"
          className="m-0 flex-1 data-[state=active]:flex data-[state=active]:flex-col"
        >
          <ScrollArea className="flex-1">
            {filteredInstalledPacks.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <Package className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-1 text-lg font-semibold">No Sticker Packs</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  {searchQuery
                    ? "No packs match your search"
                    : "You haven't installed any sticker packs yet"}
                </p>
                {!searchQuery && availablePacks.length > 0 && (
                  <Button onClick={() => setActiveTab("browse")}>
                    Browse Packs
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
                <AnimatePresence mode="popLayout">
                  {filteredInstalledPacks.map((pack) => (
                    <motion.div
                      key={pack.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                    >
                      <PackCard
                        pack={pack}
                        isInstalled={true}
                        isInstalling={installingPackId === pack.id}
                        onPreview={() => setPreviewPack(pack)}
                        onInstall={() => {}}
                        onUninstall={() => handleUninstall(pack.id)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        {/* Browse Packs */}
        <TabsContent
          value="browse"
          className="m-0 flex-1 data-[state=active]:flex data-[state=active]:flex-col"
        >
          <ScrollArea className="flex-1">
            {filteredAvailablePacks.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <Package className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-1 text-lg font-semibold">
                  {searchQuery ? "No Results" : "No Available Packs"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {searchQuery
                    ? "Try a different search term"
                    : "Check back later for new sticker packs"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
                <AnimatePresence mode="popLayout">
                  {filteredAvailablePacks.map((pack) => (
                    <motion.div
                      key={pack.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                    >
                      <PackCard
                        pack={pack}
                        isInstalled={false}
                        isInstalling={installingPackId === pack.id}
                        onPreview={() => setPreviewPack(pack)}
                        onInstall={() => handleInstall(pack.id)}
                        onUninstall={() => {}}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Pack Preview Dialog */}
      <PackPreviewDialog
        pack={previewPack}
        isOpen={!!previewPack}
        onClose={() => setPreviewPack(null)}
        isInstalled={previewPack ? installedPackIds.has(previewPack.id) : false}
        isInstalling={installingPackId === previewPack?.id}
        onInstall={() => previewPack && handleInstall(previewPack.id)}
        onUninstall={() => previewPack && handleUninstall(previewPack.id)}
        onSelectSticker={onSelectSticker}
      />
    </div>
  );
}

export default StickerPacks;
