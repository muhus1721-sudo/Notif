import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Markdown } from '@/components/notes/Markdown';
import { ProgressRing } from '@/components/ProgressRing';
import { AppText, Button, Card } from '@/components/ui';
import type { BestScore, QuizQuestion } from '@/lib/content';
import { radius, useTheme } from '@/theme/ThemeProvider';

type Props = {
  questions: QuizQuestion[];
  best: BestScore;
  /** Called once per finished attempt, to save it. */
  onFinish: (score: number, total: number) => Promise<void>;
};

type Phase = { kind: 'intro' } | { kind: 'question'; index: number } | { kind: 'done' };

function haptic(kind: 'success' | 'error') {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(
    kind === 'success' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error,
  ).catch(() => {});
}

export function Quiz({ questions, best, onFinish }: Props) {
  const [phase, setPhase] = useState<Phase>({ kind: 'intro' });
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  // The parent refreshes `best` after saving, so compare against the best from before this attempt.
  const [bestBefore, setBestBefore] = useState<BestScore>(best);
  const total = questions.length;
  const score = answers.filter((a, i) => a === questions[i]?.correct_index).length;

  function start() {
    setAnswers(questions.map(() => null));
    setBestBefore(best);
    setPhase({ kind: 'question', index: 0 });
  }

  if (phase.kind === 'intro') {
    return (
      <Card style={styles.intro}>
        <AppText variant="title">Quiz</AppText>
        <AppText tone="muted">
          {total} question{total === 1 ? '' : 's'} · instant feedback · retake as often as you like
        </AppText>
        {best ? (
          <AppText variant="bodyStrong" tone="success">
            Your best: {best.score}/{best.total}
          </AppText>
        ) : null}
        <Button title={best ? 'Retake quiz' : 'Start quiz'} onPress={start} />
      </Card>
    );
  }

  if (phase.kind === 'done') {
    return (
      <Results
        score={score}
        total={total}
        best={bestBefore}
        onRetake={start}
      />
    );
  }

  const q = questions[phase.index];
  const chosen = answers[phase.index];
  const last = phase.index === total - 1;

  return (
    <View style={styles.gap}>
      <QuestionHeader index={phase.index} total={total} />
      <Card style={styles.gap}>
        <Markdown source={q.prompt} compact textStyle={{ fontSize: 16, lineHeight: 24 }} />
      </Card>
      <View style={styles.options}>
        {q.options.map((opt, i) => (
          <Option
            key={`${phase.index}-${i}`}
            label={opt}
            letter={String.fromCharCode(65 + i)}
            state={chosen == null ? 'idle' : i === q.correct_index ? 'correct' : i === chosen ? 'wrong' : 'dim'}
            onPress={() => {
              if (chosen != null) return;
              haptic(i === q.correct_index ? 'success' : 'error');
              setAnswers((a) => a.map((v, j) => (j === phase.index ? i : v)));
            }}
          />
        ))}
      </View>
      {chosen != null ? (
        <Feedback correct={chosen === q.correct_index} explanation={q.explanation} />
      ) : null}
      {chosen != null ? (
        <Button
          title={last ? 'See my score' : 'Next question'}
          onPress={() => {
            if (last) {
              setPhase({ kind: 'done' });
              onFinish(score, total).catch(() => {});
            } else {
              setPhase({ kind: 'question', index: phase.index + 1 });
            }
          }}
        />
      ) : null}
    </View>
  );
}

function QuestionHeader({ index, total }: { index: number; total: number }) {
  const { colors } = useTheme();
  return (
    <View style={styles.gapSmall}>
      <AppText variant="label" tone="muted">
        Question {index + 1} of {total}
      </AppText>
      <View style={[styles.track, { backgroundColor: colors.surfaceAlt }]}>
        <View style={[styles.fill, { backgroundColor: colors.primary, width: `${((index + 1) / total) * 100}%` }]} />
      </View>
    </View>
  );
}

type OptionState = 'idle' | 'correct' | 'wrong' | 'dim';

