/**
 * Layout Manager
 *
 * Manages video call layout modes (grid view, speaker view, pinned view)
 * and calculates tile positions and sizes.
 */

// =============================================================================
// Types
// =============================================================================

export type LayoutMode =
  | "grid"
  | "speaker"
  | "pinned"
  | "sidebar"
  | "spotlight";

export interface ParticipantTile {
  participantId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  isMainTile: boolean;
}

export interface LayoutDimensions {
  containerWidth: number;
  containerHeight: number;
  participantCount: number;
}

export interface LayoutOptions {
  mode: LayoutMode;
  pinnedParticipantId?: string;
  speakingParticipantId?: string;
  screenShareParticipantId?: string;
  maxTilesPerRow?: number;
  aspectRatio?: number;
  gap?: number;
}

export interface LayoutResult {
  tiles: ParticipantTile[];
  mainTile: ParticipantTile | null;
  thumbnails: ParticipantTile[];
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_ASPECT_RATIO = 16 / 9;
const DEFAULT_GAP = 8; // pixels
const THUMBNAIL_WIDTH = 160; // pixels
const THUMBNAIL_HEIGHT = 90; // pixels
const THUMBNAIL_GAP = 8;

// =============================================================================
// Layout Manager Class
// =============================================================================

export class LayoutManager {
  private mode: LayoutMode = "grid";
  private pinnedParticipantId: string | null = null;
  private speakingParticipantId: string | null = null;
  private screenShareParticipantId: string | null = null;
  private aspectRatio: number = DEFAULT_ASPECT_RATIO;
  private gap: number = DEFAULT_GAP;
  private maxTilesPerRow: number = 4;

  constructor(options: Partial<LayoutOptions> = {}) {
    this.mode = options.mode ?? "grid";
    this.pinnedParticipantId = options.pinnedParticipantId ?? null;
    this.speakingParticipantId = options.speakingParticipantId ?? null;
    this.screenShareParticipantId = options.screenShareParticipantId ?? null;
    this.aspectRatio = options.aspectRatio ?? DEFAULT_ASPECT_RATIO;
    this.gap = options.gap ?? DEFAULT_GAP;
    this.maxTilesPerRow = options.maxTilesPerRow ?? 4;
  }

  // ===========================================================================
  // Layout Mode Management
  // ===========================================================================

  setMode(mode: LayoutMode): void {
    this.mode = mode;
  }

  getMode(): LayoutMode {
    return this.mode;
  }

  setPinnedParticipant(participantId: string | null): void {
    this.pinnedParticipantId = participantId;
    if (participantId) {
      this.mode = "pinned";
    }
  }

  setSpeakingParticipant(participantId: string | null): void {
    this.speakingParticipantId = participantId;
  }

  setScreenShareParticipant(participantId: string | null): void {
    this.screenShareParticipantId = participantId;
    // Automatically switch to speaker mode when screen sharing starts
    if (participantId) {
      this.mode = "speaker";
    }
  }

  // ===========================================================================
  // Layout Calculation
  // ===========================================================================

  calculateLayout(
    participantIds: string[],
    dimensions: LayoutDimensions,
  ): LayoutResult {
    if (this.screenShareParticipantId) {
      // Screen share takes priority
      return this.calculateScreenShareLayout(participantIds, dimensions);
    }

    switch (this.mode) {
      case "grid":
        return this.calculateGridLayout(participantIds, dimensions);
      case "speaker":
        return this.calculateSpeakerLayout(participantIds, dimensions);
      case "pinned":
        return this.calculatePinnedLayout(participantIds, dimensions);
      case "sidebar":
        return this.calculateSidebarLayout(participantIds, dimensions);
      case "spotlight":
        return this.calculateSpotlightLayout(participantIds, dimensions);
      default:
        return this.calculateGridLayout(participantIds, dimensions);
    }
  }

  // ===========================================================================
  // Grid Layout
  // ===========================================================================

