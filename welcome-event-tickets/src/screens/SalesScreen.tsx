import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConnectSheet } from '../components/ConnectSheet';
import { Segmented } from '../components/Segmented';
import { SellSheet } from '../components/SellSheet';
import { Button, Note, ScreenTitle } from '../components/ui';
import { shareCsv } from '../design';
import { excelDownloadUrl, toCsv } from '../sheet';
import { radius, space, useTheme } from '../theme';
import { TicketRow } from '../types';
import { TicketStore } from '../useTickets';

type Filter = 'all' | 'unsold' | 'sold';

export function SalesScreen({ store, bottomInset }: { store: TicketStore; bottomInset: number }) {
  const t = useTheme();
  const { rows, counts, settings } = store;
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [openSerial, setOpenSerial] = useState<string | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === 'sold' && r.status !== 'Sold') return false;
      if (filter === 'unsold' && r.status !== 'Unsold') return false;
      if (!q) return true;
      return (
        r.serial.toLowerCase().includes(q) ||
        r.buyer.toLowerCase().includes(q) ||
        r.phone.includes(q) ||
        r.soldBy.toLowerCase().includes(q)
      );
    });
  }, [filter, query, rows]);

  const openRow = rows.find((r) => r.serial === openSerial) ?? null;

  return (
    <View style={styles.screen}>
      <ScreenTitle
        title="Sales"
        subtitle={`${counts.sold} sold · ${counts.left} left · ${counts.total} printed`}
        right={
          <Pressable
            onPress={() => setMenuOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Share and settings"
            style={({ pressed }) => [styles.menuBtn, { backgroundColor: t.inset, opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={[styles.menuText, { color: t.text }]}>Share</Text>
          </Pressable>
        }
      />

      <View style={styles.top}>
        <SyncLine store={store} onFix={() => setConnectOpen(true)} />
        {store.notices.map((n) => (
          <Pressable key={n} onPress={store.dismissNotices}>
            <Note tone="warn">{n} (Tap to dismiss)</Note>
          </Pressable>
        ))}
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search serial, buyer or phone"
          placeholderTextColor={t.textFaint}
          autoCorrect={false}
          clearButtonMode="while-editing"
          style={[styles.search, { backgroundColor: t.inset, color: t.text, borderColor: t.border }]}
        />
        <Segmented<Filter>
          options={[
            { value: 'all', label: `All ${counts.total}` },
            { value: 'unsold', label: `Unsold ${counts.left}` },
            { value: 'sold', label: `Sold ${counts.sold}` },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </View>

      <FlatList
        data={shown}
        keyExtractor={(r) => r.serial}
        contentContainerStyle={[styles.list, { paddingBottom: bottomInset }]}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={20}
        renderItem={({ item }) => <Row row={item} onPress={() => setOpenSerial(item.serial)} />}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: t.textDim }]}>
            {rows.length
              ? 'No tickets match.'
              : 'No tickets yet. Make a PDF on the Print tab and every serial number appears here, ready to mark as sold.'}
          </Text>
        }
      />

      <SellSheet
        row={openRow}
        defaultPrice={settings.defaultPrice}
        sellerName={settings.sellerName}
        onSell={store.sell}
        onUnsell={store.unsell}
        onClose={() => setOpenSerial(null)}
      />
      <ConnectSheet store={store} visible={connectOpen} onClose={() => setConnectOpen(false)} />
      <ShareMenu
        store={store}
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onSettings={() => {
          setMenuOpen(false);
          setConnectOpen(true);
        }}
      />
    </View>
  );
}

const Row = React.memo(function Row({ row, onPress }: { row: TicketRow; onPress: () => void }) {
  const t = useTheme();
  const sold = row.status === 'Sold';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${row.serial}, ${sold ? `sold to ${row.buyer}` : 'unsold'}`}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: t.card, borderColor: t.border, opacity: pressed ? 0.75 : 1 },
      ]}
    >
      <Text style={[styles.serial, { color: t.text }]}>{row.serial}</Text>
      <View style={styles.who}>
        <Text style={[styles.buyer, { color: sold ? t.text : t.textFaint }]} numberOfLines={1}>
          {sold ? row.buyer : 'Unsold'}
        </Text>
        {sold && (row.phone || row.soldBy) ? (
          <Text style={[styles.meta, { color: t.textDim }]} numberOfLines={1}>
            {[row.phone, row.soldBy && `by ${row.soldBy}`].filter(Boolean).join(' · ')}
          </Text>
        ) : null}
      </View>
      <View style={[styles.pill, { backgroundColor: sold ? t.accent : t.inset }]}>
        <Text style={[styles.pillText, { color: sold ? t.accentText : t.textDim }]}>{sold ? 'Sold' : 'Sell'}</Text>
      </View>
    </Pressable>
  );
});

function SyncLine({ store, onFix }: { store: TicketStore; onFix: () => void }) {
  const t = useTheme();
  const { syncState, syncMessage, pendingCount, sheet } = store;
  const waiting = pendingCount ? ` · ${pendingCount} change${pendingCount === 1 ? '' : 's'} waiting` : '';
  const time = sheet?.lastSynced
    ? new Date(sheet.lastSynced).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : '';

  const states = {
    local: { dot: t.textFaint, text: 'Not connected to the Google Sheet', action: 'Connect' },
    syncing: { dot: t.accent, text: `Syncing…${waiting}`, action: '' },
    synced: { dot: '#22A06B', text: `Live · synced ${time}${waiting}`, action: 'Sync' },
    offline: { dot: '#E2A03F', text: `Offline${waiting}`, action: 'Retry' },
    error: { dot: t.danger, text: syncMessage || 'The sheet refused the request', action: 'Fix' },
  } as const;
  const s = states[syncState];

  const act = () => (syncState === 'local' || syncState === 'error' ? onFix() : store.sync());

  return (
    <View style={[styles.sync, { backgroundColor: t.card, borderColor: t.border }]}>
      <View style={[styles.dot, { backgroundColor: s.dot }]} />
      <Text style={[styles.syncText, { color: t.textDim }]} numberOfLines={2}>
        {s.text}
      </Text>
      {s.action ? (
        <Pressable onPress={act} accessibilityRole="button" hitSlop={8}>
          <Text style={[styles.syncAction, { color: t.accent }]}>{s.action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function ShareMenu({
  store,
  visible,
  onClose,
  onSettings,
}: {
  store: TicketStore;
  visible: boolean;
  onClose: () => void;
  onSettings: () => void;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { sheet } = store;

  const open = (url: string) => {
    onClose();
    Linking.openURL(url).catch(() => Alert.alert('Could not open the link', url));
  };

  const csv = async () => {
    onClose();
    try {
      await shareCsv(toCsv(store.rows), 'Ticket sales.csv');
    } catch (error) {
      Alert.alert('Could not share', error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: t.overlay }]} onPress={onClose} />
      <View style={[styles.menu, { backgroundColor: t.bg, paddingBottom: insets.bottom + space.lg }]}>
        {sheet ? (
          <>
            <Button label="Open Google Sheet" kind="secondary" onPress={() => open(sheet.sheetUrl)} />
            <Button label="Download as Excel" kind="secondary" onPress={() => open(excelDownloadUrl(sheet.sheetId))} />
          </>
        ) : null}
        <Button label="Share as CSV (opens in Excel)" kind="secondary" onPress={csv} />
        <Button label={store.connected ? 'Sheet settings' : 'Connect Google Sheet'} onPress={onSettings} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  top: { paddingHorizontal: space.lg, gap: space.md, paddingBottom: space.md },
  menuBtn: { paddingHorizontal: space.lg, paddingVertical: space.sm + 2, borderRadius: radius.pill },
  menuText: { fontSize: 15, fontWeight: '700' },
  search: {
    minHeight: 46,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space.md,
    fontSize: 16,
  },
  list: { paddingHorizontal: space.lg, gap: space.sm },
  empty: { textAlign: 'center', fontSize: 14, lineHeight: 21, paddingTop: space.xxl, paddingHorizontal: space.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  serial: { fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'], width: 78 },
  who: { flex: 1 },
  buyer: { fontSize: 15, fontWeight: '600' },
  meta: { fontSize: 12, marginTop: 1 },
  pill: { paddingHorizontal: space.md, paddingVertical: space.xs + 1, borderRadius: radius.pill },
  pillText: { fontSize: 12, fontWeight: '700' },
  sync: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  syncText: { flex: 1, fontSize: 13 },
  syncAction: { fontSize: 14, fontWeight: '700' },
  backdrop: { flex: 1 },
  menu: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: space.lg,
    gap: space.sm,
  },
});