function Option({ label, letter, state, onPress }: { label: string; letter: string; state: OptionState; onPress: () => void }) {
  const { colors, shadow } = useTheme();
  const [scale] = useState(() => new Animated.Value(1));
  const [shake] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (state === 'correct') {
      Animated.sequence([
        Animated.spring(scale, { toValue: 1.04, useNativeDriver: true, speed: 40, bounciness: 12 }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }),
      ]).start();
    } else if (state === 'wrong') {
      Animated.sequence(
        [8, -8, 6, -6, 0].map((x) => Animated.timing(shake, { toValue: x, duration: 50, useNativeDriver: true })),
      ).start();
    }
  }, [state, scale, shake]);

  const look = {
    idle: { bg: colors.surface, border: colors.border, fg: colors.textPrimary, badge: colors.surfaceAlt },
    correct: { bg: colors.successSoft, border: colors.success, fg: colors.textPrimary, badge: colors.success },
    wrong: { bg: colors.errorSoft, border: colors.error, fg: colors.textPrimary, badge: colors.error },
    dim: { bg: colors.surface, border: colors.border, fg: colors.textFaint, badge: colors.surfaceAlt },
  }[state];

  return (
    <Animated.View style={{ transform: [{ scale }, { translateX: shake }] }}>
      <Pressable
        onPress={onPress}
        disabled={state !== 'idle'}
        accessibilityRole="button"
        accessibilityState={{ disabled: state !== 'idle', selected: state === 'correct' || state === 'wrong' }}
        style={({ pressed }) => [
          styles.option,
          state === 'idle' && shadow,
          { backgroundColor: pressed ? colors.surfaceAlt : look.bg, borderColor: look.border, opacity: state === 'dim' ? 0.7 : 1 },
        ]}
      >
        <View style={[styles.badge, { backgroundColor: look.badge }]}>
          {state === 'correct' || state === 'wrong' ? (
            <Ionicons name={state === 'correct' ? 'checkmark' : 'close'} size={18} color={colors.onPrimary} />
          ) : (
            <AppText variant="label" style={{ color: look.fg }}>
              {letter}
            </AppText>
          )}
        </View>
        <View style={styles.flex}>
          <Markdown source={label} compact textStyle={{ color: look.fg }} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

function Feedback({ correct, explanation }: { correct: boolean; explanation: string }) {
  const { colors } = useTheme();
  const [appear] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(appear, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [appear]);
  return (
    <Animated.View
      style={{ opacity: appear, transform: [{ translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }}
    >
      <Card style={[styles.gapSmall, { borderLeftWidth: 4, borderLeftColor: correct ? colors.success : colors.error }]}>
        <AppText variant="heading" tone={correct ? 'success' : 'danger'}>
          {correct ? 'Correct! 🎉' : 'Not quite'}
        </AppText>
        {explanation ? <Markdown source={explanation} compact /> : null}
      </Card>
    </Animated.View>
  );
}

function Results({ score, total, best, onRetake }: { score: number; total: number; best: BestScore; onRetake: () => void }) {
  const { colors } = useTheme();
  const ratio = total ? score / total : 0;
  const isNewBest = !best || ratio > best.score / best.total;
  const message = ratio === 1 ? 'Perfect score!' : ratio >= 0.7 ? 'Great work!' : ratio >= 0.4 ? 'Good effort — review the notes and try again.' : 'Keep going — the notes will help.';
  return (
    <Card style={styles.results}>
      <ProgressRing progress={ratio} size={120} stroke={10} color={ratio >= 0.7 ? colors.success : colors.primary}>
        <AppText variant="title">
          {score}/{total}
        </AppText>
      </ProgressRing>
      <AppText variant="heading" align="center">
        {message}
      </AppText>
      <AppText tone={isNewBest ? 'success' : 'muted'} align="center">
        {isNewBest ? 'New best score saved' : `Best so far: ${best!.score}/${best!.total}`}
      </AppText>
      <Button title="Retake quiz" variant="secondary" onPress={onRetake} style={styles.stretch} />
    </Card>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 14 },
  gapSmall: { gap: 8 },
  intro: { gap: 10 },
  options: { gap: 10 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.md, borderWidth: 1.5 },
  badge: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  results: { alignItems: 'center', gap: 12, paddingVertical: 28 },
  stretch: { alignSelf: 'stretch' },
});
