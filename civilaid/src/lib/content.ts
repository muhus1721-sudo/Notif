// Reading course content and saving progress. Every function has two backends:
// Supabase (the real app) and an in-memory demo used when no Supabase keys are built in.
// Row Level Security decides what Supabase returns: locked module bodies simply come back empty.
import { isSupabaseConfigured } from './config';
import * as demo from './demoContent';
import { supabase } from './supabase';

export type Subject = {
  id: string;
  title: string;
  code: string | null;
  description: string;
  color: string | null;
  sort_order: number;
  is_published: boolean;
};

export type Lecture = {
  id: string;
  subject_id: string;
  title: string;
  description: string;
  sort_order: number;
  created_at: string;
  is_published: boolean;
  module_ids: string[];
};

export type ModuleMeta = {
  id: string;
  lecture_id: string;
  title: string;
  summary: string;
  sort_order: number;
  duration_seconds: number | null;
  is_published: boolean;
};

export type ModuleBody = { notes_md: string; video_path: string | null };

export type QuizQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correct_index: number;
  explanation: string;
};

export type ModuleProgress = {
  module_id: string;
  video_watched: boolean;
  notes_read: boolean;
  completed_at: string | null;
};

export type BestScore = { score: number; total: number } | null;

export type SubjectWithLectures = Subject & { lectures: Lecture[] };

function check<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}

const byOrder = <T extends { sort_order: number; created_at?: string; id: string }>(a: T, b: T) =>
  a.sort_order - b.sort_order || (a.created_at ?? '').localeCompare(b.created_at ?? '') || a.id.localeCompare(b.id);

const LECTURE_FIELDS = 'id, subject_id, title, description, sort_order, created_at, is_published, modules (id)';

type LectureRow = Omit<Lecture, 'module_ids'> & { modules: { id: string }[] };
const toLecture = ({ modules, ...l }: LectureRow): Lecture => ({ ...l, module_ids: modules.map((m) => m.id) });

/** Subjects with their lectures (and each lecture's module ids, for progress). */
export async function listSubjects(): Promise<SubjectWithLectures[]> {
  if (!isSupabaseConfigured) return demo.listSubjects();
  const rows = check(
    await supabase
      .from('subjects')
      .select(`id, title, code, description, color, sort_order, is_published, lectures (${LECTURE_FIELDS})`)
      .order('sort_order')
      .order('created_at'),
  ) as unknown as (Subject & { lectures: LectureRow[] })[];
  return rows.map((s) => ({ ...s, lectures: s.lectures.map(toLecture).sort(byOrder) }));
}

export async function getSubject(id: string): Promise<SubjectWithLectures | null> {
  if (!isSupabaseConfigured) return demo.listSubjects().find((s) => s.id === id) ?? null;
  const row = check(
    await supabase
      .from('subjects')
      .select(`id, title, code, description, color, sort_order, is_published, lectures (${LECTURE_FIELDS})`)
      .eq('id', id)
      .maybeSingle(),
  ) as unknown as (Subject & { lectures: LectureRow[] }) | null;
  return row ? { ...row, lectures: row.lectures.map(toLecture).sort(byOrder) } : null;
}

export type LectureDetail = { subject: SubjectWithLectures; lecture: Lecture; modules: ModuleMeta[] };

export async function getLecture(id: string): Promise<LectureDetail | null> {
  if (!isSupabaseConfigured) return demo.getLecture(id);
  const lecture = check(
    await supabase.from('lectures').select('subject_id').eq('id', id).maybeSingle(),
  ) as { subject_id: string } | null;
  if (!lecture) return null;
  const [subject, modules] = await Promise.all([
    getSubject(lecture.subject_id),
    supabase
      .from('modules')
      .select('id, lecture_id, title, summary, sort_order, duration_seconds, is_published')
      .eq('lecture_id', id)
      .order('sort_order')
      .order('created_at'),
  ]);
  const found = subject?.lectures.find((l) => l.id === id);
  if (!subject || !found) return null;
  return { subject, lecture: found, modules: check(modules) as ModuleMeta[] };
}

export type ModuleDetail = LectureDetail & {
  module: ModuleMeta;
  /** null when the module is locked for this user. */
  body: ModuleBody | null;
  questions: QuizQuestion[];
};

export async function getModule(id: string): Promise<ModuleDetail | null> {
  if (!isSupabaseConfigured) return demo.getModule(id);
  const meta = check(
    await supabase
      .from('modules')
      .select('id, lecture_id, title, summary, sort_order, duration_seconds, is_published')
      .eq('id', id)
      .maybeSingle(),
  ) as ModuleMeta | null;
  if (!meta) return null;
  const [lecture, body, questions] = await Promise.all([
    getLecture(meta.lecture_id),
    supabase.from('module_content').select('notes_md, video_path').eq('module_id', id).maybeSingle(),
    supabase
      .from('quiz_questions')
      .select('id, prompt, options, correct_index, explanation')
      .eq('module_id', id)
      .order('sort_order')
      .order('created_at'),
  ]);
  if (!lecture) return null;
  return {
    ...lecture,
    module: meta,
    body: check(body) as ModuleBody | null,
    questions: check(questions) as QuizQuestion[],
  };
}

/** Short-lived link to a module video. Students can only sign videos of modules they may open. */
export async function getVideoUrl(path: string): Promise<string> {
  if (!isSupabaseConfigured) return path;
  const { data, error } = await supabase.storage.from('videos').createSignedUrl(path, 60 * 60);
  if (error || !data) throw new Error(error?.message ?? 'Could not load the video');
  return data.signedUrl;
}

// ─── Progress ─────────────────────────────────────────────────────────────────────────

export async function getMyProgress(): Promise<Map<string, ModuleProgress>> {
  const rows = isSupabaseConfigured
    ? (check(
        await supabase.from('module_progress').select('module_id, video_watched, notes_read, completed_at'),
      ) as ModuleProgress[])
    : demo.getProgress();
  return new Map(rows.map((r) => [r.module_id, r]));
}

export async function getBestScore(moduleId: string): Promise<BestScore> {
  const rows = isSupabaseConfigured
    ? (check(
        await supabase.from('quiz_attempts').select('score, total').eq('module_id', moduleId),
      ) as { score: number; total: number }[])
    : demo.getAttempts(moduleId);
  return rows.reduce<BestScore>((best, r) => (!best || r.score / r.total > best.score / best.total ? r : best), null);
}

export async function saveProgress(row: ModuleProgress, userId: string): Promise<void> {
  if (!isSupabaseConfigured) return demo.saveProgress(row);
  check(
    await supabase
      .from('module_progress')
      .upsert({ ...row, user_id: userId }, { onConflict: 'user_id,module_id' }),
  );
}

export async function saveQuizAttempt(moduleId: string, score: number, total: number): Promise<void> {
  if (!isSupabaseConfigured) return demo.saveAttempt(moduleId, score, total);
  check(await supabase.from('quiz_attempts').insert({ module_id: moduleId, score, total }));
}
