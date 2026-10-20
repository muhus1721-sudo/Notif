import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_SETTINGS, PendingOp, Settings, TicketDesign, TicketRow } from './types';

/**
 * Everything the app remembers lives in AsyncStorage as a few JSON blobs:
 * small, always read whole, and written after every change.
 */
const KEYS = {
  settings: 'tickets/settings/v1',
  design: 'tickets/design/v1',
  rows: 'tickets/rows/v1',
  pending: 'tickets/pending/v1',
  sheet: 'tickets/sheet/v1',
};

export type SheetInfo = { sheetUrl: string; sheetId: string; lastSynced: number };

export type Saved = {
  settings: Settings;
  design: TicketDesign | null;
  /** The sheet as last downloaded (or empty if never connected). */
  rows: TicketRow[];
  /** Changes not yet confirmed by the sheet, oldest first. */
  pending: PendingOp[];
  sheet: SheetInfo | null;
};

async function read<T>(key: string): Promise<T | null> {
  try {
    const json = await AsyncStorage.getItem(key);
    return json ? (JSON.parse(json) as T) : null;
  } catch (error) {
    // A corrupt blob shouldn't brick the app — fall back to defaults instead.
    console.warn(`Could not read ${key}`, error);
    return null;
  }
}

async function write(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Could not save ${key}`, error);
  }
}

export async function loadAll(): Promise<Saved> {
  const [settings, design, rows, pending, sheet] = await Promise.all([
    read<Partial<Settings>>(KEYS.settings),
    read<TicketDesign>(KEYS.design),
    read<TicketRow[]>(KEYS.rows),
    read<PendingOp[]>(KEYS.pending),
    read<SheetInfo>(KEYS.sheet),
  ]);
  return {
    settings: { ...DEFAULT_SETTINGS, ...settings },
    design: design && typeof design.uri === 'string' ? design : null,
    rows: Array.isArray(rows) ? rows : [],
    pending: Array.isArray(pending) ? pending : [],
    sheet,
  };
}

export const saveSettings = (s: Settings) => write(KEYS.settings, s);
export const saveDesign = (d: TicketDesign | null) => write(KEYS.design, d);
export const saveRows = (r: TicketRow[]) => write(KEYS.rows, r);
export const savePending = (p: PendingOp[]) => write(KEYS.pending, p);
export const saveSheet = (s: SheetInfo | null) => write(KEYS.sheet, s);
