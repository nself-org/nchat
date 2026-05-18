"use client";

import { useState } from "react";
import { Plus, Edit, Trash2, Loader2, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useStickerPacks } from "@/hooks/use-stickers";
import { useStickerPacksManagement } from "@/hooks/use-sticker-packs";
import type { StickerPack } from "@/hooks/use-stickers";

/**
 * Sticker Pack Manager (Admin/Owner Only)
 * Create, edit, and manage sticker packs
 */
export function StickerPackManager() {
  const { toast } = useToast();
  const { packs, isLoading, refetch } = useStickerPacks();
  const {
    createPack,
    updatePack,
    deletePack,
    isLoading: isMutating,
    canManage,
  } = useStickerPacksManagement();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPack, setEditingPack] = useState<StickerPack | null>(null);

  const handleCreatePack = async (input: {
    name: string;
    slug: string;
    description?: string;
  }) => {
    try {
      await createPack(input);
      toast({
        title: "Success",
        description: "Sticker pack created successfully",
      });
      setIsCreateDialogOpen(false);
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to create pack",
        variant: "destructive",
      });
    }
  };

  const handleUpdatePack = async (
    id: string,
    input: Partial<{ name: string; description: string; is_enabled: boolean }>,
  ) => {
    try {
      await updatePack(id, input);
      toast({
        title: "Success",
        description: "Sticker pack updated successfully",
      });
      setEditingPack(null);
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to update pack",
        variant: "destructive",
      });
    }
  };

  const handleDeletePack = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }

    try {
      await deletePack(id);
      toast({
        title: "Success",
        description: "Sticker pack deleted successfully",
      });
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to delete pack",
        variant: "destructive",
      });
    }
  };

  if (!canManage) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>
            You don't have permission to manage sticker packs
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Sticker Packs</h2>
          <p className="text-sm text-muted-foreground">
            Manage custom sticker packs for your team
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Pack
            </Button>
          </DialogTrigger>
          <DialogContent>
            <CreatePackForm
              onSubmit={handleCreatePack}
              onCancel={() => setIsCreateDialogOpen(false)}
              isLoading={isMutating}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {packs.map((pack) => (
          <Card key={pack.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    {pack.name}
                    {pack.is_default && (
                      <Badge variant="secondary" className="text-xs">
                        Default
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>{pack.description}</CardDescription>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingPack(pack)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  {!pack.is_default && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePack(pack.id, pack.name)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {pack.stickers.length} stickers
                </span>
                <Button variant="outline" size="sm" asChild>
                  <a href={`/admin/stickers/${pack.id}`}>
                    <ImagePlus className="mr-2 h-4 w-4" />
                    Manage Stickers
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Pack Dialog */}
      <Dialog
        open={!!editingPack}
        onOpenChange={(open) => !open && setEditingPack(null)}
      >
        <DialogContent>
          {editingPack && (
            <EditPackForm
              pack={editingPack}
              onSubmit={(input) => handleUpdatePack(editingPack.id, input)}
              onCancel={() => setEditingPack(null)}
              isLoading={isMutating}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Create Pack Form
 */
function CreatePackForm({
  onSubmit,
  onCancel,
  isLoading,
}: {
  onSubmit: (input: {
    name: string;
    slug: string;
    description?: string;
  }) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, slug, description: description || undefined });
  };

  // Auto-generate slug from name
  const handleNameChange = (value: string) => {
    setName(value);
    if (!slug || slug === name.toLowerCase().replace(/\s+/g, "-")) {
      setSlug(value.toLowerCase().replace(/\s+/g, "-"));
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>Create Sticker Pack</DialogTitle>
        <DialogDescription>
          Create a new sticker pack for your team
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="name">Pack Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Reactions"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug">Slug (URL-friendly)</Label>
          <Input
            id="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="reactions"
            pattern="[a-z0-9-]+"
            required
          />
          <p className="text-xs text-muted-foreground">
            Only lowercase letters, numbers, and hyphens
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Essential reaction stickers"
            rows={3}
          />
        </div>
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || !name || !slug}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Pack"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

/**
 * Edit Pack Form
 */
function EditPackForm({
  pack,
  onSubmit,
  onCancel,
  isLoading,
}: {
  pack: StickerPack;
  onSubmit: (input: Partial<{ name: string; description: string }>) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [name, setName] = useState(pack.name);
  const [description, setDescription] = useState(pack.description || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, description: description || undefined });
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>Edit Sticker Pack</DialogTitle>
        <DialogDescription>Update pack details</DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="edit-name">Pack Name</Label>
          <Input
            id="edit-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-description">Description</Label>
          <Textarea
            id="edit-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || !name}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}
