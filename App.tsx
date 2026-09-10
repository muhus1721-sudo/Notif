import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  SafeAreaProvider,
  initialWindowMetrics,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { EmptyState } from './src/components/EmptyState';
import { PermissionBanner } from './src/components/PermissionBanner';
import { ReminderEditor } from './src/components/ReminderEditor';
import { ReminderRow } from './src/components/ReminderRow';
import { describeNext, nextOccurrence } from './src/schedule';
import { radius, space, useTheme } from './src/theme';
import { Reminder, ReminderDraft } from './src/types';
import { useReminders } from './src/useReminders';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function Home() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const store = useReminders();
  const { ready, permission, askForPermission, refreshPermission } = store;

  const [editing, setEditing] = useState<Reminder | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  /** Bumped on a timer so relative labels ("in 20 min") stay honest. */
  const [, setTick] = useState(0);

  const askedOnLaunch = useRef(false);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  // Ask for notification permission once, on the first launch that needs it.
  useEffect(() => {
    if (!ready || askedOnLaunch.current) return;
    if (permission !== 'undetermined') return;
    askedOnLaunch.current = true;
    askForPermission().catch(() => undefined);
  }, [askForPermission, permission, ready]);

  // Coming back from system settings may mean permission changed under us.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshPermission().catch(() => undefined);
    });
    return () => sub.remove();
  }, [refreshPermission]);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  // Tapping a delivered notification opens that reminder.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as
        | { reminderId?: string }
        | undefined;
      const match = store.reminders.find((r) => r.id === data?.reminderId);
      if (match) {
        setEditing(match);
        setEditorOpen(true);
      }
    });
    return () => sub.remove();
  }, [store.reminders]);

  const openNew = useCallback(() => {
    setEditing(null);
    setEditorOpen(true);
  }, []);

  const openExisting = useCallback((reminder: Reminder) => {
    setEditing(reminder);
    setEditorOpen(true);
  }, []);

  const closeEditor = useCallback(() => {
    setEditorOpen(false);
    setEditing(null);
  }, []);

  const handleSave = useCallback(
    (draft: ReminderDraft) => {
      if (editing) store.updateReminder(editing.id, draft);
      else store.createReminder(draft);
      closeEditor();
    },
    [closeEditor, editing, store]
  );

  const handleDelete = useCallback(
    (id: string) => {
      store.deleteReminder(id);
      closeEditor();
    },
    [closeEditor, store]
  );

  const upcoming = store.reminders.filter((r) => r.enabled && nextOccurrence(r));
  const subtitle = !store.reminders.length
    ? 'No reminders yet'
    : upcoming.length
      ? `Next · ${describeNext(nextOccurrence(upcoming[0]))}`
      : `${store.reminders.length} reminder${store.reminders.length === 1 ? '' : 's'} · none active`;

  return (
    <View style={[styles.screen, { backgroundColor: t.bg, paddingTop: insets.top }]}>
      <StatusBar style={t.dark ? 'light' : 'dark'} />

      <View style={styles.header}>
        <Text style={[styles.heading, { color: t.text }]}>Reminders</Text>
        <Text style={[styles.subheading, { color: t.textDim }]}>{subtitle}</Text>
      </View>

      {!ready ? (
        <View style={styles.loading}>
          <ActivityIndicator color={t.textDim} />
        </View>
      ) : (
        <FlatList
          data={store.reminders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + space.xxl * 2.5 },
          ]}
          ListHeaderComponent={
            <PermissionBanner state={permission} onRequest={askForPermission} />
          }
          ListHeaderComponentStyle={permission === 'granted' ? undefined : styles.bannerSpacing}
          ListEmptyComponent={<EmptyState />}
          renderItem={({ item }) => (
            <ReminderRow
              reminder={item}
              onPress={() => openExisting(item)}
              onToggle={(enabled) => store.toggleReminder(item.id, enabled)}
            />
          )}
          keyboardShouldPersistTaps="handled"
        />
      )}

      <Pressable
        onPress={openNew}
        accessibilityRole="button"
        accessibilityLabel="Add reminder"
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: t.accent,
            bottom: insets.bottom + space.xl,
            transform: [{ scale: pressed ? 0.94 : 1 }],
          },
        ]}
      >
        <Text style={[styles.fabIcon, { color: t.accentText }]}>+</Text>
      </Pressable>

      <ReminderEditor
        visible={editorOpen}
        reminder={editing}
        onSave={handleSave}
        onDelete={handleDelete}
        onClose={closeEditor}
      />
    </View>
  );
}

export default function App() {
  return (
    // initialWindowMetrics lets the first frame render with correct insets
    // instead of a blank frame while the provider measures itself.
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <Home />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.md },
  heading: { fontSize: 32, fontWeight: '800', letterSpacing: -0.8 },
  subheading: { fontSize: 14, marginTop: 2 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: space.lg, gap: space.md },
  bannerSpacing: { marginBottom: space.md },
  fab: {
    position: 'absolute',
    right: space.xl,
    width: 60,
    height: 60,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    // A soft lift so the button reads as floating over the list.
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  fabIcon: { fontSize: 32, fontWeight: '300', lineHeight: 36, marginTop: -2 },
});
