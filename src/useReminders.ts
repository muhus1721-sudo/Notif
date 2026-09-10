import { useCallback, useEffect, useRef, useState } from 'react';

import {
  PermissionState,
  cancelNotifications,
  ensureAndroidChannel,
  getPermissionState,
  requestPermissions,
  resyncAll,
  scheduleReminder,
} from './notifications';
import { sortReminders } from './schedule';
import { loadReminders, saveReminders } from './storage';
import { Reminder, ReminderDraft } from './types';

function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export type RemindersStore = {
  reminders: Reminder[];
  ready: boolean;
  permission: PermissionState;
  /** Prompts for permission if the system still allows it. */
  askForPermission: () => Promise<PermissionState>;
  refreshPermission: () => Promise<void>;
  createReminder: (draft: ReminderDraft) => Promise<void>;
  updateReminder: (id: string, draft: ReminderDraft) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  toggleReminder: (id: string, enabled: boolean) => Promise<void>;
};

/**
 * Single source of truth for the app. Every mutation follows the same shape:
 * cancel whatever the reminder had scheduled, schedule what it needs now, then
 * persist — so storage and the OS schedule can't drift apart.
 */
export function useReminders(): RemindersStore {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [ready, setReady] = useState(false);
  const [permission, setPermission] = useState<PermissionState>('undetermined');

  // Mutations are queued so two quick taps can't interleave and clobber storage.
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  const commit = useCallback((next: Reminder[]) => {
    setReminders(sortReminders(next));
    return saveReminders(next);
  }, []);

  const enqueue = useCallback(<T,>(work: () => Promise<T>): Promise<T> => {
    const run = queue.current.then(work, work);
    queue.current = run.catch(() => undefined);
    return run;
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await ensureAndroidChannel();

      const [stored, state] = await Promise.all([loadReminders(), getPermissionState()]);
      if (cancelled) return;
      setPermission(state);

      // Show stored data immediately, then reconcile the OS schedule behind it.
      setReminders(sortReminders(stored));
      setReady(true);

      // Resync and its commit have to share one queue slot, otherwise a
      // reminder created mid-resync would be overwritten by the stale snapshot.
      await enqueue(async () => {
        const synced = await resyncAll(stored);
        if (!cancelled) await commit(synced);
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [commit, enqueue]);

  const refreshPermission = useCallback(async () => {
    setPermission(await getPermissionState());
  }, []);

  const askForPermission = useCallback(async () => {
    const state = await requestPermissions();
    setPermission(state);
    if (state === 'granted') {
      // Anything created before permission was granted still needs scheduling.
      await enqueue(async () => {
        const current = await loadReminders();
        await commit(await resyncAll(current));
      });
    }
    return state;
  }, [commit, enqueue]);

  const createReminder = useCallback(
    (draft: ReminderDraft) =>
      enqueue(async () => {
        const reminder: Reminder = {
          ...draft,
          id: createId(),
          createdAt: new Date().toISOString(),
          notificationIds: [],
        };
        reminder.notificationIds = await scheduleReminder(reminder);
        const current = await loadReminders();
        await commit([...current, reminder]);
      }),
    [commit, enqueue]
  );

  const updateReminder = useCallback(
    (id: string, draft: ReminderDraft) =>
      enqueue(async () => {
        const current = await loadReminders();
        const existing = current.find((r) => r.id === id);
        if (!existing) return;

        await cancelNotifications(existing.notificationIds);
        const updated: Reminder = { ...existing, ...draft, notificationIds: [] };
        updated.notificationIds = await scheduleReminder(updated);
        await commit(current.map((r) => (r.id === id ? updated : r)));
      }),
    [commit, enqueue]
  );

  const deleteReminder = useCallback(
    (id: string) =>
      enqueue(async () => {
        const current = await loadReminders();
        const existing = current.find((r) => r.id === id);
        if (existing) await cancelNotifications(existing.notificationIds);
        await commit(current.filter((r) => r.id !== id));
      }),
    [commit, enqueue]
  );

  const toggleReminder = useCallback(
    (id: string, enabled: boolean) => {
      // Flip the switch straight away; the scheduling work catches up after.
      setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, enabled } : r)));
      return enqueue(async () => {
        const current = await loadReminders();
        const existing = current.find((r) => r.id === id);
        if (!existing) return;

        await cancelNotifications(existing.notificationIds);
        const updated: Reminder = { ...existing, enabled, notificationIds: [] };
        updated.notificationIds = await scheduleReminder(updated);
        await commit(current.map((r) => (r.id === id ? updated : r)));
      });
    },
    [commit, enqueue]
  );

  return {
    reminders,
    ready,
    permission,
    askForPermission,
    refreshPermission,
    createReminder,
    updateReminder,
    deleteReminder,
    toggleReminder,
  };
}
