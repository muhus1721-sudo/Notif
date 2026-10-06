import type { TextStyle } from 'react-native';

// Sora, per the spec (Section 3). Android can't fake weights for custom fonts,
// so every weight is its own family.
export const fonts = {
  regular: 'Sora_400Regular',
  medium: 'Sora_500Medium',
  semibold: 'Sora_600SemiBold',
  bold: 'Sora_700Bold',
  extrabold: 'Sora_800ExtraBold',
} as const;

export const textVariants = {
  display: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 36 },
  /** Screen title — 24 / 700 */
  title: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 32 },
  /** Section heading — 18 / 600 */
  heading: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 25 },
  /** Body — 15 / 400, line height 22 */
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 22 },
  /** Button — 16 / 600 */
  button: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22 },
  label: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  /** Caption / meta — 12 / 500 */
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
} satisfies Record<string, TextStyle>;

export type TextVariant = keyof typeof textVariants;
