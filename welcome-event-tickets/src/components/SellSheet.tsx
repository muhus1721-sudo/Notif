import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius, space, useTheme } from '../theme';
import { Sale, TicketRow } from '../types';
import { Button, Field } from './ui';

type Props = {
  row: TicketRow | null;
  defaultPrice: string;
  sellerName: string;
  onSell: (serial: string, sale: Sale) => void;
  onUnsell: (serial: string) => void;
  onClose: () => void;
};

/** Bottom sheet for recording (or correcting) who bought one ticket. */
export function SellSheet({ row, defaultPrice, sellerName, onSell, onUnsell, onClose }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [buyer, setBuyer] = useState('');
  const [phone, setPhone] = useState('');
  const [price, setPrice] = useState('');
  const [soldBy, setSoldBy] = useState('');

  // Fill the form once per ticket opened. Keyed on the serial alone: a
  // background sync replaces the row object and must not wipe what's typed.
  const serial = row?.serial;
  useEffect(() => {
    if (!row) return;
    const sold = row.status === 'Sold';
    setBuyer(sold ? row.buyer : '');
    setPhone(sold ? row.phone : '');
    setPrice(sold ? row.price : defaultPrice);
    setSoldBy(sold ? row.soldBy : sellerName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serial]);

  if (!row) return null;
  const sold = row.status === 'Sold';

  const save = () => {
    if (!buyer.trim()) {
      Alert.alert('Buyer name needed', 'Enter who bought this ticket.');
      return;
    }
    onSell(row.serial, { buyer, phone, price, soldBy });
    onClose();
  };

  const unsell = () =>
    Alert.alert(`Mark ${row.serial} as unsold?`, `This removes ${row.buyer}'s details from the sheet.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark unsold',
        style: 'destructive',
        onPress: () => {
          onUnsell(row.serial);
          onClose();
        },
      },
    ]);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: t.overlay }]} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.sheet, { backgroundColor: t.bg, paddingBottom: insets.bottom + space.lg }]}>
          <View style={styles.header}>
            <Text style={[styles.serial, { color: t.text }]}>{row.serial}</Text>
            <Text style={[styles.status, { color: sold ? t.accent : t.textDim }]}>
              {sold ? `Sold${row.soldAt ? ` · ${row.soldAt}` : ''}` : 'Unsold'}
            </Text>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
            <Field label="Buyer name" value={buyer} onChangeText={setBuyer} placeholder="Full name" autoFocus={!sold} autoCapitalize="words" />
            <Field label="Phone" value={phone} onChangeText={setPhone} placeholder="Optional" keyboardType="phone-pad" />
            <View style={styles.pair}>
              <View style={styles.flex}>
                <Field label="Price" value={price} onChangeText={setPrice} placeholder="0" keyboardType="decimal-pad" />
              </View>
              <View style={styles.flex}>
                <Field label="Sold by" value={soldBy} onChangeText={setSoldBy} placeholder="Your name" autoCapitalize="words" />
              </View>
            </View>
            <Button label={sold ? 'Save changes' : 'Mark as sold'} onPress={save} />
            {sold ? <Button label="Mark as unsold" kind="danger" onPress={unsell} /> : null}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  sheet: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingTop: space.xl, maxHeight: '90%' },
  header: { paddingHorizontal: space.lg, marginBottom: space.md },
  serial: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  status: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  form: { paddingHorizontal: space.lg, gap: space.md },
  pair: { flexDirection: 'row', gap: space.md },
  flex: { flex: 1 },
});
