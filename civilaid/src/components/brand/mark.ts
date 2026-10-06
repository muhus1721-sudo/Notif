// The CivilAid mark from the spec (Section 2): the letter A as a truss on a beam.
// 120×120 viewBox, stroked with currentColor. Lengths are used by the draw-in animation
// (strokeDashoffset), because Android's support for the pathLength prop is unreliable.
export const MARK_VIEWBOX = '0 0 120 120';

export const MARK_PATHS = {
  frame: { d: 'M60 18 L18 96 L102 96 Z', strokeWidth: 9, length: 261.2 },
  crossbar: { d: 'M34 66 L86 66', strokeWidth: 8, length: 52.0 },
  web: { d: 'M34 66 L60 96 L86 66', strokeWidth: 6, length: 79.4 },
  beam: { d: 'M6 96 L114 96', strokeWidth: 9, length: 108.0 },
} as const;

export type MarkPart = keyof typeof MARK_PATHS;
export const MARK_ORDER: MarkPart[] = ['frame', 'crossbar', 'web', 'beam'];

/** Standalone SVG source, for generating icon PNGs. */
export function markSvg(color: string, size = 120): string {
  const paths = MARK_ORDER.map((k) => {
    const p = MARK_PATHS[k];
    return `<path d="${p.d}" stroke-width="${p.strokeWidth}" stroke-linejoin="round" stroke-linecap="round"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${MARK_VIEWBOX}" fill="none" stroke="${color}">${paths}</svg>`;
}
