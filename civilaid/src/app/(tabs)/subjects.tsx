import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ComingSoon } from '@/components/ComingSoon';
import { Tag } from '@/components/content/LockBadge';
import { LoadStateView } from '@/components/LoadStateView';
import { ProgressRing } from '@/components/ProgressRing';
import { AppText, Card, Screen } from '@/components/ui';
import { getMyProgress, listSubjects, type SubjectWithLectures } from '@/lib/content';
import { subjectCompletion } from '@/lib/progress';
import { useLoader } from '@/lib/useLoader';
import { radius, useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/typography';

export default function SubjectsScreen() {
  const load = useCallback(async () => {
    const [subjects, progress] = await Promise.all([listSubjects(), getMyProgress()]);
    return subjects.map((s) => ({ subject: s, completion: subjectCompletion(s.lectures, progress) }));
  }, []);
  const { state, retry } = useLoader(load);

  return (
    <Screen>
      <AppText variant="title">Subjects</AppText>
      <LoadStateView state={state} retry={retry}>
        {(items) =>
          items.length === 0 ? (
            <ComingSoon
              icon="book-outline"
              title="No subjects yet"
              message="Subjects will appear here once content is published."
            />
          ) : (
            <View style={styles.list}>
              {items.map(({ subject, completion }) => (
                <SubjectCard key={subject.id} subject={subject} ratio={completion.ratio} />
              ))}
            </View>
          )
        }
      </LoadStateView>
    </Screen>
  );
}

function SubjectCard({ subject, ratio }: { subject: SubjectWithLectures; ratio: number }) {
  const { colors } = useTheme();
  const accent = subject.color ?? colors.primary;
  const lectures = subject.lectures.length;
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/subject/[id]', params: { id: subject.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${subject.title}, ${Math.round(ratio * 100)} percent complete`}
    >
      {({ pressed }) => (
        <Card style={[styles.card, pressed && { opacity: 0.85 }]}>
          <View style={[styles.icon, { backgroundColor: accent }]}>
            <Ionicons name="library" size={22} color="#FFFFFF" />
          </View>
          <View style={styles.flex}>
            <View style={styles.titleRow}>
              {subject.code ? (
                <AppText variant="caption" tone="muted">
                  {subject.code}
                </AppText>
              ) : null}
              {!subject.is_published ? <Tag kind="draft" /> : null}
            </View>
            <AppText variant="heading" numberOfLines={2}>
              {subject.title}
            </AppText>
            <AppText variant="caption" tone="muted">
              {lectures} lecture{lectures === 1 ? '' : 's'}
            </AppText>
          </View>
          <ProgressRing progress={ratio} color={accent}>
            <AppText variant="caption" style={{ fontFamily: fonts.semibold }}>
              {Math.round(ratio * 100)}%
            </AppText>
          </ProgressRing>
        </Card>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  icon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, gap: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
