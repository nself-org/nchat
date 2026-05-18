/**
 * Notification Services - Export all notification services
 */

// Notification Service
export {
  NotificationService,
  getNotificationService,
  resetNotificationService,
  type SendOptions,
  type NotificationServiceOptions,
} from "./notification.service";

// Preference Service
export {
  PreferenceService,
  getPreferenceService,
  resetPreferenceService,
  type PreferenceServiceOptions,
  type UpdateChannelPreferenceOptions,
  type UpdateQuietHoursOptions,
} from "./preference.service";

// Template Service
export {
  TemplateService,
  getTemplateService,
  resetTemplateService,
  renderTemplate,
  NCHAT_TEMPLATES,
  type TemplateServiceOptions,
  type RenderedTemplate,
} from "./template.service";

// Event Dispatcher
export {
  NotificationEventDispatcher,
  getNotificationEventDispatcher,
  resetNotificationEventDispatcher,
  type EventDispatcherOptions,
  type EventHandler,
  type EventSubscription,
} from "./event-dispatcher";
