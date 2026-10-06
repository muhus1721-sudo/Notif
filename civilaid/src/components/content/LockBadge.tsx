import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { radius, useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/typography';

/** Small pill: "Free", "Locked", "Draft" or "Done". */
export function Tag({ kind }: { kind: 'free' | 'locked' | 'draft' | 'done' }) {
  const { colors } = useTheme();
  const look = {
    free: { bg: colors.successSoft, fg: colors.success, label: 'Free', icon: null },
    locked: { bg: colors.surfaceAlt, fg: colors.textSecondary, label: 'Locked', icon: 'lock-closed' as const },
    draft: { bg: colors.warningSoft, fg: colors.warning, label: 'Draft', icon: 'eye-off-outline' as const },
    done: { bg: colors.successSoft, fg: colors.success, label: 'Done', icon: 'checkmark' as const },
  }[kind];
  return (
    <View style={[styles.tag, { backgroundColor: look.bg }]}>
      {look.icon ? <Ionicons name={look.icon} size={11} color={look.fg} /> : null}
      <AppText variant="caption" style={{ color: look.fg, fontFamily: fonts.semibold }}>
        {look.label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
});
