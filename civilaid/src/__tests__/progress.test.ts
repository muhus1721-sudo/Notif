import type { Lecture, ModuleProgress } from '@/lib/content';
import { applyProgress, freeLectureId, isComplete, requirementsFor, subjectCompletion } from '@/lib/progress';

const all = { video: true, notes: true, quiz: true };

describe('module completion', () => {
  it('only counts the steps a module has', () => {
    expect(requirementsFor({ notes_md: '# Hi', video_path: null }, 0)).toEqual({ video: false, notes: true, quiz: false });
    expect(requirementsFor(null, 0)).toEqual({ video: false, notes: false, quiz: false });
  });

  it('needs video, notes and a quiz attempt', () => {
    expect(isComplete(all, { video_watched: true, notes_read: true }, false)).toBe(false);
    expect(isComplete(all, { video_watched: true, notes_read: true }, true)).toBe(true);
    expect(isComplete({ ...all, video: false }, { video_watched: false, notes_read: true }, true)).toBe(true);
  });

  it('stamps completed_at once and keeps it', () => {
    const now = new Date('2026-10-06T10:00:00Z');
    let row = applyProgress(undefined, 'm1', { notes_read: true }, all, true, now);
    expect(row.completed_at).toBeNull();
    row = applyProgress(row, 'm1', { video_watched: true }, all, true, now);
    expect(row.completed_at).toBe(now.toISOString());
    const later = applyProgress(row, 'm1', {}, all, true, new Date('2027-01-01'));
    expect(later.completed_at).toBe(now.toISOString());
  });
});

const lecture = (id: string, module_ids: string[], is_published = true): Lecture => ({
  id, subject_id: 's', title: id, description: '', sort_order: 0, created_at: '', is_published, module_ids,
});

describe('lectures', () => {
  it('lecture 1 is the first published lecture', () => {
    expect(freeLectureId([lecture('draft', [], false), lecture('l1', []), lecture('l2', [])])).toBe('l1');
  });

  it('computes subject completion from completed modules', () => {
    const progress = new Map<string, ModuleProgress>([
      ['a', { module_id: 'a', video_watched: true, notes_read: true, completed_at: 'x' }],
      ['b', { module_id: 'b', video_watched: true, notes_read: false, completed_at: null }],
    ]);
    expect(subjectCompletion([lecture('l1', ['a', 'b']), lecture('l2', ['c', 'd'])], progress)).toEqual({ done: 1, total: 4, ratio: 0.25 });
  });
});
