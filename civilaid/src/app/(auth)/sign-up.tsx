import { Link, router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View, type TextInput } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { BrandMark } from '@/components/BrandMark';
import { AppText, Banner, Button, Card, Chip, Screen, TextField } from '@/components/ui';
import { SECTIONS } from '@/lib/config';
import { validateSignUp, type SignUpErrors, type SignUpInput } from '@/lib/validation';

const EMPTY: SignUpInput = { fullName: '', cmsId: '', section: '', email: '', password: '', confirmPassword: '' };

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const [form, setForm] = useState<SignUpInput>(EMPTY);
  const [errors, setErrors] = useState<SignUpErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmSent, setConfirmSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const cmsIdRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  function set<K extends keyof SignUpInput>(key: K, value: SignUpInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function submit() {
    const next = validateSignUp(form);
    setErrors(next);
    setFormError(null);
    if (Object.values(next).some(Boolean)) return;
    setBusy(true);
    try {
      const result = await signUp(form);
      if (result === 'confirmEmail') {
        setConfirmSent(true);
        setBusy(false);
      }
      // 'signedIn': the root layout swaps to the signed-in screens.
    } catch (e) {
      setFormError((e as Error).message);
      setBusy(false);
    }
  }

  if (confirmSent) {
    return (
      <Screen>
        <BrandMark />
        <Card style={styles.card}>
          <AppText variant="title">Check your email</AppText>
          <AppText tone="muted">
            We sent a confirmation link to {form.email.trim()}. Open it, then come back and sign in.
          </AppText>
          <Button title="Go to sign in" onPress={() => router.replace('/sign-in')} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen keyboard>
      <BrandMark />
      <Card style={styles.card}>
        <View style={styles.heading}>
          <AppText variant="title">Create your account</AppText>
          <AppText tone="muted">Use your real details — they’re checked when you pay.</AppText>
        </View>
        {formError ? <Banner message={formError} /> : null}

        <TextField
          label="Full name"
          value={form.fullName}
          onChangeText={(v) => set('fullName', v)}
          error={errors.fullName}
          placeholder="e.g. Ali Raza"
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          returnKeyType="next"
          onSubmitEditing={() => cmsIdRef.current?.focus()}
        />
        <TextField
          ref={cmsIdRef}
          label="CMS ID"
          value={form.cmsId}
          onChangeText={(v) => set('cmsId', v.replace(/[^0-9]/g, ''))}
          error={errors.cmsId}
          placeholder="e.g. 512345"
          keyboardType="number-pad"
          maxLength={10}
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
        />

        <View style={styles.sectionField}>
          <AppText variant="label" tone="muted">
            Section
          </AppText>
          <View style={styles.chips} accessibilityRole="radiogroup">
            {SECTIONS.map((s) => (
              <Chip key={s} label={s} selected={form.section === s} onPress={() => set('section', s)} />
            ))}
          </View>
          {errors.section ? (
            <AppText variant="caption" tone="danger">
              {errors.section}
            </AppText>
          ) : null}
        </View>

        <TextField
          ref={emailRef}
          label="Email"
          value={form.email}
          onChangeText={(v) => set('email', v)}
          error={errors.email}
          placeholder="you@example.com"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <TextField
          ref={passwordRef}
          label="Password"
          value={form.password}
          onChangeText={(v) => set('password', v)}
          error={errors.password}
          hint="At least 8 characters"
          secure
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
          onSubmitEditing={() => confirmRef.current?.focus()}
        />
        <TextField
          ref={confirmRef}
          label="Confirm password"
          value={form.confirmPassword}
          onChangeText={(v) => set('confirmPassword', v)}
          error={errors.confirmPassword}
          secure
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        <Button title="Create account" onPress={submit} loading={busy} />
      </Card>
      <View style={styles.footer}>
        <AppText tone="muted">Already registered?</AppText>
        <Link href="/sign-in" replace>
          <AppText variant="bodyStrong" tone="primary">
            Sign in
          </AppText>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 16 },
  heading: { gap: 2 },
  sectionField: { gap: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
});
