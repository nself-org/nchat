// ============================================================================
// Mobile Utilities - Index
// ============================================================================

// Store
export {
  useMobileStore,
  selectSidebarOpen,
  selectActiveView,
  selectCanGoBack,
  selectKeyboardVisible,
  selectKeyboardHeight,
  selectDrawer,
  selectActionSheet,
  selectIsRefreshing,
  selectBottomNavVisible,
  selectUnreadCounts,
  selectTotalUnread,
} from "./mobile-store";
export type {
  MobileView,
  DrawerPosition,
  MobileDrawerState,
  MobileState,
  ActionSheetOption,
  MobileActions,
} from "./mobile-store";

// Device Detection
export {
  useMobile,
  prefersReducedMotion,
  prefersDarkMode,
  hasCoarsePointer,
  canHover,
  getOrientation,
  isMobileViewport,
} from "./use-mobile";
export type { DeviceInfo, MobileDetectionOptions } from "./use-mobile";

// Swipe Gestures
export {
  useSwipe,
  useSimpleSwipe,
  useHorizontalSwipe,
  useVerticalSwipe,
} from "./use-swipe";
export type {
  SwipeDirection,
  SwipeState,
  SwipeCallbacks,
  SwipeOptions,
  SwipeHandlers,
} from "./use-swipe";

// Viewport
export {
  useViewport,
  useSafeArea,
  useVisualViewport,
  useOrientation,
  useBreakpoint,
  useMediaQuery,
} from "./use-viewport";
export type {
  Orientation,
  SafeAreaInsets,
  ViewportState,
  ViewportBreakpoints,
} from "./use-viewport";

// Touch Utilities
export {
  useLongPress,
  useDoubleTap,
  usePinch,
  useRipple,
  usePullToRefresh,
} from "./use-touch";
export type {
  LongPressOptions,
  DoubleTapOptions,
  PinchState,
  PinchOptions,
  RippleState,
  PullToRefreshOptions,
  PullToRefreshState,
} from "./use-touch";
