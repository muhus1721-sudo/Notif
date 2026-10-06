import { Pressable, StyleSheet, View } from 'react-native';

import { radius, useTheme } from '@/theme/ThemeProvider';
import { AppText } from './AppText';

type Option<T extends string> = { value: T; label: string };
type Props<T extends string> = { options: Option<T>[]; value: T; onChange: (v: T) => void; label?: string };

/** Pill-style single choice (e.g. System / Light / Dark). */
export function Segmented<T extends string>({ options, value, onChange, label }: Props<T>) {
  const { colors } = useTheme();
  return (
    <View style={[styles.wrap, { backgroundColor: colors.surfaceAlt }]} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={[styles.item, selected && { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <AppText variant="label" style={{ color: selected ? colors.textPrimary : colors.textSecondary }}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', padding: 4, borderRadius: radius.md, gap: 4 },
  item: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
});
