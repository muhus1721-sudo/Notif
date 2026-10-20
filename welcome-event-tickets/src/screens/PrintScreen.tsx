import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Segmented } from '../components/Segmented';
import { Button, Card, Field, Label, Note, ScreenTitle } from '../components/ui';
import { readDesignBytes, sharePdf } from '../design';
import {
  LayoutMode,
  PAPER_SIZES,
  PageLayout,
  Paper,
  checkLayout,
  computeLayout,
  inches,
  pageCount,
} from '../layout';
import { buildTicketPdf } from '../pdf';
import { formatSerial } from '../serial';
import { radius, space, useTheme } from '../theme';
import { TicketStore } from '../useTickets';

/** A generous ceiling so a typo like 20000 doesn't freeze the phone. */
const MAX_TICKETS = 5000;

const toInt = (text: string) => (/^\d+$/.test(text.trim()) ? Number(text.trim()) : NaN);

export function PrintScreen({
  store,
  bottomInset,
  onNeedDesign,
}: {
  store: TicketStore;
  bottomInset: number;
  onNeedDesign: () => void;
}) {
  const t = useTheme();
  const { design, settings, updateSettings, rows, addBatch } = store;
  const [startText, setStartText] = useState<string | null>(null);
  const [countText, setCountText] = useState('200');
  const [busy, setBusy] = useState(false);

  const landscape = design ? design.width >= design.height : true;
  const layout = useMemo(
    () => computeLayout(landscape, settings.paper, settings.layoutMode),
    [landscape, settings.paper, settings.layoutMode]
  );
  const sheetLayout = useMemo(() => computeLayout(landscape, settings.paper, 'sheet'), [landscape, settings.paper]);
  const problems = checkLayout(layout, landscape);

  // The start number follows the next unused serial until the user edits it.
  const start = startText === null ? settings.nextNumber : toInt(startText);
  const count = toInt(countText);
  const inputsOk = Number.isInteger(start) && start >= 1 && Number.isInteger(count) && count >= 1 && count <= MAX_TICKETS;
  const end = inputsOk ? start + count - 1 : start;
  const pages = inputsOk ? pageCount(layout, count) : 0;

  const printedBefore = useMemo(() => {
    if (!inputsOk) return 0;
    const existing = new Set(rows.map((r) => r.serial));
    let n = 0;
    for (let i = start; i <= end; i++) if (existing.has(formatSerial(i))) n++;
    return n;
  }, [end, inputsOk, rows, start]);

  if (!design) {
    return (
      <ScrollView contentContainerStyle={{ paddingBottom: bottomInset }}>
        <ScreenTitle title="Print" subtitle="Step 2 · Make the PDF for the printer" />
        <View style={styles.body}>
          <Note>Upload your ticket design first, then come back here to number and print it.</Note>
          <Button label="Go to Ticket" onPress={onNeedDesign} />
        </View>
      </ScrollView>
    );
  }

  const generate = async () => {
    setBusy(true);
    try {
      // Let the spinner paint before the CPU-heavy work starts.
      await new Promise((r) => setTimeout(r, 50));
      const bytes = await buildTicketPdf({
        design,
        imageBytes: await readDesignBytes(design),
        layout,
        start,
        count,
      });
      addBatch(start, count);
      setStartText(null);
      await sharePdf(bytes, `Tickets ${formatSerial(start)} to ${formatSerial(end)}.pdf`);
    } catch (error) {
      Alert.alert('Could not make the PDF', error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const paper = PAPER_SIZES[settings.paper];
  const sideMargin = layout.slots.length ? inches(layout.slots[0].x) : 0;
  const endMargin = layout.slots.length ? inches(layout.slots[layout.slots.length - 1].y) : 0;

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: bottomInset }} keyboardShouldPersistTaps="handled">
      <ScreenTitle title="Print" subtitle="Step 2 · Make the PDF for the printer" />
      <View style={styles.body}>
        <Card>
          <Label>Paper</Label>
          <Segmented<Paper>
            options={[
              { value: 'A4', label: 'A4' },
              { value: 'Letter', label: 'US Letter' },
            ]}
            value={settings.paper}
            onChange={(p) => updateSettings({ paper: p })}
          />
          <Label>Layout</Label>
          <Segmented<LayoutMode>
            options={[
              { value: 'sheet', label: `${sheetLayout.perPage} per page` },
              { value: 'single', label: '1 per page' },
            ]}
            value={settings.layoutMode}
            onChange={(m) => updateSettings({ layoutMode: m })}
          />
        </Card>

        <Card>
          <View style={styles.pair}>
            <View style={styles.flex}>
              <Field
                label="Start at"
                value={startText ?? String(settings.nextNumber)}
                onChangeText={setStartText}
                keyboardType="number-pad"
                hint={inputsOk ? formatSerial(start) : ' '}
              />
            </View>
            <View style={styles.flex}>
              <Field
                label="How many"
                value={countText}
                onChangeText={setCountText}
                keyboardType="number-pad"
                hint={inputsOk ? `to ${formatSerial(end)}` : ' '}
              />
            </View>
          </View>
          {!inputsOk ? <Note tone="warn">Enter a start number and how many tickets (1 to {MAX_TICKETS}).</Note> : null}
        </Card>

        <Card style={styles.summary}>
          <PagePreview layout={layout} />
          <View style={styles.flex}>
            {problems.length ? (
              problems.map((p) => (
                <Text key={p} style={[styles.bad, { color: t.danger }]}>
                  {p}
                </Text>
              ))
            ) : (
              <>
                <Text style={[styles.big, { color: t.text }]}>
                  {inputsOk ? `${count} tickets` : '—'}
                </Text>
                <Text style={[styles.line, { color: t.textDim }]}>
                  {inputsOk ? `${pages} page${pages === 1 ? '' : 's'} · ` : ''}
                  {settings.layoutMode === 'sheet'
                    ? `${layout.perPage} per ${settings.paper} page (${layout.orientation})`
                    : `${inches(layout.pageW)} × ${inches(layout.pageH)} in pages`}
                </Text>
                <Text style={[styles.ok, { color: t.accent }]}>
                  ✓ Fits · each ticket 7 × 3.5 in
                </Text>
                {settings.layoutMode === 'sheet' ? (
                  <Text style={[styles.line, { color: t.textDim }]}>
                    {sideMargin} in margin at the sides, {endMargin} in top and bottom, with cut marks.
                    {'\n'}
                    {paper.label}
                  </Text>
                ) : null}
              </>
            )}
          </View>
        </Card>

        {printedBefore > 0 ? (
          <Note tone="warn">
            {printedBefore} of these serial numbers were printed before. Printing them again makes
            duplicate tickets — only do it to replace spoiled ones.
          </Note>
        ) : null}

        <Button
          label={busy ? 'Making PDF…' : 'Make PDF & share'}
          onPress={generate}
          disabled={!inputsOk || problems.length > 0}
          busy={busy}
        />
        <Text style={[styles.foot, { color: t.textFaint }]}>
          Send the PDF to your printer by WhatsApp, email or Drive. Every serial you print is added
          to the sales sheet as Unsold.
        </Text>
      </View>
    </ScrollView>
  );
}

