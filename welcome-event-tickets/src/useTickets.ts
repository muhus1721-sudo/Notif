import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { parseSerial, serialRange } from './serial';
import { SheetConfig, SheetError, applyOp, listRows, sendOp, timestamp, trimSale } from './sheet';
import * as storage from './storage';
import { DEFAULT_SETTINGS, PendingOp, Sale, Settings, TicketDesign, TicketRow } from './types';

export type SyncState = 'local' | 'syncing' | 'synced' | 'offline' | 'error';

/** How often a connected phone pulls other sellers' changes while open. */
const POLL_MS = 20000;

let opCounter = 0;
const newId = () => `${Date.now().toString(36)}-${(opCounter++).toString(36)}`;

const byNumber = (a: TicketRow, b: TicketRow) =>
  (parseSerial(a.serial) ?? 0) - (parseSerial(b.serial) ?? 0) || a.serial.localeCompare(b.serial);

/**
 * The app's single store.
 *
 * The rows shown on screen are the sheet as last downloaded with every change
 * not yet confirmed laid on top. Each change is queued, saved to the phone,
 * and sent to the sheet in order whenever there is signal — so selling with no
 * connection works, and nothing is lost if the app is closed mid-sync.
 *
 * Without a sheet connected the queue simply waits; connecting later uploads
 * everything recorded so far.
 */
