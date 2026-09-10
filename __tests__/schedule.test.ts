import {
  activeDays,
  describeNext,
  describeRepeat,
  isExpired,
  nextOccurrence,
  sortReminders,
} from '../src/schedule';
import { Reminder } from '../src/types';

const base = (overrides: Partial<Reminder> = {}): Reminder => ({
  id: 'id',
  title: 'Reminder',
  notes: '',
  at: new Date(2026, 8, 9, 9, 0).toISOString(),
  repeat: 'none',
  days: [],
  enabled: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  notificationIds: [],
  ...overrides,
});

/** Wednesday, 9 September 2026, 10:00 local time. */
const NOW = new Date(2026, 8, 9, 10, 0, 0, 0);
const at = (y: number, m: number, d: number, h: number, min = 0) =>
  new Date(y, m, d, h, min).toISOString();
const show = (date: Date | null) =>
  date ? `${date.toDateString()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}` : null;

describe('nextOccurrence', () => {
  it('returns a one-off still ahead of us, and null once it has passed', () => {
    expect(show(nextOccurrence(base({ at: at(2026, 8, 9, 18, 30) }), NOW))).toBe(
      'Wed Sep 09 2026 18:30'
    );
    expect(nextOccurrence(base({ at: at(2026, 8, 9, 7, 0) }), NOW)).toBeNull();
  });

  it('rolls a daily reminder to tomorrow once today’s slot is gone', () => {
    const daily = (h: number) => base({ repeat: 'daily', at: at(2020, 0, 1, h) });
    expect(show(nextOccurrence(daily(22), NOW))).toBe('Wed Sep 09 2026 22:00');
    expect(show(nextOccurrence(daily(6), NOW))).toBe('Thu Sep 10 2026 6:00');
  });

  it('anchors a weekly reminder to the weekday of its date', () => {
    const monday = base({ repeat: 'weekly', at: at(2026, 8, 7, 9) });
    expect(show(nextOccurrence(monday, NOW))).toBe('Mon Sep 14 2026 9:00');

    // Same weekday as today, but the time has already gone by: next week.
    const wednesday = base({ repeat: 'weekly', at: at(2026, 8, 2, 8) });
    expect(show(nextOccurrence(wednesday, NOW))).toBe('Wed Sep 16 2026 8:00');
  });

  it('skips the weekend for weekday reminders', () => {
    const reminder = base({ repeat: 'weekdays', at: at(2020, 0, 1, 8) });
    expect(show(nextOccurrence(reminder, NOW))).toBe('Thu Sep 10 2026 8:00');

    const fridayEvening = new Date(2026, 8, 11, 18, 0);
    expect(show(nextOccurrence(reminder, fridayEvening))).toBe('Mon Sep 14 2026 8:00');
  });

  it('handles custom day selections, including an empty one', () => {
    const weekend = base({ repeat: 'custom', days: [0, 6], at: at(2020, 0, 1, 11, 30) });
    expect(show(nextOccurrence(weekend, NOW))).toBe('Sat Sep 12 2026 11:30');

    expect(nextOccurrence(base({ repeat: 'custom', days: [] }), NOW)).toBeNull();
  });
});

describe('describeRepeat', () => {
  it.each([
    [base(), 'Once'],
    [base({ repeat: 'daily' }), 'Every day'],
    [base({ repeat: 'weekdays' }), 'Every weekday'],
    [base({ repeat: 'weekly', at: at(2026, 8, 7, 9) }), 'Every Mon'],
    [base({ repeat: 'custom', days: [1, 3, 5] }), 'Mon, Wed & Fri'],
    [base({ repeat: 'custom', days: [2] }), 'Every Tue'],
    [base({ repeat: 'custom', days: [0, 1, 2, 3, 4, 5, 6] }), 'Every day'],
    [base({ repeat: 'custom', days: [] }), 'No days selected'],
  ])('describes %#', (reminder, expected) => {
    expect(describeRepeat(reminder)).toBe(expected);
  });
});

describe('describeNext', () => {
  it('prefers relative phrasing close by and day names further out', () => {
    expect(describeNext(new Date(2026, 8, 9, 10, 20), NOW)).toBe('in 20 min');
    expect(describeNext(new Date(2026, 8, 9, 17, 5), NOW)).toMatch(/^Today, /);
    expect(describeNext(new Date(2026, 8, 10, 7, 30), NOW)).toMatch(/^Tomorrow, /);
    expect(describeNext(new Date(2026, 8, 12, 7, 30), NOW)).toMatch(/^Sat, /);
    expect(describeNext(null, NOW)).toBe('Not scheduled');
  });
});

describe('expo trigger mapping', () => {
  // expo-notifications numbers weekdays 1–7 starting at Sunday, so every
  // day index the app stores has to be shifted by one when scheduling.
  it('maps stored day indices onto expo weekday numbers', () => {
    expect(activeDays(base({ repeat: 'weekdays' }))!.map((d) => d + 1)).toEqual([2, 3, 4, 5, 6]);
    expect(activeDays(base({ repeat: 'weekly', at: at(2026, 8, 6, 9) }))!.map((d) => d + 1)).toEqual(
      [1]
    );
    expect(activeDays(base({ repeat: 'daily' }))).toBeNull();
  });

  it('only treats one-off reminders as expirable', () => {
    expect(isExpired(base({ at: at(2020, 0, 1, 9) }))).toBe(true);
    expect(isExpired(base({ repeat: 'daily', at: at(2020, 0, 1, 9) }))).toBe(false);
  });
});

describe('sortReminders', () => {
  it('orders by next fire time and leaves disabled rows in place', () => {
    const list = [
      base({ id: 'late', repeat: 'daily', at: at(2020, 0, 1, 23), createdAt: '1' }),
      base({ id: 'off-early', repeat: 'daily', at: at(2020, 0, 1, 11), enabled: false, createdAt: '2' }),
      base({ id: 'expired', at: at(2020, 0, 1, 9), createdAt: '3' }),
    ];
    expect(sortReminders(list).map((r) => r.id)).toEqual(['off-early', 'late', 'expired']);
  });
});
