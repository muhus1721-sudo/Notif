// Animated launch splash (spec Section 5): the truss draws itself, "CivilAid" flies out of the
// mark and back in, the mark glides to the centre and floods the screen with brand blue, then
// the app cross-fades in. Plays once per launch; tap to skip to the flood; Reduce Motion shows
// the static logo for 600 ms instead.
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/typography';
import { Logo, LOCKUP } from './Logo';
import { MARK_ORDER, MARK_PATHS, MARK_VIEWBOX, type MarkPart } from './mark';
import {
  FRAME,
  floodProgress,
  LETTERS,
  letterState,
  markScale,
  markShiftX,
  markWhiteness,
  SPLASH_DURATION_MS,
  SPLASH_END,
  SPLASH_SKIP_TO,
  strokeOffset,
  taglineState,
} from './splashTimeline';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const FADE_MS = 350;
const FLOOD_SIZE = 40;
const WORD_SIZE = 84;

type Props = {
  /** True once the session and first screen are ready; the splash holds on blue until then. */
  ready: boolean;
  onDone: () => void;
};

export function AnimatedSplash({ ready, onDone }: Props) {
  const reduceMotion = useReducedMotion();
  return reduceMotion ? <StaticSplash ready={ready} onDone={onDone} /> : <FullSplash ready={ready} onDone={onDone} />;
}

function FullSplash({ ready, onDone }: Props) {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const p = useSharedValue(0);
  const fade = useSharedValue(1);
  const [played, setPlayed] = useState(false);

  // Scale the 880×400 reference frame so the lockup (x 198 → ~720) fits the screen width.
  const s = Math.min((width - 40) / 540, (height * 0.9) / FRAME.height);
  // Flood circle must cover the screen from its centre.
  const floodMax = (Math.hypot(width, height) / FLOOD_SIZE) * 1.05;

  useEffect(() => {
    p.value = withTiming(SPLASH_END, { duration: SPLASH_END * SPLASH_DURATION_MS, easing: Easing.linear }, (finished) => {
      if (finished) scheduleOnRN(setPlayed, true);
    });
    return () => cancelAnimation(p);
  }, [p]);

  // Hold on full blue until the app is ready, then cross-fade into it.
  useEffect(() => {
    if (!played || !ready) return;
    fade.value = withTiming(0, { duration: FADE_MS }, (finished) => {
      if (finished) scheduleOnRN(onDone);
    });
  }, [played, ready, fade, onDone]);

  const skip = () => {
    if (p.get() >= SPLASH_SKIP_TO) return;
    cancelAnimation(p);
    p.set(SPLASH_SKIP_TO);
    p.set(
      withTiming(
        SPLASH_END,
        { duration: (SPLASH_END - SPLASH_SKIP_TO) * SPLASH_DURATION_MS, easing: Easing.linear },
        (finished) => {
          if (finished) scheduleOnRN(setPlayed, true);
        },
      ),
    );
  };

  const rootStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const floodStyle = useAnimatedStyle(() => ({ transform: [{ scale: floodProgress(p.value) * floodMax }] }));
  const markStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: markShiftX(p.value) }, { scale: markScale(p.value) }],
  }));
  const blueMarkStyle = useAnimatedStyle(() => ({ opacity: 1 - markWhiteness(p.value) }));
  const whiteMarkStyle = useAnimatedStyle(() => ({ opacity: markWhiteness(p.value) }));
  const taglineStyle = useAnimatedStyle(() => {
    const t = taglineState(p.value);
    return { opacity: t.opacity, transform: [{ translateY: t.translateY }] };
  });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }, rootStyle]}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={skip}
        accessibilityRole="button"
        accessibilityLabel="Skip intro"
      >
        <Animated.View
          style={[
            styles.flood,
            { backgroundColor: colors.primary, left: width / 2 - FLOOD_SIZE / 2, top: height / 2 - FLOOD_SIZE / 2 },
            floodStyle,
          ]}
        />

        {/* Reference frame, centred on screen and scaled to fit. */}
        <View
          style={[
            styles.frame,
            { left: (width - FRAME.width) / 2, top: (height - FRAME.height) / 2, transform: [{ scale: s }] },
          ]}
          pointerEvents="none"
        >
          {/* Wordmark block: clipped on its left edge so letters seem to come out of the mark. */}
          <View style={styles.wordClip}>
            <View style={styles.wordRow}>
              {LETTERS.map((ch, i) => (
                <Letter key={i} index={i} char={ch} p={p} color={i < 5 ? colors.brandCivil : colors.brandBlue} />
              ))}
            </View>
            <Animated.Text style={[styles.tagline, { color: colors.textSecondary }, taglineStyle]}>
              LEARN. PRACTICE. BUILD.
            </Animated.Text>
          </View>

          <Animated.View style={[styles.mark, markStyle]}>
            <Animated.View style={[StyleSheet.absoluteFill, blueMarkStyle]}>
              <DrawnMark p={p} color={colors.brandBlue} />
            </Animated.View>
            <Animated.View style={[StyleSheet.absoluteFill, whiteMarkStyle]}>
              <DrawnMark p={p} color={colors.onPrimary} />
            </Animated.View>
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

