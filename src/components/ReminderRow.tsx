import * as Haptics from 'expo-haptics';
import React from 'react';
import { Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { describeNext, describeRepeat, isExpired, nextOccurrence } from '../schedule';
import { radius, space, useTheme } from '../theme';
import { Reminder } from '../types';

type Props = {
  reminder: Reminder;
  onPress: () => void;
  onToggle: (enabled: boolean) => void;
};

/** Splits "7:30 AM" into the number and its suffix so they can be styled apart. */
function splitTime(date: Date): { clock: string; suffix: string } {
  const formatted = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const match = formatted.match(/^(.*?)\s*([AaPp][Mm.]*)$/);
  if (!match) return { clock: formatted, suffix: '' };
  return { clock: match[1], suffix: match[2].toUpperCase() };
}

export function ReminderRow({ reminder, onPress, onToggle }: Props) {
  const t = useTheme();
  const { clock, suffix } = splitTime(new Date(reminder.at));
  const expired = isExpired(reminder);
  const muted = !reminder.enabled || expired;

  const status = !reminder.enabled
    ? 'Off'
    : expired
      ? 'Time passed'
      : describeNext(nextOccurrence(reminder));

  const handleToggle = (enabled: boolean) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync().catch(() => undefined);
    }
    onToggle(enabled);
  };

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${reminder.title}, ${clock} ${suffix}, ${describeRepeat(reminder)}`}
      accessibilityHint="Opens this reminder for editing"
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: t.card, borderColor: t.border, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={styles.time}>
        <Text
          style={[styles.clock, { color: muted ? t.textFaint : t.text }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {clock}
        </Text>
        {suffix ? (
          <Text style={[styles.suffix, { color: muted ? t.textFaint : t.textDim }]}>{suffix}</Text>
        ) : null}
      </View>

      <View style={styles.body}>
        <Text style={[styles.title, { color: muted ? t.textDim : t.text }]} numberOfLines={1}>
          {reminder.title}
        </Text>
        <Text style={[styles.meta, { color: t.textDim }]} numberOfLines={1}>
          {describeRepeat(reminder)}
        </Text>
        <Text
          style={[styles.status, { color: expired && reminder.enabled ? t.danger : t.textFaint }]}
          numberOfLines={1}
        >
          {status}
        </Text>
      </View>

      <Switch
        value={reminder.enabled}
        onValueChange={handleToggle}
        accessibilityLabel={`Turn ${reminder.title} ${reminder.enabled ? 'off' : 'on'}`}
        trackColor={{ false: t.inset, true: t.accent }}
        thumbColor={Platform.OS === 'android' ? (reminder.enabled ? '#FFFFFF' : t.textFaint) : undefined}
        ios_backgroundColor={t.inset}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  time: { width: 64, alignItems: 'flex-start' },
  clock: { fontSize: 26, fontWeight: '700', fontVariant: ['tabular-nums'], letterSpacing: -0.5 },
  suffix: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginTop: 1 },
  body: { flex: 1, gap: 2 },
  title: { fontSize: 16, fontWeight: '600' },
  meta: { fontSize: 13 },
  status: { fontSize: 12 },
});
