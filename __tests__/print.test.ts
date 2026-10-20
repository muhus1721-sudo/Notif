import { deflateSync } from 'zlib';

import { PDFDocument, StandardFonts } from 'pdf-lib';

import { checkLayout, computeLayout, inches, pageCount } from '../src/layout';
import { buildTicketPdf, detectImageKind } from '../src/pdf';
import { formatSerial, parseSerial, serialRange, serialWidth } from '../src/serial';
import { TicketDesign } from '../src/types';

/** A tiny solid-colour RGB PNG, enough for pdf-lib to embed. */
function png(width: number, height: number): Uint8Array {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf: Buffer) => {
    let c = -1;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type), data]);
    const out = Buffer.alloc(8 + data.length + 4);
    out.writeUInt32BE(data.length, 0);
    body.copy(out, 4);
    out.writeUInt32BE(crc(body), 8 + data.length);
    return out;
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const raw = Buffer.alloc((width * 3 + 1) * height, 0xcc);
  for (let y = 0; y < height; y++) raw[y * (width * 3 + 1)] = 0;
  return new Uint8Array(
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', ihdr),
      chunk('IDAT', deflateSync(raw)),
      chunk('IEND', Buffer.alloc(0)),
    ])
  );
}

const design: TicketDesign = {
  uri: 'file:///ticket.png',
  width: 2100,
  height: 1050,
  numberX: 0.85,
  numberY: 0.2,
  fontSize: 18,
  color: '#000000',
};

describe('serial numbers', () => {
  test('are NW- plus at least three digits', () => {
    expect(formatSerial(1)).toBe('NW-001');
    expect(formatSerial(42)).toBe('NW-042');
    expect(formatSerial(200)).toBe('NW-200');
    expect(formatSerial(1234)).toBe('NW-1234');
    expect(serialRange(199, 3)).toEqual(['NW-199', 'NW-200', 'NW-201']);
  });

  test('parse back from what people type', () => {
    expect(parseSerial('NW-017')).toBe(17);
    expect(parseSerial('nw17')).toBe(17);
    expect(parseSerial(' 17 ')).toBe(17);
    expect(parseSerial('NW-0')).toBeNull();
    expect(parseSerial('Ahmed')).toBeNull();
  });

  test('width table matches the font the PDF draws with', async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.HelveticaBold);
    for (const s of ['NW-001', 'NW-200', 'NW-1987']) {
      expect(serialWidth(s, 18)).toBeCloseTo(font.widthOfTextAtSize(s, 18), 3);
    }
  });
});

describe('A4 layout', () => {
  test('a landscape 7 × 3.5 in ticket fits 3 to a portrait A4 page', () => {
    const layout = computeLayout(true, 'A4', 'sheet');
    expect(layout.orientation).toBe('portrait');
    expect([layout.cols, layout.rows, layout.perPage]).toEqual([1, 3, 3]);
    expect(checkLayout(layout, true)).toEqual([]);
    // Each ticket is exactly 7 × 3.5 in.
    for (const s of layout.slots) expect([inches(s.w), inches(s.h)]).toEqual([7, 3.5]);
    // Centred, with about 0.63 in at the sides and 0.6 in top and bottom.
    const s0 = layout.slots[0];
    const s2 = layout.slots[2];
    expect(inches(s0.x)).toBeCloseTo(0.63, 1);
    expect(inches(layout.pageW - s0.x - s0.w)).toBeCloseTo(0.63, 1);
    expect(inches(s2.y)).toBeCloseTo(0.6, 1);
    expect(inches(layout.pageH - s0.y - s0.h)).toBeCloseTo(0.6, 1);
    // Reading order: first ticket at the top of the page.
    expect(s0.y).toBeGreaterThan(s2.y);
  });

  test('an upright design turns the page instead of the ticket', () => {
    const layout = computeLayout(false, 'A4', 'sheet');
    expect(layout.orientation).toBe('landscape');
    expect(layout.perPage).toBe(3);
    expect([layout.cols, layout.rows]).toEqual([3, 1]);
    expect(checkLayout(layout, false)).toEqual([]);
  });

  test('US Letter also fits 3', () => {
    const layout = computeLayout(true, 'Letter', 'sheet');
    expect(layout.perPage).toBe(3);
    expect(checkLayout(layout, true)).toEqual([]);
  });

  test('cut marks stay in the margin, never on a ticket or off the page', () => {
    const layout = computeLayout(true, 'A4', 'sheet');
    expect(layout.cutMarks.length).toBe(2 * 2 + 4 * 2);
    for (const m of layout.cutMarks) {
      for (const [x, y] of [[m.x1, m.y1], [m.x2, m.y2]]) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(layout.pageW);
        expect(y).toBeLessThanOrEqual(layout.pageH);
        const inside = layout.slots.some(
          (s) => x > s.x + 0.01 && x < s.x + s.w - 0.01 && y > s.y + 0.01 && y < s.y + s.h - 0.01
        );
        expect(inside).toBe(false);
      }
    }
  });

  test('one per page is the ticket size exactly', () => {
    const layout = computeLayout(true, 'A4', 'single');
    expect([inches(layout.pageW), inches(layout.pageH)]).toEqual([7, 3.5]);
    expect(checkLayout(layout, true)).toEqual([]);
  });

  test('200 tickets take 67 pages', () => {
    expect(pageCount(computeLayout(true, 'A4', 'sheet'), 200)).toBe(67);
    expect(pageCount(computeLayout(true, 'A4', 'single'), 200)).toBe(200);
  });

  test('the check catches a ticket that would hang off the page', () => {
    const layout = computeLayout(true, 'A4', 'sheet');
    const broken = { ...layout, slots: [{ ...layout.slots[0], x: 300 }] };
    expect(checkLayout(broken, true).join()).toMatch(/edge/);
  });
});

describe('PDF', () => {
  test('recognises PNG and JPG by content', () => {
    expect(detectImageKind(png(2, 1))).toBe('png');
    expect(detectImageKind(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('jpg');
    expect(detectImageKind(new Uint8Array([0x47, 0x49, 0x46, 0x38]))).toBeNull();
  });

  test('200 tickets on A4 come out as 67 A4 pages', async () => {
    const bytes = await buildTicketPdf({
      design,
      imageBytes: png(210, 105),
      layout: computeLayout(true, 'A4', 'sheet'),
      start: 1,
      count: 200,
    });
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(67);
    const { width, height } = doc.getPage(0).getSize();
    expect([Math.round(width), Math.round(height)]).toEqual([595, 842]);
    expect(doc.getTitle()).toBe('Tickets NW-001 to NW-200');
  });

  test('a later batch carries on numbering', async () => {
    const bytes = await buildTicketPdf({
      design,
      imageBytes: png(210, 105),
      layout: computeLayout(true, 'A4', 'single'),
      start: 201,
      count: 50,
    });
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(50);
    expect(doc.getTitle()).toBe('Tickets NW-201 to NW-250');
  });

  test('rejects images that are not PNG or JPG', async () => {
    await expect(
      buildTicketPdf({
        design,
        imageBytes: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]),
        layout: computeLayout(true, 'A4', 'sheet'),
        start: 1,
        count: 1,
      })
    ).rejects.toThrow(/PNG or JPG/);
  });
});
