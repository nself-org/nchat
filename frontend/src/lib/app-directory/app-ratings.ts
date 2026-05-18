/**
 * App Ratings - Rating and review system for the nchat app marketplace
 *
 * Handles rating calculations, review management, and feedback utilities
 */

import type { AppRating, RatingDistribution, RatingSummary } from "./app-types";

// Re-export types for convenience
export type { AppRating, RatingDistribution, RatingSummary };

// ============================================================================
// Sample Ratings Data
// ============================================================================

export const SAMPLE_RATINGS: AppRating[] = [
  {
    id: "rating-1",
    appId: "polls",
    userId: "user-1",
    userName: "Sarah Chen",
    userAvatar: "/avatars/sarah.jpg",
    rating: 5,
    review:
      "Perfect for our daily standups! The anonymous voting feature is great for sensitive topics.",
    helpful: 23,
    reported: false,
    createdAt: "2024-01-10T14:30:00Z",
    updatedAt: "2024-01-10T14:30:00Z",
  },
  {
    id: "rating-2",
    appId: "polls",
    userId: "user-2",
    userName: "Mike Johnson",
    rating: 4,
    review:
      "Good app, but wish it had more customization options for poll styling.",
    helpful: 12,
    reported: false,
    developerResponse: {
      response:
        "Thanks for the feedback! Custom styling is on our roadmap for Q2.",
      respondedAt: "2024-01-11T09:00:00Z",
    },
    createdAt: "2024-01-09T10:15:00Z",
    updatedAt: "2024-01-11T09:00:00Z",
  },
  {
    id: "rating-3",
    appId: "github",
    userId: "user-3",
    userName: "Alex Dev",
    rating: 5,
    review:
      "Essential for any development team. PR notifications save us so much time.",
    helpful: 45,
    reported: false,
    createdAt: "2024-01-08T16:45:00Z",
    updatedAt: "2024-01-08T16:45:00Z",
  },
  {
    id: "rating-4",
    appId: "reminders",
    userId: "user-4",
    userName: "Emily Park",
    rating: 5,
    review:
      'The natural language parsing is amazing. Just type "remind me tomorrow at 9am" and it works!',
    helpful: 34,
    reported: false,
    createdAt: "2024-01-07T11:20:00Z",
    updatedAt: "2024-01-07T11:20:00Z",
  },
  {
    id: "rating-5",
    appId: "jira",
    userId: "user-5",
    userName: "David Kim",
    rating: 4,
    review:
      "Great integration. Would love to see more filtering options for notifications.",
    helpful: 18,
    reported: false,
    createdAt: "2024-01-06T09:30:00Z",
    updatedAt: "2024-01-06T09:30:00Z",
  },
];

// ============================================================================
// Rating Calculations
// ============================================================================

/**
 * Calculate rating distribution from a list of ratings
 */
export function calculateRatingDistribution(
  ratings: AppRating[],
): RatingDistribution {
  const distribution: RatingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  ratings.forEach((rating) => {
    const roundedRating = Math.round(rating.rating) as 1 | 2 | 3 | 4 | 5;
    if (roundedRating >= 1 && roundedRating <= 5) {
      distribution[roundedRating]++;
    }
  });

  return distribution;
}

/**
 * Calculate average rating from a list of ratings
 */
export function calculateAverageRating(ratings: AppRating[]): number {
  if (ratings.length === 0) return 0;

  const sum = ratings.reduce((acc, rating) => acc + rating.rating, 0);
  return Math.round((sum / ratings.length) * 10) / 10; // Round to 1 decimal
}

/**
 * Calculate full rating summary
 */
export function calculateRatingSummary(ratings: AppRating[]): RatingSummary {
  return {
    average: calculateAverageRating(ratings),
    total: ratings.length,
    distribution: calculateRatingDistribution(ratings),
  };
}

/**
 * Get rating percentage for a specific star value
 */
export function getRatingPercentage(
  distribution: RatingDistribution,
  star: 1 | 2 | 3 | 4 | 5,
): number {
  const total = Object.values(distribution).reduce(
    (sum, count) => sum + count,
    0,
  );
  if (total === 0) return 0;
  return Math.round((distribution[star] / total) * 100);
}

// ============================================================================
// Rating Display Helpers
// ============================================================================

/**
 * Format rating for display (e.g., "4.8 out of 5")
 */
export function formatRating(rating: number): string {
  return `${rating.toFixed(1)} out of 5`;
}

/**
 * Format rating count for display (e.g., "1.2K ratings")
 */
export function formatRatingCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M ratings`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K ratings`;
  }
  return `${count} ${count === 1 ? "rating" : "ratings"}`;
}

/**
 * Get star rating label for accessibility
 */
export function getStarRatingLabel(rating: number): string {
  const stars = Math.round(rating);
  return `${stars} ${stars === 1 ? "star" : "stars"}`;
}

/**
 * Get rating quality label
 */
