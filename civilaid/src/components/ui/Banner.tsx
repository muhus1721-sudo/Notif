import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { radius, useTheme } from '@/theme/ThemeProvider';
import { AppText } from './AppText';

type Props = { tone?: 'error' | 'info' | 'success'; message: string };

export function Banner({ tone = 'error', message }: Props) {
  const { colors } = useTheme();
  const look = {
    error: { bg: colors.dangerSoft, fg: colors.danger, icon: 'alert-circle' as const },
    info: { bg: colors.primarySoft, fg: colors.primary, icon: 'information-circle' as const },
    success: { bg: colors.successSoft, fg: colors.success, icon: 'checkmark-circle' as const },
  }[tone];
  return (
    <View
      style={[styles.box, { backgroundColor: look.bg }]}
      accessibilityRole={tone === 'error' ? 'alert' : undefined}
      accessibilityLiveRegion="polite"
    >
      <Ionicons name={look.icon} size={20} color={look.fg} />
      <AppText variant="label" style={[styles.text, { color: look.fg }]}>
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: radius.md, alignItems: 'flex-start' },
  text: { flex: 1 },
});