/** A to-scale sketch of one page with its ticket slots. */
function PagePreview({ layout }: { layout: PageLayout }) {
  const t = useTheme();
  const box = 104;
  const k = box / Math.max(layout.pageW, layout.pageH);
  return (
    <View style={[styles.previewBox, { width: box, height: box }]}>
      <View
        style={{
          width: layout.pageW * k,
          height: layout.pageH * k,
          backgroundColor: '#FFFFFF',
          borderColor: t.border,
          borderWidth: StyleSheet.hairlineWidth * 2,
        }}
      >
        {layout.slots.map((s, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: s.x * k,
              // Slots are in PDF coordinates (origin bottom-left); flip for screen.
              top: (layout.pageH - s.y - s.h) * k,
              width: s.w * k,
              height: s.h * k,
              backgroundColor: t.accentSoft,
              borderColor: t.accent,
              borderWidth: 1,
            }}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: space.lg, gap: space.lg },
  pair: { flexDirection: 'row', gap: space.md },
  flex: { flex: 1, gap: space.xs },
  summary: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  previewBox: { alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  big: { fontSize: 22, fontWeight: '800' },
  line: { fontSize: 13, lineHeight: 19 },
  ok: { fontSize: 14, fontWeight: '700' },
  bad: { fontSize: 14, fontWeight: '600' },
  foot: { fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
