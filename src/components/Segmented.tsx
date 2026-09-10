import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { radius, space, useTheme } from '../theme';

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

/** Horizontally scrollable pill group — the repeat picker. */
export function Segmented<T extends string>({ options, value, onChange }: Props<T>) {
  const t = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      keyboardShouldPersistTaps="handled"
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={({ pressed }) => [
              styles.pill,
              {
                backgroundColor: selected ? t.accent : t.inset,
                borderColor: selected ? t.accent : t.border,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.label,
                { color: selected ? t.accentText : t.textDim },
                selected && styles.labelSelected,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: space.sm, paddingRight: space.lg },
  pill: {
    paddingHorizontal: space.lg,
    paddingVertical: space.sm + 2,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: { fontSize: 14, fontWeight: '500' },
  labelSelected: { fontWeight: '700' },
});
