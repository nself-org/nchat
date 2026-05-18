// ============================================================================
// Mobile Components - Index
// ============================================================================

// Navigation
export { MobileNav, MobileNavFAB, MobileNavCompact } from "./mobile-nav";
export type { NavItem, MobileNavProps, MobileNavFABProps } from "./mobile-nav";

// Header
export {
  MobileHeader,
  MobileSearchHeader,
  MobileChannelHeader,
} from "./mobile-header";
export type {
  HeaderAction,
  MobileHeaderProps,
  MobileSearchHeaderProps,
  MobileChannelHeaderProps,
} from "./mobile-header";

// Sidebar
export { MobileSidebar } from "./mobile-sidebar";
export type {
  Channel,
  ChannelSection,
  MobileSidebarProps,
} from "./mobile-sidebar";

// Channel View
export { MobileChannelView } from "./mobile-channel-view";
export type {
  Message as MobileMessage,
  MobileChannelViewProps,
} from "./mobile-channel-view";

// Message Input
export { MobileMessageInput } from "./mobile-message-input";
export type {
  MobileMessageInputProps,
  MobileMessageInputRef,
} from "./mobile-message-input";

// Action Sheet
export {
  MobileActionSheet,
  StandaloneActionSheet,
} from "./mobile-action-sheet";
export type {
  MobileActionSheetProps,
  StandaloneActionSheetProps,
} from "./mobile-action-sheet";

// Drawer
export {
  MobileDrawer,
  BottomSheet,
  SideDrawer,
  SnapDrawer,
} from "./mobile-drawer";
export type {
  MobileDrawerProps,
  BottomSheetProps,
  SideDrawerProps,
  SnapDrawerProps,
} from "./mobile-drawer";

// Swipe Actions
export {
  SwipeActions,
  MessageSwipeActions,
  ChannelSwipeActions,
  createReplyAction,
  createReactAction,
  createDeleteAction,
  createPinAction,
  createForwardAction,
  createMoreAction,
} from "./swipe-actions";
export type {
  SwipeAction,
  SwipeActionsProps,
  MessageSwipeActionsProps,
  ChannelSwipeActionsProps,
} from "./swipe-actions";

// Virtual Scrolling (v0.8.0)
export { VirtualMessageList, VirtualMessageItem } from "./VirtualMessageList";
export type {
  VirtualMessageListProps,
  VirtualMessageListRef,
} from "./VirtualMessageList";

// Long Press Menu (v0.8.0)
export { LongPressMenu, useLongPress } from "./LongPressMenu";
export type {
  MenuItem,
  LongPressMenuProps,
  UseLongPressOptions,
  UseLongPressReturn,
} from "./LongPressMenu";

// Pinch to Zoom (v0.8.0)
export { PinchZoom } from "./PinchZoom";
export type { PinchZoomProps } from "./PinchZoom";

// Skeleton Loaders (v0.8.0)
export {
  SkeletonLoader,
  Skeleton,
  MessageSkeleton,
  ChannelSkeleton,
  UserSkeleton,
  ImageSkeleton,
  VideoSkeleton,
  ListSkeleton,
  CardSkeleton,
  TextSkeleton,
  AvatarSkeleton,
  ButtonSkeleton,
  InputSkeleton,
  BadgeSkeleton,
} from "./SkeletonLoader";
export type { SkeletonProps, SkeletonLoaderProps } from "./SkeletonLoader";

// Pull to Refresh (v0.8.0)
export { PullToRefresh, usePullToRefresh } from "./PullToRefresh";
export type {
  PullToRefreshProps,
  RefreshState,
  UsePullToRefreshOptions,
  UsePullToRefreshReturn,
} from "./PullToRefresh";

// Touch-Optimized Components (v0.8.0)
export {
  TouchButton,
  TouchLink,
  TouchIconButton,
  TouchListItem,
  TouchCheckbox,
  TouchRadio,
  TouchArea,
  IOS_MIN_TAP_TARGET,
  ANDROID_MIN_TAP_TARGET,
  MIN_TAP_TARGET,
} from "./TouchOptimized";
export type {
  TouchButtonProps,
  TouchLinkProps,
  TouchIconButtonProps,
  TouchListItemProps,
  TouchCheckboxProps,
  TouchRadioProps,
  TouchAreaProps,
} from "./TouchOptimized";
