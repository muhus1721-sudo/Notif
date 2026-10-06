import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps } from 'react-native';

import { radius, useTheme } from '@/theme/ThemeProvider';
import { AppText } from './AppText';

type Props = Omit<PressableProps, 'children'> & {
  title: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  icon?: React.ReactNode;
};

export function Button({ title, variant = 'primary', loading, disabled, icon, style, ...rest }: Props) {
  const { colors } = useTheme();
  const palette = {
    primary: { bg: colors.primary, pressed: colors.primaryPressed, fg: colors.onPrimary },
    secondary: { bg: colors.primarySoft, pressed: colors.border, fg: colors.primary },
    ghost: { bg: 'transparent', pressed: colors.surfaceAlt, fg: colors.primary },
    danger: { bg: colors.errorSoft, pressed: colors.border, fg: colors.error },
  }[variant];
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      style={(state) => [
        styles.base,
        { backgroundColor: state.pressed ? palette.pressed : palette.bg, opacity: inactive ? 0.6 : 1 },
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <View style={styles.row}>
          {icon}
          <AppText variant="button" style={{ color: palette.fg }}>
            {title}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
