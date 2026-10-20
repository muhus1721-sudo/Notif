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

import { isSheetUrl, listRows } from '../sheet';
import { radius, space, useTheme } from '../theme';
import { TicketStore } from '../useTickets';
import { Button, Field, Note } from './ui';

/** Connects this phone to the shared Google Sheet and holds seller defaults. */
export function ConnectSheet({ store, visible, onClose }: { store: TicketStore; visible: boolean; onClose: () => void }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { settings } = store;
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setUrl(settings.sheetUrl);
    setKey(settings.teamKey);
    setName(settings.sellerName);
    setPrice(settings.defaultPrice);
    // Only refill when the sheet opens, not on every settings change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const save = async () => {
    store.updateSettings({ sellerName: name.trim(), defaultPrice: price.trim() });
    const changed = url.trim() !== settings.sheetUrl || key.trim() !== settings.teamKey;
    if (!url.trim() && !key.trim()) {
      onClose();
      return;
    }
    if (!changed && store.connected) {
      onClose();
      return;
    }
    if (!isSheetUrl(url)) {
      Alert.alert('Check the link', 'Paste the web app URL from Apps Script. It starts with https://script.google.com/ and ends with /exec.');
      return;
    }
    if (!key.trim()) {
      Alert.alert('Team key needed', 'Enter the TEAM_KEY you set in the script.');
      return;
    }
    setBusy(true);
    try {
      // Prove the link and key work before saving them.
      const result = await listRows({ sheetUrl: url, teamKey: key.trim() });
      store.connect(url, key);
      onClose();
      Alert.alert('Connected', `The sheet has ${result.rows.length} ticket${result.rows.length === 1 ? '' : 's'}. Anything recorded on this phone will now upload.`);
    } catch (error) {
      Alert.alert('Could not connect', error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const disconnect = () =>
    Alert.alert('Disconnect this phone?', 'The sheet keeps everything. New sales stay on this phone until you connect again.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: () => {
          store.disconnect();
          onClose();
        },
      },
    ]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: t.overlay }]} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.sheet, { backgroundColor: t.bg, paddingBottom: insets.bottom + space.lg }]}>
          <Text style={[styles.title, { color: t.text }]}>Shared sheet</Text>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
            <Note>
              One person sets up the Google Sheet once (see the README, “Connect the Google Sheet”) and
              sends everyone the web app link and team key. Every phone with them sees the same sales.
            </Note>
            <Field
              label="Web app link"
              value={url}
              onChangeText={setUrl}
              placeholder="https://script.google.com/macros/s/…/exec"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <Field label="Team key" value={key} onChangeText={setKey} placeholder="From the script" autoCapitalize="none" autoCorrect={false} secureTextEntry />
            <View style={styles.pair}>
              <View style={styles.flex}>
                <Field label="Your name" value={name} onChangeText={setName} placeholder="Sold by" autoCapitalize="words" />
              </View>
              <View style={styles.flex}>
                <Field label="Ticket price" value={price} onChangeText={setPrice} placeholder="e.g. 500" keyboardType="decimal-pad" />
              </View>
            </View>
            <Button label={store.connected ? 'Save' : 'Connect'} onPress={save} busy={busy} />
            {store.connected ? <Button label="Disconnect" kind="danger" onPress={disconnect} /> : null}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  sheet: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingTop: space.xl, maxHeight: '92%' },
  title: { fontSize: 24, fontWeight: '800', paddingHorizontal: space.lg, marginBottom: space.md },
  form: { paddingHorizontal: space.lg, gap: space.md },
  pair: { flexDirection: 'row', gap: space.md },
  flex: { flex: 1 },
});
