import { ActivityIndicator, StyleSheet, View } from 'react-native';

import type { LoadState } from '@/lib/useLoader';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText, Banner, Button } from './ui';

type Props<T> = { state: LoadState<T>; retry: () => void; children: (data: T) => React.ReactNode };

/** Spinner while loading, an error with a retry button, or the content. */
export function LoadStateView<T>({ state, retry, children }: Props<T>) {
  const { colors } = useTheme();
  if (state.status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }
  if (state.status === 'error') {
    return (
      <View style={styles.error}>
        <Banner message={state.error} />
        <Button title="Try again" variant="secondary" onPress={retry} />
      </View>
    );
  }
  if (state.data == null) {
    return (
      <View style={styles.center}>
        <AppText tone="muted">This item isn’t available.</AppText>
      </View>
    );
  }
  return <>{children(state.data)}</>;
}

const styles = StyleSheet.create({
  center: { paddingVertical: 48, alignItems: 'center', justifyContent: 'center' },
  error: { gap: 12 },
});