  private calculateGridLayout(
    participantIds: string[],
    dimensions: LayoutDimensions,
  ): LayoutResult {
    const { containerWidth, containerHeight } = dimensions;
    const count = participantIds.length;

    if (count === 0) {
      return { tiles: [], mainTile: null, thumbnails: [] };
    }

    // Calculate grid dimensions
    const { cols, rows } = this.calculateGridDimensions(
      count,
      containerWidth,
      containerHeight,
    );

    // Calculate tile size
    const tileWidth = (containerWidth - (cols + 1) * this.gap) / cols;
    const tileHeight = (containerHeight - (rows + 1) * this.gap) / rows;

    // Create tiles
    const tiles: ParticipantTile[] = [];
    participantIds.forEach((id, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);

      tiles.push({
        participantId: id,
        x: this.gap + col * (tileWidth + this.gap),
        y: this.gap + row * (tileHeight + this.gap),
        width: tileWidth,
        height: tileHeight,
        zIndex: index,
        isMainTile: false,
      });
    });

    return { tiles, mainTile: null, thumbnails: [] };
  }

  private calculateGridDimensions(
    count: number,
    width: number,
    height: number,
  ): { cols: number; rows: number } {
    if (count === 0) return { cols: 0, rows: 0 };
    if (count === 1) return { cols: 1, rows: 1 };
    if (count === 2) return { cols: 2, rows: 1 };

    // Calculate optimal grid based on aspect ratio
    const aspectRatio = width / height;
    let bestCols = 1;
    let bestRows = count;
    let bestDiff = Infinity;

    for (let cols = 1; cols <= Math.min(count, this.maxTilesPerRow); cols++) {
      const rows = Math.ceil(count / cols);
      const tileAspect = width / cols / (height / rows);
      const diff = Math.abs(tileAspect - this.aspectRatio);

      if (diff < bestDiff) {
        bestDiff = diff;
        bestCols = cols;
        bestRows = rows;
      }
    }

    return { cols: bestCols, rows: bestRows };
  }

  // ===========================================================================
  // Speaker Layout
  // ===========================================================================

  private calculateSpeakerLayout(
    participantIds: string[],
    dimensions: LayoutDimensions,
  ): LayoutResult {
    const { containerWidth, containerHeight } = dimensions;
    const count = participantIds.length;

    if (count === 0) {
      return { tiles: [], mainTile: null, thumbnails: [] };
    }

    if (count === 1) {
      // Single participant - full screen
      return this.calculateGridLayout(participantIds, dimensions);
    }

    // Main speaker takes most of the space
    const thumbnailBarHeight = THUMBNAIL_HEIGHT + 2 * THUMBNAIL_GAP;
    const mainHeight = containerHeight - thumbnailBarHeight;
    const mainWidth = containerWidth;

    // Determine main participant (speaking or first)
    const mainParticipantId = this.speakingParticipantId || participantIds[0];
    const thumbnailParticipantIds = participantIds.filter(
      (id) => id !== mainParticipantId,
    );

    // Main tile
    const mainTile: ParticipantTile = {
      participantId: mainParticipantId,
      x: 0,
      y: 0,
      width: mainWidth,
      height: mainHeight,
      zIndex: 0,
      isMainTile: true,
    };

    // Thumbnail tiles
    const thumbnails: ParticipantTile[] = [];
    const thumbnailCount = thumbnailParticipantIds.length;
    const thumbnailsWidth =
      thumbnailCount * THUMBNAIL_WIDTH + (thumbnailCount + 1) * THUMBNAIL_GAP;
    const startX = (containerWidth - thumbnailsWidth) / 2;

    thumbnailParticipantIds.forEach((id, index) => {
      thumbnails.push({
        participantId: id,
        x: startX + index * (THUMBNAIL_WIDTH + THUMBNAIL_GAP) + THUMBNAIL_GAP,
        y: mainHeight + THUMBNAIL_GAP,
        width: THUMBNAIL_WIDTH,
        height: THUMBNAIL_HEIGHT,
        zIndex: 100 + index,
        isMainTile: false,
      });
    });

    return {
      tiles: [mainTile, ...thumbnails],
      mainTile,
      thumbnails,
    };
  }

