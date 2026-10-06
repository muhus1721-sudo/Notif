import { decodeEntities, parseMarkdown } from '@/lib/markdown';
import { texToSvg } from '@/lib/math';

const types = (src: string) => parseMarkdown(src).map((t) => t.type);
const inline = (src: string) => (parseMarkdown(src)[0] as { tokens: { type: string; text: string }[] }).tokens;

describe('parseMarkdown math', () => {
  it('finds inline $…$ and \\(…\\) formulas', () => {
    const tokens = inline('Stress is $\\sigma = P/A$ and \\(E\\) too');
    expect(tokens.filter((t) => t.type === 'inlineMath').map((t) => t.text)).toEqual(['\\sigma = P/A', 'E']);
  });

  it('leaves prices alone', () => {
    expect(inline('It costs $5 or $10.').some((t) => t.type === 'inlineMath')).toBe(false);
    expect(inline('Rs 1000 per semester').some((t) => t.type === 'inlineMath')).toBe(false);
  });

  it('finds display $$…$$ and \\[…\\] blocks', () => {
    expect(types('Intro\n\n$$\nM = \\frac{wL^2}{8}\n$$\n\nAfter')).toContain('blockMath');
    expect(types('\\[ x^2 \\]')).toEqual(['blockMath']);
  });

  it('parses tables, lists and images', () => {
    expect(types('| a | b |\n|---|---|\n| 1 | 2 |')).toEqual(['table']);
    expect(types('- one\n- two')).toEqual(['list']);
    expect(inline('![beam](https://x.y/beam.png)')[0].type).toBe('image');
  });
});

describe('decodeEntities', () => {
  it('decodes the usual entities', () => {
    expect(decodeEntities('a &amp; b &lt; c &#39;d&#39; &#x3C3;')).toBe("a & b < c 'd' σ");
  });
});

describe('texToSvg', () => {
  it('turns TeX into a standalone SVG with size info', () => {
    const svg = texToSvg('\\frac{P}{A}', false);
    expect(svg.xml.startsWith('<svg')).toBe(true);
    expect(svg.widthEx).toBeGreaterThan(0);
    expect(svg.heightEx).toBeGreaterThan(0);
    // The fraction bar keeps its own width/height; only the outer <svg> loses them.
    expect(svg.xml).toMatch(/<rect[^>]*width="/);
    expect(svg.xml.slice(0, svg.xml.indexOf('>'))).not.toMatch(/\swidth=/);
  });

  it('renders display math and survives bad TeX', () => {
    expect(texToSvg('\\int_0^L EI\\,dx', true).xml).toContain('<svg');
    expect(() => texToSvg('\\frac{', false)).not.toThrow();
  });
});
