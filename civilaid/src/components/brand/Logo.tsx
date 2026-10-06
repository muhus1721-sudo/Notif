import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { APP_NAME } from '@/lib/config';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/typography';
import { MARK_ORDER, MARK_PATHS, MARK_VIEWBOX } from './mark';

/** The truss mark. Minimum size 24 (spec). */
export function LogoMark({ size = 32, color }: { size?: number; color?: string }) {
  const { colors } = useTheme();
  return (
    <Svg width={size} height={size} viewBox={MARK_VIEWBOX} fill="none" accessibilityLabel={APP_NAME}>
      {MARK_ORDER.map((k) => (
        <Path
          key={k}
          d={MARK_PATHS[k].d}
          stroke={color ?? colors.brandBlue}
          strokeWidth={MARK_PATHS[k].strokeWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
    </Svg>
  );
}

// Lockup proportions from the spec, relative to a 140 px mark: wordmark 84 px Sora 800 with
// -2.5 letter spacing, 18–28 px gap, tagline 18 px Sora 600 uppercase, 4 px tracking, 6 px below.
export const LOCKUP = { gap: 22 / 140, word: 84 / 140, wordTracking: -2.5 / 84, tag: 18 / 140, tagTracking: 4 / 18, tagGap: 6 / 140 };

type Props = {
  /** Mark size; everything else scales from it. */
  size?: number;
  tagline?: boolean;
  /** For brand-blue surfaces: everything in white. */
  reversed?: boolean;
};

/** Horizontal lockup: mark + "CivilAid" (+ tagline), in the current theme's colourway. */
export function Logo({ size = 56, tagline = true, reversed }: Props) {
  const { colors } = useTheme();
  const word = size * LOCKUP.word;
  const tag = size * LOCKUP.tag;
  const blue = reversed ? colors.onPrimary : colors.brandBlue;
  return (
    <View
      style={[styles.row, { gap: size * LOCKUP.gap }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${APP_NAME}. Learn. Practice. Build.`}
    >
      <LogoMark size={size} color={blue} />
      <View>
        <Text
          style={{ fontFamily: fonts.extrabold, fontSize: word, lineHeight: word * 1.15, letterSpacing: word * LOCKUP.wordTracking }}
        >
          <Text style={{ color: reversed ? colors.onPrimary : colors.brandCivil }}>Civil</Text>
          <Text style={{ color: blue }}>Aid</Text>
        </Text>
        {tagline ? (
          <Text
            style={{
              fontFamily: fonts.semibold,
              fontSize: tag,
              letterSpacing: tag * LOCKUP.tagTracking,
              marginTop: size * LOCKUP.tagGap,
              color: reversed ? colors.onPrimary : colors.textSecondary,
            }}
          >
            LEARN. PRACTICE. BUILD.
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center' } });
