import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { AppText, Card } from './ui';

type Props = { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; message: string };

/** Placeholder card for screens that later phases fill in. */
export function ComingSoon({ icon, title, message }: Props) {
  const { colors } = useTheme();
  return (
    <Card style={styles.card}>
      <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name={icon} size={28} color={colors.primary} />
      </View>
      <AppText variant="heading" align="center">
        {title}
      </AppText>
      <AppText tone="muted" align="center">
        {message}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: 8, paddingVertical: 32 },
  icon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
});
