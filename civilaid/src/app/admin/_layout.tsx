import { Stack } from 'expo-router';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/typography';

// Only reachable when profiles.role = 'admin' (see Stack.Protected in app/_layout.tsx).
// The database enforces the same rule through RLS, so hiding screens is a convenience, not security.
export default function AdminLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { fontFamily: fonts.semibold },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Admin panel' }} />
    </Stack>
  );
}
