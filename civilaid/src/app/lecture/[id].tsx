import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { Tag } from '@/components/content/LockBadge';
import { UnlockCard } from '@/components/content/UnlockCard';
import { LoadStateView } from '@/components/LoadStateView';
import { AppText, Card, Screen } from '@/components/ui';
import { hasFullAccess } from '@/lib/access';
import { getLecture, getMyProgress, type ModuleMeta } from '@/lib/content';
import { freeLectureId } from '@/lib/progress';
import { useLoader } from '@/lib/useLoader';
import { useTheme } from '@/theme/ThemeProvider';

export default function LectureScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const load = useCallback(async () => {
    const [detail, progress] = await Promise.all([getLecture(id), getMyProgress()]);
    return detail ? { ...detail, progress } : null;
  }, [id]);
  const { state, retry } = useLoader(load);

  return (
    <Screen edges={['bottom']}>
      <LoadStateView state={state} retry={retry}>
        {(data) => {
          if (!data) return null;
          const { subject, lecture, modules, progress } = data;
          const number = subject.lectures.findIndex((l) => l.id === lecture.id) + 1;
          const locked = !hasFullAccess(profile) && lecture.id !== freeLectureId(subject.lectures);
          return (
            <>
              <Stack.Screen options={{ title: `Lecture ${number}` }} />
              <View style={styles.header}>
                <AppText variant="caption" tone="muted">
                  {subject.title}
                </AppText>
                <AppText variant="title">{lecture.title}</AppText>
                {lecture.description ? <AppText tone="muted">{lecture.description}</AppText> : null}
              </View>

              {locked ? <UnlockCard /> : null}

              <View style={styles.list}>
                {modules.map((m, i) => (
                  <ModuleRow
                    key={m.id}
                    module={m}
                    number={`${number}.${i + 1}`}
                    locked={locked}
                    done={!!progress.get(m.id)?.completed_at}
                  />
                ))}
                {modules.length === 0 ? <AppText tone="muted">Modules for this lecture are on their way.</AppText> : null}
              </View>
            </>
          );
        }}
      </LoadStateView>
    </Screen>
  );
}

function ModuleRow({ module, number, locked, done }: { module: ModuleMeta; number: string; locked: boolean; done: boolean }) {
  const { colors } = useTheme();
  const minutes = module.duration_seconds ? Math.max(1, Math.round(module.duration_seconds / 60)) : null;
  return (
    <Pressable
      disabled={locked}
      onPress={() => router.push({ pathname: '/module/[id]', params: { id: module.id } })}
      accessibilityRole="button"
      accessibilityState={{ disabled: locked }}
      accessibilityLabel={`Module ${number}: ${module.title}${done ? ', done' : ''}${locked ? ', locked' : ''}`}
    >
      {({ pressed }) => (
        <Card style={[styles.row, pressed && { opacity: 0.85 }, locked && { opacity: 0.55 }]}>
          <View style={[styles.number, { backgroundColor: done ? colors.success : colors.surfaceAlt }]}>
            {done ? (
              <Ionicons name="checkmark" size={18} color={colors.onPrimary} />
            ) : locked ? (
              <Ionicons name="lock-closed" size={14} color={colors.textSecondary} />
            ) : (
              <AppText variant="label" tone="muted">
                {number}
              </AppText>
            )}
          </View>
          <View style={styles.flex}>
            <AppText variant="bodyStrong" numberOfLines={2}>
              {module.title}
            </AppText>
            <AppText variant="caption" tone="muted" numberOfLines={1}>
              {[module.summary, minutes ? `${minutes} min video` : null].filter(Boolean).join(' · ')}
            </AppText>
          </View>
          {!module.is_published ? <Tag kind="draft" /> : null}
          {!locked ? <Ionicons name="chevron-forward" size={18} color={colors.textFaint} /> : null}
        </Card>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { gap: 2 },
  list: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  number: { minWidth: 40, height: 40, paddingHorizontal: 6, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, gap: 1 },
});