type Progress = ReturnType<typeof useSharedValue<number>>;

function DrawnMark({ p, color }: { p: Progress; color: string }) {
  return (
    <Svg width={FRAME.markSize} height={FRAME.markSize} viewBox={MARK_VIEWBOX} fill="none">
      {MARK_ORDER.map((part) => (
        <MarkStroke key={part} part={part} p={p} color={color} />
      ))}
    </Svg>
  );
}

function MarkStroke({ part, p, color }: { part: MarkPart; p: Progress; color: string }) {
  const { d, strokeWidth, length } = MARK_PATHS[part];
  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: strokeOffset(p.value, part) }));
  return (
    <AnimatedPath
      d={d}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
      strokeLinecap="round"
      strokeDasharray={[length, length]}
      animatedProps={animatedProps}
    />
  );
}

function Letter({ index, char, p, color }: { index: number; char: string; p: Progress; color: string }) {
  const style = useAnimatedStyle(() => {
    const l = letterState(p.value, index);
    return { opacity: l.opacity, transform: [{ translateX: l.translateX }, { scale: l.scale }] };
  });
  return <Animated.Text style={[styles.letter, { color }, style]}>{char}</Animated.Text>;
}

/** Reduce Motion: the static lockup for 600 ms, then fade to the app. */
function StaticSplash({ ready, onDone }: Props) {
  const { colors } = useTheme();
  const fade = useSharedValue(1);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShown(true), 600);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (!shown || !ready) return;
    fade.value = withTiming(0, { duration: FADE_MS }, (finished) => {
      if (finished) scheduleOnRN(onDone);
    });
  }, [shown, ready, fade, onDone]);

  const style = useAnimatedStyle(() => ({ opacity: fade.value }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: colors.background }, style]}>
      <Logo size={72} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flood: { position: 'absolute', width: FLOOD_SIZE, height: FLOOD_SIZE, borderRadius: FLOOD_SIZE / 2 },
  frame: { position: 'absolute', width: FRAME.width, height: FRAME.height },
  mark: {
    position: 'absolute',
    left: FRAME.markLeft,
    top: (FRAME.height - FRAME.markSize) / 2,
    width: FRAME.markSize,
    height: FRAME.markSize,
  },
  wordClip: {
    position: 'absolute',
    left: FRAME.wordLeft,
    top: 100,
    width: FRAME.width - FRAME.wordLeft,
    height: 200,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  wordRow: { flexDirection: 'row', alignItems: 'flex-end' },
  letter: {
    fontFamily: fonts.extrabold,
    fontSize: WORD_SIZE,
    lineHeight: WORD_SIZE * 1.15,
    marginRight: WORD_SIZE * LOCKUP.wordTracking,
  },
  tagline: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    letterSpacing: 4,
    marginTop: 6,
  },
  center: { alignItems: 'center', justifyContent: 'center' },
});
