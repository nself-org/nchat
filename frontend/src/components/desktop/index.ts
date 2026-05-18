/**
 * Desktop Components - Components for Tauri desktop app
 *
 * These components provide native desktop functionality when running
 * inside the Tauri desktop wrapper. They gracefully degrade when
 * running in a web browser.
 */

export { TitleBar, type TitleBarProps } from "./TitleBar";
export { WindowControls, type WindowControlsProps } from "./WindowControls";
export { TrayMenu, type TrayMenuProps } from "./TrayMenu";
export {
  UpdateNotification,
  type UpdateNotificationProps,
  type UpdateNotificationRenderProps,
} from "./UpdateNotification";
