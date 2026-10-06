// Colour tokens from the CivilAid spec (Section 3). Components read colours only from here.
// Spec tokens first; the *Soft / textFaint / flame / shadow extras are derived tints for
// badges, placeholders and shadows that the spec doesn't list.
export type Palette = {
  background: string;
  surface: string;
  surfaceAlt: string;
  primary: string;
  primaryPressed: string;
  onPrimary: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  success: string;
  error: string;
  warning: string;

  textFaint: string;
  primarySoft: string;
  successSoft: string;
  errorSoft: string;
  warningSoft: string;
  /** Mark + "Aid" in the logo. */
  brandBlue: string;
  /** "Civil" in the logo. */
  brandCivil: string;
  shadow: string;
};

export const light: Palette = {
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF3FF',
  primary: '#1E5EFF',
  primaryPressed: '#0B4FD8',
  onPrimary: '#FFFFFF',
  textPrimary: '#0B2A6F',
  textSecondary: '#3A4E7A',
  border: '#D6E0F7',
  success: '#12A150',
  error: '#D93636',
  warning: '#F08A00',

  textFaint: '#8494B8',
  primarySoft: '#E3ECFF',
  successSoft: '#E2F6EA',
  errorSoft: '#FCE8E8',
  warningSoft: '#FFF1DC',
  brandBlue: '#1E5EFF',
  brandCivil: '#0B2A6F',
  shadow: 'rgba(11, 42, 111, 0.10)',
};

export const dark: Palette = {
  background: '#0A1330',
  surface: '#121D42',
  surfaceAlt: '#18244F',
  primary: '#4C82FF',
  primaryPressed: '#3B74FF',
  onPrimary: '#FFFFFF',
  textPrimary: '#FFFFFF',
  textSecondary: '#A9B8DA',
  border: '#24315E',
  success: '#2BC46D',
  error: '#FF6B6B',
  warning: '#FFA733',

  textFaint: '#6F80AD',
  primarySoft: '#1B2C63',
  successSoft: '#123A2A',
  errorSoft: '#3D1C2A',
  warningSoft: '#3A2C14',
  brandBlue: '#4C82FF',
  brandCivil: '#FFFFFF',
  shadow: 'rgba(0, 0, 0, 0.35)',
};
