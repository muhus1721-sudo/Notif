import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { AppText, Button, Screen } from './ui';

type Action = { title: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'ghost' };
type Props = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  message: string;
  actions?: Action[];
  children?: React.ReactNode;
};

/** Full-page message: setup missing, profile failed to load, etc. */
export function StatusScreen({ icon, title, message, actions = [], children }: Props) {
  const { colors } = useTheme();
  return (
    <Screen contentStyle={styles.center}>
      <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name={icon} size={36} color={colors.primary} />
      </View>
      <AppText variant="title" align="center">
        {title}
      </AppText>
      <AppText tone="muted" align="center">
        {message}
      </AppText>
      {children}
      {actions.map((a) => (
        <Button key={a.title} title={a.title} variant={a.variant} onPress={a.onPress} style={styles.button} />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  icon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  button: { alignSelf: 'stretch' },
});
