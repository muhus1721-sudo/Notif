import { Reminder, RepeatMode, Weekday, WEEKDAY_LABELS } from './types';

export const WEEKDAYS_MON_FRI: Weekday[] = [1, 2, 3, 4, 5];

/**
 * The days a reminder fires on, or `null` when the repeat mode isn't day-based
 * (`none` fires once, `daily` fires every day).
 */
export function activeDays(reminder: Pick<Reminder, 'repeat' | 'days' | 'at'>): Weekday[] | null {
  switch (reminder.repeat) {
    case 'weekdays':
      return WEEKDAYS_MON_FRI;
    case 'weekly':
      return [new Date(reminder.at).getDay() as Weekday];
    case 'custom':
      return [...reminder.days].sort((a, b) => a - b);
    default:
      return null;
  }
}

/** A copy of `from`, shifted by whole days and pinned to `hour`:`minute`. */
function dayAt(from: Date, addDays: number, hour: number, minute: number): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + addDays);
  d.setHours(hour, minute, 0, 0);
  return d;
}

/**
 * The next moment this reminder will fire, or `null` if it never will again
 * (a one-off whose time has passed, or a custom repeat with no days picked).
 * Ignores `enabled` — callers decide what a disabled reminder should show.
 */
export function nextOccurrence(
  reminder: Pick<Reminder, 'repeat' | 'days' | 'at'>,
  from: Date = new Date()
): Date | null {
  const base = new Date(reminder.at);
  if (Number.isNaN(base.getTime())) return null;

  const hour = base.getHours();
  const minute = base.getMinutes();

  if (reminder.repeat === 'none') {
    return base.getTime() > from.getTime() ? base : null;
  }

  if (reminder.repeat === 'daily') {
    const today = dayAt(from, 0, hour, minute);
    return today.getTime() > from.getTime() ? today : dayAt(from, 1, hour, minute);
  }

  const days = new Set(activeDays(reminder) ?? []);
  if (days.size === 0) return null;

  // Walk forward a full week; the first matching day that is still ahead wins.
  for (let offset = 0; offset < 8; offset++) {
    const candidate = dayAt(from, offset, hour, minute);
    if (days.has(candidate.getDay() as Weekday) && candidate.getTime() > from.getTime()) {
      return candidate;
    }
  }
  return null;
}

/** True when a one-off reminder's moment has already gone by. */
export function isExpired(reminder: Pick<Reminder, 'repeat' | 'days' | 'at'>): boolean {
  return reminder.repeat === 'none' && nextOccurrence(reminder) === null;
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  });
}

/** "Every weekday", "Sun, Wed & Fri", "Once" … — the row's repeat summary. */
export function describeRepeat(reminder: Pick<Reminder, 'repeat' | 'days' | 'at'>): string {
  switch (reminder.repeat) {
    case 'none':
      return 'Once';
    case 'daily':
      return 'Every day';
    case 'weekdays':
      return 'Every weekday';
    case 'weekly':
      return `Every ${WEEKDAY_LABELS[new Date(reminder.at).getDay()]}`;
    case 'custom': {
      const days = activeDays(reminder) ?? [];
      if (days.length === 0) return 'No days selected';
      if (days.length === 7) return 'Every day';
      const names = days.map((d) => WEEKDAY_LABELS[d]);
      if (names.length === 1) return `Every ${names[0]}`;
      return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
    }
  }
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Relative phrasing for the next fire time: "in 20 min", "Tomorrow, 7:30 AM". */
export function describeNext(date: Date | null, from: Date = new Date()): string {
  if (!date) return 'Not scheduled';

  const diff = date.getTime() - from.getTime();
  if (diff < MINUTE) return 'in less than a minute';
  if (diff < HOUR) return `in ${Math.round(diff / MINUTE)} min`;

  const startOfToday = new Date(from);
  startOfToday.setHours(0, 0, 0, 0);
  const daysAhead = Math.floor((date.getTime() - startOfToday.getTime()) / DAY);

  if (daysAhead === 0) return `Today, ${formatTime(date)}`;
  if (daysAhead === 1) return `Tomorrow, ${formatTime(date)}`;
  if (daysAhead < 7) return `${WEEKDAY_LABELS[date.getDay()]}, ${formatTime(date)}`;
  return `${formatDate(date)}, ${formatTime(date)}`;
}

/** Sort key: soonest first, with unscheduled reminders sinking to the bottom. */
export function sortKey(reminder: Reminder): number {
  const next = nextOccurrence(reminder);
  if (!next) return Number.MAX_SAFE_INTEGER;
  return next.getTime();
}

/**
 * Soonest first. Deliberately ignores `enabled` so that flipping a switch never
 * makes a row jump out from under the finger that tapped it.
 */
export function sortReminders(reminders: Reminder[]): Reminder[] {
  return [...reminders].sort((a, b) => {
    const delta = sortKey(a) - sortKey(b);
    if (delta !== 0) return delta;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

/** Whether a draft in this repeat mode needs a calendar date from the user. */
export function repeatUsesDate(repeat: RepeatMode): boolean {
  return repeat === 'none' || repeat === 'weekly';
}
