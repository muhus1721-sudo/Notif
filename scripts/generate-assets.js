/**
 * Generates the app's PNG assets (icon, adaptive icon layers, splash, notification
 * icon, favicon) from a single vector-ish bell definition, so the project has no
 * binary assets checked in that can't be regenerated.
 *
 * Run with: node scripts/generate-assets.js
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

/* ---------------------------------------------------------------- PNG writer */

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ------------------------------------------------------------------- shapes */

// All shape math works in a normalised 0..1 square so it scales to any size.
const disc = (x, y, cx, cy, r) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;

function roundedRect(x, y, cx, cy, halfW, halfH, r) {
  const dx = Math.max(Math.abs(x - cx) - (halfW - r), 0);
  const dy = Math.max(Math.abs(y - cy) - (halfH - r), 0);
  return Math.hypot(dx, dy) <= r;
}

function inBell(x, y) {
  if (disc(x, y, 0.5, 0.175, 0.05)) return true; // top knob
  if (y >= 0.2 && y <= 0.665) {
    // Dome flaring into a skirt: half-width grows with a gentle curve.
    const t = (y - 0.2) / 0.465;
    const halfW = 0.115 + 0.245 * Math.pow(t, 1.7);
    if (Math.abs(x - 0.5) <= halfW) return true;
  }
  if (roundedRect(x, y, 0.5, 0.692, 0.395, 0.036, 0.032)) return true; // rim
  if (disc(x, y, 0.5, 0.793, 0.072)) return true; // clapper
  return false;
}

// 4x4 supersampling gives clean antialiased edges without a rasteriser.
function coverage(px, py, size, shape) {
  let hits = 0;
  for (let sy = 0; sy < 4; sy++) {
    for (let sx = 0; sx < 4; sx++) {
      const x = (px + (sx + 0.5) / 4) / size;
      const y = (py + (sy + 0.5) / 4) / size;
      if (shape(x, y)) hits++;
    }
  }
  return hits / 16;
}

/* ------------------------------------------------------------------ drawing */

const hex = (h) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];

/**
 * @param {number} size          square edge in px
 * @param {string|null} bg       background colour, or null for transparency
 * @param {string} fg            bell colour
 * @param {number} scale         bell size relative to the canvas
 * @param {string|null} plate    optional rounded plate behind the bell
 */
function render(size, bg, fg, scale, plate = null) {
  const buf = Buffer.alloc(size * size * 4);
  const [br, bgc, bb] = bg ? hex(bg) : [0, 0, 0];
  const [fr, fgc, fb] = hex(fg);
  const [pr, pg, pb] = plate ? hex(plate) : [0, 0, 0];
  const inset = (1 - scale) / 2;
  const bell = (x, y) => inBell((x - inset) / scale, (y - inset) / scale);
  const plateShape = (x, y) => roundedRect(x, y, 0.5, 0.5, 0.34, 0.34, 0.105);

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const i = (py * size + px) * 4;
      let r = br, g = bgc, b = bb, a = bg ? 255 : 0;

      if (plate) {
        const pc = coverage(px, py, size, plateShape);
        if (pc > 0) {
          const na = a / 255 + (1 - a / 255) * pc;
          r = (r * (a / 255) * (1 - pc) + pr * pc) / na;
          g = (g * (a / 255) * (1 - pc) + pg * pc) / na;
          b = (b * (a / 255) * (1 - pc) + pb * pc) / na;
          a = Math.round(na * 255);
        }
      }

      const c = coverage(px, py, size, bell);
      if (c > 0) {
        const na = a / 255 + (1 - a / 255) * c;
        r = (r * (a / 255) * (1 - c) + fr * c) / na;
        g = (g * (a / 255) * (1 - c) + fgc * c) / na;
        b = (b * (a / 255) * (1 - c) + fb * c) / na;
        a = Math.round(na * 255);
      }

      buf[i] = Math.round(r);
      buf[i + 1] = Math.round(g);
      buf[i + 2] = Math.round(b);
      buf[i + 3] = a;
    }
  }
  return encodePng(size, size, buf);
}

/* -------------------------------------------------------------------- output */

const INK = '#0B0D12';
const ACCENT = '#6C8CFF';
const out = (name, buf) => {
  const file = path.join(__dirname, '..', 'assets', name);
  fs.writeFileSync(file, buf);
  console.log(`${name.padEnd(32)} ${(buf.length / 1024).toFixed(1)} KB`);
};

out('icon.png', render(1024, INK, ACCENT, 0.62));
out('adaptive-icon.png', render(1024, null, ACCENT, 0.42));
out('adaptive-icon-background.png', render(1024, INK, INK, 0.0001));
out('adaptive-icon-monochrome.png', render(1024, null, '#ffffff', 0.42));
out('splash-icon.png', render(512, null, ACCENT, 0.7));
out('notification-icon.png', render(96, null, '#ffffff', 0.8));
out('favicon.png', render(64, INK, ACCENT, 0.62));

// Quick terminal preview so the shape can be eyeballed without opening a file.
if (process.argv.includes('--preview')) {
  const ramp = ' .:-=+*#%@';
  for (let y = 0; y < 34; y++) {
    let line = '';
    for (let x = 0; x < 34; x++) {
      const c = coverage(x, y, 34, inBell);
      line += ramp[Math.min(ramp.length - 1, Math.round(c * (ramp.length - 1)))];
    }
    console.log(line);
  }
}
