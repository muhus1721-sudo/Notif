import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { PermissionState } from '../notifications';
import { radius, space, useTheme } from '../theme';

type Props = {
  state: PermissionState;
  onRequest: () => void;
};

/**
 * Shown until notifications are allowed. "undetermined" can still be resolved
 * in-app; "denied" means the system will no longer prompt, so we hand the user
 * off to Settings instead.
 */
export function PermissionBanner({ state, onRequest }: Props) {
  const t = useTheme();
  if (state === 'granted') return null;

  const askable = state === 'undetermined';

  return (
    <Pressable
      onPress={askable ? onRequest : () => Linking.openSettings()}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.banner,
        { backgroundColor: t.dangerSoft, borderColor: t.danger, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <View style={styles.text}>
        <Text style={[styles.title, { color: t.danger }]}>Notifications are off</Text>
        <Text style={[styles.body, { color: t.textDim }]}>
          {askable
            ? 'Allow notifications so your reminders can actually reach you.'
            : 'Turn notifications on for this app in system settings.'}
        </Text>
      </View>
      <Text style={[styles.action, { color: t.danger }]}>{askable ? 'Allow' : 'Settings'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  text: { flex: 1, gap: 2 },
  title: { fontSize: 14, fontWeight: '700' },
  body: { fontSize: 13, lineHeight: 18 },
  action: { fontSize: 14, fontWeight: '700' },
});
