import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import renderer, { act } from 'react-test-renderer';

import App from '../App';
import { PrintScreen } from '../src/screens/PrintScreen';
import { SalesScreen } from '../src/screens/SalesScreen';
import { TicketScreen } from '../src/screens/TicketScreen';
import { DEFAULT_SETTINGS, TicketDesign } from '../src/types';
import { TicketStore } from '../src/useTickets';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const wrap = (node: React.ReactNode) => <SafeAreaProvider initialMetrics={metrics}>{node}</SafeAreaProvider>;

function textOf(tree: any): string {
  const out: string[] = [];
  const walk = (node: any) => {
    if (node == null) return;
    if (typeof node === 'string') return void out.push(node);
    if (Array.isArray(node)) return node.forEach(walk);
    // TextInput content lives on the `value` prop, not in children.
    if (typeof node.props?.value === 'string') out.push(node.props.value);
    walk(node.children);
  };
  walk(tree);
  return out.join(' | ');
}

/** Joins the pieces React splits one sentence into (e.g. around `{value}`). */
const flat = (text: string) => text.replace(/ \| /g, '');

async function render(node: React.ReactNode) {
  let tree!: renderer.ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(<>{node}</>);
  });
  await act(async () => {
    await Promise.resolve();
  });
  return tree;
}

const design: TicketDesign = {
  uri: 'file:///document/ticket-design/design-1.png',
  width: 2100,
  height: 1050,
  numberX: 0.85,
  numberY: 0.5,
  fontSize: 18,
  color: '#000000',
};

/** A store stand-in with a design and a few tickets, for rendering screens. */
function fakeStore(overrides: Partial<TicketStore> = {}): TicketStore {
  const rows = [
    { serial: 'NW-001', buyer: 'Ahmed Khan', phone: '0300', price: '500', soldBy: 'Sara', soldAt: '2026-10-20 14:05', status: 'Sold' as const },
    { serial: 'NW-002', buyer: '', phone: '', price: '', soldBy: '', soldAt: '', status: 'Unsold' as const },
  ];
  return {
    ready: true,
    settings: { ...DEFAULT_SETTINGS, nextNumber: 3 },
    updateSettings: jest.fn(),
    design,
    setDesign: jest.fn(),
    rows,
    counts: { total: 2, sold: 1, left: 1 },
    pendingCount: 0,
    connected: false,
    sheet: null,
    syncState: 'local',
    syncMessage: '',
    notices: [],
    dismissNotices: jest.fn(),
    sync: jest.fn(async () => undefined),
    connect: jest.fn(),
    disconnect: jest.fn(),
    addBatch: jest.fn(),
    sell: jest.fn(),
    unsell: jest.fn(),
    ...overrides,
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

test('first launch opens on uploading the design', async () => {
  const tree = await render(<App />);
  const text = textOf(tree.toJSON());
  expect(text).toContain('Upload your ticket design');
  expect(text).toContain('Print');
  await act(async () => tree.unmount());
});

test('Ticket screen previews the next serial on the design', async () => {
  const tree = await render(wrap(<TicketScreen store={fakeStore()} bottomInset={0} />));
  const text = textOf(tree.toJSON());
  expect(text).toContain('NW-003');
  expect(flat(text)).toContain('18 pt');
  expect(text).not.toContain('too close to the edge');
  await act(async () => tree.unmount());
});

test('Ticket screen warns about a low-resolution design', async () => {
  const store = fakeStore({ design: { ...design, width: 700, height: 350 } });
  const tree = await render(wrap(<TicketScreen store={store} bottomInset={0} />));
  expect(textOf(tree.toJSON())).toContain('about 100 DPI');
  await act(async () => tree.unmount());
});

test('Print screen shows 200 tickets fitting 3 per A4 page', async () => {
  const store = fakeStore({ settings: { ...DEFAULT_SETTINGS, nextNumber: 1 } });
  const tree = await render(wrap(<PrintScreen store={store} bottomInset={0} onNeedDesign={() => {}} />));
  const text = textOf(tree.toJSON());
  expect(text).toContain('3 per page');
  expect(text).toContain('200 tickets');
  expect(text).toContain('67 pages');
  expect(text).toContain('3 per A4 page (portrait)');
  expect(text).toContain('✓ Fits');
  expect(text).toContain('to NW-200');
  // NW-001 and NW-002 already exist, so a reprint warning shows.
  expect(flat(text)).toContain('2 of these serial numbers were printed before');
  await act(async () => tree.unmount());
});

test('Sales screen lists buyers and counts', async () => {
  const tree = await render(wrap(<SalesScreen store={fakeStore()} bottomInset={0} />));
  const text = textOf(tree.toJSON());
  expect(text).toContain('1 sold · 1 left · 2 printed');
  expect(text).toContain('Ahmed Khan');
  expect(text).toContain('NW-002');
  expect(text).toContain('Not connected to the Google Sheet');
  await act(async () => tree.unmount());
});
