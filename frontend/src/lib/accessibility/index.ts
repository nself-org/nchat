// Store
export {
  useA11yStore,
  applyA11ySettings,
  generateA11yCSSVariables,
} from "./a11y-store";
export type {
  A11ySettings,
  A11yState,
  FontSize,
  ContrastMode,
} from "./a11y-store";

// Hooks
export {
  useReducedMotion,
  useMotionSafeAnimation,
  useMotionSafeTransition,
  useAnimationControl,
  prefersReducedMotion,
  motionClasses,
} from "./use-reduced-motion";
export type { MotionSafeTransition } from "./use-reduced-motion";

export {
  useFocusManagement,
  useFocusVisible,
  useFocusReturn,
  useFocusOnMount,
  useDialogFocus,
  focusVisibleClasses,
} from "./use-focus-management";

export { useAnnouncer, announcements } from "./use-announcer";
export type { AnnouncementPriority, Announcement } from "./use-announcer";

export {
  useRovingTabIndex,
  useMenuNavigation,
  useToolbarNavigation,
  useGridNavigation,
} from "./use-roving-tabindex";
export type {
  RovingTabIndexOptions,
  RovingTabIndexResult,
} from "./use-roving-tabindex";

// Utilities
export {
  generateId,
  generateAriaIds,
  mergeAriaProps,
  buildDescribedBy,
  buildLabelledBy,
  getActiveElement,
  isFocusable,
  isVisible,
  isTabbable,
  getTabbableElements,
  focusElement,
  scrollIntoViewIfNeeded,
  getAccessibleName,
  getContrastRatio,
  meetsContrastRequirement,
  semanticRoles,
  Keys,
} from "./a11y-utils";
export type { KeyCode } from "./a11y-utils";
