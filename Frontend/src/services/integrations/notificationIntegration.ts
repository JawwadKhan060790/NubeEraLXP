/**
 * Notification Integration
 *
 * Stub integration layer for in-app and push notifications.
 * Extend this file when a real notification provider (OneSignal, Firebase, etc.)
 * is connected — all feature code imports from this module so the swap is
 * transparent to callers.
 */

import { toast } from 'sonner';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationOptions {
  title?: string;
  message: string;
  type?: NotificationType;
  duration?: number;
}

/**
 * Shows a toast notification using the app's configured toast library (Sonner).
 * This is the single source of truth for in-app notifications — never call
 * toast() directly in feature code.
 */
export const showNotification = ({
  title,
  message,
  type = 'info',
  duration,
}: NotificationOptions): void => {
  const options = { description: title ? message : undefined, duration };
  const label   = title ?? message;

  switch (type) {
    case 'success': toast.success(label, options); break;
    case 'error':   toast.error(label, options);   break;
    case 'warning': toast.warning(label, options); break;
    default:        toast.info(label, options);    break;
  }
};

/** Shorthand helpers. */
export const notifySuccess = (message: string, title?: string) =>
  showNotification({ message, title, type: 'success' });

export const notifyError = (message: string, title?: string) =>
  showNotification({ message, title, type: 'error' });

export const notifyWarning = (message: string, title?: string) =>
  showNotification({ message, title, type: 'warning' });

export const notifyInfo = (message: string, title?: string) =>
  showNotification({ message, title, type: 'info' });
