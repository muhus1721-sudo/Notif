import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts,
} from '@expo-google-fonts/poppins';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import { StatusScreen } from '@/components/StatusScreen';
import { AppText } from '@/components/ui';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <RootNavigator fontsReady={fontsLoaded || !!fontError} />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator({ fontsReady }: { fontsReady: boolean }) {
  const { colors, scheme } = useTheme();
  const { status, profile, profileError, isAdmin, refreshProfile, signOut } = useAuth();
  const signedIn = status === 'signedIn';
  // Wait for the profile too, so admins never flash the student UI or vice versa.
  const ready = fontsReady && status !== 'loading' && (!signedIn || !!profile || !!profileError);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background);
  }, [colors.background]);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  if (signedIn && !profile) {
    return (
      <StatusScreen
        icon="cloud-offline-outline"
        title="Couldn’t load your account"
        message={profileError ?? 'Please try again.'}
        actions={[
          { title: 'Try again', onPress: refreshProfile },
          { title: 'Sign out', onPress: signOut, variant: 'ghost' },
        ]}
      >
        <AppText variant="caption" tone="faint" align="center">
          If this keeps happening, your profile row may be missing — see README → Troubleshooting.
        </AppText>
      </StatusScreen>
    );
  }

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" />
          <Stack.Protected guard={isAdmin}>
            <Stack.Screen name="admin" />
          </Stack.Protected>
        </Stack.Protected>
      </Stack>
    </>
  );
}
