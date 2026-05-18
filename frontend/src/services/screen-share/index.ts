/**
 * Screen Share Services
 *
 * Exports all screen sharing related services
 */

export {
  ScreenShareService,
  createScreenShareService,
  type ScreenShareState,
  type ScreenShareServiceOptions,
  type ScreenShareServiceCallbacks,
  type RegionSelection,
  type ShareInfo,
  type ScreenCaptureOptions,
  type ScreenShare,
  type ScreenCaptureType,
  type ScreenCaptureQuality,
  supportsSystemAudio,
  getOptimalQuality,
  getBitrateForQuality,
} from "./screen-share.service";

export {
  ScreenSharePermissionsService,
  createScreenSharePermissionsService,
  DEFAULT_SCREEN_SHARE_PERMISSIONS,
  type ScreenSharePermissionMode,
  type ScreenSharePermissions,
  type ShareRequest,
  type ShareRequestStatus,
  type ActiveShare,
  type ScreenSharePermissionCallbacks,
} from "./screen-share-permissions.service";
