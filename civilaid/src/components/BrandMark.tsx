import { StyleSheet, View } from 'react-native';

import { BATCH_LABEL } from '@/lib/config';
import { AppText } from './ui';
import { Logo } from './brand/Logo';

/** Logo + batch line used on the auth screens. */
export function BrandMark() {
  return (
    <View style={styles.wrap}>
      <Logo size={60} />
      <AppText variant="label" tone="muted">
        {BATCH_LABEL}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 14, marginTop: 28, marginBottom: 8 },
});
