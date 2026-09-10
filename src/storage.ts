import AsyncStorage from '@react-native-async-storage/async-storage';

import { Reminder, RepeatMode, Weekday } from './types';

const STORAGE_KEY = 'personal-reminders/v1';

const REPEAT_MODES: RepeatMode[] = ['none', 'daily', 'weekdays', 'weekly', 'custom'];

/**
 * Reminders are a small, flat list that is always read and written whole, so
 * AsyncStorage is a better fit than SQLite here: no schema, no migrations, no
 * query layer, and a single round trip on launch.
 */

/** Coerces one stored entry into a valid Reminder, or drops it if unusable. */
function parseReminder(raw: unknown): Reminder | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;

  const id = typeof r.id === 'string' ? r.id : null;
  const at = typeof r.at === 'string' ? r.at : null;
  if (!id || !at || Number.isNaN(new Date(at).getTime())) return null;

  const repeat = REPEAT_MODES.includes(r.repeat as RepeatMode) ? (r.repeat as RepeatMode) : 'none';

  const days = Array.isArray(r.days)
    ? (Array.from(new Set(r.days)).filter(
        (d): d is Weekday => typeof d === 'number' && Number.isInteger(d) && d >= 0 && d <= 6
      ) as Weekday[])
    : [];

  return {
    id,
    title: typeof r.title === 'string' && r.title.trim() ? r.title : 'Reminder',
    notes: typeof r.notes === 'string' ? r.notes : '',
    at,
    repeat,
    days: days.sort((a, b) => a - b),
    enabled: r.enabled !== false,
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : new Date().toISOString(),
    notificationIds: Array.isArray(r.notificationIds)
      ? r.notificationIds.filter((n): n is string => typeof n === 'string')
      : [],
  };
}

export async function loadReminders(): Promise<Reminder[]> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    if (!json) return [];
    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(parseReminder).filter((r): r is Reminder => r !== null);
  } catch (error) {
    // A corrupt blob shouldn't brick the app — start empty rather than crash.
    console.warn('Could not read saved reminders', error);
    return [];
  }
}

export async function saveReminders(reminders: Reminder[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
  } catch (error) {
    console.warn('Could not save reminders', error);
  }
}
