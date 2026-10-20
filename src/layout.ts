/**
 * Page maths for the print PDF. Everything is in PDF points (72 per inch) with
 * the origin at the bottom-left of the page, the way the PDF is drawn.
 */

export const POINTS_PER_INCH = 72;

/** The ticket the vendor will cut, fixed at 7 × 3.5 inches. */
export const TICKET_LONG_IN = 7;
export const TICKET_SHORT_IN = 3.5;

/** Print resolution the design should meet: 300 dots per inch. */
export const PRINT_DPI = 300;
export const MIN_LONG_PX = TICKET_LONG_IN * PRINT_DPI; // 2100
export const MIN_SHORT_PX = TICKET_SHORT_IN * PRINT_DPI; // 1050

export type Paper = 'A4' | 'Letter';
export type LayoutMode = 'sheet' | 'single';
export type Orientation = 'portrait' | 'landscape';

export const PAPER_SIZES: Record<Paper, { w: number; h: number; label: string }> = {
  A4: { w: 595.28, h: 841.89, label: 'A4 · 8.27 × 11.69 in' },
  Letter: { w: 612, h: 792, label: 'US Letter · 8.5 × 11 in' },
};

/**
 * Most office and digital printers cannot print the outer ~0.2 in of a sheet.
 * Tickets stay inside this border, and cut marks are drawn in it.
 */
export const SAFE_MARGIN = 0.25 * POINTS_PER_INCH;

/** How far cut marks start from the ticket edge, and their longest length. */
const MARK_GAP = 4;
const MARK_MAX = 14;
/** Marks never run closer to the paper edge than this. */
const MARK_EDGE = 6;

export type Rect = { x: number; y: number; w: number; h: number };
export type Line = { x1: number; y1: number; x2: number; y2: number };

export type PageLayout = {
  paper: Paper;
  mode: LayoutMode;
  orientation: Orientation;
  pageW: number;
  pageH: number;
  cols: number;
  rows: number;
  perPage: number;
  /** Where each ticket on a page goes, in reading order (left→right, top→bottom). */
  slots: Rect[];
  cutMarks: Line[];
};

/** The ticket's size in points, laid the same way round as the design image. */
export function ticketSize(designLandscape: boolean): { w: number; h: number } {
  const long = TICKET_LONG_IN * POINTS_PER_INCH;
  const short = TICKET_SHORT_IN * POINTS_PER_INCH;
  return designLandscape ? { w: long, h: short } : { w: short, h: long };
}

function grid(pageW: number, pageH: number, tw: number, th: number) {
  const cols = Math.floor((pageW - 2 * SAFE_MARGIN + 1e-6) / tw);
  const rows = Math.floor((pageH - 2 * SAFE_MARGIN + 1e-6) / th);
  return { cols: Math.max(cols, 0), rows: Math.max(rows, 0) };
}

/**
 * Lays tickets on the chosen paper. In sheet mode both page orientations are
 * tried and the one that fits more tickets wins (portrait on a tie). Tickets
 * are never rotated, scaled or cropped: each stays exactly 7 × 3.5 in, and the
 * page turns instead.
 *
 * Returns `perPage: 0` when the ticket cannot fit the paper at all.
 */
