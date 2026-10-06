// Timeline for the animated splash (spec Section 5). Every value is derived from one
// progress number p in [0, 1] over 6 s, so all parts stay in sync. These are worklets:
// they run on the UI thread inside useAnimatedStyle / useAnimatedProps. Kept free of
// Reanimated imports so the timing maths can be unit-tested.
import { MARK_PATHS } from './mark';

export const SPLASH_DURATION_MS = 6000;
/** Phase 11 ends here (screen fully blue); the app cross-fades in after this. */
export const SPLASH_END = 0.91;
/** Tapping skips to phase 10 (flood). */
export const SPLASH_SKIP_TO = 0.79;

// Reference frame from the spec: 880 × 400, mark 140 × 140 at x 198 (centre 268).
export const FRAME = { width: 880, height: 400, markLeft: 198, markSize: 140, wordLeft: 356, moveX: 172 } as const;

export const LETTERS = ['C', 'i', 'v', 'i', 'l', 'A', 'i', 'd'] as const;
/** Where each letter starts (translateX, px, relative to its final position). */
export const LETTER_OFFSETS = [-88, -145, -168, -217, -240, -263, -322, -345] as const;
/** 0.048 s between letters, as a fraction of the 6 s timeline. */
export const LETTER_STAGGER = 0.048 / 6;

/** CSS `cubic-bezier(x1, y1, x2, y2)` as a function of time t in [0, 1]. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  'worklet';
  const coord = (t: number, a: number, b: number) => {
    'worklet';
    return ((1 - 3 * b + 3 * a) * t + (3 * b - 6 * a)) * t * t + 3 * a * t;
  };
  const slope = (t: number, a: number, b: number) => {
    'worklet';
    return 3 * (1 - 3 * b + 3 * a) * t * t + 2 * (3 * b - 6 * a) * t + 3 * a;
  };
  return (x: number) => {
    'worklet';
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    // Newton's method for the t whose x-coordinate is x, falling back to bisection.
    let t = x;
    for (let i = 0; i < 8; i++) {
      const err = coord(t, x1, x2) - x;
      const d = slope(t, x1, x2);
      if (Math.abs(err) < 1e-6) return coord(t, y1, y2);
      if (Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    let lo = 0;
    let hi = 1;
    t = x;
    for (let i = 0; i < 30; i++) {
      const cx = coord(t, x1, x2);
      if (Math.abs(cx - x) < 1e-6) break;
      if (cx < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return coord(t, y1, y2);
  };
}

const easeInOut = cubicBezier(0.42, 0, 0.58, 1);
const easeOut = cubicBezier(0, 0, 0.58, 1);
const ease = cubicBezier(0.25, 0.1, 0.25, 1);
const flyEase = cubicBezier(0.2, 0.9, 0.25, 1.15);
const glideEase = cubicBezier(0.5, 0, 0.3, 1);
const floodEase = cubicBezier(0.6, 0, 0.3, 1);

/** Eased 0→1 progress of a segment [a, b] of the timeline. */
export function seg(p: number, a: number, b: number, easing: (t: number) => number = (t) => t): number {
  'worklet';
  if (p <= a) return 0;
  if (p >= b) return 1;
  return easing((p - a) / (b - a));
}

const lerp = (from: number, to: number, t: number) => {
  'worklet';
  return from + (to - from) * t;
};

// Phases 1–4: each stroke draws in (dashoffset = full length → 0).
const DRAW = {
  frame: [0, 0.18],
  crossbar: [0.14, 0.23],
  web: [0.2, 0.29],
  beam: [0.26, 0.34],
} as const;

export function strokeOffset(p: number, part: keyof typeof DRAW): number {
  'worklet';
  const [a, b] = DRAW[part];
  return MARK_PATHS[part].length * (1 - seg(p, a, b, easeInOut));
}

/** Mark scale: settle bounce (phase 5), grow during flood (10), pulse (11). */
export function markScale(p: number): number {
  'worklet';
  if (p < 0.34) return 1;
  if (p < 0.37) return lerp(1, 1.08, seg(p, 0.34, 0.37, easeOut));
  if (p < 0.4) return lerp(1.08, 1, seg(p, 0.37, 0.4, easeOut));
  if (p < 0.79) return 1;
  if (p < 0.86) return lerp(1, 1.7, seg(p, 0.79, 0.86, floodEase));
  if (p < 0.885) return lerp(1.7, 1.55, seg(p, 0.86, 0.885, ease));
  if (p < 0.91) return lerp(1.55, 1.7, seg(p, 0.885, 0.91, ease));
  return 1.7;
}

/** Phase 9: the mark glides to the centre of the screen (frame px). */
export function markShiftX(p: number): number {
  'worklet';
  return FRAME.moveX * seg(p, 0.73, 0.79, glideEase);
}

/** 0 = brand blue, 1 = white (during the flood, 78–85%). */
export function markWhiteness(p: number): number {
  'worklet';
  return seg(p, 0.78, 0.85, ease);
}

/** Phase 10: flood circle scale, as a fraction of the size that covers the screen. */
export function floodProgress(p: number): number {
  'worklet';
  return seg(p, 0.79, 0.86, floodEase);
}

/** Phases 6 and 8: one letter flying out of the mark and back in. */
export function letterState(p: number, index: number) {
  'worklet';
  const q = p - index * LETTER_STAGGER;
  const offset = LETTER_OFFSETS[index];
  // 0 = at the mark (offset, scale .25), 1 = in place.
  let placed = 0;
  if (q >= 0.4 && q < 0.49) placed = seg(q, 0.4, 0.49, flyEase);
  else if (q >= 0.49 && q < 0.6) placed = 1;
  else if (q >= 0.6 && q < 0.67) placed = 1 - seg(q, 0.6, 0.67, flyEase);
  let opacity = 0;
  if (q >= 0.4 && q < 0.42) opacity = seg(q, 0.4, 0.42);
  else if (q >= 0.42 && q < 0.65) opacity = 1;
  else if (q >= 0.65 && q < 0.67) opacity = 1 - seg(q, 0.65, 0.67);
  return { translateX: offset * (1 - placed), scale: lerp(0.25, 1, placed), opacity };
}

/** Phase 7: tagline fades up 8 px; fades out from 58%. */
export function taglineState(p: number) {
  'worklet';
  const inT = seg(p, 0.5, 0.56, easeOut);
  const out = seg(p, 0.58, 0.62);
  return { opacity: inT * (1 - out), translateY: 8 * (1 - inT) };
}
