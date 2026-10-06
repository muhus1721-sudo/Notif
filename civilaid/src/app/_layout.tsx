import {
  Sora_400Regular,
  Sora_500Medium,
  Sora_600SemiBold,
  Sora_700Bold,
  Sora_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/sora';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useCallback, useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import { AnimatedSplash } from '@/components/brand/AnimatedSplash';
import { StatusScreen } from '@/components/StatusScreen';
import { AppText } from '@/components/ui';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/typography';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Sora_400Regular,
    Sora_500Medium,
    Sora_600SemiBold,
    Sora_700Bold,
    Sora_800ExtraBold,
  });
  const fontsReady = fontsLoaded || !!fontError;
  const [splashDone, setSplashDone] = useState(false);
  const finishSplash = useCallback(() => setSplashDone(true), []);

  // The native splash stays up only until fonts load; then the animated splash takes over.
  useEffect(() => {
    if (fontsReady) SplashScreen.hideAsync();
  }, [fontsReady]);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          {fontsReady ? <RootNavigator /> : null}
          {fontsReady && !splashDone ? <SplashGate onDone={finishSplash} /> : null}
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

/** Session and profile loaded, so the first real screen can be shown. */
function useAppReady() {
  const { status, profile, profileError } = useAuth();
  const signedIn = status === 'signedIn';
  // Wait for the profile too, so admins never flash the student UI or vice versa.
  return status !== 'loading' && (!signedIn || !!profile || !!profileError);
}

/** Plays the launch animation over the app while the session loads (once per launch). */
function SplashGate({ onDone }: { onDone: () => void }) {
  return <AnimatedSplash ready={useAppReady()} onDone={onDone} />;
}

function RootNavigator() {
  const { colors, scheme } = useTheme();
  const { status, profile, profileError, isAdmin, refreshProfile, signOut } = useAuth();
  const signedIn = status === 'signedIn';
  const ready = useAppReady();

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background);
  }, [colors.background]);

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
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { fontFamily: fonts.semibold, fontSize: 17 },
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="subject/[id]" options={{ headerShown: true, title: '' }} />
          <Stack.Screen name="lecture/[id]" options={{ headerShown: true, title: '' }} />
          <Stack.Screen name="module/[id]" options={{ headerShown: true, title: '' }} />
          <Stack.Screen name="unlock" options={{ headerShown: true, title: 'Unlock CivilAid', presentation: 'modal' }} />
          <Stack.Protected guard={isAdmin}>
            <Stack.Screen name="admin" />
          </Stack.Protected>
        </Stack.Protected>
      </Stack>
    </>
  );
}
