"use client";

import { useState } from "react";
import {
  Bot,
  CheckCircle,
  Star,
  Download,
  Globe,
  HelpCircle,
  FileText,
  Shield,
  Terminal,
  ArrowLeft,
  ExternalLink,
  Calendar,
  User,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BotPermissionsCompact } from "./bot-permissions";
import { cn } from "@/lib/utils";
import type { Bot as BotType, BotCommand, BotReview } from "@/graphql/bots";

// ============================================================================
// TYPES
// ============================================================================

export interface BotProfileProps {
  bot: BotType;
  commands?: BotCommand[];
  reviews?: BotReview[];
  installed?: boolean;
  loading?: boolean;
  onInstall?: (bot: BotType) => void;
  onBack?: () => void;
  onLoadMoreReviews?: () => void;
  className?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatInstallCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getStarRating(rating: number): number[] {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    if (i <= Math.floor(rating)) {
      stars.push(1); // full star
    } else if (i === Math.ceil(rating) && rating % 1 !== 0) {
      stars.push(0.5); // half star
    } else {
      stars.push(0); // empty star
    }
  }
  return stars;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function BotProfile({
  bot,
  commands = [],
  reviews = [],
  installed = false,
  loading = false,
  onInstall,
  onBack,
  onLoadMoreReviews,
  className,
}: BotProfileProps) {
  const [activeTab, setActiveTab] = useState("overview");

  const ratingDistribution = calculateRatingDistribution(reviews);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-start gap-4">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="mt-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}

        <Avatar className="h-20 w-20">
          <AvatarImage src={bot.avatarUrl} alt={bot.name} />
          <AvatarFallback className="bg-primary/10 text-2xl">
            <Bot className="h-10 w-10 text-primary" />
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">{bot.name}</h1>
            {bot.verified && (
              <CheckCircle className="h-5 w-5 flex-shrink-0 text-primary" />
            )}
            {bot.featured && (
              <Badge className="border-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                Featured
              </Badge>
            )}
          </div>

          <p className="mt-1 text-muted-foreground">{bot.description}</p>

