// TeX → SVG with MathJax, entirely on the device (no WebView, no network).
// MathJax is loaded on first use and every result is cached, so a formula is only
// typeset once per app session.
import type { LiteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor.js';
import type { MathDocument } from 'mathjax-full/js/core/MathDocument.js';

export type MathSvg = {
  xml: string;
  /** Size and baseline offset in `ex` (MathJax's unit; ~0.45 of the font size). */
  widthEx: number;
  heightEx: number;
  verticalAlignEx: number;
};

type Engine = { adaptor: LiteAdaptor; doc: MathDocument<unknown, unknown, unknown> };
let engine: Engine | null = null;
const cache = new Map<string, MathSvg>();

function getEngine(): Engine {
  if (engine) return engine;
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { mathjax } = require('mathjax-full/js/mathjax.js');
  const { TeX } = require('mathjax-full/js/input/tex.js');
  const { SVG } = require('mathjax-full/js/output/svg.js');
  const { liteAdaptor } = require('mathjax-full/js/adaptors/liteAdaptor.js');
  const { RegisterHTMLHandler } = require('mathjax-full/js/handlers/html.js');
  // Only the TeX packages engineering notes need, to keep the app small.
  require('mathjax-full/js/input/tex/base/BaseConfiguration.js');
  require('mathjax-full/js/input/tex/ams/AmsConfiguration.js');
  require('mathjax-full/js/input/tex/newcommand/NewcommandConfiguration.js');
  require('mathjax-full/js/input/tex/noundefined/NoUndefinedConfiguration.js');
  require('mathjax-full/js/input/tex/boldsymbol/BoldsymbolConfiguration.js');
  require('mathjax-full/js/input/tex/cancel/CancelConfiguration.js');
  require('mathjax-full/js/input/tex/color/ColorConfiguration.js');
  /* eslint-enable @typescript-eslint/no-require-imports */
  const adaptor = liteAdaptor();
  RegisterHTMLHandler(adaptor);
  const doc = mathjax.document('', {
    InputJax: new TeX({ packages: ['base', 'ams', 'newcommand', 'noundefined', 'boldsymbol', 'cancel', 'color'] }),
    // 'none' inlines every glyph path, so each SVG stands alone.
    OutputJax: new SVG({ fontCache: 'none' }),
  });
  engine = { adaptor, doc };
  return engine;
}

function attr(svg: string, name: string): string | undefined {
  return new RegExp(`\\s${name}="([^"]*)"`).exec(svg)?.[1];
}

export function texToSvg(tex: string, display: boolean): MathSvg {
  const key = `${display ? 'D' : 'I'}:${tex}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const { adaptor, doc } = getEngine();
  const node = doc.convert(tex, { display });
  let xml = adaptor.innerHTML(node as never);
  // Display mode wraps the <svg> in an <mjx-container>; keep just the <svg>.
  xml = xml.slice(xml.indexOf('<svg'), xml.lastIndexOf('</svg>') + 6);

  const widthEx = parseFloat(attr(xml, 'width') ?? '0');
  const heightEx = parseFloat(attr(xml, 'height') ?? '0');
  const verticalAlignEx = parseFloat(/vertical-align:\s*(-?[\d.]+)ex/.exec(attr(xml, 'style') ?? '')?.[1] ?? '0');
  // react-native-svg sizes from props; drop the ex-based attributes and the CSS style.
  // Only touch the outer <svg> tag: inner <rect>s (fraction bars) need their width/height.
  const openEnd = xml.indexOf('>') + 1;
  const openTag = xml
    .slice(0, openEnd)
    .replace(/\s(width|height|style)="[^"]*"/g, '')
    .replace('<svg ', '<svg preserveAspectRatio="xMinYMid meet" ');
  xml = openTag + xml.slice(openEnd);

  const result = { xml, widthEx, heightEx, verticalAlignEx };
  cache.set(key, result);
  return result;
}
