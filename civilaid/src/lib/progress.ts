import type { Lecture, ModuleBody, ModuleProgress } from './content';

/** What a module asks of the student. Steps a module doesn't have are skipped. */
export type Requirements = { video: boolean; notes: boolean; quiz: boolean };

export function requirementsFor(body: ModuleBody | null, questionCount: number): Requirements {
  return {
    video: !!body?.video_path,
    notes: !!body?.notes_md.trim(),
    quiz: questionCount > 0,
  };
}

/**
 * A module is complete when its video is watched (to 90%), its notes are opened, and its
 * quiz has been attempted at least once — whichever of those the module has.
 */
export function isComplete(req: Requirements, p: { video_watched: boolean; notes_read: boolean }, quizAttempted: boolean) {
  return (!req.video || p.video_watched) && (!req.notes || p.notes_read) && (!req.quiz || quizAttempted);
}

/** Merge a change into a progress row, stamping completed_at the first time it completes. */
export function applyProgress(
  prev: ModuleProgress | undefined,
  moduleId: string,
  change: Partial<Pick<ModuleProgress, 'video_watched' | 'notes_read'>>,
  req: Requirements,
  quizAttempted: boolean,
  now: Date = new Date(),
): ModuleProgress {
  const next: ModuleProgress = {
    module_id: moduleId,
    video_watched: prev?.video_watched ?? false,
    notes_read: prev?.notes_read ?? false,
    completed_at: prev?.completed_at ?? null,
    ...change,
  };
  if (!next.completed_at && isComplete(req, next, quizAttempted)) next.completed_at = now.toISOString();
  return next;
}

export const VIDEO_WATCHED_RATIO = 0.9;

/** Lecture 1 — the first lecture in order — is free. Lectures must already be sorted. */
export function freeLectureId(lectures: Lecture[]): string | undefined {
  return lectures.find((l) => l.is_published)?.id ?? lectures[0]?.id;
}

export function lectureCompletion(lecture: Lecture, progress: Map<string, ModuleProgress>) {
  const total = lecture.module_ids.length;
  const done = lecture.module_ids.filter((id) => progress.get(id)?.completed_at).length;
  return { done, total, complete: total > 0 && done === total };
}

export function subjectCompletion(lectures: Lecture[], progress: Map<string, ModuleProgress>) {
  let done = 0;
  let total = 0;
  for (const l of lectures) {
    const c = lectureCompletion(l, progress);
    done += c.done;
    total += c.total;
  }
  return { done, total, ratio: total ? done / total : 0 };
}
