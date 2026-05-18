/**
 * Social Integration Settings Component
 * Configure which channels receive social media posts and filtering rules
 */

"use client";

import { useState } from "react";
import { useSocialIntegrations } from "@/hooks/use-social-integrations";
import { useQuery, gql } from "@apollo/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Loader2, X } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

import { logger } from "@/lib/logger";

const GET_CHANNELS = gql`
  query GetChannels {
    nchat_channels(
      where: { type: { _eq: "channel" } }
      order_by: { name: asc }
    ) {
      id
      name
      slug
    }
  }
`;

interface Props {
  accountId: string;
  platform: string;
}

export function SocialIntegrationSettings({ accountId, platform }: Props) {
  const { user } = useAuth();
  const {
    integrations,
    loading,
    createIntegration,
    updateIntegration,
    deleteIntegration,
  } = useSocialIntegrations(accountId);
  const { data: channelsData } = useQuery(GET_CHANNELS);

  const [selectedChannel, setSelectedChannel] = useState("");
  const [autoPost, setAutoPost] = useState(true);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [excludeRetweets, setExcludeRetweets] = useState(false);
  const [excludeReplies, setExcludeReplies] = useState(false);
  const [minEngagement, setMinEngagement] = useState(0);
  const [newHashtag, setNewHashtag] = useState("");
  const [newKeyword, setNewKeyword] = useState("");
  const [creating, setCreating] = useState(false);

  const channels = channelsData?.nchat_channels || [];

  const handleCreate = async () => {
    if (!selectedChannel || !user?.id) return;

    setCreating(true);
    try {
      await createIntegration({
        accountId,
        channelId: selectedChannel,
        autoPost,
        filterHashtags: hashtags,
        filterKeywords: keywords,
        excludeRetweets,
        excludeReplies,
        minEngagement,
        createdBy: user.id,
      });

      // Reset form
      setSelectedChannel("");
      setHashtags([]);
      setKeywords([]);
      setExcludeRetweets(false);
      setExcludeReplies(false);
      setMinEngagement(0);
    } catch (error) {
      logger.error("Failed to create integration:", error);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this integration?")) return;
    await deleteIntegration(id);
  };

  const handleToggleAutoPost = async (id: string, currentValue: boolean) => {
    await updateIntegration(id, { autoPost: !currentValue });
  };

  const addHashtag = () => {
    if (newHashtag && !hashtags.includes(newHashtag)) {
      setHashtags([...hashtags, newHashtag]);
      setNewHashtag("");
    }
  };

  const addKeyword = () => {
    if (newKeyword && !keywords.includes(newKeyword)) {
      setKeywords([...keywords, newKeyword]);
      setNewKeyword("");
    }
  };

  return (
    <div className="space-y-6">
      {/* Create New Integration */}
      <Card>
        <CardHeader>
          <CardTitle>Create Integration</CardTitle>
          <CardDescription>
            Choose a channel and configure filtering rules
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Channel</Label>
            <Select value={selectedChannel} onValueChange={setSelectedChannel}>
              <SelectTrigger>
                <SelectValue placeholder="Select a channel" />
              </SelectTrigger>
              <SelectContent>
                {channels.map((channel: any) => (
                  <SelectItem key={channel.id} value={channel.id}>
                    #{channel.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label>Auto-post new content</Label>
            <Switch checked={autoPost} onCheckedChange={setAutoPost} />
          </div>

          {/* Hashtags */}
          <div>
            <Label>Filter by Hashtags (optional)</Label>
            <div className="mt-2 flex gap-2">
              <Input
                placeholder="Enter hashtag..."
                value={newHashtag}
                onChange={(e) => setNewHashtag(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addHashtag()}
              />
              <Button type="button" size="sm" onClick={addHashtag}>
                Add
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {hashtags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  #{tag}
                  <X
                    className="ml-1 h-3 w-3 cursor-pointer"
                    onClick={() =>
                      setHashtags(hashtags.filter((t) => t !== tag))
                    }
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* Keywords */}
          <div>
            <Label>Filter by Keywords (optional)</Label>
            <div className="mt-2 flex gap-2">
              <Input
                placeholder="Enter keyword..."
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addKeyword()}
              />
              <Button type="button" size="sm" onClick={addKeyword}>
                Add
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {keywords.map((keyword) => (
                <Badge key={keyword} variant="secondary">
                  {keyword}
                  <X
                    className="ml-1 h-3 w-3 cursor-pointer"
                    onClick={() =>
                      setKeywords(keywords.filter((k) => k !== keyword))
                    }
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* Twitter-specific options */}
          {platform === "twitter" && (
            <>
              <div className="flex items-center justify-between">
                <Label>Exclude retweets</Label>
                <Switch
                  checked={excludeRetweets}
                  onCheckedChange={setExcludeRetweets}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Exclude replies</Label>
                <Switch
                  checked={excludeReplies}
                  onCheckedChange={setExcludeReplies}
                />
              </div>
            </>
          )}

          <div>
            <Label>Minimum Engagement</Label>
            <Input
              type="number"
              min="0"
              value={minEngagement}
              onChange={(e) => setMinEngagement(Number(e.target.value))}
            />
          </div>

          <Button
            onClick={handleCreate}
            disabled={!selectedChannel || creating}
          >
            {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Plus className="mr-2 h-4 w-4" />
            Create Integration
          </Button>
        </CardContent>
      </Card>

      {/* Existing Integrations */}
      {integrations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Integrations ({integrations.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {integrations.map((integration: any) => (
                <div
                  key={integration.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex-1">
                    <h4 className="font-semibold">
                      #{integration.channel.name}
                    </h4>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {integration.filter_hashtags?.length > 0 && (
                        <Badge variant="outline">
                          Hashtags: {integration.filter_hashtags.join(", ")}
                        </Badge>
                      )}
                      {integration.filter_keywords?.length > 0 && (
                        <Badge variant="outline">
                          Keywords: {integration.filter_keywords.join(", ")}
                        </Badge>
                      )}
                      {integration.min_engagement > 0 && (
                        <Badge variant="outline">
                          Min: {integration.min_engagement}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={integration.auto_post}
                      onCheckedChange={() =>
                        handleToggleAutoPost(
                          integration.id,
                          integration.auto_post,
                        )
                      }
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(integration.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
