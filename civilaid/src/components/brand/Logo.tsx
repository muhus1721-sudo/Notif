import Svg, { Path } from 'react-native-svg';

import { APP_NAME } from '@/lib/config';
import { useTheme } from '@/theme/ThemeProvider';
import {
  ICON_PATH,
  ICON_VIEWBOX,
  WORDMARK_BLUE,
  WORDMARK_CIVIL,
  WORDMARK_TAGLINE,
  WORDMARK_VIEWBOX,
} from './logoPaths';

// Colours sampled from the CivilAid logo artwork (light and dark versions).
export const LOGO_COLORS = {
  light: { blue: '#1E5EFE', civil: '#0C2A70', tagline: '#394E79' },
  // The artwork's dark tagline (#19264A) is nearly invisible on navy; lifted slightly so it reads.
  dark: { blue: '#4C82FF', civil: '#FFFFFF', tagline: '#5D6E99' },
};

const [, , WORD_W, WORD_H] = WORDMARK_VIEWBOX.split(' ').map(Number);
const [, , ICON_W, ICON_H] = ICON_VIEWBOX.split(' ').map(Number);

type Props = {
  /** Rendered height in points; width follows the artwork's proportions. */
  height?: number;
  tagline?: boolean;
  /** Force a version, e.g. white-on-blue surfaces; defaults to the current theme. */
  scheme?: 'light' | 'dark';
};

/** "CivilAid" wordmark with the truss mark, in the light or dark colourway. */
export function Logo({ height = 48, tagline = true, scheme }: Props) {
  const theme = useTheme();
  const c = LOGO_COLORS[scheme ?? theme.scheme];
  return (
    <Svg
      width={(height * WORD_W) / WORD_H}
      height={height}
      viewBox={WORDMARK_VIEWBOX}
      accessibilityRole="image"
      accessibilityLabel={`${APP_NAME} — Learn. Practice. Build.`}
    >
      <Path d={WORDMARK_BLUE} fill={c.blue} fillRule="evenodd" />
      <Path d={WORDMARK_CIVIL} fill={c.civil} fillRule="evenodd" />
      {tagline ? <Path d={WORDMARK_TAGLINE} fill={c.tagline} fillRule="evenodd" /> : null}
    </Svg>
  );
}

/** The truss mark on its own. */
export function LogoMark({ size = 32, color }: { size?: number; color?: string }) {
  const theme = useTheme();
  return (
    <Svg
      width={(size * ICON_W) / ICON_H}
      height={size}
      viewBox={ICON_VIEWBOX}
      accessibilityRole="image"
      accessibilityLabel={APP_NAME}
    >
      <Path d={ICON_PATH} fill={color ?? LOGO_COLORS[theme.scheme].blue} fillRule="evenodd" />
    </Svg>
  );
}
