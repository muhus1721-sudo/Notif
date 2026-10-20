import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';

import { radius, space, useTheme } from '../theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  busy?: boolean;
  style?: ViewStyle;
};

export function Button({ label, onPress, kind = 'primary', disabled, busy, style }: ButtonProps) {
  const t = useTheme();
  const bg = kind === 'primary' ? t.accent : kind === 'danger' ? t.dangerSoft : t.inset;
  const fg = kind === 'primary' ? t.accentText : kind === 'danger' ? t.danger : t.text;
  const off = disabled || busy;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!off, busy: !!busy }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.8 : 1 },
        style,
      ]}
    >
      {busy ? <ActivityIndicator color={fg} /> : <Text style={[styles.buttonText, { color: fg }]}>{label}</Text>}
    </Pressable>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const t = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }, style]}>{children}</View>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  return <Text style={[styles.label, { color: t.textDim }]}>{children}</Text>;
}

type FieldProps = TextInputProps & { label: string; hint?: string };

export function Field({ label, hint, style, ...input }: FieldProps) {
  const t = useTheme();
  return (
    <View style={styles.field}>
      <Label>{label}</Label>
      <TextInput
        placeholderTextColor={t.textFaint}
        style={[styles.input, { backgroundColor: t.inset, color: t.text, borderColor: t.border }, style]}
        {...input}
      />
      {hint ? <Text style={[styles.hint, { color: t.textFaint }]}>{hint}</Text> : null}
    </View>
  );
}

/** A quiet coloured strip for warnings and notes. */
export function Note({ children, tone = 'info' }: { children: React.ReactNode; tone?: 'info' | 'warn' | 'ok' }) {
  const t = useTheme();
  const bg = tone === 'warn' ? t.dangerSoft : t.accentSoft;
  const fg = tone === 'warn' ? t.danger : t.text;
  return (
    <View style={[styles.note, { backgroundColor: bg }]}>
      <Text style={[styles.noteText, { color: fg }]}>{children}</Text>
    </View>
  );
}

export function ScreenTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={styles.titleRow}>
      <View style={styles.titleText}>
        <Text style={[styles.title, { color: t.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: t.textDim }]}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  buttonText: { fontSize: 16, fontWeight: '700' },
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: space.lg, gap: space.md },
  label: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
  field: { gap: space.xs + 2 },
  input: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space.md,
    fontSize: 16,
  },
  hint: { fontSize: 12 },
  note: { borderRadius: radius.md, padding: space.md },
  noteText: { fontSize: 14, lineHeight: 20 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.md,
    gap: space.md,
  },
  titleText: { flex: 1 },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { fontSize: 14, marginTop: 2 },
});
