import DateTimePicker, {
  DateTimePickerAndroid,
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  describeNext,
  formatDate,
  formatTime,
  nextOccurrence,
  repeatUsesDate,
} from '../schedule';
import { radius, space, useTheme } from '../theme';
import { REPEAT_OPTIONS, Reminder, ReminderDraft, RepeatMode, Weekday } from '../types';
import { DayPicker } from './DayPicker';
import { Segmented } from './Segmented';

type Props = {
  visible: boolean;
  /** The reminder being edited, or null when creating a new one. */
  reminder: Reminder | null;
  onSave: (draft: ReminderDraft) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
};

/** A sensible default for a brand new reminder: the next full hour. */
function defaultTime(): Date {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return d;
}

/** Replaces only the calendar date of `base`, keeping its time of day. */
function withDate(base: Date, date: Date): Date {
  const next = new Date(base);
  next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
  return next;
}

/** Replaces only the time of day of `base`, keeping its calendar date. */
function withTime(base: Date, time: Date): Date {
  const next = new Date(base);
  next.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return next;
}

export function ReminderEditor({ visible, reminder, onSave, onDelete, onClose }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [at, setAt] = useState<Date>(defaultTime);
  const [repeat, setRepeat] = useState<RepeatMode>('none');
  const [days, setDays] = useState<Weekday[]>([]);
  const [enabled, setEnabled] = useState(true);
  /** Which inline picker is open (iOS only; Android uses a system dialog). */
  const [openPicker, setOpenPicker] = useState<'date' | 'time' | null>(null);

  // Reset the form every time the sheet is opened.
  useEffect(() => {
    if (!visible) return;
    setTitle(reminder?.title ?? '');
    setNotes(reminder?.notes ?? '');
    setAt(reminder ? new Date(reminder.at) : defaultTime());
    setRepeat(reminder?.repeat ?? 'none');
    setDays(reminder?.days ?? []);
    setEnabled(reminder?.enabled ?? true);
    setOpenPicker(null);
  }, [visible, reminder]);

  const draft = useMemo<ReminderDraft>(
    () => ({ title: title.trim(), notes: notes.trim(), at: at.toISOString(), repeat, days, enabled }),
    [title, notes, at, repeat, days, enabled]
  );

  const missingTitle = draft.title.length === 0;
  const missingDays = repeat === 'custom' && days.length === 0;
  const inThePast = repeat === 'none' && at.getTime() <= Date.now();
  const canSave = !missingTitle && !missingDays && !inThePast;

  const problem = missingTitle
    ? 'Give the reminder a title.'
    : missingDays
      ? 'Pick at least one day.'
      : inThePast
        ? 'That time has already passed — pick a future date and time.'
        : null;

  const showDateRow = repeatUsesDate(repeat);

  const applyDate = (picked: Date) => setAt((prev) => withDate(prev, picked));
  const applyTime = (picked: Date) => setAt((prev) => withTime(prev, picked));

  const openAndroidPicker = (mode: 'date' | 'time') => {
    DateTimePickerAndroid.open({
      value: at,
      mode,
      minimumDate: mode === 'date' && repeat === 'none' ? new Date() : undefined,
      onChange: (event: DateTimePickerEvent, picked?: Date) => {
        if (event.type !== 'set' || !picked) return;
        if (mode === 'date') applyDate(picked);
        else applyTime(picked);
      },
    });
  };

  const togglePicker = (mode: 'date' | 'time') => {
    if (Platform.OS === 'android') openAndroidPicker(mode);
    else setOpenPicker((prev) => (prev === mode ? null : mode));
  };

  const confirmDelete = () => {
    if (!reminder) return;
    Alert.alert('Delete reminder?', `"${reminder.title}" will be removed for good.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(reminder.id) },
    ]);
  };

  const preview = describeNext(nextOccurrence(draft));

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={onClose}
      // iOS sheets can also be swiped away, which bypasses onRequestClose.
      onDismiss={Platform.OS === 'ios' ? onClose : undefined}
    >
      <KeyboardAvoidingView
        style={[styles.flex, { backgroundColor: t.bg }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          style={[
            styles.header,
            {
              borderBottomColor: t.border,
              // On Android the modal is full-screen and sits under the status bar.
              paddingTop: Platform.OS === 'android' ? insets.top + space.md : space.lg,
            },
          ]}
        >
          <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button">
            <Text style={[styles.headerAction, { color: t.textDim }]}>Cancel</Text>
          </Pressable>

          <Text style={[styles.headerTitle, { color: t.text }]}>
            {reminder ? 'Edit reminder' : 'New reminder'}
          </Text>

          <Pressable
            onPress={() => canSave && onSave(draft)}
            disabled={!canSave}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSave }}
          >
            <Text style={[styles.headerAction, styles.save, { color: canSave ? t.accent : t.textFaint }]}>
              Save
            </Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xxl }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="What's the reminder?"
              placeholderTextColor={t.textFaint}
              style={[styles.input, styles.titleInput, { color: t.text }]}
              autoFocus={!reminder}
              returnKeyType="done"
              maxLength={80}
            />
            <View style={[styles.divider, { backgroundColor: t.border }]} />
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Notes (optional)"
              placeholderTextColor={t.textFaint}
              style={[styles.input, styles.notesInput, { color: t.textDim }]}
              multiline
              maxLength={300}
            />
          </View>

          <Text style={[styles.sectionLabel, { color: t.textFaint }]}>WHEN</Text>
          <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
            {showDateRow ? (
              <>
                <PickerRow
                  label="Date"
                  value={formatDate(at)}
                  active={openPicker === 'date'}
                  onPress={() => togglePicker('date')}
                />
                {openPicker === 'date' && Platform.OS === 'ios' ? (
                  <DateTimePicker
                    value={at}
                    mode="date"
                    display="inline"
                    themeVariant={t.dark ? 'dark' : 'light'}
                    accentColor={t.accent}
                    minimumDate={repeat === 'none' ? new Date() : undefined}
                    onChange={(_event: DateTimePickerEvent, picked?: Date) =>
                      picked && applyDate(picked)
                    }
                  />
                ) : null}
                <View style={[styles.divider, { backgroundColor: t.border }]} />
              </>
            ) : null}

            <PickerRow
              label="Time"
              value={formatTime(at)}
              active={openPicker === 'time'}
              onPress={() => togglePicker('time')}
            />
            {openPicker === 'time' && Platform.OS === 'ios' ? (
              <DateTimePicker
                value={at}
                mode="time"
                display="spinner"
                themeVariant={t.dark ? 'dark' : 'light'}
                onChange={(_event: DateTimePickerEvent, picked?: Date) =>
                  picked && applyTime(picked)
                }
              />
            ) : null}
          </View>

          <Text style={[styles.sectionLabel, { color: t.textFaint }]}>REPEAT</Text>
          <Segmented
            options={REPEAT_OPTIONS}
            value={repeat}
            onChange={(next) => {
              setRepeat(next);
              // Seed a custom schedule with the day the reminder is already on.
              if (next === 'custom' && days.length === 0) setDays([at.getDay() as Weekday]);
              if (Platform.OS === 'ios' && !repeatUsesDate(next)) setOpenPicker(null);
            }}
          />

          {repeat === 'custom' ? (
            <View style={styles.dayPicker}>
              <DayPicker value={days} onChange={setDays} />
            </View>
          ) : null}

          <View style={[styles.preview, { backgroundColor: t.accentSoft }]}>
            <Text style={[styles.previewLabel, { color: t.textDim }]}>Next</Text>
            <Text style={[styles.previewValue, { color: t.text }]}>
              {problem ? '—' : preview}
            </Text>
          </View>

          {problem ? (
            <Text style={[styles.problem, { color: t.danger }]}>{problem}</Text>
          ) : null}

          {reminder ? (
            <Pressable
              onPress={confirmDelete}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.delete,
                { backgroundColor: t.dangerSoft, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={[styles.deleteLabel, { color: t.danger }]}>Delete reminder</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function PickerRow({
  label,
  value,
  active,
  onPress,
}: {
  label: string;
  value: string;
  active: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      style={({ pressed }) => [styles.pickerRow, { opacity: pressed ? 0.7 : 1 }]}
    >
      <Text style={[styles.pickerLabel, { color: t.text }]}>{label}</Text>
      <View style={[styles.pickerValue, { backgroundColor: active ? t.accentSoft : t.inset }]}>
        <Text style={[styles.pickerValueText, { color: active ? t.accent : t.textDim }]}>
          {value}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  headerAction: { fontSize: 16 },
  save: { fontWeight: '700' },
  content: { padding: space.lg, gap: space.md },
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  input: { paddingHorizontal: space.lg, paddingVertical: space.md + 2, fontSize: 16 },
  titleInput: { fontSize: 18, fontWeight: '600' },
  notesInput: { minHeight: 76, textAlignVertical: 'top' },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: space.lg },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginTop: space.md,
    marginLeft: space.xs,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingVertical: space.md + 2,
  },
  pickerLabel: { fontSize: 16 },
  pickerValue: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm - 2,
    borderRadius: radius.sm,
  },
  pickerValueText: { fontSize: 15, fontWeight: '600' },
  dayPicker: { marginTop: space.xs },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.md,
    marginTop: space.sm,
  },
  previewLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6 },
  previewValue: { fontSize: 15, fontWeight: '600' },
  problem: { fontSize: 13, marginLeft: space.xs },
  delete: {
    marginTop: space.lg,
    paddingVertical: space.md + 2,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  deleteLabel: { fontSize: 16, fontWeight: '600' },
});
