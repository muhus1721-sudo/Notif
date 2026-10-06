import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { SUPABASE_KEY, SUPABASE_URL, isSupabaseConfigured } from './config';

export const supabase = createClient(
  // Placeholder values keep the app booting so it can show setup instructions.
  isSupabaseConfigured ? SUPABASE_URL : 'https://not-configured.supabase.co',
  isSupabaseConfigured ? SUPABASE_KEY : 'not-configured',
  {
    auth: {
      // Web uses localStorage (the default); native keeps the session in AsyncStorage.
      ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

// On phones, only refresh the session token while the app is in the foreground.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