export function computeLayout(
  designLandscape: boolean,
  paper: Paper,
  mode: LayoutMode
): PageLayout {
  const { w: tw, h: th } = ticketSize(designLandscape);

  if (mode === 'single') {
    return {
      paper,
      mode,
      orientation: designLandscape ? 'landscape' : 'portrait',
      pageW: tw,
      pageH: th,
      cols: 1,
      rows: 1,
      perPage: 1,
      slots: [{ x: 0, y: 0, w: tw, h: th }],
      cutMarks: [],
    };
  }

  const size = PAPER_SIZES[paper];
  const options = (['portrait', 'landscape'] as const).map((orientation) => {
    const pageW = orientation === 'portrait' ? size.w : size.h;
    const pageH = orientation === 'portrait' ? size.h : size.w;
    const { cols, rows } = grid(pageW, pageH, tw, th);
    return { orientation, pageW, pageH, cols, rows, perPage: cols * rows };
  });
  const best = options[1].perPage > options[0].perPage ? options[1] : options[0];
  const { orientation, pageW, pageH, cols, rows, perPage } = best;

  // Tickets butt up against each other so one cut separates two of them, and
  // the block is centred so the leftover paper splits evenly round the edge.
  const blockW = cols * tw;
  const blockH = rows * th;
  const left = (pageW - blockW) / 2;
  const bottom = (pageH - blockH) / 2;
  const top = bottom + blockH;

  const slots: Rect[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      slots.push({ x: left + c * tw, y: top - (r + 1) * th, w: tw, h: th });
    }
  }

  const cutMarks: Line[] = [];
  if (perPage > 0) {
    const sideLen = Math.min(MARK_MAX, left - MARK_GAP - MARK_EDGE);
    const endLen = Math.min(MARK_MAX, bottom - MARK_GAP - MARK_EDGE);
    // Vertical cuts: short marks above and below the block.
    if (endLen >= 3) {
      for (let c = 0; c <= cols; c++) {
        const x = left + c * tw;
        cutMarks.push({ x1: x, y1: top + MARK_GAP, x2: x, y2: top + MARK_GAP + endLen });
        cutMarks.push({ x1: x, y1: bottom - MARK_GAP, x2: x, y2: bottom - MARK_GAP - endLen });
      }
    }
    // Horizontal cuts: short marks left and right of the block.
    if (sideLen >= 3) {
      for (let r = 0; r <= rows; r++) {
        const y = bottom + r * th;
        cutMarks.push({ x1: left - MARK_GAP, y1: y, x2: left - MARK_GAP - sideLen, y2: y });
        cutMarks.push({ x1: left + blockW + MARK_GAP, y1: y, x2: left + blockW + MARK_GAP + sideLen, y2: y });
      }
    }
  }

  return { paper, mode, orientation, pageW, pageH, cols, rows, perPage, slots, cutMarks };
}

/**
 * Independent check that a layout is printable: every ticket is full size,
 * inside the printable area, and no two tickets overlap. The PDF is only made
 * when this returns no problems.
 */
export function checkLayout(layout: PageLayout, designLandscape: boolean): string[] {
  const problems: string[] = [];
  const { w: tw, h: th } = ticketSize(designLandscape);
  if (layout.perPage < 1 || layout.slots.length < 1) {
    return [`A ${TICKET_LONG_IN} × ${TICKET_SHORT_IN} in ticket does not fit on ${layout.paper}.`];
  }
  const margin = layout.mode === 'single' ? 0 : SAFE_MARGIN;
  const eps = 0.01;
  layout.slots.forEach((s, i) => {
    if (Math.abs(s.w - tw) > eps || Math.abs(s.h - th) > eps) {
      problems.push(`Ticket ${i + 1} is not ${TICKET_LONG_IN} × ${TICKET_SHORT_IN} in.`);
    }
    if (
      s.x < margin - eps ||
      s.y < margin - eps ||
      s.x + s.w > layout.pageW - margin + eps ||
      s.y + s.h > layout.pageH - margin + eps
    ) {
      problems.push(`Ticket ${i + 1} runs into the edge of the paper.`);
    }
    for (let j = 0; j < i; j++) {
      const o = layout.slots[j];
      const overlapW = Math.min(s.x + s.w, o.x + o.w) - Math.max(s.x, o.x);
      const overlapH = Math.min(s.y + s.h, o.y + o.h) - Math.max(s.y, o.y);
      if (overlapW > eps && overlapH > eps) problems.push(`Tickets ${j + 1} and ${i + 1} overlap.`);
    }
  });
  return problems;
}

export function pageCount(layout: PageLayout, tickets: number): number {
  return layout.perPage > 0 ? Math.ceil(tickets / layout.perPage) : 0;
}

export const inches = (pt: number) => Math.round((pt / POINTS_PER_INCH) * 100) / 100;