          <div className="mt-3 flex flex-wrap items-center gap-4">
            {bot.rating !== undefined && (
              <div className="flex items-center gap-1">
                <div className="flex">
                  {getStarRating(bot.rating).map((star, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "h-4 w-4",
                        star === 1
                          ? "fill-amber-400 text-amber-400"
                          : star === 0.5
                            ? "fill-amber-400/50 text-amber-400"
                            : "text-muted-foreground/30",
                      )}
                    />
                  ))}
                </div>
                <span className="text-sm font-medium">
                  {bot.rating.toFixed(1)}
                </span>
                {bot.reviewsCount !== undefined && (
                  <span className="text-sm text-muted-foreground">
                    ({bot.reviewsCount} reviews)
                  </span>
                )}
              </div>
            )}

            {bot.installCount !== undefined && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Download className="h-4 w-4" />
                <span>{formatInstallCount(bot.installCount)} installs</span>
              </div>
            )}

            {bot.category && <Badge variant="secondary">{bot.category}</Badge>}
          </div>
        </div>

        <Button
          size="lg"
          onClick={() => onInstall?.(bot)}
          disabled={installed || loading}
        >
          {installed ? "Installed" : "Install"}
        </Button>
      </div>

      <Separator />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="commands">
            Commands {commands.length > 0 && `(${commands.length})`}
          </TabsTrigger>
          <TabsTrigger value="reviews">
            Reviews {reviews.length > 0 && `(${reviews.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          {/* Info Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {bot.website && (
              <InfoCard
                icon={Globe}
                title="Website"
                content={
                  <a
                    href={bot.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    {new URL(bot.website).hostname}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                }
              />
            )}
            {bot.supportUrl && (
              <InfoCard
                icon={HelpCircle}
                title="Support"
                content={
                  <a
                    href={bot.supportUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    Get help
                    <ExternalLink className="h-3 w-3" />
                  </a>
                }
              />
            )}
            {bot.privacyPolicyUrl && (
              <InfoCard
                icon={FileText}
                title="Privacy Policy"
                content={
                  <a
                    href={bot.privacyPolicyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    View policy
                    <ExternalLink className="h-3 w-3" />
                  </a>
                }
              />
            )}
            {bot.owner && (
              <InfoCard
                icon={User}
                title="Developer"
                content={bot.owner.displayName}
              />
            )}
            <InfoCard
              icon={Calendar}
              title="Added"
              content={formatDate(bot.createdAt)}
            />
            <InfoCard
              icon={Calendar}
              title="Updated"
              content={formatDate(bot.updatedAt)}
            />
          </div>

          {/* Permissions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Required Permissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BotPermissionsCompact permissions={bot.permissions} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commands" className="mt-6">
          {commands.length === 0 ? (
            <div className="rounded-lg border border-dashed py-12 text-center">
              <Terminal className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
              <p className="font-medium">No commands available</p>
              <p className="text-sm text-muted-foreground">
                This bot doesn&apos;t have any slash commands
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {commands.map((command) => (
                <Card key={command.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <code className="font-mono text-lg font-semibold text-primary">
                          {command.name}
                        </code>
                        <p className="mt-1 text-muted-foreground">
                          {command.description}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3">
                      <p className="mb-1 text-sm font-medium">Usage</p>
                      <code className="rounded bg-muted px-2 py-1 text-sm">
                        {command.usage}
                      </code>
                    </div>

                    {command.examples && command.examples.length > 0 && (
                      <div className="mt-3">
                        <p className="mb-1 text-sm font-medium">Examples</p>
                        <div className="space-y-1">
                          {command.examples.map((example, i) => (
                            <code
                              key={i}
                              className="block rounded bg-muted px-2 py-1 text-sm"
                            >
                              {example}
                            </code>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reviews" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-[300px,1fr]">
            {/* Rating Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Rating Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-4xl font-bold">
                    {bot.rating?.toFixed(1) || "-"}
                  </div>
                  <div className="mt-1 flex justify-center">
                    {getStarRating(bot.rating || 0).map((star, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "h-5 w-5",
                          star === 1
                            ? "fill-amber-400 text-amber-400"
                            : star === 0.5
                              ? "fill-amber-400/50 text-amber-400"
                              : "text-muted-foreground/30",
                        )}
                      />
                    ))}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {bot.reviewsCount || 0} reviews
                  </p>
                </div>

                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((stars) => (
                    <div key={stars} className="flex items-center gap-2">
                      <span className="w-3 text-sm">{stars}</span>
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <Progress
                        value={ratingDistribution[stars] || 0}
                        className="h-2 flex-1"
                      />
                      <span className="w-8 text-sm text-muted-foreground">
                        {ratingDistribution[stars]?.toFixed(0) || 0}%
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Reviews List */}
            <div className="space-y-4">
              {reviews.length === 0 ? (
                <div className="rounded-lg border border-dashed py-12 text-center">
                  <Star className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
                  <p className="font-medium">No reviews yet</p>
                  <p className="text-sm text-muted-foreground">
                    Be the first to review this bot
                  </p>
                </div>
              ) : (
                <>
                  {reviews.map((review) => (
                    <Card key={review.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={review.user?.avatarUrl} />
                            <AvatarFallback>
                              {review.user?.displayName?.charAt(0) || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium">
                                {review.user?.displayName || "Anonymous"}
                              </p>
                              <span className="text-sm text-muted-foreground">
                                {formatDate(review.createdAt)}
                              </span>
                            </div>
                            <div className="mt-1 flex">
                              {getStarRating(review.rating).map((star, i) => (
                                <Star
                                  key={i}
                                  className={cn(
                                    "h-4 w-4",
                                    star >= 0.5
                                      ? "fill-amber-400 text-amber-400"
                                      : "text-muted-foreground/30",
                                  )}
                                />
                              ))}
                            </div>
                            {review.comment && (
                              <p className="mt-2 text-muted-foreground">
                                {review.comment}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {onLoadMoreReviews && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={onLoadMoreReviews}
                    >
                      Load More Reviews
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// INFO CARD COMPONENT
// ============================================================================

function InfoCard({
  icon: Icon,
  title,
  content,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  content: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
      <div className="rounded-lg bg-muted p-2">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <div className="font-medium">{content}</div>
      </div>
    </div>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateRatingDistribution(
  reviews: BotReview[],
): Record<number, number> {
  if (reviews.length === 0) return {};

  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const review of reviews) {
    const roundedRating = Math.round(review.rating);
    if (roundedRating >= 1 && roundedRating <= 5) {
      counts[roundedRating]++;
    }
  }

  const total = reviews.length;
  return {
    1: (counts[1] / total) * 100,
    2: (counts[2] / total) * 100,
    3: (counts[3] / total) * 100,
    4: (counts[4] / total) * 100,
    5: (counts[5] / total) * 100,
  };
}

// ============================================================================
// SKELETON
// ============================================================================

export function BotProfileSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex items-start gap-4">
        <div className="h-20 w-20 rounded-full bg-muted" />
        <div className="flex-1 space-y-3">
          <div className="h-8 w-48 rounded bg-muted" />
          <div className="h-4 w-96 rounded bg-muted" />
          <div className="flex gap-4">
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="h-4 w-24 rounded bg-muted" />
          </div>
        </div>
        <div className="h-10 w-24 rounded bg-muted" />
      </div>

      <div className="h-px bg-muted" />

      <div className="h-10 w-64 rounded bg-muted" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  );
}
