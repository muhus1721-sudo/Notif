import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { space, useTheme } from '../theme';

export function EmptyState() {
  const t = useTheme();
  return (
    <View style={styles.wrap}>
      <Text style={styles.glyph}>🔔</Text>
      <Text style={[styles.title, { color: t.text }]}>Nothing scheduled</Text>
      <Text style={[styles.body, { color: t.textDim }]}>
        Tap the + button to add your first reminder. It will fire even when the app is closed.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingHorizontal: space.xl, paddingTop: space.xxl * 2, gap: space.sm },
  glyph: { fontSize: 44, marginBottom: space.xs },
  title: { fontSize: 18, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 21, textAlign: 'center' },
});
