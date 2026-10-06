// Renders every icon/splash PNG from assets/brand/civilaid-mark.svg (spec Sections 2 and 4).
// Run after changing the mark:  npm run brand-assets
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const BRAND = path.join(__dirname, '..', 'assets', 'brand');
const MARK = fs.readFileSync(path.join(BRAND, 'civilaid-mark.svg'), 'utf8');
const BLUE = '#1E5EFF';
const BLUE_DARK = '#4C82FF';

/** The mark in `color`, `markSize` px wide, centred on a `size` px square (optionally filled). */
function mark(color, size, markSize, background) {
  const svg = MARK.replace('stroke="currentColor"', `stroke="${color}"`).replace(
    'viewBox="0 0 120 120"',
    `viewBox="0 0 120 120" width="${markSize}" height="${markSize}" x="${(size - markSize) / 2}" y="${(size - markSize) / 2}"`,
  );
  const bg = background ? `<rect width="${size}" height="${size}" fill="${background}"/>` : '';
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">${bg}${svg}</svg>`);
}

const outputs = [
  // Adaptive icon (Android): foreground stays inside the centre 66% safe zone.
  ['icon-foreground.png', mark('#FFFFFF', 1024, 1024 * 0.5)],
  ['icon-monochrome.png', mark('#FFFFFF', 1024, 1024 * 0.5)],
  ['icon-background.png', mark(BLUE, 1024, 0, BLUE)],
  // Legacy/iOS/web icon: one flat square, white mark on brand blue.
  ['icon.png', mark('#FFFFFF', 1024, 1024 * 0.62, BLUE)],
  // expo-splash-screen while JS loads; then the animated splash takes over.
  ['splash-mark.png', mark(BLUE, 1024, 1024)],
  ['splash-mark-dark.png', mark(BLUE_DARK, 1024, 1024)],
  ['favicon.png', mark(BLUE, 96, 88)],
];

(async () => {
  for (const [name, svg] of outputs) {
    await sharp(svg).png().toFile(path.join(BRAND, name));
    console.log('wrote assets/brand/' + name);
  }
})();
