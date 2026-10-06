import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { APP_NAME, BATCH_LABEL } from '@/lib/config';
import { radius, useTheme } from '@/theme/ThemeProvider';
import { AppText } from './ui';

/** Logo tile + app name used on the auth screens. */
export function BrandMark() {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={[styles.logo, { backgroundColor: colors.primary }]}>
        <Ionicons name="school" size={30} color={colors.onPrimary} />
      </View>
      <AppText variant="display">{APP_NAME}</AppText>
      <AppText variant="label" tone="muted">
        {BATCH_LABEL}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 6, marginTop: 24, marginBottom: 8 },
  logo: { width: 64, height: 64, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
});
