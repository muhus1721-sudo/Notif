import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { dark, light, type Palette } from './colors';

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
/** Spec: 16 for cards, 12 for buttons and inputs. */
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

export type ThemePreference = 'system' | 'light' | 'dark';
const STORAGE_KEY = 'civilaid.theme';

type Theme = {
  scheme: 'light' | 'dark';
  colors: Palette;
  /** Soft card shadow; `boxShadow` renders on Android, iOS and web. */
  shadow: { boxShadow: string };
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
};

const ThemeContext = createContext<Theme | null>(null);

/** Follows the phone's setting unless the user picks Light or Dark in Profile. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === 'light' || v === 'dark' || v === 'system') setPreferenceState(v);
      })
      .catch(() => {});
  }, []);

  const value = useMemo<Theme>(() => {
    const scheme = preference === 'system' ? system : preference;
    const colors = scheme === 'dark' ? dark : light;
    return {
      scheme,
      colors,
      shadow: { boxShadow: `0px 4px 16px ${colors.shadow}` },
      preference,
      setPreference: (p) => {
        setPreferenceState(p);
        AsyncStorage.setItem(STORAGE_KEY, p).catch(() => {});
      },
    };
  }, [preference, system]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme must be used inside <ThemeProvider>');
  return theme;
}
