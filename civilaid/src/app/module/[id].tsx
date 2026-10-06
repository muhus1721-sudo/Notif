import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { Quiz } from '@/components/content/Quiz';
import { UnlockCard } from '@/components/content/UnlockCard';
import { VideoPanel } from '@/components/content/VideoPanel';
import { LoadStateView } from '@/components/LoadStateView';
import { Markdown } from '@/components/notes/Markdown';
import { AppText, Banner, Button, Card, Screen } from '@/components/ui';
import {
  getBestScore,
  getModule,
  getMyProgress,
  saveProgress,
  saveQuizAttempt,
  type BestScore,
  type ModuleDetail,
  type ModuleProgress,
} from '@/lib/content';
import { applyProgress, requirementsFor, type Requirements } from '@/lib/progress';
import { useLoader } from '@/lib/useLoader';
import { radius, useTheme } from '@/theme/ThemeProvider';

type Step = 'video' | 'notes' | 'quiz';
const STEP_INFO: Record<Step, { label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
  video: { label: 'Video', icon: 'play-circle' },
  notes: { label: 'Notes', icon: 'document-text' },
  quiz: { label: 'Quiz', icon: 'help-circle' },
};

export default function ModuleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const load = useCallback(async () => {
    const [detail, progress, best] = await Promise.all([getModule(id), getMyProgress(), getBestScore(id)]);
    return detail ? { detail, row: progress.get(id), best } : null;
  }, [id]);
  const { state, retry } = useLoader(load);

  return (
    <LoadStateView state={state} retry={retry}>
      {(data) =>
        data ? <ModuleView key={id} detail={data.detail} initialRow={data.row} initialBest={data.best} /> : null
      }
    </LoadStateView>
  );
}

type ViewProps = { detail: ModuleDetail; initialRow: ModuleProgress | undefined; initialBest: BestScore };

function ModuleView({ detail, initialRow, initialBest }: ViewProps) {
  const { profile } = useAuth();
  const { module, body, questions, modules } = detail;
  const req = requirementsFor(body, questions.length);
  const steps = (['video', 'notes', 'quiz'] as Step[]).filter((s) => req[s]);

  const [row, setRow] = useState(initialRow);
  const [best, setBest] = useState(initialBest);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Latest values for async callbacks (video events, quiz saves) that outlive a render.
  const latest = useRef({ row: initialRow, attempted: !!initialBest });

  const done: Record<Step, boolean> = {
    video: !!row?.video_watched,
    notes: !!row?.notes_read,
    quiz: !!best,
  };
  const [step, setStep] = useState<Step | undefined>(() => steps.find((s) => !done[s]) ?? steps[0]);

  const record = useCallback(
    async (change: Partial<Pick<ModuleProgress, 'video_watched' | 'notes_read'>>, req: Requirements) => {
      const prev = latest.current.row;
      const next = applyProgress(prev, module.id, change, req, latest.current.attempted);
      if (prev && JSON.stringify(prev) === JSON.stringify(next)) return;
      latest.current.row = next;
      setRow(next);
      try {
        await saveProgress(next, profile!.id);
        setSaveError(null);
      } catch (e) {
        setSaveError(`Your progress couldn’t be saved: ${(e as Error).message}`);
      }
    },
    [module.id, profile],
  );

  const nextModule = modules[modules.findIndex((m) => m.id === module.id) + 1];
  const complete = !!row?.completed_at;

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: module.title }} />

      {!body ? (
        <UnlockCard message="This module is locked" />
      ) : steps.length === 0 ? (
        <Card>
          <AppText tone="muted">This module doesn’t have any content yet.</AppText>
        </Card>
      ) : (
        <>
          <StepTabs steps={steps} active={step!} done={done} onChange={setStep} />
          {saveError ? <Banner message={saveError} /> : null}

          {step === 'video' && body.video_path ? (
            <View style={styles.gap}>
              <VideoPanel path={body.video_path} onWatched={() => record({ video_watched: true }, req)} />
              <AppText variant="caption" tone="faint">
                {done.video ? 'Watched ✓' : 'Watch to the end to tick this step off.'}
              </AppText>
            </View>
          ) : null}

          {step === 'notes' ? <NotesStep source={body.notes_md} onOpen={() => record({ notes_read: true }, req)} /> : null}

          {step === 'quiz' ? (
            <Quiz
              questions={questions}
              best={best}
              onFinish={async (score, total) => {
                await saveQuizAttempt(module.id, score, total);
                latest.current.attempted = true;
                setBest(await getBestScore(module.id));
                await record({}, req);
              }}
            />
          ) : null}

          {complete ? (
            <Card style={[styles.complete, styles.gap]}>
              <AppText variant="heading" tone="success">
                Module complete 🎉
              </AppText>
              {nextModule ? (
                <Button
                  title={`Next: ${nextModule.title}`}
                  onPress={() => router.replace({ pathname: '/module/[id]', params: { id: nextModule.id } })}
                />
              ) : (
                <Button title="Back to lecture" variant="secondary" onPress={() => router.back()} />
              )}
            </Card>
          ) : null}
        </>
      )}
    </Screen>
  );
}

function StepTabs({ steps, active, done, onChange }: { steps: Step[]; active: Step; done: Record<Step, boolean>; onChange: (s: Step) => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.tabs, { backgroundColor: colors.surfaceMuted }]} accessibilityRole="tablist">
      {steps.map((s) => {
        const selected = s === active;
        return (
          <Pressable
            key={s}
            onPress={() => onChange(s)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={[styles.tab, selected && { backgroundColor: colors.surface }]}
          >
            <Ionicons
              name={done[s] ? 'checkmark-circle' : STEP_INFO[s].icon}
              size={18}
              color={done[s] ? colors.success : selected ? colors.primary : colors.textMuted}
            />
            <AppText variant="label" style={{ color: selected ? colors.text : colors.textMuted }}>
              {STEP_INFO[s].label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Typesetting the first formulas takes a moment, so show a spinner for one frame first. */
function NotesStep({ source, onOpen }: { source: string; onOpen: () => void }) {
  const { colors } = useTheme();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    onOpen();
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
    // Mark as read once, when the tab opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Card>
      {ready ? <Markdown source={source} /> : <ActivityIndicator color={colors.primary} style={styles.spinner} />}
    </Card>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 10 },
  tabs: { flexDirection: 'row', padding: 4, borderRadius: radius.md, gap: 4 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: radius.sm },
  complete: { alignItems: 'stretch' },
  spinner: { paddingVertical: 32 },
});
