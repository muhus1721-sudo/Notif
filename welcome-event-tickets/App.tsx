import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  SafeAreaProvider,
  initialWindowMetrics,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { PrintScreen } from './src/screens/PrintScreen';
import { SalesScreen } from './src/screens/SalesScreen';
import { TicketScreen } from './src/screens/TicketScreen';
import { space, useTheme } from './src/theme';
import { useTickets } from './src/useTickets';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

type Tab = 'ticket' | 'print' | 'sales';

const TABS: { key: Tab; label: string }[] = [
  { key: 'ticket', label: 'Ticket' },
  { key: 'print', label: 'Print' },
  { key: 'sales', label: 'Sales' },
];

const TAB_BAR_HEIGHT = 60;

function Home() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const store = useTickets();
  const [tab, setTab] = useState<Tab | null>(null);

  useEffect(() => {
    if (store.ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [store.ready]);

  // First launch starts on the design; after that, straight to selling.
  const current: Tab = tab ?? (store.design ? 'sales' : 'ticket');
  const bottomInset = insets.bottom + TAB_BAR_HEIGHT + space.lg;

  return (
    <View style={[styles.screen, { backgroundColor: t.bg, paddingTop: insets.top }]}>
      <StatusBar style={t.dark ? 'light' : 'dark'} />

      {!store.ready ? (
        <View style={styles.loading}>
          <ActivityIndicator color={t.textDim} />
        </View>
      ) : current === 'ticket' ? (
        <TicketScreen store={store} bottomInset={bottomInset} />
      ) : current === 'print' ? (
        <PrintScreen store={store} bottomInset={bottomInset} onNeedDesign={() => setTab('ticket')} />
      ) : (
        <SalesScreen store={store} bottomInset={bottomInset} />
      )}

      <View
        style={[
          styles.tabBar,
          { backgroundColor: t.card, borderColor: t.border, paddingBottom: insets.bottom, height: TAB_BAR_HEIGHT + insets.bottom },
        ]}
      >
        {TABS.map(({ key, label }) => {
          const selected = key === current;
          return (
            <Pressable
              key={key}
              onPress={() => setTab(key)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              style={styles.tab}
            >
              <View style={[styles.tabMark, { backgroundColor: selected ? t.accent : 'transparent' }]} />
              <Text style={[styles.tabText, { color: selected ? t.text : t.textFaint }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function App() {
  return (
    // initialWindowMetrics lets the first frame render with correct insets
    // instead of a blank frame while the provider measures itself.
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <Home />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  tabMark: { width: 24, height: 3, borderRadius: 2 },
  tabText: { fontSize: 14, fontWeight: '700' },
});