  // ===========================================================================
  // Pinned Layout
  // ===========================================================================

  private calculatePinnedLayout(
    participantIds: string[],
    dimensions: LayoutDimensions,
  ): LayoutResult {
    if (
      !this.pinnedParticipantId ||
      !participantIds.includes(this.pinnedParticipantId)
    ) {
      // Fallback to speaker layout
      return this.calculateSpeakerLayout(participantIds, dimensions);
    }

    const { containerWidth, containerHeight } = dimensions;

    // Pinned participant takes main space
    const thumbnailBarHeight = THUMBNAIL_HEIGHT + 2 * THUMBNAIL_GAP;
    const mainHeight = containerHeight - thumbnailBarHeight;

    const mainTile: ParticipantTile = {
      participantId: this.pinnedParticipantId,
      x: 0,
      y: 0,
      width: containerWidth,
      height: mainHeight,
      zIndex: 0,
      isMainTile: true,
    };

    // Other participants in thumbnails
    const thumbnailParticipantIds = participantIds.filter(
      (id) => id !== this.pinnedParticipantId,
    );

    const thumbnails: ParticipantTile[] = [];
    const thumbnailCount = thumbnailParticipantIds.length;
    const thumbnailsWidth =
      thumbnailCount * THUMBNAIL_WIDTH + (thumbnailCount + 1) * THUMBNAIL_GAP;
    const startX = (containerWidth - thumbnailsWidth) / 2;

    thumbnailParticipantIds.forEach((id, index) => {
      thumbnails.push({
        participantId: id,
        x: startX + index * (THUMBNAIL_WIDTH + THUMBNAIL_GAP) + THUMBNAIL_GAP,
        y: mainHeight + THUMBNAIL_GAP,
        width: THUMBNAIL_WIDTH,
        height: THUMBNAIL_HEIGHT,
        zIndex: 100 + index,
        isMainTile: false,
      });
    });

    return {
      tiles: [mainTile, ...thumbnails],
      mainTile,
      thumbnails,
    };
  }

  // ===========================================================================
  // Sidebar Layout
  // ===========================================================================

  private calculateSidebarLayout(
    participantIds: string[],
    dimensions: LayoutDimensions,
  ): LayoutResult {
    const { containerWidth, containerHeight } = dimensions;
    const count = participantIds.length;

    if (count === 0) {
      return { tiles: [], mainTile: null, thumbnails: [] };
    }

    if (count === 1) {
      return this.calculateGridLayout(participantIds, dimensions);
    }

    // Main speaker on left, others in sidebar on right
    const sidebarWidth = 240;
    const mainWidth = containerWidth - sidebarWidth - this.gap;
    const mainParticipantId = this.speakingParticipantId || participantIds[0];
    const sidebarParticipantIds = participantIds.filter(
      (id) => id !== mainParticipantId,
    );

    // Main tile
    const mainTile: ParticipantTile = {
      participantId: mainParticipantId,
      x: 0,
      y: 0,
      width: mainWidth,
      height: containerHeight,
      zIndex: 0,
      isMainTile: true,
    };

    // Sidebar tiles
    const thumbnails: ParticipantTile[] = [];
    const sidebarTileHeight = Math.min(
      (containerHeight - (sidebarParticipantIds.length + 1) * this.gap) /
        sidebarParticipantIds.length,
      THUMBNAIL_HEIGHT * 2,
    );

    sidebarParticipantIds.forEach((id, index) => {
      thumbnails.push({
        participantId: id,
        x: mainWidth + this.gap,
        y: this.gap + index * (sidebarTileHeight + this.gap),
        width: sidebarWidth,
        height: sidebarTileHeight,
        zIndex: 100 + index,
        isMainTile: false,
      });
    });

    return {
      tiles: [mainTile, ...thumbnails],
      mainTile,
      thumbnails,
    };
  }

