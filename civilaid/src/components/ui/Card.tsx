import { StyleSheet, View, type ViewProps } from 'react-native';

import { radius, spacing, useTheme } from '@/theme/ThemeProvider';

export function Card({ style, ...rest }: ViewProps) {
  const { colors, shadow } = useTheme();
  return <View style={[styles.card, { backgroundColor: colors.surface }, shadow, style]} {...rest} />;
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, padding: spacing.lg },
});
