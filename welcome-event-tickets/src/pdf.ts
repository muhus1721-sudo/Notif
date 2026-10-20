import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

import { PageLayout, checkLayout } from './layout';
import { CAP_HEIGHT, serialRange } from './serial';
import { TicketDesign } from './types';

export type ImageKind = 'png' | 'jpg';

/** Identifies the image by its first bytes rather than trusting a file name. */
export function detectImageKind(bytes: Uint8Array): ImageKind | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'png';
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg';
  return null;
}

function hexToRgb(hex: string) {
  const n = parseInt(hex.replace('#', ''), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

export type BuildOptions = {
  design: TicketDesign;
  imageBytes: Uint8Array;
  layout: PageLayout;
  start: number;
  count: number;
};

/**
 * Builds the print-ready PDF: the design drawn at exactly 7 × 3.5 in for every
 * ticket, each stamped with its own serial number, laid out per `layout`.
 *
 * The image is embedded once and referenced from every ticket, so 200 tickets
 * cost barely more than one.
 */
export async function buildTicketPdf({ design, imageBytes, layout, start, count }: BuildOptions) {
  const landscape = design.width >= design.height;
  const problems = checkLayout(layout, landscape);
  if (problems.length) throw new Error(problems[0]);

  const kind = detectImageKind(imageBytes);
  if (!kind) throw new Error('The ticket design must be a PNG or JPG image.');

  const doc = await PDFDocument.create();
  doc.setTitle(`Tickets ${serialRange(start, 1)[0]} to ${serialRange(start + count - 1, 1)[0]}`);
  doc.setCreator('Welcome Event Tickets');

  const image = kind === 'png' ? await doc.embedPng(imageBytes) : await doc.embedJpg(imageBytes);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const color = hexToRgb(design.color);
  const size = design.fontSize;
  const serials = serialRange(start, count);

  for (let i = 0; i < serials.length; i += layout.perPage) {
    const page = doc.addPage([layout.pageW, layout.pageH]);

    serials.slice(i, i + layout.perPage).forEach((serial, k) => {
      const slot = layout.slots[k];
      page.drawImage(image, { x: slot.x, y: slot.y, width: slot.w, height: slot.h });

      // numberX/Y are measured from the ticket's top-left; PDF y runs upward.
      const cx = slot.x + design.numberX * slot.w;
      const cy = slot.y + slot.h - design.numberY * slot.h;
      page.drawText(serial, {
        x: cx - font.widthOfTextAtSize(serial, size) / 2,
        y: cy - (CAP_HEIGHT * size) / 2,
        size,
        font,
        color,
      });
    });

    for (const m of layout.cutMarks) {
      page.drawLine({
        start: { x: m.x1, y: m.y1 },
        end: { x: m.x2, y: m.y2 },
        thickness: 0.5,
        color: rgb(0, 0, 0),
      });
    }
  }

  return doc.save();
}
