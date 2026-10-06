// Renders module notes (Markdown + TeX) with native components — no WebView.
// Supported: headings, paragraphs, bold/italic/strike, inline code, code blocks, lists,
// block quotes, tables, images, links, horizontal rules, and $…$ / $$…$$ math.
import { Fragment, memo, useMemo, useState } from 'react';
import { Image, Linking, Platform, ScrollView, StyleSheet, Text, View, type TextStyle } from 'react-native';

import { decodeEntities, parseMarkdown, type MdToken } from '@/lib/markdown';
import { radius, useTheme } from '@/theme/ThemeProvider';
import { fonts, textVariants } from '@/theme/typography';
import { MathView } from './MathView';

const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });

type Props = {
  source: string;
  /** Smaller spacing, for quiz questions and answers. */
  compact?: boolean;
  textStyle?: TextStyle;
};

export const Markdown = memo(function Markdown({ source, compact, textStyle }: Props) {
  const tokens = useMemo(() => parseMarkdown(source), [source]);
  return (
    <View style={{ gap: compact ? 6 : 14 }}>
      {tokens.map((t, i) => (
        <Block key={i} token={t} textStyle={textStyle} />
      ))}
    </View>
  );
});

// marked's token types are a wide union; these helpers read the fields we use.
type Any = MdToken & Record<string, unknown>;
const childTokens = (t: Any) => (t.tokens as MdToken[] | undefined) ?? [];

function Block({ token, textStyle }: { token: MdToken; textStyle?: TextStyle }) {
  const { colors } = useTheme();
  const t = token as Any;
  const base: TextStyle = { ...textVariants.body, color: colors.textPrimary, ...textStyle };

  switch (token.type) {
    case 'heading': {
      const depth = t.depth as number;
      const variant = depth <= 1 ? textVariants.title : depth === 2 ? textVariants.heading : textVariants.bodyStrong;
      return (
        <Text style={[variant, { color: colors.textPrimary, marginTop: depth <= 2 ? 6 : 2 }]} accessibilityRole="header">
          <Inline tokens={childTokens(t)} fontSize={variant.fontSize} />
        </Text>
      );
    }
    case 'paragraph':
    case 'text':
      return <InlineBlock tokens={t.tokens ? childTokens(t) : [token]} style={base} />;
    case 'blockMath':
      return <MathView tex={t.text as string} display fontSize={17} />;
    case 'list': {
      const ordered = t.ordered as boolean;
      const start = Number(t.start) || 1;
      return (
        <View style={styles.list}>
          {(t.items as Any[]).map((item, i) => (
            <View key={i} style={styles.listItem}>
              <Text style={[base, styles.bullet, { color: colors.primary }]}>{ordered ? `${start + i}.` : '•'}</Text>
              <View style={styles.flex}>
                {childTokens(item).map((child, j) => (
                  <Block key={j} token={child} textStyle={textStyle} />
                ))}
              </View>
            </View>
          ))}
        </View>
      );
    }
    case 'blockquote':
      return (
        <View style={[styles.quote, { backgroundColor: colors.primarySoft, borderLeftColor: colors.primary }]}>
          {childTokens(t).map((child, i) => (
            <Block key={i} token={child} textStyle={textStyle} />
          ))}
        </View>
      );
    case 'code':
      return (
        <ScrollView horizontal style={[styles.codeBlock, { backgroundColor: colors.surfaceAlt }]}>
          <Text style={[styles.code, { color: colors.textPrimary }]}>{t.text as string}</Text>
        </ScrollView>
      );
    case 'table':
      return <Table token={t} base={base} />;
    case 'hr':
      return <View style={[styles.hr, { backgroundColor: colors.border }]} />;
    case 'html':
      // Raw HTML isn't rendered; keep any text between tags.
      return (t.text as string).replace(/<[^>]*>/g, '').trim() ? (
        <Text style={base}>{decodeEntities((t.text as string).replace(/<[^>]*>/g, ''))}</Text>
      ) : null;
    default:
      return null;
  }
}

/** A run of inline tokens; images break out into their own full-width blocks. */
function InlineBlock({ tokens, style }: { tokens: MdToken[]; style: TextStyle }) {
  const groups: (MdToken[] | Any)[] = [];
  for (const tok of tokens) {
    if (tok.type === 'image') groups.push(tok as Any);
    else if (Array.isArray(groups[groups.length - 1])) (groups[groups.length - 1] as MdToken[]).push(tok);
    else groups.push([tok]);
  }
  return (
    <>
      {groups.map((g, i) =>
        Array.isArray(g) ? (
          <Text key={i} style={style}>
            <Inline tokens={g} fontSize={style.fontSize} />
          </Text>
        ) : (
          <NoteImage key={i} uri={g.href as string} alt={g.text as string} />
        ),
      )}
    </>
  );
}

