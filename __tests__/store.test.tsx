import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import renderer, { act } from 'react-test-renderer';

import { TicketStore, useTickets } from '../src/useTickets';
import { fetchFor, loadScript } from '../test-utils/fakeSheet';

const URL = 'https://script.google.com/macros/s/abc/exec';
const KEY = 'secret';

/** Mounts the store the way the app does and hands back a live handle to it. */
async function mountStore() {
  const ref: { current: TicketStore | null } = { current: null };
  function Probe() {
    ref.current = useTickets();
    return null;
  }
  let tree!: renderer.ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(<Probe />);
  });
  await settle();
  return { store: () => ref.current!, unmount: () => act(() => tree.unmount()) };
}

/** Lets queued promises (storage, fetch, sync) run to completion. */
async function settle() {
  for (let i = 0; i < 10; i++) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
  }
}

const sale = (buyer: string) => ({ buyer, phone: '0300', price: '500', soldBy: 'Sara' });

beforeEach(async () => {
  await AsyncStorage.clear();
});

test('works with no sheet, then uploads everything once connected', async () => {
  const script = loadScript(KEY);
  global.fetch = fetchFor(script) as any;
  const phone = await mountStore();

  await act(async () => phone.store().addBatch(1, 5));
  await settle();
  expect(phone.store().counts).toEqual({ total: 5, sold: 0, left: 5 });
  expect(phone.store().settings.nextNumber).toBe(6);
  expect(phone.store().syncState).toBe('local');

  await act(async () => phone.store().sell('NW-002', sale('Ahmed')));
  await settle();
  expect(phone.store().counts.sold).toBe(1);
  expect(phone.store().pendingCount).toBe(2);
  expect(script.data.length).toBe(0); // nothing sent yet

  await act(async () => phone.store().connect(URL, KEY));
  await settle();
  expect(phone.store().syncState).toBe('synced');
  expect(phone.store().pendingCount).toBe(0);
  expect(script.data.length).toBe(6); // header + 5 tickets
  expect(script.data[2]).toEqual(['NW-002', 'Ahmed', '0300', 500, 'Sara', expect.any(String), 'Sold']);
  await phone.unmount();
});

test('two phones share one sheet, and the second sale of a ticket is refused', async () => {
  const script = loadScript(KEY);
  global.fetch = fetchFor(script) as any;

  const a = await mountStore();
  await act(async () => a.store().connect(URL, KEY));
  await act(async () => a.store().addBatch(1, 200));
  await settle();
  expect(script.data.length).toBe(201);

  // Phone B starts fresh, on the same sheet. Both share AsyncStorage under
  // jest, so give B its own clean slate first.
  await a.unmount();
  await AsyncStorage.clear();
  const b = await mountStore();
  await act(async () => b.store().connect(URL, KEY));
  await settle();
  expect(b.store().counts.total).toBe(200);
  // B continues numbering after A's batch.
  expect(b.store().settings.nextNumber).toBe(201);

  // Someone else sells NW-010 directly in the sheet while B still sees it unsold.
  script.post({ key: KEY, action: 'sell', serial: 'NW-010', sale: sale('First'), soldAt: 'x', force: false });
  await act(async () => b.store().sell('NW-010', sale('Second')));
  await settle();

  expect(b.store().notices.join()).toMatch(/NW-010 is already sold to First/);
  expect(b.store().rows.find((r) => r.serial === 'NW-010')?.buyer).toBe('First');
  await b.unmount();
});

test('keeps sales made offline and uploads them when signal returns', async () => {
  const script = loadScript(KEY);
  const online = fetchFor(script);
  global.fetch = online as any;
  const phone = await mountStore();
  await act(async () => phone.store().connect(URL, KEY));
  await act(async () => phone.store().addBatch(1, 3));
  await settle();

  global.fetch = jest.fn(async () => {
    throw new TypeError('Network request failed');
  }) as any;
  await act(async () => phone.store().sell('NW-003', sale('Offline Buyer')));
  await settle();
  expect(phone.store().syncState).toBe('offline');
  expect(phone.store().pendingCount).toBe(1);
  expect(phone.store().rows.find((r) => r.serial === 'NW-003')?.status).toBe('Sold');

  global.fetch = online as any;
  await act(async () => phone.store().sync());
  await settle();
  expect(phone.store().syncState).toBe('synced');
  expect(phone.store().pendingCount).toBe(0);
  expect(script.data[3][1]).toBe('Offline Buyer');
  await phone.unmount();
});

test('a wrong team key is reported and nothing is thrown away', async () => {
  const script = loadScript(KEY);
  global.fetch = fetchFor(script) as any;
  const phone = await mountStore();
  await act(async () => phone.store().addBatch(1, 2));
  await act(async () => phone.store().connect(URL, 'wrong'));
  await settle();
  expect(phone.store().syncState).toBe('error');
  expect(phone.store().syncMessage).toBe('Wrong team key.');
  expect(phone.store().pendingCount).toBe(1);
  await phone.unmount();
});
