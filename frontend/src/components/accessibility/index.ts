// Provider
export {
  A11yProvider,
  useA11y,
  useA11yFeature,
  withA11y,
} from "./a11y-provider";
export type { A11yProviderProps } from "./a11y-provider";

// Skip Links
export { SkipLinks, SkipLinkTarget } from "./skip-links";
export type {
  SkipLink,
  SkipLinksProps,
  SkipLinkTargetProps,
} from "./skip-links";

// Focus Trap
export { FocusTrap, useFocusTrap } from "./focus-trap";
export type { FocusTrapProps } from "./focus-trap";

// Visually Hidden
export {
  VisuallyHidden,
  VisuallyHiddenInput,
  visuallyHiddenStyles,
  visuallyHiddenClassName,
  useVisuallyHidden,
} from "./visually-hidden";
export type {
  VisuallyHiddenProps,
  VisuallyHiddenInputProps,
} from "./visually-hidden";

// Live Region
export {
  LiveRegion,
  AnnouncerProvider,
  useAnnouncer,
  Alert,
  Status,
  Log,
} from "./live-region";
export type {
  LiveRegionProps,
  LiveRegionPoliteness,
  AnnouncerProviderProps,
  AlertProps,
  StatusProps,
  LogProps,
} from "./live-region";

// Accessible Icon
export {
  AccessibleIcon,
  DecorativeIcon,
  IconWithLabel,
} from "./accessible-icon";
export type {
  AccessibleIconProps,
  DecorativeIconProps,
  IconWithLabelProps,
} from "./accessible-icon";
