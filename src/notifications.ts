import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { activeDays, nextOccurrence } from './schedule';
import { Reminder } from './types';

export const ANDROID_CHANNEL_ID = 'reminders';

/**
 * Tags every notification this app schedules, so a resync can clean up after
 * itself without touching notifications scheduled by anything else (which
 * matters in Expo Go, where the notification namespace is shared).
 */
const APP_TAG = 'personal-reminders';

/** Show the notification even if the app happens to be in the foreground. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Android needs a channel before anything can be posted to it; importance MAX
 * is what makes a reminder heads-up rather than a silent tray entry.
 */
export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Reminders',
    description: 'Scheduled personal reminders',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    enableVibrate: true,
    lightColor: '#6C8CFF',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    showBadge: false,
  });
}

export type PermissionState = 'granted' | 'denied' | 'undetermined';

function toState(
  status: Notifications.NotificationPermissionsStatus
): PermissionState {
  if (status.granted) return 'granted';
  // iOS provisional authorisation still delivers (quietly), so treat it as granted.
  if (status.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return 'granted';
  return status.canAskAgain ? 'undetermined' : 'denied';
}

export async function getPermissionState(): Promise<PermissionState> {
  return toState(await Notifications.getPermissionsAsync());
}

/** Prompts only when the system will actually show a prompt. */
export async function requestPermissions(): Promise<PermissionState> {
  const current = await Notifications.getPermissionsAsync();
  if (toState(current) === 'granted') return 'granted';
  if (!current.canAskAgain) return 'denied';

  const result = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: true },
  });
  return toState(result);
}

function contentFor(reminder: Reminder): Notifications.NotificationContentInput {
  return {
    title: reminder.title,
    body: reminder.notes.trim() || undefined,
    sound: 'default',
    data: { app: APP_TAG, reminderId: reminder.id },
  };
}

/**
 * Schedules a reminder and returns the notification ids it now owns.
 *
 * Repeat modes that fire on specific weekdays need one weekly trigger per day,
 * because expo-notifications' weekly trigger takes a single weekday.
 */
export async function scheduleReminder(reminder: Reminder): Promise<string[]> {
  if (!reminder.enabled) return [];

  const base = new Date(reminder.at);
  const hour = base.getHours();
  const minute = base.getMinutes();
  const channelId = Platform.OS === 'android' ? ANDROID_CHANNEL_ID : undefined;
  const content = contentFor(reminder);

  if (reminder.repeat === 'none') {
    // A one-off in the past has nothing left to fire.
    if (nextOccurrence(reminder) === null) return [];
    const id = await Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: base,
        channelId,
      },
    });
    return [id];
  }

  if (reminder.repeat === 'daily') {
    const id = await Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId,
      },
    });
    return [id];
  }

  const days = activeDays(reminder) ?? [];
  return Promise.all(
    days.map((day) =>
      Notifications.scheduleNotificationAsync({
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          // expo-notifications counts weekdays 1–7 starting at Sunday.
          weekday: day + 1,
          hour,
          minute,
          channelId,
        },
      })
    )
  );
}

export async function cancelNotifications(ids: string[]): Promise<void> {
  await Promise.all(
    ids.map((id) =>
      Notifications.cancelScheduledNotificationAsync(id).catch(() => {
        // Already gone (cleared by the OS, or cancelled twice) — nothing to do.
      })
    )
  );
}

/**
 * Rebuilds the OS-level schedule from the stored reminders and returns the list
 * with fresh notification ids.
 *
 * Worth doing on every launch: the OS drops pending notifications on reinstall,
 * on some Android OEM cleanups, and whenever Expo Go reloads a different
 * project, which would otherwise leave reminders silently unscheduled.
 */
export async function resyncAll(reminders: Reminder[]): Promise<Reminder[]> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await cancelNotifications(
    scheduled
      .filter((n) => (n.content.data as { app?: string } | undefined)?.app === APP_TAG)
      .map((n) => n.identifier)
  );

  const result: Reminder[] = [];
  for (const reminder of reminders) {
    try {
      result.push({ ...reminder, notificationIds: await scheduleReminder(reminder) });
    } catch (error) {
      console.warn(`Could not schedule "${reminder.title}"`, error);
      result.push({ ...reminder, notificationIds: [] });
    }
  }
  return result;
}
