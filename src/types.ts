export type RepeatMode = 'none' | 'daily' | 'weekdays' | 'weekly' | 'custom';

/** Day indices match `Date.prototype.getDay()`: 0 = Sunday … 6 = Saturday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type Reminder = {
  id: string;
  title: string;
  notes: string;
  /**
   * ISO timestamp of the reminder. The time-of-day always matters; the date part
   * only matters for `none` (the single fire date) and `weekly` (which weekday).
   */
  at: string;
  repeat: RepeatMode;
  /** Selected days, only meaningful when `repeat` is `custom`. */
  days: Weekday[];
  enabled: boolean;
  createdAt: string;
  /**
   * Identifiers returned by expo-notifications. A reminder that fires on several
   * weekdays needs one scheduled notification per day, hence an array.
   */
  notificationIds: string[];
};

/** The editable subset of a reminder — what the editor screen produces. */
export type ReminderDraft = Pick<
  Reminder,
  'title' | 'notes' | 'at' | 'repeat' | 'days' | 'enabled'
>;

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

export const REPEAT_OPTIONS: { value: RepeatMode; label: string }[] = [
  { value: 'none', label: 'Never' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'custom', label: 'Custom' },
];