  // ===========================================================================
  // Spotlight Layout
  // ===========================================================================

  private calculateSpotlightLayout(
    participantIds: string[],
    dimensions: LayoutDimensions,
  ): LayoutResult {
    // Similar to speaker but with no thumbnails
    const { containerWidth, containerHeight } = dimensions;
    const mainParticipantId =
      this.speakingParticipantId ||
      this.pinnedParticipantId ||
      participantIds[0];

    if (!mainParticipantId) {
      return { tiles: [], mainTile: null, thumbnails: [] };
    }

    const mainTile: ParticipantTile = {
      participantId: mainParticipantId,
      x: 0,
      y: 0,
      width: containerWidth,
      height: containerHeight,
      zIndex: 0,
      isMainTile: true,
    };

    return {
      tiles: [mainTile],
      mainTile,
      thumbnails: [],
    };
  }

  // ===========================================================================
  // Screen Share Layout
  // ===========================================================================

  private calculateScreenShareLayout(
    participantIds: string[],
    dimensions: LayoutDimensions,
  ): LayoutResult {
    if (!this.screenShareParticipantId) {
      return this.calculateGridLayout(participantIds, dimensions);
    }

    const { containerWidth, containerHeight } = dimensions;

    // Screen share takes main space
    const thumbnailBarHeight = THUMBNAIL_HEIGHT + 2 * THUMBNAIL_GAP;
    const mainHeight = containerHeight - thumbnailBarHeight;

    const mainTile: ParticipantTile = {
      participantId: this.screenShareParticipantId,
      x: 0,
      y: 0,
      width: containerWidth,
      height: mainHeight,
      zIndex: 0,
      isMainTile: true,
    };

    // All participants (including screen sharer) in thumbnails
    const thumbnails: ParticipantTile[] = [];
    const thumbnailCount = participantIds.length;
    const thumbnailsWidth =
      thumbnailCount * THUMBNAIL_WIDTH + (thumbnailCount + 1) * THUMBNAIL_GAP;
    const startX = (containerWidth - thumbnailsWidth) / 2;

    participantIds.forEach((id, index) => {
      thumbnails.push({
        participantId: id,
        x: startX + index * (THUMBNAIL_WIDTH + THUMBNAIL_GAP) + THUMBNAIL_GAP,
        y: mainHeight + THUMBNAIL_GAP,
        width: THUMBNAIL_WIDTH,
        height: THUMBNAIL_HEIGHT,
        zIndex: 100 + index,
        isMainTile: false,
      });
    });

    return {
      tiles: [mainTile, ...thumbnails],
      mainTile,
      thumbnails,
    };
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  setAspectRatio(ratio: number): void {
    this.aspectRatio = ratio;
  }

  setGap(gap: number): void {
    this.gap = gap;
  }

  setMaxTilesPerRow(max: number): void {
    this.maxTilesPerRow = max;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

export function createLayoutManager(
  options?: Partial<LayoutOptions>,
): LayoutManager {
  return new LayoutManager(options);
}

// =============================================================================
// Utility Functions
// =============================================================================

export function getLayoutLabel(mode: LayoutMode): string {
  const labels: Record<LayoutMode, string> = {
    grid: "Grid View",
    speaker: "Speaker View",
    pinned: "Pinned View",
    sidebar: "Sidebar View",
    spotlight: "Spotlight View",
  };
  return labels[mode];
}

export function calculateOptimalLayout(participantCount: number): LayoutMode {
  if (participantCount === 1) return "spotlight";
  if (participantCount === 2) return "grid";
  if (participantCount <= 4) return "grid";
  return "speaker";
}
