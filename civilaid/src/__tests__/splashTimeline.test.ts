import {
  cubicBezier,
  floodProgress,
  LETTER_STAGGER,
  letterState,
  markScale,
  markShiftX,
  markWhiteness,
  SPLASH_END,
  strokeOffset,
  taglineState,
} from '@/components/brand/splashTimeline';

const close = (a: number, b: number, eps = 0.01) => expect(Math.abs(a - b)).toBeLessThan(eps);

describe('splash timeline matches the spec keyframes', () => {
  it('draws each stroke in its window (phases 1–4)', () => {
    close(strokeOffset(0, 'frame'), 261.2);
    close(strokeOffset(0.18, 'frame'), 0);
    close(strokeOffset(0.14, 'crossbar'), 52);
    close(strokeOffset(0.23, 'crossbar'), 0);
    close(strokeOffset(0.2, 'web'), 79.4);
    close(strokeOffset(0.29, 'web'), 0);
    close(strokeOffset(0.26, 'beam'), 108);
    close(strokeOffset(0.34, 'beam'), 0);
  });

  it('settles with a 1.08 bounce, then grows to 1.7 and pulses (phases 5, 10, 11)', () => {
    close(markScale(0.37), 1.08);
    close(markScale(0.4), 1);
    close(markScale(0.86), 1.7);
    close(markScale(0.885), 1.55);
    close(markScale(SPLASH_END), 1.7);
  });

  it('glides 172 px to the centre and turns white during the flood (phases 9–10)', () => {
    close(markShiftX(0.73), 0);
    close(markShiftX(0.79), 172);
    close(markWhiteness(0.78), 0);
    close(markWhiteness(0.85), 1);
    close(floodProgress(0.79), 0);
    close(floodProgress(0.86), 1);
  });

  it('flies letters out of the mark and back, staggered (phases 6 and 8)', () => {
    expect(letterState(0.3, 0)).toMatchObject({ opacity: 0, translateX: -88, scale: 0.25 });
    const placed = letterState(0.55, 0);
    expect(placed.opacity).toBe(1);
    close(placed.translateX, 0);
    close(placed.scale, 1);
    // With the stagger, the last letter is gone at 72.6% — just before the mark glides (73%).
    expect(letterState(0.7, 7).opacity).toBe(1);
    expect(letterState(0.73, 7).opacity).toBe(0);
    // The last letter ('d') lags the first by 7 × 0.048 s.
    const d = letterState(0.49 + 7 * LETTER_STAGGER, 7);
    close(d.translateX, 0);
    close(d.scale, 1);
    expect(letterState(0.45, 7).translateX).toBeLessThan(letterState(0.45, 0).translateX);
  });

  it('fades the tagline up 8 px, then out (phases 7–8)', () => {
    expect(taglineState(0.5)).toEqual({ opacity: 0, translateY: 8 });
    expect(taglineState(0.57)).toEqual({ opacity: 1, translateY: 0 });
    close(taglineState(0.62).opacity, 0);
  });
});

describe('cubicBezier', () => {
  it('matches CSS reference values', () => {
    const easeInOut = cubicBezier(0.42, 0, 0.58, 1);
    close(easeInOut(0.5), 0.5, 1e-4);
    close(easeInOut(0.25), 0.129, 0.002);
    const linear = cubicBezier(0, 0, 1, 1);
    close(linear(0.3), 0.3, 1e-4);
    // The fly-out curve overshoots (y2 = 1.15) before settling.
    const fly = cubicBezier(0.2, 0.9, 0.25, 1.15);
    expect(Math.max(...[0.5, 0.6, 0.7, 0.8].map(fly))).toBeGreaterThan(1);
  });
});
