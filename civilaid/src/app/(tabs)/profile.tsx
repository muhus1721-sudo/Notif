import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { AppText, Button, Card, Screen } from '@/components/ui';
import { formatDate, getAccessStatus, type AccessStatus } from '@/lib/access';
import { radius, useTheme } from '@/theme/ThemeProvider';

function statusLook(status: AccessStatus) {
  switch (status.kind) {
    case 'admin':
      return { label: 'Admin', tone: 'primary' as const, detail: 'Full access to everything' };
    case 'active':
      return { label: 'Active', tone: 'success' as const, detail: `Access until ${formatDate(status.expiresAt)}` };
    case 'expired':
      return { label: 'Expired', tone: 'danger' as const, detail: `${status.semesterName} access ended ${formatDate(status.expiredAt)}` };
    case 'inactive':
      return { label: 'Not active', tone: 'warning' as const, detail: 'Lecture 1 of every subject is free. Unlock the rest for Rs 1000.' };
  }
}

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { profile, isAdmin, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  if (!profile) return null;

  const look = statusLook(getAccessStatus(profile));
  const pill = {
    primary: { bg: colors.primarySoft, fg: colors.primary },
    success: { bg: colors.successSoft, fg: colors.success },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
    warning: { bg: colors.warningSoft, fg: colors.warning },
  }[look.tone];
  const initials = profile.full_name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  return (
    <Screen>
      <AppText variant="title">Profile</AppText>

      <Card style={styles.identity}>
        <View style={[styles.avatar, { backgroundColor: colors.primaryFill }]}>
          <AppText variant="title" tone="onPrimary">
            {initials}
          </AppText>
        </View>
        <View style={styles.flex}>
          <AppText variant="heading">{profile.full_name}</AppText>
          <AppText variant="label" tone="muted">
            {profile.email}
          </AppText>
        </View>
      </Card>

      <Card style={styles.rows}>
        <Row label="CMS ID" value={profile.cms_id ?? '—'} />
        <Row label="Section" value={profile.section ?? '—'} />
        <View style={styles.row}>
          <AppText tone="muted">Account status</AppText>
          <View style={[styles.pill, { backgroundColor: pill.bg }]}>
            <AppText variant="label" style={{ color: pill.fg }}>
              {look.label}
            </AppText>
          </View>
        </View>
        <AppText variant="caption" tone="faint">
          {look.detail}
        </AppText>
      </Card>

      {isAdmin ? (
        <Button
          title="Open admin panel"
          variant="secondary"
          icon={<Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />}
          onPress={() => router.push('/admin')}
        />
      ) : null}

      <Button
        title="Log out"
        variant="danger"
        loading={signingOut}
        icon={<Ionicons name="log-out-outline" size={18} color={colors.danger} />}
        onPress={async () => {
          setSigningOut(true);
          await signOut();
        }}
      />
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <AppText tone="muted">{label}</AppText>
      <AppText variant="bodyStrong">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  rows: { gap: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.pill },
});
