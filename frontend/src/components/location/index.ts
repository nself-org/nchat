/**
 * Location Components
 *
 * UI components for location sharing features in nself-chat.
 * Provides Telegram-like location sharing functionality.
 */

// Main location sharing dialog
export { LocationSharing, LocationShareButton } from "./LocationSharing";

// Location picker for selecting locations
export { LocationPicker } from "./LocationPicker";

// Message display components
export {
  LiveLocationMessage,
  CompactLiveLocation,
} from "./LiveLocationMessage";
export {
  StaticLocationMessage,
  CompactStaticLocation,
} from "./StaticLocationMessage";

// Map components
export { LocationMap } from "./LocationMap";
export { LocationMarker, ClusterMarker } from "./LocationMarker";

// Live location indicators
export {
  LiveLocationIndicator,
  LiveBadge,
  ProgressRing,
  LiveLocationTimer,
} from "./LiveLocationIndicator";

// Duration selector
export {
  LocationDuration,
  DurationDisplay,
  QuickDurationSelector,
} from "./LocationDuration";

// Nearby places
export { NearbyPlaces, PlaceItem, PlaceCard } from "./NearbyPlaces";

// Location preview
export {
  LocationPreview,
  CompactLocationPreview,
  MiniLocationPreview,
} from "./LocationPreview";

// Stop sharing button
export {
  StopSharingButton,
  InlineStopButton,
  IconStopButton,
} from "./StopSharingButton";

// Permission handling
export {
  LocationPermission,
  PermissionStatusBadge,
} from "./LocationPermission";
