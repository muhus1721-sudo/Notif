import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, space, useTheme } from '../theme';
import { WEEKDAY_INITIALS, WEEKDAY_LABELS, Weekday } from '../types';

const ALL_DAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6];

type Props = {
  value: Weekday[];
  onChange: (days: Weekday[]) => void;
};

/** S M T W T F S toggles for the "custom" repeat mode. */
export function DayPicker({ value, onChange }: Props) {
  const t = useTheme();
  const selected = new Set(value);

  const toggle = (day: Weekday) => {
    const next = new Set(selected);
    if (next.has(day)) next.delete(day);
    else next.add(day);
    onChange([...next].sort((a, b) => a - b));
  };

  return (
    <View style={styles.row}>
      {ALL_DAYS.map((day) => {
        const on = selected.has(day);
        return (
          <Pressable
            key={day}
            onPress={() => toggle(day)}
            accessibilityRole="checkbox"
            accessibilityLabel={WEEKDAY_LABELS[day]}
            accessibilityState={{ checked: on }}
            style={({ pressed }) => [
              styles.day,
              {
                backgroundColor: on ? t.accent : t.inset,
                borderColor: on ? t.accent : t.border,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <Text style={[styles.label, { color: on ? t.accentText : t.textDim }]}>
              {WEEKDAY_INITIALS[day]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: space.xs },
  day: {
    flex: 1,
    aspectRatio: 1,
    maxHeight: 46,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 14, fontWeight: '700' },
});