export function useTickets() {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [design, setDesignState] = useState<TicketDesign | null>(null);
  const [baseRows, setBaseRows] = useState<TicketRow[]>([]);
  const [pending, setPending] = useState<PendingOp[]>([]);
  const [sheet, setSheet] = useState<storage.SheetInfo | null>(null);
  const [syncState, setSyncState] = useState<SyncState>('local');
  const [syncMessage, setSyncMessage] = useState('');
  /** Sales the sheet turned down because someone else got there first. */
  const [notices, setNotices] = useState<string[]>([]);

  // Sync runs outside React's render cycle, so it reads the latest values here.
  const pendingRef = useRef<PendingOp[]>([]);
  const settingsRef = useRef<Settings>(DEFAULT_SETTINGS);
  const syncing = useRef(false);
  const syncAgain = useRef(false);

  const connected = !!settings.sheetUrl && !!settings.teamKey;

  useEffect(() => {
    let alive = true;
    storage.loadAll().then((saved) => {
      if (!alive) return;
      settingsRef.current = saved.settings;
      pendingRef.current = saved.pending;
      setSettings(saved.settings);
      setDesignState(saved.design);
      setBaseRows(saved.rows);
      setPending(saved.pending);
      setSheet(saved.sheet);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    const next = { ...settingsRef.current, ...patch };
    settingsRef.current = next;
    setSettings(next);
    storage.saveSettings(next);
  }, []);

  const setPendingOps = useCallback((ops: PendingOp[]) => {
    pendingRef.current = ops;
    setPending(ops);
    storage.savePending(ops);
  }, []);

  const sync = useCallback(async () => {
    const s = settingsRef.current;
    if (!s.sheetUrl || !s.teamKey) {
      setSyncState('local');
      return;
    }
    if (syncing.current) {
      syncAgain.current = true;
      return;
    }
    syncing.current = true;
    setSyncState('syncing');
    const config: SheetConfig = { sheetUrl: s.sheetUrl, teamKey: s.teamKey };

    try {
      // Send queued changes oldest first; stop at the first one that can't go.
      while (pendingRef.current.length) {
        const op = pendingRef.current[0];
        try {
          await sendOp(config, op);
        } catch (error) {
          if (error instanceof SheetError && error.rejected) {
            // Usually someone else sold it first. Theirs stands; tell this seller.
            setNotices((n) => [...n, `${error.message} This change was not saved.`]);
          } else {
            throw error;
          }
        }
        setPendingOps(pendingRef.current.filter((p) => p.id !== op.id));
      }

      const result = await listRows(config);
      const rows = [...result.rows].sort(byNumber);
      setBaseRows(rows);
      storage.saveRows(rows);
      const info = { sheetUrl: result.sheetUrl, sheetId: result.sheetId, lastSynced: Date.now() };
      setSheet(info);
      storage.saveSheet(info);

      // Another phone may have printed a batch: carry numbering on past it.
      const highest = rows.reduce((m, r) => Math.max(m, parseSerial(r.serial) ?? 0), 0);
      if (highest >= settingsRef.current.nextNumber) updateSettings({ nextNumber: highest + 1 });

      setSyncState('synced');
      setSyncMessage('');
    } catch (error) {
      if (error instanceof SheetError) {
        setSyncState('error');
        setSyncMessage(error.message);
      } else {
        setSyncState('offline');
        setSyncMessage('No connection. Changes are saved on this phone and will upload later.');
      }
    } finally {
      syncing.current = false;
      if (syncAgain.current) {
        syncAgain.current = false;
        sync();
      }
    }
  }, [setPendingOps, updateSettings]);

  const queue = useCallback(
    (op: PendingOp) => {
      setPendingOps([...pendingRef.current, op]);
      sync();
    },
    [setPendingOps, sync]
  );

  // Sync on launch, when the app comes back to the front, and every so often.
  useEffect(() => {
    if (!ready || !connected) {
      setSyncState('local');
      return;
    }
    sync();
    const id = setInterval(() => {
      if (AppState.currentState === 'active') sync();
    }, POLL_MS);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [connected, ready, sync]);

  const rows = useMemo(() => {
    const map = new Map(baseRows.map((r) => [r.serial, r]));
    for (const op of pending) applyOp(map, op);
    return [...map.values()].sort(byNumber);
  }, [baseRows, pending]);

  const counts = useMemo(() => {
    const sold = rows.filter((r) => r.status === 'Sold').length;
    return { total: rows.length, sold, left: rows.length - sold };
  }, [rows]);

  /** Adds Unsold rows for a freshly printed batch and moves numbering on. */
  const addBatch = useCallback(
    (start: number, count: number) => {
      queue({ id: newId(), type: 'ensure', serials: serialRange(start, count) });
      const end = start + count - 1;
      if (end >= settingsRef.current.nextNumber) updateSettings({ nextNumber: end + 1 });
    },
    [queue, updateSettings]
  );

  const sell = useCallback(
    (serial: string, sale: Sale) => {
      const existing = rows.find((r) => r.serial === serial);
      // Editing a sale this phone can already see overwrites it on purpose;
      // selling an unsold ticket must not overwrite someone else's sale.
      const force = existing?.status === 'Sold';
      queue({ id: newId(), type: 'sell', serial, sale: trimSale(sale), soldAt: existing?.soldAt || timestamp(), force });
      if (sale.soldBy.trim() && sale.soldBy.trim() !== settingsRef.current.sellerName) {
        updateSettings({ sellerName: sale.soldBy.trim() });
      }
    },
    [queue, rows, updateSettings]
  );

  const unsell = useCallback(
    (serial: string) => queue({ id: newId(), type: 'clear', serial }),
    [queue]
  );

  const setDesign = useCallback((next: TicketDesign | null) => {
    setDesignState(next);
    storage.saveDesign(next);
  }, []);

  const connect = useCallback(
    (sheetUrl: string, teamKey: string) => {
      updateSettings({ sheetUrl: sheetUrl.trim(), teamKey: teamKey.trim() });
      sync();
    },
    [sync, updateSettings]
  );

  const disconnect = useCallback(() => {
    updateSettings({ sheetUrl: '', teamKey: '' });
    setSheet(null);
    storage.saveSheet(null);
    setSyncState('local');
    setSyncMessage('');
  }, [updateSettings]);

  const dismissNotices = useCallback(() => setNotices([]), []);

  return {
    ready,
    settings,
    updateSettings,
    design,
    setDesign,
    rows,
    counts,
    pendingCount: pending.length,
    connected,
    sheet,
    syncState,
    syncMessage,
    notices,
    dismissNotices,
    sync,
    connect,
    disconnect,
    addBatch,
    sell,
    unsell,
  };
}

export type TicketStore = ReturnType<typeof useTickets>;
