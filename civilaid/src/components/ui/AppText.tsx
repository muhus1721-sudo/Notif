import { Text, type TextProps } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { textVariants, type TextVariant } from '@/theme/typography';

type Props = TextProps & {
  variant?: TextVariant;
  tone?: 'default' | 'muted' | 'faint' | 'primary' | 'success' | 'danger' | 'onPrimary';
  align?: 'left' | 'center' | 'right';
};

export function AppText({ variant = 'body', tone = 'default', align, style, ...rest }: Props) {
  const { colors } = useTheme();
  const color = {
    default: colors.text,
    muted: colors.textMuted,
    faint: colors.textFaint,
    primary: colors.primary,
    success: colors.success,
    danger: colors.danger,
    onPrimary: colors.onPrimary,
  }[tone];
  return <Text style={[textVariants[variant], { color, textAlign: align }, style]} {...rest} />;
}
