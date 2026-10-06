import { Marked, type Token, type TokenizerExtension } from 'marked';

/** `$$ … $$` or `\[ … \]` on their own lines. */
const blockMath: TokenizerExtension = {
  name: 'blockMath',
  level: 'block',
  start(src) {
    const i = src.search(/\$\$|\\\[/);
    return i < 0 ? undefined : i;
  },
  tokenizer(src) {
    const m = /^(?:\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\])[ \t]*(?:\n+|$)/.exec(src);
    if (m) return { type: 'blockMath', raw: m[0], text: (m[1] ?? m[2]).trim() };
  },
};

/**
 * `$ … $` or `\( … \)` inside a line. Like most Markdown math renderers, `$` must hug the
 * formula (`$x$`, not `$ x $`) and not be followed by a digit, so "Rs 5 or $5" stays text.
 */
const inlineMath: TokenizerExtension = {
  name: 'inlineMath',
  level: 'inline',
  start(src) {
    const i = src.search(/\$|\\\(/);
    return i < 0 ? undefined : i;
  },
  tokenizer(src) {
    const m = /^(?:\$(?!\s)((?:\\.|[^\\$\n])+?)(?<!\s)\$(?!\d)|\\\(([\s\S]+?)\\\))/.exec(src);
    if (m) return { type: 'inlineMath', raw: m[0], text: (m[1] ?? m[2]).trim() };
  },
};

const parser = new Marked({ gfm: true, extensions: [blockMath, inlineMath] });

export type MdToken = Token;

export function parseMarkdown(source: string): MdToken[] {
  return parser.lexer(source.replace(/\r\n?/g, '\n'));
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'", nbsp: ' ' };

/** Marked keeps HTML entities in text tokens; turn the common ones back into characters. */
export function decodeEntities(text: string): string {
  return text.replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (whole, code: string) => {
    const lower = code.toLowerCase();
    if (lower in ENTITIES) return ENTITIES[lower];
    if (lower.startsWith('#x')) return String.fromCodePoint(parseInt(lower.slice(2), 16));
    if (lower.startsWith('#')) return String.fromCodePoint(parseInt(lower.slice(1), 10));
    return whole;
  });
}
