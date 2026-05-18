/**
 * Embedding Utilities - Helper functions for vector operations
 *
 * Provides utility functions for:
 * - Similarity calculations
 * - Vector normalization
 * - Dimension reduction
 * - Quality metrics
 * - Monitoring helpers
 *
 * @module lib/ai/embedding-utils
 */

// ========================================
// Vector Operations
// ========================================

/**
 * Calculate cosine similarity between two vectors
 * Range: [-1, 1] where 1 = identical, 0 = orthogonal, -1 = opposite
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) {
    return 0;
  }

  return dotProduct / magnitude;
}

/**
 * Calculate Euclidean (L2) distance between two vectors
 * Range: [0, ∞) where 0 = identical
 */
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

/**
 * Calculate Manhattan (L1) distance between two vectors
 * Range: [0, ∞) where 0 = identical
 */
export function manhattanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += Math.abs(a[i] - b[i]);
  }

  return sum;
}

/**
 * Calculate dot product (inner product) between two vectors
 */
export function dotProduct(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }

  return sum;
}

/**
 * Normalize a vector to unit length (L2 normalization)
 */
export function normalize(vector: number[]): number[] {
  const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));

  if (norm === 0) {
    return vector;
  }

  return vector.map((val) => val / norm);
}

/**
 * Calculate the magnitude (L2 norm) of a vector
 */
export function magnitude(vector: number[]): number {
  return Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
}

/**
 * Calculate the average of multiple vectors
 */
export function averageVectors(vectors: number[][]): number[] {
  if (vectors.length === 0) {
    throw new Error("Cannot average empty vector list");
  }

  const dimension = vectors[0].length;
  const result = new Array(dimension).fill(0);

  for (const vector of vectors) {
    if (vector.length !== dimension) {
      throw new Error("All vectors must have the same dimension");
    }
    for (let i = 0; i < dimension; i++) {
      result[i] += vector[i];
    }
  }

  return result.map((val) => val / vectors.length);
}

/**
 * Calculate weighted average of multiple vectors
 */
export function weightedAverageVectors(
  vectors: number[][],
  weights: number[],
): number[] {
  if (vectors.length === 0) {
    throw new Error("Cannot average empty vector list");
  }

  if (vectors.length !== weights.length) {
    throw new Error("Number of vectors must match number of weights");
  }

  const dimension = vectors[0].length;
  const result = new Array(dimension).fill(0);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  if (totalWeight === 0) {
    throw new Error("Total weight cannot be zero");
  }

  for (let i = 0; i < vectors.length; i++) {
    const vector = vectors[i];
    const weight = weights[i];

    if (vector.length !== dimension) {
      throw new Error("All vectors must have the same dimension");
    }

    for (let j = 0; j < dimension; j++) {
      result[j] += vector[j] * weight;
    }
  }

  return result.map((val) => val / totalWeight);
}

// ========================================
// Quality Metrics
// ========================================

/**
 * Calculate embedding quality score based on various metrics
 * Returns a score between 0 and 100
 */
export function calculateQualityScore(embedding: number[]): number {
  let score = 100;

  // Check for NaN or Infinity
  const hasInvalidValues = embedding.some((val) => !isFinite(val));
  if (hasInvalidValues) {
    return 0;
  }

  // Check magnitude (should be close to 1 for normalized embeddings)
  const mag = magnitude(embedding);
  const magnitudeDiff = Math.abs(mag - 1);
  score -= magnitudeDiff * 20; // Penalty for non-normalized embeddings

  // Check for zero or near-zero vectors
  if (mag < 0.1) {
    score -= 30;
  }

  // Check variance (embeddings should have some variance)
  const mean = embedding.reduce((sum, val) => sum + val, 0) / embedding.length;
  const variance =
    embedding.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    embedding.length;

  if (variance < 0.001) {
    score -= 20; // Low variance indicates low information content
  }

  // Check for outliers (values too far from mean)
  const stdDev = Math.sqrt(variance);
  const outliers = embedding.filter((val) => Math.abs(val - mean) > 3 * stdDev);
  score -= outliers.length * 2;

  return Math.max(0, Math.min(100, score));
}

/**
 * Detect potential embedding anomalies
 */
export function detectAnomalies(embedding: number[]): string[] {
  const anomalies: string[] = [];

  // Check for invalid values
  const invalidValues = embedding.filter((val) => !isFinite(val));
  if (invalidValues.length > 0) {
    anomalies.push(
      `Contains ${invalidValues.length} invalid values (NaN/Infinity)`,
    );
  }

  // Check for zero vector
  const mag = magnitude(embedding);
  if (mag < 0.001) {
    anomalies.push("Near-zero magnitude (embedding may be invalid)");
  }

  // Check normalization
  const magnitudeDiff = Math.abs(mag - 1);
  if (magnitudeDiff > 0.1) {
    anomalies.push(`Not normalized (magnitude: ${mag.toFixed(3)})`);
  }

  // Check for low variance
  const mean = embedding.reduce((sum, val) => sum + val, 0) / embedding.length;
  const variance =
    embedding.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    embedding.length;

  if (variance < 0.001) {
    anomalies.push("Very low variance (may lack information)");
  }

  // Check for extreme values
  const min = Math.min(...embedding);
  const max = Math.max(...embedding);

  if (Math.abs(min) > 10 || Math.abs(max) > 10) {
    anomalies.push(`Extreme values detected (min: ${min}, max: ${max})`);
  }

  return anomalies;
}

// ========================================
// Dimension Reduction (PCA-style)
// ========================================

