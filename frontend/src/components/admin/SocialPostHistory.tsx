/**
 * Social Post History Component
 * Shows imported social media posts and their status
 */

"use client";

import { useQuery, gql } from "@apollo/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { SocialPost } from "@/lib/social/types";

const GET_SOCIAL_POSTS = gql`
  query GetSocialPosts($accountId: uuid, $limit: Int = 50) {
    nchat_social_posts(
      where: { account_id: { _eq: $accountId } }
      order_by: { imported_at: desc }
      limit: $limit
    ) {
      id
      post_id
      post_url
      content
      author_name
      author_handle
      author_avatar_url
      media_urls
      hashtags
      engagement
      posted_at
      imported_at
      was_posted_to_channel
      posted_to_channels
      import_error
      account {
        platform
        account_name
      }
    }
  }
`;

interface Props {
  accountId?: string;
}

export function SocialPostHistory({ accountId }: Props) {
  const { data, loading, error } = useQuery(GET_SOCIAL_POSTS, {
    variables: accountId ? { accountId } : {},
    fetchPolicy: "cache-and-network",
  });

  const posts: SocialPost[] = data?.nchat_social_posts || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-center text-destructive">
            Failed to load post history
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Post History ({posts.length})</CardTitle>
        <CardDescription>Recently imported social media posts</CardDescription>
      </CardHeader>
      <CardContent>
        {posts.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">No posts imported yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post: any) => {
              const engagement = post.engagement || {};
              const totalEngagement =
                (engagement.likes || 0) +
                (engagement.retweets || 0) +
                (engagement.shares || 0) +
                (engagement.comments || 0);

              return (
                <div key={post.id} className="space-y-3 rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        {post.author_avatar_url && (
                          <img
                            src={post.author_avatar_url}
                            alt={post.author_name}
                            className="h-8 w-8 rounded-full"
                          />
                        )}
                        <div>
                          <p className="text-sm font-semibold">
                            {post.author_name}
                          </p>
                          {post.author_handle && (
                            <p className="text-xs text-muted-foreground">
                              @{post.author_handle}
                            </p>
                          )}
                        </div>
                      </div>

                      <p className="line-clamp-3 text-sm">{post.content}</p>

                      {post.hashtags && post.hashtags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {post.hashtags.slice(0, 5).map((tag: string) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="text-xs"
                            >
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {post.media_urls && post.media_urls.length > 0 && (
                        <div className="mt-2 flex gap-2">
                          {post.media_urls
                            .slice(0, 4)
                            .map((url: string, idx: number) => (
                              <img
                                key={idx}
                                src={url}
                                alt=""
                                className="h-16 w-16 rounded object-cover"
                              />
                            ))}
                        </div>
                      )}
                    </div>

                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={post.post_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <span>
                        Posted{" "}
                        {formatDistanceToNow(new Date(post.posted_at), {
                          addSuffix: true,
                        })}
                      </span>
                      {totalEngagement > 0 && (
                        <span>{totalEngagement} interactions</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {post.was_posted_to_channel ? (
                        <Badge variant="default" className="text-xs">
                          Posted to {post.posted_to_channels?.length || 0}{" "}
                          channel(s)
                        </Badge>
                      ) : post.import_error ? (
                        <Badge variant="destructive" className="text-xs">
                          Error
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Filtered
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
