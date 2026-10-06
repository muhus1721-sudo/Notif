import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Card } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';

/** Call-to-action shown wherever paid content is locked. */
export function UnlockCard({ message }: { message?: string }) {
  const { colors } = useTheme();
  return (
    <Card style={styles.card}>
      <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name="lock-closed" size={22} color={colors.primary} />
      </View>
      <AppText variant="heading" align="center">
        {message ?? 'This lecture is locked'}
      </AppText>
      <AppText tone="muted" align="center">
        Lecture 1 of every subject is free. Unlock every lecture, video, note and quiz for the semester.
      </AppText>
      <Button title="Unlock for Rs 1000" onPress={() => router.push('/unlock')} style={styles.stretch} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: 8, paddingVertical: 24 },
  icon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  stretch: { alignSelf: 'stretch', marginTop: 4 },
});
