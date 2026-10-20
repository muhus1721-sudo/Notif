/** Every ticket carries `NW-` followed by its number, zero-padded to 3 digits. */
export const SERIAL_PREFIX = 'NW-';
const MIN_DIGITS = 3;

/** 1 → "NW-001", 42 → "NW-042", 1234 → "NW-1234". */
export function formatSerial(n: number): string {
  return SERIAL_PREFIX + String(n).padStart(MIN_DIGITS, '0');
}

/** "NW-017", "nw17", "17" → 17. Anything else → null. */
export function parseSerial(text: string): number | null {
  const trimmed = text.trim().toUpperCase();
  const digits = trimmed.startsWith('NW') ? trimmed.slice(2).replace(/^-/, '') : trimmed;
  if (!/^\d+$/.test(digits)) return null;
  const n = Number(digits);
  return n >= 1 ? n : null;
}

/** The serials for `count` tickets starting at `start`, in print order. */
export function serialRange(start: number, count: number): string[] {
  return Array.from({ length: count }, (_, i) => formatSerial(start + i));
}

/**
 * Helvetica-Bold advance widths (per 1000 em) for every character a serial can
 * contain, so the app can measure a serial without loading a font. A test pins
 * these against the font pdf-lib actually draws with.
 */
const GLYPH_WIDTHS: Record<string, number> = {
  N: 722,
  W: 944,
  '-': 333,
  ...Object.fromEntries('0123456789'.split('').map((d) => [d, 556])),
};

/** Kerning pairs the font applies between those characters. */
const KERNING: Record<string, number> = { 'W-': -40 };

/** Width in points of `text` drawn in Helvetica-Bold at `size` points. */
export function serialWidth(text: string, size: number): number {
  let units = 0;
  for (let i = 0; i < text.length; i++) {
    units += GLYPH_WIDTHS[text[i]] ?? 600;
    units += KERNING[text.slice(i, i + 2)] ?? 0;
  }
  return (units / 1000) * size;
}

/** Height of a capital/digit in Helvetica-Bold, as a fraction of the font size. */
export const CAP_HEIGHT = 0.718;
