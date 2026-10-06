import { memo, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { texToSvg } from '@/lib/math';
import { useTheme } from '@/theme/ThemeProvider';

// MathJax measures in ex; for its TeX font one ex is about 0.45 of the font size.
const EX_PER_EM = 0.45;

type Props = { tex: string; display?: boolean; fontSize?: number; color?: string };

/** A TeX formula drawn as SVG. Inline formulas sit on the text baseline. */
export const MathView = memo(function MathView({ tex, display = false, fontSize = 15, color }: Props) {
  const { colors } = useTheme();
  const fill = color ?? colors.textPrimary;
  const svg = useMemo(() => {
    try {
      return texToSvg(tex, display);
    } catch {
      return null;
    }
  }, [tex, display]);

  if (!svg) {
    return (
      <Text style={[styles.fallback, { color: colors.error }]} accessibilityLabel={`Formula: ${tex}`}>
        {tex}
      </Text>
    );
  }

  const ex = fontSize * EX_PER_EM;
  const width = svg.widthEx * ex;
  const height = svg.heightEx * ex;
  const math = (
    <SvgXml
      xml={svg.xml}
      width={width}
      height={height}
      color={fill}
      accessibilityLabel={`Formula: ${tex}`}
      accessibilityRole="image"
    />
  );

  if (display) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.display}>
        {math}
      </ScrollView>
    );
  }
  // Inline views rest on the baseline; MathJax's vertical-align says how far below it to go.
  return <View style={{ width, height, transform: [{ translateY: -svg.verticalAlignEx * ex }] }}>{math}</View>;
});

const styles = StyleSheet.create({
  display: { flexGrow: 1, justifyContent: 'center', paddingVertical: 4 },
  fallback: { fontFamily: 'monospace', fontSize: 13 },
});
