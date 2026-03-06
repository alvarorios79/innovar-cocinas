/**
 * Push Notifications Service
 * Handles sending Web Push notifications to subscribed users
 */

import webpush from 'web-push';
import { getDb } from '../db';
import { pushSubscriptions } from '../../drizzle/schema';
import { eq, and } from 'drizzle-orm';

// Configure Web Push
const vapidPublicKey = process.env.VITE_VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:support@innovarcitas.com';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
  actions?: Array<{ action: string; title: string }>;
}

/**
 * Send push notification to a specific user
 */
export async function sendPushNotificationToUser(
  userId: number,
  payload: PushNotificationPayload
): Promise<{ success: number; failed: number; errors: string[] }> {
  try {
    // Get all active subscriptions for the user
    const db = await getDb();
    if (!db) {
      return { success: 0, failed: 0, errors: ['Database connection failed'] };
    }
    const subscriptions = await db
      .select()
      .from(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, userId),
          eq(pushSubscriptions.isActive, 1)
        )
      );

    if (subscriptions.length === 0) {
      console.log(`[Push] No active subscriptions for user ${userId}`);
      return { success: 0, failed: 0, errors: ['No active subscriptions'] };
    }

    const results = { success: 0, failed: 0, errors: [] as string[] };

    // Send notification to each subscription
    for (const subscription of subscriptions) {
      try {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256Dh,
            auth: subscription.auth,
          },
        };

        const notificationPayload = JSON.stringify({
          title: payload.title,
          body: payload.body,
          icon: payload.icon || '/icon-192.png',
          badge: payload.badge || '/icon-192.png',
          tag: payload.tag || `notification-${Date.now()}`,
          data: payload.data || {},
          actions: payload.actions || [
            { action: 'open', title: 'Ver' },
            { action: 'dismiss', title: 'Cerrar' },
          ],
        });

        await webpush.sendNotification(pushSubscription, notificationPayload);

        // Update lastUsedAt timestamp
        const db = await getDb();
        if (db) {
          await db
            .update(pushSubscriptions)
            .set({ lastUsedAt: new Date().toISOString() })
            .where(eq(pushSubscriptions.id, subscription.id));
        }

        results.success++;
        console.log(`[Push] Notification sent to subscription ${subscription.id}`);
      } catch (error: any) {
        results.failed++;
        const errorMessage = error.message || 'Unknown error';
        results.errors.push(errorMessage);

        // If subscription is invalid (410 Gone), mark it as inactive
        if (error.statusCode === 410) {
          console.log(`[Push] Marking subscription ${subscription.id} as inactive (410 Gone)`);
          const db = await getDb();
          if (db) {
            await db
              .update(pushSubscriptions)
              .set({ isActive: 0 })
              .where(eq(pushSubscriptions.id, subscription.id));
          }
        } else {
          console.error(`[Push] Error sending notification to subscription ${subscription.id}:`, error);
        }
      }
    }

    return results;
  } catch (error) {
    console.error('[Push] Error in sendPushNotificationToUser:', error);
    return {
      success: 0,
      failed: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

/**
 * Send push notification to multiple users
 */
export async function sendPushNotificationToUsers(
  userIds: number[],
  payload: PushNotificationPayload
): Promise<{ totalSuccess: number; totalFailed: number; errors: string[] }> {
  const results = { totalSuccess: 0, totalFailed: 0, errors: [] as string[] };

  for (const userId of userIds) {
    const result = await sendPushNotificationToUser(userId, payload);
    results.totalSuccess += result.success;
    results.totalFailed += result.failed;
    results.errors.push(...result.errors);
  }

  return results;
}

/**
 * Send push notification to all active users
 */
export async function broadcastPushNotification(
  payload: PushNotificationPayload
): Promise<{ totalSuccess: number; totalFailed: number; errors: string[] }> {
  try {
    // Get all active subscriptions
    const db = await getDb();
    if (!db) {
      return { totalSuccess: 0, totalFailed: 0, errors: ['Database connection failed'] };
    }
    const subscriptions = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.isActive, 1));

    if (subscriptions.length === 0) {
      console.log('[Push] No active subscriptions for broadcast');
      return { totalSuccess: 0, totalFailed: 0, errors: ['No active subscriptions'] };
    }

    const results = { totalSuccess: 0, totalFailed: 0, errors: [] as string[] };

    // Send notification to each subscription
    for (const subscription of subscriptions) {
      try {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256Dh,
            auth: subscription.auth,
          },
        };

        const notificationPayload = JSON.stringify({
          title: payload.title,
          body: payload.body,
          icon: payload.icon || '/icon-192.png',
          badge: payload.badge || '/icon-192.png',
          tag: payload.tag || `broadcast-${Date.now()}`,
          data: payload.data || {},
          actions: payload.actions || [
            { action: 'open', title: 'Ver' },
            { action: 'dismiss', title: 'Cerrar' },
          ],
        });

        await webpush.sendNotification(pushSubscription, notificationPayload);
        results.totalSuccess++;
      } catch (error: any) {
        results.totalFailed++;
        const errorMessage = error.message || 'Unknown error';
        results.errors.push(errorMessage);

        // If subscription is invalid, mark it as inactive
        if (error.statusCode === 410) {
          const db = await getDb();
          if (db) {
            await db
              .update(pushSubscriptions)
              .set({ isActive: 0 })
              .where(eq(pushSubscriptions.id, subscription.id));
          }
        }
      }
    }

    console.log(`[Push] Broadcast complete: ${results.totalSuccess} sent, ${results.totalFailed} failed`);
    return results;
  } catch (error) {
    console.error('[Push] Error in broadcastPushNotification:', error);
    return {
      totalSuccess: 0,
      totalFailed: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

/**
 * Remove invalid subscriptions
 */
export async function cleanupInvalidSubscriptions(): Promise<number> {
  try {
    const db = await getDb();
    if (!db) {
      console.error('[Push] Database connection failed');
      return 0;
    }
    const result = await db
      .update(pushSubscriptions)
      .set({ isActive: 0 })
      .where(eq(pushSubscriptions.isActive, 0));

    return 0; // Drizzle doesn't return count, so we return 0
  } catch (error) {
    console.error('[Push] Error cleaning up subscriptions:', error);
    return 0;
  }
}
