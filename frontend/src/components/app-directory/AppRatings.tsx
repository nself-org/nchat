"use client";

import * as React from "react";
import { useState } from "react";
import { Star, ThumbsUp, Flag, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getRatingsForApp,
  getRatingPercentage,
  sortRatings,
  formatRatingCount,
  getRatingQuality,
  type AppRating,
} from "@/lib/app-directory/app-ratings";
import type {
  AppStats,
  RatingDistribution,
} from "@/lib/app-directory/app-types";

interface AppRatingsProps {
  appId: string;
  stats: AppStats;
  className?: string;
}

export function AppRatings({ appId, stats, className }: AppRatingsProps) {
  const [sortBy, setSortBy] = useState<
    "recent" | "helpful" | "rating_high" | "rating_low"
  >("helpful");
  const [filterStar, setFilterStar] = useState<number | null>(null);
  const [showWriteReview, setShowWriteReview] = useState(false);

  // Get ratings for this app
  const allRatings = getRatingsForApp(appId);
  const filteredRatings = filterStar
    ? allRatings.filter((r) => Math.round(r.rating) === filterStar)
    : allRatings;
  const sortedRatings = sortRatings(filteredRatings, sortBy);

  // Calculate distribution
  const distribution: RatingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  allRatings.forEach((r) => {
    const rounded = Math.round(r.rating) as 1 | 2 | 3 | 4 | 5;
    if (rounded >= 1 && rounded <= 5) {
      distribution[rounded]++;
    }
  });

  const quality = getRatingQuality(stats.rating);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Rating Summary */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Overall Rating */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-5xl font-bold">
                  {stats.rating.toFixed(1)}
                </div>
                <StarRating rating={stats.rating} size="lg" />
                <p className={cn("mt-1 text-sm", quality.color)}>
                  {quality.label}
                </p>
              </div>
              <div className="flex-1">
                <p className="mb-2 text-sm text-muted-foreground">
                  {formatRatingCount(stats.ratingCount)}
                </p>
                {/* Rating Distribution Bars */}
                <div className="space-y-1">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const percentage = getRatingPercentage(
                      distribution,
                      star as 1 | 2 | 3 | 4 | 5,
                    );
                    const count = distribution[star as 1 | 2 | 3 | 4 | 5];
                    return (
                      <button
                        key={star}
                        className="group flex w-full items-center gap-2"
                        onClick={() =>
                          setFilterStar(filterStar === star ? null : star)
                        }
                      >
                        <span className="w-6 text-xs">{star}</span>
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <Progress
                          value={percentage}
                          className={cn(
                            "h-2 flex-1",
                            filterStar === star && "ring-2 ring-primary",
                          )}
                        />
                        <span className="w-8 text-xs text-muted-foreground">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Write Review */}
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 font-semibold">Rate this app</h3>
            {showWriteReview ? (
              <WriteReviewForm
                onCancel={() => setShowWriteReview(false)}
                onSubmit={() => setShowWriteReview(false)}
              />
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Share your experience with this app to help others make a
                  decision.
                </p>
                <Button
                  onClick={() => setShowWriteReview(true)}
                  className="w-full"
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Write a Review
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reviews List */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">
            Reviews
            {filterStar && (
              <Button
                variant="link"
                size="sm"
                onClick={() => setFilterStar(null)}
                className="ml-2 text-muted-foreground"
              >
                (showing {filterStar} star - clear)
              </Button>
            )}
          </h3>
          <Select
            value={sortBy}
            onValueChange={(v) => setSortBy(v as typeof sortBy)}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="helpful">Most Helpful</SelectItem>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="rating_high">Highest Rated</SelectItem>
              <SelectItem value="rating_low">Lowest Rated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {sortedRatings.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <MessageSquare className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p>No reviews yet. Be the first to review this app!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sortedRatings.map((rating) => (
              <ReviewCard key={rating.id} rating={rating} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Star Rating Display
interface StarRatingProps {
  rating: number;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
}

export function StarRating({
  rating,
  size = "md",
  showValue = false,
}: StarRatingProps) {
  const sizeClasses = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= Math.floor(rating);
        const partial = !filled && star <= rating;
        return (
          <Star
            key={star}
            className={cn(
              sizeClasses[size],
              filled
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground",
              partial && "text-yellow-400",
            )}
          />
        );
      })}
      {showValue && (
        <span className="ml-1 text-sm text-muted-foreground">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}

// Interactive Star Rating Input
interface StarRatingInputProps {
  value: number;
  onChange: (value: number) => void;
}

function StarRatingInput({ value, onChange }: StarRatingInputProps) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className="p-1"
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(star)}
        >
          <Star
            className={cn(
              "h-8 w-8 transition-colors",
              (hover || value) >= star
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground",
            )}
          />
        </button>
      ))}
    </div>
  );
}

// Write Review Form
interface WriteReviewFormProps {
  onCancel: () => void;
  onSubmit: () => void;
}

function WriteReviewForm({ onCancel, onSubmit }: WriteReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would submit to the server
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <span className="mb-2 block text-sm font-medium">Your Rating</span>
        <StarRatingInput value={rating} onChange={setRating} />
      </div>
      <div>
        <label
          htmlFor="review-textarea"
          className="mb-2 block text-sm font-medium"
        >
          Your Review (optional)
        </label>
        <Textarea
          id="review-textarea"
          value={review}
          onChange={(e) => setReview(e.target.value)}
          placeholder="Tell others what you think about this app..."
          rows={4}
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={rating === 0}>
          Submit Review
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

// Single Review Card
interface ReviewCardProps {
  rating: AppRating;
}

function ReviewCard({ rating }: ReviewCardProps) {
  const [helpfulClicked, setHelpfulClicked] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={rating.userAvatar} />
            <AvatarFallback>{rating.userName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center justify-between gap-2">
              <div>
                <span className="font-medium">{rating.userName}</span>
                <span className="ml-2 text-sm text-muted-foreground">
                  {formatDate(rating.createdAt)}
                </span>
              </div>
              <StarRating rating={rating.rating} size="sm" />
            </div>

            {rating.review && (
              <p className="mb-3 text-sm text-muted-foreground">
                {rating.review}
              </p>
            )}

            {/* Developer Response */}
            {rating.developerResponse && (
              <div className="bg-muted/50 mb-3 rounded-lg p-3">
                <p className="mb-1 text-xs font-medium">Developer Response</p>
                <p className="text-sm text-muted-foreground">
                  {rating.developerResponse.response}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDate(rating.developerResponse.respondedAt)}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                className={cn("h-8 gap-1", helpfulClicked && "text-primary")}
                onClick={() => setHelpfulClicked(!helpfulClicked)}
              >
                <ThumbsUp className="h-3 w-3" />
                Helpful ({rating.helpful + (helpfulClicked ? 1 : 0)})
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 text-muted-foreground"
              >
                <Flag className="h-3 w-3" />
                Report
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