function Inline({ tokens, fontSize = 15 }: { tokens: MdToken[]; fontSize?: number }) {
  const { colors } = useTheme();
  return (
    <>
      {tokens.map((tok, i) => {
        const t = tok as Any;
        switch (tok.type) {
          case 'text':
            return t.tokens ? (
              <Inline key={i} tokens={childTokens(t)} fontSize={fontSize} />
            ) : (
              <Fragment key={i}>{decodeEntities(t.text as string)}</Fragment>
            );
          case 'escape':
            return <Fragment key={i}>{t.text as string}</Fragment>;
          case 'strong':
            return (
              <Text key={i} style={{ fontFamily: fonts.semibold }}>
                <Inline tokens={childTokens(t)} fontSize={fontSize} />
              </Text>
            );
          case 'em':
            return (
              <Text key={i} style={{ fontStyle: 'italic' }}>
                <Inline tokens={childTokens(t)} fontSize={fontSize} />
              </Text>
            );
          case 'del':
            return (
              <Text key={i} style={{ textDecorationLine: 'line-through' }}>
                <Inline tokens={childTokens(t)} fontSize={fontSize} />
              </Text>
            );
          case 'codespan':
            return (
              <Text key={i} style={[styles.codespan, { backgroundColor: colors.surfaceAlt }]}>
                {decodeEntities(t.text as string)}
              </Text>
            );
          case 'link':
            return (
              <Text
                key={i}
                style={{ color: colors.primary, textDecorationLine: 'underline' }}
                onPress={() => Linking.openURL(t.href as string)}
              >
                <Inline tokens={childTokens(t)} fontSize={fontSize} />
              </Text>
            );
          case 'br':
            return <Fragment key={i}>{'\n'}</Fragment>;
          case 'inlineMath':
            return <MathView key={i} tex={t.text as string} fontSize={fontSize} />;
          case 'image':
            return <Fragment key={i}>{t.text as string}</Fragment>;
          default:
            return null;
        }
      })}
    </>
  );
}

function Table({ token, base }: { token: Any; base: TextStyle }) {
  const { colors } = useTheme();
  const header = token.header as Any[];
  const rows = token.rows as Any[][];
  const cell = (c: Any, i: number, head: boolean) => (
    <View key={i} style={[styles.cell, { borderColor: colors.border }]}>
      <Text style={[base, head && { fontFamily: fonts.semibold }]}>
        <Inline tokens={childTokens(c)} fontSize={base.fontSize} />
      </Text>
    </View>
  );
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={[styles.table, { borderColor: colors.border }]}>
        <View style={[styles.row, { backgroundColor: colors.surfaceAlt }]}>{header.map((c, i) => cell(c, i, true))}</View>
        {rows.map((r, i) => (
          <View key={i} style={styles.row}>
            {r.map((c, j) => cell(c, j, false))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function NoteImage({ uri, alt }: { uri: string; alt: string }) {
  const { colors } = useTheme();
  const [ratio, setRatio] = useState(16 / 9);
  return (
    <Image
      source={{ uri }}
      accessibilityLabel={alt}
      resizeMode="contain"
      onLoad={(e) => {
        const { width, height } = e.nativeEvent.source;
        if (width && height) setRatio(width / height);
      }}
      style={[styles.image, { aspectRatio: ratio, backgroundColor: colors.surfaceAlt }]}
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 6 },
  list: { gap: 6 },
  listItem: { flexDirection: 'row', gap: 8 },
  bullet: { minWidth: 18, fontFamily: fonts.semibold },
  quote: { borderLeftWidth: 4, borderRadius: radius.sm, padding: 12, gap: 8 },
  codeBlock: { borderRadius: radius.sm, padding: 12 },
  code: { fontFamily: MONO, fontSize: 13, lineHeight: 19 },
  codespan: { fontFamily: MONO, fontSize: 13 },
  table: { borderWidth: 1, borderRadius: radius.sm, overflow: 'hidden' },
  row: { flexDirection: 'row' },
  cell: { width: 140, paddingHorizontal: 10, paddingVertical: 8, borderRightWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
  hr: { height: 1, marginVertical: 4 },
  image: { width: '100%', borderRadius: radius.md },
});