/**
 * Reduce vector dimensions using simple averaging
 * Useful for visualization or reducing storage requirements
 */
export function reduceDimensions(
  embedding: number[],
  targetDimension: number,
): number[] {
  if (targetDimension >= embedding.length) {
    return embedding;
  }

  const chunkSize = Math.ceil(embedding.length / targetDimension);
  const reduced: number[] = [];

  for (let i = 0; i < targetDimension; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, embedding.length);
    const chunk = embedding.slice(start, end);
    const avg = chunk.reduce((sum, val) => sum + val, 0) / chunk.length;
    reduced.push(avg);
  }

  return reduced;
}

// ========================================
// Monitoring and Debugging
// ========================================

/**
 * Get detailed statistics about an embedding
 */
export function getEmbeddingStats(embedding: number[]) {
  const mean = embedding.reduce((sum, val) => sum + val, 0) / embedding.length;
  const variance =
    embedding.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    embedding.length;
  const stdDev = Math.sqrt(variance);
  const min = Math.min(...embedding);
  const max = Math.max(...embedding);
  const mag = magnitude(embedding);

  return {
    dimension: embedding.length,
    mean: Number(mean.toFixed(6)),
    variance: Number(variance.toFixed(6)),
    stdDev: Number(stdDev.toFixed(6)),
    min: Number(min.toFixed(6)),
    max: Number(max.toFixed(6)),
    magnitude: Number(mag.toFixed(6)),
    isNormalized: Math.abs(mag - 1) < 0.01,
    qualityScore: calculateQualityScore(embedding),
    anomalies: detectAnomalies(embedding),
  };
}

/**
 * Format embedding for display (truncated)
 */
export function formatEmbedding(embedding: number[], maxLength = 10): string {
  if (embedding.length <= maxLength) {
    return `[${embedding.map((v) => v.toFixed(4)).join(", ")}]`;
  }

  const start = embedding.slice(0, maxLength / 2);
  const end = embedding.slice(-maxLength / 2);

  return `[${start.map((v) => v.toFixed(4)).join(", ")}, ..., ${end
    .map((v) => v.toFixed(4))
    .join(", ")}]`;
}

/**
 * Compare two embeddings and return similarity metrics
 */
export function compareEmbeddings(a: number[], b: number[]) {
  return {
    cosineSimilarity: Number(cosineSimilarity(a, b).toFixed(6)),
    euclideanDistance: Number(euclideanDistance(a, b).toFixed(6)),
    manhattanDistance: Number(manhattanDistance(a, b).toFixed(6)),
    dotProduct: Number(dotProduct(a, b).toFixed(6)),
  };
}

// ========================================
// Batch Operations
// ========================================

/**
 * Find the most similar embedding from a list
 */
export function findMostSimilar(
  query: number[],
  candidates: number[][],
  metric: "cosine" | "euclidean" | "manhattan" = "cosine",
): { index: number; similarity: number } {
  let bestIndex = -1;
  let bestScore = metric === "cosine" ? -Infinity : Infinity;

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    let score: number;

    switch (metric) {
      case "cosine":
        score = cosineSimilarity(query, candidate);
        if (score > bestScore) {
          bestScore = score;
          bestIndex = i;
        }
        break;
      case "euclidean":
        score = euclideanDistance(query, candidate);
        if (score < bestScore) {
          bestScore = score;
          bestIndex = i;
        }
        break;
      case "manhattan":
        score = manhattanDistance(query, candidate);
        if (score < bestScore) {
          bestScore = score;
          bestIndex = i;
        }
        break;
    }
  }

  return {
    index: bestIndex,
    similarity: bestScore,
  };
}

/**
 * Cluster embeddings using simple k-means
 * (Simplified version - for production use a proper ML library)
 */
export function simpleCluster(
  embeddings: number[][],
  k: number,
  maxIterations = 100,
): number[] {
  if (embeddings.length < k) {
    throw new Error("Number of embeddings must be >= k");
  }

  // Initialize centroids randomly
  const centroids: number[][] = [];
  const used = new Set<number>();

  while (centroids.length < k) {
    const idx = Math.floor(Math.random() * embeddings.length);
    if (!used.has(idx)) {
      centroids.push([...embeddings[idx]]);
      used.add(idx);
    }
  }

  let assignments = new Array(embeddings.length).fill(0);

  for (let iter = 0; iter < maxIterations; iter++) {
    // Assign to nearest centroid
    const newAssignments = embeddings.map(
      (emb) => findMostSimilar(emb, centroids, "cosine").index,
    );

    // Check convergence
    if (newAssignments.every((a, i) => a === assignments[i])) {
      break;
    }

    assignments = newAssignments;

    // Update centroids
    for (let i = 0; i < k; i++) {
      const cluster = embeddings.filter((_, idx) => assignments[idx] === i);
      if (cluster.length > 0) {
        centroids[i] = averageVectors(cluster);
      }
    }
  }

  return assignments;
}

// ========================================
// Export All
// ========================================

export const EmbeddingUtils = {
  // Vector operations
  cosineSimilarity,
  euclideanDistance,
  manhattanDistance,
  dotProduct,
  normalize,
  magnitude,
  averageVectors,
  weightedAverageVectors,

  // Quality metrics
  calculateQualityScore,
  detectAnomalies,

  // Dimension reduction
  reduceDimensions,

  // Monitoring
  getEmbeddingStats,
  formatEmbedding,
  compareEmbeddings,

  // Batch operations
  findMostSimilar,
  simpleCluster,
};
