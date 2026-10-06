import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View, type TextInput } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { BrandMark } from '@/components/BrandMark';
import { AppText, Banner, Button, Card, Screen, TextField } from '@/components/ui';
import { validateEmail } from '@/lib/validation';

export default function SignInScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  async function submit() {
    const next = { email: validateEmail(email), password: password ? undefined : 'Enter your password' };
    setErrors(next);
    setFormError(null);
    if (next.email || next.password) return;
    setBusy(true);
    try {
      await signIn(email, password);
      // On success the root layout swaps to the signed-in screens.
    } catch (e) {
      setFormError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <Screen keyboard>
      <BrandMark />
      <Card style={styles.card}>
        <View style={styles.heading}>
          <AppText variant="title">Welcome back</AppText>
          <AppText tone="muted">Sign in to continue learning.</AppText>
        </View>
        {formError ? <Banner message={formError} /> : null}
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
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
          value={password}
          onChangeText={setPassword}
          error={errors.password}
          placeholder="Your password"
          secure
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        <Button title="Sign in" onPress={submit} loading={busy} />
      </Card>
      <View style={styles.footer}>
        <AppText tone="muted">New here?</AppText>
        <Link href="/sign-up" replace>
          <AppText variant="bodyStrong" tone="primary">
            Create an account
          </AppText>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 16 },
  heading: { gap: 2 },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
});
