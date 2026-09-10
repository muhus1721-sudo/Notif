import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import renderer, { act } from 'react-test-renderer';

import App from '../App';
import { ReminderEditor } from '../src/components/ReminderEditor';
import { ReminderRow } from '../src/components/ReminderRow';
import { Reminder } from '../src/types';

const sample: Reminder = {
  id: 'r1',
  title: 'Take vitamins',
  notes: 'With breakfast',
  at: new Date(2026, 8, 10, 7, 30).toISOString(),
  repeat: 'weekdays',
  days: [],
  enabled: true,
  createdAt: new Date().toISOString(),
  notificationIds: [],
};

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const wrap = (node: React.ReactNode) => (
  <SafeAreaProvider initialMetrics={metrics}>{node}</SafeAreaProvider>
);

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

test('App mounts and reaches its empty state', async () => {
  const tree = await render(<App />);
  const text = textOf(tree.toJSON());
  expect(text).toContain('Reminders');
  expect(text).toContain('Nothing scheduled');
  tree.unmount();
});

test('ReminderRow shows time, repeat and next fire', async () => {
  const tree = await render(
    wrap(<ReminderRow reminder={sample} onPress={() => {}} onToggle={() => {}} />)
  );
  const text = textOf(tree.toJSON());
  expect(text).toContain('7:30');
  expect(text).toContain('Every weekday');
  tree.unmount();
});

test('ReminderEditor opens an existing reminder with a delete action', async () => {
  const tree = await render(
    wrap(
      <ReminderEditor
        visible
        reminder={sample}
        onSave={() => {}}
        onDelete={() => {}}
        onClose={() => {}}
      />
    )
  );
  const text = textOf(tree.toJSON());
  expect(text).toContain('Edit reminder');
  expect(text).toContain('Delete reminder');
  expect(text).toContain('Take vitamins');
  tree.unmount();
});

test('ReminderEditor refuses to save an untitled reminder', async () => {
  const tree = await render(
    wrap(
      <ReminderEditor
        visible
        reminder={null}
        onSave={() => {}}
        onDelete={() => {}}
        onClose={() => {}}
      />
    )
  );
  const text = textOf(tree.toJSON());
  expect(text).toContain('New reminder');
  expect(text).toContain('Give the reminder a title.');
  tree.unmount();
});
