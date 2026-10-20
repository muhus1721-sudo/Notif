import { toCsv, timestamp } from '../src/sheet';
import { loadScript } from '../test-utils/fakeSheet';

const KEY = 'secret';

describe('Google Sheet script', () => {
  test('sets up headers and turns down a wrong key', () => {
    const s = loadScript(KEY);
    expect(s.post({ key: 'nope', action: 'list' })).toEqual({ ok: false, error: 'Wrong team key.' });
    expect(s.post({ key: KEY, action: 'list' })).toMatchObject({ ok: true, rows: [], sheetId: 'SHEET123' });
    expect(s.data[0]).toEqual(['Serial', 'Buyer Name', 'Phone', 'Price', 'Sold By', 'Date Sold', 'Status']);
  });

  test('a printed batch adds one Unsold row per serial, never twice', () => {
    const s = loadScript(KEY);
    expect(s.post({ key: KEY, action: 'ensure', serials: ['NW-001', 'NW-002', 'NW-003'] }).added).toBe(3);
    expect(s.post({ key: KEY, action: 'ensure', serials: ['NW-002', 'NW-003', 'NW-004'] }).added).toBe(1);
    const { rows } = s.post({ key: KEY, action: 'list' });
    expect(rows.map((r: any) => `${r.serial}:${r.status}`)).toEqual([
      'NW-001:Unsold',
      'NW-002:Unsold',
      'NW-003:Unsold',
      'NW-004:Unsold',
    ]);
  });

  test('records a sale with the buyer, and keeps a phone number’s leading zero', () => {
    const s = loadScript(KEY);
    s.post({ key: KEY, action: 'ensure', serials: ['NW-001', 'NW-002'] });
    const res = s.post({
      key: KEY,
      action: 'sell',
      serial: 'NW-002',
      sale: { buyer: ' Ahmed Khan ', phone: '03001234567', price: '500', soldBy: 'Sara' },
      soldAt: '2026-10-20 14:05',
      force: false,
    });
    expect(res.ok).toBe(true);
    expect(s.data[2]).toEqual(['NW-002', 'Ahmed Khan', '03001234567', 500, 'Sara', '2026-10-20 14:05', 'Sold']);
  });

  test('a second seller cannot sell a ticket that is already sold', () => {
    const s = loadScript(KEY);
    const sale = (buyer: string, force = false) =>
      s.post({ key: KEY, action: 'sell', serial: 'NW-007', sale: { buyer, phone: '', price: '', soldBy: '' }, soldAt: '', force });
    expect(sale('First Buyer').ok).toBe(true);
    const second = sale('Second Buyer');
    expect(second).toMatchObject({ ok: false, rejected: true });
    expect(second.error).toMatch(/already sold to First Buyer/);
    // Editing on purpose (force) is allowed.
    expect(sale('Corrected Name', true).ok).toBe(true);
    expect(s.post({ key: KEY, action: 'list' }).rows[0].buyer).toBe('Corrected Name');
  });

  test('a sale needs a buyer name', () => {
    const s = loadScript(KEY);
    const res = s.post({ key: KEY, action: 'sell', serial: 'NW-001', sale: { buyer: '  ' }, force: false });
    expect(res).toMatchObject({ ok: false, rejected: true });
  });

  test('marking unsold clears the buyer', () => {
    const s = loadScript(KEY);
    s.post({ key: KEY, action: 'sell', serial: 'NW-001', sale: { buyer: 'A' }, soldAt: 'x', force: false });
    s.post({ key: KEY, action: 'clear', serial: 'NW-001' });
    expect(s.post({ key: KEY, action: 'list' }).rows[0]).toMatchObject({ buyer: '', status: 'Unsold' });
  });
});

describe('CSV export', () => {
  test('opens cleanly in Excel', () => {
    const csv = toCsv([
      { serial: 'NW-001', buyer: 'Khan, Ahmed', phone: '03001234567', price: '500', soldBy: 'Sara', soldAt: '2026-10-20 14:05', status: 'Sold' },
      { serial: 'NW-002', buyer: 'Says "hi"', phone: '', price: '', soldBy: '', soldAt: '', status: 'Unsold' },
    ]);
    expect(csv.startsWith('﻿Serial,Buyer Name,Phone,Price,Sold By,Date Sold,Status\r\n')).toBe(true);
    expect(csv).toContain('NW-001,"Khan, Ahmed",="03001234567",500,Sara,2026-10-20 14:05,Sold\r\n');
    expect(csv).toContain('NW-002,"Says ""hi""",,,,,Unsold\r\n');
  });

  test('timestamps are local and sortable', () => {
    expect(timestamp(new Date(2026, 9, 5, 9, 7))).toBe('2026-10-05 09:07');
  });
});
