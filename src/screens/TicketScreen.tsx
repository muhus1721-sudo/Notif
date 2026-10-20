import React, { useState } from 'react';
import {
  Alert,
  GestureResponderEvent,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { Button, Card, Label, Note, ScreenTitle } from '../components/ui';
import { designWarnings, pickDesign } from '../design';
import { TICKET_LONG_IN, TICKET_SHORT_IN, ticketSize } from '../layout';
import { formatSerial } from '../serial';
import { radius, space, useTheme } from '../theme';
import { TicketStore } from '../useTickets';

const COLORS = [
  { value: '#000000', label: 'Black' },
  { value: '#FFFFFF', label: 'White' },
  { value: '#C8102E', label: 'Red' },
  { value: '#1D3F8F', label: 'Blue' },
];
const MIN_SIZE = 8;
const MAX_SIZE = 48;

export function TicketScreen({ store, bottomInset }: { store: TicketStore; bottomInset: number }) {
  const t = useTheme();
  const { width: screenW } = useWindowDimensions();
  const { design, setDesign, settings } = store;
  const [busy, setBusy] = useState(false);

  const upload = async () => {
    setBusy(true);
    try {
      const next = await pickDesign(design);
      if (next) setDesign(next);
    } catch (error) {
      Alert.alert('Could not use that image', error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  if (!design) {
    return (
      <ScrollView contentContainerStyle={{ paddingBottom: bottomInset }}>
        <ScreenTitle title="Ticket" subtitle="Step 1 · Upload your design" />
        <View style={styles.body}>
          <Card style={styles.empty}>
            <Text style={styles.glyph}>🎟️</Text>
            <Text style={[styles.emptyTitle, { color: t.text }]}>Upload your ticket design</Text>
            <Text style={[styles.emptyBody, { color: t.textDim }]}>
              Make the ticket in Canva, Photoshop or anything else and export it as a PNG or JPG
              at {TICKET_LONG_IN} × {TICKET_SHORT_IN} in — ideally 2100 × 1050 px. Leave a clear
              spot for the serial number. The app adds the numbers for you.
            </Text>
            <Button label="Choose image" onPress={upload} busy={busy} style={styles.full} />
          </Card>
        </View>
      </ScrollView>
    );
  }

  const landscape = design.width >= design.height;
  const ticket = ticketSize(landscape);
  // The preview is drawn at the ticket's true 2 : 1 shape, as it will print.
  const maxW = screenW - space.lg * 2;
  const previewW = landscape ? maxW : Math.min(maxW, 260);
  const previewH = (previewW * ticket.h) / ticket.w;
  const scale = previewW / ticket.w; // screen px per PDF point
  const fontPx = design.fontSize * scale;
  const sample = formatSerial(settings.nextNumber);
  const warnings = designWarnings(design);

  const place = (e: GestureResponderEvent) => {
    const { locationX, locationY } = e.nativeEvent;
    const clamp = (v: number) => Math.min(1, Math.max(0, v));
    setDesign({ ...design, numberX: clamp(locationX / previewW), numberY: clamp(locationY / previewH) });
  };

  const resize = (delta: number) => {
    const fontSize = Math.min(MAX_SIZE, Math.max(MIN_SIZE, design.fontSize + delta));
    setDesign({ ...design, fontSize });
  };

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: bottomInset }}>
      <ScreenTitle
        title="Ticket"
        subtitle={`${TICKET_LONG_IN} × ${TICKET_SHORT_IN} in · ${design.width} × ${design.height} px`}
      />
      <View style={styles.body}>
        <Text style={[styles.help, { color: t.textDim }]}>Tap the ticket where the serial number should go.</Text>

        <Pressable
          onPress={place}
          accessibilityLabel="Ticket preview. Tap to place the serial number."
          style={[styles.preview, { width: previewW, height: previewH, borderColor: t.border }]}
        >
          <Image
            source={{ uri: design.uri }}
            style={{ width: previewW, height: previewH }}
            resizeMode="stretch"
          />
          <View
            pointerEvents="none"
            style={[
              styles.numberBox,
              {
                left: design.numberX * previewW - 150,
                top: design.numberY * previewH - fontPx,
                height: fontPx * 2,
              },
            ]}
          >
            <Text
              style={[
                styles.number,
                { color: design.color, fontSize: fontPx, lineHeight: fontPx * 1.2 },
              ]}
            >
              {sample}
            </Text>
          </View>
        </Pressable>

        {warnings.map((w) => (
          <Note key={w} tone="warn">
            {w}
          </Note>
        ))}

        <Card>
          <View style={styles.row}>
            <Label>Number size</Label>
            <View style={styles.stepper}>
              <Button label="−" kind="secondary" onPress={() => resize(-2)} style={styles.step} />
              <Text style={[styles.stepValue, { color: t.text }]}>{design.fontSize} pt</Text>
              <Button label="+" kind="secondary" onPress={() => resize(2)} style={styles.step} />
            </View>
          </View>

          <View style={styles.row}>
            <Label>Colour</Label>
            <View style={styles.swatches}>
              {COLORS.map((c) => {
                const selected = c.value === design.color;
                return (
                  <Pressable
                    key={c.value}
                    onPress={() => setDesign({ ...design, color: c.value })}
                    accessibilityRole="button"
                    accessibilityLabel={c.label}
                    accessibilityState={{ selected }}
                    style={[
                      styles.swatch,
                      {
                        backgroundColor: c.value,
                        borderColor: selected ? t.accent : t.border,
                        borderWidth: selected ? 3 : StyleSheet.hairlineWidth * 2,
                      },
                    ]}
                  />
                );
              })}
            </View>
          </View>
        </Card>

        <Button label="Replace design" kind="secondary" onPress={upload} busy={busy} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: space.lg, gap: space.lg },
  empty: { alignItems: 'center', paddingVertical: space.xxl },
  glyph: { fontSize: 44 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyBody: { fontSize: 14, lineHeight: 21, textAlign: 'center' },
  full: { alignSelf: 'stretch', marginTop: space.sm },
  help: { fontSize: 14 },
  preview: {
    alignSelf: 'center',
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  numberBox: { position: 'absolute', width: 300, alignItems: 'center', justifyContent: 'center' },
  number: { fontWeight: '700', includeFontPadding: false, textAlignVertical: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  step: { minHeight: 40, width: 44, paddingHorizontal: 0 },
  stepValue: { fontSize: 16, fontWeight: '700', minWidth: 52, textAlign: 'center' },
  swatches: { flexDirection: 'row', gap: space.sm },
  swatch: { width: 34, height: 34, borderRadius: radius.pill },
});
