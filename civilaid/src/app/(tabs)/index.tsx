import { StyleSheet, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { Logo } from '@/components/brand/Logo';
import { ComingSoon } from '@/components/ComingSoon';
import { AppText, Screen } from '@/components/ui';

function greeting(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const { profile } = useAuth();
  const firstName = profile?.full_name.split(' ')[0] ?? '';

  return (
    <Screen>
      <Logo size={30} tagline={false} />
      <View style={styles.header}>
        <AppText tone="muted">{greeting(new Date().getHours())},</AppText>
        <AppText variant="display">{firstName} 👋</AppText>
      </View>
      <ComingSoon
        icon="sparkles-outline"
        title="Your dashboard is on its way"
        message="Your streak, “continue where you left off” and subject progress will show up here."
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: 8 },
});
