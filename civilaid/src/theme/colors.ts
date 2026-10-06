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
  /** Background of filled buttons/badges that carry white text (meets 4.5:1 contrast). */
  primaryFill: string;
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

// Brand colours come from the CivilAid logo: blue #1E5EFE (light) / #4C82FF (dark), navy #0A1330.
export const light: Palette = {
  background: '#F5F7FB',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF2F8',
  border: '#E2E8F0',
  text: '#0F172A',
  textMuted: '#475569',
  textFaint: '#94A3B8',
  primary: '#1E5EFE',
  primaryPressed: '#1A4FD6',
  primaryFill: '#1E5EFE',
  primarySoft: '#E0E9FF',
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
  background: '#0A1330',
  surface: '#111C40',
  surfaceMuted: '#18254F',
  border: '#24325F',
  text: '#F1F5F9',
  textMuted: '#A5B1C4',
  textFaint: '#64748B',
  primary: '#4C82FF',
  primaryPressed: '#2459E0',
  primaryFill: '#2F6BFF',
  primarySoft: '#17295E',
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
