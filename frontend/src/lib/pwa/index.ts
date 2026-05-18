/**
 * PWA Library Exports
 *
 * This module provides Progressive Web App functionality including:
 * - Service worker registration and management
 * - Push notifications
 * - Offline support
 */

// Service Worker Registration
export {
  registerServiceWorker,
  unregisterServiceWorker,
  isServiceWorkerSupported,
  getRegistration,
  isUpdateAvailable,
  skipWaiting,
  checkForUpdates,
  postMessage,
  postMessageWithResponse,
  cacheUrls,
  clearCache,
  getCacheSize,
  onServiceWorkerMessage,
  getServiceWorkerState,
  type ServiceWorkerConfig,
  type ServiceWorkerState,
} from "./register-sw";

// Push Notifications
export {
  isPushSupported,
  getNotificationPermission,
  isNotificationGranted,
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  getSubscription,
  isSubscribed,
  subscriptionToJSON,
  showLocalNotification,
  getPushState,
  setupPushHandlers,
  enablePushNotifications,
  disablePushNotifications,
  type PushSubscriptionData,
  type NotificationPayload,
  type NotificationAction,
  type NotificationPermissionState,
  type PushNotificationState,
  type PushHandlers,
} from "./push-notifications";
