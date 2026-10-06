import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { Tag } from '@/components/content/LockBadge';
import { UnlockCard } from '@/components/content/UnlockCard';
import { LoadStateView } from '@/components/LoadStateView';
import { ProgressRing } from '@/components/ProgressRing';
import { AppText, Card, Screen } from '@/components/ui';
import { hasFullAccess } from '@/lib/access';
import { getMyProgress, getSubject, type Lecture } from '@/lib/content';
import { freeLectureId, lectureCompletion, subjectCompletion } from '@/lib/progress';
import { useLoader } from '@/lib/useLoader';
import { useTheme } from '@/theme/ThemeProvider';

export default function SubjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const unlocked = hasFullAccess(profile);
  const load = useCallback(async () => {
    const [subject, progress] = await Promise.all([getSubject(id), getMyProgress()]);
    return subject ? { subject, progress } : null;
  }, [id]);
  const { state, retry } = useLoader(load);
  const { colors } = useTheme();

  return (
    <Screen edges={['bottom']}>
      <LoadStateView state={state} retry={retry}>
        {(data) => {
          if (!data) return null;
          const { subject, progress } = data;
          const freeId = freeLectureId(subject.lectures);
          const overall = subjectCompletion(subject.lectures, progress);
          const anyLocked = !unlocked && subject.lectures.some((l) => l.id !== freeId);
          return (
            <>
              <Stack.Screen options={{ title: subject.code ?? '' }} />
              <View style={styles.header}>
                <View style={styles.flex}>
                  <AppText variant="title">{subject.title}</AppText>
                  {subject.description ? <AppText tone="muted">{subject.description}</AppText> : null}
                  <AppText variant="caption" tone="faint">
                    {overall.done} of {overall.total} modules complete
                  </AppText>
                </View>
                <ProgressRing progress={overall.ratio} size={64} stroke={6} color={subject.color ?? colors.primary}>
                  <AppText variant="label">{Math.round(overall.ratio * 100)}%</AppText>
                </ProgressRing>
              </View>

              <View style={styles.list}>
                {subject.lectures.map((lecture, i) => (
                  <LectureRow
                    key={lecture.id}
                    lecture={lecture}
                    number={i + 1}
                    free={lecture.id === freeId}
                    locked={!unlocked && lecture.id !== freeId}
                    completion={lectureCompletion(lecture, progress)}
                  />
                ))}
                {subject.lectures.length === 0 ? (
                  <AppText tone="muted">No lectures yet — check back soon.</AppText>
                ) : null}
              </View>

              {anyLocked ? <UnlockCard message="Unlock the rest of this subject" /> : null}
            </>
          );
        }}
      </LoadStateView>
    </Screen>
  );
}

type RowProps = {
  lecture: Lecture;
  number: number;
  free: boolean;
  locked: boolean;
  completion: { done: number; total: number; complete: boolean };
};

function LectureRow({ lecture, number, free, locked, completion }: RowProps) {
  const { colors } = useTheme();
  const { done, total, complete } = completion;
  return (
    <Pressable
      onPress={() =>
        locked ? router.push('/unlock') : router.push({ pathname: '/lecture/[id]', params: { id: lecture.id } })
      }
      accessibilityRole="button"
      accessibilityLabel={`Lecture ${number}: ${lecture.title}${locked ? ', locked' : ''}`}
    >
      {({ pressed }) => (
        <Card style={[styles.row, pressed && { opacity: 0.85 }, locked && { opacity: 0.6 }]}>
          <View
            style={[
              styles.number,
              { backgroundColor: complete ? colors.success : locked ? colors.surfaceAlt : colors.primarySoft },
            ]}
          >
            {complete ? (
              <Ionicons name="checkmark" size={20} color={colors.onPrimary} />
            ) : locked ? (
              <Ionicons name="lock-closed" size={16} color={colors.textSecondary} />
            ) : (
              <AppText variant="bodyStrong" tone="primary">
                {number}
              </AppText>
            )}
          </View>
          <View style={styles.flex}>
            <AppText variant="bodyStrong" numberOfLines={2}>
              {lecture.title}
            </AppText>
            <AppText variant="caption" tone="muted">
              {total === 0 ? 'Coming soon' : `${done}/${total} modules`}
            </AppText>
          </View>
          <View style={styles.tags}>
            {!lecture.is_published ? <Tag kind="draft" /> : null}
            {free && !complete ? <Tag kind="free" /> : null}
            {locked ? null : <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />}
          </View>
        </Card>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  flex: { flex: 1, gap: 2 },
  list: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  number: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  tags: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
