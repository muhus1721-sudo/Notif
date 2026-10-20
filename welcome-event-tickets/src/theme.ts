import { useColorScheme } from 'react-native';

export type Theme = {
  dark: boolean;
  bg: string;
  /** Slightly raised surface used for cards and rows. */
  card: string;
  /** Pressed / inset surface, e.g. inputs and unselected chips. */
  inset: string;
  border: string;
  text: string;
  textDim: string;
  textFaint: string;
  accent: string;
  accentText: string;
  accentSoft: string;
  danger: string;
  dangerSoft: string;
  overlay: string;
};

const dark: Theme = {
  dark: true,
  bg: '#0B0D12',
  card: '#151A23',
  inset: '#1E242F',
  border: '#262D3A',
  text: '#F1F4F9',
  textDim: '#98A2B3',
  textFaint: '#5C6675',
  accent: '#6C8CFF',
  accentText: '#0B0D12',
  accentSoft: '#1B2340',
  danger: '#FF6B6B',
  dangerSoft: '#2A1719',
  overlay: 'rgba(0, 0, 0, 0.6)',
};

const light: Theme = {
  dark: false,
  bg: '#F4F5F8',
  card: '#FFFFFF',
  inset: '#EDEFF4',
  border: '#E1E4EB',
  text: '#11151D',
  textDim: '#5D6675',
  textFaint: '#98A0AE',
  accent: '#3F5DDB',
  accentText: '#FFFFFF',
  accentSoft: '#E7ECFF',
  danger: '#D6394A',
  dangerSoft: '#FDECEE',
  overlay: 'rgba(17, 21, 29, 0.35)',
};

export function useTheme(): Theme {
  return useColorScheme() === 'light' ? light : dark;
}

export const radius = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