export function getRatingQuality(rating: number): {
  label: string;
  color: string;
} {
  if (rating >= 4.5) return { label: "Excellent", color: "text-green-600" };
  if (rating >= 4.0) return { label: "Very Good", color: "text-green-500" };
  if (rating >= 3.5) return { label: "Good", color: "text-yellow-600" };
  if (rating >= 3.0) return { label: "Average", color: "text-yellow-500" };
  if (rating >= 2.0)
    return { label: "Below Average", color: "text-orange-500" };
  return { label: "Poor", color: "text-red-500" };
}

// ============================================================================
// Rating Filtering & Sorting
// ============================================================================

/**
 * Sort ratings by different criteria
 */
export function sortRatings(
  ratings: AppRating[],
  sortBy: "recent" | "helpful" | "rating_high" | "rating_low",
): AppRating[] {
  const sorted = [...ratings];

  switch (sortBy) {
    case "recent":
      return sorted.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

    case "helpful":
      return sorted.sort((a, b) => b.helpful - a.helpful);

    case "rating_high":
      return sorted.sort((a, b) => b.rating - a.rating);

    case "rating_low":
      return sorted.sort((a, b) => a.rating - b.rating);

    default:
      return sorted;
  }
}

/**
 * Filter ratings by star count
 */
export function filterRatingsByStar(
  ratings: AppRating[],
  star: number | null,
): AppRating[] {
  if (star === null) return ratings;
  return ratings.filter((rating) => Math.round(rating.rating) === star);
}

/**
 * Filter ratings with reviews only
 */
export function filterRatingsWithReviews(ratings: AppRating[]): AppRating[] {
  return ratings.filter(
    (rating) => rating.review && rating.review.trim().length > 0,
  );
}

/**
 * Get top helpful reviews
 */
export function getTopHelpfulReviews(
  ratings: AppRating[],
  limit: number = 3,
): AppRating[] {
  return filterRatingsWithReviews(ratings)
    .sort((a, b) => b.helpful - a.helpful)
    .slice(0, limit);
}

/**
 * Get recent reviews
 */
export function getRecentReviews(
  ratings: AppRating[],
  limit: number = 5,
): AppRating[] {
  return filterRatingsWithReviews(ratings)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, limit);
}

// ============================================================================
// Rating Validation
// ============================================================================

/**
 * Validate a rating value
 */
export function isValidRating(rating: number): boolean {
  return rating >= 1 && rating <= 5 && Number.isInteger(rating);
}

/**
 * Validate a review text
 */
export function isValidReview(review: string): {
  valid: boolean;
  error?: string;
} {
  if (!review || review.trim().length === 0) {
    return { valid: true }; // Reviews are optional
  }

  if (review.length < 10) {
    return { valid: false, error: "Review must be at least 10 characters" };
  }

  if (review.length > 2000) {
    return { valid: false, error: "Review must be less than 2000 characters" };
  }

  return { valid: true };
}

// ============================================================================
// Rating Statistics
// ============================================================================

/**
 * Check if app has enough ratings for a reliable average
 */
export function hasReliableRating(
  ratingCount: number,
  minRatings: number = 10,
): boolean {
  return ratingCount >= minRatings;
}

/**
 * Calculate weighted rating (considering number of ratings)
 * Uses Bayesian average to prevent manipulation
 */
export function calculateWeightedRating(
  rating: number,
  ratingCount: number,
  globalAverage: number = 4.0,
  minRatings: number = 50,
): number {
  // Bayesian average formula
  return (
    (globalAverage * minRatings + rating * ratingCount) /
    (minRatings + ratingCount)
  );
}

/**
 * Get rating trend (comparing recent vs older ratings)
 */
export function getRatingTrend(
  ratings: AppRating[],
  daysSplit: number = 30,
): "improving" | "declining" | "stable" {
  if (ratings.length < 10) return "stable";

  const now = new Date();
  const splitDate = new Date(now.getTime() - daysSplit * 24 * 60 * 60 * 1000);

  const recentRatings = ratings.filter(
    (r) => new Date(r.createdAt) >= splitDate,
  );
  const olderRatings = ratings.filter((r) => new Date(r.createdAt) < splitDate);

  if (recentRatings.length < 5 || olderRatings.length < 5) return "stable";

  const recentAvg = calculateAverageRating(recentRatings);
  const olderAvg = calculateAverageRating(olderRatings);

  const diff = recentAvg - olderAvg;

  if (diff > 0.3) return "improving";
  if (diff < -0.3) return "declining";
  return "stable";
}

// ============================================================================
// Sample Data Helpers
// ============================================================================

/**
 * Get ratings for a specific app
 */
export function getRatingsForApp(appId: string): AppRating[] {
  return SAMPLE_RATINGS.filter((rating) => rating.appId === appId);
}

/**
 * Create a new rating object
 */
export function createRating(
  appId: string,
  userId: string,
  userName: string,
  rating: number,
  review?: string,
  userAvatar?: string,
): AppRating {
  const now = new Date().toISOString();
  return {
    id: `rating-${Date.now()}`,
    appId,
    userId,
    userName,
    userAvatar,
    rating,
    review,
    helpful: 0,
    reported: false,
    createdAt: now,
    updatedAt: now,
  };
}
