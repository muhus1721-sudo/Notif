export type Palette = {
  background: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  text: string;
  textMuted: string;
  textFaint: string;
  primary: string;
  primaryPressed: string;
  primarySoft: string;
  onPrimary: string;
  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
  warning: string;
  warningSoft: string;
  flame: string;
  shadow: string;
};

export const light: Palette = {
  background: '#F5F7FB',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF2F8',
  border: '#E2E8F0',
  text: '#0F172A',
  textMuted: '#475569',
  textFaint: '#94A3B8',
  primary: '#2563EB',
  primaryPressed: '#1D4ED8',
  primarySoft: '#DBEAFE',
  onPrimary: '#FFFFFF',
  success: '#16A34A',
  successSoft: '#DCFCE7',
  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
  warning: '#D97706',
  warningSoft: '#FEF3C7',
  flame: '#F97316',
  shadow: 'rgba(15, 23, 42, 0.08)',
};

export const dark: Palette = {
  background: '#0B1220',
  surface: '#131C2E',
  surfaceMuted: '#1B2538',
  border: '#24304A',
  text: '#F1F5F9',
  textMuted: '#A5B1C4',
  textFaint: '#64748B',
  primary: '#3B82F6',
  primaryPressed: '#2563EB',
  primarySoft: '#172B52',
  onPrimary: '#FFFFFF',
  success: '#22C55E',
  successSoft: '#12301F',
  danger: '#F87171',
  dangerSoft: '#3A1717',
  warning: '#FBBF24',
  warningSoft: '#3A2A0C',
  flame: '#FB923C',
  shadow: 'rgba(0, 0, 0, 0.35)',
};
